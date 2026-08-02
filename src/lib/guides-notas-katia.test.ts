import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllGuides, getManifest, guideDocs, isNotasKatia, stopGuideChips } from "./guides";
import type { Guide, GuideDoc, GuideManifest } from "./guides";

/** Every notas-katia doc reachable in a manifest, guides and countries alike. */
function notasKatiaDocs(manifest: GuideManifest): GuideDoc[] {
  const fromGuide = (g: Guide): GuideDoc[] => [
    ...guideDocs(g).filter((d) => isNotasKatia(d.slug)),
    ...g.guides.flatMap(fromGuide),
  ];
  return manifest.countries.flatMap((c) => [
    ...c.countryDocs.filter((d) => isNotasKatia(d.slug)),
    ...c.guides.flatMap(fromGuide),
  ]);
}

describe("notas de Katia", () => {
  it("reaches the app as guide docs whose markdown exists on disk", () => {
    const docs = notasKatiaDocs(getManifest());
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(doc.title).toBe("Notas Katia");
      expect(existsSync(path.join(process.cwd(), "content", "guides", doc.file))).toBe(true);
    }
  });

  it("sorts last inside its guide, after the standard docs", () => {
    for (const guide of getAllGuides()) {
      const docs = guide.docs;
      const idx = docs.findIndex((d) => isNotasKatia(d.slug));
      if (idx === -1) continue;
      expect(idx).toBe(docs.length - 1);
    }
  });

  it("never becomes a chip on a stop card", () => {
    const docs: GuideDoc[] = [
      { slug: "actividades", title: "Actividades", file: "x/actividades.md" },
      { slug: "notas-katia", title: "Notas Katia", file: "x/notas-katia.md" },
    ];
    expect(stopGuideChips(docs).map((d) => d.slug)).toEqual(["actividades"]);
  });

  it("never becomes a chip on a stop card for a city group either", () => {
    const docs: GuideDoc[] = [
      { slug: "palermo-transporte", title: "Transporte", file: "x/palermo/transporte.md" },
      { slug: "palermo-notas-katia", title: "Notas Katia", file: "x/palermo/notas-katia.md" },
    ];
    expect(stopGuideChips(docs, "palermo").map((d) => d.slug)).toEqual(["palermo-transporte"]);
  });

  it("is absent from every real guide's stop chips", () => {
    for (const guide of getAllGuides()) {
      const chips = stopGuideChips(guide.docs);
      expect(chips.some((d) => isNotasKatia(d.slug))).toBe(false);
      for (const city of guide.cities) {
        expect(stopGuideChips(city.docs, city.slug).some((d) => isNotasKatia(d.slug, city.slug))).toBe(
          false
        );
      }
    }
  });
});

describe("notas de Katia en el demo", () => {
  // doUnmock (not unmock) because these mocks are registered at run time with
  // doMock — the hoisted variants would fire before any test does.
  afterEach(() => {
    vi.doUnmock("./demo");
    vi.resetModules();
  });

  it("disappears from the manifest entirely — no route, no placeholder", async () => {
    vi.resetModules();
    vi.doMock("./demo", () => ({ IS_DEMO: true, DEMO_URL: "https://demo.andiamo.lat" }));
    const demoGuides = await import("./guides");

    expect(notasKatiaDocs(demoGuides.getManifest())).toEqual([]);
    // The doc routes are built from getAllGuides(); an empty list means a
    // /guias/<guide>/notas-katia request 404s instead of rendering a template.
    for (const guide of demoGuides.getAllGuides()) {
      expect(demoGuides.guideDocs(guide).some((d) => demoGuides.isNotasKatia(d.slug))).toBe(false);
      expect(demoGuides.getDoc(guide.slug, "notas-katia")).toBeNull();
    }
    // The rest of the corpus survives: the demo still shows the structure.
    expect(demoGuides.getAllGuides().length).toBeGreaterThan(0);
    expect(demoGuides.getAllGuides().some((g) => g.docs.length > 0)).toBe(true);
  });

  it("is not found by demo search", async () => {
    vi.resetModules();
    vi.doMock("./demo", () => ({ IS_DEMO: true, DEMO_URL: "https://demo.andiamo.lat" }));
    const demoGuides = await import("./guides");

    expect(demoGuides.searchGuides("Notas Katia")).toEqual([]);
    expect(demoGuides.searchGuides("katia")).toEqual([]);
  });
});
