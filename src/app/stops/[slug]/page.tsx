import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStopSlug, getTripDayNumber } from "@/lib/current-stop";
import { todayStr, dateToStr } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { WeatherCard } from "@/components/WeatherCard";
import { CurrencyCard } from "@/components/CurrencyCard";
import { PoiPanel } from "@/components/PoiPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EditStopPanel } from "@/components/EditStopPanel";
import { Badge } from "@/components/ui/Badge";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Thermometer } from "lucide-react";
import { HashScroller } from "@/components/HashScroller";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stop = await db.stop.findUnique({
    where: { slug },
    select: { name: true, countryFlag: true },
  });
  return {
    title: stop ? `${stop.countryFlag} ${stop.name} · Andiamo` : "Andiamo",
  };
}

export default async function StopPage({ params }: Props) {
  await requireAuth();
  const { slug } = await params;

  // All three queries are independent and run concurrently.
  // otherStops does NOT depend on stop.id — we filter it in memory after resolving.
  const [stop, currentSlug, allOtherStops, tripDay] = await Promise.all([
    db.stop.findUnique({
      where: { slug },
      include: {
        pois: {
          orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        },
        notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
        documents: { orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentStopSlug(),
    db.stop.findMany({
      where: { isFlexMargin: false },
      orderBy: { order: "asc" },
      select: { id: true, slug: true, name: true, order: true, countryFlag: true, isCandidate: true, arrivalDate: true, departureDate: true },
    }),
    getTripDayNumber(slug),
  ]);

  if (!stop) notFound();

  /* Filter out the current stop in memory — avoids a serial DB round-trip (P1 fix) */
  const otherStops = allOtherStops.filter((s) => s.id !== stop.id);

  const prevStop = otherStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = otherStops.find((s) => s.order > stop.order);
  const allStops = otherStops;

  const isActive = slug === currentSlug;

  // UTC-safe trip phase + countdown calculations.
  // All dates from Prisma @db.Date are UTC midnight strings — compare as YYYY-MM-DD.
  const today = todayStr();
  const allConfirmedForPhase = [
    { isCandidate: stop.isCandidate, arrivalDate: stop.arrivalDate, departureDate: stop.departureDate },
    ...allOtherStops,
  ].filter((s) => !s.isCandidate);

  const firstArrivalStr =
    allConfirmedForPhase
      .filter((s) => s.arrivalDate)
      .map((s) => dateToStr(s.arrivalDate!))
      .sort()[0] ?? null;
  const lastDepartureStr =
    allConfirmedForPhase
      .filter((s) => s.departureDate)
      .map((s) => dateToStr(s.departureDate!))
      .sort()
      .at(-1) ?? null;

  const tripPhase: "before" | "during" | "after" =
    firstArrivalStr && today < firstArrivalStr
      ? "before"
      : lastDepartureStr && today >= lastDepartureStr
      ? "after"
      : "during";

  // Days remaining at this stop (UTC-safe — both sides are UTC midnight)
  const depStr = stop.departureDate ? dateToStr(stop.departureDate) : null;
  const daysLeft = depStr
    ? Math.max(0, Math.ceil((new Date(depStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Days until trip starts (only relevant when before the trip)
  const daysToStart =
    tripPhase === "before" && firstArrivalStr
      ? Math.max(0, Math.ceil((new Date(firstArrivalStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const path = `/stops/${slug}`;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top nav */}
      <header className="sticky top-0 z-[1000] bg-surface backdrop-blur border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Link
          href="/stops"
          className="text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Itinerario
        </Link>
        <div className="flex-1 min-w-0 text-center">
          <p className="font-numeral text-sm text-ink-3 tabular-nums">
            {String(otherStops.filter((s) => s.order < stop.order && !s.isCandidate).length + (stop.isCandidate ? 0 : 1)).padStart(2, "0")}
            {" / "}
            {String(otherStops.filter((s) => !s.isCandidate).length + (stop.isCandidate ? 0 : 1)).padStart(2, "0")}
          </p>
        </div>
        <div className="w-20" />
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />
        {/* City header card */}
        <div
          className={`rounded-[6px] p-4 border-2 card-shadow ${
            isActive
              ? "bg-surface border-border border-t-[3px] border-t-brick"
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl" aria-hidden="true">
                  {stop.countryFlag}
                </span>
                <div>
                  <h1 className="text-3xl font-display uppercase text-ink leading-tight tracking-wide">
                    {stop.name}
                  </h1>
                  <p className="text-sm text-ink-2 mt-0.5">{stop.country}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {stop.arrivalDate && (
                  <DateBadge>
                    {formatDate(stop.arrivalDate)} –{" "}
                    {stop.departureDate ? formatDate(stop.departureDate) : "?"}
                  </DateBadge>
                )}
                {stop.tempRange && (
                  <DateBadge>
                    <Thermometer size={11} strokeWidth={1.5} aria-hidden="true" className="inline mr-1" />
                    {stop.tempRange}
                  </DateBadge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
              {isActive && tripPhase === "during" && <Badge variant="active">Aquí ahora</Badge>}
              {isActive && tripPhase === "before" && <Badge variant="special">Próxima parada</Badge>}
              {stop.datesFixed && <Badge variant="warning">fecha fija</Badge>}
              {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
              {stop.isCandidate && <Badge variant="special">candidata</Badge>}
              <EditStopPanel
                stopId={stop.id}
                slug={stop.slug}
                name={stop.name}
                arrivalDate={stop.arrivalDate}
                departureDate={stop.departureDate}
                nights={stop.nights}
                datesFixed={stop.datesFixed}
                isCandidate={stop.isCandidate}
                isTransit={stop.isTransit}
                arrivalMode={stop.arrivalMode as "flight" | "ground"}
                currentOrder={stop.order}
                allStops={allStops}
              />
            </div>
          </div>

          {stop.arrivalDate && tripDay !== null && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-xs text-ink-3">
              <span>Día {tripDay} del viaje</span>
              {isActive && tripPhase === "during" && daysLeft !== null && (
                <span className="text-brick">
                  {daysLeft} {daysLeft === 1 ? "día" : "días"} restantes aquí
                </span>
              )}
              {isActive && tripPhase === "before" && daysToStart !== null && (
                <span className="text-brick">
                  Faltan {daysToStart} {daysToStart === 1 ? "día" : "días"} para el inicio
                </span>
              )}
            </div>
          )}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex gap-2">
          {prevStop ? (
            <Link
              href={`/stops/${prevStop.slug}`}
              className={[
                "flex-1 flex items-center gap-1.5 bg-surface border-2 border-border",
                "rounded-[4px] px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              <span aria-hidden="true">{prevStop.countryFlag}</span>{" "}
              {prevStop.name}
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextStop ? (
            <Link
              href={`/stops/${nextStop.slug}`}
              className={[
                "flex-1 flex items-center justify-end gap-1.5 bg-surface border-2 border-border",
                "rounded-[4px] px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span aria-hidden="true">{nextStop.countryFlag}</span>{" "}
              {nextStop.name}
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Weather */}
        <WeatherCard lat={stop.latitude} lng={stop.longitude} />

        {/* Currency */}
        <CurrencyCard currencyCode={stop.currencyCode} />

        {/* POIs */}
        <div id="pois" className="scroll-mt-20">
          <PoiPanel
            stopId={stop.id}
            slug={stop.slug}
            stopLat={stop.latitude}
            stopLng={stop.longitude}
            pois={stop.pois as Parameters<typeof PoiPanel>[0]["pois"]}
          />
        </div>

        {/* Notes */}
        <div id="notas" className="scroll-mt-20">
          <NotesPanel
            stopId={stop.id}
            slug={stop.slug}
            notes={stop.notes.map((n) => ({ ...n, createdAt: n.createdAt }))}
            path={path}
          />
        </div>

        {/* Documents */}
        <DocumentsPanel
          stopId={stop.id}
          slug={stop.slug}
          documents={
            stop.documents as Parameters<typeof DocumentsPanel>[0]["documents"]
          }
          path={path}
        />
      </main>
    </div>
  );
}

/** Small inline badge for dates/temp ranges */
function DateBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs bg-surface-2 text-ink-2 rounded-full px-2.5 py-1 border border-border font-medium">
      {children}
    </span>
  );
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

