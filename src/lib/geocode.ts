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

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const data = await res.json();
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
