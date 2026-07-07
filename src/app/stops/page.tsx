import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr, tripDayNumber, daysBetween } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { PageHeader } from "@/components/PageHeader";
import { TripStartEditor } from "@/components/TripStartEditor";
import { Badge } from "@/components/ui/Badge";
import { ChevronRight, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
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
            className="h-9 w-9 flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
          >
            <Search size={17} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        }
      />

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

        {/* Today context */}
        <TodayCard
          stops={stops}
          currentSlug={currentSlug}
          today={today}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
        />

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
                  href={`/stops/${stop.slug}`}
                  className={[
                    "flex items-center gap-3 px-4 py-3.5 rounded-[4px] border-2 transition-all duration-150 animate-fade-in",
                    stagger,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                    "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                    isActive
                      ? "bg-brick-bg border-brick card-shadow hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:shadow-[5px_5px_0_#C44428]"
                      : isCandidate
                      ? "bg-surface/60 border-dashed border-border/50 opacity-60"
                      : isPast
                      ? "bg-surface/40 border-border/40 opacity-45"
                      : "bg-surface border-border hover:border-border-strong card-shadow hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:shadow-[5px_5px_0_#1B1A17]",
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
                      {isCandidate && <Badge variant="special">candidata</Badge>}
                      {!stop.datesFixed && !isCandidate && <Badge variant="warning">tentativa</Badge>}
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
          <TripStartEditor value={tripStartValue} fallbackValue={tripStartFallback} />
        </div>

      </main>
    </div>
  );
}

interface TodayCardStop {
  slug: string;
  name: string;
  countryFlag: string;
  arrivalDate: Date | null;
  departureDate: Date | null;
  isCandidate: boolean;
  isFlexMargin: boolean;
}

/** Answers "¿dónde estoy hoy?" at a glance — gold-accented context card above the timeline. */
function TodayCard({
  stops, currentSlug, today, tripStartDate, tripEndDate,
}: {
  stops: TodayCardStop[];
  currentSlug: string | null;
  today: string;
  tripStartDate: Date | null;
  tripEndDate: Date | null;
}) {
  if (!tripStartDate) return null;

  const firstArrivalStr = dateToStr(tripStartDate);
  const lastDepartureStr = tripEndDate ? dateToStr(tripEndDate) : null;
  const currentStop = stops.find((s) => s.slug === currentSlug) ?? null;

  const phase: "before" | "during" | "after" =
    today < firstArrivalStr
      ? "before"
      : lastDepartureStr && today >= lastDepartureStr
      ? "after"
      : "during";

  // "current" falls back to first/last stop outside its date range (see
  // computeCurrentStopSlug) — only trust it when today is actually inside it
  const inCurrentStop = Boolean(
    currentStop?.arrivalDate &&
    currentStop.departureDate &&
    dateToStr(currentStop.arrivalDate) <= today &&
    today < dateToStr(currentStop.departureDate),
  );

  let numeral: string;
  let numeralLabel: string;
  let line: React.ReactNode;

  if (phase === "before") {
    const daysToStart = Math.max(0, daysBetween(today, firstArrivalStr));
    const firstStop = stops.find((s) => !s.isCandidate && !s.isFlexMargin && s.arrivalDate);
    numeral = daysToStart.toString();
    numeralLabel = daysToStart === 1 ? "día" : "días";
    line = (
      <>
        Faltan para el despegue
        {firstStop && (
          <span className="block text-xs text-ink-2 font-normal normal-case tracking-normal mt-0.5">
            Primera parada: <Flag flag={firstStop.countryFlag} /> {firstStop.name} · {formatShortDate(firstStop.arrivalDate!)}
          </span>
        )}
      </>
    );
  } else if (phase === "during" && currentStop && inCurrentStop) {
    const day = tripDayNumber(currentStop.arrivalDate, tripStartDate) ?? daysBetween(firstArrivalStr, today) + 1;
    numeral = day.toString();
    numeralLabel = "día";
    line = (
      <>
        Estás en <Flag flag={currentStop.countryFlag} /> {currentStop.name}
        {currentStop.departureDate && (
          <span className="block text-xs text-ink-2 font-normal normal-case tracking-normal mt-0.5">
            Hasta el {formatShortDate(currentStop.departureDate)}
          </span>
        )}
      </>
    );
  } else if (phase === "during") {
    // Gap day (flex margin / in transit): no stop covers today
    const day = daysBetween(firstArrivalStr, today) + 1;
    const nextStop = stops.find(
      (s) => !s.isCandidate && !s.isFlexMargin && s.arrivalDate && dateToStr(s.arrivalDate) > today,
    );
    numeral = day.toString();
    numeralLabel = "día";
    line = (
      <>
        En tránsito
        {nextStop && (
          <span className="block text-xs text-ink-2 font-normal normal-case tracking-normal mt-0.5">
            Próxima parada: <Flag flag={nextStop.countryFlag} /> {nextStop.name} · {formatShortDate(nextStop.arrivalDate!)}
          </span>
        )}
      </>
    );
  } else {
    return null;
  }

  const href = phase === "during" && currentStop && inCurrentStop ? `/stops/${currentStop.slug}` : null;

  const card = (
    <div
      className={[
        "flex items-center gap-4 bg-gold-bg border-2 border-gold-border rounded-[4px] px-4 py-3 card-shadow mb-5 animate-fade-in transition-all duration-150",
        href ? "hover:border-gold hover:-translate-y-[2px] motion-reduce:hover:translate-y-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="text-center shrink-0">
        <p className="text-4xl font-numeral leading-none text-gold-ink">{numeral}</p>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-gold-ink/70 mt-0.5">{numeralLabel}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-gold-ink/70">Hoy</p>
        <p className="text-sm font-semibold text-ink mt-0.5">{line}</p>
      </div>
      {href && (
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="ml-auto shrink-0 text-gold-ink/60" />
      )}
    </div>
  );

  if (!href) return card;
  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[4px]"
    >
      {card}
    </Link>
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
