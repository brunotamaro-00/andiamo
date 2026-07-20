import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SearchBox } from "@/components/SearchBox";
import { RecentSearches } from "@/components/RecentSearches";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import {
  Search, MapPin, StickyNote, FileText, ChevronRight, FolderOpen, BookOpen,
} from "lucide-react";
import { searchGuides } from "@/lib/guides";
import { Flag } from "@/components/Flag";
import { getPerson } from "@/lib/person-server";
import { stopVisibleTo } from "@/lib/person";

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

  const viewer = await getPerson();
  const [stopHits, poiHits, noteHits, docHits] = hasQuery
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
          select: { slug: true, name: true, country: true, countryFlag: true, ownerPerson: true },
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
            stop: { select: { slug: true, name: true, countryFlag: true, ownerPerson: true } },
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
            stop: { select: { slug: true, name: true, countryFlag: true, ownerPerson: true } },
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
            stop: { select: { slug: true, name: true, countryFlag: true, ownerPerson: true } },
          },
        }),
      ])
    : [[], [], [], []];

  // Person-scoped stops (and their POIs/notes/docs) only surface for their
  // owner; general (stopless) notes/docs always show. "Ambos" sees everything.
  const stops = stopHits.filter((s) => stopVisibleTo(s, viewer));
  const pois = poiHits.filter((p) => stopVisibleTo(p.stop, viewer));
  const notes = noteHits.filter((n) => !n.stop || stopVisibleTo(n.stop, viewer));
  const documents = docHits.filter((d) => !d.stop || stopVisibleTo(d.stop, viewer));

  const guideHits = hasQuery ? searchGuides(query) : [];

  const total = stops.length + pois.length + notes.length + documents.length + guideHits.length;

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader subtitle="Buscar" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        <div className="animate-fade-in">
          <SearchBox initialQuery={query} />
        </div>

        {!hasQuery && (
          <>
            <RecentSearches />
            <EmptyState
              icon={Search}
              title="Buscá en todo el viaje"
              description="Encontrá ciudades, puntos de interés y notas. Escribí al menos 2 letras."
            />
          </>
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

        {hasQuery && guideHits.length > 0 && (
          <section>
            <ResultHeading icon={BookOpen} label="Guías" count={guideHits.length} />
            <div className="space-y-1.5">
              {guideHits.map(({ guide, doc }) => (
                <ResultRow
                  key={doc ? `${guide.slug}/${doc.slug}` : guide.slug}
                  href={doc ? `/guias/${guide.slug}/${doc.slug}` : `/guias/${guide.slug}`}
                  flag={guide.countryFlag}
                  title={doc ? doc.title : guide.title}
                  subtitle={doc ? `Guía de ${guide.title}` : guide.country}
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
    <h2 className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 uppercase tracking-[0.08em] mb-2">
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
  const className = "flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-surface hover:border-border-strong active:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

  const inner = (
    <>
      <span className="text-lg shrink-0" aria-hidden="true">
        {flag ? <Flag flag={flag} /> : Fallback ? <Fallback size={16} strokeWidth={1.5} className="text-ink-3" /> : "•"}
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
