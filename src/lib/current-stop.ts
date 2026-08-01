import { db } from "./db";
import { todayStr, dateToStr, tripDayNumber } from "./trip";
import { stopVisibleTo, type PersonView } from "./person";
import { getPerson } from "./person-server";

export interface CurrentStopInput {
  id: string;
  slug: string;
  order: number;
  nights: number;
  isFlexMargin: boolean;
  arrivalDate: Date | null;
  departureDate: Date | null;
  ownerPerson: string | null;
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
  viewer: PersonView = null,
): string | null {
  // Person-scoped stops swap per viewer: during the Portugal leg the current
  // stop is Pititas for Katia and Lisboa/Porto for Bruno. "Ambos" sees all.
  const visible = allStops.filter((s) => stopVisibleTo(s, viewer));

  if (overrideId) {
    const overridden = visible.find((s) => s.id === overrideId);
    if (overridden) return overridden.slug;
  }

  const stops = visible.filter((s) => !s.isFlexMargin && s.nights > 0);

  for (const stop of stops) {
    if (stop.arrivalDate && stop.departureDate) {
      const arr = dateToStr(stop.arrivalDate);
      const dep = dateToStr(stop.departureDate);
      if (arr <= today && today < dep) {
        return stop.slug;
      }
    }
  }

  // Today is inside nobody's window. Point at the *next* stop — which covers
  // both "the trip hasn't started yet" and any uncovered day mid-trip: the gap
  // between two booked legs, or a day held only by a transit/flex stop that the
  // filter above drops. Falling back to the last stop instead sent /hoy to the
  // final city of the trip on those days (Madrid, three weeks away), and the
  // manual override that would have rescued it is never written by any code path.
  const dated = stops.filter((s) => s.arrivalDate != null);
  const upcoming = dated.find((s) => today <= dateToStr(s.arrivalDate!));
  if (upcoming) return upcoming.slug;

  // Nothing ahead: the trip is over (or has no dates at all).
  return dated.at(-1)?.slug ?? stops[0]?.slug ?? null;
}

export async function getCurrentStopSlug(): Promise<string | null> {
  const [override, stops, viewer] = await Promise.all([
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
        ownerPerson: true,
      },
    }),
    getPerson(),
  ]);

  return computeCurrentStopSlug(stops, override?.value ?? null, todayStr(), viewer);
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
