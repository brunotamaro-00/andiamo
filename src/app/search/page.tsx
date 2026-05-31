import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SearchBox } from "@/components/SearchBox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft, Search, MapPin, StickyNote, FileText, ChevronRight, FolderOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buscar · Andiamo" };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  await requireAuth();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const hasQuery = query.length >= 2;

  const [stops, pois, notes, documents] = hasQuery
    ? await Promise.all([
        db.stop.findMany({
          where: {
            isFlexMargin: false,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { country: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { order: "asc" },
          select: { slug: true, name: true, country: true, countryFlag: true },
        }),
        db.poi.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: [{ done: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            done: true,
            stop: { select: { slug: true, name: true, countryFlag: true } },
          },
        }),
        db.note.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { body: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            stop: { select: { slug: true, name: true, countryFlag: true } },
          },
        }),
        db.document.findMany({
          where: {
            label: { contains: query, mode: "insensitive" },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            label: true,
            kind: true,
            stop: { select: { slug: true, name: true, countryFlag: true } },
          },
        }),
      ])
    : [[], [], [], []];

  const total = stops.length + pois.length + notes.length + documents.length;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Link
            href="/stops"
            aria-label="Volver al itinerario"
            className="h-10 w-10 -ml-1 flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <SearchBox initialQuery={query} />
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        {!hasQuery && (
          <EmptyState
            icon={Search}
            title="Buscá en todo el viaje"
            description="Encontrá ciudades, puntos de interés y notas. Escribí al menos 2 letras."
          />
        )}

        {hasQuery && total === 0 && (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description={`No encontramos nada para “${query}”.`}
          />
        )}

        {hasQuery && stops.length > 0 && (
          <section>
            <ResultHeading icon={MapPin} label="Ciudades" count={stops.length} />
            <div className="space-y-1.5">
              {stops.map((s) => (
                <ResultRow
                  key={s.slug}
                  href={`/stops/${s.slug}`}
                  flag={s.countryFlag}
                  title={s.name}
                  subtitle={s.country}
                />
              ))}
            </div>
          </section>
        )}

        {hasQuery && pois.length > 0 && (
          <section>
            <ResultHeading icon={MapPin} label="Puntos de interés" count={pois.length} />
            <div className="space-y-1.5">
              {pois.map((p) => (
                <ResultRow
                  key={p.id}
                  href={`/stops/${p.stop.slug}#pois`}
                  flag={p.stop.countryFlag}
                  title={p.name}
                  subtitle={p.stop.name}
                  badge={p.done ? <Badge variant="success">hecho</Badge> : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {hasQuery && notes.length > 0 && (
          <section>
            <ResultHeading icon={StickyNote} label="Notas" count={notes.length} />
            <div className="space-y-1.5">
              {notes.map((n) => (
                <ResultRow
                  key={n.id}
                  href={n.stop ? `/stops/${n.stop.slug}#notas` : "/general#notas"}
                  flag={n.stop?.countryFlag}
                  fallbackIcon={FileText}
                  title={n.title}
                  subtitle={n.stop ? n.stop.name : "General del viaje"}
                />
              ))}
            </div>
          </section>
        )}

        {hasQuery && documents.length > 0 && (
          <section>
            <ResultHeading icon={FolderOpen} label="Documentos" count={documents.length} />
            <div className="space-y-1.5">
              {documents.map((d) => (
                <ResultRow
                  key={d.id}
                  href={`/api/documents/${d.id}`}
                  external
                  flag={d.stop?.countryFlag}
                  fallbackIcon={FileText}
                  title={d.label}
                  subtitle={d.stop ? d.stop.name : "General del viaje"}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ResultHeading({
  icon: Icon, label, count,
}: {
  icon: typeof MapPin; label: string; count: number;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2">
      <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
      {label}
      <span className="text-ink-faint normal-case font-normal">({count})</span>
    </h2>
  );
}

function ResultRow({
  href, flag, fallbackIcon: Fallback, title, subtitle, badge, external,
}: {
  href: string;
  flag?: string;
  fallbackIcon?: typeof MapPin;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  external?: boolean;
}) {
  const className = "flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-surface hover:border-border-strong active:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

  const inner = (
    <>
      <span className="text-lg shrink-0" aria-hidden="true">
        {flag ?? (Fallback ? <Fallback size={16} strokeWidth={1.5} className="text-ink-3" /> : "•")}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-ink truncate">{title}</span>
          {badge}
        </div>
        <p className="text-xs text-ink-3 truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" className="text-border-strong shrink-0" />
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
