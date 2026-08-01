import { db } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { DocumentKind } from "@/generated/prisma/enums";

/** Valid DocumentKind values, derived from the Prisma enum. */
const KIND_VALUES = new Set<string>(Object.values(DocumentKind));

/** Narrow an untrusted `kind` to the enum, falling back to "other". */
export function parseDocKind(raw: unknown): DocumentKind {
  return (KIND_VALUES.has(String(raw)) ? raw : "other") as DocumentKind;
}

/** Keep in sync with the client-side validation in DocumentsPanel. */
export const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

export type UploadValidationError = {
  status: 400 | 413 | 415;
  error: string;
};

/**
 * Rejects an oversized body *before* `req.formData()` buffers it into memory.
 *
 * The size check in validateUploadFile only runs once the whole request is
 * already materialised, so a single accidental POST — a video picked in the iOS
 * file dialog, a big WhatsApp attachment forwarded by the bot — could exhaust
 * the standalone process and take the app down mid-trip. The multipart envelope
 * adds a little overhead on top of the file, hence the slack.
 */
export function rejectOversizedBody(req: Request): UploadValidationError | null {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES + 64 * 1024) {
    return { status: 413, error: "El archivo supera el máximo de 20 MB" };
  }
  return null;
}

export function validateUploadFile(file: File | null): UploadValidationError | null {
  if (!file) return { status: 400, error: "Falta el archivo" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(file.type) || !ALLOWED_EXT.has(ext)) {
    return { status: 415, error: "Tipo de archivo no permitido (PDF, JPG, PNG o WebP)" };
  }
  if (file.size > MAX_BYTES) {
    return { status: 413, error: "El archivo supera el máximo de 20 MB" };
  }
  return null;
}

export function labelFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || fileName;
}

export function parseDocDate(raw: string): Date | null {
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(trimmed) : null;
}

/** Uploads the file to R2 and creates the Document row. File must be pre-validated. */
export async function persistUploadedDocument(params: {
  file: File;
  label: string;
  note: string | null;
  kind: DocumentKind;
  stopId: string | null;
  docDate: Date | null;
}) {
  const { file } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToR2(key, buffer, file.type);

  try {
    return await db.document.create({
      data: {
        stopId: params.stopId,
        label: params.label,
        note: params.note,
        kind: params.kind,
        source: "upload",
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath: key,
        docDate: params.docDate,
      },
    });
  } catch (e) {
    // The file is already in R2 at this point. Without this rollback a failed
    // insert (e.g. P2003 from a stopId deleted concurrently) left the object
    // orphaned in the bucket forever, with no row to ever reference it.
    await deleteFromR2(key).catch(() => {});
    throw e;
  }
}
