"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function derivedTitle(rawTitle: string, body: string): string {
  const t = rawTitle.trim();
  if (t) return t;
  // Fall back to first non-empty line of the body
  const firstLine = body.split("\n").find((l) => l.trim());
  return firstLine?.trim().slice(0, 80) || "Sin título";
}

export async function createNote(formData: FormData) {
  await requireAuth();
  const slug = formData.get("slug") as string | null;
  const stopId = (formData.get("stopId") as string) || null;
  const rawTitle = (formData.get("title") as string) || "";
  const body = (formData.get("body") as string) || "";

  await db.note.create({
    data: {
      stopId,
      title: derivedTitle(rawTitle, body),
      body,
      pinned: formData.get("pinned") === "true",
    },
  });

  revalidatePath(slug ? `/stops/${slug}` : "/general");
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
  await db.note.delete({ where: { id } });
  revalidatePath(path);
}

export async function updateNote(id: string, formData: FormData, path: string) {
  await requireAuth();
  const rawTitle = (formData.get("title") as string) || "";
  const body = (formData.get("body") as string) || "";
  await db.note.update({
    where: { id },
    data: {
      title: derivedTitle(rawTitle, body),
      body,
    },
  });
  revalidatePath(path);
}
