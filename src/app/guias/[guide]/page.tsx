import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  ChevronRight,
  FileText,
  Landmark,
  MapPin,
  ScrollText,
  Signpost,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { getAllGuides, getGuide, stopSlugsForGuide } from "@/lib/guides";
import { PageHeader } from "@/components/PageHeader";

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
  gastronomia: UtensilsCrossed,
  alojamiento: BedDouble,
  transporte: TrainFront,
  "desvios-cercanos": Signpost,
  "contexto-historico": ScrollText,
};

export default async function GuidePage({ params }: { params: Promise<{ guide: string }> }) {
  const { guide: slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const relatedStops = stopSlugsForGuide(slug);

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader subtitle={guide.title} />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-24">
        <Link
          href="/guias"
          className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg px-1 -ml-1 py-0.5"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          Guías
        </Link>

        {/* Title card */}
        <div className="bg-surface rounded-[4px] border-2 border-border card-shadow px-4 py-4 flex items-center gap-3 animate-fade-in">
          <span className="text-4xl leading-none" aria-hidden="true">{guide.countryFlag}</span>
          <div className="min-w-0">
            <h2 className="font-display uppercase text-2xl leading-tight text-ink tracking-wide">
              {guide.title}
            </h2>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-0.5">
              {guide.country}
            </p>
          </div>
        </div>

        {/* Docs grid */}
        <section className="animate-fade-in stagger-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2">
            Guía
          </p>
          <div className="grid grid-cols-2 gap-2">
            {guide.docs.map((doc) => {
              const Icon = DOC_ICONS[doc.slug] ?? FileText;
              return (
                <Link
                  key={doc.slug}
                  href={`/guias/${guide.slug}/${doc.slug}`}
                  className="flex flex-col gap-2 bg-surface rounded-[4px] border-2 border-border card-shadow px-3.5 py-3 transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:shadow-[5px_5px_0_#1B1A17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
                >
                  <Icon size={18} strokeWidth={1.5} className="text-brick" aria-hidden="true" />
                  <span className="text-[13px] font-extrabold text-ink leading-snug">
                    {doc.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Day trips */}
        {guide.dayTrips.length > 0 && (
          <section className="animate-fade-in stagger-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2">
              Day trips
            </p>
            <div className="bg-surface rounded-[4px] border-2 border-border card-shadow divide-y divide-border">
              {guide.dayTrips.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/guias/${guide.slug}/${doc.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
                >
                  <Signpost size={16} strokeWidth={1.5} className="text-gold-ink shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                    {doc.title}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related stops */}
        {relatedStops.length > 0 && (
          <section className="animate-fade-in stagger-3">
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
