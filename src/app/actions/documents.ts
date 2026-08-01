"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, isRecordMissing } from "@/lib/db";
import { notifyDocumentsChanged } from "@/lib/spitwise";
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
  // /search indexes document.label — notes.ts already does this.
  revalidatePath("/search");
  // Uploads ping from persistUploadedDocument; links have no other path.
  after(() => notifyDocumentsChanged());
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
  revalidatePath("/search");
  after(() => notifyDocumentsChanged());
}

export async function deleteDocument(id: string, path: string) {
  await requireAuth();

  const doc = await db.document.findUnique({ where: { id }, select: { storagePath: true } });

  // DB first, R2 after — same order as deleteStop. Deleting the file first meant
  // that any DB failure other than "already gone" left the row pointing at a
  // storagePath that no longer existed, so /api/documents/[id] 404'd forever.
  // The reverse leaves at worst an orphaned file, which is recoverable.
  try {
    await db.document.delete({ where: { id } });
  } catch (e) {
    // Already gone (double-tap delete) — the desired state holds
    if (!isRecordMissing(e)) throw e;
  }

  if (doc?.storagePath) {
    const { deleteFromR2 } = await import("@/lib/r2");
    await deleteFromR2(doc.storagePath).catch(() => {});
  }

  revalidatePath(path);
  revalidatePath("/search");
  after(() => notifyDocumentsChanged());
}
