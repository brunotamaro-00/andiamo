import { db } from "@/lib/db";

function toDateStr(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export async function GET(request: Request): Promise<Response> {
  const key = request.headers.get("X-Api-Key");
  if (!key || key !== process.env.TRIP_SHARED_API_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const stops = await db.stop.findMany({ orderBy: { order: "asc" } });
  const payload = stops.map((s) => ({
    slug: s.slug,
    order: s.order,
    name: s.name,
    country: s.country,
    countryFlag: s.countryFlag,
    arrivalDate: toDateStr(s.arrivalDate),
    departureDate: toDateStr(s.departureDate),
    nights: s.nights,
    datesFixed: s.datesFixed,
    currencyCode: s.currencyCode,
    timezone: s.timezone,
    isTransit: s.isTransit,
    isCandidate: s.isCandidate,
    isFlexMargin: s.isFlexMargin,
  }));
  return Response.json(payload);
}
