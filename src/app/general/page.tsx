import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Globe } from "lucide-react";
import { db } from "@/lib/db";
import { getTripDocs } from "@/lib/guides";
import { cardClass } from "@/components/ui/Card";
import { requireAuth } from "@/lib/auth";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { DownloadTripButton } from "@/components/DownloadTripButton";
import { PageHeader } from "@/components/PageHeader";
import { HashScroller } from "@/components/HashScroller";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "General · Andiamo" };

export default async function GeneralPage() {
  await requireAuth();
  // Trip-wide guide docs (Eurail, presupuesto, packing list) read here, not
  // under /guias: they are about the trip, not about a country. Empty in the
  // demo, which drops them from the manifest.
  const tripDocs = getTripDocs();
  const [notes, documents] = await Promise.all([
    db.note.findMany({
      where: { stopId: null },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    }),
    db.document.findMany({
      where: { stopId: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle="General del viaje" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />

        {tripDocs.length > 0 && (
          <section className="animate-fade-in">
            <p className="label-caps text-ink-3 mb-2 flex items-center gap-2">
              <Globe size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              El viaje
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </p>
            <div className={`${cardClass} divide-y divide-border`}>
              {tripDocs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/general/${doc.slug}`}
                  className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
                >
                  <FileText size={16} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                    {doc.title}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div id="notas" className="scroll-mt-20">
          <NotesPanel
            stopId={null}
            slug={null}
            notes={notes.map((n) => ({ ...n, createdAt: n.createdAt }))}
            path="/general"
          />
        </div>

        <DocumentsPanel
          stopId={null}
          slug={null}
          documents={documents.map((d) => ({
            ...d,
            docDate: d.docDate ? d.docDate.toISOString().slice(0, 10) : null,
          })) as Parameters<typeof DocumentsPanel>[0]["documents"]}
          path="/general"
        />

        <DownloadTripButton />
      </main>
    </div>
  );
}
