import { NextRequest } from "next/server";
import { isValidApiKey } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DocumentKind } from "@/generated/prisma/enums";
import {
  labelFromFileName,
  parseDocDate,
  persistUploadedDocument,
  rejectOversizedBody,
  validateUploadFile,
} from "@/lib/document-upload";

export const runtime = "nodejs";

const KIND_VALUES = new Set<string>(Object.values(DocumentKind));

/**
 * Andiamo → Spitwise: metadata of every document, so the bot can answer
 * "¿dónde está el voucher del hostel de Roma?" off its own cache.
 *
 * Metadata only: `storagePath` and `externalUrl` never leave — the bot links to
 * /api/documents/<id>, the one route that resolves either source. No query
 * params on purpose (same shape as /api/notes): the filtering happens in
 * Spitwise's search_documents tool, over the synced rows.
 */
export async function GET(req: NextRequest) {
  if (!isValidApiKey(req.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const docs = await db.document.findMany({
    include: { stop: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  const payload = docs.map((d) => ({
    id: d.id,
    stopSlug: d.stop?.slug ?? null,
    label: d.label,
    note: d.note,
    kind: d.kind,
    source: d.source,
    docDate: d.docDate ? d.docDate.toISOString().slice(0, 10) : null,
    fileName: d.fileName,
    mimeType: d.mimeType,
    createdAt: d.createdAt.toISOString(),
  }));
  return Response.json(payload);
}

/**
 * Spitwise → Andiamo: the WhatsApp bot uploads travel documents here.
 * Auth is the shared X-Api-Key (same contract as /api/stops); the session
 * cookie gate in proxy.ts excludes /api/integration for this reason.
 */
export async function POST(req: NextRequest) {
  if (!isValidApiKey(req.headers.get("X-Api-Key"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const oversized = rejectOversizedBody(req);
  if (oversized) return Response.json({ error: oversized.error }, { status: oversized.status });

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

  let doc;
  try {
    doc = await persistUploadedDocument({
      file: file!,
      label: label || labelFromFileName(file!.name),
      note: note || null,
      kind,
      stopId,
      docDate,
    });
  } catch (e) {
    // The bot on the other end parses JSON. An R2 outage or a P2003 used to
    // hand it an HTML 500 page, which it can't turn into a message.
    console.error("[integration/documents] persist failed:", e);
    return Response.json({ error: "no se pudo guardar el documento" }, { status: 500 });
  }

  revalidatePath(stopSlug ? `/stops/${stopSlug}` : "/general");
  // /search indexes document text — without this the voucher the bot just
  // forwarded doesn't come up in a search for it.
  revalidatePath("/search");

  return Response.json({ id: doc.id, stopSlug: stopSlug || null, label: doc.label });
}
