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
    // Use the same calendar dates but in 2025 (last full year of historical data)
    const yearOffset = 2025 - a.getFullYear();
    const startDate = new Date(a);
    const endDate = new Date(d);
    startDate.setFullYear(a.getFullYear() + yearOffset);
    endDate.setFullYear(d.getFullYear() + yearOffset);

    // endDate is exclusive (departure), archive needs inclusive end
    endDate.setDate(endDate.getDate() - 1);
    if (endDate <= startDate) return null;

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
    const maxTemps: number[] = data.daily?.temperature_2m_max ?? [];
    const minTemps: number[] = data.daily?.temperature_2m_min ?? [];
    if (!maxTemps.length || !minTemps.length) return null;

    const overallMin = Math.round(Math.min(...minTemps));
    const overallMax = Math.round(Math.max(...maxTemps));
    return `${overallMin}-${overallMax}°C`;
  } catch {
    return null;
  }
}
