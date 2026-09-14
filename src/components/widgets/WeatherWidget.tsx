"use client";

import { useEffect, useState } from "react";
import WeatherIcon, { kindFor } from "@/components/WeatherIcon";
import type { Forecast } from "@/lib/types";
import { demoFetch } from "@/lib/demo/demoFetch";

const LABELS: Record<string, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloud: "Overcast",
  fog: "Fog",
  drizzle: "Drizzle",
  rain: "Rain",
  snow: "Snow",
  storm: "Thunderstorm",
};

function describe(code: number) {
  return LABELS[kindFor(code)] ?? "Overcast";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeatherWidget() {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    demoFetch("/api/weather")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shimmer h-4 w-20" />
        <div className="shimmer h-12 w-36" />
        <div className="shimmer h-3 w-24" />
        <div className="flex flex-col gap-2 mt-auto">
          {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-7 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-secondary)" }}>Weather unavailable</div>;
  }

  const cur = data.current;
  const daily = data.daily;
  const feelsLike = Math.round(cur.apparent_temperature);
  const temp = Math.round(cur.temperature_2m);
  const humidity = cur.relative_humidity_2m;
  const wind = Math.round(cur.wind_speed_10m);

  const forecastDays = daily?.time?.slice(0, 5).map((dateStr: string, i: number) => ({
    day: i === 0 ? "Today" : DAYS[new Date(dateStr + "T12:00:00").getDay()],
    code: daily.weather_code[i] as number,
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
  })) ?? [];

  // Shared scale for the per-day range bars, so bars are comparable across rows.
  const maxT = Math.max(...forecastDays.map((d) => d.high), 1);
  const minT = Math.min(...forecastDays.map((d) => d.low), 0);
  const span = Math.max(maxT - minT, 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="widget-head">
        <p className="section-label">Weather · West Lafayette</p>
        <span className="widget-head-meta">{describe(cur.weather_code)}</span>
      </div>

      {/* Current conditions */}
      <div className="flex items-end justify-between gap-2 flex-shrink-0">
        <div>
          <div className="widget-data" style={{ fontSize: "var(--fs-h1)" }}>
            {temp}<span style={{ color: "var(--accent-purple)", fontSize: "0.45em", verticalAlign: "0.62em", marginLeft: "0.08em", fontWeight: 600 }}>°F</span>
          </div>
          <div className="mt-1.5" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-tiny)" }}>
            Feels like {feelsLike}°
          </div>
        </div>
        <WeatherIcon code={cur.weather_code} size={40} />
      </div>

      {/* Stats */}
      <div className="flex gap-2 mt-3 flex-shrink-0" style={{ fontSize: "var(--fs-micro)", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
        <span className="px-2 py-1 rounded-md tabular-nums" style={{ background: "rgba(255,249,232,0.04)", border: "1px solid var(--border)" }}>HUM {humidity}%</span>
        <span className="px-2 py-1 rounded-md tabular-nums" style={{ background: "rgba(255,249,232,0.04)", border: "1px solid var(--border)" }}>WIND {wind} MPH</span>
      </div>

      {/* 5-day forecast: one row per day with a low→high range bar.
          Rows spread across the leftover height so tall cards don't leave a gap. */}
      <div className="flex flex-col justify-between gap-1 mt-4 flex-1 min-h-0">
        {forecastDays.map((d, i) => {
          const left = ((d.low - minT) / span) * 100;
          const width = Math.max(((d.high - d.low) / span) * 100, 6);
          return (
            <div key={i} className="flex items-center gap-2" style={{ minHeight: 26 }}>
              <span className="w-11 flex-shrink-0 font-medium" style={{ fontSize: "var(--fs-tiny)", color: i === 0 ? "var(--accent-purple)" : "var(--text-secondary)" }}>{d.day}</span>
              <span className="flex-shrink-0 flex justify-center" style={{ width: 20 }}><WeatherIcon code={d.code} size={17} /></span>
              <span className="tabular-nums w-7 text-right flex-shrink-0" style={{ fontSize: "var(--fs-tiny)", color: "var(--text-secondary)" }}>{d.low}°</span>
              <div className="flex-1 h-1 rounded-full relative" style={{ background: "rgba(255,249,232,0.07)" }}>
                <div className="absolute h-full rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: i === 0 ? "var(--accent-purple)" : "linear-gradient(90deg, rgba(127,199,224,0.7), rgba(232,135,63,0.8))" }} />
              </div>
              <span className="tabular-nums w-7 flex-shrink-0 font-semibold" style={{ fontSize: "var(--fs-tiny)" }}>{d.high}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
