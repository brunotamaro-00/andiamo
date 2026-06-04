import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  if (doc.source === "link" && doc.externalUrl) {
    return Response.redirect(doc.externalUrl);
  }

  if (doc.source === "upload" && doc.storagePath) {
    try {
      const stream = await getFromR2(doc.storagePath);
      return new Response(stream, {
        headers: {
          "Content-Type": doc.mimeType ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${doc.fileName ?? id}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return Response.json({ error: "File not found in storage" }, { status: 404 });
    }
  }

  return Response.json({ error: "No source" }, { status: 400 });
}
