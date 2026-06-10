import { db } from "./db";
import { dateToStr, addDaysStr, strToDate } from "./trip";
import { fetchTempRange } from "./temp-range";

interface StopInput {
  id: string;
  order: number;
  nights: number;
  datesFixed: boolean;
  arrivalDate: Date | null;
  isCandidate: boolean;
}

interface DateResult {
  arrival: Date | null;
  departure: Date | null;
}

/**
 * Pure function — derives arrival/departure for every stop given an anchor start date.
 *
 * Rules:
 * - Normal stop: arrival = cursor, departure = arrival + nights. Cursor advances.
 * - Pinned stop (datesFixed && arrivalDate set): re-anchors cursor to its stored arrivalDate.
 * - Candidate stop: gets tentative dates at cursor position but does NOT advance cursor.
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
    if (stop.isCandidate) {
      // Tentative: show where it would land, but don't consume the cursor slot
      const dep = stop.nights > 0 ? addDaysStr(cursor, stop.nights) : null;
      result.set(stop.id, {
        arrival: strToDate(cursor),
        departure: dep ? strToDate(dep) : null,
      });
    } else if (stop.datesFixed && stop.arrivalDate) {
      // Re-anchor: this stop has a fixed date (e.g. a booked flight)
      const anchorStr = dateToStr(stop.arrivalDate);
      cursor = anchorStr;
      const dep = stop.nights > 0 ? addDaysStr(cursor, stop.nights) : null;
      result.set(stop.id, {
        arrival: strToDate(cursor),
        departure: dep ? strToDate(dep) : null,
      });
      if (dep) cursor = dep;
    } else {
      // Normal: derive from cursor
      const dep = stop.nights > 0 ? addDaysStr(cursor, stop.nights) : null;
      result.set(stop.id, {
        arrival: strToDate(cursor),
        departure: dep ? strToDate(dep) : null,
      });
      if (dep) cursor = dep;
    }
  }

  return result;
}

/**
 * Reads the full stop list + tripStartDate setting, recomputes all dates,
 * and persists any that changed (including refreshing tempRange for those stops).
 *
 * Call this after every mutation that affects order, nights, datesFixed, or the anchor.
 * Safe to call outside a Prisma transaction — it manages its own batch update.
 */
export async function recalculateItinerary(): Promise<void> {
  const [tripStartSetting, stops] = await Promise.all([
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
    db.stop.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        nights: true,
        datesFixed: true,
        arrivalDate: true,
        departureDate: true,
        isCandidate: true,
        latitude: true,
        longitude: true,
        tempRange: true,
      },
    }),
  ]);

  // Bootstrap: if no setting yet, seed from the earliest confirmed stop's arrivalDate
  let tripStartStr = tripStartSetting?.value ?? null;
  if (!tripStartStr) {
    const firstDated = stops.find((s) => !s.isCandidate && s.arrivalDate);
    if (firstDated?.arrivalDate) {
      tripStartStr = dateToStr(firstDated.arrivalDate);
      await db.setting.upsert({
        where: { key: "tripStartDate" },
        create: { key: "tripStartDate", value: tripStartStr },
        update: { value: tripStartStr },
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

  if (changed.length === 0) return;

  // Fetch tempRanges in parallel (HTTP, outside DB tx)
  const updates = await Promise.all(
    changed.map(async (stop) => {
      const next = computed.get(stop.id)!;
      const tempRange =
        next.arrival && next.departure
          ? (await fetchTempRange(stop.latitude, stop.longitude, next.arrival, next.departure)) ??
            stop.tempRange
          : stop.tempRange;
      return { id: stop.id, arrival: next.arrival, departure: next.departure, tempRange };
    }),
  );

  // Batch update in a single transaction
  await db.$transaction(
    updates.map((u) =>
      db.stop.update({
        where: { id: u.id },
        data: { arrivalDate: u.arrival, departureDate: u.departure, tempRange: u.tempRange },
      }),
    ),
  );
}
