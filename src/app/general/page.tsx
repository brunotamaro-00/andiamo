import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader subtitle="General del viaje" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />
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
