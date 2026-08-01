import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  BookOpen,
  ChevronRight,
  FileText,
  Landmark,
  MapPin,
  Moon,
  ScrollText,
  Signpost,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { docKind, getAllGuides, getGuide, guideDocs, stopSlugsForGuide } from "@/lib/guides";
import type { GuideDoc } from "@/lib/guides";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ guide: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guide: string }>;
}): Promise<Metadata> {
  const { guide: slug } = await params;
  const guide = getGuide(slug);
  return { title: guide ? `${guide.title} · Guías · Andiamo` : "Guías · Andiamo" };
}

const DOC_ICONS: Record<string, LucideIcon> = {
  actividades: Landmark,
  nightlife: Moon,
  gastronomia: UtensilsCrossed,
  alojamiento: BedDouble,
  transporte: TrainFront,
  "desvios-cercanos": Signpost,
  "contexto-historico": ScrollText,
};

/** City docs carry a `<city>-` slug prefix so they stay unique inside the
 *  guide's route namespace; the icon lookup uses the bare doc kind. */
function iconFor(docSlug: string, cityPrefix?: string): LucideIcon {
  return DOC_ICONS[docKind(docSlug, cityPrefix)] ?? FileText;
}

function DocGrid({
  guideSlug,
  docs,
  cityPrefix,
}: {
  guideSlug: string;
  docs: GuideDoc[];
  cityPrefix?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {docs.map((doc) => {
        const Icon = iconFor(doc.slug, cityPrefix);
        return (
          <Link
            key={doc.slug}
            href={`/guias/${guideSlug}/${doc.slug}`}
            className="flex flex-col gap-2 bg-surface rounded-xl border border-border card-shadow px-3.5 py-3 transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:hover-shadow-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
          >
            <Icon size={18} strokeWidth={1.5} className="text-brick" aria-hidden="true" />
            <span className="text-[13px] font-extrabold text-ink leading-snug">{doc.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

function DayTripList({ guideSlug, docs }: { guideSlug: string; docs: GuideDoc[] }) {
  return (
    <div className="bg-surface rounded-xl border border-border card-shadow divide-y divide-border">
      {docs.map((doc) => (
        <Link
          key={doc.slug}
          href={`/guias/${guideSlug}/${doc.slug}`}
          className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
        >
          <Signpost size={16} strokeWidth={1.5} className="text-gold-ink shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{doc.title}</span>
          <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

const SECTION_LABEL = "text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2";

export default async function GuidePage({ params }: { params: Promise<{ guide: string }> }) {
  const { guide: slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const relatedStops = stopSlugsForGuide(slug);
  const isRegional = guide.cities.length > 0;
  const parent = guide.parentSlug ? getGuide(guide.parentSlug) : null;
  const backHref = parent ? `/guias/${parent.slug}` : "/guias";
  const backLabel = parent ? parent.title : "Guías";

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle={guide.title} />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-24">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1 py-0.5"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          {backLabel}
        </Link>

        {/* Title card */}
        <div className="bg-surface rounded-xl border border-border card-shadow px-4 py-4 flex items-center gap-3 animate-fade-in">
          <Flag flag={guide.countryFlag} className="text-4xl leading-none" />
          <div className="min-w-0">
            <h2 className="font-display uppercase text-2xl leading-tight text-ink tracking-wide">
              {guide.title}
            </h2>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-0.5">
              {guide.country}
              {guide.guides.length > 0 &&
                ` · ${guide.guides.length} ${guide.guides.length === 1 ? "guía" : "guías"}`}
              {isRegional &&
                ` · ${guide.cities.length} ${guide.cities.length === 1 ? "ciudad" : "ciudades"}`}
            </p>
          </div>
        </div>

        {/* Nested guides (Sicilia, Puglia… under Sur de Italia) */}
        {guide.guides.length > 0 && (
          <section className="animate-fade-in stagger-1">
            <p className={SECTION_LABEL}>Regiones e itinerarios</p>
            <div className="bg-surface rounded-xl border border-border card-shadow divide-y divide-border">
              {guide.guides.map((child) => {
                const all = guideDocs(child);
                const extra =
                  child.cities.length > 0
                    ? ` · ${child.cities.length} ${child.cities.length === 1 ? "ciudad" : "ciudades"}`
                    : "";
                return (
                  <Link
                    key={child.slug}
                    href={`/guias/${child.slug}`}
                    className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
                  >
                    <BookOpen size={16} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0 font-display uppercase text-[15px] leading-tight text-ink truncate">
                      {child.title}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium font-tabular text-ink-3">
                      {all.length} docs{extra}
                    </span>
                    <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Guide-level docs — region-wide on a regional guide */}
        {guide.docs.length > 0 && (
          <section className="animate-fade-in stagger-1">
            <p className={SECTION_LABEL}>
              {guide.guides.length > 0 ? "Decisión" : isRegional ? "Toda la región" : "Guía"}
            </p>
            <DocGrid guideSlug={guide.slug} docs={guide.docs} />
          </section>
        )}

        {/* Guide-level day trips */}
        {guide.dayTrips.length > 0 && (
          <section className="animate-fade-in stagger-2">
            <p className={SECTION_LABEL}>Day trips</p>
            <DayTripList guideSlug={guide.slug} docs={guide.dayTrips} />
          </section>
        )}

        {/* Cities nested in a regional guide (Palermo, Catania… in Sicilia) */}
        {guide.cities.map((city, idx) => (
          <section
            key={city.slug}
            className={`animate-fade-in ${idx < 5 ? `stagger-${idx + 2}` : "stagger-6"} rounded-xl border-2 border-border bg-surface-2/60 px-3 py-3 space-y-3`}
          >
            <h3 className="font-display uppercase text-lg leading-tight text-ink tracking-wide flex items-center gap-2">
              <MapPin size={15} strokeWidth={2} className="text-brick shrink-0" aria-hidden="true" />
              {city.title}
            </h3>

            {city.docs.length > 0 && (
              <DocGrid guideSlug={guide.slug} docs={city.docs} cityPrefix={city.slug} />
            )}

            {city.dayTrips.length > 0 && (
              <div>
                <p className={SECTION_LABEL}>Day trips desde {city.title}</p>
                <DayTripList guideSlug={guide.slug} docs={city.dayTrips} />
              </div>
            )}
          </section>
        ))}

        {/* Related stops */}
        {relatedStops.length > 0 && (
          <section className="animate-fade-in">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2">
              Paradas relacionadas
            </p>
            <div className="flex flex-wrap gap-2">
              {relatedStops.map((stopSlug) => (
                <Link
                  key={stopSlug}
                  href={`/stops/${stopSlug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
                >
                  <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                  {stopSlug.replace(/-/g, " ")}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
