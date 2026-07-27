/** Bulk export of the guide knowledge base for Spitwise (WhatsApp trip Q&A).
 *  One payload with every doc's markdown: content only changes per deploy,
 *  so a single ~3MB pull is simpler and safer than per-doc fetching. */

import { createHash } from "node:crypto";
import { getManifest, readDocMarkdown, STOP_TO_GUIDES } from "./guides";
import type { GuideDoc } from "./guide-types";

export type ExportDocKind = "city" | "daytrip" | "country" | "general" | "resource";

export interface ExportDoc {
  guideSlug: string;
  guideTitle: string;
  docSlug: string;
  title: string;
  country: string;
  countryFlag: string;
  kind: ExportDocKind;
  /** City group inside a regional guide (Palermo inside Sicilia), when the
   *  doc is scoped to a city rather than the whole region. */
  citySlug?: string;
  cityTitle?: string;
  file: string;
  content: string;
}

export interface GuidesExport {
  version: string;
  stopToGuides: Record<string, string[]>;
  docs: ExportDoc[];
}

interface DocSource {
  guideSlug: string;
  guideTitle: string;
  country: string;
  countryFlag: string;
  kind: ExportDocKind;
  citySlug?: string;
  cityTitle?: string;
  doc: GuideDoc;
}

function collectSources(): DocSource[] {
  const manifest = getManifest();
  const sources: DocSource[] = [];

  for (const country of manifest.countries) {
    for (const guide of country.guides) {
      const base = {
        guideSlug: guide.slug,
        guideTitle: guide.title,
        country: guide.country,
        countryFlag: guide.countryFlag,
      };
      for (const doc of guide.docs) sources.push({ ...base, kind: "city", doc });
      for (const doc of guide.dayTrips) sources.push({ ...base, kind: "daytrip", doc });
      // Cities nested in a regional guide keep the same kinds — they're still
      // city docs and day trips — but carry the city they belong to.
      for (const city of guide.cities) {
        const inCity = { ...base, citySlug: city.slug, cityTitle: city.title };
        for (const doc of city.docs) sources.push({ ...inCity, kind: "city", doc });
        for (const doc of city.dayTrips) sources.push({ ...inCity, kind: "daytrip", doc });
      }
    }
    // Loose country-level docs are served under a pseudo-guide with the
    // country's slug (mirrors PSEUDO_GUIDES in guides.ts).
    for (const doc of country.countryDocs) {
      sources.push({
        guideSlug: country.slug,
        guideTitle: country.name,
        country: country.name,
        countryFlag: country.flag,
        kind: "country",
        doc,
      });
    }
  }
  for (const doc of manifest.general) {
    sources.push({
      guideSlug: "general",
      guideTitle: "El viaje",
      country: "General",
      countryFlag: "🌍",
      kind: "general",
      doc,
    });
  }
  for (const doc of manifest.resources) {
    sources.push({
      guideSlug: "recursos",
      guideTitle: "Recursos",
      country: "General",
      countryFlag: "🎒",
      kind: "resource",
      doc,
    });
  }
  return sources;
}

let exportCache: Promise<GuidesExport> | null = null;

/** Content is immutable per deploy, so the export is built once per process. */
export function buildGuidesExport(): Promise<GuidesExport> {
  exportCache ??= (async () => {
    const docs: ExportDoc[] = [];
    for (const src of collectSources()) {
      // A manifest entry whose file is missing on disk must not break the export
      const content = await readDocMarkdown(src.doc.file).catch(() => null);
      if (content === null) continue;
      docs.push({
        guideSlug: src.guideSlug,
        guideTitle: src.guideTitle,
        docSlug: src.doc.slug,
        title: src.doc.title,
        country: src.country,
        countryFlag: src.countryFlag,
        kind: src.kind,
        ...(src.citySlug ? { citySlug: src.citySlug, cityTitle: src.cityTitle } : {}),
        file: src.doc.file,
        content,
      });
    }
    docs.sort((a, b) => a.file.localeCompare(b.file));
    const hash = createHash("sha256");
    for (const doc of docs) {
      hash.update(doc.file);
      hash.update("\0");
      hash.update(doc.content);
      hash.update("\0");
    }
    return { version: hash.digest("hex"), stopToGuides: STOP_TO_GUIDES, docs };
  })().catch((err) => {
    // Never cache a rejection — retry the build on the next call
    exportCache = null;
    throw err;
  });
  return exportCache;
}
