"use client";

import { useEffect, useState } from "react";

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 5 ? "Up late" : hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2100);
    const t2 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center cursor-pointer welcome-overlay${leaving ? " leaving" : ""}`}
      onClick={() => { setLeaving(true); setTimeout(onDone, 500); }}
      role="button"
      tabIndex={0}
      aria-label="Skip and open the dashboard"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setLeaving(true); setTimeout(onDone, 500); } }}
      style={{ background: "radial-gradient(ellipse 60% 50% at 50% 110%, rgba(201,242,79,0.05) 0%, transparent 60%), var(--bg-primary)" }}
    >
      <div className="welcome-panel">
        <div className="welcome-line welcome-brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-word">Lucky<span>OS</span></span>
        </div>

        <h1 className="welcome-line welcome-greeting">
          {greeting}, <span>Lucky</span>
        </h1>
        <p className="welcome-line welcome-meta">{dateStr} · {timeStr}</p>

        <div className="welcome-line welcome-track" aria-hidden />
        <p className="welcome-line welcome-hint">Loading the demo board</p>
      </div>
    </div>
  );
}
