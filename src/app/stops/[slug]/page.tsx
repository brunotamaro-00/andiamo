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

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const stop = await db.stop.findUnique({ where: { slug }, select: { name: true, countryFlag: true } });
  return { title: stop ? `${stop.countryFlag} ${stop.name} — Europa 2026` : "Europa 2026" };
}

export default async function StopPage({ params }: Props) {
  const { slug } = await params;

  const [stop, currentSlug] = await Promise.all([
    db.stop.findUnique({
      where: { slug },
      include: {
        pois: { orderBy: [{ done: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
        documents: { orderBy: { createdAt: "asc" } },
      },
    }),
    getCurrentStopSlug(),
  ]);

  if (!stop) notFound();

  // Nearby stops for navigation
  const adjacentStops = await db.stop.findMany({
    where: {
      order: { gte: stop.order - 2, lte: stop.order + 2 },
      isFlexMargin: false,
      NOT: { id: stop.id },
    },
    orderBy: { order: "asc" },
    select: { slug: true, name: true, order: true, countryFlag: true },
  });

  const prevStop = adjacentStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = adjacentStops.find((s) => s.order > stop.order);

  const isActive = slug === currentSlug;

  const today = new Date();
  const tripStart = new Date("2026-08-05");
  const daysLeft = stop.departureDate
    ? Math.max(0, Math.ceil((new Date(stop.departureDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
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
    <div className="min-h-screen bg-slate-950">
      {/* Top nav */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <Link href="/stops" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
          ← Itinerario
        </Link>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-sm font-semibold text-slate-100 truncate">
            {stop.countryFlag} {stop.name}
          </h1>
        </div>
        <div className="w-16" /> {/* spacer */}
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
        {/* City header card */}
        <div className={`rounded-2xl p-4 border ${isActive ? "bg-sky-900/20 border-sky-700/40" : "bg-slate-900 border-slate-800"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xl">{stop.countryFlag}</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{stop.name}</h2>
                  <p className="text-sm text-slate-400">{stop.country}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {stop.arrivalDate && (
                  <Badge>{formatDate(stop.arrivalDate)} → {stop.departureDate ? formatDate(stop.departureDate) : "?"}</Badge>
                )}
                {stop.nights > 0 && <Badge>{stop.nights} noches</Badge>}
                <Badge>{stop.category}</Badge>
                <Badge>{stop.priceLevel}</Badge>
                {stop.tempRange && <Badge>🌡️ {stop.tempRange}</Badge>}
              </div>
            </div>

            <div className="text-right shrink-0">
              {isActive && (
                <span className="inline-block bg-sky-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  Aquí ahora
                </span>
              )}
              {!stop.datesFixed && (
                <span className="block text-[10px] text-amber-400 mt-1">fechas tentativas</span>
              )}
              {stop.isTransit && (
                <span className="block text-[10px] text-slate-500 mt-1">tránsito</span>
              )}
              {stop.isCandidate && (
                <span className="block text-[10px] text-purple-400 mt-1">candidata</span>
              )}
            </div>
          </div>

          {stop.arrivalDate && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Día {getTripDay(stop.arrivalDate)} del viaje</span>
              {isActive && daysLeft !== null && (
                <span className="text-sky-400">{daysLeft} días restantes aquí</span>
              )}
            </div>
          )}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex gap-2">
          {prevStop ? (
            <Link href={`/stops/${prevStop.slug}`} className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:border-slate-600 transition-colors">
              ← {prevStop.countryFlag} {prevStop.name}
            </Link>
          ) : <div className="flex-1" />}
          {nextStop ? (
            <Link href={`/stops/${nextStop.slug}`} className="flex-1 flex items-center justify-end gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:border-slate-600 transition-colors text-right">
              {nextStop.countryFlag} {nextStop.name} →
            </Link>
          ) : <div className="flex-1" />}
        </div>

        {/* Weather */}
        <WeatherCard lat={stop.latitude} lng={stop.longitude} />

        {/* Currency */}
        <CurrencyCard currencyCode={stop.currencyCode} />

        {/* Map — key changes when POIs change, forcing re-mount to show new markers */}
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
          documents={stop.documents as Parameters<typeof DocumentsPanel>[0]["documents"]}
          path={path}
        />
      </main>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-slate-800 text-slate-400 rounded-lg px-2 py-0.5 border border-slate-700">
      {children}
    </span>
  );
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function getTripDay(arrival: Date | string): number {
  const start = new Date("2026-08-05");
  const arrDate = new Date(arrival);
  return Math.floor((arrDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
