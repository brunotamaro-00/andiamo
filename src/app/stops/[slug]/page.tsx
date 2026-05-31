import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
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

  /* Other stops — one query powers both prev/next nav and the reorder picker */
  const otherStops = await db.stop.findMany({
    where: { isFlexMargin: false, NOT: { id: stop.id } },
    orderBy: { order: "asc" },
    select: { id: true, slug: true, name: true, order: true, countryFlag: true },
  });

  const prevStop = otherStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = otherStops.find((s) => s.order > stop.order);
  const allStops = otherStops;

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

  const path = `/stops/${slug}`;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top nav */}
      <header className="sticky top-0 z-[1000] bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Link
          href="/stops"
          className="text-ink-2 hover:text-ink text-sm transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-lg px-1 py-0.5"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Itinerario
        </Link>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-medium text-ink-2 truncate">
            <span aria-hidden="true">{stop.countryFlag}</span>{" "}
            {stop.name}
          </p>
        </div>
        <div className="w-20" /> {/* spacer to balance left link */}
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <HashScroller />
        {/* City header card */}
        <div
          className={`rounded-2xl p-4 border card-shadow ${
            isActive
              ? "bg-surface border-border border-t-2 border-t-coral"
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
                  <h1 className="text-2xl font-semibold font-display text-ink leading-tight">
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
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-xs text-ink-3">
              <span>Día {getTripDay(stop.arrivalDate)} del viaje</span>
              {isActive && daysLeft !== null && (
                <span className="text-coral">
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
                "flex-1 flex items-center gap-1.5 bg-surface border border-border",
                "rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
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
                "flex-1 flex items-center justify-end gap-1.5 bg-surface border border-border",
                "rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
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

function getTripDay(arrival: Date | string): number {
  const start = new Date("2026-08-05");
  const arrDate = new Date(arrival);
  return (
    Math.floor(
      (arrDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );
}
