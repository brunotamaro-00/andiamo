import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { requireAuth } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { TripStartEditor } from "@/components/TripStartEditor";
import { Badge } from "@/components/ui/Badge";
import { Wordmark } from "@/components/Wordmark";
import { ChevronRight, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Itinerario · Andiamo" };

export default async function StopsPage() {
  await requireAuth();
  const [stops, currentSlug, tripStartSetting] = await Promise.all([
    db.stop.findMany({ orderBy: { order: "asc" } }),
    getCurrentStopSlug(),
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
  ]);

  // Derive trip range from DB data — no hardcoded dates.
  const confirmedWithDates = stops.filter((s) => !s.isFlexMargin && !s.isCandidate);
  const tripStartDate = confirmedWithDates.find((s) => s.arrivalDate)?.arrivalDate ?? null;
  const tripEndDate = [...confirmedWithDates].reverse().find((s) => s.departureDate)?.departureDate ?? null;
  const tripDays =
    tripStartDate && tripEndDate
      ? Math.round((tripEndDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const today = new Date();

  const tripStartValue = tripStartSetting?.value ?? "";

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface backdrop-blur-md border-b border-border-strong px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <Wordmark size="sm" />
            <span className="text-[9px] font-display uppercase tracking-[0.14em] text-ink-3 ml-8 -mt-0.5">Europa 2026</span>
          </div>
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
                className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 py-1.5 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
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
            value={tripDays?.toString() ?? "—"}
            highlight
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
                      ? "bg-brick-bg border-brick card-shadow hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#C44428]"
                      : isCandidate
                      ? "bg-surface/60 border-dashed border-border/50 opacity-60"
                      : isPast
                      ? "bg-surface/40 border-border/40 opacity-45"
                      : "bg-surface border-border hover:border-border-strong card-shadow hover:-translate-y-[2px] hover:shadow-[5px_5px_0_#1B1A17]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Order indicator */}
                  <div
                    className={[
                      "w-7 shrink-0 font-numeral text-sm text-center",
                      isActive
                        ? "text-brick-ink"
                        : isPast
                        ? "text-ink-faint"
                        : "text-ink-3",
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
                        className={`font-display uppercase text-[17px] leading-tight truncate ${
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
                          <span className="text-[11px] text-ink-3 font-medium">{stop.nights} {stop.nights === 1 ? "noche" : "noches"}</span>
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
                      {isCandidate && <Badge variant="special">candidata</Badge>}
                      {stop.datesFixed && <Badge variant="warning">fecha fija</Badge>}
                      {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
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
        />

        {/* Trip start editor — below fold, low noise */}
        <div className="mt-4 animate-fade-in">
          <TripStartEditor value={tripStartValue} />
        </div>

      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface rounded-[4px] px-3 py-3 text-center border-2 border-border card-shadow">
      <p className={`text-4xl font-numeral leading-none ${highlight ? "text-gold" : "text-ink"}`}>{value}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-1">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
