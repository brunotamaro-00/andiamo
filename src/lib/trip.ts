/**
 * trip.ts — single source of truth for trip-wide date utilities.
 *
 * All Stop.arrivalDate / Stop.departureDate fields are stored as @db.Date
 * (PostgreSQL DATE, UTC midnight). Comparing YYYY-MM-DD strings is the only
 * safe way to do date logic regardless of the server's local timezone.
 */

/** IANA timezone the trip's "today" is anchored to — the itinerary lives in Europe. */
export const TRIP_TIMEZONE = "Europe/Madrid";

/**
 * Demo pública: "hoy" congelado (YYYY-MM-DD). Sin esta variable el reloj es real.
 *
 * El itinerario del deploy de demo no se rebasea contra el día en que corre el
 * cron: se congela una vez, así quien abra el link en noviembre ve exactamente
 * el mismo viaje mid-trip que quien lo abra hoy. Es también lo que mantiene a
 * Andiamo y Spitwise diciendo lo mismo — Spitwise congela su propio reloj con
 * `DEMO_TODAY` (backend/app/trip_time.py) y las dos variables llevan la misma fecha.
 *
 * `NEXT_PUBLIC_` porque Next la inlinea en build time y `StopSpendPanel` corre
 * en cliente. Railway expone las variables del servicio durante el build.
 */
const FROZEN_TODAY = process.env.NEXT_PUBLIC_DEMO_TODAY;

/** Returns today as a YYYY-MM-DD string in TRIP_TIMEZONE, safe to compare against @db.Date values. */
export function todayStr(): string {
  if (FROZEN_TODAY) return FROZEN_TODAY;
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TRIP_TIMEZONE }).format(new Date());
}

/** Parses a YYYY-MM-DD string to a UTC-midnight Date (mirror of dateToStr). */
export function strToDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Adds n days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDaysStr(dateStr: string, n: number): string {
  const ms = strToDate(dateStr).getTime() + n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from one YYYY-MM-DD string to another (negative if `to` is earlier). */
export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((strToDate(toStr).getTime() - strToDate(fromStr).getTime()) / 86_400_000);
}

/** Converts a Date coming from a @db.Date Prisma field to a YYYY-MM-DD string. */
export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Noches efectivamente cubiertas por el itinerario: unión de los intervalos
 * [llegada, salida). Las paradas solapadas no duplican noches y los huecos sin
 * parada asignada no cuentan.
 *
 * Espeja `itinerary_dates` de Spitwise (backend/app/analytics.py) a propósito.
 * Antes acá se restaba `última salida − primera llegada`, que da el span de
 * calendario: incluye los días que todavía no tienen dónde dormir (hoy, los 10
 * entre Nápoles y Barcelona). Las dos apps mostraban 105 y 95 una al lado de la
 * otra y parecía un bug. Si cambia una definición, tiene que cambiar la otra.
 */
export function itineraryNights(
  stops: { arrivalDate: Date | null; departureDate: Date | null }[],
): number {
  const nights = new Set<string>();
  for (const s of stops) {
    if (!s.arrivalDate || !s.departureDate) continue;
    const departure = dateToStr(s.departureDate);
    // Salida exclusiva: se cuentan noches, no fechas.
    for (let d = dateToStr(s.arrivalDate); d < departure; d = addDaysStr(d, 1)) {
      nights.add(d);
    }
  }
  return nights.size;
}

/**
 * Computes the trip day number for a given stop arrival date.
 * Day 1 = arrival at the first stop.
 *
 * @param arrivalDate  The stop's arrivalDate (Date or string).
 * @param tripStartDate The trip's start (Date or string) — the first stop's arrivalDate.
 * @returns  Positive integer ≥ 1, or null if either date is missing.
 */
export function tripDayNumber(
  arrivalDate: Date | string | null | undefined,
  tripStartDate: Date | string | null | undefined,
): number | null {
  if (!arrivalDate || !tripStartDate) return null;
  const arrStr = typeof arrivalDate === "string" ? arrivalDate : dateToStr(arrivalDate);
  const startStr =
    typeof tripStartDate === "string" ? tripStartDate : dateToStr(tripStartDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor(
    (new Date(arrStr).getTime() - new Date(startStr).getTime()) / msPerDay,
  );
  return diff + 1;
}
