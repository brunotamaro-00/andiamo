import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Globe } from "lucide-react";
import { getManifest, guideDocs } from "@/lib/guides";
import { PageHeader } from "@/components/PageHeader";
import { Flag } from "@/components/Flag";

export const metadata: Metadata = { title: "Guías · Andiamo" };

export default function GuidesIndexPage() {
  const manifest = getManifest();

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader subtitle="Guías del viaje" />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        {/* Trip-wide docs */}
        <section className="animate-fade-in">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2 flex items-center gap-1.5">
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

        {/* Per-country guides */}
        {manifest.countries.map((country, idx) => (
          <section
            key={country.slug}
            className={`animate-fade-in ${idx < 6 ? `stagger-${idx + 1}` : ""}`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2">
              <Flag flag={country.flag} className="mr-1" />
              {country.name}
            </p>
            <div className="space-y-2">
              {country.guides.map((guide) => {
                const all = guideDocs(guide);
                const tripCount =
                  guide.dayTrips.length +
                  guide.cities.reduce((n, c) => n + c.dayTrips.length, 0);
                return (
                  <Link
                    key={guide.slug}
                    href={`/guias/${guide.slug}`}
                    className="flex items-center gap-3 bg-surface rounded-xl border border-border card-shadow px-4 py-3 transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:hover-shadow-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
                  >
                    <BookOpen size={18} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display uppercase text-[17px] leading-tight text-ink truncate">
                        {guide.title}
                      </p>
                      <p className="text-[11px] text-ink-3 font-medium mt-0.5">
                        {all.length} {all.length === 1 ? "documento" : "documentos"}
                        {tripCount > 0 && ` · ${tripCount} day trips`}
                      </p>
                      {/* Regional guide: name the cities it groups, so the
                          South reads as "Sicilia → Palermo, Catania…" */}
                      {guide.cities.length > 0 && (
                        <p className="text-[11px] text-ink-2 font-semibold mt-1 truncate">
                          {guide.cities.map((c) => c.title).join(" · ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={15} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
              {country.countryDocs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/guias/${country.slug}/${doc.slug}`}
                  className="flex items-center gap-3 bg-surface rounded-xl border border-border card-shadow px-4 py-3 transition-all duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
                >
                  <FileText size={18} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
                  <p className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{doc.title}</p>
                  <ChevronRight size={15} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
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
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-inset"
    >
      <FileText size={16} strokeWidth={1.5} className="text-ink-3 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{title}</span>
      <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
    </Link>
  );
}
