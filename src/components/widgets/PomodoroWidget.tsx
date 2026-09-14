"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";

const PRESETS: Record<Mode, { label: string; mins: number; color: string }> = {
  focus: { label: "Focus", mins: 25, color: "var(--accent-purple)" },
  short: { label: "Short Break", mins: 5, color: "var(--accent-green)" },
  long: { label: "Long Break", mins: 15, color: "var(--accent-blue)" },
};

export default function PomodoroWidget() {
  const [mode, setMode] = useState<Mode>("focus");
  const [seconds, setSeconds] = useState(PRESETS.focus.mins * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (mode === "focus") setSessions((n) => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, mode]);

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setSeconds(PRESETS[m].mins * 60);
  };

  const reset = () => {
    setRunning(false);
    setSeconds(PRESETS[mode].mins * 60);
  };

  const total = PRESETS[mode].mins * 60;
  const progress = (total - seconds) / total;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const color = PRESETS[mode].color;

  // SVG circle
  const R = 52;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - progress);

  return (
    <div className="flex flex-col items-center h-full">
      <div className="widget-head w-full">
        <p className="section-label">Pomodoro</p>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{sessions} sessions today</span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-5 w-full">
        {(Object.keys(PRESETS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: mode === m ? `rgba(201,242,79,0.2)` : "rgba(255,255,255,0.04)",
              border: `1px solid ${mode === m ? "rgba(201,242,79,0.4)" : "var(--border)"}`,
              color: mode === m ? color : "var(--text-secondary)",
            }}
          >
            {PRESETS[m].label}
          </button>
        ))}
      </div>

      {/* Circle timer — flex-1 lets it grow so the timer sits centered and the card has no dead space */}
      <div className="relative flex items-center justify-center flex-1 my-2 w-full">
        <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="64" cy="64" r={R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums">{mins}:{secs}</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{PRESETS[mode].label}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Reset
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-6 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: running ? "rgba(239,68,68,0.2)" : `rgba(201,242,79,0.2)`,
            border: `1px solid ${running ? "rgba(239,68,68,0.4)" : "rgba(201,242,79,0.4)"}`,
            color: running ? "#ef4444" : color,
          }}
        >
          {running ? "⏸ Pause" : seconds === total ? "▶ Start" : "▶ Resume"}
        </button>
      </div>
    </div>
  );
}
