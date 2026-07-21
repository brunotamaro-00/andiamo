import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { DocumentKind } from "@/generated/prisma/enums";

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

  return db.document.create({
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
}
