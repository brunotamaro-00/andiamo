import { NextRequest } from "next/server";
import { geocodeCity } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }
  const results = await geocodeCity(q);
  return Response.json({ results }, {
    headers: { "Cache-Control": "public, s-maxage=86400" },
  });
}
