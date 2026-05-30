export interface PlaceResult {
  name: string;
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function buildAddress(p: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  if (p.street) {
    parts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
  }
  const city = p.city ?? p.town ?? p.village ?? p.county;
  if (city) parts.push(city);
  return parts.join(", ");
}

export async function searchPlaces(
  query: string,
  opts?: { lat?: number; lng?: number }
): Promise<PlaceResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");

  if (opts?.lat != null && opts?.lng != null) {
    url.searchParams.set("lat", String(opts.lat));
    url.searchParams.set("lon", String(opts.lng));
    // Restrict results to a ~80km box around the stop so cross-language queries
    // still surface local landmarks (e.g. "Museo bri" → British Museum in London)
    const d = 0.7;
    url.searchParams.set(
      "bbox",
      `${opts.lng - d},${opts.lat - d},${opts.lng + d},${opts.lat + d}`
    );
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Andiamo Trip App (brunotamaro72@gmail.com)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { features: PhotonFeature[] };
    return (data.features ?? []).map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const address = buildAddress(p);
      return {
        name: p.name ?? "",
        displayName: [p.name, address].filter(Boolean).join(" — "),
        address,
        latitude: lat,
        longitude: lng,
      };
    }).filter((r) => r.name);
  } catch {
    return [];
  }
}
