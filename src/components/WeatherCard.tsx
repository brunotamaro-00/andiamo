"use client";

import { useEffect, useState } from "react";

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

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "❄️";
  if (code <= 84) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

export function WeatherCard({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [lat, lng]);

  if (error) {
    return (
      <Card title="Clima">
        <p className="text-slate-500 text-sm">Sin conexión</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="Clima">
        <div className="animate-pulse h-16 bg-slate-800 rounded-lg" />
      </Card>
    );
  }

  const today = data.daily;
  const emoji = weatherEmoji(data.current.weather_code);
  const sunrise = today.sunrise?.[0] ? formatTime(today.sunrise[0]) : "–";
  const sunset = today.sunset?.[0] ? formatTime(today.sunset[0]) : "–";

  return (
    <Card title="Clima">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{emoji}</span>
        <div>
          <p className="text-2xl font-bold text-slate-100">{Math.round(data.current.temperature_2m)}°C</p>
          <p className="text-xs text-slate-400">
            ↑ {Math.round(today.temperature_2m_max[0])}° · ↓ {Math.round(today.temperature_2m_min[0])}°
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">🌅 {sunrise}</p>
          <p className="text-xs text-slate-400">🌇 {sunset}</p>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {today.time.slice(0, 3).map((date, i) => (
          <div key={date} className={`text-center rounded-lg py-2 px-1 ${i === 0 ? "bg-slate-700/50" : "bg-slate-800/50"}`}>
            <p className="text-xs text-slate-400">{i === 0 ? "Hoy" : formatDay(date)}</p>
            <p className="text-lg my-1">{weatherEmoji(today.weather_code[i])}</p>
            <p className="text-xs text-slate-200">{Math.round(today.temperature_2m_max[i])}° / {Math.round(today.temperature_2m_min[i])}°</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "short" });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}
