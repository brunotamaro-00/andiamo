import { db } from "./db";
import { todayStr, dateToStr } from "./trip";

export async function getCurrentStopSlug(): Promise<string | null> {
  // Check for manual override first
  const override = await db.setting.findUnique({ where: { key: "manualCurrentStopId" } });
  if (override) {
    const stop = await db.stop.findUnique({ where: { id: override.value }, select: { slug: true } });
    if (stop) return stop.slug;
  }

  // Compare YYYY-MM-DD strings — safe against server-timezone drift since
  // all dates come from @db.Date (UTC midnight) and todayStr() uses UTC.
  const today = todayStr();

  const stops = await db.stop.findMany({
    where: { isFlexMargin: false, nights: { gt: 0 } },
    orderBy: { order: "asc" },
    select: { slug: true, arrivalDate: true, departureDate: true, order: true },
  });

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

export async function getTripDayNumber(slug: string): Promise<number | null> {
  const stops = await db.stop.findMany({
    where: { isFlexMargin: false },
    orderBy: { order: "asc" },
    select: { slug: true, arrivalDate: true },
  });

  const firstStop = stops.find((s) => s.arrivalDate);
  const thisStop = stops.find((s) => s.slug === slug);

  if (!firstStop?.arrivalDate || !thisStop?.arrivalDate) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor(
    (thisStop.arrivalDate.getTime() - firstStop.arrivalDate.getTime()) / msPerDay,
  );
  return diff + 1;
}
