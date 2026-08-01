import SunCalc from "suncalc";
import { TRIP_TIMEZONE } from "./trip";

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

/**
 * Tentative sunrise/sunset (HH:mm, local to the stop) for a stay's date range,
 * computed at the midpoint of arrival–departure. Pure astronomy via suncalc —
 * no network, works for any lat/lng.
 */
export function tentativeSunTimes(
  lat: number,
  lng: number,
  arrival: Date | string | null,
  departure: Date | string | null,
  timezone: string | null,
): SunTimes | null {
  if (!arrival) return null;

  const a = new Date(arrival).getTime();
  const d = departure ? new Date(departure).getTime() : a;
  if (Number.isNaN(a) || Number.isNaN(d)) return null;

  // Midpoint of the stay, anchored at midday UTC so the calendar day is unambiguous
  const mid = new Date((a + d) / 2);
  mid.setUTCHours(12, 0, 0, 0);

  const { sunrise, sunset } = SunCalc.getTimes(mid, lat, lng);
  // Polar edge cases yield Invalid Date
  if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return null;

  // Defense in depth: the schema now rejects non-IANA zones, but rows written
  // before that (or by a seed) can still carry one, and an uncaught RangeError
  // here 500s the whole stop detail page — a Server Component with no boundary
  // around it — with no way to fix the field from inside the app. Losing the
  // stop's own timezone is a cosmetic hour offset; losing the page isn't.
  const fmt = formatterFor(timezone) ?? formatterFor(TRIP_TIMEZONE);
  if (!fmt) return null;

  return { sunrise: fmt.format(sunrise), sunset: fmt.format(sunset) };
}

function formatterFor(timezone: string | null): Intl.DateTimeFormat | null {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
  } catch {
    return null;
  }
}
