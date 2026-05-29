"use client";

import { useEffect, useState } from "react";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudRain, Snowflake,
  CloudDrizzle, CloudLightning, Thermometer, Sunrise, Sunset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";

interface WeatherData {
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

interface WeatherIconDef {
  icon: LucideIcon;
  className: string;
}

function getWeatherIconDef(code: number): WeatherIconDef {
  if (code === 0) return { icon: Sun, className: "text-gold-400" };
  if (code <= 2) return { icon: CloudSun, className: "text-gold-400/80" };
  if (code <= 3) return { icon: Cloud, className: "text-sand-400" };
  if (code <= 49) return { icon: CloudFog, className: "text-sand-300" };
  if (code <= 69) return { icon: CloudRain, className: "text-sand-300" };
  if (code <= 79) return { icon: Snowflake, className: "text-sand-200" };
  if (code <= 84) return { icon: CloudDrizzle, className: "text-sand-300" };
  if (code <= 99) return { icon: CloudLightning, className: "text-warning" };
  return { icon: Thermometer, className: "text-sand-400" };
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

export function WeatherCard({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => {
        if (!r.ok) throw new Error("weather error");
        return r.json();
      })
      .then((json) => {
        if (!json?.daily) throw new Error("no daily data");
        setData(json);
      })
      .catch(() => setError(true));
  }, [lat, lng]);

  if (error) {
    return (
      <Card>
        <SectionHeader title="Clima" />
        <p className="text-sand-500 text-sm">Sin conexión</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <SectionHeader title="Clima" />
        <div className="animate-pulse h-16 bg-sand-850 rounded-xl" />
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
          <p className="text-2xl font-semibold font-display text-sand-100">
            {Math.round(data.current.temperature_2m)}°C
          </p>
          <p className="text-xs text-sand-400">
            ↑ {Math.round(daily.temperature_2m_max[0])}° · ↓{" "}
            {Math.round(daily.temperature_2m_min[0])}°
          </p>
        </div>
        <div className="ml-auto text-right space-y-1">
          <p className="text-xs text-sand-400 flex items-center justify-end gap-1.5">
            <Sunrise size={13} strokeWidth={1.5} aria-hidden="true" className="text-gold-400" />
            {sunrise}
          </p>
          <p className="text-xs text-sand-400 flex items-center justify-end gap-1.5">
            <Sunset size={13} strokeWidth={1.5} aria-hidden="true" className="text-sand-500" />
            {sunset}
          </p>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-2">
        {daily.time.slice(0, 3).map((date, i) => (
          <div
            key={date}
            className={`text-center rounded-xl py-2.5 px-1 ${
              i === 0 ? "bg-sand-850" : "bg-sand-850/50"
            }`}
          >
            <p className="text-xs text-sand-500">
              {i === 0 ? "Hoy" : formatDay(date)}
            </p>
            <div className="flex justify-center my-1.5">
              <WeatherIcon code={daily.weather_code[i]} size={20} />
            </div>
            <p className="text-xs text-sand-200">
              {Math.round(daily.temperature_2m_max[i])}° /{" "}
              {Math.round(daily.temperature_2m_min[i])}°
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
