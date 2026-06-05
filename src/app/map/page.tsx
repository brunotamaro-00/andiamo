import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { TripMap } from "@/components/TripMap";
import {
  buildCountryPaths,
  buildSegments,
  makeProjection,
  MAP_WIDTH,
  MAP_HEIGHT,
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
      arrivalMode: true,
      isCandidate: true,
      isFlexMargin: true,
    },
  });

  // Only confirmed stops: not candidate and not flex-margin
  const confirmed = stops.filter((s) => !s.isCandidate && !s.isFlexMargin);

  const geojson = europeGeo as unknown as FeatureCollection<Geometry>;
  const projection = makeProjection(confirmed);
  const countryPaths = buildCountryPaths(geojson, confirmed);

  const cities = confirmed.map((s) => {
    const [x, y] = projection([s.longitude, s.latitude]) ?? [0, 0];
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      name: s.name,
      slug: s.slug,
      countryFlag: s.countryFlag,
      order: s.order,
      arrivalMode: s.arrivalMode as "flight" | "ground",
    };
  });

  const segments = buildSegments(cities);

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
            {confirmed.length} paradas
          </span>
        </div>
      </header>

      {/* min-h-0 prevents flex children from ignoring the parent height constraint */}
      <div className="flex-1 min-h-0">
        <TripMap
          countryPaths={countryPaths}
          cities={cities}
          segments={segments}
          viewBoxWidth={MAP_WIDTH}
          viewBoxHeight={MAP_HEIGHT}
        />
      </div>
    </div>
  );
}
