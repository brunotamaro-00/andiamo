import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return Response.json({ error: "Missing lat/lng" }, { status: 400 });
  }
  if (!Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lng))) {
    return Response.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset");
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) return Response.json({ error: "Weather API error" }, { status: 502 });

  const data = await res.json();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
