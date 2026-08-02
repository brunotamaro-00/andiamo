import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr, daysBetween, itineraryNights, tripDayNumber } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { getPerson } from "@/lib/person-server";
import { stopVisibleTo } from "@/lib/person";
import { itinerarySpine } from "@/lib/itinerary-slots";
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

  // Album pages: consecutive same-country runs become one group, so the flag
  // and country name live once in a header and rows breathe. Numbering keeps
  // the whole-trip index (the sticker number), not per-group.
  const visibleStops = stops.filter((s) => !s.isFlexMargin);
  const orderIndex = new Map(visibleStops.map((s, i) => [s.id, i]));
  const groups: {
    country: string;
    countryFlag: string;
    startIdx: number;
    stops: typeof visibleStops;
  }[] = [];
  for (const s of visibleStops) {
    const last = groups.at(-1);
    if (last && last.country === s.country) last.stops.push(s);
    else
      groups.push({
        country: s.country,
        countryFlag: s.countryFlag,
        startIdx: orderIndex.get(s.id)!,
        stops: [s],
      });
  }

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
        {/* Quick stats — one editorial strip, not three competing boxes. The
            focal point of this screen is the current stop, so the numbers
            share a single quiet card. */}
        <div className="flex items-stretch bg-surface rounded-xl border border-border card-shadow px-4 py-3 mb-5 animate-fade-in">
          <Stat label="Paradas" value={confirmedWithDates.length.toString()} />
          <span className="w-px bg-border mx-4" aria-hidden="true" />
          <Stat
            label="Noches"
            value={tripNights > 0 ? tripNights.toString() : "—"}
            highlight
          />
          <span className="w-px bg-border mx-4" aria-hidden="true" />
          <Stat
            label="Países"
            value={[...new Set(realStops.map((s) => s.country))].length.toString()}
          />
        </div>

        {/* Timeline — album pages: one group per country run, stops numbered
            through the whole trip, the current stop as the gold sticker. */}
        <div className="space-y-5">
          {visibleStops.length === 0 && (
            <EmptyState
              icon={MapPin}
              title="Sin paradas todavía"
              description="Agregá tu primera ciudad y empezá a armar el itinerario."
            />
          )}
          {groups.map((group) => (
            <section key={`${group.country}-${group.startIdx}`}>
              <div className="flex items-center gap-2 mb-2">
                <Flag flag={group.countryFlag} className="text-sm leading-none shrink-0" />
                <h2 className="label-caps text-ink-3">{group.country}</h2>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                {group.stops.map((stop) => {
                  const idx = orderIndex.get(stop.id)!;
                  const isActive = stop.slug === currentSlug;
                  const isPast = stop.departureDate && today > dateToStr(stop.departureDate);
                  const isCandidate = stop.isCandidate;
                  // 40ms per item (--duration-stagger), capped so the total stays
                  // ≤240ms on a long itinerary and later rows share the max delay
                  // instead of popping in ahead of the earlier ones.
                  const staggerDelay = `${Math.min(idx, 6) * 40}ms`;

                  if (isActive) {
                    // La figurita dorada — the one card of the album that shines.
                    const arrivalStr = stop.arrivalDate ? dateToStr(stop.arrivalDate) : null;
                    const departureStr = stop.departureDate ? dateToStr(stop.departureDate) : null;
                    const isHere =
                      arrivalStr !== null &&
                      departureStr !== null &&
                      arrivalStr <= today &&
                      today < departureStr;
                    const tripDay = isHere
                      ? tripDayNumber(stop.arrivalDate, tripStartDate)
                      : null;
                    const daysLeft =
                      isHere && departureStr ? Math.max(0, daysBetween(today, departureStr)) : null;
                    const daysUntil =
                      !isHere && arrivalStr && today < arrivalStr
                        ? daysBetween(today, arrivalStr)
                        : null;
                    return (
                      <Link
                        key={stop.id}
                        id="current"
                        href={`/stops/${stop.slug}`}
                        style={{ animationDelay: staggerDelay }}
                        className={[
                          "block px-4 py-4 rounded-xl border-2 border-gold bg-gold-bg card-shadow",
                          "transition-all duration-150 animate-fade-in",
                          "hover:-translate-y-[2px] motion-reduce:hover:translate-y-0 hover:hover-shadow-ink",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                          "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="label-caps text-gold-ink">
                            {isHere
                              ? tripDay !== null
                                ? `Estás acá · Día ${tripDay}`
                                : "Estás acá"
                              : "Próxima parada"}
                          </span>
                          <MapPin size={14} strokeWidth={2.5} className="text-gold shrink-0" aria-hidden="true" />
                        </div>
                        <div className="flex items-center gap-2.5 mt-1.5 min-w-0">
                          <Flag flag={stop.countryFlag} className="text-3xl leading-none shrink-0" />
                          <span className="font-display uppercase text-2xl leading-none text-ink truncate">
                            {stop.name}
                          </span>
                        </div>
                        <p className="text-caption text-ink-2 font-medium mt-2">
                          {[
                            stop.nights > 0 && `${stop.nights} ${stop.nights === 1 ? "noche" : "noches"}`,
                            isHere && daysLeft !== null
                              ? daysLeft === 1
                                ? "última noche"
                                : `quedan ${daysLeft} días`
                              : daysUntil !== null
                              ? daysUntil === 1
                                ? "llegás mañana"
                                : `llegás en ${daysUntil} días`
                              : stop.arrivalDate && formatShortDate(new Date(stop.arrivalDate)),
                            stop.departureDate && `hasta el ${formatShortDate(new Date(stop.departureDate))}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={stop.id}
                      href={`/stops/${stop.slug}`}
                      style={{ animationDelay: staggerDelay }}
                      className={[
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 animate-fade-in",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                        "focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
                        isCandidate
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
                          isPast && !isCandidate ? "text-success" : "text-ink-3",
                        ].join(" ")}
                      >
                        {isPast && !isCandidate ? (
                          <Check size={16} strokeWidth={2.5} aria-label="Visitada" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      {/* Info — the group header owns flag + country, rows stay clean */}
                      <div className="flex-1 min-w-0">
                        <span className="block font-display uppercase text-title-lg leading-tight truncate text-ink">
                          {stop.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {stop.nights > 0 && (
                            <span className="text-caption text-ink-3 font-medium">
                              {stop.nights} {stop.nights === 1 ? "noche" : "noches"}
                            </span>
                          )}
                          {stop.arrivalDate && (
                            <>
                              {stop.nights > 0 && (
                                <span className="text-border-strong text-caption" aria-hidden="true">·</span>
                              )}
                              <span className="text-caption text-ink-3 font-medium">
                                {formatShortDate(new Date(stop.arrivalDate))}
                              </span>
                            </>
                          )}
                          {isCandidate && <Badge variant="special">tentativa</Badge>}
                        </div>
                      </div>

                      <ChevronRight
                        size={15}
                        strokeWidth={2}
                        className="text-border-strong"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Add stop — the spine comes from `allStops`, not the person-filtered
            list: the position picker previews the dates the server will write,
            and that walk doesn't know about the person swap. */}
        <AddStopButton
          stops={itinerarySpine(allStops)}
          tripStartStr={tripStartValue || tripStartFallback || null}
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
    <div className="flex-1 min-w-0">
      <p className={`text-2xl font-numeral leading-none ${highlight ? "text-gold-ink" : "text-ink"}`}>
        {numeric !== null ? <AnimatedNumber value={numeric} /> : value}
      </p>
      <p className="label-caps text-ink-3 mt-1">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
