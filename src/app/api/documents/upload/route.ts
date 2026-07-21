import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { DocumentKind } from "@/generated/prisma/enums";
import {
  labelFromFileName,
  parseDocDate,
  persistUploadedDocument,
  validateUploadFile,
} from "@/lib/document-upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = ((formData.get("label") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim();
  const kind = (formData.get("kind") as DocumentKind) ?? "other";
  const stopId = (formData.get("stopId") as string) || null;
  const docDate = parseDocDate((formData.get("docDate") as string) ?? "");

  const invalid = validateUploadFile(file);
  if (invalid) return Response.json({ error: invalid.error }, { status: invalid.status });

  const doc = await persistUploadedDocument({
    file: file!,
    label: label || labelFromFileName(file!.name),
    note: note || null,
    kind,
    stopId,
    docDate,
  });

  return Response.json({ id: doc.id });
}
