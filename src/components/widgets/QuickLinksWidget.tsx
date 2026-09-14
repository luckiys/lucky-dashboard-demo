"use client";

import { useState } from "react";

interface Link {
  id: string;
  label: string;
  url: string;
  icon: string;
}

const DEFAULT_LINKS: Link[] = [
  { id: "brightspace", label: "Brightspace", url: "https://purdue.brightspace.com", icon: "🎓" },
  { id: "notion", label: "Notion", url: "https://notion.so", icon: "📋" },
  { id: "gmail", label: "Gmail", url: "https://mail.google.com", icon: "📧" },
  { id: "gcal", label: "Google Calendar", url: "https://calendar.google.com", icon: "📅" },
  { id: "drive", label: "Google Drive", url: "https://drive.google.com", icon: "💾" },
  { id: "github", label: "GitHub", url: "https://github.com", icon: "🐙" },
  { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com", icon: "💼" },
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com", icon: "🤖" },
];

const COLLEGE_LINKS: Link[] = [
  { id: "brightspace", label: "Brightspace", url: "https://purdue.brightspace.com", icon: "🎓" },
  { id: "mypurdue", label: "myPurdue", url: "https://mypurdue.purdue.edu", icon: "🚂" },
  { id: "boilerconnect", label: "BoilerConnect", url: "https://purdue.campus.eab.com", icon: "🤝" },
  { id: "library", label: "Libraries", url: "https://www.lib.purdue.edu", icon: "📚" },
  { id: "gmail", label: "Gmail", url: "https://mail.google.com", icon: "📧" },
  { id: "scheduler", label: "Course Scheduler", url: "https://timetable.mypurdue.purdue.edu", icon: "🗓" },
  { id: "rmp", label: "Rate My Professors", url: "https://www.ratemyprofessors.com", icon: "⭐" },
  { id: "dining", label: "Dining Menus", url: "https://dining.purdue.edu/menus", icon: "🍽" },
];

/** Read once, at mount. `storageKey` is fixed per instance — the personal and
 *  college boards mount separate copies — so there is nothing to re-read. */
function readLinks(storageKey: string, defaults: Link[]): Link[] {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as Link[]) : defaults;
  } catch {
    return defaults;
  }
}

export default function QuickLinksWidget({ storageKey = "lucky_links", variant = "personal" }: { storageKey?: string; variant?: "personal" | "college" }) {
  const defaults = variant === "college" ? COLLEGE_LINKS : DEFAULT_LINKS;
  const [links, setLinks] = useState<Link[]>(() => readLinks(storageKey, defaults));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", url: "", icon: "🔗" });

  const save = (l: Link[]) => {
    setLinks(l);
    localStorage.setItem(storageKey, JSON.stringify(l));
  };

  const add = () => {
    if (!form.label.trim() || !form.url.trim()) return;
    const url = form.url.startsWith("http") ? form.url : `https://${form.url}`;
    save([...links, { id: crypto.randomUUID(), label: form.label, url, icon: form.icon }]);
    setForm({ label: "", url: "", icon: "🔗" });
    setAdding(false);
  };

  const remove = (id: string) => save(links.filter((l) => l.id !== id));

  return (
    <div className="flex flex-col h-full">
      <div className="widget-head">
        <p className="section-label">Quick Links</p>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-xs px-2 py-1 rounded-lg transition-all"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          {adding ? "✕" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="🔗" className="w-10 bg-transparent text-center text-lg outline-none" />
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Label" className="flex-1 min-w-20 bg-transparent text-xs outline-none px-2 py-1.5 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="URL" className="flex-1 min-w-32 bg-transparent text-xs outline-none px-2 py-1.5 rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <button onClick={add} className="text-xs px-2 py-1 rounded-lg"
            style={{ background: "rgba(201,242,79,0.2)", color: "var(--accent-purple)" }}>Add</button>
        </div>
      )}

      <div
        className="grid gap-3 widget-scroll flex-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
      >
        {links.map((link) => (
          <div key={link.id} className="relative group">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: "1.4rem" }}>{link.icon}</span>
              <span className="text-xs text-center leading-tight" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-micro)" }}>
                {link.label}
              </span>
            </a>
            <button
              onClick={() => remove(link.id)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
              style={{ background: "#ef4444", color: "#fff", fontSize: "var(--fs-micro)" }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
