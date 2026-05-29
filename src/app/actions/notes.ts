"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createNote(formData: FormData) {
  const slug = formData.get("slug") as string | null;
  const stopId = (formData.get("stopId") as string) || null;

  await db.note.create({
    data: {
      stopId,
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || "",
      pinned: formData.get("pinned") === "true",
    },
  });

  revalidatePath(slug ? `/stops/${slug}` : "/general");
}

export async function toggleNotePin(id: string, path: string) {
  const note = await db.note.findUnique({ where: { id }, select: { pinned: true } });
  if (!note) return;
  await db.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidatePath(path);
}

export async function deleteNote(id: string, path: string) {
  await db.note.delete({ where: { id } });
  revalidatePath(path);
}

export async function updateNote(id: string, formData: FormData, path: string) {
  await db.note.update({
    where: { id },
    data: {
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || "",
    },
  });
  revalidatePath(path);
}
