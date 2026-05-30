import { NextRequest } from "next/server";
import { searchPlaces } from "@/lib/places";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  const latParam = req.nextUrl.searchParams.get("lat");
  const lngParam = req.nextUrl.searchParams.get("lng");
  const lat = latParam ? parseFloat(latParam) : undefined;
  const lng = lngParam ? parseFloat(lngParam) : undefined;

  const results = await searchPlaces(q, { lat, lng });
  return Response.json({ results }, {
    headers: { "Cache-Control": "public, s-maxage=86400" },
  });
}
