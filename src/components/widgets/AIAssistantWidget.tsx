"use client";

import { useEffect, useRef, useState } from "react";
import { demoFetch } from "@/lib/demo/demoFetch";
import type { ChatActionArgs, Forecast, Task } from "@/lib/types";

interface Message { role: "user" | "assistant"; content: string }

interface Props {
  dashboardContext: { tasks?: Task[]; weather?: Forecast | null };
  onAction?: (action: string, args: ChatActionArgs) => void;
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "Give me a 3-line recap of my week",
  "Add task: study for my next quiz",
  "Add a note: check email tonight",
];

export default function AIAssistantWidget({ dashboardContext, onAction }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await demoFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: dashboardContext,
        }),
      });
      const data = await res.json();
      if (data.type === "action" && data.action) {
        onAction?.(data.action, data.args);
        const confirmations: Record<string, string> = {
          add_note: `Added the note: "${data.args?.content}"`,
          add_task: `Task added to Notion: "${data.args?.title}"`,
          add_quick_link: `Added the link: ${data.args?.label}`,
        };
        setMessages((m) => [...m, { role: "assistant", content: confirmations[data.action] ?? "Done!" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply ?? data.content ?? "Hmm, I came back empty. Try again?" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching the AI. Try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="widget-head">
        <p className="section-label">Assistant</p>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)" }}>Clear</button>
        )}
      </div>

      <div className="flex-1 min-h-0 widget-scroll flex flex-col gap-2 pr-0.5">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="assistant-orb" aria-hidden />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Hey Lucky, what do you need?</p>
            <div className="flex flex-col gap-1.5 w-full px-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs text-left px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed msg-in ${m.role === "user" ? "self-end" : "self-start"}`}
                style={{
                  background: m.role === "user" ? "rgba(201,242,79,0.25)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${m.role === "user" ? "rgba(201,242,79,0.4)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start px-3 py-2 rounded-2xl flex gap-1 items-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
                {[0, 1, 2].map((i) => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="flex gap-2 mt-3 flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask anything, or add tasks & notes…"
          className="flex-1 min-w-0 bg-transparent text-xs outline-none px-3 py-2 rounded-xl"
          style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="text-xs font-semibold px-3.5 rounded-xl transition-all disabled:opacity-40"
          style={{ background: "rgba(201,242,79,0.25)", color: "var(--accent-purple)", border: "1px solid rgba(201,242,79,0.4)" }}>
          ↑
        </button>
      </div>
    </div>
  );
}
