import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { collectUrgentSections, STOP_TO_GUIDES, type UrgentEntry } from "@/lib/guides";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reservas urgentes · Andiamo" };

/** Earliest arrival date per guide slug, derived from the stops that map to it. */
function guideArrivalIndex(
  stops: { slug: string; arrivalDate: Date | null }[]
): Map<string, Date> {
  const index = new Map<string, Date>();
  for (const stop of stops) {
    if (!stop.arrivalDate) continue;
    for (const guideSlug of STOP_TO_GUIDES[stop.slug] ?? []) {
      const current = index.get(guideSlug);
      if (!current || stop.arrivalDate < current) index.set(guideSlug, stop.arrivalDate);
    }
  }
  return index;
}

export default async function UrgentReservationsPage() {
  await requireAuth();

  const [entries, stops] = await Promise.all([
    collectUrgentSections(),
    db.stop.findMany({
      where: { isFlexMargin: false },
      orderBy: { order: "asc" },
      select: { slug: true, arrivalDate: true },
    }),
  ]);

  const arrivals = guideArrivalIndex(stops);

  // Trip-wide sections first, then city guides by arrival date, undated last.
  const sorted = [...entries].sort((a, b) => {
    const aGeneral = a.guide.country === "General" ? 0 : 1;
    const bGeneral = b.guide.country === "General" ? 0 : 1;
    if (aGeneral !== bGeneral) return aGeneral - bGeneral;
    const aDate = arrivals.get(a.guide.slug)?.getTime() ?? Infinity;
    const bDate = arrivals.get(b.guide.slug)?.getTime() ?? Infinity;
    return aDate - bDate;
  });

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader subtitle="Reservas urgentes" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <Link
          href="/guias"
          className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1 py-0.5"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          Guías
        </Link>

        <div className="flex items-center gap-3 bg-brick-bg border-2 border-brick-border rounded-[4px] px-4 py-3 card-shadow animate-fade-in">
          <AlertTriangle size={20} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
          <p className="text-xs text-brick-ink font-semibold">
            Todo lo que conviene reservar con anticipación, extraído de las guías y ordenado por
            llegada a cada parada.
          </p>
        </div>

        {sorted.map((entry, idx) => (
          <UrgentCard
            key={`${entry.guide.slug}/${entry.doc.slug}`}
            entry={entry}
            arrival={arrivals.get(entry.guide.slug) ?? null}
            stagger={idx < 6 ? `stagger-${idx + 1}` : ""}
          />
        ))}
      </main>
    </div>
  );
}

function UrgentCard({
  entry,
  arrival,
  stagger,
}: {
  entry: UrgentEntry;
  arrival: Date | null;
  stagger: string;
}) {
  const { guide, doc, body } = entry;
  const isGeneral = guide.country === "General";

  return (
    <article className={`bg-surface rounded-[4px] border-2 border-border card-shadow animate-fade-in ${stagger}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-border">
        <Flag flag={guide.countryFlag} className="text-2xl leading-none shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-display uppercase text-[17px] leading-tight text-ink truncate">
            {isGeneral ? doc.title : guide.title}
          </p>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-0.5">
            {isGeneral
              ? "Todo el viaje"
              : arrival
              ? `Llegada ${formatShortDate(arrival)}`
              : guide.country}
          </p>
        </div>
      </div>
      <div className="px-4 py-4">
        <GuideMarkdown markdown={body} />
      </div>
      <Link
        href={`/guias/${guide.slug}/${doc.slug}`}
        className="flex items-center justify-between px-4 py-2.5 border-t border-border text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink-2 hover:bg-surface-2 transition-colors duration-150 rounded-b-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
      >
        Ver {doc.title} completo
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </article>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
