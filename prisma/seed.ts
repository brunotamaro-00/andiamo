import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

interface StopInput {
  country: string;
  countryFlag: string;
  name: string;
  slug: string;
  category: string;
  priceLevel: string;
  arrivalDate: string | null;
  departureDate: string | null;
  nights: number;
  latitude: number;
  longitude: number;
  timezone: string;
  currencyCode: string;
  tempRange: string;
  isCandidate?: boolean;
  /** null = shared (default). A person makes it person-scoped (see Pititas). */
  ownerPerson?: "bruno" | "katia" | null;
  /** Pseudo-city: no flag/sun/weather/currency, excluded from the Spitwise sync. */
  isLocal?: boolean;
}

// NOTE: a stop's order is its position in this array, assigned as `i + 1` in
// main(). Keep the array in itinerary order — there is no `order` field to set.
export const STOPS: StopInput[] = [
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "Londres", slug: "londres",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-05", departureDate: "2026-08-13", nights: 8,
    latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", currencyCode: "GBP", tempRange: "15-23°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "York", slug: "york",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-08-13", departureDate: "2026-08-15", nights: 2,
    latitude: 53.9590, longitude: -1.0815, timezone: "Europe/London", currencyCode: "GBP", tempRange: "13-20°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "Edimburgo", slug: "edimburgo",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-08-15", departureDate: "2026-08-18", nights: 3,
    latitude: 55.9533, longitude: -3.1883, timezone: "Europe/London", currencyCode: "GBP", tempRange: "12-19°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "Fort William", slug: "fort-william",
    category: "Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-08-18", departureDate: "2026-08-20", nights: 2,
    latitude: 56.8198, longitude: -5.1116, timezone: "Europe/London", currencyCode: "GBP", tempRange: "10-18°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "Portree", slug: "portree",
    category: "Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-08-20", departureDate: "2026-08-22", nights: 2,
    latitude: 57.4125, longitude: -6.1960, timezone: "Europe/London", currencyCode: "GBP", tempRange: "11-15°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "Inverness", slug: "inverness",
    category: "Ciudad/Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-08-22", departureDate: "2026-08-24", nights: 2,
    latitude: 57.4778, longitude: -4.2247, timezone: "Europe/London", currencyCode: "GBP", tempRange: "11-19°C",
  },
  {
    country: "Reino Unido", countryFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "Edimburgo (tránsito)", slug: "edimburgo-2",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-08-24", departureDate: "2026-08-25", nights: 1,
    latitude: 55.95206, longitude: -3.19648, timezone: "Europe/London", currencyCode: "GBP", tempRange: "12-19°C",
  },
  {
    country: "Países Bajos", countryFlag: "🇳🇱", name: "Ámsterdam", slug: "amsterdam",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-25", departureDate: "2026-08-29", nights: 4,
    latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam", currencyCode: "EUR", tempRange: "13-21°C",
  },
  {
    country: "Francia", countryFlag: "🇫🇷", name: "París", slug: "paris",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-29", departureDate: "2026-09-04", nights: 6,
    latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", currencyCode: "EUR", tempRange: "16-24°C",
  },
  {
    country: "Portugal", countryFlag: "🇵🇹", name: "Lisboa", slug: "lisboa",
    category: "Ciudad", priceLevel: "$-$$",
    arrivalDate: "2026-09-04", departureDate: "2026-09-09", nights: 5,
    latitude: 38.7223, longitude: -9.1393, timezone: "Europe/Lisbon", currencyCode: "EUR", tempRange: "18-26°C",
    ownerPerson: "bruno",
  },
  {
    country: "Portugal", countryFlag: "🇵🇹", name: "Porto", slug: "porto",
    category: "Ciudad/Costa", priceLevel: "$-$$",
    arrivalDate: "2026-09-09", departureDate: "2026-09-12", nights: 3,
    latitude: 41.1579, longitude: -8.6291, timezone: "Europe/Lisbon", currencyCode: "EUR", tempRange: "15-24°C",
    ownerPerson: "bruno",
  },
  {
    // Pseudo-ciudad: Katia con las amigas (4-11 sept) mientras Bruno está en
    // Portugal. Sin bandera/sol/clima; solo para cargar sus notas y archivos.
    country: "", countryFlag: "👭", name: "Pititas", slug: "pititas",
    category: "Pseudo", priceLevel: "$",
    arrivalDate: "2026-09-04", departureDate: "2026-09-12", nights: 8,
    latitude: 0, longitude: 0, timezone: "Europe/Paris", currencyCode: "EUR", tempRange: "",
    ownerPerson: "katia", isLocal: true,
  },
  {
    country: "Francia", countryFlag: "🇫🇷", name: "Estrasburgo", slug: "estrasburgo",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-12", departureDate: "2026-09-14", nights: 2,
    latitude: 48.5734, longitude: 7.7521, timezone: "Europe/Paris", currencyCode: "EUR", tempRange: "12-20°C",
  },
  {
    country: "Francia", countryFlag: "🇫🇷", name: "Colmar", slug: "colmar",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-14", departureDate: "2026-09-16", nights: 2,
    latitude: 48.0794, longitude: 7.3585, timezone: "Europe/Paris", currencyCode: "EUR", tempRange: "12-20°C",
  },
  {
    country: "Alemania", countryFlag: "🇩🇪", name: "Friburgo", slug: "friburgo",
    category: "Ciudad/Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-09-16", departureDate: "2026-09-19", nights: 3,
    latitude: 47.9990, longitude: 7.8421, timezone: "Europe/Berlin", currencyCode: "EUR", tempRange: "12-20°C",
  },
  {
    country: "Suiza", countryFlag: "🇨🇭", name: "Interlaken", slug: "interlaken",
    category: "Trekking", priceLevel: "$$$",
    arrivalDate: "2026-09-19", departureDate: "2026-09-23", nights: 4,
    latitude: 46.6863, longitude: 7.8632, timezone: "Europe/Zurich", currencyCode: "CHF", tempRange: "8-16°C",
  },
  {
    country: "Suiza", countryFlag: "🇨🇭", name: "Grindelwald", slug: "grindelwald",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-19", departureDate: null, nights: 0,
    latitude: 46.62396, longitude: 8.03601, timezone: "Europe/Zurich", currencyCode: "CHF", tempRange: "4-13°C",
    isCandidate: true,
  },
  {
    country: "Suiza", countryFlag: "🇨🇭", name: "Lauterbrunnen", slug: "lauterbrunnen",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-19", departureDate: null, nights: 0,
    latitude: 46.59307, longitude: 7.90938, timezone: "Europe/Zurich", currencyCode: "CHF", tempRange: "6-15°C",
    isCandidate: true,
  },
  {
    country: "Austria", countryFlag: "🇦🇹", name: "Innsbruck", slug: "innsbruck",
    category: "Tránsito", priceLevel: "$$$",
    arrivalDate: "2026-09-23", departureDate: null, nights: 0,
    latitude: 47.2692, longitude: 11.4041, timezone: "Europe/Vienna", currencyCode: "EUR", tempRange: "7-17°C",
    isCandidate: true,
  },
  {
    country: "Austria", countryFlag: "🇦🇹", name: "Viena", slug: "viena",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-09-23", departureDate: "2026-09-28", nights: 5,
    latitude: 48.2082, longitude: 16.3738, timezone: "Europe/Vienna", currencyCode: "EUR", tempRange: "10-19°C",
  },
  {
    country: "Chequia", countryFlag: "🇨🇿", name: "Praga", slug: "praga",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-28", departureDate: "2026-10-03", nights: 5,
    latitude: 50.0755, longitude: 14.4378, timezone: "Europe/Prague", currencyCode: "CZK", tempRange: "9-18°C",
  },
  {
    country: "Polonia", countryFlag: "🇵🇱", name: "Cracovia", slug: "cracovia",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-03", departureDate: "2026-10-07", nights: 4,
    latitude: 50.0647, longitude: 19.9450, timezone: "Europe/Warsaw", currencyCode: "PLN", tempRange: "7-15°C",
  },
  {
    country: "Hungría", countryFlag: "🇭🇺", name: "Budapest", slug: "budapest",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-07", departureDate: "2026-10-11", nights: 4,
    latitude: 47.4979, longitude: 19.0402, timezone: "Europe/Budapest", currencyCode: "HUF", tempRange: "9-18°C",
  },
  {
    country: "Eslovenia", countryFlag: "🇸🇮", name: "Liubliana", slug: "liubliana",
    category: "Ciudad/Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-10-11", departureDate: "2026-10-15", nights: 4,
    latitude: 46.0569, longitude: 14.5058, timezone: "Europe/Ljubljana", currencyCode: "EUR", tempRange: "7-15°C",
  },
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Florencia", slug: "florencia",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-10-15", departureDate: "2026-10-20", nights: 5,
    latitude: 43.7696, longitude: 11.2558, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "11-20°C",
  },
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Roma", slug: "roma",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-10-20", departureDate: "2026-10-27", nights: 7,
    latitude: 41.9028, longitude: 12.4964, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "12-20°C",
  },
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Nápoles", slug: "napoles",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-27", departureDate: "2026-10-29", nights: 2,
    latitude: 40.8518, longitude: 14.2681, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "14-20°C",
  },
  // Sur de Italia: tres rutas alternativas para noviembre, todas tentativas y
  // en paralelo (isCandidate no consume el cursor del itinerario). La guía de
  // cada una es la región; sus ciudades son grupos internos (ver guides.ts).
  // Coordenadas = ciudad puerta de entrada de cada región.
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Puglia", slug: "puglia",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 3,
    latitude: 41.1171, longitude: 16.8719, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "15-21°C",
    isCandidate: true,
  },
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Calabria", slug: "calabria",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 3,
    latitude: 38.6768, longitude: 15.8977, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "14-20°C",
    isCandidate: true,
  },
  {
    country: "Italia", countryFlag: "🇮🇹", name: "Sicilia", slug: "sicilia",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 3,
    latitude: 38.1157, longitude: 13.3615, timezone: "Europe/Rome", currencyCode: "EUR", tempRange: "18-24°C",
    isCandidate: true,
  },
  {
    country: "España", countryFlag: "🇪🇸", name: "Barcelona", slug: "barcelona",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-11-08", departureDate: "2026-11-13", nights: 5,
    latitude: 41.3851, longitude: 2.1734, timezone: "Europe/Madrid", currencyCode: "EUR", tempRange: "10-17°C",
  },
  {
    country: "España", countryFlag: "🇪🇸", name: "Madrid", slug: "madrid",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-11-13", departureDate: "2026-11-18", nights: 5,
    latitude: 40.4168, longitude: -3.7038, timezone: "Europe/Madrid", currencyCode: "EUR", tempRange: "5-12°C",
  },
];

async function main() {
  console.log("Seeding stops...");

  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const order = i + 1; // order is the array position
    await prisma.stop.upsert({
      where: { slug: stop.slug },
      update: {
        order,
        country: stop.country,
        countryFlag: stop.countryFlag,
        name: stop.name,
        category: stop.category,
        priceLevel: stop.priceLevel,
        arrivalDate: stop.arrivalDate ? new Date(stop.arrivalDate) : null,
        departureDate: stop.departureDate ? new Date(stop.departureDate) : null,
        nights: stop.nights,
        latitude: stop.latitude,
        longitude: stop.longitude,
        timezone: stop.timezone,
        currencyCode: stop.currencyCode,
        tempRange: stop.tempRange,
        isCandidate: stop.isCandidate ?? false,
        ownerPerson: stop.ownerPerson ?? null,
        isLocal: stop.isLocal ?? false,
      },
      create: {
        order,
        country: stop.country,
        countryFlag: stop.countryFlag,
        name: stop.name,
        slug: stop.slug,
        category: stop.category,
        priceLevel: stop.priceLevel,
        arrivalDate: stop.arrivalDate ? new Date(stop.arrivalDate) : null,
        departureDate: stop.departureDate ? new Date(stop.departureDate) : null,
        nights: stop.nights,
        latitude: stop.latitude,
        longitude: stop.longitude,
        timezone: stop.timezone,
        currencyCode: stop.currencyCode,
        tempRange: stop.tempRange,
        isCandidate: stop.isCandidate ?? false,
        ownerPerson: stop.ownerPerson ?? null,
        isLocal: stop.isLocal ?? false,
      },
    });
    console.log(`  ✓ ${stop.countryFlag} ${stop.name}`);
  }

  const globalNotes = [
    { title: "UK ETA", body: "Ambos necesitan UK ETA (~£16 pp). Solo irlandeses están exentos. Solicitar antes del 5 ago.", pinned: true },
    { title: "Schengen — Persona 2", body: "89 días en Schengen (límite: 90). Ámsterdam → fin del viaje incluyendo Portugal.", pinned: true },
    { title: "Vuelo de ida", body: "4 ago → 5 ago. BUE → LHR. Smiles (millas), USD 484 pp.", pinned: false },
    { title: "Vuelo de regreso", body: "21 nov. MAD → BUE. Plus Ultra, USD 473 pp. 1 carry-on + 1 valija.", pinned: false },
    { title: "Seguro — PAX Assistance", body: "Long Stay 4 meses BASIC. USD 350 pp / USD 700 total. COMPRADO.", pinned: false },
    { title: "Vuelo: Edimburgo → Ámsterdam", body: "25 ago. USD 184 total (2p). COMPRADO.", pinned: false },
    { title: "Vuelo: París → Lisboa", body: "4 sept. ~USD 85 con equipaje (1 persona). COMPRADO.", pinned: false },
    { title: "Vuelo: Porto → Estrasburgo", body: "12 sept. Volotea, USD 90 (1 persona). COMPRADO.", pinned: false },
    { title: "Monedas no-Euro", body: "CHF (Suiza) · CZK (Chequia) · PLN (Polonia) · HUF (Hungría — cajero OTP Bank, NUNCA Euronet).", pinned: false },
  ];

  console.log("\nSeeding global notes...");
  for (const note of globalNotes) {
    const existing = await prisma.note.findFirst({ where: { title: note.title, stopId: null } });
    if (!existing) {
      await prisma.note.create({ data: { ...note, stopId: null } });
      console.log(`  ✓ "${note.title}"`);
    }
  }

  console.log("\nDone! ✈️");
}

// Only auto-run when executed directly (not when imported by seed-dev.ts).
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
