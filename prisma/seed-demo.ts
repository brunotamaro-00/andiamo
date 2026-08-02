import "dotenv/config";
import { runDummySeed } from "./seed-dummy";

/**
 * seed-demo.ts — dataset del deploy público (demo.andiamo.lat).
 *
 * Mismo motor que `seed-dev.ts`, con cuatro diferencias, todas por ser público:
 *
 *   1. Fechas literales del itinerario, sin rebasear. El deploy congela su "hoy"
 *      en NEXT_PUBLIC_DEMO_TODAY, así que quien abra el link en noviembre ve el
 *      mismo viaje mid-trip que hoy — y Spitwise, que congela el suyo en la misma
 *      fecha, no puede desalinearse.
 *   2. Sin la parada personal ni las candidatas que quedaron en el pasado
 *      respecto del hoy congelado (se verían como un bug).
 *   3. Itinerario sin dueño: los dos viajeros ven exactamente lo mismo. Sin
 *      Pititas, dejar el owner en Lisboa/Porto le abriría a Katia un hueco de 8
 *      noches y cada viewer vería un total distinto al de Spitwise.
 *   4. Vouchers sin los montos de compra reales.
 *   5. `fullPools: true` — cada parada recibe todo su pool de notas/docs
 *      (no un sample al azar), para que Bled/Bovec/Sur no se vean a medias.
 *
 * DESTRUCTIVO. Lo corre el cron nocturno de Railway para limpiar lo que hayan
 * dejado los visitantes. Nunca apuntarlo a la DATABASE_URL de producción.
 */

// `/api/documents/[id]` responde un documento `link` con `Response.redirect`,
// que rechaza URLs relativas — de ahí el origen completo.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://demo.andiamo.lat").replace(/\/$/, "");

/** Con hoy = 2026-09-25, estas tres candidatas quedan en el pasado sin haberse
 *  resuelto nunca. Bled/Bovec/Calabria siguen en el futuro y muestran la
 *  feature de "parada tentativa"; Puglia+Sicilia ya son paradas reales. */
const EXPIRED_CANDIDATES = ["grindelwald", "lauterbrunnen", "innsbruck"];

runDummySeed({
  docUrl: `${SITE}/demo/voucher-demo.pdf`,
  shiftDates: false,
  excludeSlugs: ["pititas", ...EXPIRED_CANDIDATES],
  clearOwners: true,
  fullPools: true,
  globalDocNotes: {
    "Vuelo ida BUE → LHR": "Con millas · confirmado (data ficticia)",
    "Seguro PAX Assistance Long Stay": "Cobertura larga estadía · contratado (ficticio)",
    "Eurail Pass Global": "Activar en la ventana correcta (ficticio)",
    "Vuelo regreso MAD → BUE": "Vuelta desde Madrid · confirmado (ficticio)",
  },
});
