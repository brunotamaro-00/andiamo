import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

interface StopInput {
  order: number;
  country: string;
  countryFlag: string;
  name: string;
  slug: string;
  category: string;
  priceLevel: string;
  arrivalDate: string | null;
  departureDate: string | null;
  nights: number;
  datesFixed: boolean;
  latitude: number;
  longitude: number;
  currencyCode: string;
  tempRange: string;
  isTransit?: boolean;
  isCandidate?: boolean;
}

const STOPS: StopInput[] = [
  {
    order: 1, country: "Reino Unido", countryFlag: "🇬🇧", name: "Londres", slug: "londres",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-05", departureDate: "2026-08-13", nights: 8, datesFixed: true,
    latitude: 51.5074, longitude: -0.1278, currencyCode: "GBP", tempRange: "14-23°C",
  },
  {
    order: 2, country: "Reino Unido", countryFlag: "🇬🇧", name: "York", slug: "york",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-08-13", departureDate: "2026-08-15", nights: 2, datesFixed: true,
    latitude: 53.9590, longitude: -1.0815, currencyCode: "GBP", tempRange: "13-20°C",
  },
  {
    order: 3, country: "Reino Unido", countryFlag: "🇬🇧", name: "Edimburgo", slug: "edimburgo",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-08-15", departureDate: "2026-08-18", nights: 3, datesFixed: true,
    latitude: 55.9533, longitude: -3.1883, currencyCode: "GBP", tempRange: "12-19°C",
  },
  {
    order: 4, country: "Reino Unido", countryFlag: "🇬🇧", name: "Highlands", slug: "highlands",
    category: "Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-08-18", departureDate: "2026-08-25", nights: 7, datesFixed: true,
    latitude: 56.8198, longitude: -5.1052, currencyCode: "GBP", tempRange: "9-18°C",
  },
  {
    order: 5, country: "Países Bajos", countryFlag: "🇳🇱", name: "Ámsterdam", slug: "amsterdam",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-25", departureDate: "2026-08-29", nights: 4, datesFixed: true,
    latitude: 52.3676, longitude: 4.9041, currencyCode: "EUR", tempRange: "14-22°C",
  },
  {
    order: 6, country: "Francia", countryFlag: "🇫🇷", name: "París", slug: "paris",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-08-29", departureDate: "2026-09-04", nights: 6, datesFixed: true,
    latitude: 48.8566, longitude: 2.3522, currencyCode: "EUR", tempRange: "15-25°C",
  },
  {
    order: 7, country: "Portugal", countryFlag: "🇵🇹", name: "Lisboa", slug: "lisboa",
    category: "Ciudad", priceLevel: "$-$$",
    arrivalDate: "2026-09-04", departureDate: "2026-09-08", nights: 4, datesFixed: true,
    latitude: 38.7223, longitude: -9.1393, currencyCode: "EUR", tempRange: "17-28°C",
  },
  {
    order: 8, country: "Portugal", countryFlag: "🇵🇹", name: "Porto", slug: "porto",
    category: "Ciudad/Costa", priceLevel: "$-$$",
    arrivalDate: "2026-09-08", departureDate: "2026-09-12", nights: 4, datesFixed: true,
    latitude: 41.1579, longitude: -8.6291, currencyCode: "EUR", tempRange: "17-28°C",
  },
  {
    order: 9, country: "Francia", countryFlag: "🇫🇷", name: "Estrasburgo", slug: "estrasburgo",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-12", departureDate: "2026-09-14", nights: 2, datesFixed: false,
    latitude: 48.5734, longitude: 7.7521, currencyCode: "EUR", tempRange: "11-21°C",
  },
  {
    order: 10, country: "Francia", countryFlag: "🇫🇷", name: "Colmar", slug: "colmar",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-14", departureDate: "2026-09-16", nights: 2, datesFixed: false,
    latitude: 48.0794, longitude: 7.3585, currencyCode: "EUR", tempRange: "11-22°C",
  },
  {
    order: 11, country: "Alemania", countryFlag: "🇩🇪", name: "Friburgo", slug: "friburgo",
    category: "Ciudad/Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-09-16", departureDate: "2026-09-19", nights: 3, datesFixed: false,
    latitude: 47.9990, longitude: 7.8421, currencyCode: "EUR", tempRange: "10-21°C",
  },
  {
    order: 12, country: "Suiza", countryFlag: "🇨🇭", name: "Interlaken", slug: "interlaken",
    category: "Trekking", priceLevel: "$$$",
    arrivalDate: "2026-09-19", departureDate: "2026-09-23", nights: 4, datesFixed: false,
    latitude: 46.6863, longitude: 7.8632, currencyCode: "CHF", tempRange: "9-17°C",
  },
  {
    order: 13, country: "Austria", countryFlag: "🇦🇹", name: "Innsbruck", slug: "innsbruck",
    category: "Tránsito", priceLevel: "$$$",
    arrivalDate: "2026-09-23", departureDate: "2026-09-23", nights: 0, datesFixed: false,
    latitude: 47.2692, longitude: 11.4041, currencyCode: "EUR", tempRange: "6-16°C",
    isTransit: true,
  },
  {
    order: 14, country: "Austria", countryFlag: "🇦🇹", name: "Viena", slug: "viena",
    category: "Ciudad", priceLevel: "$$$",
    arrivalDate: "2026-09-23", departureDate: "2026-09-28", nights: 5, datesFixed: false,
    latitude: 48.2082, longitude: 16.3738, currencyCode: "EUR", tempRange: "8-18°C",
  },
  {
    order: 15, country: "Chequia", countryFlag: "🇨🇿", name: "Praga", slug: "praga",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-09-28", departureDate: "2026-10-03", nights: 5, datesFixed: false,
    latitude: 50.0755, longitude: 14.4378, currencyCode: "CZK", tempRange: "10-18°C",
  },
  {
    order: 16, country: "Polonia", countryFlag: "🇵🇱", name: "Cracovia", slug: "cracovia",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-03", departureDate: "2026-10-07", nights: 4, datesFixed: false,
    latitude: 50.0647, longitude: 19.9450, currencyCode: "PLN", tempRange: "8-16°C",
  },
  {
    order: 17, country: "Hungría", countryFlag: "🇭🇺", name: "Budapest", slug: "budapest",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-07", departureDate: "2026-10-11", nights: 4, datesFixed: false,
    latitude: 47.4979, longitude: 19.0402, currencyCode: "HUF", tempRange: "9-18°C",
  },
  {
    order: 18, country: "Eslovenia", countryFlag: "🇸🇮", name: "Liubliana", slug: "liubliana",
    category: "Ciudad/Naturaleza", priceLevel: "$$",
    arrivalDate: "2026-10-11", departureDate: "2026-10-15", nights: 4, datesFixed: false,
    latitude: 46.0569, longitude: 14.5058, currencyCode: "EUR", tempRange: "7-15°C",
  },
  {
    order: 19, country: "Italia", countryFlag: "🇮🇹", name: "Florencia", slug: "florencia",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-10-15", departureDate: "2026-10-20", nights: 5, datesFixed: false,
    latitude: 43.7696, longitude: 11.2558, currencyCode: "EUR", tempRange: "11-20°C",
  },
  {
    order: 20, country: "Italia", countryFlag: "🇮🇹", name: "Roma", slug: "roma",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-10-20", departureDate: "2026-10-27", nights: 7, datesFixed: false,
    latitude: 41.9028, longitude: 12.4964, currencyCode: "EUR", tempRange: "12-21°C",
  },
  {
    order: 21, country: "Italia", countryFlag: "🇮🇹", name: "Nápoles", slug: "napoles",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: "2026-10-27", departureDate: "2026-10-29", nights: 2, datesFixed: false,
    latitude: 40.8518, longitude: 14.2681, currencyCode: "EUR", tempRange: "13-20°C",
  },
  {
    order: 22, country: "Italia", countryFlag: "🇮🇹", name: "Bari", slug: "bari",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 0, datesFixed: false,
    latitude: 41.1171, longitude: 16.8719, currencyCode: "EUR", tempRange: "15-22°C",
    isCandidate: true,
  },
  {
    order: 23, country: "Italia", countryFlag: "🇮🇹", name: "Catania", slug: "catania",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 0, datesFixed: false,
    latitude: 37.5079, longitude: 15.0830, currencyCode: "EUR", tempRange: "17-24°C",
    isCandidate: true,
  },
  {
    order: 24, country: "Italia", countryFlag: "🇮🇹", name: "Palermo", slug: "palermo",
    category: "Ciudad", priceLevel: "$",
    arrivalDate: null, departureDate: null, nights: 0, datesFixed: false,
    latitude: 38.1157, longitude: 13.3615, currencyCode: "EUR", tempRange: "18-25°C",
    isCandidate: true,
  },
  {
    order: 25, country: "España", countryFlag: "🇪🇸", name: "Barcelona", slug: "barcelona",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-11-08", departureDate: "2026-11-13", nights: 5, datesFixed: false,
    latitude: 41.3851, longitude: 2.1734, currencyCode: "EUR", tempRange: "11-18°C",
  },
  {
    order: 26, country: "España", countryFlag: "🇪🇸", name: "Madrid", slug: "madrid",
    category: "Ciudad", priceLevel: "$$",
    arrivalDate: "2026-11-13", departureDate: "2026-11-18", nights: 5, datesFixed: false,
    latitude: 40.4168, longitude: -3.7038, currencyCode: "EUR", tempRange: "6-14°C",
  },
];

async function main() {
  console.log("Seeding stops...");

  for (const stop of STOPS) {
    await prisma.stop.upsert({
      where: { slug: stop.slug },
      update: {
        order: stop.order,
        country: stop.country,
        countryFlag: stop.countryFlag,
        name: stop.name,
        category: stop.category,
        priceLevel: stop.priceLevel,
        arrivalDate: stop.arrivalDate ? new Date(stop.arrivalDate) : null,
        departureDate: stop.departureDate ? new Date(stop.departureDate) : null,
        nights: stop.nights,
        datesFixed: stop.datesFixed,
        latitude: stop.latitude,
        longitude: stop.longitude,
        currencyCode: stop.currencyCode,
        tempRange: stop.tempRange,
        isTransit: stop.isTransit ?? false,
        isCandidate: stop.isCandidate ?? false,
      },
      create: {
        order: stop.order,
        country: stop.country,
        countryFlag: stop.countryFlag,
        name: stop.name,
        slug: stop.slug,
        category: stop.category,
        priceLevel: stop.priceLevel,
        arrivalDate: stop.arrivalDate ? new Date(stop.arrivalDate) : null,
        departureDate: stop.departureDate ? new Date(stop.departureDate) : null,
        nights: stop.nights,
        datesFixed: stop.datesFixed,
        latitude: stop.latitude,
        longitude: stop.longitude,
        currencyCode: stop.currencyCode,
        tempRange: stop.tempRange,
        isTransit: stop.isTransit ?? false,
        isCandidate: stop.isCandidate ?? false,
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

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
