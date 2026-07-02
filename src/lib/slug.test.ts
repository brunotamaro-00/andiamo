import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and strips diacritics", () => {
    expect(slugify("España")).toBe("espana");
    expect(slugify("Nápoles")).toBe("napoles");
  });

  it("handles multi-word names with special characters", () => {
    expect(slugify("Valle del Soča y Triglav")).toBe("valle-del-soca-y-triglav");
    expect(slugify("Interlaken y alrededores")).toBe("interlaken-y-alrededores");
    expect(slugify("Costa Eslovena y Trieste")).toBe("costa-eslovena-y-trieste");
  });

  it("collapses separators and trims edge dashes", () => {
    expect(slugify("  Fort   William ")).toBe("fort-william");
    expect(slugify("desvios_cercanos")).toBe("desvios-cercanos");
    expect(slugify("SUR_DE_ITALIA_OPCIONES")).toBe("sur-de-italia-opciones");
  });

  it("normalizes NFD input the same as NFC", () => {
    expect(slugify("España".normalize("NFD"))).toBe("espana");
  });
});
