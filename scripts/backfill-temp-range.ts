/**
 * One-off backfill: recompute tempRange (avg daily min – avg daily max,
 * averaged over the last 10 years) for stops. Stops without complete dates
 * use the assumed gap between dated neighbors.
 * Run: npx tsx --env-file=.env scripts/backfill-temp-range.ts [--all]
 *   default: only stops without complete dates or 0/1-night stays
 *   --all:   every stop with a resolvable window
 */
import { db } from "../src/lib/db";
import { assumedDateWindow } from "../src/lib/itinerary";
import { fetchTempRange } from "../src/lib/temp-range";

async function main() {
  const all = process.argv.includes("--all");
  const stops = await db.stop.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      order: true,
      nights: true,
      latitude: true,
      longitude: true,
      arrivalDate: true,
      departureDate: true,
    },
  });

  const targets = all
    ? stops
    : stops.filter((s) => !s.arrivalDate || !s.departureDate || s.nights <= 1);

  for (const s of targets) {
    const window = assumedDateWindow(s, stops);
    if (!window) {
      console.log(`– ${s.name}: sin ventana de fechas`);
      continue;
    }
    const range = await fetchTempRange(s.latitude, s.longitude, window.arrival, window.departure);
    if (!range) {
      console.log(`– ${s.name}: sin datos`);
      continue;
    }
    await db.stop.update({ where: { id: s.id }, data: { tempRange: range } });
    console.log(`✓ ${s.name}: ≈${range}`);
  }
}

main().then(() => process.exit(0));
