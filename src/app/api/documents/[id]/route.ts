import { NextRequest } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  if (doc.source === "link" && doc.externalUrl) {
    return Response.redirect(doc.externalUrl);
  }

  if (doc.source === "upload" && doc.storagePath) {
    try {
      await stat(doc.storagePath);
    } catch {
      return Response.json({ error: "File not found on disk" }, { status: 404 });
    }

    const stream = createReadStream(doc.storagePath);
    const nodeResponse = new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.fileName ?? id}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
    return nodeResponse;
  }

  return Response.json({ error: "No source" }, { status: 400 });
}
