import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { isValidApiKey } from "@/lib/session";
import { notifyNotesChanged } from "@/lib/spitwise";
import { CreateNoteApiSchema, derivedTitle } from "@/app/actions/_schemas";

export const dynamic = "force-dynamic";

/**
 * Spitwise → Andiamo: the WhatsApp bot dictates trip notes here.
 * Auth is the shared X-Api-Key (same contract as /api/integration/documents);
 * the session cookie gate in proxy.ts excludes /api/integration for this reason.
 *
 * The notifyNotesChanged() ping goes back to Spitwise so its TripNote cache
 * picks the note up right away. That is not a loop: Spitwise's sync only reads.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isValidApiKey(request.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "body inválido" }, { status: 400 });
  }

  const parsed = CreateNoteApiSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "body inválido" }, { status: 400 });
  }
  const { stopSlug, title, body, pinned } = parsed.data;

  // A note with neither title nor body is nothing at all — the bot should have
  // asked for the content instead of posting an empty row.
  if (!title.trim() && !body.trim()) {
    return Response.json({ error: "la nota no tiene contenido" }, { status: 400 });
  }

  const slug = stopSlug?.trim() || null;
  let stopId: string | null = null;
  if (slug) {
    const stop = await db.stop.findUnique({ where: { slug } });
    if (!stop) {
      return Response.json({ error: `stop desconocido: ${slug}` }, { status: 422 });
    }
    stopId = stop.id;
  }

  let note;
  try {
    note = await db.note.create({
      data: { stopId, title: derivedTitle(title, body), body, pinned },
    });
  } catch (e) {
    // The bot parses JSON; an HTML 500 page is something it can't turn into a
    // message. Same reasoning as /api/integration/documents.
    console.error("[integration/notes] create failed:", e);
    return Response.json({ error: "no se pudo guardar la nota" }, { status: 500 });
  }

  revalidatePath(slug ? `/stops/${slug}` : "/general");
  // /search indexes note text — without this the note the bot just dictated
  // doesn't come up in a search for it.
  revalidatePath("/search");
  after(() => notifyNotesChanged());

  return Response.json({ id: note.id, stopSlug: slug, title: note.title });
}
