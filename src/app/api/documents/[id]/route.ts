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
    // Response.redirect throws TypeError on a non-absolute URL, which would 500
    // instead of failing cleanly. The create/update schemas enforce http(s),
    // but seeds and any future writer bypass them.
    if (!/^https?:\/\//i.test(doc.externalUrl)) {
      return Response.json({ error: "El link guardado no es válido" }, { status: 422 });
    }
    return Response.redirect(doc.externalUrl);
  }

  if (doc.source === "upload" && doc.storagePath) {
    try {
      const stream = await getFromR2(doc.storagePath);
      // Sanitize the stored filename: quotes/newlines would corrupt the
      // header; non-ASCII goes in the RFC 5987 filename* parameter instead.
      const rawName = doc.fileName ?? id;
      const asciiName =
        rawName.replace(/[\r\n"\\]/g, "").replace(/[^\x20-\x7E]/g, "_") || id;
      return new Response(stream, {
        headers: {
          "Content-Type": doc.mimeType ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return Response.json({ error: "File not found in storage" }, { status: 404 });
    }
  }

  return Response.json({ error: "No source" }, { status: 400 });
}
