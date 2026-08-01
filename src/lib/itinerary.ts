import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { dateToStr } from "./trip";
import { fetchTempRange } from "./temp-range";
import { computeItinerary } from "./itinerary-core";

// The walk itself lives in `itinerary-core.ts` — a server-free module, so the
// position picker can preview a move with the exact same function. Re-exported
// here because this is where the rest of the app already imports it from.
export { computeItinerary } from "./itinerary-core";
export type { StopInput, DateResult } from "./itinerary-core";

interface DatedStop {
  order: number;
  arrivalDate: Date | null;
  departureDate: Date | null;
}

/**
 * Pure function — effective stay window for a stop. If its own dates are
 * incomplete, assumes the gap between neighbors in itinerary order: from the
 * last dated stop before it to the first dated stop after it.
 */
export function assumedDateWindow(
  stop: DatedStop,
  allStops: DatedStop[],
): { arrival: Date; departure: Date } | null {
  if (stop.arrivalDate && stop.departureDate) {
    return { arrival: stop.arrivalDate, departure: stop.departureDate };
  }

  const sorted = [...allStops].sort((a, b) => a.order - b.order);
  const arrival =
    stop.arrivalDate ??
    sorted
      .filter((s) => s.order < stop.order)
      .map((s) => s.departureDate ?? s.arrivalDate)
      .filter((d): d is Date => d != null)
      .at(-1) ??
    null;
  const departure =
    stop.departureDate ??
    sorted
      .filter((s) => s.order > stop.order)
      .map((s) => s.arrivalDate ?? s.departureDate)
      .filter((d): d is Date => d != null)[0] ??
    null;

  if (!arrival || !departure) return null;
  if (departure.getTime() < arrival.getTime()) return null;
  return { arrival, departure };
}

/**
 * Reads the full stop list + tripStartDate setting, recomputes all dates,
 * and persists any that changed. The tempRange refresh (HTTP to Open-Meteo)
 * is deferred with `after()` so mutations respond without waiting on it.
 *
 * Call this after every mutation that affects order or nights.
 * Safe to call outside a Prisma transaction — it manages its own batch update.
 *
 * Still returns `{ error }` so callers can surface a failure without changing
 * shape, even though nothing rejects a recomputation today.
 */
export async function recalculateItinerary(): Promise<{ error?: string }> {
  const [tripStartSetting, stops] = await Promise.all([
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
    // Pseudo-cities (Pititas) sit *parallel* to the linear itinerary — they run
    // during another stop's window, not after it. Feeding one into the cursor
    // walk would push every later stop's dates by its nights, so keep them out
    // of the recalculation entirely; their dates are fixed at seed time.
    db.stop.findMany({
      where: { isLocal: false },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        order: true,
        nights: true,
        arrivalDate: true,
        departureDate: true,
        isCandidate: true,
        latitude: true,
        longitude: true,
        tempRange: true,
      },
    }),
  ]);

  // The Setting is the trip's single date input — every other date in the app
  // is derived from it plus the order and nights of each stop.
  let tripStartStr = tripStartSetting?.value ?? null;

  // Bootstrap: no setting yet — seed it once from the earliest confirmed stop.
  if (!tripStartStr) {
    const firstDated = stops.find((s) => !s.isCandidate && s.arrivalDate);
    if (firstDated?.arrivalDate) {
      tripStartStr = dateToStr(firstDated.arrivalDate);
      // upsert, not create: two concurrent mutations on a fresh DB would both
      // find no Setting and the loser would get a P2002 instead of a response.
      await db.setting.upsert({
        where: { key: "tripStartDate" },
        create: { key: "tripStartDate", value: tripStartStr },
        update: {},
      });
    }
  }

  const computed = computeItinerary(stops, tripStartStr);

  // Collect stops whose dates changed
  const changed = stops.filter((stop) => {
    const next = computed.get(stop.id)!;
    const oldArr = stop.arrivalDate ? dateToStr(stop.arrivalDate) : null;
    const oldDep = stop.departureDate ? dateToStr(stop.departureDate) : null;
    const newArr = next.arrival ? dateToStr(next.arrival) : null;
    const newDep = next.departure ? dateToStr(next.departure) : null;
    return oldArr !== newArr || oldDep !== newDep;
  });

  // Phase 1 (blocking): persist the recomputed dates only
  if (changed.length > 0) {
    await db.$transaction(
      changed.map((stop) => {
        const next = computed.get(stop.id)!;
        return db.stop.update({
          where: { id: stop.id },
          data: { arrivalDate: next.arrival, departureDate: next.departure },
        });
      }),
    );
  }

  // Phase 2 (deferred): refresh temp ranges after the response is sent.
  // Stops without complete dates use the assumed gap between dated neighbors;
  // they also refresh on any itinerary change since their window derives from it.
  const changedIds = new Set(changed.map((s) => s.id));
  const computedStops = stops.map((stop) => {
    const next = computed.get(stop.id)!;
    return { ...stop, arrivalDate: next.arrival, departureDate: next.departure };
  });
  const toRefresh = computedStops
    .map((stop) => ({ stop, window: assumedDateWindow(stop, computedStops) }))
    .filter((t): t is typeof t & { window: NonNullable<(typeof t)["window"]> } => t.window != null)
    .filter(
      ({ stop }) =>
        changedIds.has(stop.id) ||
        stop.tempRange == null ||
        (changed.length > 0 && (!stop.arrivalDate || !stop.departureDate)),
    )
    .map(({ stop, window }) => ({
      id: stop.id,
      slug: stop.slug,
      latitude: stop.latitude,
      longitude: stop.longitude,
      arrival: window.arrival,
      departure: window.departure,
    }));

  if (toRefresh.length > 0) {
    after(() => refreshTempRanges(toRefresh));
  }

  return {};
}

interface TempRangeTarget {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  arrival: Date;
  departure: Date;
}

/** Fetches and stores tempRange for the given stops; runs outside the response path. */
async function refreshTempRanges(targets: TempRangeTarget[]): Promise<void> {
  try {
    // Sequential across stops, not Promise.all. fetchTempRange already serializes
    // its 10 per-year requests precisely to stay under Open-Meteo's rate limit —
    // fanning out by stop defeated that: editing tripStartDate marks every stop
    // changed, so ~30 stops × 10 years hit the API at once, every request 429'd,
    // and the whole refresh silently no-op'd. This runs inside after(), off the
    // response path, so wall time doesn't matter.
    const withRange: Array<TempRangeTarget & { tempRange: string }> = [];
    for (const t of targets) {
      const tempRange = await fetchTempRange(t.latitude, t.longitude, t.arrival, t.departure);
      if (tempRange != null) withRange.push({ ...t, tempRange });
    }
    if (withRange.length === 0) return;

    await db.$transaction(
      withRange.map((u) =>
        db.stop.update({ where: { id: u.id }, data: { tempRange: u.tempRange } }),
      ),
    );

    revalidatePath("/stops");
    for (const u of withRange) revalidatePath(`/stops/${u.slug}`);
  } catch {
    // Best-effort: a failed refresh keeps the previous tempRange
  }
}
