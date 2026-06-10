/** Open-Meteo forecast fetcher — server-side, cached 30 min via the fetch data cache. */

export interface WeatherData {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lng.toString());
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset");
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "3");

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = (await res.json()) as WeatherData;
    if (!data?.daily) return null;
    return data;
  } catch {
    return null;
  }
}
