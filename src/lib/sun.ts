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

  const fmt = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone ?? TRIP_TIMEZONE,
  });

  return { sunrise: fmt.format(sunrise), sunset: fmt.format(sunset) };
}
