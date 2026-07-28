import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { IS_DEMO } from "@/lib/demo";
import {
  labelFromFileName,
  parseDocDate,
  parseDocKind,
  persistUploadedDocument,
  validateUploadFile,
} from "@/lib/document-upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The UI already hides file upload in demo mode; this keeps a hand-crafted
  // request from hitting R2 with no credentials and 500ing.
  if (IS_DEMO) {
    return Response.json(
      { error: "La demo no acepta archivos — agregá el documento como link." },
      { status: 403 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = ((formData.get("label") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim();
  // Untrusted: an out-of-enum value used to reach db.document.create and blow up
  // *after* the file was already in R2, 500ing without a JSON body.
  const kind = parseDocKind(formData.get("kind"));
  const stopId = (formData.get("stopId") as string) || null;
  const docDate = parseDocDate((formData.get("docDate") as string) ?? "");

  const invalid = validateUploadFile(file);
  if (invalid) return Response.json({ error: invalid.error }, { status: invalid.status });

  if (stopId && !(await db.stop.findUnique({ where: { id: stopId }, select: { id: true } }))) {
    return Response.json({ error: "La parada no existe" }, { status: 422 });
  }

  try {
    const doc = await persistUploadedDocument({
      file: file!,
      label: label || labelFromFileName(file!.name),
      note: note || null,
      kind,
      stopId,
      docDate,
    });
    return Response.json({ id: doc.id });
  } catch (e) {
    // persistUploadedDocument already rolled the R2 object back. Answer with JSON
    // so the client shows a real message instead of "No se pudo subir el archivo".
    console.error("[documents/upload] persist failed:", e);
    return Response.json({ error: "No se pudo guardar el documento" }, { status: 500 });
  }
}
