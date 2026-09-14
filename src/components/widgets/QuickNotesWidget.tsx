"use client";

import { useEffect, useRef, useState } from "react";
import { demoFetch } from "@/lib/demo/demoFetch";

interface Note {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

const COLORS = ["purple", "blue", "green", "orange", "pink"];
const COLOR_MAP: Record<string, string> = {
  purple: "rgba(201,242,79,0.15)",
  blue: "rgba(79,158,248,0.15)",
  green: "rgba(78,203,113,0.15)",
  orange: "rgba(249,115,22,0.15)",
  pink: "rgba(244,114,182,0.15)",
};
const BORDER_MAP: Record<string, string> = {
  purple: "rgba(201,242,79,0.4)",
  blue: "rgba(79,158,248,0.4)",
  green: "rgba(78,203,113,0.4)",
  orange: "rgba(249,115,22,0.4)",
  pink: "rgba(244,114,182,0.4)",
};
const TEXT_MAP: Record<string, string> = {
  purple: "var(--accent-purple)",
  blue: "var(--accent-blue)",
  green: "var(--accent-green)",
  orange: "var(--accent-orange)",
  pink: "var(--accent-pink)",
};

export default function QuickNotesWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("purple");
  const [adding, setAdding] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = () => {
    demoFetch("/api/notes")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []));
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!input.trim()) return;
    setAdding(true);
    await demoFetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim(), color: selectedColor }),
    });
    setInput("");
    setAdding(false);
    load();
  };

  const del = async (id: string) => {
    await demoFetch(`/api/notes?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="widget-head">
        <p className="section-label">Quick Notes</p>
      </div>

      {/* Input area */}
      <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
        <textarea
          ref={textRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add(); }}
          placeholder="Jot something down… (⌘+Enter to save)"
          rows={2}
          className="w-full bg-transparent text-xs resize-none outline-none placeholder:opacity-40"
          style={{ color: "var(--text-primary)" }}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className="w-4 h-4 rounded-full transition-transform"
                style={{
                  background: TEXT_MAP[c],
                  transform: selectedColor === c ? "scale(1.3)" : "scale(1)",
                  outline: selectedColor === c ? `2px solid ${TEXT_MAP[c]}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
          <button
            onClick={add}
            disabled={adding || !input.trim()}
            className="text-xs px-3 py-1 rounded-lg font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(201,242,79,0.25)", color: "var(--accent-purple)", border: "1px solid rgba(201,242,79,0.4)" }}
          >
            {adding ? "Saving…" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2.5 widget-scroll flex-1">
        {notes.length === 0 ? (
          <p className="text-xs text-center mt-4 italic" style={{ color: "var(--text-secondary)" }}>No notes yet</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="relative p-3 rounded-xl group"
              style={{ background: COLOR_MAP[note.color] ?? COLOR_MAP.purple, border: `1px solid ${BORDER_MAP[note.color] ?? BORDER_MAP.purple}` }}
            >
              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{note.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs opacity-50" style={{ fontSize: "var(--fs-micro)" }}>
                  {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={() => del(note.id)}
                  className="text-xs opacity-0 group-hover:opacity-60 transition-opacity hover:!opacity-100"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
