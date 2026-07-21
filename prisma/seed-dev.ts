import "dotenv/config";
import { PrismaClient, DocumentKind } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { STOPS } from "./seed";
import { todayStr, addDaysStr, daysBetween } from "../src/lib/trip";

/**
 * seed-dev.ts — DEV-ONLY dummy data for local navigation/testing.
 *
 * Rebases the whole itinerary around TODAY so the trip appears to be at its
 * midpoint (currently in Viena), which lets the "during" phase of /hoy and
 * current-stop docs render without waiting for Aug 2026.
 *
 * DESTRUCTIVE: wipes all Note / Document rows and re-creates dummy ones.
 * Stops are upserted (slugs preserved). Run the real seed (`npm run db:seed`)
 * to restore the production dataset. No real files/addresses are used.
 */

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// --- Date rebasing: make Viena the current stop (arrived 2 days ago) ---------
const today = todayStr();
const vienaOrig = STOPS.find((s) => s.slug === "viena")!.arrivalDate!; // "2026-09-23"
const OFFSET = daysBetween(vienaOrig, addDaysStr(today, -2));

function shift(dateStr: string | null): string | null {
  return dateStr ? addDaysStr(dateStr, OFFSET) : null;
}

async function main() {
  console.log(`Seeding DEV data — hoy=${today}, offset=${OFFSET}d (Viena = parada actual)\n`);

  // 1. Upsert stops with rebased dates ---------------------------------------
  console.log("Reescribiendo fechas de paradas...");
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const arrival = shift(stop.arrivalDate);
    const departure = shift(stop.departureDate);
    const data = {
      order: i + 1, // position wins over the decorative `order` literal
      country: stop.country,
      countryFlag: stop.countryFlag,
      name: stop.name,
      category: stop.category,
      priceLevel: stop.priceLevel,
      arrivalDate: arrival ? new Date(arrival) : null,
      departureDate: departure ? new Date(departure) : null,
      nights: stop.nights,
      latitude: stop.latitude,
      longitude: stop.longitude,
      timezone: stop.timezone,
      currencyCode: stop.currencyCode,
      tempRange: stop.tempRange,
      isCandidate: stop.isCandidate ?? false,
      ownerPerson: stop.ownerPerson ?? null,
      isLocal: stop.isLocal ?? false,
    };
    await prisma.stop.upsert({
      where: { slug: stop.slug },
      update: data,
      create: { ...data, slug: stop.slug },
    });
  }

  // 2. Wipe child tables (dummy content is regenerated each run) --------------
  console.log("Limpiando notas / documentos previos...");
  await prisma.note.deleteMany({});
  await prisma.document.deleteMany({});

  const dbStops = await prisma.stop.findMany({
    orderBy: { order: "asc" },
  });

  // 3. Dummy documents (source "link", sin archivos reales) ------------------
  console.log("Generando documentos dummy...");
  const currentStop = dbStops.find((s) => {
    if (!s.arrivalDate) return false;
    const arr = s.arrivalDate.toISOString().slice(0, 10);
    const dep = s.departureDate?.toISOString().slice(0, 10) ?? arr;
    return arr <= today && today < dep;
  });

  // Trip-wide docs (stopId: null)
  const globalDocs: Array<{ label: string; kind: DocumentKind }> = [
    { label: "Vuelo de ida BUE → LHR (ejemplo)", kind: "flight" },
    { label: "Seguro de viaje (ejemplo)", kind: "insurance" },
    { label: "Vuelo de regreso MAD → BUE (ejemplo)", kind: "flight" },
  ];
  for (const d of globalDocs) {
    await prisma.document.create({
      data: { stopId: null, label: d.label, kind: d.kind, source: "link", externalUrl: "#" },
    });
  }

  // Current-stop docs so /hoy muestra la sección de documentos
  if (currentStop) {
    const stopDocs: Array<{ label: string; kind: DocumentKind }> = [
      { label: `Check-in ${currentStop.name} (ejemplo)`, kind: "checkin" },
      { label: `Voucher alojamiento ${currentStop.name} (ejemplo)`, kind: "voucher" },
      { label: `Entrada museo ${currentStop.name} (ejemplo)`, kind: "ticket" },
    ];
    for (const d of stopDocs) {
      await prisma.document.create({
        data: { stopId: currentStop.id, label: d.label, kind: d.kind, source: "link", externalUrl: "#" },
      });
    }
  }
  console.log("  ✓ documentos globales + parada actual");

  // 5. Notas dummy ------------------------------------------------------------
  console.log("Generando notas dummy...");
  await prisma.note.create({
    data: {
      stopId: null,
      title: "Monedas no-Euro (ejemplo)",
      body: "CHF · CZK · PLN · HUF — sacar efectivo en cajeros bancarios. Data dummy.",
      pinned: true,
    },
  });
  if (currentStop) {
    await prisma.note.create({
      data: {
        stopId: currentStop.id,
        title: `Notas de ${currentStop.name}`,
        body: "Recordatorio de ejemplo para la parada actual. Data dummy.",
        pinned: true,
      },
    });
  }
  console.log("  ✓ notas");

  console.log(`\nListo. Estás \"en\" ${currentStop?.name ?? "—"} 🎯`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
