import { buildGuidesExport } from "@/lib/guides-export";
import { isValidApiKey } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!isValidApiKey(request.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await buildGuidesExport());
}
