import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DocumentKind } from "@/generated/prisma/enums";
import {
  labelFromFileName,
  parseDocDate,
  persistUploadedDocument,
  validateUploadFile,
} from "@/lib/document-upload";

export const runtime = "nodejs";

const KIND_VALUES = new Set<string>(Object.values(DocumentKind));

/**
 * Spitwise → Andiamo: the WhatsApp bot uploads travel documents here.
 * Auth is the shared X-Api-Key (same contract as /api/stops); the session
 * cookie gate in proxy.ts excludes /api/integration for this reason.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get("X-Api-Key");
  if (!key || key !== process.env.TRIP_SHARED_API_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const invalid = validateUploadFile(file);
  if (invalid) return Response.json({ error: invalid.error }, { status: invalid.status });

  const label = ((formData.get("label") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim();
  const kindRaw = ((formData.get("kind") as string) ?? "").trim();
  const kind = (KIND_VALUES.has(kindRaw) ? kindRaw : "other") as DocumentKind;
  const stopSlug = ((formData.get("stopSlug") as string) ?? "").trim();
  const docDate = parseDocDate((formData.get("docDate") as string) ?? "");

  let stopId: string | null = null;
  if (stopSlug) {
    const stop = await db.stop.findUnique({ where: { slug: stopSlug } });
    if (!stop) {
      return Response.json({ error: `stop desconocido: ${stopSlug}` }, { status: 422 });
    }
    stopId = stop.id;
  }

  const doc = await persistUploadedDocument({
    file: file!,
    label: label || labelFromFileName(file!.name),
    note: note || null,
    kind,
    stopId,
    docDate,
  });

  revalidatePath(stopSlug ? `/stops/${stopSlug}` : "/general");

  return Response.json({ id: doc.id, stopSlug: stopSlug || null, label: doc.label });
}
