import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STOP_TO_GUIDES,
  getAllGuides,
  getDoc,
  getGuide,
  getManifest,
  guidesForStop,
} from "./guides";

/** Every stop slug seeded in prisma/seed.ts. */
const SEEDED_STOP_SLUGS = [
  "londres", "york", "edimburgo", "fort-william", "portree", "inverness",
  "edimburgo-2", "amsterdam", "paris", "lisboa", "porto", "estrasburgo",
  "colmar", "friburgo", "interlaken", "grindelwald", "lauterbrunnen",
  "innsbruck", "viena", "praga", "cracovia", "budapest", "liubliana",
  "florencia", "roma", "napoles", "bari", "catania", "palermo",
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
      const all = [...guide.docs, ...guide.dayTrips].map((d) => d.slug);
      expect(all.length, `guide ${guide.slug} has no docs`).toBeGreaterThan(0);
      expect(new Set(all).size, `duplicate doc slugs in ${guide.slug}`).toBe(all.length);
    }
  });

  it("every manifest file exists on disk", () => {
    const base = path.join(process.cwd(), "content", "guides");
    for (const guide of getAllGuides()) {
      for (const doc of [...guide.docs, ...guide.dayTrips]) {
        expect(existsSync(path.join(base, doc.file)), `missing ${doc.file}`).toBe(true);
      }
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

describe("getDoc", () => {
  it("finds standard docs and day trips", () => {
    expect(getDoc("paris", "actividades")?.isDayTrip).toBe(false);
    expect(getDoc("paris", "versalles")?.isDayTrip).toBe(true);
    expect(getDoc("paris", "no-existe")).toBeNull();
    expect(getDoc("no-existe", "actividades")).toBeNull();
  });

  it("resolves pseudo-guides for general docs and resources", () => {
    expect(getDoc("general", "checklist")).not.toBeNull();
    expect(getDoc("recursos", "packing-list")).not.toBeNull();
  });
});
