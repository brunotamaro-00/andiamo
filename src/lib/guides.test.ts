import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STOP_TO_GUIDE_CITY,
  STOP_TO_GUIDES,
  getAllGuides,
  getDoc,
  getGuide,
  getManifest,
  getRoutedGuides,
  getTripDoc,
  getTripDocs,
  guideCityForStop,
  guideDocHref,
  guideDocs,
  guidesForStop,
  searchGuides,
} from "./guides";

/** Every stop slug seeded in prisma/seed.ts. */
const SEEDED_STOP_SLUGS = [
  "londres", "york", "edimburgo", "fort-william", "portree", "inverness",
  "edimburgo-2", "amsterdam", "paris", "lisboa", "porto", "estrasburgo",
  "colmar", "friburgo", "interlaken", "grindelwald", "lauterbrunnen",
  "innsbruck", "viena", "praga", "cracovia", "budapest", "liubliana",
  "florencia", "roma", "napoles", "puglia", "calabria", "sicilia",
  "barcelona", "madrid",
];

describe("guide manifest", () => {
  it("has countries, general docs and resources", () => {
    const m = getManifest();
    expect(m.countries.length).toBeGreaterThan(0);
    expect(m.general.length).toBeGreaterThan(0);
    expect(m.resources.length).toBeGreaterThan(0);
  });

  it("has globally unique guide slugs", () => {
    const slugs = getAllGuides().map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique doc slugs within each guide and at least one doc per guide", () => {
    for (const guide of getAllGuides()) {
      const all = guideDocs(guide).map((d) => d.slug);
      expect(all.length, `guide ${guide.slug} has no docs`).toBeGreaterThan(0);
      expect(new Set(all).size, `duplicate doc slugs in ${guide.slug}`).toBe(all.length);
    }
  });

  it("every manifest file exists on disk", () => {
    const base = path.join(process.cwd(), "content", "guides");
    for (const guide of getAllGuides()) {
      for (const doc of guideDocs(guide)) {
        expect(existsSync(path.join(base, doc.file)), `missing ${doc.file}`).toBe(true);
      }
    }
  });

  it("never emits an empty city group", () => {
    for (const guide of getAllGuides()) {
      for (const city of guide.cities) {
        expect(
          city.docs.length + city.dayTrips.length,
          `empty city ${guide.slug}/${city.slug}`
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("regional guides (Sur de Italia)", () => {
  it("nests southern regions and itinerarios under the Sur de Italia container", () => {
    const hub = getGuide("sur-de-italia");
    expect(hub?.guides.map((g) => g.slug)).toEqual([
      "calabria",
      "costa-amalfitana",
      "itinerarios",
      "puglia",
      "sicilia",
    ]);
    // Italy's top-level list is only the four city/container guides
    const italia = getManifest().countries.find((c) => c.slug === "italia");
    expect(italia?.guides.map((g) => g.slug)).toEqual([
      "florencia",
      "napoles",
      "roma",
      "sur-de-italia",
    ]);
  });

  it("keeps the southern regions as guides with nested cities", () => {
    for (const [region, cities] of [
      ["sicilia", ["agrigento", "catania", "noto", "palermo", "ragusa", "siracusa"]],
      ["puglia", ["bari", "lecce", "matera", "ostuni"]],
      ["calabria", ["reggio-calabria", "scilla", "tropea"]],
    ] as const) {
      const guide = getGuide(region);
      expect(guide, `missing regional guide ${region}`).not.toBeNull();
      expect(guide!.parentSlug).toBe("sur-de-italia");
      expect(guide!.cities.map((c) => c.slug)).toEqual([...cities]);
      // Region-wide docs live at the root of the guide, not duplicated per city
      expect(guide!.docs.map((d) => d.slug)).toContain("transporte");
    }
  });

  it("gives each regional stop its own guide plus the decision hub", () => {
    for (const region of ["puglia", "calabria", "sicilia"]) {
      expect(guidesForStop(region).map((g) => g.slug)).toEqual([region, "sur-de-italia"]);
    }
  });

  it("keeps sur-de-italia as a decision hub with no cities", () => {
    const hub = getGuide("sur-de-italia");
    expect(hub?.cities).toEqual([]);
    expect(hub!.docs.length).toBeGreaterThan(0);
  });

  it("keeps Costa Amalfitana nested under Sur de Italia and linked from Nápoles", () => {
    expect(STOP_TO_GUIDES.napoles).toEqual(["napoles", "costa-amalfitana"]);
    const amalfi = getGuide("costa-amalfitana");
    expect(amalfi?.parentSlug).toBe("sur-de-italia");
    expect(amalfi?.cities.map((c) => c.slug)).toEqual(["amalfi", "sorrento"]);
    // Nápoles itself is not part of the Sur de Italia container
    expect(getGuide("napoles")?.cities).toEqual([]);
    expect(getGuide("napoles")?.parentSlug).toBeUndefined();
  });

  it("namespaces city doc slugs so they don't collide with region docs", () => {
    const sicilia = getGuide("sicilia")!;
    const palermo = sicilia.cities.find((c) => c.slug === "palermo")!;
    expect(palermo.docs.map((d) => d.slug)).toContain("palermo-transporte");
    expect(getDoc("sicilia", "transporte")?.city).toBeUndefined();
    expect(getDoc("sicilia", "palermo-transporte")?.city?.slug).toBe("palermo");
  });

  it("resolves a city day trip and marks it as one", () => {
    const hit = getDoc("sicilia", "catania-etna");
    expect(hit?.isDayTrip).toBe(true);
    expect(hit?.city?.title).toBe("Catania");
  });
});

describe("STOP_TO_GUIDE_CITY", () => {
  it("only names cities that exist in the stop's primary guide", () => {
    for (const stopSlug of Object.keys(STOP_TO_GUIDE_CITY)) {
      expect(STOP_TO_GUIDES[stopSlug], `${stopSlug} has no guide`).toBeDefined();
      expect(guideCityForStop(stopSlug), `${stopSlug} → unknown city group`).not.toBeNull();
    }
  });

  it("leaves regional stops without a city, so they show the whole region", () => {
    for (const stopSlug of ["puglia", "calabria", "sicilia"]) {
      expect(guideCityForStop(stopSlug)).toBeNull();
      expect(guidesForStop(stopSlug)[0]?.cities.length).toBeGreaterThan(0);
    }
  });
});

describe("STOP_TO_GUIDES", () => {
  it("covers every seeded stop slug", () => {
    for (const slug of SEEDED_STOP_SLUGS) {
      expect(STOP_TO_GUIDES[slug], `stop ${slug} has no guide mapping`).toBeDefined();
    }
  });

  it("only references guide slugs that exist in the manifest", () => {
    for (const [stop, guides] of Object.entries(STOP_TO_GUIDES)) {
      for (const guideSlug of guides) {
        expect(getGuide(guideSlug), `stop ${stop} → missing guide ${guideSlug}`).not.toBeNull();
      }
    }
  });

  it("resolves guides for a shared-guide stop", () => {
    const guides = guidesForStop("fort-william");
    expect(guides.map((g) => g.slug)).toEqual(["highlands"]);
  });
});

describe("searchGuides", () => {
  it("matches guide titles ignoring diacritics and case", () => {
    const hits = searchGuides("parís");
    expect(hits.some((h) => h.guide.slug === "paris" && !h.doc)).toBe(true);
  });

  it("matches doc and day-trip titles", () => {
    const hits = searchGuides("versalles");
    expect(hits.some((h) => h.guide.slug === "paris" && h.doc?.slug === "versalles")).toBe(true);
  });

  it("requires at least 2 characters and respects the limit", () => {
    expect(searchGuides("p")).toEqual([]);
    expect(searchGuides("a", 5)).toEqual([]);
    expect(searchGuides("actividades", 5).length).toBeLessThanOrEqual(5);
  });
});

describe("getDoc", () => {
  it("finds standard docs and day trips", () => {
    expect(getDoc("paris", "actividades")?.isDayTrip).toBe(false);
    expect(getDoc("paris", "versalles")?.isDayTrip).toBe(true);
    expect(getDoc("paris", "no-existe")).toBeNull();
    expect(getDoc("no-existe", "actividades")).toBeNull();
  });

  it("resolves pseudo-guides for general docs and resources", () => {
    expect(getDoc("general", "presupuesto")).not.toBeNull();
    expect(getDoc("recursos", "packing-list")).not.toBeNull();
  });
});

describe("trip-wide docs live under /general", () => {
  it("keeps the trip pseudo-guides out of the /guias routes", () => {
    const routed = getRoutedGuides().map((g) => g.slug);
    expect(routed).not.toContain("general");
    expect(routed).not.toContain("recursos");
    expect(routed).toContain("londres");
  });

  it("resolves every trip doc by slug alone", () => {
    const docs = getTripDocs();
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) expect(getTripDoc(doc.slug)?.doc.file).toBe(doc.file);
    expect(getTripDoc("no-existe")).toBeNull();
  });

  it("routes trip docs to /general and guide docs to /guias", () => {
    expect(guideDocHref("general", "eurail")).toBe("/general/eurail");
    expect(guideDocHref("recursos", "packing-list")).toBe("/general/packing-list");
    expect(guideDocHref("paris", "actividades")).toBe("/guias/paris/actividades");
  });
});

describe("country sections", () => {
  it("gives England and Scotland their own section and flag", () => {
    const countries = getManifest().countries;
    const byName = (n: string) => countries.find((c) => c.name === n);
    expect(byName("Reino Unido")).toBeUndefined();
    expect(byName("Inglaterra")?.flag).toBe("\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}");
    expect(byName("Escocia")?.flag).toBe("\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}");
    expect(byName("Inglaterra")?.guides.map((g) => g.slug)).toEqual(["londres", "york"]);
    expect(byName("Escocia")?.guides.map((g) => g.slug)).toEqual(["edimburgo", "highlands"]);
  });

  it("names country docs by kind, without the country", () => {
    for (const country of getManifest().countries) {
      // No "Costumbres en Italia" / "Frases Útiles — Chequia (checo)": the
      // section header right above already says the country.
      for (const doc of country.countryDocs) expect(doc.title).not.toMatch(/ en | — /);
    }
    const uk = getManifest().countries.filter((c) => ["inglaterra", "escocia"].includes(c.slug));
    // Same English either side of the border: the file is copied into both.
    for (const c of uk) {
      expect(c.countryDocs.map((d) => d.slug)).toEqual(["costumbres", "frases-utiles"]);
    }
  });
});
