import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, ChevronRight, FileText, MapPin,
  Sunrise, Sunset, Thermometer,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { computeCurrentStopSlug } from "@/lib/current-stop";
import { TRIP_TIMEZONE, todayStr, dateToStr, daysBetween } from "@/lib/trip";
import { collectUrgentSections, STOP_TO_GUIDES, type UrgentEntry } from "@/lib/guides";
import { tentativeSunTimes } from "@/lib/sun";
import { assumedDateWindow } from "@/lib/itinerary";
import { Wordmark } from "@/components/Wordmark";
import { LogoutButton } from "@/components/LogoutButton";
import { TodayPoiList } from "@/components/TodayPoiList";
import { Card, SectionHeader } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hoy · Andiamo" };

const KIND_LABEL: Record<string, string> = {
  checkin: "Check-in", voucher: "Voucher", ticket: "Entrada",
  carRental: "Auto", insurance: "Seguro", flight: "Vuelo", other: "Otro",
};

export default async function HoyPage() {
  await requireAuth();

  const [stops, override] = await Promise.all([
    db.stop.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true, slug: true, name: true, country: true, countryFlag: true,
        order: true, nights: true, isCandidate: true, isFlexMargin: true,
        arrivalDate: true, departureDate: true, tempRange: true,
        latitude: true, longitude: true, timezone: true,
      },
    }),
    db.setting.findUnique({ where: { key: "manualCurrentStopId" } }),
  ]);

  const today = todayStr();
  const currentSlug = computeCurrentStopSlug(stops, override?.value ?? null, today);
  const confirmed = stops.filter((s) => !s.isFlexMargin && !s.isCandidate);

  const firstArrivalStr =
    confirmed.filter((s) => s.arrivalDate).map((s) => dateToStr(s.arrivalDate!)).sort()[0] ?? null;
  const lastDepartureStr =
    confirmed.filter((s) => s.departureDate).map((s) => dateToStr(s.departureDate!)).sort().at(-1) ?? null;

  const phase: "before" | "during" | "after" | "unplanned" =
    !firstArrivalStr
      ? "unplanned"
      : today < firstArrivalStr
      ? "before"
      : lastDepartureStr && today >= lastDepartureStr
      ? "after"
      : "during";

  const currentStop = stops.find((s) => s.slug === currentSlug) ?? null;
  // computeCurrentStopSlug falls back to first/last stop outside its range —
  // only trust it when today is actually inside the stay window
  const inCurrentStop = Boolean(
    currentStop?.arrivalDate &&
    currentStop.departureDate &&
    dateToStr(currentStop.arrivalDate) <= today &&
    today < dateToStr(currentStop.departureDate),
  );

  const nextStop = confirmed.find((s) => s.arrivalDate && dateToStr(s.arrivalDate) > today) ?? null;

  // Detail sections only matter while staying at a stop
  const showStopSections = phase === "during" && currentStop && inCurrentStop;
  const [details, urgents] = await Promise.all([
    showStopSections
      ? db.stop.findUnique({
          where: { id: currentStop.id },
          select: {
            pois: {
              where: { done: false },
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, type: true, done: true, reservationRequired: true },
            },
            documents: {
              orderBy: { createdAt: "asc" },
              select: { id: true, label: true, kind: true },
            },
          },
        })
      : null,
    phase === "before" || phase === "during"
      ? collectUrgentSections().catch(() => [] as UrgentEntry[])
      : ([] as UrgentEntry[]),
  ]);

  // Earliest arrival per guide → upcoming urgent sections (next 2 by arrival)
  const guideArrival = new Map<string, string>();
  for (const s of stops) {
    if (!s.arrivalDate) continue;
    const arr = dateToStr(s.arrivalDate);
    for (const g of STOP_TO_GUIDES[s.slug] ?? []) {
      const cur = guideArrival.get(g);
      if (!cur || arr < cur) guideArrival.set(g, arr);
    }
  }
  const upcomingUrgents = urgents
    .map((e) => ({ entry: e, arrival: guideArrival.get(e.guide.slug) ?? null }))
    .filter(({ arrival }) => arrival !== null && arrival >= today)
    .sort((a, b) => a.arrival!.localeCompare(b.arrival!))
    .slice(0, 2);

  const todayLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long", day: "numeric", month: "long", timeZone: TRIP_TIMEZONE,
  }).format(new Date());

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface backdrop-blur-md border-b border-border-strong px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <Wordmark size="sm" />
            <span className="text-[9px] font-display uppercase tracking-[0.14em] text-ink-3 ml-8 -mt-0.5">
              {todayLabel}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {phase === "unplanned" && (
          <HeroCard
            numeral="—"
            numeralLabel=""
            title="Sin fechas todavía"
            subtitle="Fijá la fecha de inicio en el itinerario para activar esta vista."
            href="/stops"
          />
        )}

        {phase === "before" && (
          <HeroCard
            numeral={Math.max(0, daysBetween(today, firstArrivalStr!)).toString()}
            numeralLabel={daysBetween(today, firstArrivalStr!) === 1 ? "día" : "días"}
            title="Faltan para el despegue"
            subtitle={
              nextStop
                ? `Primera parada: ${nextStop.countryFlag} ${nextStop.name} · ${formatShortDate(nextStop.arrivalDate!)}`
                : undefined
            }
            href={nextStop ? `/stops/${nextStop.slug}` : "/stops"}
          />
        )}

        {phase === "during" && showStopSections && (
          <CurrentStopHero
            stop={currentStop!}
            today={today}
            firstArrivalStr={firstArrivalStr!}
            allStops={stops}
          />
        )}

        {phase === "during" && !showStopSections && (
          <HeroCard
            numeral={(daysBetween(firstArrivalStr!, today) + 1).toString()}
            numeralLabel="día"
            title="En tránsito"
            subtitle={
              nextStop
                ? `Próxima parada: ${nextStop.countryFlag} ${nextStop.name} · ${formatShortDate(nextStop.arrivalDate!)}`
                : undefined
            }
            href={nextStop ? `/stops/${nextStop.slug}` : "/stops"}
          />
        )}

        {phase === "after" && (
          <HeroCard
            numeral={daysBetween(firstArrivalStr!, lastDepartureStr!).toString()}
            numeralLabel="días"
            title="Viaje terminado"
            subtitle={`${confirmed.length} paradas · ${[...new Set(confirmed.map((s) => s.country))].length} países`}
            href="/stops"
          />
        )}

        {/* Pending POIs at the current stop */}
        {showStopSections && details && details.pois.length > 0 && (
          <Card className="animate-fade-in stagger-1">
            <SectionHeader
              title="Pendientes acá"
              count={details.pois.length}
              action={
                <Link
                  href={`/stops/${currentStop!.slug}#pois`}
                  className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded"
                >
                  Ver todos
                </Link>
              }
            />
            <TodayPoiList slug={currentStop!.slug} pois={details.pois} />
          </Card>
        )}

        {/* Documents at the current stop */}
        {showStopSections && details && details.documents.length > 0 && (
          <Card className="animate-fade-in stagger-2">
            <SectionHeader title="Documentos de la parada" count={details.documents.length} />
            <ul className="space-y-1">
              {details.documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-2 py-2 min-h-[44px] rounded-[4px] transition-colors duration-150 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
                  >
                    <FileText size={15} strokeWidth={1.5} aria-hidden="true" className="text-ink-3 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm text-ink">{doc.label}</span>
                    <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
                      {KIND_LABEL[doc.kind] ?? doc.kind}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Upcoming urgent reservations */}
        {upcomingUrgents.length > 0 && (
          <Card className="animate-fade-in stagger-3">
            <SectionHeader
              title="Reservas urgentes"
              action={
                <Link
                  href="/guias/reservas"
                  className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded"
                >
                  Ver todas
                </Link>
              }
            />
            <ul className="space-y-1.5">
              {upcomingUrgents.map(({ entry, arrival }) => (
                <li key={`${entry.guide.slug}/${entry.doc.slug}`}>
                  <Link
                    href={`/guias/${entry.guide.slug}/${entry.doc.slug}`}
                    className="flex items-center gap-2.5 px-2 py-2 min-h-[44px] rounded-[4px] transition-colors duration-150 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
                  >
                    <AlertTriangle size={15} strokeWidth={1.5} aria-hidden="true" className="text-brick shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm text-ink">
                      <span aria-hidden="true">{entry.guide.countryFlag}</span> {entry.guide.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
                      {formatShortDateStr(arrival!)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Next stop */}
        {phase === "during" && showStopSections && nextStop && (
          <Link
            href={`/stops/${nextStop.slug}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[4px] animate-fade-in stagger-4"
          >
            <div className="flex items-center gap-3 bg-surface border-2 border-border rounded-[4px] px-4 py-3 card-shadow transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0">
              <MapPin size={16} strokeWidth={1.5} aria-hidden="true" className="text-ink-3 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">Próxima parada</p>
                <p className="text-sm font-semibold text-ink mt-0.5 truncate">
                  <span aria-hidden="true">{nextStop.countryFlag}</span> {nextStop.name} · {formatShortDate(nextStop.arrivalDate!)}
                </p>
              </div>
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" className="text-border-strong shrink-0" />
            </div>
          </Link>
        )}
      </main>
    </div>
  );
}

/** Gold context hero for the non-stop phases (before/transit/after/unplanned). */
function HeroCard({
  numeral, numeralLabel, title, subtitle, href,
}: {
  numeral: string;
  numeralLabel: string;
  title: string;
  subtitle?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[4px] animate-fade-in"
    >
      <div className="flex items-center gap-4 bg-gold-bg border-2 border-gold-border rounded-[4px] px-4 py-4 card-shadow transition-all duration-150 hover:border-gold hover:-translate-y-[2px] motion-reduce:hover:translate-y-0">
        <div className="text-center shrink-0">
          <p className="text-5xl font-numeral leading-none text-gold-ink">{numeral}</p>
          {numeralLabel && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-gold-ink/70 mt-0.5">
              {numeralLabel}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-gold-ink/70">Hoy</p>
          <p className="text-sm font-semibold text-ink mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-ink-2 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="ml-auto shrink-0 text-gold-ink/60" />
      </div>
    </Link>
  );
}

interface HeroStop {
  slug: string;
  name: string;
  country: string;
  countryFlag: string;
  order: number;
  arrivalDate: Date | null;
  departureDate: Date | null;
  tempRange: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/** Main hero while staying at a stop — city, trip day, days left, temp and sun. */
function CurrentStopHero({
  stop, today, firstArrivalStr, allStops,
}: {
  stop: HeroStop;
  today: string;
  firstArrivalStr: string;
  allStops: { order: number; arrivalDate: Date | null; departureDate: Date | null }[];
}) {
  const day = daysBetween(firstArrivalStr, today) + 1;
  const daysLeft = stop.departureDate
    ? Math.max(0, daysBetween(today, dateToStr(stop.departureDate)))
    : null;

  const stayWindow = assumedDateWindow(stop, allStops);
  const sunTimes = stayWindow
    ? tentativeSunTimes(stop.latitude, stop.longitude, stayWindow.arrival, stayWindow.departure, stop.timezone)
    : null;

  return (
    <Link
      href={`/stops/${stop.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[6px] animate-fade-in"
    >
      <div className="bg-surface border-2 border-border border-t-[3px] border-t-brick rounded-[6px] p-4 card-shadow transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            Día {day} del viaje
          </p>
          {daysLeft !== null && (
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-brick">
              {daysLeft === 0 ? "Última noche" : `${daysLeft} ${daysLeft === 1 ? "día" : "días"} acá`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-4xl" aria-hidden="true">{stop.countryFlag}</span>
          <div className="min-w-0">
            <h1 className="text-3xl font-display uppercase text-ink leading-tight tracking-wide truncate">
              {stop.name}
            </h1>
            <p className="text-sm text-ink-2">{stop.country}</p>
          </div>
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="ml-auto shrink-0 text-border-strong" />
        </div>
        {(stop.tempRange || sunTimes || stop.departureDate) && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs text-ink-3">
            {stop.departureDate && <span>Hasta el {formatShortDate(stop.departureDate)}</span>}
            {stop.tempRange && (
              <span className="flex items-center gap-1">
                <Thermometer size={13} strokeWidth={1.5} aria-hidden="true" />
                ≈{stop.tempRange}
              </span>
            )}
            {sunTimes && (
              <span className="ml-auto flex items-center gap-1.5 tabular-nums">
                <Sunrise size={13} strokeWidth={1.5} aria-hidden="true" className="text-warning" />
                {sunTimes.sunrise}
                <Sunset size={13} strokeWidth={1.5} aria-hidden="true" className="ml-1.5" />
                {sunTimes.sunset}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function formatShortDateStr(s: string): string {
  return formatShortDate(new Date(`${s}T00:00:00.000Z`));
}
