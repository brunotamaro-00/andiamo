import { describe, expect, it } from "vitest";
import { buildGuidesExport } from "./guides-export";
import { getManifest, STOP_TO_GUIDES } from "./guides";

describe("buildGuidesExport", () => {
  it("exports every manifest doc with its markdown", async () => {
    const exp = await buildGuidesExport();
    const manifest = getManifest();
    const expected =
      manifest.countries.reduce(
        (n, c) =>
          n +
          c.countryDocs.length +
          c.guides.reduce((m, g) => m + g.docs.length + g.dayTrips.length, 0),
        0,
      ) +
      manifest.general.length +
      manifest.resources.length;
    expect(exp.docs.length).toBe(expected);
    for (const doc of exp.docs.slice(0, 5)) {
      expect(doc.content.length).toBeGreaterThan(0);
    }
  });

  it("classifies kinds and keeps the stop map", async () => {
    const exp = await buildGuidesExport();
    const kinds = new Set(exp.docs.map((d) => d.kind));
    expect(kinds.has("city")).toBe(true);
    expect(kinds.has("daytrip")).toBe(true);
    expect(kinds.has("general")).toBe(true);
    expect(kinds.has("resource")).toBe(true);
    const general = exp.docs.find((d) => d.kind === "general");
    expect(general?.guideSlug).toBe("general");
    expect(exp.stopToGuides).toEqual(STOP_TO_GUIDES);
  });

  it("has a stable non-empty version hash", async () => {
    const exp = await buildGuidesExport();
    expect(exp.version).toMatch(/^[0-9a-f]{64}$/);
    const again = await buildGuidesExport();
    expect(again.version).toBe(exp.version);
  });
});
