/**
 * Syncs the trip guide markdown from the local Itinerary folder into the
 * repo at content/guides/, and generates content/guides/manifest.json.
 *
 * Usage: npm run guides:sync [-- /path/to/Itinerary]
 * (default source: /Users/brunotamaro/Desktop/Trip/Itinerary, override with
 * the first CLI arg or the ITINERARY_DIR env var)
 *
 * The destination folder is deleted and fully regenerated on every run.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { slugify } from "../src/lib/slug";
import { flattenGuides, guideDocs } from "../src/lib/guide-types";
import type { Guide, GuideCity, GuideCountry, GuideDoc, GuideManifest } from "../src/lib/guide-types";

const SOURCE =
  process.argv[2] ?? process.env.ITINERARY_DIR ?? "/Users/brunotamaro/Desktop/Trip/Itinerary";
const DEST = path.join(process.cwd(), "content", "guides");

/** Dir names skipped anywhere in the tree. */
const EXCLUDED_DIRS = new Set([".git", ".claude", "Pititas"]);
/** Root-level markdown that is tooling noise, not trip content. */
const EXCLUDED_FILES = new Set(["claude.md"]);
/** Trip-wide docs ("El viaje") that reach the app. The Itinerary root doubles
 *  as the planning workspace (checklist de reservas, itinerario general,
 *  README): eso es para *armar* el viaje, no para leerlo en la ruta. Solo pasa
 *  lo consultable en movimiento — filenames del source, no slugs. */
const TRIP_WIDE_FILES = new Set([
  "EURAIL.md",
  "PRESUPUESTO.md",
  "apps_utiles.md",
  "packing_list.md",
]);

const COUNTRY_FLAGS: Record<string, string> = {
  Paises_Bajos: "🇳🇱",
  Francia: "🇫🇷",
  Portugal: "🇵🇹",
  Alemania: "🇩🇪",
  Suiza: "🇨🇭",
  Austria: "🇦🇹",
  Chequia: "🇨🇿",
  Polonia: "🇵🇱",
  Hungria: "🇭🇺",
  Eslovenia: "🇸🇮",
  Italia: "🇮🇹",
  España: "🇪🇸",
};

interface CountryPart {
  /** Section name shown in /guias (the slug is derived from it). */
  name: string;
  flag: string;
  /** Guide folders (exact dir names) that belong to this part. */
  guides: string[];
  /** Loose country docs (exact filenames) exclusive to this part. Files no
   *  part claims are shared: they get copied into every part. */
  docs?: string[];
}

/** Source country folders that render as more than one section in /guias.
 *  `01_Reino_Unido` is a single folder in the Itinerary, but Inglaterra and
 *  Escocia are separate nations with separate flags — and /guias is the one
 *  screen that shows a flag per section, so the UK flag was wrong on both.
 *  Unclaimed loose docs are duplicated into each part on purpose:
 *  `frases_utiles.md` is the same English either side of the border. */
const COUNTRY_SPLITS: Record<string, CountryPart[]> = {
  Reino_Unido: [
    {
      name: "Inglaterra",
      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      guides: ["Londres", "York"],
      docs: ["costumbres_inglaterra.md"],
    },
    {
      name: "Escocia",
      flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      guides: ["Edimburgo", "Highlands"],
      docs: ["costumbres_escocia.md"],
    },
  ],
};

/** Canonical order of the standard per-city docs; extras follow alphabetically. */
const DOC_ORDER = [
  "actividades",
  "nightlife",
  "gastronomia",
  "alojamiento",
  "transporte",
  "desvios_cercanos",
  "contexto_historico",
];

/** Docs that always sort last, after the standard set *and* after any extra.
 *  Katia's raw notes are a companion to the curated docs, not one of them. */
const TRAILING_DOCS = new Set(["notas_katia"]);

/** Nested region container treated as a group of guides, not a guide itself. */
const REGION_CONTAINERS = new Set(["Sur de Italia"]);

/** Filenames that carry the country in the name (`costumbres_escocia`) folded
 *  onto the bare kind. Inside its own country section the qualifier is noise —
 *  and after the Reino Unido split each nation has exactly one Costumbres. */
const DOC_ALIASES: Record<string, string> = {
  costumbres_escocia: "costumbres",
  costumbres_inglaterra: "costumbres",
};

/** Titles for the loose country-level docs. `README.md` is the country's
 *  overview wherever it exists, but its own h1 is a different sentence in
 *  every folder ("Suiza — Región Jungfrau…"), so it's named here instead of
 *  in `PRETTY_NAMES`: a README nested inside a guide (Sur de Italia) keeps
 *  its heading. */
const COUNTRY_DOC_NAMES: Record<string, string> = {
  readme: "Resumen",
};

const PRETTY_NAMES: Record<string, string> = {
  actividades: "Actividades",
  nightlife: "Nightlife",
  gastronomia: "Gastronomía",
  alojamiento: "Alojamiento",
  transporte: "Transporte",
  desvios_cercanos: "Desvíos cercanos",
  contexto_historico: "Contexto histórico",
  // Country-level docs: their h1 repeats the country ("Costumbres en Italia",
  // "Frases Útiles — Chequia (checo)"), which is the section header right
  // above them in /guias. The label only needs the kind.
  costumbres: "Costumbres",
  frases_utiles: "Frases útiles",
  trekkings: "Trekkings",
  // The file's own `# Notas Katia — <destino>` heading repeats the guide name
  // in every chip and breadcrumb; the doc label only needs the kind.
  "notas-katia": "Notas Katia",
};

function isMarkdown(name: string): boolean {
  return name.toLowerCase().endsWith(".md") && !EXCLUDED_FILES.has(name);
}

function listDir(dir: string): { dirs: string[]; files: string[] } {
  const entries = readdirSync(dir);
  const dirs: string[] = [];
  const files: string[] = [];
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) dirs.push(entry);
    else if (isMarkdown(entry)) files.push(entry);
  }
  return { dirs: dirs.sort(), files: files.sort() };
}

/** Human title: first `# ` heading without leading emojis, else prettified filename. */
function titleFor(sourceFile: string, base: string, countryLevel = false): string {
  const known =
    (countryLevel ? COUNTRY_DOC_NAMES[base.toLowerCase()] : undefined) ??
    PRETTY_NAMES[base.toLowerCase()];
  if (known) return known;

  const content = readFileSync(sourceFile, "utf8");
  const heading = content.match(/^#\s+(.+)$/m)?.[1].trim();
  if (heading) {
    const clean = heading.replace(/^[^\p{L}\p{N}]+/u, "").trim();
    if (clean) return clean;
  }
  const pretty = base.replace(/[_-]+/g, " ").trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function docSortKey(slug: string): [number, string] {
  const key = slug.replace(/-/g, "_");
  if (TRAILING_DOCS.has(key)) return [DOC_ORDER.length + 1, slug];
  const idx = DOC_ORDER.indexOf(key);
  return [idx === -1 ? DOC_ORDER.length : idx, slug];
}

/** Copies one markdown file into DEST and returns its manifest entry.
 *  `slugPrefix` namespaces city docs so `/guias/sicilia/palermo-transporte`
 *  can't collide with the region-level `/guias/sicilia/transporte`. */
function copyDoc(
  sourceFile: string,
  destRelDir: string,
  opts: { titleOverride?: string; slugPrefix?: string; countryLevel?: boolean } = {}
): GuideDoc {
  const rawBase = path.basename(sourceFile, ".md");
  const base = DOC_ALIASES[rawBase.toLowerCase()] ?? rawBase;
  const baseSlug = slugify(base);
  const relFile = path.posix.join(destRelDir, `${baseSlug}.md`);
  const destFile = path.join(DEST, relFile);
  mkdirSync(path.dirname(destFile), { recursive: true });
  cpSync(sourceFile, destFile);
  return {
    slug: opts.slugPrefix ? `${opts.slugPrefix}-${baseSlug}` : baseSlug,
    title: opts.titleOverride ?? titleFor(sourceFile, base, opts.countryLevel),
    file: relFile,
  };
}

/** Moves TRAILING_DOCS to the end while leaving every other doc where it was.
 *  Country-level and region-container docs keep their plain alphabetical order
 *  (they're a grab bag, not the canonical seven), so they can't go through
 *  `sortDocs` — but Katia's notes still have to land last. */
function trailingLast(docs: GuideDoc[]): GuideDoc[] {
  const isTrailing = (d: GuideDoc) => TRAILING_DOCS.has(d.slug.replace(/-/g, "_"));
  return [...docs.filter((d) => !isTrailing(d)), ...docs.filter(isTrailing)];
}

function sortDocs(docs: GuideDoc[], slugPrefix = ""): GuideDoc[] {
  const strip = (slug: string) => (slugPrefix ? slug.slice(slugPrefix.length + 1) : slug);
  return docs.sort((a, b) => {
    const [ka, sa] = docSortKey(strip(a.slug));
    const [kb, sb] = docSortKey(strip(b.slug));
    return ka - kb || sa.localeCompare(sb);
  });
}

/** Copies the `Day_trips/` folder of a city or region, if it has one. */
function buildDayTrips(sourceDir: string, destRelDir: string, slugPrefix?: string): GuideDoc[] {
  const { dirs } = listDir(sourceDir);
  const trips: GuideDoc[] = [];
  for (const sub of dirs) {
    if (sub.toLowerCase() !== "day_trips") continue;
    const { files } = listDir(path.join(sourceDir, sub));
    for (const f of files) {
      trips.push(
        copyDoc(path.join(sourceDir, sub, f), path.posix.join(destRelDir, "day-trips"), { slugPrefix })
      );
    }
  }
  return trips.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

/** A subfolder of a guide that isn't `Day_trips/` is a city group: its own
 *  standard docs plus its own day trips, nested under the regional guide. */
function buildCity(sourceDir: string, guideDestRelDir: string): GuideCity | null {
  const dirName = path.basename(sourceDir);
  const citySlug = slugify(dirName);
  const destRelDir = path.posix.join(guideDestRelDir, citySlug);
  const { files } = listDir(sourceDir);

  const docs = sortDocs(
    files.map((f) => copyDoc(path.join(sourceDir, f), destRelDir, { slugPrefix: citySlug })),
    citySlug
  );
  const dayTrips = buildDayTrips(sourceDir, destRelDir, citySlug);

  // Never invent content for an empty folder (e.g. a city stub in Itinerary).
  if (docs.length === 0 && dayTrips.length === 0) return null;
  return { slug: citySlug, title: dirName, docs, dayTrips };
}

function buildGuide(
  sourceDir: string,
  country: { name: string; flag: string; slug: string },
  opts: { parentSlug?: string } = {}
): Guide {
  const dirName = path.basename(sourceDir);
  const guideSlug = slugify(dirName);
  // Dest stays country/guide (not nested under the container) so /guias/[slug]
  // file paths stay stable when a guide moves in/out of a REGION_CONTAINER.
  const destRelDir = path.posix.join(country.slug, guideSlug);
  const { dirs, files } = listDir(sourceDir);

  const docs = sortDocs(files.map((f) => copyDoc(path.join(sourceDir, f), destRelDir)));
  const dayTrips = buildDayTrips(sourceDir, destRelDir);

  const cities: GuideCity[] = [];
  for (const sub of dirs) {
    if (sub.toLowerCase() === "day_trips") continue;
    const city = buildCity(path.join(sourceDir, sub), destRelDir);
    if (city) cities.push(city);
  }
  cities.sort((a, b) => a.title.localeCompare(b.title, "es"));

  return {
    slug: guideSlug,
    title: dirName,
    country: country.name,
    countryFlag: country.flag,
    docs,
    dayTrips,
    cities,
    guides: [],
    ...(opts.parentSlug ? { parentSlug: opts.parentSlug } : {}),
  };
}

/** One manifest country: its loose docs plus every guide folder it claims.
 *  Usually one per source folder, but a split country (Reino Unido →
 *  Inglaterra / Escocia) builds one per part out of the same folder. */
function buildCountry(
  countryDir: string,
  part: CountryPart,
  order: number,
  looseFiles: string[],
  exclusiveDocs: Set<string>
): GuideCountry {
  const country: GuideCountry = {
    order,
    slug: slugify(part.name),
    name: part.name,
    flag: part.flag,
    guides: [],
    countryDocs: [],
  };

  for (const f of looseFiles) {
    if (exclusiveDocs.has(f) && !part.docs?.includes(f)) continue;
    country.countryDocs.push(
      copyDoc(path.join(countryDir, f), country.slug, { countryLevel: true })
    );
  }
  country.countryDocs = trailingLast(country.countryDocs);

  for (const cityDir of part.guides) {
    const fullCityDir = path.join(countryDir, cityDir);
    if (REGION_CONTAINERS.has(cityDir)) {
      // Container guide (Sur de Italia): decision docs at the root, and each
      // subfolder is a nested guide (Sicilia, Puglia, Itinerarios…).
      const { dirs: regionDirs, files: regionFiles } = listDir(fullCityDir);
      const regionSlug = slugify(cityDir);
      const nested = regionDirs
        .map((sub) => buildGuide(path.join(fullCityDir, sub), country, { parentSlug: regionSlug }))
        .sort((a, b) => a.title.localeCompare(b.title, "es"));
      const docs = trailingLast(
        regionFiles.map((f) =>
          copyDoc(path.join(fullCityDir, f), path.posix.join(country.slug, regionSlug))
        )
      );
      country.guides.push({
        slug: regionSlug,
        title: cityDir,
        country: country.name,
        countryFlag: country.flag,
        docs,
        dayTrips: [],
        cities: [],
        guides: nested,
      });
    } else {
      country.guides.push(buildGuide(fullCityDir, country));
    }
  }

  country.guides.sort((a, b) => a.title.localeCompare(b.title, "es"));
  return country;
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });

  const manifest: GuideManifest = {
    countries: [],
    general: [],
    resources: [],
  };

  const { dirs: rootDirs, files: rootFiles } = listDir(SOURCE);

  // ── Trip-wide docs ────────────────────────────────────────────────────────
  for (const f of rootFiles) {
    if (!TRIP_WIDE_FILES.has(f)) continue;
    manifest.general.push(copyDoc(path.join(SOURCE, f), "_general"));
  }
  if (rootDirs.includes("recursos")) {
    const { files } = listDir(path.join(SOURCE, "recursos"));
    for (const f of files) {
      if (!TRIP_WIDE_FILES.has(f)) continue;
      manifest.resources.push(copyDoc(path.join(SOURCE, "recursos", f), "_recursos"));
    }
  }

  // ── Countries ─────────────────────────────────────────────────────────────
  for (const dir of rootDirs) {
    const match = dir.match(/^(\d{2})_(.+)$/);
    if (!match) continue;
    const [, orderStr, rawNameNfd] = match;
    // macOS returns NFD-decomposed names ("España" as "n" + combining tilde)
    const rawName = rawNameNfd.normalize("NFC");
    const countryDir = path.join(SOURCE, dir);
    const { dirs: cityDirs, files: looseFiles } = listDir(countryDir);

    const split = COUNTRY_SPLITS[rawName];
    if (!split && !COUNTRY_FLAGS[rawName]) {
      console.error(`Unknown country (no flag mapped): ${dir}`);
      process.exit(1);
    }
    const parts: CountryPart[] = split ?? [
      {
        name: rawName.replace(/_/g, " "),
        flag: COUNTRY_FLAGS[rawName],
        guides: cityDirs,
        docs: looseFiles,
      },
    ];
    if (split) {
      // A folder silently dropped from every part would vanish from the app.
      const claimed = new Set(split.flatMap((p) => p.guides));
      const orphans = cityDirs.filter((d) => !claimed.has(d));
      if (orphans.length > 0) {
        console.error(`Unassigned guide folders in ${dir}: ${orphans.join(", ")}`);
        process.exit(1);
      }
    }
    // Loose docs no part claims belong to all of them (frases_utiles.md).
    const exclusiveDocs = new Set(parts.flatMap((p) => p.docs ?? []));

    for (const [partIdx, part] of parts.entries()) {
      // Split parts land side by side (10, 11) without colliding with the
      // next country (20): `order` only drives section order in /guias.
      manifest.countries.push(
        buildCountry(countryDir, part, Number(orderStr) * 10 + partIdx, looseFiles, exclusiveDocs)
      );
    }
  }

  manifest.countries.sort((a, b) => a.order - b.order);

  // ── Validation ────────────────────────────────────────────────────────────
  const allGuides = flattenGuides(manifest.countries.flatMap((c) => c.guides));
  const guideSlugs = allGuides.map((g) => g.slug);
  const dupGuides = guideSlugs.filter((s, i) => guideSlugs.indexOf(s) !== i);
  if (dupGuides.length > 0) {
    console.error(`Duplicate guide slugs: ${dupGuides.join(", ")}`);
    process.exit(1);
  }
  // "El viaje" (general + recursos) reads under a single /general/[doc]
  // namespace, so a slug can't repeat across the two lists.
  const tripSlugs = [...manifest.general, ...manifest.resources].map((d) => d.slug);
  const dupTrip = tripSlugs.filter((s, i) => tripSlugs.indexOf(s) !== i);
  if (dupTrip.length > 0) {
    console.error(`Duplicate trip-wide doc slugs: ${dupTrip.join(", ")}`);
    process.exit(1);
  }
  // Doc slugs must be unique across the whole guide (region docs, region day
  // trips and every city's docs share the /guias/[guide]/[doc] namespace).
  for (const g of allGuides) {
    const all = guideDocs(g).map((d) => d.slug);
    const dup = all.filter((s, i) => all.indexOf(s) !== i);
    if (dup.length > 0) {
      console.error(`Duplicate doc slugs in guide "${g.slug}": ${dup.join(", ")}`);
      process.exit(1);
    }
  }
  const totalDocs =
    manifest.general.length +
    manifest.resources.length +
    manifest.countries.reduce(
      (n, c) =>
        n +
        c.countryDocs.length +
        flattenGuides(c.guides).reduce((m, g) => m + guideDocs(g).length, 0),
      0
    );
  const totalCities = allGuides.reduce((n, g) => n + g.cities.length, 0);
  if (manifest.countries.length === 0 || totalDocs === 0) {
    console.error("Manifest is empty — wrong source dir?");
    process.exit(1);
  }

  writeFileSync(path.join(DEST, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Synced ${totalDocs} docs — ${manifest.countries.length} countries, ${guideSlugs.length} guides, ` +
      `${totalCities} nested cities, ${manifest.general.length} general, ` +
      `${manifest.resources.length} resources.`
  );
}

main();
