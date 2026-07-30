import { describe, expect, it } from "vitest";
import { docKind } from "./guide-types";
import { demoDocMarkdown } from "./guides-demo";

/** Every doc kind that exists in content/guides/ today. */
const KINDS = [
  "actividades",
  "nightlife",
  "gastronomia",
  "alojamiento",
  "transporte",
  "desvios-cercanos",
  "contexto-historico",
  "costumbres",
  "frases-utiles",
  "trekkings",
];

describe("docKind", () => {
  it("strips the city prefix from a city doc slug", () => {
    expect(docKind("palermo-transporte", "palermo")).toBe("transporte");
  });

  it("leaves a guide-level slug untouched", () => {
    expect(docKind("transporte")).toBe("transporte");
    expect(docKind("transporte", "palermo")).toBe("transporte");
  });

  it("only strips the prefix when it is followed by a dash", () => {
    // A day trip named after the city itself must not lose its slug
    expect(docKind("bari", "bari")).toBe("bari");
  });
});

describe("demoDocMarkdown", () => {
  it("returns a distinct non-empty template for every known kind", () => {
    const bodies = KINDS.map((docSlug) => demoDocMarkdown({ docSlug, place: "Edimburgo" }));
    for (const body of bodies) {
      expect(body).toContain("Documento de ejemplo");
      expect(body).toMatch(/^## .+$/m);
    }
    expect(new Set(bodies).size).toBe(KINDS.length);
  });

  it("names the place, so the same template reads right in every guide", () => {
    expect(demoDocMarkdown({ docSlug: "transporte", place: "Edimburgo" })).toContain("**Edimburgo**");
    expect(demoDocMarkdown({ docSlug: "transporte", place: "Roma" })).toContain("**Roma**");
  });

  it("gives the same text to the same kind across cities, city prefix included", () => {
    const flat = demoDocMarkdown({ docSlug: "transporte", place: "Palermo" });
    const nested = demoDocMarkdown({
      docSlug: "palermo-transporte",
      cityPrefix: "palermo",
      place: "Palermo",
    });
    expect(nested).toBe(flat);
  });

  it("uses the day trip template regardless of the slug", () => {
    // `place` is where the trip starts from — the guide (or city) it hangs off
    const trip = demoDocMarkdown({ docSlug: "oxford", place: "Londres", isDayTrip: true });
    expect(trip).toContain("el day trip desde **Londres**");
    expect(trip).not.toBe(demoDocMarkdown({ docSlug: "oxford", place: "Londres" }));
  });

  it("resolves a country doc that qualifies its kind in the slug", () => {
    // Reino Unido splits costumbres in two: costumbres-escocia / -inglaterra
    expect(demoDocMarkdown({ docSlug: "costumbres-escocia", place: "Reino Unido" })).toBe(
      demoDocMarkdown({ docSlug: "costumbres", place: "Reino Unido" })
    );
  });

  it("falls back to a generic template for an unknown kind", () => {
    const generic = demoDocMarkdown({ docSlug: "sur-de-italia-opciones", place: "Sur de Italia" });
    expect(generic).toContain("Documento de ejemplo");
    expect(generic).toMatch(/^## .+$/m);
  });
});
