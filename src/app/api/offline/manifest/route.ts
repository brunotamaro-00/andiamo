import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { getRoutedGuides, getTripDocs, guideDocs } from "@/lib/guides";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** URLs the service worker should precache for offline reading ("Descargar
 *  viaje"): every stop/guide page HTML plus every uploaded document. Link
 *  documents are excluded — their /api/documents/* route redirects off-site. */
export async function GET(): Promise<Response> {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stops, uploadedDocs] = await Promise.all([
    // No isLocal filter: that one belongs to the Spitwise sync (/api/stops).
    // Pseudo-cities like Pititas are a real, visitable stop detail page — and
    // Katia's *current* one — so excluding them here meant "Descargar viaje"
    // skipped the very page she needs offline.
    db.stop.findMany({
      orderBy: { order: "asc" },
      select: { slug: true },
    }),
    db.document.findMany({
      where: { source: "upload" },
      select: { id: true },
    }),
  ]);

  const routes = [
    "/stops",
    "/general",
    "/search",
    "/guias",
    ...stops.map((s) => `/stops/${s.slug}`),
    // Trip-wide docs ("El viaje") hang off /general, not /guias.
    ...getTripDocs().map((d) => `/general/${d.slug}`),
    // guideDocs() also walks the city groups nested in the regional guides
    // (Sicilia, Puglia…) — otherwise most of the South would stay online-only.
    ...getRoutedGuides().flatMap((g) => [
      `/guias/${g.slug}`,
      ...guideDocs(g).map((d) => `/guias/${g.slug}/${d.slug}`),
    ]),
  ];

  const docs = uploadedDocs.map((d) => `/api/documents/${d.id}`);

  return Response.json({ routes, docs });
}
