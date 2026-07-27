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
import { guideDocs } from "../src/lib/guide-types";
import type { Guide, GuideCity, GuideCountry, GuideDoc, GuideManifest } from "../src/lib/guide-types";

const SOURCE =
  process.argv[2] ?? process.env.ITINERARY_DIR ?? "/Users/brunotamaro/Desktop/Trip/Itinerary";
const DEST = path.join(process.cwd(), "content", "guides");

/** Dir names skipped anywhere in the tree. */
const EXCLUDED_DIRS = new Set([".git", ".claude", "Pititas"]);
/** Root-level markdown that is tooling noise, not trip content. */
const EXCLUDED_FILES = new Set(["claude.md"]);

const COUNTRY_FLAGS: Record<string, string> = {
  Reino_Unido: "🇬🇧",
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

/** Nested region container treated as a group of guides, not a guide itself. */
const REGION_CONTAINERS = new Set(["Sur de Italia"]);

const PRETTY_NAMES: Record<string, string> = {
  actividades: "Actividades",
  nightlife: "Nightlife",
  gastronomia: "Gastronomía",
  alojamiento: "Alojamiento",
  transporte: "Transporte",
  desvios_cercanos: "Desvíos cercanos",
  contexto_historico: "Contexto histórico",
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
function titleFor(sourceFile: string): string {
  const base = path.basename(sourceFile, ".md");
  const known = PRETTY_NAMES[base.toLowerCase()];
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
  const idx = DOC_ORDER.indexOf(slug.replace(/-/g, "_"));
  return [idx === -1 ? DOC_ORDER.length : idx, slug];
}

/** Copies one markdown file into DEST and returns its manifest entry.
 *  `slugPrefix` namespaces city docs so `/guias/sicilia/palermo-transporte`
 *  can't collide with the region-level `/guias/sicilia/transporte`. */
function copyDoc(
  sourceFile: string,
  destRelDir: string,
  opts: { titleOverride?: string; slugPrefix?: string } = {}
): GuideDoc {
  const baseSlug = slugify(path.basename(sourceFile, ".md"));
  const relFile = path.posix.join(destRelDir, `${baseSlug}.md`);
  const destFile = path.join(DEST, relFile);
  mkdirSync(path.dirname(destFile), { recursive: true });
  cpSync(sourceFile, destFile);
  return {
    slug: opts.slugPrefix ? `${opts.slugPrefix}-${baseSlug}` : baseSlug,
    title: opts.titleOverride ?? titleFor(sourceFile),
    file: relFile,
  };
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

function buildGuide(sourceDir: string, country: { name: string; flag: string; slug: string }): Guide {
  const dirName = path.basename(sourceDir);
  const guideSlug = slugify(dirName);
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
  };
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
    const override = f === "README.md" ? "Resumen del viaje" : undefined;
    manifest.general.push(copyDoc(path.join(SOURCE, f), "_general", { titleOverride: override }));
  }
  if (rootDirs.includes("recursos")) {
    const { files } = listDir(path.join(SOURCE, "recursos"));
    for (const f of files) {
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
    const flag = COUNTRY_FLAGS[rawName];
    if (!flag) {
      console.error(`Unknown country (no flag mapped): ${dir}`);
      process.exit(1);
    }
    const country: GuideCountry = {
      order: Number(orderStr),
      slug: slugify(rawName),
      name: rawName.replace(/_/g, " "),
      flag,
      guides: [],
      countryDocs: [],
    };
    const countryDir = path.join(SOURCE, dir);
    const { dirs: cityDirs, files: looseFiles } = listDir(countryDir);

    for (const f of looseFiles) {
      country.countryDocs.push(copyDoc(path.join(countryDir, f), country.slug));
    }

    for (const cityDir of cityDirs) {
      const fullCityDir = path.join(countryDir, cityDir);
      if (REGION_CONTAINERS.has(cityDir)) {
        // Its subfolders are guides; its loose .md files form a guide of their own.
        const { dirs: regionDirs, files: regionFiles } = listDir(fullCityDir);
        for (const sub of regionDirs) {
          country.guides.push(buildGuide(path.join(fullCityDir, sub), country));
        }
        if (regionFiles.length > 0) {
          // Decision hub only (README + opciones) — no cities, no day trips.
          const regionSlug = slugify(cityDir);
          const docs = regionFiles.map((f) =>
            copyDoc(path.join(fullCityDir, f), path.posix.join(country.slug, regionSlug))
          );
          country.guides.push({
            slug: regionSlug,
            title: cityDir,
            country: country.name,
            countryFlag: country.flag,
            docs,
            dayTrips: [],
            cities: [],
          });
        }
      } else {
        country.guides.push(buildGuide(fullCityDir, country));
      }
    }

    country.guides.sort((a, b) => a.title.localeCompare(b.title, "es"));
    manifest.countries.push(country);
  }

  manifest.countries.sort((a, b) => a.order - b.order);

  // ── Validation ────────────────────────────────────────────────────────────
  const guideSlugs = manifest.countries.flatMap((c) => c.guides.map((g) => g.slug));
  const dupGuides = guideSlugs.filter((s, i) => guideSlugs.indexOf(s) !== i);
  if (dupGuides.length > 0) {
    console.error(`Duplicate guide slugs: ${dupGuides.join(", ")}`);
    process.exit(1);
  }
  // Doc slugs must be unique across the whole guide (region docs, region day
  // trips and every city's docs share the /guias/[guide]/[doc] namespace).
  for (const c of manifest.countries) {
    for (const g of c.guides) {
      const all = guideDocs(g).map((d) => d.slug);
      const dup = all.filter((s, i) => all.indexOf(s) !== i);
      if (dup.length > 0) {
        console.error(`Duplicate doc slugs in guide "${g.slug}": ${dup.join(", ")}`);
        process.exit(1);
      }
    }
  }
  const totalDocs =
    manifest.general.length +
    manifest.resources.length +
    manifest.countries.reduce(
      (n, c) => n + c.countryDocs.length + c.guides.reduce((m, g) => m + guideDocs(g).length, 0),
      0
    );
  const totalCities = manifest.countries.reduce(
    (n, c) => n + c.guides.reduce((m, g) => m + g.cities.length, 0),
    0
  );
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
