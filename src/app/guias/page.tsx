import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import { getManifest, guideDocs } from "@/lib/guides";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";
import { cardClass } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Guías · Andiamo" };

const SECTION_LABEL = "label-caps text-ink-3";

export default function GuidesIndexPage() {
  const manifest = getManifest();

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle="Guías del viaje" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* Per-country guides. The trip-wide docs ("El viaje": Eurail,
            presupuesto, packing list) are not here — they read at /general,
            with the rest of the trip-wide material. */}
        {manifest.countries.map((country, idx) => (
          <section
            key={country.slug}
            className={`animate-fade-in ${idx < 6 ? `stagger-${idx + 1}` : ""}`}
          >
            {/* Same editorial header as the /stops album pages: flag · name · rule */}
            <p className={`${SECTION_LABEL} mb-2 flex items-center gap-2`}>
              <Flag flag={country.flag} className="text-sm leading-none shrink-0" />
              <span className="truncate">{country.name}</span>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              <span className="shrink-0 font-tabular">
                {country.guides.length} {country.guides.length === 1 ? "guía" : "guías"}
              </span>
            </p>

            {/* One grouped card per country: divided rows instead of a stack of
                separate cards — same border for every guide, uniform row height. */}
            <div className={`${cardClass} divide-y divide-border`}>
              {country.guides.map((guide) => {
                const all = guideDocs(guide);
                const tripCount =
                  guide.dayTrips.length +
                  guide.cities.reduce((n, c) => n + c.dayTrips.length, 0);
                // One meta line only. Nested guides (Sur de Italia) beat cities
                // and day trips so the container reads as a group, not a leaf.
                const extra =
                  guide.guides.length > 0
                    ? ` · ${guide.guides.length} ${guide.guides.length === 1 ? "guía" : "guías"}`
                    : guide.cities.length > 0
                      ? ` · ${guide.cities.length} ${guide.cities.length === 1 ? "ciudad" : "ciudades"}`
                      : tripCount > 0
                        ? ` · ${tripCount} day trips`
                        : "";
                const meta =
                  guide.guides.length > 0 && all.length === 0
                    ? `${guide.guides.length} ${guide.guides.length === 1 ? "guía" : "guías"}`
                    : `${all.length} docs${extra}`;
                return (
                  <Link
                    key={guide.slug}
                    href={`/guias/${guide.slug}`}
                    className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
                  >
                    <BookOpen size={16} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0 font-display uppercase text-title leading-tight text-ink truncate">
                      {guide.title}
                    </span>
                    <span className="shrink-0 text-caption font-medium font-tabular text-ink-3">
                      {meta}
                    </span>
                    <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>

            {/* Country-wide docs (Costumbres, Frases útiles) — short titles by
                construction (the sync strips the country, which is the section
                header right above), so they ride as chips instead of one
                full-width card each. */}
            {country.countryDocs.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {country.countryDocs.map((doc, i) => (
                  <DocChip
                    key={doc.slug}
                    href={`/guias/${country.slug}/${doc.slug}`}
                    label={doc.title}
                    // Odd count: the last chip fills the row so the block stays
                    // a flush rectangle instead of leaving a hole.
                    wide={country.countryDocs.length % 2 === 1 && i === country.countryDocs.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}

function DocChip({
  href,
  label,
  wide,
}: {
  href: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-0 px-3 rounded-full border border-border bg-surface card-shadow text-meta font-semibold text-ink-2 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <FileText size={13} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
