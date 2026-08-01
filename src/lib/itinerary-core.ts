/**
 * itinerary-core.ts — the pure walk that derives every date in the trip.
 *
 * Split out of `itinerary.ts` (which imports `next/server` and the Prisma
 * client) so the client can run the *same* function to preview where a stop
 * would land before committing the move. One implementation, two callers:
 * `recalculateItinerary` on the server, `ItineraryPositionPicker` on the phone.
 */
import { addDaysStr, strToDate } from "./trip";

export interface StopInput {
  id: string;
  order: number;
  nights: number;
  isCandidate: boolean;
}

export interface DateResult {
  arrival: Date | null;
  departure: Date | null;
}

/**
 * Pure function — derives arrival/departure for every stop from the trip's start
 * date, the stop order and each stop's nights. Those are the only inputs: no
 * stored date is ever read back, so the itinerary can't hold a gap and can't
 * pin a stop against an edit upstream of it.
 *
 * Rules:
 * - Normal stop: arrival = cursor, departure = arrival + nights. Cursor advances.
 *   A stop with 0 nights is a transit stop — it lands on the cursor day without advancing it.
 * - Candidate stop: gets tentative dates at cursor position but does NOT advance cursor.
 *   A candidate is an alternative to the mainline, not an extra leg of it
 *   (Grindelwald runs *instead of* Interlaken, not after it).
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
    const arrival = cursor;
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
