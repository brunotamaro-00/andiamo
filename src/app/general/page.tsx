import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { ArrowLeft } from "lucide-react";
import { HashScroller } from "@/components/HashScroller";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "General · Andiamo" };

export default async function GeneralPage() {
  await requireAuth();
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
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Link
          href="/stops"
          className="text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Itinerario
        </Link>
        <h1 className="flex-1 text-sm font-medium text-ink-2 text-center">
          General del viaje
        </h1>
        <div className="w-20" />
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />
        <div className="bg-surface rounded-[6px] border-2 border-border p-4">
          <h2 className="text-sm font-semibold text-ink mb-1">
            Documentos y notas del viaje
          </h2>
          <p className="text-xs text-ink-3">
            Documentos y notas que aplican a todo el viaje, no a una parada específica.
          </p>
        </div>

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
          documents={documents as Parameters<typeof DocumentsPanel>[0]["documents"]}
          path="/general"
        />
      </main>
    </div>
  );
}
