"use server";

import { revalidatePath } from "next/cache";
import { db, isRecordMissing } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { DocumentKind } from "@/generated/prisma/enums";
import { parseForm, CreateDocumentLinkSchema, UpdateDocumentSchema } from "./_schemas";

export async function createDocumentLink(formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, CreateDocumentLinkSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { slug, stopId, label, note, kind, docDate, url } = parsed.data;

  try {
    await db.document.create({
      data: {
        stopId: stopId ?? null,
        label,
        note: note || null,
        kind: (kind as DocumentKind) ?? "other",
        source: "link",
        externalUrl: url,
        docDate: docDate ? new Date(docDate) : null,
      },
    });
  } catch (e) {
    if (isRecordMissing(e)) return { error: "Parada no encontrada" };
    throw e;
  }

  revalidatePath(slug ? `/stops/${slug}` : "/general");
}

export async function updateDocument(id: string, formData: FormData, path: string) {
  await requireAuth();

  const parsed = parseForm(formData, UpdateDocumentSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { label, note, kind, docDate, url } = parsed.data;

  try {
    await db.document.update({
      where: { id },
      data: {
        label,
        note: note || null,
        kind: (kind as DocumentKind) ?? "other",
        docDate: docDate ? new Date(docDate) : null,
        // Only link documents send a URL; uploads omit it and keep their file.
        ...(url !== undefined ? { externalUrl: url } : {}),
      },
    });
  } catch (e) {
    if (isRecordMissing(e)) return { error: "Documento no encontrado" };
    throw e;
  }

  revalidatePath(path);
}

export async function deleteDocument(id: string, path: string) {
  await requireAuth();
  // Also delete file from disk if uploaded
  const doc = await db.document.findUnique({ where: { id }, select: { storagePath: true } });
  if (doc?.storagePath) {
    const { deleteFromR2 } = await import("@/lib/r2");
    await deleteFromR2(doc.storagePath).catch(() => {});
  }
  try {
    await db.document.delete({ where: { id } });
  } catch (e) {
    // Already gone (double-tap delete) — the desired state holds
    if (!isRecordMissing(e)) throw e;
  }
  revalidatePath(path);
}
