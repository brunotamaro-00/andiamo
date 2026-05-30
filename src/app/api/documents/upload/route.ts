import { NextRequest } from "next/server";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
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

  if (!file) return Response.json({ error: "Falta el archivo" }, { status: 400 });
  // Derive label from filename if not provided (e.g. "voucher_hostel.pdf" → "voucher_hostel")
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

  const uploadDir = process.env.UPLOAD_DIR ?? "/data/uploads";
  await mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = join(uploadDir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const doc = await db.document.create({
    data: {
      stopId,
      label: effectiveLabel,
      kind,
      source: "upload",
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: filePath,
    },
  });

  return Response.json({ id: doc.id });
}
