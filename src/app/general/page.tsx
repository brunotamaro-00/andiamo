import Link from "next/link";
import { db } from "@/lib/db";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "General — Europa 2026" };

export default async function GeneralPage() {
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
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <Link href="/stops" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
          ← Itinerario
        </Link>
        <h1 className="flex-1 text-sm font-semibold text-slate-100 text-center">General del viaje</h1>
        <div className="w-16" />
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Documentos y notas del viaje</h2>
          <p className="text-xs text-slate-500">
            Seguro, vuelos, pasaportes, UK ETA, ETIAS — todo lo que aplica a todo el viaje.
          </p>
        </div>

        <NotesPanel
          stopId={null}
          slug={null}
          notes={notes.map((n) => ({ ...n, createdAt: n.createdAt }))}
          path="/general"
        />

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
