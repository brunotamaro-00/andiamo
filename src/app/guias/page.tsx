import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BookOpen, ChevronRight, FileText, Globe } from "lucide-react";
import { getManifest } from "@/lib/guides";

export const metadata: Metadata = { title: "Guías · Andiamo" };

export default function GuidesIndexPage() {
  const manifest = getManifest();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface backdrop-blur border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Link
          href="/stops"
          className="text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Itinerario
        </Link>
        <h1 className="flex-1 text-sm font-medium text-ink-2 text-center">Guías del viaje</h1>
        <div className="w-20" />
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        {/* Urgent reservations shortcut */}
        <Link
          href="/guias/reservas"
          className="flex items-center gap-3 bg-brick-bg border-2 border-brick-border rounded-[4px] px-4 py-3.5 card-shadow animate-fade-in transition-all duration-150 hover:border-brick hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:shadow-[5px_5px_0_#C44428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
        >
          <AlertTriangle size={20} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-display uppercase text-[17px] leading-tight text-brick-ink">
              Reservas urgentes
            </p>
            <p className="text-[11px] text-brick-ink/70 font-semibold mt-0.5">
              Lo que hay que reservar con anticipación, por fecha de llegada
            </p>
          </div>
          <ChevronRight size={15} strokeWidth={2} className="text-brick shrink-0" aria-hidden="true" />
        </Link>

        {/* Trip-wide docs */}
        <section className="animate-fade-in">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2 flex items-center gap-1.5">
            <Globe size={12} strokeWidth={2} aria-hidden="true" />
            El viaje
          </p>
          <div className="bg-surface rounded-[4px] border-2 border-border card-shadow divide-y divide-border">
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
              <span aria-hidden="true" className="mr-1">{country.flag}</span>
              {country.name}
            </p>
            <div className="space-y-2">
              {country.guides.map((guide) => {
                const docCount = guide.docs.length + guide.dayTrips.length;
                return (
                  <Link
                    key={guide.slug}
                    href={`/guias/${guide.slug}`}
                    className="flex items-center gap-3 bg-surface rounded-[4px] border-2 border-border card-shadow px-4 py-3 transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:shadow-[5px_5px_0_#1B1A17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
                  >
                    <BookOpen size={18} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display uppercase text-[17px] leading-tight text-ink truncate">
                        {guide.title}
                      </p>
                      <p className="text-[11px] text-ink-3 font-medium mt-0.5">
                        {docCount} {docCount === 1 ? "documento" : "documentos"}
                        {guide.dayTrips.length > 0 && ` · ${guide.dayTrips.length} day trips`}
                      </p>
                    </div>
                    <ChevronRight size={15} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
              {country.countryDocs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/guias/${country.slug}/${doc.slug}`}
                  className="flex items-center gap-3 bg-surface rounded-[4px] border-2 border-border card-shadow px-4 py-3 transition-all duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
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
