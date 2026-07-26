import { db } from "@/lib/db";
import { isValidApiKey } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!isValidApiKey(request.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const notes = await db.note.findMany({
    include: { stop: { select: { slug: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const payload = notes.map((n) => ({
    id: n.id,
    stopSlug: n.stop?.slug ?? null,
    title: n.title,
    body: n.body,
    pinned: n.pinned,
    updatedAt: n.updatedAt.toISOString(),
  }));
  return Response.json(payload);
}
