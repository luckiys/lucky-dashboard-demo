/* The demo's stand-in for Spotify.
 *
 * The live widget hits /api/spotify/now-playing, which refreshes an OAuth token
 * and proxies the Web API. Here the same shape comes from a fixed playlist whose
 * playhead advances on a timer, so play / pause / next / previous all still do
 * something real — they just move a local cursor instead of a phone.
 *
 * Cover art is inline SVG rather than a remote image: the demo has no external
 * image host and should render identically offline. */

import type { DemoTrack } from "./seed";

function cover(a: string, b: string, glyph: string, ink = "#0d0c09"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="300" height="300" fill="url(#g)"/>
  <rect width="300" height="300" filter="url(#n)" opacity="0.14"/>
  <circle cx="150" cy="150" r="86" fill="none" stroke="${ink}" stroke-opacity="0.32" stroke-width="1.5"/>
  <circle cx="150" cy="150" r="52" fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="1.5"/>
  <text x="150" y="168" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif" font-size="64"
        font-weight="600" text-anchor="middle" fill="${ink}" fill-opacity="0.82">${glyph}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

/* Invented artists and titles — nothing here is a real release. */
export const PLAYLIST: DemoTrack[] = [
  { track: "Lantern Hours", artists: "Field Notice", album: "Slow Grid", duration: 214_000, url: "#", image: cover("#c9f24f", "#6f8f22", "LH") },
  { track: "Third Floor Window", artists: "Marrow Lane", album: "Everything Quiet", duration: 187_000, url: "#", image: cover("#4f9ef8", "#1d3f77", "3F", "#f2f6ff") },
  { track: "Cold Open", artists: "Nova Pilgrim", album: "Cold Open", duration: 241_000, url: "#", image: cover("#f97316", "#7a2e05", "CO", "#fff4ea") },
  { track: "Paper Clover", artists: "The Wren Society", album: "Four Leaves", duration: 198_000, url: "#", image: cover("#4ecb71", "#14512a", "PC", "#effff4") },
  { track: "Harmattan", artists: "Sable Room", album: "Dust Season", duration: 262_000, url: "#", image: cover("#f472b6", "#6d1b44", "HM", "#fff0f7") },
  { track: "Midwest Static", artists: "Field Notice", album: "Slow Grid", duration: 176_000, url: "#", image: cover("#fbbf24", "#7a5205", "MS") },
  { track: "Long Division", artists: "Grain & Signal", album: "Remainder", duration: 229_000, url: "#", image: cover("#8b8fd6", "#2e3170", "LD", "#f3f4ff") },
  { track: "Barn Light", artists: "Marrow Lane", album: "Everything Quiet", duration: 205_000, url: "#", image: cover("#e0dbcb", "#8f8a78", "BL") },
];
