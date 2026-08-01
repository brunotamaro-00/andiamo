"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, isRecordMissing } from "@/lib/db";
import { notifyNotesChanged } from "@/lib/spitwise";
import { requireAuth } from "@/lib/auth";
import { parseForm, CreateNoteSchema, UpdateNoteSchema, derivedTitle } from "./_schemas";

export async function createNote(formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, CreateNoteSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { slug, stopId, title: rawTitle, body, pinned } = parsed.data;

  try {
    await db.note.create({
      data: {
        stopId: stopId ?? null,
        title: derivedTitle(rawTitle, body),
        body,
        pinned,
      },
    });
  } catch (e) {
    if (isRecordMissing(e)) return { error: "Parada no encontrada" };
    throw e;
  }

  revalidatePath(slug ? `/stops/${slug}` : "/general");
  revalidatePath("/search");
  after(() => notifyNotesChanged());
}

export async function toggleNotePin(id: string, path: string) {
  await requireAuth();
  const note = await db.note.findUnique({ where: { id }, select: { pinned: true } });
  // Returning undefined read as success to useOptimisticList, which kept the
  // optimistic pin on screen even though nothing was written.
  if (!note) return { error: "Nota no encontrada" };
  try {
    await db.note.update({ where: { id }, data: { pinned: !note.pinned } });
  } catch (e) {
    if (isRecordMissing(e)) return { error: "Nota no encontrada" };
    throw e;
  }
  revalidatePath(path);
  // /search renders pinned notes first — same rule as every other note mutation.
  revalidatePath("/search");
  after(() => notifyNotesChanged());
}

export async function deleteNote(id: string, path: string) {
  await requireAuth();
  try {
    await db.note.delete({ where: { id } });
  } catch (e) {
    // Already gone (double-tap delete) — the desired state holds
    if (!isRecordMissing(e)) throw e;
  }
  revalidatePath(path);
  revalidatePath("/search");
  after(() => notifyNotesChanged());
}

export async function updateNote(id: string, formData: FormData, path: string) {
  await requireAuth();

  const parsed = parseForm(formData, UpdateNoteSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { title: rawTitle, body } = parsed.data;

  try {
    await db.note.update({
      where: { id },
      data: {
        title: derivedTitle(rawTitle, body),
        body,
      },
    });
  } catch (e) {
    if (isRecordMissing(e)) return { error: "Nota no encontrada" };
    throw e;
  }
  revalidatePath(path);
  revalidatePath("/search");
  after(() => notifyNotesChanged());
}
