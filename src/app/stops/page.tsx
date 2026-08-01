import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr, itineraryNights } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { getPerson } from "@/lib/person-server";
import { stopVisibleTo } from "@/lib/person";
import { AddStopButton } from "@/components/AddStopButton";
import { HashScroller } from "@/components/HashScroller";
import { PageHeader } from "@/components/PageHeader";
import { TripStartEditor } from "@/components/TripStartEditor";
import { Badge } from "@/components/ui/Badge";
import { Check, ChevronRight, Lock, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Flag } from "@/components/Flag";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Itinerario · Andiamo" };

export default async function StopsPage() {
  await requireAuth();
  const [allStops, currentSlug, tripStartSetting, viewer] = await Promise.all([
    db.stop.findMany({ orderBy: { order: "asc" } }),
    getCurrentStopSlug(),
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
    getPerson(),
  ]);

  // Person-scoped stops swap per viewer (Pititas for Katia in place of the
  // Portugal leg); "Ambos" (null) sees the full household superset.
  const stops = allStops.filter((s) => stopVisibleTo(s, viewer));

  // Derive trip range from DB data — no hardcoded dates. Pseudo-cities (Pititas)
  // never count as real stops in the stats or the trip range.
  const realStops = stops.filter((s) => !s.isLocal);
  const confirmedWithDates = realStops.filter((s) => !s.isFlexMargin && !s.isCandidate);
  const tripStartDate = confirmedWithDates.find((s) => s.arrivalDate)?.arrivalDate ?? null;
  // Noches con parada asignada, no el span de calendario: los días del tramo que
  // todavía es tentativo no se cuentan. Misma definición que Spitwise, para que
  // las dos apps muestren el mismo número (ver itineraryNights).
  const tripNights = itineraryNights(confirmedWithDates);
  const today = todayStr();

  const tripStartValue = tripStartSetting?.value ?? "";
  // Fallback: compute start date from first confirmed stop's arrivalDate
  const tripStartFallback = tripStartDate ? dateToStr(tripStartDate) : "";

  return (
    <div className="min-h-full bg-canvas">
      {/* Header */}
      <PageHeader
        subtitle="Europa 2026"
        actions={
          <Link
            href="/search"
            aria-label="Buscar en el viaje"
            className="h-11 w-11 flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
          >
            <Search size={17} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        }
      />
      {/* Auto-center the current stop on load (and when the logo links to
          /stops#current), so the itinerary opens on "today" instead of the top. */}
      <HashScroller block="center" fallbackId="current" />

      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in">
          <Stat
            label="Paradas"
            value={confirmedWithDates.length.toString()}
          />
          <Stat
            label="Noches"
            value={tripNights > 0 ? tripNights.toString() : "—"}
            highlight
          />
          <Stat
            label="Países"
            value={[...new Set(realStops.map((s) => s.country))].length.toString()}
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
              const isPast = stop.departureDate && today > dateToStr(stop.departureDate);
              const isCandidate = stop.isCandidate;
              // 40ms per item (--duration-stagger), capped so the total stays
              // ≤240ms on a long itinerary and later rows share the max delay
              // instead of popping in ahead of the earlier ones.
              const staggerDelay = `${Math.min(idx, 6) * 40}ms`;

              return (
                <Link
                  key={stop.id}
                  id={isActive ? "current" : undefined}
                  href={`/stops/${stop.slug}`}
                  style={{ animationDelay: staggerDelay }}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 animate-fade-in",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                    "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                    isActive
                      ? "bg-brick-bg border-brick card-shadow hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:hover-shadow-brick"
                      : isCandidate
                      ? "bg-surface/60 border-dashed border-border/50 opacity-60"
                      : isPast
                      ? "bg-surface/40 border-border/40 opacity-45"
                      : "bg-surface border-border hover:border-border-strong card-shadow hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:hover-shadow-ink",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Order indicator — past (visited) stops show a check
                      instead of the number to tell them apart from tentativas */}
                  <div
                    className={[
                      "w-7 shrink-0 font-numeral text-sm text-center flex items-center justify-center",
                      isActive
                        ? "text-brick-ink"
                        : isPast && !isCandidate
                        ? "text-success"
                        : "text-ink-3",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isPast && !isActive && !isCandidate ? (
                      <Check size={16} strokeWidth={2.5} aria-label="Visitada" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Flag flag={stop.countryFlag} className="text-xl leading-none shrink-0" />
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
                          <span className="text-[11px] text-ink-3 font-medium inline-flex items-center gap-1">
                            {formatShortDate(new Date(stop.arrivalDate))}
                            {/* Anchored = fixed date. Worth showing: it's the
                                difference between a date that moves when you
                                edit an earlier stop and one that doesn't. */}
                            {stop.isAnchored && (
                              <Lock
                                size={10}
                                strokeWidth={2.5}
                                aria-label="Fecha fija"
                                className="text-ink-faint"
                              />
                            )}
                          </span>
                        </>
                      )}
                      {isCandidate && <Badge variant="special">tentativa</Badge>}
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
          <TripStartEditor value={tripStartValue} fallbackValue={tripStartFallback} />
        </div>

      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const numeric = /^\d+$/.test(value) ? Number(value) : null;
  return (
    <div className="bg-surface rounded-xl px-3 py-3 text-center border border-border card-shadow">
      <p className={`text-4xl font-numeral leading-none ${highlight ? "text-gold" : "text-ink"}`}>
        {numeric !== null ? <AnimatedNumber value={numeric} /> : value}
      </p>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-1">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
