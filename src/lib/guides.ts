import { readFile } from "node:fs/promises";
import path from "node:path";
import manifestJson from "../../content/guides/manifest.json";
import type { Guide, GuideDoc, GuideManifest } from "./guide-types";

export type { Guide, GuideCountry, GuideDoc, GuideManifest } from "./guide-types";

const manifest = manifestJson as GuideManifest;

/** Trip-wide docs and resources exposed as pseudo-guides so they share the
 *  /guias/[guide]/[doc] routes. */
const PSEUDO_GUIDES: Guide[] = [
  {
    slug: "general",
    title: "El viaje",
    country: "General",
    countryFlag: "🌍",
    docs: manifest.general,
    dayTrips: [],
  },
  {
    slug: "recursos",
    title: "Recursos",
    country: "General",
    countryFlag: "🎒",
    docs: manifest.resources,
    dayTrips: [],
  },
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
    })),
];

export function getManifest(): GuideManifest {
  return manifest;
}

export function getAllGuides(): Guide[] {
  return [...manifest.countries.flatMap((c) => c.guides), ...PSEUDO_GUIDES];
}

export function getGuide(slug: string): Guide | null {
  return getAllGuides().find((g) => g.slug === slug) ?? null;
}

export function getDoc(
  guideSlug: string,
  docSlug: string
): { guide: Guide; doc: GuideDoc; isDayTrip: boolean } | null {
  const guide = getGuide(guideSlug);
  if (!guide) return null;
  const doc = guide.docs.find((d) => d.slug === docSlug);
  if (doc) return { guide, doc, isDayTrip: false };
  const trip = guide.dayTrips.find((d) => d.slug === docSlug);
  if (trip) return { guide, doc: trip, isDayTrip: true };
  return null;
}

export async function readDocMarkdown(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "content", "guides", file), "utf8");
}

/** Explicit stop-slug → guide-slugs map (first entry is the primary guide).
 *  Needed because stops and guide folders don't align 1:1 — e.g. three
 *  Scotland stops share the Highlands guide. */
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
  bari: ["puglia", "sur-de-italia"],
  catania: ["sicilia", "sur-de-italia"],
  palermo: ["sicilia", "sur-de-italia"],
  barcelona: ["barcelona"],
  madrid: ["madrid"],
};

export function guidesForStop(stopSlug: string): Guide[] {
  const slugs = STOP_TO_GUIDES[stopSlug] ?? [];
  return slugs
    .map((s) => getGuide(s))
    .filter((g): g is Guide => g !== null);
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
}

/** Diacritic-insensitive search over guide, doc and day-trip titles. */
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
    if (hits.length >= limit) break;
  }
  return hits.slice(0, limit);
}
