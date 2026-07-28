import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient, DocumentKind } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { STOPS } from "./seed";
import { STOP_DUMMY } from "./seed-dev-content";
import { todayStr, addDaysStr, daysBetween } from "../src/lib/trip";

/**
 * seed-dev.ts — dummy data for local navigation/testing, and the shared engine
 * behind the public demo seed (`seed-demo.ts`, which only swaps the document
 * URL). Keep the logic here; the two entry points are thin on purpose.
 *
 * Rebases the whole itinerary around TODAY so the trip appears to be at its
 * midpoint (currently in Viena), which lets the "during" phase of /hoy and
 * current-stop docs render without waiting for Aug 2026.
 *
 * Notes/docs: tips y vouchers coherentes con Itinerary (seed-dev-content.ts).
 * Cada parada toma al azar 1–4 notas y 1–4 docs de su pool. Sin archivos R2.
 *
 * DESTRUCTIVE: wipes all Note / Document rows and re-creates dummy ones.
 * Stops are upserted (slugs preserved). Run the real seed (`npm run db:seed`)
 * to restore the production dataset.
 */

export type DummySeedOptions = {
  /** Where every dummy document points. Absolute: `/api/documents/[id]` answers
   *  a link document with `Response.redirect`, which rejects a relative URL. */
  docUrl: string;
};

/** Local dev: nothing to open, the point is only that the row exists. */
const DEV_DOC_URL = "https://example.com/andiamo-dummy";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const today = todayStr();
const vienaOrig = STOPS.find((s) => s.slug === "viena")!.arrivalDate!; // "2026-09-23"
const OFFSET = daysBetween(vienaOrig, addDaysStr(today, -2));

function shift(dateStr: string | null): string | null {
  return dateStr ? addDaysStr(dateStr, OFFSET) : null;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Fisher–Yates shuffle (copia). */
function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(items: T[], n: number): T[] {
  return shuffled(items).slice(0, Math.min(n, items.length));
}

export async function seedDummyData({ docUrl }: DummySeedOptions) {
  console.log(`Seeding dummy data — hoy=${today}, offset=${OFFSET}d (Viena = parada actual)\n`);

  console.log("Reescribiendo fechas de paradas...");
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const arrival = shift(stop.arrivalDate);
    const departure = shift(stop.departureDate);
    const data = {
      order: i + 1,
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

  console.log("Limpiando notas / documentos previos...");
  await prisma.note.deleteMany({});
  await prisma.document.deleteMany({});

  const dbStops = await prisma.stop.findMany({ orderBy: { order: "asc" } });
  const currentStop = dbStops.find((s) => {
    if (!s.arrivalDate) return false;
    const arr = s.arrivalDate.toISOString().slice(0, 10);
    const dep = s.departureDate?.toISOString().slice(0, 10) ?? arr;
    return arr <= today && today < dep;
  });

  // --- Documentos (links dummy; coherentes con el viaje) ---------------------
  console.log("Generando documentos dummy...");
  const globalDocs: Array<{
    label: string;
    kind: DocumentKind;
    note?: string;
    docDate?: string;
  }> = [
    {
      label: "Vuelo ida BUE → LHR",
      kind: "flight",
      note: "Smiles · ~USD 484 pp · 4→5 ago (data dummy)",
      docDate: shift("2026-08-05") ?? undefined,
    },
    {
      label: "Seguro PAX Assistance Long Stay",
      kind: "insurance",
      note: "BASIC 4 meses · USD 350 pp · COMPRADO (dummy)",
    },
    {
      label: "Eurail Pass Global",
      kind: "train",
      note: "Activar en ventana correcta — ver EURAIL.md (dummy)",
    },
    {
      label: "Vuelo regreso MAD → BUE",
      kind: "flight",
      note: "Plus Ultra · USD 473 pp · 21 nov (dummy)",
      docDate: shift("2026-11-21") ?? undefined,
    },
  ];
  for (const d of globalDocs) {
    await prisma.document.create({
      data: {
        stopId: null,
        label: d.label,
        kind: d.kind,
        note: d.note ?? null,
        source: "link",
        externalUrl: docUrl,
        docDate: d.docDate ? new Date(d.docDate) : null,
      },
    });
  }

  // --- Documentos por parada (pool Itinerary, 1–4 al azar) -------------------
  let stopDocCount = 0;
  const missingDocSlugs: string[] = [];
  for (const stop of dbStops) {
    const pool = STOP_DUMMY[stop.slug]?.docs ?? [];
    if (pool.length === 0) {
      missingDocSlugs.push(stop.slug);
      continue;
    }
    for (const d of pickN(pool, randInt(1, 4))) {
      await prisma.document.create({
        data: {
          stopId: stop.id,
          label: d.label,
          kind: d.kind,
          note: d.note,
          source: "link",
          externalUrl: docUrl,
        },
      });
      stopDocCount++;
    }
  }
  console.log(
    `  ✓ ${globalDocs.length} globales + ${stopDocCount} por parada` +
      (missingDocSlugs.length ? ` · sin pool: ${missingDocSlugs.join(",")}` : ""),
  );

  // --- Notas (contenido que el bot de Spitwise puede citar vía /api/notes) --
  console.log("Generando notas dummy...");
  const globalNotes = [
    {
      title: "UK ETA",
      body: "Ambos necesitan UK ETA (~£16 pp). Solo irlandeses exentos. Pedir antes del tramo UK.",
      pinned: true,
    },
    {
      title: "Schengen — Persona 2",
      body: "89 días en Schengen (límite 90). Ámsterdam → fin del viaje incluyendo Portugal.",
      pinned: true,
    },
    {
      title: "Monedas no-Euro",
      body:
        "CHF (Suiza) · CZK (Chequia) · PLN (Polonia) · HUF (Hungría — cajero OTP Bank, NUNCA Euronet). " +
        "En Polonia: dziękuję al pagar = 'quedate el cambio' — no decir gracias hasta recibir el vuelto.",
      pinned: true,
    },
    {
      title: "Domingo en Polonia",
      body:
        "Zakaz handlu: súper grandes cerrados la mayoría de los domingos. " +
        "El domingo del tramo Cracovia NO es comercial → comprar el sábado. Abren Żabka, panaderías, gastronomía.",
      pinned: false,
    },
  ];
  for (const n of globalNotes) {
    await prisma.note.create({ data: { ...n, stopId: null } });
  }

  let stopNoteCount = 0;
  const missingNoteSlugs: string[] = [];
  for (const stop of dbStops) {
    const pool = STOP_DUMMY[stop.slug]?.notes ?? [];
    if (pool.length === 0) {
      missingNoteSlugs.push(stop.slug);
      continue;
    }
    for (const n of pickN(pool, randInt(1, 4))) {
      await prisma.note.create({
        data: {
          stopId: stop.id,
          title: n.title,
          body: n.body,
          pinned: n.pinned ?? false,
        },
      });
      stopNoteCount++;
    }
  }
  console.log(
    `  ✓ ${globalNotes.length} globales + ${stopNoteCount} por parada` +
      (missingNoteSlugs.length ? ` · sin pool: ${missingNoteSlugs.join(",")}` : ""),
  );

  console.log(`\nListo. Estás \"en\" ${currentStop?.name ?? "—"} 🎯`);
  console.log("Guías markdown: content/guides (npm run guides:sync desde Itinerary).");
}

/** Entry point shared by `db:seed:dev` and `db:seed:demo`. */
export async function runDummySeed(options: DummySeedOptions) {
  try {
    await seedDummyData(options);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only when invoked as `tsx prisma/seed-dev.ts` — importing this module from
// seed-demo.ts must not run the dev variant as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runDummySeed({ docUrl: DEV_DOC_URL });
}
