import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { requireAuth } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { Badge } from "@/components/ui/Badge";
import { Wordmark } from "@/components/Wordmark";
import { ChevronRight, Plane, FileText, Search } from "lucide-react";

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
  const daysUntilTrip = Math.ceil(
    (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const tripStarted = today >= tripStart;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-md border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <Wordmark size="sm" />
            {!tripStarted && daysUntilTrip > 0 && (
              <p className="text-[11px] font-semibold text-coral-ink flex items-center gap-1 mt-0.5 tracking-wide">
                <Plane size={10} strokeWidth={2} aria-hidden="true" />
                {daysUntilTrip} días para el viaje
              </p>
            )}
            {tripStarted && (
              <p className="text-[11px] font-semibold text-coral-ink mt-0.5 tracking-wide">
                ¡El viaje ya empezó!
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Buscar en el viaje"
              className="h-9 w-9 flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
            >
              <Search size={17} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-[11px] font-semibold uppercase tracking-widest text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 py-1.5 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
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
        <div className="space-y-2">
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 animate-fade-in",
                    stagger,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40",
                    "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                    isActive
                      ? "bg-surface border-border border-l-2 border-l-coral card-shadow"
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
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                      isActive
                        ? "border border-coral text-coral-ink"
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base leading-none" aria-hidden="true">
                        {stop.countryFlag}
                      </span>
                      <span
                        className={`font-semibold text-sm ${
                          isActive ? "text-coral-ink" : "text-ink"
                        }`}
                      >
                        {stop.name}
                      </span>
                      {!stop.datesFixed && <Badge variant="warning">tentativa</Badge>}
                      {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
                      {isCandidate && <Badge variant="special">candidata</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-3 font-medium">
                      <span>{stop.country}</span>
                      {stop.nights > 0 && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span>{stop.nights} noches</span>
                        </>
                      )}
                      {stop.arrivalDate && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span>{formatShortDate(new Date(stop.arrivalDate))}</span>
                        </>
                      )}
                      {stop.tempRange && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span>{stop.tempRange}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight
                    size={15}
                    strokeWidth={2}
                    className={isActive ? "text-coral" : "text-border-strong"}
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
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-surface hover:border-border-strong transition-colors duration-150 text-[11px] font-semibold uppercase tracking-widest text-ink-3 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
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
    <div className="bg-surface rounded-xl px-3 py-3 text-center border border-border card-shadow">
      <p className="text-2xl font-bold font-display text-ink font-tabular">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3 mt-0.5">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
