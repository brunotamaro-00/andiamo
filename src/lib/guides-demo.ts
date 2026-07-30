/** Placeholder guide content for the public demo (demo.andiamo.lat).
 *
 *  The real corpus in content/guides/ is personal research, so the demo shows
 *  the *structure* instead: same countries, guides, cities, day trips and doc
 *  titles, but every doc renders a short standard template picked by doc kind —
 *  identical for every city, only the place name interpolated. The point is
 *  that a visitor understands what was kept in each file.
 *
 *  Pure module (no fs, no cookies): the guide routes are SSG and must stay so.
 *  Gated by IS_DEMO at the call sites — /guias/[guide]/[doc] and the Spitwise
 *  export, the only two paths that read the markdown. */

import { docKind } from "./guide-types";

interface Template {
  /** Noun phrase completing "esta página tiene …" in the notice line; ends
   *  with the preposition that introduces the place ("de" / "en" / "desde"). */
  lead: string;
  sections: [string, string[]][];
}

const TEMPLATES: Record<string, Template> = {
  actividades: {
    lead: "la lista de qué ver y hacer en",
    sections: [
      ["Imperdibles", ["Los tres o cuatro lugares que justifican la parada.", "Horarios, precio y si conviene sacar entrada online."]],
      ["Si sobra tiempo", ["Museos, barrios y miradores de segunda vuelta."]],
      ["Notas", ["Qué cierra los lunes, qué se llena de gente y a qué hora."]],
    ],
  },
  nightlife: {
    lead: "la guía de salidas de noche en",
    sections: [
      ["Zonas", ["En qué barrios se sale y cuál va con nosotros."]],
      ["Bares", ["Lugares concretos, qué se toma y cuánto sale."]],
      ["Notas", ["Hasta qué hora hay transporte de vuelta."]],
    ],
  },
  gastronomia: {
    lead: "la guía de comida de",
    sections: [
      ["Qué probar", ["Los platos locales que no se comen en otro lado."]],
      ["Dónde", ["Restaurantes y mercados anotados, con rango de precio."]],
      ["Notas", ["Horarios de cocina, reservas y trampas para turistas."]],
    ],
  },
  alojamiento: {
    lead: "las notas de alojamiento en",
    sections: [
      ["Dónde conviene dormir", ["Qué barrio queda bien conectado y por qué."]],
      ["Opciones", ["Las alternativas comparadas antes de reservar."]],
      ["Notas", ["Check-in, depósitos de valijas y traslado desde la estación."]],
    ],
  },
  transporte: {
    lead: "la guía de transporte de",
    sections: [
      ["Llegada", ["Cómo se entra a la ciudad y desde dónde."]],
      ["Moverse", ["Transporte urbano, abonos y qué conviene caminar."]],
      ["Salida", ["La conexión hacia la próxima parada."]],
    ],
  },
  "desvios-cercanos": {
    lead: "las escapadas cerca de",
    sections: [
      ["Opciones", ["Pueblos y paisajes a menos de un par de horas."]],
      ["Cómo llegar", ["Tren o bus, duración y frecuencia."]],
      ["Notas", ["Cuál vale un día entero y cuál media mañana."]],
    ],
  },
  "contexto-historico": {
    lead: "el contexto histórico de",
    sections: [
      ["La línea de tiempo", ["De la fundación a hoy, en los hitos que se ven caminando."]],
      ["Por qué importa", ["Qué explica la forma de la ciudad y sus edificios."]],
      ["Para leer antes", ["Libros, películas y museos que ordenan el resto."]],
    ],
  },
  costumbres: {
    lead: "las costumbres locales de",
    sections: [
      ["Del día a día", ["Horarios de comida, propinas y formas de saludar."]],
      ["Qué no hacer", ["Los detalles que delatan al turista despistado."]],
      ["Notas", ["Feriados y días en que cierra todo."]],
    ],
  },
  "frases-utiles": {
    lead: "las frases útiles de",
    sections: [
      ["Lo básico", ["Saludos, por favor y gracias, con la pronunciación."]],
      ["En el restaurante", ["Pedir, preguntar el precio y pagar."]],
      ["Emergencias", ["Farmacia, médico y pedir ayuda."]],
    ],
  },
  trekkings: {
    lead: "los trekkings de",
    sections: [
      ["Las caminatas", ["Distancia, desnivel y cuántas horas lleva cada una."]],
      ["Cómo llegar", ["Bus o auto hasta el inicio del sendero."]],
      ["Notas", ["Temporada, refugios y qué llevar en la mochila."]],
    ],
  },
};

const DAY_TRIP: Template = {
  lead: "el day trip desde",
  sections: [
    ["El plan", ["Cuánto lleva ir y volver, y a qué hora conviene salir."]],
    ["Qué ver", ["Los dos o tres puntos que hacen que valga el viaje."]],
    ["Notas", ["Tickets, última vuelta y qué comer en el camino."]],
  ],
};

const GENERIC: Template = {
  lead: "el documento completo de",
  sections: [
    ["Qué guardábamos acá", ["Notas, links y decisiones tomadas sobre este tema."]],
    ["Notas", ["Lo que había que tener a mano el día de la visita."]],
  ],
};

/** Some country-level docs qualify the kind in their own slug
 *  (`costumbres-escocia`, `costumbres-inglaterra` under Reino Unido), so an
 *  exact hit isn't enough — fall back to the kind the slug starts with. */
function templateFor(kind: string): Template {
  const exact = TEMPLATES[kind];
  if (exact) return exact;
  const prefixed = Object.keys(TEMPLATES).find((k) => kind.startsWith(`${k}-`));
  return prefixed ? TEMPLATES[prefixed] : GENERIC;
}

export interface DemoDocInput {
  /** Doc slug as it appears in the manifest (may carry the city prefix). */
  docSlug: string;
  /** City slug when the doc lives in a city group of a regional guide. */
  cityPrefix?: string;
  /** Place the doc talks about: the city group's title, else the guide's. */
  place: string;
  isDayTrip?: boolean;
}

/** Short standard markdown for a demo guide doc. Same text for every place —
 *  only `place` changes — so the demo reads as a structure, not as content. */
export function demoDocMarkdown({
  docSlug,
  cityPrefix,
  place,
  isDayTrip = false,
}: DemoDocInput): string {
  const template = isDayTrip ? DAY_TRIP : templateFor(docKind(docSlug, cityPrefix));

  const body = template.sections
    .map(([heading, bullets]) => `## ${heading}\n${bullets.map((b) => `- ${b}`).join("\n")}`)
    .join("\n\n");

  return `> Documento de ejemplo. En la app real esta página tiene ${template.lead} **${place}**.\n\n${body}\n`;
}
