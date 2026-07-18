import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { DocumentKind } from "@/generated/prisma/enums";

export const runtime = "nodejs";

/** Keep in sync with the client-side validation in DocumentsPanel. */
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = ((formData.get("label") as string) ?? "").trim();
  const kind = (formData.get("kind") as DocumentKind) ?? "other";
  const stopId = (formData.get("stopId") as string) || null;
  const docDateRaw = ((formData.get("docDate") as string) ?? "").trim();
  const docDate = /^\d{4}-\d{2}-\d{2}$/.test(docDateRaw) ? new Date(docDateRaw) : null;

  if (!file) return Response.json({ error: "Falta el archivo" }, { status: 400 });
  const effectiveLabel = label || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || file.name;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(file.type) || !ALLOWED_EXT.has(ext)) {
    return Response.json(
      { error: "Tipo de archivo no permitido (PDF, JPG, PNG o WebP)" },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "El archivo supera el máximo de 20 MB" },
      { status: 413 }
    );
  }

  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToR2(key, buffer, file.type);

  const doc = await db.document.create({
    data: {
      stopId,
      label: effectiveLabel,
      kind,
      source: "upload",
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: key,
      docDate,
    },
  });

  return Response.json({ id: doc.id });
}
