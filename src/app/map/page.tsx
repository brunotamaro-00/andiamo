import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { todayStr, dateToStr } from "@/lib/trip";
import { Wordmark } from "@/components/Wordmark";
import { TripMap } from "@/components/TripMap";
import {
  buildCountryPaths,
  buildSegments,
  makeProjection,
  MAP_WIDTH,
  MAP_HEIGHT,
  type StopState,
} from "@/lib/map-projection";
import type { FeatureCollection, Geometry } from "geojson";
import europeGeo from "@/data/europe.geo.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mapa · Andiamo" };

export default async function MapPage() {
  await requireAuth();

  const stops = await db.stop.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      name: true,
      slug: true,
      countryFlag: true,
      latitude: true,
      longitude: true,
      arrivalDate: true,
      departureDate: true,
      arrivalMode: true,
      isCandidate: true,
      isFlexMargin: true,
    },
  });

  // Only confirmed stops: not candidate and not flex-margin
  const confirmed = stops.filter((s) => !s.isCandidate && !s.isFlexMargin);

  const geojson = europeGeo as unknown as FeatureCollection<Geometry>;
  // Build projection once — pass it to buildCountryPaths to avoid a second
  // bounding-box calculation (P5 perf fix).
  const projection = makeProjection(confirmed);
  const coordsKey = confirmed.map((s) => `${s.latitude},${s.longitude}`).join("|");
  const countryPaths = buildCountryPaths(geojson, projection, coordsKey);

  // Determine visit state for each stop based on today's date.
  // We compare YYYY-MM-DD strings to avoid timezone issues: Prisma @db.Date
  // values are UTC midnight, and todayStr() is anchored to TRIP_TIMEZONE.
  const today = todayStr();

  const cities = confirmed.map((s) => {
    const [x, y] = projection([s.longitude, s.latitude]) ?? [0, 0];
    let state: StopState = "upcoming";
    if (s.arrivalDate) {
      const arrStr = dateToStr(s.arrivalDate);
      if (arrStr <= today) {
        if (s.departureDate) {
          const depStr = dateToStr(s.departureDate);
          state = today < depStr ? "current" : "visited";
        } else {
          state = "current";
        }
      }
    }
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      name: s.name,
      slug: s.slug,
      countryFlag: s.countryFlag,
      order: s.order,
      arrivalMode: s.arrivalMode as "flight" | "ground",
      state,
    };
  });

  const segments = buildSegments(cities);

  // Deduplicate city nodes for rendering: cities that share the same pixel
  // (e.g., Edimburgo #3 and Edimburgo tránsito #7) show as one point.
  // Segments still use the full cities list so the route loop draws correctly.
  const seenCoords = new Set<string>();
  const cityNodes = cities.filter((city) => {
    const key = `${Math.round(city.x)},${Math.round(city.y)}`;
    if (seenCoords.has(key)) return false;
    seenCoords.add(key);
    return true;
  });

  // Count how many stops have been visited for the header
  const visitedCount = cities.filter(
    (c) => c.state === "visited" || c.state === "current"
  ).length;

  return (
    <div className="h-full bg-canvas flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-surface border-b border-border-strong px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <Wordmark size="sm" />
            <span className="text-[9px] font-display uppercase tracking-[0.14em] text-ink-3 ml-8 -mt-0.5">
              Trayecto
            </span>
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            {visitedCount > 0
              ? `${visitedCount} / ${confirmed.length} paradas`
              : `${confirmed.length} paradas`}
          </span>
        </div>
      </header>

      {/* min-h-0 prevents flex children from ignoring the parent height constraint */}
      <div className="flex-1 min-h-0">
        <TripMap
          countryPaths={countryPaths}
          cities={cityNodes}
          segments={segments}
          viewBoxWidth={MAP_WIDTH}
          viewBoxHeight={MAP_HEIGHT}
        />
      </div>
    </div>
  );
}
