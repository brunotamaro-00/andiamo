import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { WeatherCard } from "@/components/WeatherCard";
import { CurrencyCard } from "@/components/CurrencyCard";
import { StopMap } from "@/components/StopMap";
import { PoiPanel } from "@/components/PoiPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EditStopPanel } from "@/components/EditStopPanel";
import { Badge } from "@/components/ui/Badge";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Thermometer } from "lucide-react";

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
    title: stop ? `${stop.countryFlag} ${stop.name} — Europa 2026` : "Europa 2026",
  };
}

export default async function StopPage({ params }: Props) {
  const { slug } = await params;

  const [stop, currentSlug] = await Promise.all([
    db.stop.findUnique({
      where: { slug },
      include: {
        pois: {
          orderBy: [{ done: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        },
        notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
        documents: { orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentStopSlug(),
  ]);

  if (!stop) notFound();

  /* Nearby stops for navigation */
  const [adjacentStops, allStops] = await Promise.all([
    db.stop.findMany({
      where: {
        order: { gte: stop.order - 2, lte: stop.order + 2 },
        isFlexMargin: false,
        NOT: { id: stop.id },
      },
      orderBy: { order: "asc" },
      select: { slug: true, name: true, order: true, countryFlag: true },
    }),
    db.stop.findMany({
      where: { isFlexMargin: false, NOT: { id: stop.id } },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true, countryFlag: true },
    }),
  ]);

  const prevStop = adjacentStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = adjacentStops.find((s) => s.order > stop.order);

  const isActive = slug === currentSlug;

  const today = new Date();
  const daysLeft = stop.departureDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(stop.departureDate).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const poiMarkers = stop.pois.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as string,
    latitude: p.latitude,
    longitude: p.longitude,
    done: p.done,
  }));

  const path = `/stops/${slug}`;

  return (
    <div className="min-h-screen bg-sand-950">
      {/* Top nav */}
      <header className="sticky top-0 z-[1000] bg-sand-950/90 backdrop-blur border-b border-sand-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/stops"
          className="text-sand-400 hover:text-sand-200 text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Itinerario
        </Link>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-sm font-medium text-sand-300 truncate">
            <span aria-hidden="true">{stop.countryFlag}</span>{" "}
            {stop.name}
          </h1>
        </div>
        <div className="w-20" /> {/* spacer to balance left link */}
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* City header card */}
        <div
          className={`rounded-2xl p-4 border ${
            isActive
              ? "bg-gold-900 border-gold-700/50"
              : "bg-sand-900 border-sand-800"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl" aria-hidden="true">
                  {stop.countryFlag}
                </span>
                <div>
                  <h2 className="text-2xl font-semibold font-display text-sand-100 leading-tight">
                    {stop.name}
                  </h2>
                  <p className="text-sm text-sand-400 mt-0.5">{stop.country}</p>
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
                    <Thermometer
                      size={11}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="inline mr-1"
                    />
                    {stop.tempRange}
                  </DateBadge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
              {isActive && <Badge variant="active">Aquí ahora</Badge>}
              {!stop.datesFixed && (
                <Badge variant="warning">fechas tentativas</Badge>
              )}
              {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
              {stop.isCandidate && <Badge variant="special">candidata</Badge>}
              <EditStopPanel
                stopId={stop.id}
                slug={stop.slug}
                name={stop.name}
                arrivalDate={stop.arrivalDate}
                nights={stop.nights}
                datesFixed={stop.datesFixed}
                isCandidate={stop.isCandidate}
                currentOrder={stop.order}
                allStops={allStops}
              />
            </div>
          </div>

          {stop.arrivalDate && (
            <div className="mt-3 pt-3 border-t border-sand-800/50 flex flex-wrap gap-3 text-xs text-sand-500">
              <span>Día {getTripDay(stop.arrivalDate)} del viaje</span>
              {isActive && daysLeft !== null && (
                <span className="text-gold-400">
                  {daysLeft} {daysLeft === 1 ? "día" : "días"} restantes aquí
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
                "flex-1 flex items-center gap-1.5 bg-sand-900 border border-sand-800",
                "rounded-xl px-3 py-2.5 text-sm text-sand-400 hover:border-sand-700 hover:text-sand-200 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
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
                "flex-1 flex items-center justify-end gap-1.5 bg-sand-900 border border-sand-800",
                "rounded-xl px-3 py-2.5 text-sm text-sand-400 hover:border-sand-700 hover:text-sand-200 transition-colors text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
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

        {/* Map */}
        <StopMap
          key={`map-${stop.pois.map((p) => p.id + p.done).join("-")}`}
          centerLat={stop.latitude}
          centerLng={stop.longitude}
          pois={poiMarkers}
          stopName={stop.name}
        />

        {/* POIs */}
        <PoiPanel
          stopId={stop.id}
          slug={stop.slug}
          pois={stop.pois as Parameters<typeof PoiPanel>[0]["pois"]}
        />

        {/* Notes */}
        <NotesPanel
          stopId={stop.id}
          slug={stop.slug}
          notes={stop.notes.map((n) => ({ ...n, createdAt: n.createdAt }))}
          path={path}
        />

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
    <span className="inline-flex items-center text-xs bg-sand-850 text-sand-400 rounded-lg px-2 py-0.5 border border-sand-800">
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

function getTripDay(arrival: Date | string): number {
  const start = new Date("2026-08-05");
  const arrDate = new Date(arrival);
  return (
    Math.floor(
      (arrDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );
}
