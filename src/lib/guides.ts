import { readFile } from "node:fs/promises";
import path from "node:path";
import manifestJson from "../../content/guides/manifest.json";
import { IS_DEMO } from "./demo";
import type { Guide, GuideCity, GuideCountry, GuideDoc, GuideManifest } from "./guide-types";
import { docKind, flattenGuides, isNotasKatia } from "./guide-types";

export type { Guide, GuideCity, GuideCountry, GuideDoc, GuideManifest } from "./guide-types";
export { docKind, flattenGuides, guideDocs, isNotasKatia } from "./guide-types";

const source = manifestJson as GuideManifest;

/** Katia's notes are her own raw research, not part of the doc structure the
 *  demo is meant to showcase — so the demo drops them outright rather than
 *  rendering a placeholder like it does for the seven standard docs. Removing
 *  them from the manifest is the same single lever used for the trip-wide docs
 *  below: no route, no offline precache entry, no search hit, no export row. */
function dropNotasKatia(guide: Guide): Guide {
  return {
    ...guide,
    docs: guide.docs.filter((d) => !isNotasKatia(d.slug)),
    cities: guide.cities.map((c) => ({
      ...c,
      docs: c.docs.filter((d) => !isNotasKatia(d.slug, c.slug)),
    })),
    guides: guide.guides.map(dropNotasKatia),
  };
}

/** The demo drops the trip-wide docs ("El viaje": panel de reservas, presupuesto,
 *  Eurail, packing list) — they're personal logistics, not structure worth
 *  showing. Emptying them here is the single lever: it also removes their
 *  routes (generateStaticParams + dynamicParams:false → 404), the offline
 *  precache entries, the search hits and the Spitwise export rows. */
const manifest: GuideManifest = IS_DEMO
  ? {
      ...source,
      general: [],
      resources: [],
      countries: source.countries.map(
        (c): GuideCountry => ({
          ...c,
          countryDocs: c.countryDocs.filter((d) => !isNotasKatia(d.slug)),
          guides: c.guides.map(dropNotasKatia),
        })
      ),
    }
  : source;

/** Trip-wide docs and resources exposed as pseudo-guides so they share the
 *  /guias/[guide]/[doc] routes. */
const PSEUDO_GUIDES: Guide[] = [
  ...(IS_DEMO
    ? []
    : [
        {
          slug: "general",
          title: "El viaje",
          country: "General",
          countryFlag: "🌍",
          docs: manifest.general,
          dayTrips: [],
          cities: [],
          guides: [],
        },
        {
          slug: "recursos",
          title: "Recursos",
          country: "General",
          countryFlag: "🎒",
          docs: manifest.resources,
          dayTrips: [],
          cities: [],
          guides: [],
        },
      ]),
  // Loose country-level docs (e.g. the Slovenia regional README)
  ...manifest.countries
    .filter((c) => c.countryDocs.length > 0)
    .map((c) => ({
      slug: c.slug,
      title: c.name,
      country: c.name,
      countryFlag: c.flag,
      docs: c.countryDocs,
      dayTrips: [],
      cities: [],
      guides: [],
    })),
];

export function getManifest(): GuideManifest {
  return manifest;
}

/** Every guide with a `/guias/[slug]` route — top-level and nested children. */
export function getAllGuides(): Guide[] {
  return [...flattenGuides(manifest.countries.flatMap((c) => c.guides)), ...PSEUDO_GUIDES];
}

export function getGuide(slug: string): Guide | null {
  return getAllGuides().find((g) => g.slug === slug) ?? null;
}

export interface GuideDocHit {
  guide: Guide;
  doc: GuideDoc;
  isDayTrip: boolean;
  /** Set when the doc belongs to a city group nested in a regional guide. */
  city?: GuideCity;
}

export function getDoc(guideSlug: string, docSlug: string): GuideDocHit | null {
  const guide = getGuide(guideSlug);
  if (!guide) return null;
  const doc = guide.docs.find((d) => d.slug === docSlug);
  if (doc) return { guide, doc, isDayTrip: false };
  const trip = guide.dayTrips.find((d) => d.slug === docSlug);
  if (trip) return { guide, doc: trip, isDayTrip: true };
  for (const city of guide.cities) {
    const cityDoc = city.docs.find((d) => d.slug === docSlug);
    if (cityDoc) return { guide, doc: cityDoc, isDayTrip: false, city };
    const cityTrip = city.dayTrips.find((d) => d.slug === docSlug);
    if (cityTrip) return { guide, doc: cityTrip, isDayTrip: true, city };
  }
  return null;
}

/** The city group inside `guide` whose slug matches, if any. */
export function getGuideCity(guide: Guide, citySlug: string): GuideCity | null {
  return guide.cities.find((c) => c.slug === citySlug) ?? null;
}

export async function readDocMarkdown(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "content", "guides", file), "utf8");
}

/** Explicit stop-slug → guide-slugs map (first entry is the primary guide).
 *  Needed because stops and guide folders don't align 1:1 — e.g. three
 *  Scotland stops share the Highlands guide.
 *
 *  In the South the guide is the *region* (Sicilia / Puglia / Calabria) and
 *  cities are groups inside it, because the November route is still
 *  tentative. Southern stops therefore map to a regional guide plus the
 *  `sur-de-italia` decision hub; `STOP_TO_GUIDE_CITY` narrows the stop card
 *  to that stop's city group. Nápoles stays outside the South container and
 *  keeps Costa Amalfitana as its secondary guide.
 *
 *  Only real stop slugs belong here — `stopSlugsForGuide` renders them as
 *  /stops/[slug] links, so a phantom key would produce a dead link. */
export const STOP_TO_GUIDES: Record<string, string[]> = {
  londres: ["londres"],
  york: ["york"],
  edimburgo: ["edimburgo"],
  "edimburgo-2": ["edimburgo"],
  "fort-william": ["highlands"],
  portree: ["highlands"],
  inverness: ["highlands"],
  amsterdam: ["amsterdam"],
  paris: ["paris"],
  lisboa: ["lisboa"],
  porto: ["porto"],
  estrasburgo: ["estrasburgo"],
  colmar: ["colmar"],
  friburgo: ["friburgo"],
  interlaken: ["interlaken"],
  grindelwald: ["grindelwald", "interlaken"],
  lauterbrunnen: ["lauterbrunnen", "interlaken"],
  innsbruck: ["innsbruck"],
  viena: ["viena"],
  praga: ["praga"],
  cracovia: ["cracovia"],
  budapest: ["budapest"],
  liubliana: ["liubliana"],
  florencia: ["florencia"],
  roma: ["roma"],
  napoles: ["napoles", "costa-amalfitana"],
  puglia: ["puglia", "sur-de-italia"],
  calabria: ["calabria", "sur-de-italia"],
  sicilia: ["sicilia", "sur-de-italia"],
  barcelona: ["barcelona"],
  madrid: ["madrid"],
};

/** Stop slug → city group inside its primary guide, for the day a Southern
 *  base stops being tentative and becomes a city stop of its own (a `bari`
 *  stop would map to `"bari"` and surface Bari's docs on the stop card
 *  instead of only Puglia's region-wide ones).
 *
 *  Empty today: the Southern stops *are* the regions, so their card shows
 *  the region docs plus every city group via the guide page. */
export const STOP_TO_GUIDE_CITY: Record<string, string> = {};

/** The city group a stop points at, when its primary guide has one. */
export function guideCityForStop(stopSlug: string): GuideCity | null {
  const citySlug = STOP_TO_GUIDE_CITY[stopSlug];
  if (!citySlug) return null;
  const [primary] = guidesForStop(stopSlug);
  return primary ? getGuideCity(primary, citySlug) : null;
}

export function guidesForStop(stopSlug: string): Guide[] {
  const slugs = STOP_TO_GUIDES[stopSlug] ?? [];
  return slugs
    .map((s) => getGuide(s))
    .filter((g): g is Guide => g !== null);
}

/** Docs shown as quick chips on a stop card. Hides Desvíos cercanos so the
 *  full 7-doc city set fits as a 2×3 grid, and Katia's notes because they are
 *  planning research rather than something to reach for standing in the city.
 *  Both docs stay reachable on /guias. */
export function stopGuideChips(docs: GuideDoc[], cityPrefix?: string): GuideDoc[] {
  return docs.filter(
    (d) => docKind(d.slug, cityPrefix) !== "desvios-cercanos" && !isNotasKatia(d.slug, cityPrefix)
  );
}

/** Inverse of STOP_TO_GUIDES: stops whose primary or secondary guide is `guideSlug`. */
export function stopSlugsForGuide(guideSlug: string): string[] {
  return Object.entries(STOP_TO_GUIDES)
    .filter(([, guides]) => guides.includes(guideSlug))
    .map(([stopSlug]) => stopSlug);
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export interface GuideSearchHit {
  guide: Guide;
  /** Absent when the guide itself (not one of its docs) matched. */
  doc?: GuideDoc;
  /** City group the matched doc lives in, for the result subtitle. */
  city?: GuideCity;
}

/** Diacritic-insensitive search over guide, city, doc and day-trip titles. */
export function searchGuides(query: string, limit = 12): GuideSearchHit[] {
  const needle = normalize(query.trim());
  if (needle.length < 2) return [];

  const hits: GuideSearchHit[] = [];
  for (const guide of getAllGuides()) {
    if (normalize(guide.title).includes(needle)) {
      hits.push({ guide });
    }
    for (const doc of [...guide.docs, ...guide.dayTrips]) {
      if (normalize(doc.title).includes(needle)) {
        hits.push({ guide, doc });
      }
    }
    for (const city of guide.cities) {
      const cityMatches = normalize(city.title).includes(needle);
      for (const doc of [...city.docs, ...city.dayTrips]) {
        // A city name matches all of its docs — otherwise "Palermo" would
        // find nothing, since cities have no page of their own.
        if (cityMatches || normalize(doc.title).includes(needle)) {
          hits.push({ guide, doc, city });
        }
      }
    }
    if (hits.length >= limit) break;
  }
  return hits.slice(0, limit);
}
