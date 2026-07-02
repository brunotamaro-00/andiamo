/** Extracts the "reservas urgentes/importantes/obligatorias" section from a
 *  guide markdown document. The corpus is heterogeneous — headings range from
 *  "🚨 RESERVAS URGENTES — Hacer YA" to "⚠️ Reservas y Fechas Clave" — so the
 *  matcher keys on "reserva" plus an urgency word in a level 2-4 heading. */

const URGENT_HEADING = /reservas?\b.*\b(urgentes?|importantes?|obligatorias?|anticipadas?|cr[ií]ticas?)\b|reservas y fechas clave/i;

export interface UrgentSection {
  /** Heading text without the leading #s and emojis */
  heading: string;
  /** Markdown body of the section (up to the next same-or-higher heading) */
  body: string;
}

export function extractUrgentSection(markdown: string): UrgentSection | null {
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{2,4})\s+(.*)$/);
    if (!match || !URGENT_HEADING.test(match[2])) continue;

    const level = match[1].length;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].match(/^(#{1,6})\s/);
      if (next && next[1].length <= level) break;
      body.push(lines[j]);
    }

    // Trim blank lines and a trailing horizontal rule
    while (body.length > 0 && body[body.length - 1].trim().match(/^(-{3,})?$/)) body.pop();
    while (body.length > 0 && body[0].trim() === "") body.shift();
    if (body.length === 0) return null;

    const heading = match[2].replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return { heading, body: body.join("\n") };
  }

  return null;
}
