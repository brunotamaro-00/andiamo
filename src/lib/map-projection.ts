import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;
const PAD = 48;

export type StopState = "visited" | "current" | "upcoming";

export interface CityPoint {
  x: number;
  y: number;
  name: string;
  slug: string;
  countryFlag: string;
  order: number;
  state: StopState;
}

export interface Segment {
  /** SVG path string for the connecting line/arc */
  d: string;
  /** Midpoint for placing the transport icon */
  mx: number;
  my: number;
  mode: "flight" | "ground";
  /** traveled = destination already visited/current; upcoming = future */
  state: "traveled" | "upcoming";
  fromSlug: string;
  toSlug: string;
}

const mercY = (lat: number) =>
  Math.log(Math.tan((lat * Math.PI) / 360 + Math.PI / 4));

/**
 * Build a Mercator projection manually centered on the stops bounding box.
 * We avoid fitExtent because it mis-scales when the feature bbox is non-square
 * relative to the SVG aspect ratio.
 */
export function makeProjection(stops: Array<{ latitude: number; longitude: number }>) {
  const PAD_DEG = 10;
  const lngs = stops.map((s) => s.longitude);
  const lats = stops.map((s) => s.latitude);
  const minLng = Math.min(...lngs) - PAD_DEG;
  const maxLng = Math.max(...lngs) + PAD_DEG;
  const minLat = Math.min(...lats) - PAD_DEG;
  const maxLat = Math.max(...lats) + PAD_DEG;

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const availW = MAP_WIDTH - 2 * PAD;
  const availH = MAP_HEIGHT - 2 * PAD;

  // lng range in radians (linear in Mercator x)
  const lngRange = ((maxLng - minLng) * Math.PI) / 180;
  // Mercator y range
  const latRange = mercY(maxLat) - mercY(minLat);

  const scaleW = availW / lngRange;
  const scaleH = availH / latRange;
  const scale = Math.min(scaleW, scaleH);

  return geoMercator()
    .center([centerLng, centerLat])
    .scale(scale)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
}

/** Build SVG path strings for every European country using an already-computed projection.
 *  Accepts the projection object directly (no need to recompute it from stops). */
export function buildCountryPaths(
  geojson: FeatureCollection<Geometry>,
  projection: ReturnType<typeof makeProjection>
): string[] {
  const path = geoPath(projection);
  return geojson.features
    .map((f) => path(f))
    .filter((d): d is string => d != null && d.length > 0);
}

/** Quadratic Bézier arc path between two projected points.
 *  The control point is displaced perpendicular to the midpoint by a fraction of the distance,
 *  curving upward (negative Y = up in SVG). */
function flightArc(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  // Perpendicular direction (normalized, pointing "up-ish")
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Offset the control point perpendicular to the segment, scaled to 25% of distance
  const curve = dist * 0.25;
  const cx = mx - (dy / len) * curve;
  const cy = my + (dx / len) * curve;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
}

/** Slightly curved ground path (cubic Bézier pulled towards the midpoint slightly) */
function groundLine(x1: number, y1: number, x2: number, y2: number): string {
  return `M${x1},${y1} L${x2},${y2}`;
}

export function buildSegments(
  cities: Array<{
    x: number;
    y: number;
    slug: string;
    arrivalMode: "flight" | "ground";
    state: StopState;
  }>
): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < cities.length; i++) {
    const from = cities[i - 1];
    const to = cities[i];
    const mode = to.arrivalMode;
    const d = mode === "flight"
      ? flightArc(from.x, from.y, to.x, to.y)
      : groundLine(from.x, from.y, to.x, to.y);

    // Midpoint along the segment for icon placement
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;

    // Traveled if the destination has already been visited (or is current stop)
    const segState: "traveled" | "upcoming" =
      to.state === "visited" || to.state === "current" ? "traveled" : "upcoming";

    segments.push({ d, mx, my, mode, state: segState, fromSlug: from.slug, toSlug: to.slug });
  }
  return segments;
}
