import { db } from "./db";
import { todayStr, dateToStr, tripDayNumber } from "./trip";

export interface CurrentStopInput {
  id: string;
  slug: string;
  order: number;
  nights: number;
  isFlexMargin: boolean;
  arrivalDate: Date | null;
  departureDate: Date | null;
}

/**
 * Pure core of getCurrentStopSlug — pass the full stop list (sorted by order)
 * and the manual override id, get the slug to highlight as "current".
 *
 * Compares YYYY-MM-DD strings — safe against server-timezone drift since all
 * dates come from @db.Date (UTC midnight) and todayStr() is anchored to
 * TRIP_TIMEZONE.
 */
export function computeCurrentStopSlug(
  allStops: CurrentStopInput[],
  overrideId: string | null,
  today: string = todayStr(),
): string | null {
  if (overrideId) {
    const overridden = allStops.find((s) => s.id === overrideId);
    if (overridden) return overridden.slug;
  }

  const stops = allStops.filter((s) => !s.isFlexMargin && s.nights > 0);

  for (const stop of stops) {
    if (stop.arrivalDate && stop.departureDate) {
      const arr = dateToStr(stop.arrivalDate);
      const dep = dateToStr(stop.departureDate);
      if (arr <= today && today < dep) {
        return stop.slug;
      }
    }
  }

  // If trip hasn't started yet, return first stop
  const firstArrival = stops[0]?.arrivalDate ? dateToStr(stops[0].arrivalDate) : null;
  if (firstArrival && today < firstArrival) {
    return stops[0]?.slug ?? null;
  }

  // If trip ended or no dates, return last stop with dates
  const lastWithDate = [...stops].reverse().find((s) => s.arrivalDate);
  return lastWithDate?.slug ?? stops[0]?.slug ?? null;
}

export async function getCurrentStopSlug(): Promise<string | null> {
  const [override, stops] = await Promise.all([
    db.setting.findUnique({ where: { key: "manualCurrentStopId" } }),
    db.stop.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        order: true,
        nights: true,
        isFlexMargin: true,
        arrivalDate: true,
        departureDate: true,
      },
    }),
  ]);

  return computeCurrentStopSlug(stops, override?.value ?? null);
}

export async function getTripDayNumber(slug: string): Promise<number | null> {
  const stops = await db.stop.findMany({
    where: { isFlexMargin: false },
    orderBy: { order: "asc" },
    select: { slug: true, arrivalDate: true },
  });

  const firstStop = stops.find((s) => s.arrivalDate);
  const thisStop = stops.find((s) => s.slug === slug);

  return tripDayNumber(thisStop?.arrivalDate, firstStop?.arrivalDate);
}
