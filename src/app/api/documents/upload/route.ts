import { NextRequest } from "next/server";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { db } from "@/lib/db";
import { DocumentKind } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = formData.get("label") as string;
  const kind = (formData.get("kind") as DocumentKind) ?? "other";
  const stopId = (formData.get("stopId") as string) || null;

  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const uploadDir = process.env.UPLOAD_DIR ?? "/data/uploads";
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = join(uploadDir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const doc = await db.document.create({
    data: {
      stopId,
      label,
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
