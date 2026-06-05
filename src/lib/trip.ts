/**
 * trip.ts — single source of truth for trip-wide date utilities.
 *
 * All Stop.arrivalDate / Stop.departureDate fields are stored as @db.Date
 * (PostgreSQL DATE, UTC midnight). Comparing YYYY-MM-DD strings is the only
 * safe way to do date logic regardless of the server's local timezone.
 */

/** Returns today as a YYYY-MM-DD string (UTC), safe to compare against @db.Date values. */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Converts a Date coming from a @db.Date Prisma field to a YYYY-MM-DD string. */
export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the trip day number for a given stop arrival date.
 * Day 1 = arrival at the first stop.
 *
 * @param arrivalDate  The stop's arrivalDate (Date or string).
 * @param tripStartDate The first stop's arrivalDate (Date or string) — the anchor.
 * @returns  Positive integer ≥ 1, or null if either date is missing.
 */
export function tripDayNumber(
  arrivalDate: Date | string | null | undefined,
  tripStartDate: Date | string | null | undefined,
): number | null {
  if (!arrivalDate || !tripStartDate) return null;
  const arrStr = typeof arrivalDate === "string" ? arrivalDate : dateToStr(arrivalDate);
  const startStr =
    typeof tripStartDate === "string" ? tripStartDate : dateToStr(tripStartDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor(
    (new Date(arrStr).getTime() - new Date(startStr).getTime()) / msPerDay,
  );
  return diff + 1;
}
