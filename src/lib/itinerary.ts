import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { dateToStr, addDaysStr, strToDate, daysBetween } from "./trip";
import { fetchTempRange } from "./temp-range";

interface StopInput {
  id: string;
  order: number;
  nights: number;
  isCandidate: boolean;
  isAnchored?: boolean;
  arrivalDate?: Date | null;
}

interface DateResult {
  arrival: Date | null;
  departure: Date | null;
}

/**
 * Pure function — derives arrival/departure for every stop given an anchor start date.
 *
 * Rules:
 * - Anchored stop: the cursor *jumps* to its own arrivalDate. This is the only
 *   way the walk can hold a gap — without it the cursor is strictly contiguous,
 *   so the ten unbooked days between Nápoles and Barcelona get eaten and
 *   Barcelona slides ten days earlier than the flight that's already paid for.
 *   An anchor also stops an edit upstream from dragging everything after it.
 * - Normal stop: arrival = cursor, departure = arrival + nights. Cursor advances.
 *   A stop with 0 nights is a transit stop — it lands on the cursor day without advancing it.
 * - Candidate stop: gets tentative dates at cursor position but does NOT advance cursor.
 *   An anchored candidate still doesn't advance it (Grindelwald runs *instead of*
 *   Interlaken, not after it) — it only pins where its own tentative window starts.
 * - If no tripStartStr: all dates are null.
 */
export function computeItinerary(
  stops: StopInput[],
  tripStartStr: string | null,
): Map<string, DateResult> {
  const result = new Map<string, DateResult>();

  if (!tripStartStr) {
    for (const s of stops) result.set(s.id, { arrival: null, departure: null });
    return result;
  }

  let cursor = tripStartStr;
  const sorted = [...stops].sort((a, b) => a.order - b.order);

  for (const stop of sorted) {
    // An anchor is only usable if it carries the date it's anchored to.
    const anchor = stop.isAnchored && stop.arrivalDate ? dateToStr(stop.arrivalDate) : null;
    const arrival = anchor ?? cursor;
    const dep = stop.nights > 0 ? addDaysStr(arrival, stop.nights) : null;

    result.set(stop.id, {
      arrival: strToDate(arrival),
      departure: dep ? strToDate(dep) : null,
    });

    // Candidates never consume the cursor slot — they're alternatives to the
    // mainline, not extra legs of it.
    if (!stop.isCandidate && dep) cursor = dep;
  }

  return result;
}

/**
 * How far a recalculation is allowed to move a date that already existed.
 *
 * The anchor walk is only as good as its inputs, and a bad anchor silently
 * rewrites the whole trip: a stale `tripStartDate` of 2026-05-31 against a
 * 2026-08-05 departure moved every stop 66 days and pushed the wreckage to
 * Spitwise, with no confirmation and no undo. Nobody legitimately shifts a
 * booked itinerary by a month from a "noches" edit, so past this the
 * recalculation refuses to persist and says so.
 */
export const MAX_DRIFT_DAYS = 30;

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
 * Call this after every mutation that affects order, nights, or the anchor.
 * Safe to call outside a Prisma transaction — it manages its own batch update.
 *
 * Returns `{ error }` instead of writing when the recomputation would move an
 * existing date more than MAX_DRIFT_DAYS. Callers should surface it; leaving
 * the dates untouched is always the safe outcome.
 */
export async function recalculateItinerary(
  opts: { allowLargeDrift?: boolean } = {},
): Promise<{ error?: string }> {
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
        isAnchored: true,
        latitude: true,
        longitude: true,
        tempRange: true,
      },
    }),
  ]);

  // The trip's start is the first anchored stop's own date, not a free-floating
  // Setting. The Setting drifted out of sync with the itinerary once already
  // (2026-05-31 against a 2026-08-05 departure) and, because it feeds the cursor,
  // every stop inherited the lie. Anchors are the source of truth; the Setting
  // is a cache of the first one, kept fresh here for the editor to read back.
  const firstAnchored = stops.find((s) => s.isAnchored && s.arrivalDate);
  let tripStartStr = firstAnchored?.arrivalDate
    ? dateToStr(firstAnchored.arrivalDate)
    : (tripStartSetting?.value ?? null);

  // Bootstrap: no anchor and no setting yet — seed from the earliest confirmed stop.
  if (!tripStartStr) {
    const firstDated = stops.find((s) => !s.isCandidate && s.arrivalDate);
    if (firstDated?.arrivalDate) tripStartStr = dateToStr(firstDated.arrivalDate);
  }
  if (tripStartStr && tripStartStr !== tripStartSetting?.value) {
    await db.setting.upsert({
      where: { key: "tripStartDate" },
      create: { key: "tripStartDate", value: tripStartStr },
      update: { value: tripStartStr },
    });
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

  // Guardrail. Only dates that already existed count: null → tentative date is
  // the algorithm filling in a candidate, not a shift.
  const drift = Math.max(
    0,
    ...changed.flatMap((stop) => {
      const next = computed.get(stop.id)!;
      const moves: number[] = [];
      if (stop.arrivalDate && next.arrival) {
        moves.push(Math.abs(daysBetween(dateToStr(stop.arrivalDate), dateToStr(next.arrival))));
      }
      if (stop.departureDate && next.departure) {
        moves.push(
          Math.abs(daysBetween(dateToStr(stop.departureDate), dateToStr(next.departure))),
        );
      }
      return moves;
    }),
  );
  if (drift > MAX_DRIFT_DAYS && !opts.allowLargeDrift) {
    return {
      error: `El recálculo movería el itinerario ${drift} días. No se guardó nada — revisá la fecha de inicio y las paradas con fecha fija.`,
    };
  }

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
