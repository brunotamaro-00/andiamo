"use server";

import { revalidatePath } from "next/cache";
import { db, isRecordMissing } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { parseForm, CreateNoteSchema, UpdateNoteSchema } from "./_schemas";

function derivedTitle(rawTitle: string, body: string): string {
  const t = rawTitle.trim();
  if (t) return t;
  // Fall back to first non-empty line of the body
  const firstLine = body.split("\n").find((l) => l.trim());
  return firstLine?.trim().slice(0, 80) || "Sin título";
}

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
}

export async function toggleNotePin(id: string, path: string) {
  await requireAuth();
  const note = await db.note.findUnique({ where: { id }, select: { pinned: true } });
  if (!note) return;
  await db.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidatePath(path);
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
}
