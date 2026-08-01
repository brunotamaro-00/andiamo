/**
 * Dry-run of recalculateItinerary against the live DB.
 *
 * `recalculateItinerary()` runs after every stop mutation and rewrites dates
 * with no confirmation and no undo. This script answers the only question that
 * matters before touching anything mid-trip: *would the next edit move a date
 * I already booked?* A healthy itinerary is a fixed point — zero drift.
 *
 *   npm run itinerary:check
 *
 * Exits 1 if any existing date would move, so it can gate a deploy.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeItinerary, MAX_DRIFT_DAYS } from "../src/lib/itinerary";
import { dateToStr, daysBetween } from "../src/lib/trip";

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const [stops, setting] = await Promise.all([
    // Same scope as recalculateItinerary: pseudo-cities sit parallel to the walk.
    db.stop.findMany({ where: { isLocal: false }, orderBy: { order: "asc" } }),
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
  ]);

  const firstAnchored = stops.find((s) => s.isAnchored && s.arrivalDate);
  const tripStart = firstAnchored?.arrivalDate
    ? dateToStr(firstAnchored.arrivalDate)
    : (setting?.value ?? null);

  console.log(`anchor: ${tripStart ?? "(ninguna)"}   setting: ${setting?.value ?? "(vacío)"}`);
  console.log(
    `anclas: ${stops
      .filter((s) => s.isAnchored)
      .map((s) => `${s.slug}@${s.arrivalDate ? dateToStr(s.arrivalDate) : "?"}`)
      .join(", ")}\n`,
  );

  const computed = computeItinerary(stops, tripStart);
  let drifted = 0;
  let filled = 0;
  let worst = 0;

  for (const stop of stops) {
    const next = computed.get(stop.id)!;
    const old = [
      stop.arrivalDate && dateToStr(stop.arrivalDate),
      stop.departureDate && dateToStr(stop.departureDate),
    ];
    const now = [next.arrival && dateToStr(next.arrival), next.departure && dateToStr(next.departure)];
    if (old[0] === now[0] && old[1] === now[1]) continue;

    if (old[0] == null && old[1] == null) {
      filled++;
      console.log(`  rellena  ${stop.slug.padEnd(15)} → ${now.join(" → ")}`);
      continue;
    }
    drifted++;
    const move = old[0] && now[0] ? daysBetween(old[0], now[0]) : 0;
    worst = Math.max(worst, Math.abs(move));
    console.log(
      `  MUEVE    ${stop.slug.padEnd(15)} ${old.join(" → ")}  ⇒  ${now.join(" → ")}  (${move > 0 ? "+" : ""}${move} d)`,
    );
  }

  console.log(
    `\nfechas existentes movidas: ${drifted}  ·  candidatas rellenadas: ${filled}  ·  drift máximo: ${worst} d (límite ${MAX_DRIFT_DAYS})`,
  );
  await db.$disconnect();
  if (drifted > 0) process.exit(1);
  console.log("OK — el próximo recálculo no toca ninguna fecha ya fijada.");
}

main();
