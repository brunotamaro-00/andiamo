import { db } from "@/lib/db";
import { isValidApiKey } from "@/lib/session";

function toDateStr(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export async function GET(request: Request): Promise<Response> {
  if (!isValidApiKey(request.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  // Pseudo-cities (Pititas) live only in Andiamo's per-person view. Spitwise
  // seeds its own local Pititas row, so exposing ours here would collide on slug.
  const stops = await db.stop.findMany({
    where: { isLocal: false },
    orderBy: { order: "asc" },
  });
  const payload = stops.map((s) => ({
    slug: s.slug,
    order: s.order,
    name: s.name,
    country: s.country,
    countryFlag: s.countryFlag,
    arrivalDate: toDateStr(s.arrivalDate),
    departureDate: toDateStr(s.departureDate),
    nights: s.nights,
    currencyCode: s.currencyCode,
    timezone: s.timezone,
    isCandidate: s.isCandidate,
    isFlexMargin: s.isFlexMargin,
  }));
  return Response.json(payload);
}
