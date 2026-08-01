import { fetchWithTimeout, TIMEOUT_INTERACTIVE_MS } from "./fetch-timeout";

export interface GeoResult {
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export async function geocodeCity(query: string): Promise<GeoResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  let data: { results?: unknown };
  try {
    const res = await fetchWithTimeout(
      url.toString(),
      { next: { revalidate: 86400 } },
      TIMEOUT_INTERACTIVE_MS,
    );
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    // Network/parse failure — degrade to no results
    return [];
  }

  const results = (data.results ?? []) as Array<{
    name: string;
    admin1?: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;

  return results.map((r) => ({
    name: r.name,
    admin1: r.admin1 ?? null,
    country: r.country,
    countryCode: r.country_code.toUpperCase(),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}
