import { buildGuidesExport } from "@/lib/guides-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const key = request.headers.get("X-Api-Key");
  if (!key || key !== process.env.TRIP_SHARED_API_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await buildGuidesExport());
}
