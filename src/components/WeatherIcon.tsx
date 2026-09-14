// One stroke weight, one grid, one visual language — replaces the emoji glyphs
// that read inconsistently across platforms.
type Kind = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function kindFor(code: number): Kind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

const SUN = "var(--accent-yellow)";
const CLOUD = "var(--text-secondary)";
const WET = "var(--accent-blue)";

export default function WeatherIcon({ code, size = 20 }: { code: number; size?: number }) {
  const kind = kindFor(code);
  const s = { width: size, height: size, flexShrink: 0 } as const;
  const stroke = { strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <svg viewBox="0 0 24 24" style={s} aria-hidden role="img">
      {kind === "clear" && (
        <g {...stroke} stroke={SUN}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </g>
      )}
      {kind === "partly" && (
        <g {...stroke}>
          <g stroke={SUN}>
            <circle cx="8.5" cy="8.5" r="3.1" />
            <path d="M8.5 2.6v1.6M2.6 8.5h1.6M4.3 4.3l1.2 1.2M12.7 4.3l-1.2 1.2" />
          </g>
          <path stroke={CLOUD} d="M9 19h8.2a3.1 3.1 0 0 0 .3-6.2 4.4 4.4 0 0 0-8.4-.8A3.5 3.5 0 0 0 9 19Z" />
        </g>
      )}
      {kind === "cloud" && (
        <g {...stroke} stroke={CLOUD}>
          <path d="M7.5 18.5h9.2a3.4 3.4 0 0 0 .3-6.8 4.8 4.8 0 0 0-9.2-.9 3.8 3.8 0 0 0-.3 7.7Z" />
        </g>
      )}
      {kind === "fog" && (
        <g {...stroke} stroke={CLOUD}>
          <path d="M7.5 13.5h9.2a3.4 3.4 0 0 0 .3-6.8 4.8 4.8 0 0 0-9.2-.9 3.8 3.8 0 0 0-.3 7.7Z" />
          <path d="M4.5 17h15M6.5 20.2h11" />
        </g>
      )}
      {(kind === "drizzle" || kind === "rain") && (
        <g {...stroke}>
          <path stroke={CLOUD} d="M7.5 14.5h9.2a3.4 3.4 0 0 0 .3-6.8 4.8 4.8 0 0 0-9.2-.9 3.8 3.8 0 0 0-.3 7.7Z" />
          <path stroke={WET} d={kind === "rain" ? "M9 17.5l-1 3M13 17.5l-1 3M17 17.5l-1 3" : "M9.5 17.8l-.6 1.8M14.5 17.8l-.6 1.8"} />
        </g>
      )}
      {kind === "snow" && (
        <g {...stroke}>
          <path stroke={CLOUD} d="M7.5 14.5h9.2a3.4 3.4 0 0 0 .3-6.8 4.8 4.8 0 0 0-9.2-.9 3.8 3.8 0 0 0-.3 7.7Z" />
          <g stroke={WET}>
            <path d="M9 18.4v2.2M7.9 19l2.2 1.1M10.1 19l-2.2 1.1" />
            <path d="M15 18.4v2.2M13.9 19l2.2 1.1M16.1 19l-2.2 1.1" />
          </g>
        </g>
      )}
      {kind === "storm" && (
        <g {...stroke}>
          <path stroke={CLOUD} d="M7.5 14.5h9.2a3.4 3.4 0 0 0 .3-6.8 4.8 4.8 0 0 0-9.2-.9 3.8 3.8 0 0 0-.3 7.7Z" />
          <path stroke={SUN} d="M13 16.4l-2.6 3.4h3l-1.2 2.2" />
        </g>
      )}
    </svg>
  );
}
