/** Years of history to average — smooths out single-year heatwaves/cold snaps. */
const YEARS_OF_HISTORY = 10;

interface YearTemps {
  mins: number[];
  maxs: number[];
}

/**
 * Typical temperature range for a stay: average daily min – average daily max
 * over the same calendar window in the last N completed years.
 * Returns e.g. "13-24°C", or null without dates/data.
 */
export async function fetchTempRange(
  lat: number,
  lng: number,
  arrival: Date | string | null,
  departure: Date | string | null,
): Promise<string | null> {
  if (!arrival || !departure) return null;

  try {
    const a = new Date(arrival);
    const d = new Date(departure);
    const lastFullYear = new Date().getUTCFullYear() - 1;
    const years = Array.from({ length: YEARS_OF_HISTORY }, (_, i) => lastFullYear - i);

    // Sequential, not parallel — bursts trip Open-Meteo's rate limiting and this
    // runs off the response path. Years that fail are simply skipped.
    const perYear: (YearTemps | null)[] = [];
    for (const y of years) {
      perYear.push(await fetchYearTemps(lat, lng, a, d, y));
    }
    const mins = perYear.flatMap((r) => r?.mins ?? []);
    const maxs = perYear.flatMap((r) => r?.maxs ?? []);
    if (!mins.length || !maxs.length) return null;

    const avgMin = Math.round(mean(mins));
    const avgMax = Math.round(mean(maxs));
    return `${avgMin}-${avgMax}°C`;
  } catch {
    return null;
  }
}

/** Daily min/max for the stay's calendar window shifted to the given year. */
async function fetchYearTemps(
  lat: number,
  lng: number,
  arrival: Date,
  departure: Date,
  year: number,
): Promise<YearTemps | null> {
  // UTC mutators prevent local-timezone drift on servers with a negative UTC offset.
  const yearOffset = year - arrival.getUTCFullYear();
  const startDate = new Date(arrival);
  const endDate = new Date(departure);
  startDate.setUTCFullYear(arrival.getUTCFullYear() + yearOffset);
  endDate.setUTCFullYear(departure.getUTCFullYear() + yearOffset);

  // endDate is exclusive (departure), archive needs inclusive end.
  // Zero/one-day windows (transits, assumed gaps) still cover the arrival day.
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  if (endDate < startDate) endDate.setTime(startDate.getTime());

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("start_date", fmt(startDate));
  url.searchParams.set("end_date", fmt(endDate));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 * 7 } });
  if (!res.ok) return null;

  const data = await res.json();
  const isNum = (t: unknown): t is number => typeof t === "number";
  const maxs: number[] = (data.daily?.temperature_2m_max ?? []).filter(isNum);
  const mins: number[] = (data.daily?.temperature_2m_min ?? []).filter(isNum);
  if (!maxs.length || !mins.length) return null;

  return { mins, maxs };
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}
