"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DocumentKind } from "@/generated/prisma/enums";

export async function createDocumentLink(formData: FormData) {
  const slug = formData.get("slug") as string | null;
  const stopId = (formData.get("stopId") as string) || null;

  await db.document.create({
    data: {
      stopId,
      label: formData.get("label") as string,
      kind: (formData.get("kind") as DocumentKind) ?? "other",
      source: "link",
      externalUrl: formData.get("url") as string,
    },
  });

  revalidatePath(slug ? `/stops/${slug}` : "/general");
}

export async function deleteDocument(id: string, path: string) {
  // Also delete file from disk if uploaded
  const doc = await db.document.findUnique({ where: { id }, select: { storagePath: true } });
  if (doc?.storagePath) {
    const { unlink } = await import("fs/promises");
    await unlink(doc.storagePath).catch(() => {});
  }
  await db.document.delete({ where: { id } });
  revalidatePath(path);
}
