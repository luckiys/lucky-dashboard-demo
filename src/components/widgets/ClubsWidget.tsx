"use client";

import { useState } from "react";

interface Club {
  id: string;
  name: string;
  meets: string; // e.g. "Wed 6:30 PM"
  location: string;
  color: string;
}

const COLORS = ["#c9f24f", "#4f9ef8", "#4ecb71", "#f97316", "#f472b6", "#fbbf24"];

const DEFAULT_CLUBS: Club[] = [
  { id: "scope", name: "Scope", meets: "", location: "", color: "#c9f24f" },
  { id: "think", name: "Purdue Think", meets: "", location: "Mitch Daniels School of Business", color: "#4f9ef8" },
  { id: "embedded", name: "Embedded Systems @ Purdue", meets: "", location: "BHEE", color: "#4ecb71" },
  { id: "natsec", name: "National Security Club", meets: "", location: "Lilly Hall", color: "#f97316" },
];

/** Read once, when the component first mounts. The board doesn't render until
 *  the client has hydrated, so this never runs on the server — the guard is
 *  there so the module stays safe to import from anywhere. */
function readClubs(): Club[] {
  if (typeof window === "undefined") return DEFAULT_CLUBS;
  try {
    const raw = localStorage.getItem("lucky_clubs");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as Club[]) : DEFAULT_CLUBS;
  } catch {
    return DEFAULT_CLUBS;
  }
}

export default function ClubsWidget() {
  const [clubs, setClubs] = useState<Club[]>(readClubs);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", meets: "", location: "" });

  const save = (c: Club[]) => {
    setClubs(c);
    localStorage.setItem("lucky_clubs", JSON.stringify(c));
  };

  const add = () => {
    if (!form.name.trim()) return;
    save([...clubs, {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      meets: form.meets.trim(),
      location: form.location.trim(),
      color: COLORS[clubs.length % COLORS.length],
    }]);
    setForm({ name: "", meets: "", location: "" });
    setAdding(false);
  };

  const remove = (id: string) => save(clubs.filter((c) => c.id !== id));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="widget-head">
        <p className="section-label">My Clubs</p>
        <button onClick={() => setAdding((a) => !a)} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          {adding ? "✕" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="flex flex-col gap-1.5 mb-3 flex-shrink-0">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Club name"
            className="bg-transparent text-xs outline-none px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <div className="flex gap-1.5">
            <input value={form.meets} onChange={(e) => setForm({ ...form, meets: e.target.value })} placeholder="Meets (Wed 6:30 PM)"
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              className="flex-1 min-w-0 bg-transparent text-xs outline-none px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Where"
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              className="flex-1 min-w-0 bg-transparent text-xs outline-none px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <button onClick={add} className="text-xs px-2.5 rounded-lg" style={{ background: "rgba(201,242,79,0.2)", color: "var(--accent-purple)" }}>Add</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 widget-scroll flex-1 min-h-0">
        {clubs.length === 0 ? (
          <p className="text-xs text-center mt-4" style={{ color: "var(--text-secondary)" }}>No clubs yet — add the ones you&apos;re in.</p>
        ) : clubs.map((c) => (
          <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl group" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
              {(c.meets || c.location) && (
                <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {[c.meets, c.location].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button onClick={() => remove(c.id)} className="text-xs opacity-0 group-hover:opacity-50 hover:!opacity-90 transition-opacity flex-shrink-0" style={{ color: "var(--text-secondary)" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
