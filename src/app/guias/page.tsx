import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Globe } from "lucide-react";
import { getManifest, guideDocs } from "@/lib/guides";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";

export const metadata: Metadata = { title: "Guías · Andiamo" };

const SECTION_LABEL = "text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3";

export default function GuidesIndexPage() {
  const manifest = getManifest();

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle="Guías del viaje" />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Trip-wide docs — empty in the demo, which drops them entirely */}
        {manifest.general.length + manifest.resources.length > 0 && (
        <section className="animate-fade-in">
          <p className={`${SECTION_LABEL} mb-1.5 flex items-center gap-1.5`}>
            <Globe size={12} strokeWidth={2} aria-hidden="true" />
            El viaje
          </p>
          <div className="bg-surface rounded-xl border border-border card-shadow divide-y divide-border">
            {manifest.general.map((doc) => (
              <DocRow key={doc.slug} href={`/guias/general/${doc.slug}`} title={doc.title} />
            ))}
            {manifest.resources.map((doc) => (
              <DocRow key={doc.slug} href={`/guias/recursos/${doc.slug}`} title={doc.title} />
            ))}
          </div>
        </section>
        )}

        {/* Per-country guides */}
        {manifest.countries.map((country, idx) => (
          <section
            key={country.slug}
            className={`animate-fade-in ${idx < 6 ? `stagger-${idx + 1}` : ""}`}
          >
            <p className={`${SECTION_LABEL} mb-1.5 flex items-baseline justify-between gap-2`}>
              <span className="truncate">
                <Flag flag={country.flag} className="mr-1" />
                {country.name}
              </span>
              <span className="shrink-0 font-tabular">
                {country.guides.length} {country.guides.length === 1 ? "guía" : "guías"}
              </span>
            </p>

            {/* One grouped card per country: divided rows instead of a stack of
                separate cards — same border for every guide, uniform row height. */}
            <div className="bg-surface rounded-xl border border-border card-shadow divide-y divide-border">
              {country.guides.map((guide) => {
                const all = guideDocs(guide);
                const tripCount =
                  guide.dayTrips.length +
                  guide.cities.reduce((n, c) => n + c.dayTrips.length, 0);
                // One meta line only: cities take precedence over day trips on a
                // regional guide so the row never wraps.
                const extra =
                  guide.cities.length > 0
                    ? ` · ${guide.cities.length} ${guide.cities.length === 1 ? "ciudad" : "ciudades"}`
                    : tripCount > 0
                      ? ` · ${tripCount} day trips`
                      : "";
                return (
                  <Link
                    key={guide.slug}
                    href={`/guias/${guide.slug}`}
                    className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
                  >
                    <BookOpen size={16} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0 font-display uppercase text-[15px] leading-tight text-ink truncate">
                      {guide.title}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium font-tabular text-ink-3">
                      {all.length} docs{extra}
                    </span>
                    <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>

            {/* Country-wide docs ("Costumbres en X", "Frases útiles") — the
                country name is redundant inside its own section, so they ride
                as short chips instead of one full-width card each. */}
            {country.countryDocs.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {country.countryDocs.map((doc, i) => (
                  <DocChip
                    key={doc.slug}
                    href={`/guias/${country.slug}/${doc.slug}`}
                    label={countryDocLabel(doc.title, country.name)}
                    title={doc.title}
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

function DocRow({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
    >
      <FileText size={16} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{title}</span>
      <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
    </Link>
  );
}

function DocChip({
  href,
  label,
  title,
  wide,
}: {
  href: string;
  label: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-0 px-3 rounded-full border border-border bg-surface card-shadow text-[12px] font-semibold text-ink-2 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <FileText size={13} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Fold case + diacritics so "Países Bajos" matches folder-derived "Paises Bajos". */
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Display-only shortening for country-wide doc titles. Inside "🇮🇹 Italia" the
 *  country name is noise, but Reino Unido has one "Costumbres" per nation, so
 *  the qualifier survives when it isn't just the country again. */
function countryDocLabel(title: string, countryName: string): string {
  const bare = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

  if (/^frases\s+útiles\s*[—–-]/i.test(title)) return "Frases útiles";

  const customs = title.match(/^costumbres\s+en\s+(.+)$/i);
  if (customs) {
    const where = bare(customs[1]);
    return fold(where) === fold(countryName)
      ? "Costumbres"
      : `Costumbres · ${where}`;
  }

  if (/^readme$/i.test(title)) return "Resumen";

  const prefixed = title.match(
    new RegExp(`^${countryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]\\s*(.+)$`, "i"),
  );
  if (prefixed) return bare(prefixed[1]);

  return title;
}
