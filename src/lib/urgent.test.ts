import { describe, expect, it } from "vitest";
import { extractUrgentSection } from "./urgent";

const DOC = `# 🗼 Actividades

Intro.

## 🚨 RESERVAS URGENTES — Hacer YA

- **Torre Eiffel** — tickets con slot \`https://example.com\`
- **Louvre** — reservar online

---

## 🏛️ Monumentos

- Otra cosa
`;

describe("extractUrgentSection", () => {
  it("extracts heading and body up to the next section", () => {
    const section = extractUrgentSection(DOC);
    expect(section?.heading).toBe("RESERVAS URGENTES — Hacer YA");
    expect(section?.body).toContain("Torre Eiffel");
    expect(section?.body).toContain("Louvre");
    expect(section?.body).not.toContain("Monumentos");
    expect(section?.body).not.toContain("Otra cosa");
    expect(section?.body.endsWith("---")).toBe(false);
  });

  it("matches heading variants from the corpus", () => {
    for (const heading of [
      "## 🚨 RESERVAS IMPORTANTES",
      "## ⚠️ Reservas y Fechas Clave",
      "## Reservas obligatorias (resumen)",
      "### Reservas anticipadas",
      "## 3 a 6 Meses Antes (Reservas Críticas)",
    ]) {
      const section = extractUrgentSection(`${heading}\n\n- item\n`);
      expect(section, heading).not.toBeNull();
      expect(section?.body).toBe("- item");
    }
  });

  it("ignores unrelated headings and empty sections", () => {
    expect(extractUrgentSection("## Comida y Reservas\n\n- x\n")).toBeNull();
    expect(extractUrgentSection("## ✅ Reserva confirmada\n\n- x\n")).toBeNull();
    expect(extractUrgentSection("# Sin secciones\n\ntexto\n")).toBeNull();
    expect(extractUrgentSection("## RESERVAS URGENTES\n\n## Siguiente\n")).toBeNull();
  });

  it("keeps subsections of a lower level inside the body", () => {
    const doc = "## Reservas urgentes\n\n### Sub\n\n- item\n\n## Otra\n";
    const section = extractUrgentSection(doc);
    expect(section?.body).toContain("### Sub");
    expect(section?.body).not.toContain("## Otra");
  });
});
