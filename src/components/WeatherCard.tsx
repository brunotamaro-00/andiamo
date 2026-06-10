import {
  Sun, CloudSun, Cloud, CloudFog, CloudRain, Snowflake,
  CloudDrizzle, CloudLightning, Thermometer, Sunrise, Sunset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchWeather } from "@/lib/weather";

interface WeatherIconDef {
  icon: LucideIcon;
  className: string;
}

function getWeatherIconDef(code: number): WeatherIconDef {
  if (code === 0)  return { icon: Sun,            className: "text-warning" };
  if (code <= 2)   return { icon: CloudSun,        className: "text-warning" };
  if (code <= 3)   return { icon: Cloud,           className: "text-ink-2" };
  if (code <= 49)  return { icon: CloudFog,         className: "text-ink-2" };
  if (code <= 69)  return { icon: CloudRain,        className: "text-ink-2" };
  if (code <= 79)  return { icon: Snowflake,        className: "text-ink-3" };
  if (code <= 84)  return { icon: CloudDrizzle,     className: "text-ink-2" };
  if (code <= 99)  return { icon: CloudLightning,   className: "text-ink-2" };
  return { icon: Thermometer, className: "text-ink-2" };
}

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  const { icon: Icon, className } = getWeatherIconDef(code);
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" className={className} />;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "short" });
}

/** Server component — fetched during render (cached 30 min), streamed via Suspense. */
export async function WeatherCard({ lat, lng }: { lat: number; lng: number }) {
  const data = await fetchWeather(lat, lng);

  if (!data) {
    return (
      <Card>
        <SectionHeader title="Clima" />
        <p className="text-ink-3 text-sm">No se pudo cargar el clima.</p>
      </Card>
    );
  }

  const daily = data.daily;
  const sunrise = daily.sunrise?.[0] ? formatTime(daily.sunrise[0]) : "–";
  const sunset = daily.sunset?.[0] ? formatTime(daily.sunset[0]) : "–";

  return (
    <Card>
      <SectionHeader title="Clima" />

      {/* Current conditions */}
      <div className="flex items-center gap-3 mb-4">
        <WeatherIcon code={data.current.weather_code} size={40} />
        <div>
          <p className="text-2xl font-numeral text-ink">
            {Math.round(data.current.temperature_2m)}°C
          </p>
          <p className="text-xs text-ink-2">
            ↑ {Math.round(daily.temperature_2m_max[0])}° · ↓{" "}
            {Math.round(daily.temperature_2m_min[0])}°
          </p>
        </div>
        <div className="ml-auto text-right space-y-1">
          <p className="text-xs text-ink-2 flex items-center justify-end gap-1.5">
            <Sunrise size={13} strokeWidth={1.5} aria-hidden="true" className="text-warning" />
            {sunrise}
          </p>
          <p className="text-xs text-ink-2 flex items-center justify-end gap-1.5">
            <Sunset size={13} strokeWidth={1.5} aria-hidden="true" className="text-ink-2" />
            {sunset}
          </p>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-2">
        {daily.time.slice(0, 3).map((date, i) => (
          <div
            key={date}
            className={`text-center rounded-[4px] py-2.5 px-1 ${
              i === 0 ? "bg-surface-2" : "bg-surface-2/50"
            }`}
          >
            <p className="text-xs text-ink-3">
              {i === 0 ? "Hoy" : formatDay(date)}
            </p>
            <div className="flex justify-center my-1.5">
              <WeatherIcon code={daily.weather_code[i]} size={20} />
            </div>
            <p className="text-xs text-ink">
              {Math.round(daily.temperature_2m_max[i])}° /{" "}
              {Math.round(daily.temperature_2m_min[i])}°
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Suspense fallback that mirrors the final card layout — no layout shift. */
export function WeatherCardSkeleton() {
  return (
    <Card>
      <SectionHeader title="Clima" />
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="ml-auto space-y-1.5 flex flex-col items-end">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[88px] rounded-[4px]" />
        ))}
      </div>
    </Card>
  );
}
