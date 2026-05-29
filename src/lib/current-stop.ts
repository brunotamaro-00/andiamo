import { db } from "./db";

export async function getCurrentStopSlug(): Promise<string | null> {
  // Check for manual override first
  const override = await db.setting.findUnique({ where: { key: "manualCurrentStopId" } });
  if (override) {
    const stop = await db.stop.findUnique({ where: { id: override.value }, select: { slug: true } });
    if (stop) return stop.slug;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stops = await db.stop.findMany({
    where: { isFlexMargin: false, nights: { gt: 0 } },
    orderBy: { order: "asc" },
    select: { slug: true, arrivalDate: true, departureDate: true, order: true },
  });

  // Find the stop where today falls within arrival/departure
  for (const stop of stops) {
    if (stop.arrivalDate && stop.departureDate) {
      const arrival = new Date(stop.arrivalDate);
      const departure = new Date(stop.departureDate);
      arrival.setHours(0, 0, 0, 0);
      departure.setHours(0, 0, 0, 0);
      if (today >= arrival && today < departure) {
        return stop.slug;
      }
    }
  }

  // If trip hasn't started, return first stop
  const tripStart = stops[0]?.arrivalDate;
  if (tripStart && today < new Date(tripStart)) {
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
    (new Date(thisStop.arrivalDate).getTime() - new Date(firstStop.arrivalDate).getTime()) / msPerDay
  );
  return diff + 1;
}
