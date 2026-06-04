import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { requireAuth } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { Badge } from "@/components/ui/Badge";
import { Wordmark } from "@/components/Wordmark";
import { ChevronRight, FileText, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Itinerario · Andiamo" };

export default async function StopsPage() {
  await requireAuth();
  const [stops, currentSlug] = await Promise.all([
    db.stop.findMany({ orderBy: { order: "asc" } }),
    getCurrentStopSlug(),
  ]);

  const tripStart = new Date("2026-08-05");
  const tripEnd = new Date("2026-11-21");
  const tripDays = Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
  const today = new Date();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-md border-b border-border px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Wordmark size="sm" />
          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Buscar en el viaje"
              className="h-9 w-9 flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
            >
              <Search size={17} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-[11px] font-semibold uppercase tracking-widest text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 py-1.5 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in">
          <Stat
            label="Paradas"
            value={stops.filter((s) => !s.isFlexMargin && !s.isCandidate).length.toString()}
          />
          <Stat
            label="Días"
            value={tripDays.toString()}
          />
          <Stat
            label="Países"
            value={[...new Set(stops.map((s) => s.country))].length.toString()}
          />
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {stops.filter((s) => !s.isFlexMargin).length === 0 && (
            <EmptyState
              icon={MapPin}
              title="Sin paradas todavía"
              description="Agregá tu primera ciudad y empezá a armar el itinerario."
            />
          )}
          {stops
            .filter((s) => !s.isFlexMargin)
            .map((stop, idx) => {
              const isActive = stop.slug === currentSlug;
              const isPast = stop.departureDate && today > new Date(stop.departureDate);
              const isCandidate = stop.isCandidate;
              const stagger = idx < 6 ? `stagger-${(idx % 6) + 1}` : "";
              const hasBadges = !stop.datesFixed || stop.isTransit || isCandidate;

              return (
                <Link
                  key={stop.id}
                  href={`/stops/${stop.slug}`}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 rounded-[4px] border-2 transition-all duration-150 animate-fade-in",
                    stagger,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                    "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                    isActive
                      ? "bg-brick-bg border-brick card-shadow"
                      : isCandidate
                      ? "bg-surface/60 border-dashed border-border/50 opacity-60"
                      : isPast
                      ? "bg-surface/40 border-border/40 opacity-45"
                      : "bg-surface border-border hover:border-border-strong card-shadow",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Order indicator */}
                  <div
                    className={[
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-numeral text-sm",
                      isActive
                        ? "bg-brick/10 text-brick-ink"
                        : isPast
                        ? "bg-surface-2 text-ink-faint"
                        : "bg-surface-2 text-ink-2",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none shrink-0" aria-hidden="true">
                        {stop.countryFlag}
                      </span>
                      <span
                        className={`font-bold text-[15px] leading-tight truncate ${
                          isActive ? "text-brick-ink" : "text-ink"
                        }`}
                      >
                        {stop.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] text-ink-3 font-medium">{stop.country}</span>
                      {stop.nights > 0 && (
                        <>
                          <span className="text-border-strong text-[11px]">·</span>
                          <span className="text-[11px] text-ink-3 font-medium">{stop.nights}n</span>
                        </>
                      )}
                      {stop.arrivalDate && (
                        <>
                          <span className="text-border-strong text-[11px]">·</span>
                          <span className="text-[11px] text-ink-3 font-medium">{formatShortDate(new Date(stop.arrivalDate))}</span>
                        </>
                      )}
                      {stop.tempRange && (
                        <>
                          <span className="text-border-strong text-[11px]">·</span>
                          <span className="text-[11px] text-ink-3 font-medium">{stop.tempRange}</span>
                        </>
                      )}
                      {hasBadges && (
                        <>
                          {!stop.datesFixed && <Badge variant="warning">tentativa</Badge>}
                          {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
                          {isCandidate && <Badge variant="special">candidata</Badge>}
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight
                    size={15}
                    strokeWidth={2}
                    className={isActive ? "text-brick" : "text-border-strong"}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
        </div>

        {/* Add stop */}
        <AddStopButton
          stops={stops
            .filter((s) => !s.isFlexMargin)
            .map((s) => ({ id: s.id, order: s.order, name: s.name, countryFlag: s.countryFlag }))}
          lastDepartureDate={
            stops
              .filter((s) => !s.isFlexMargin && s.departureDate != null)
              .at(-1)
              ?.departureDate?.toISOString().slice(0, 10) ?? undefined
          }
        />

        {/* Global docs link */}
        <Link
          href="/general"
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-[4px] border-2 border-border bg-surface hover:border-border-strong transition-colors duration-150 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
        >
          <FileText size={13} strokeWidth={1.5} aria-hidden="true" />
          Documentos generales
        </Link>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-[4px] px-3 py-3 text-center border-2 border-border card-shadow">
      <p className="text-4xl font-numeral text-ink leading-none">{value}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-1">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
