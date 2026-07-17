import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { HashScroller } from "@/components/HashScroller";
import { PageHeader } from "@/components/PageHeader";
import { TripStartEditor } from "@/components/TripStartEditor";
import { Badge } from "@/components/ui/Badge";
import { Check, ChevronRight, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Flag } from "@/components/Flag";

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
  const today = todayStr();

  const tripStartValue = tripStartSetting?.value ?? "";
  // Fallback: compute start date from first confirmed stop's arrivalDate
  const tripStartFallback = tripStartDate ? dateToStr(tripStartDate) : "";

  return (
    <div className="min-h-screen bg-canvas">
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
              const isPast = stop.departureDate && today > dateToStr(stop.departureDate);
              const isCandidate = stop.isCandidate;
              const stagger = idx < 6 ? `stagger-${(idx % 6) + 1}` : "";

              return (
                <Link
                  key={stop.id}
                  id={isActive ? "current" : undefined}
                  href={`/stops/${stop.slug}`}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 animate-fade-in",
                    stagger,
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
                          <span className="text-[11px] text-ink-3 font-medium">{formatShortDate(new Date(stop.arrivalDate))}</span>
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
