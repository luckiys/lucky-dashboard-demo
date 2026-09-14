"use client";

import { useEffect, useRef, useState } from "react";
import { demoFetch } from "@/lib/demo/demoFetch";

interface NowPlaying {
  connected: boolean;
  playing?: boolean;
  progress?: number;
  duration?: number;
  track?: string;
  artists?: string;
  album?: string;
  image?: string | null;
  url?: string;
  error?: string;
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function SpotifyWidget() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 300, h: 360 });
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const d = await demoFetch("/api/spotify/now-playing", { cache: "no-store" }).then((r) => r.json());
      setData(d);
      if (typeof d.progress === "number") setLocalProgress(d.progress);
    } catch {
      setData({ connected: false });
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!data?.playing) return;
    const t = setInterval(() => setLocalProgress((p) => Math.min(data.duration ?? p, p + 1000)), 1000);
    return () => clearInterval(t);
  }, [data?.playing, data?.duration]);

  const control = async (action: string) => {
    setMsg(null);
    if (action === "play" || action === "pause") setData((d) => (d ? { ...d, playing: action === "play" } : d));
    const res = await demoFetch("/api/spotify/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); setMsg(e.error ?? "Playback failed"); }
    setTimeout(load, 400);
  };

  // --- Not connected ---
  if (data && !data.connected) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center h-full text-center gap-3">
        <SpotifyLogo size={34} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Player unavailable</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            The live board connects a Spotify account here over OAuth. In the demo the player is
            local, so this only shows if it failed to start.
          </p>
        </div>
        <button onClick={load} className="text-xs font-semibold px-4 py-2 rounded-full transition-transform hover:scale-105" style={{ background: "#1DB954", color: "#000" }}>Retry</button>
      </div>
    );
  }

  const hasTrack = data?.connected && data.track;
  const playing = !!data?.playing;
  const progressPct = data?.duration ? Math.min(100, (localProgress / data.duration) * 100) : 0;

  // Layout adapts to the container: wide+short → horizontal, otherwise vertical.
  const { w, h } = dims;
  const horizontal = w > h * 1.25 && w > 260;
  const headerH = 30;
  const art = horizontal
    ? clamp(h - 40, 44, 150)
    : clamp(Math.min(w - 40, (h - headerH) * 0.5), 56, 260);
  const playSize = clamp(art * 0.42, 30, 60);
  const iconBtn = clamp(art * 0.2, 13, 24);
  const titleSize = clamp(art * 0.14, 12, 20);
  const subSize = clamp(art * 0.11, 10, 15);
  // Collapse the vertical stack's breathing room as the card gets short.
  const stackGap = h < 220 ? 6 : h < 300 ? 10 : 12;

  return (
    <div ref={containerRef} className="flex flex-col h-full min-h-0">
      <div className="widget-head">
        <div className="flex items-center gap-1.5">
          <SpotifyLogo size={15} />
          <p className="section-label">Spotify</p>
        </div>
        {playing && <Equalizer />}
      </div>

      {!hasTrack ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          <div className="rounded-2xl flex items-center justify-center" style={{ width: art, height: art, maxWidth: 120, maxHeight: 120, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" aria-hidden><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2.5" y="14.5" width="4" height="6" rx="2"/><rect x="17.5" y="14.5" width="4" height="6" rx="2"/></svg>
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Nothing playing right now</p>
          <Controls playing={false} onControl={control} playSize={44} iconBtn={18} />
        </div>
      ) : horizontal ? (
        /* ---- Horizontal compact layout ---- */
        <div className="flex items-center gap-3 flex-1 min-h-0">
          <AlbumArt data={data} playing={playing} size={art} />
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <div className="min-w-0">
              <a href={data?.url} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline" style={{ color: "var(--text-primary)", fontSize: titleSize }} title={data?.track}>{data?.track}</a>
              <p className="truncate" style={{ color: "var(--text-secondary)", fontSize: subSize }} title={data?.artists}>{data?.artists}</p>
            </div>
            <Progress pct={progressPct} progress={localProgress} duration={data?.duration ?? 0} />
            <Controls playing={playing} onControl={control} playSize={playSize} iconBtn={iconBtn} align="start" />
          </div>
        </div>
      ) : (
        /* ---- Vertical layout ---- */
        <div className="flex flex-col items-center flex-1 min-h-0 justify-center" style={{ gap: stackGap }}>
          <AlbumArt data={data} playing={playing} size={art} />
          <div className="text-center w-full px-1">
            <a href={data?.url} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline" style={{ color: "var(--text-primary)", fontSize: titleSize }} title={data?.track}>{data?.track}</a>
            <p className="truncate mt-0.5" style={{ color: "var(--text-secondary)", fontSize: subSize }} title={data?.artists}>{data?.artists}</p>
          </div>
          <div className="w-full px-1"><Progress pct={progressPct} progress={localProgress} duration={data?.duration ?? 0} /></div>
          <Controls playing={playing} onControl={control} playSize={playSize} iconBtn={iconBtn} />
        </div>
      )}

      {msg && <p className="text-xs text-center mt-2 flex-shrink-0" style={{ color: "var(--accent-orange)" }}>{msg}</p>}
    </div>
  );
}

function AlbumArt({ data, playing, size }: { data: NowPlaying | null; playing: boolean; size: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-2xl blur-xl transition-opacity" style={{ background: "radial-gradient(circle, rgba(29,185,84,0.5), transparent 70%)", opacity: playing ? 0.9 : 0.2 }} />
      {data?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt={data.album ?? ""} className={`relative rounded-2xl object-cover w-full h-full${playing ? " art-float" : ""}`} style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }} />
      ) : (
        <div className="relative rounded-2xl w-full h-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      )}
    </div>
  );
}

function Progress({ pct, progress, duration }: { pct: number; progress: number; duration: number }) {
  return (
    <div className="w-full">
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#1DB954", transition: "width 1s linear" }} />
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>
        <span>{fmt(progress)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
}

function Controls({ playing, onControl, playSize, iconBtn, align = "center" }: {
  playing: boolean; onControl: (a: string) => void; playSize: number; iconBtn: number; align?: "center" | "start";
}) {
  const btn = "flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95";
  return (
    <div className={`flex items-center gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}>
      <button onClick={() => onControl("prev")} className={btn} style={{ color: "var(--text-secondary)" }} aria-label="Previous">
        <svg width={iconBtn} height={iconBtn} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
      </button>
      <button onClick={() => onControl(playing ? "pause" : "play")} className={btn} style={{ width: playSize, height: playSize, background: "#1DB954", color: "#000" }} aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg width={playSize * 0.45} height={playSize * 0.45} viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
        ) : (
          <svg width={playSize * 0.45} height={playSize * 0.45} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <button onClick={() => onControl("next")} className={btn} style={{ color: "var(--text-secondary)" }} aria-label="Next">
        <svg width={iconBtn} height={iconBtn} viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" /></svg>
      </button>
    </div>
  );
}

function Equalizer() {
  return (
    <div className="flex items-end gap-0.5" style={{ height: 14 }} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="eq-bar" style={{ animationDelay: `${i * 0.15}s`, background: "#1DB954" }} />
      ))}
    </div>
  );
}

function SpotifyLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.35-.66.46-1 .26-2.75-1.68-6.2-2.06-10.28-1.13-.4.1-.8-.16-.9-.56-.1-.4.16-.8.56-.9 4.46-1 8.28-.57 11.36 1.32.36.2.46.66.26 1.01zm1.47-3.27c-.26.42-.8.55-1.22.3-3.15-1.94-7.95-2.5-11.68-1.37-.47.14-.97-.12-1.1-.6-.14-.47.12-.97.6-1.1 4.26-1.3 9.55-.66 13.17 1.55.4.26.53.8.27 1.22zm.13-3.4C15.76 8.4 9.4 8.2 5.8 9.28c-.57.17-1.17-.15-1.34-.72-.17-.57.15-1.17.72-1.34 4.13-1.25 11.16-1.01 15.55 1.6.5.3.66.95.36 1.45-.3.5-.95.66-1.45.36z" />
    </svg>
  );
}
