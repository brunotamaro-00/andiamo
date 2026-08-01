import { NextRequest } from "next/server";
import { geocodeCity } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  // Bounded before it's forwarded upstream — the box is a free-text field.
  if (!q || q.length < 2 || q.length > 100) {
    return Response.json({ results: [] });
  }
  const results = await geocodeCity(q);
  // `private`: this route sits behind the session cookie, so a shared proxy has
  // no business holding the response on behalf of another user.
  return Response.json({ results }, {
    headers: { "Cache-Control": "private, max-age=86400" },
  });
}
