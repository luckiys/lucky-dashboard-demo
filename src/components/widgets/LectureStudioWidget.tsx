"use client";

import { useRef, useState } from "react";
import { demoFetch } from "@/lib/demo/demoFetch";

type Kind = "notes" | "flashcards" | "quiz" | "summary" | "cheatsheet";

const TABS: { id: Kind; label: string; icon: string }[] = [
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "flashcards", label: "Flashcards", icon: "🃏" },
  { id: "quiz", label: "Quiz", icon: "❓" },
  { id: "summary", label: "Summary", icon: "📄" },
  { id: "cheatsheet", label: "Cheat sheet", icon: "⚡" },
];

interface Flashcard { front: string; back: string }
interface QuizQ { question: string; options: string[]; answer: number; explanation?: string }

/* Notes, summary and cheat sheet come back as prose. Flashcards and quizzes are
   asked for as JSON; when the model doesn't comply the route returns the raw
   string instead, which is why those two can still be a string here. */
interface Results {
  notes?: string;
  summary?: string;
  cheatsheet?: string;
  flashcards?: Flashcard[] | string;
  quiz?: QuizQ[] | string;
}

export default function LectureStudioWidget() {
  const [doc, setDoc] = useState<{ name: string; text: string; chars: number } | null>(null);
  const [tab, setTab] = useState<Kind>("notes");
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState<Kind | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    setLoading("upload");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await demoFetch("/api/lecture", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      setDoc({ name: d.name, text: d.text, chars: d.chars });
      setResults({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(null);
  };

  const usePasted = () => {
    if (pasteText.trim().length < 50) { setError("Paste at least a paragraph of material."); return; }
    setDoc({ name: "Pasted text", text: pasteText.trim().slice(0, 24000), chars: pasteText.length });
    setResults({});
    setPasting(false);
    setPasteText("");
    setError(null);
  };

  const generate = async (kind: Kind) => {
    if (!doc || loading) return;
    setError(null);
    setLoading(kind);
    try {
      const res = await demoFetch("/api/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: doc.text, kind }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Generation failed");
      setResults((r) => ({ ...r, [kind]: d.data ?? d.content ?? d.raw }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="widget-head">
        <p className="section-label">Lecture Studio</p>
        {doc && (
          <button onClick={() => { setDoc(null); setResults({}); }} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
            ✕ {doc.name.length > 22 ? doc.name.slice(0, 22) + "…" : doc.name}
          </button>
        )}
      </div>

      {!doc ? (
        /* ---------- Upload state ---------- */
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center min-h-0">
          {pasting ? (
            <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
              <textarea
                autoFocus
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste lecture notes, a transcript, or slides text…"
                className="w-full flex-1 min-h-0 bg-transparent text-xs outline-none p-3 rounded-xl resize-none"
                style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setPasting(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Cancel</button>
                <button onClick={usePasted} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(201,242,79,0.25)", color: "var(--accent-purple)", border: "1px solid rgba(201,242,79,0.4)" }}>Use this text</button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
                className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors hover:bg-white/5"
                style={{ border: "1.5px dashed var(--border-hover)", padding: "28px 16px" }}
              >
                {loading === "upload" ? (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Extracting text…</span>
                ) : (
                  <>
                    <span style={{ fontSize: "1.8rem" }}>📤</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upload slides or a PDF</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>PDF · TXT · MD — drop it here or click</span>
                  </>
                )}
              </button>
              <button onClick={() => setPasting(true)} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--accent-purple)" }}>
                or paste text instead
              </button>
              <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                Get notes, flashcards, a practice quiz, a summary & a cheat sheet.
              </p>
            </>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.text" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
      ) : (
        /* ---------- Studio state ---------- */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex gap-1 mb-3 flex-wrap flex-shrink-0">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  background: tab === t.id ? "rgba(201,242,79,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${tab === t.id ? "rgba(201,242,79,0.45)" : "var(--border)"}`,
                  color: tab === t.id ? "var(--accent-purple)" : "var(--text-secondary)",
                }}>
                {t.icon} {t.label}{results[t.id] ? " ✓" : ""}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 widget-scroll">
            {!results[tab] ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                {loading === tab ? (
                  <div className="w-full flex flex-col gap-2 px-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-4 rounded" style={{ width: `${90 - i * 12}%` }} />)}
                    <p className="text-xs text-center mt-2" style={{ color: "var(--text-secondary)" }}>Generating {TABS.find((t) => t.id === tab)?.label.toLowerCase()}…</p>
                  </div>
                ) : (
                  <button onClick={() => generate(tab)}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-transform hover:scale-105"
                    style={{ background: "rgba(201,242,79,0.22)", color: "var(--accent-purple)", border: "1px solid rgba(201,242,79,0.45)" }}>
                    ✨ Generate {TABS.find((t) => t.id === tab)?.label}
                  </button>
                )}
              </div>
            ) : tab === "flashcards" && Array.isArray(results.flashcards) ? (
              <Flashcards cards={results.flashcards} />
            ) : tab === "quiz" && Array.isArray(results.quiz) ? (
              <Quiz questions={results.quiz} />
            ) : (
              <pre className="text-xs whitespace-pre-wrap leading-relaxed px-1" style={{ color: "var(--text-primary)", fontFamily: "inherit" }}>
                {typeof results[tab] === "string" ? results[tab] : JSON.stringify(results[tab], null, 2)}
              </pre>
            )}
          </div>

          {results[tab] && (
            <button onClick={() => generate(tab)} disabled={!!loading} className="text-xs mt-2 self-end transition-opacity hover:opacity-70 flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
              ↻ Regenerate
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs mt-2 text-center flex-shrink-0" style={{ color: "var(--accent-orange)" }}>{error}</p>}
    </div>
  );
}

/* ---------- Flip-card flashcards ---------- */
function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  if (!card) return null;
  return (
    <div className="flex flex-col items-center gap-3 h-full justify-center px-2">
      <button onClick={() => setFlipped((f) => !f)} className="w-full flip-scene" style={{ maxWidth: 380, height: 150 }}>
        <div className={`flip-inner${flipped ? " flipped" : ""}`}>
          <div className="flip-face rounded-2xl flex items-center justify-center p-4 text-center" style={{ background: "rgba(201,242,79,0.14)", border: "1px solid rgba(201,242,79,0.4)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{card.front}</span>
          </div>
          <div className="flip-face flip-back rounded-2xl flex items-center justify-center p-4 text-center" style={{ background: "rgba(78,203,113,0.12)", border: "1px solid rgba(78,203,113,0.4)" }}>
            <span className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{card.back}</span>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-4">
        <button onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="text-xs px-3 py-1 rounded-lg disabled:opacity-30" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>‹ Prev</button>
        <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>{idx + 1} / {cards.length}</span>
        <button onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cards.length - 1} className="text-xs px-3 py-1 rounded-lg disabled:opacity-30" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Next ›</button>
      </div>
      <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>tap the card to flip</p>
    </div>
  );
}

/* ---------- Interactive quiz ---------- */
function Quiz({ questions }: { questions: QuizQ[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const done = Object.keys(answers).length === questions.length;
  return (
    <div className="flex flex-col gap-3 px-1">
      {done && (
        <div className="text-center text-sm font-bold py-2 rounded-xl" style={{ background: "rgba(78,203,113,0.12)", color: "var(--accent-green)", border: "1px solid rgba(78,203,113,0.35)" }}>
          Score: {score} / {questions.length}
        </div>
      )}
      {questions.map((q, qi) => {
        const picked = answers[qi];
        return (
          <div key={qi} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{qi + 1}. {q.question}</p>
            <div className="flex flex-col gap-1">
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = q.answer === oi;
                const revealed = picked !== undefined;
                return (
                  <button key={oi} disabled={revealed} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg transition-all disabled:cursor-default"
                    style={{
                      background: revealed && isCorrect ? "rgba(78,203,113,0.15)" : isPicked ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${revealed && isCorrect ? "rgba(78,203,113,0.5)" : isPicked ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                      color: "var(--text-primary)",
                    }}>
                    {revealed && isCorrect ? "✓ " : isPicked ? "✗ " : ""}{opt}
                  </button>
                );
              })}
            </div>
            {picked !== undefined && q.explanation && (
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>{q.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
