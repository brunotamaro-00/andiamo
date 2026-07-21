import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const key = request.headers.get("X-Api-Key");
  if (!key || key !== process.env.TRIP_SHARED_API_KEY) {
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
