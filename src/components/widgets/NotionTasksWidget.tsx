"use client";

import { useEffect, useState, useCallback } from "react";
import { format, isPast, isToday, isTomorrow, parseISO, addDays, startOfDay } from "date-fns";
import { demoFetch } from "@/lib/demo/demoFetch";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  course: string | null;
  isSchool: boolean;
  url: string;
  /* Demo-only. The live board has no per-task description — these explain where
     the row came from, which is the part sample data would otherwise hide. */
  note?: string;
  origin?: "sync" | "manual" | "assistant";
}

const ORIGIN_LABEL: Record<string, string> = {
  sync: "Brightspace cron",
  manual: "Added here",
  assistant: "Assistant",
};

const PRIORITY_DOT: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f97316",
  Low: "#4ecb71",
};

// The three funnel stages, in order.
const STAGES = ["Not Started", "In Progress", "Done"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { dot: string; tint: string }> = {
  "Not Started": { dot: "#8888b0", tint: "rgba(136,136,176,0.12)" },
  "In Progress": { dot: "#4f9ef8", tint: "rgba(79,158,248,0.14)" },
  Done: { dot: "#4ecb71", tint: "rgba(78,203,113,0.14)" },
};

// How many days ahead counts as "this week".
const WINDOW_DAYS = 7;

/* ---- Due dates ----
   Notion stores an all-day due date as "2026-08-31" and a timed one as a full
   ISO timestamp. The presence of a "T" is what tells the two apart, and it
   decides both how the chip reads and how urgency is coloured. */

const hasTime = (iso: string) => iso.includes("T");

/** ISO string → the values the date/time inputs want. */
function splitDue(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  if (!hasTime(iso)) return { date: iso.slice(0, 10), time: "" };
  const d = parseISO(iso);
  return { date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm") };
}

/** Input values → what Notion should store. Empty time means all-day. */
function joinDue(date: string, time: string): string | null {
  if (!date) return null;
  if (!time) return date;
  const dt = new Date(`${date}T${time}`);
  return isNaN(dt.getTime()) ? date : dt.toISOString();
}

/** "Today", "Tomorrow", "Mon, Sep 3" — plus the clock time when there is one. */
function describeDue(iso: string) {
  const d = parseISO(iso);
  const day = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE, MMM d");
  return { day, time: hasTime(iso) ? format(d, "h:mm a") : null };
}

type Tone = "overdue" | "today" | "soon" | "later";

function dueTone(iso: string): Tone {
  const d = parseISO(iso);
  // An all-day date sits at local midnight, so it always looks "past" on the
  // day itself — check for today first and only then for genuinely overdue.
  if (isToday(d)) return hasTime(iso) && isPast(d) ? "overdue" : "today";
  if (isPast(d)) return "overdue";
  if (isTomorrow(d)) return "soon";
  return "later";
}

export default function NotionTasksWidget({ mode = "school" }: { mode?: "school" | "personal" }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showAddDue, setShowAddDue] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Which card's due date is being edited, and the draft values for it.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Which card has its "where did this come from" note open.
  const [noteId, setNoteId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");

  /* Doesn't raise the spinner itself — the first load starts with it already up,
     and the ↻ button raises it before calling in. Keeping it out of here is what
     lets the effect below call this without an extra render on the way in. */
  const load = useCallback(() => {
    demoFetch("/api/notion")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks ?? []);
        setError(d.error ?? null);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistic status change: move the task instantly, then persist to Notion.
  const changeStatus = async (id: string, status: string) => {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
    setUpdating(id);
    try {
      const res = await demoFetch("/api/notion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Notion update failed");
    } catch {
      setTasks(prev); // revert on failure
    } finally {
      setUpdating(null);
    }
  };

  const openDueEditor = (task: Task) => {
    if (editingId === task.id) { setEditingId(null); return; }
    const { date, time } = splitDue(task.dueDate);
    setDraftDate(date);
    setDraftTime(time);
    setEditingId(task.id);
    setConfirmId(null);
  };

  // Same optimistic pattern as the status move: retime the card, then persist.
  const saveDue = async (id: string, dueDate: string | null) => {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, dueDate } : t)));
    setEditingId(null);
    setUpdating(id);
    try {
      const res = await demoFetch("/api/notion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, dueDate }),
      });
      if (!res.ok) throw new Error("Notion update failed");
    } catch {
      setTasks(prev);
    } finally {
      setUpdating(null);
    }
  };

  // Quick-add: Enter creates the task in the right Notion database.
  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || addingTask) return;
    setAddingTask(true);
    try {
      const res = await demoFetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueDate: joinDue(newDate, newTime), isSchool: mode === "school" }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDate("");
        setNewTime("");
        setShowAddDue(false);
        load();
      }
    } finally {
      setAddingTask(false);
    }
  };

  // Remove a task from Notion (archived, so it's recoverable from the trash).
  const removeTask = async (id: string) => {
    const prev = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== id));
    setUpdating(id);
    try {
      const res = await demoFetch(`/api/notion?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setTasks(prev);
    } finally {
      setUpdating(null);
      setConfirmId(null);
    }
  };

  const windowEnd = addDays(startOfDay(new Date()), WINDOW_DAYS);

  // Filter: this widget's mode, and due within the next week (or overdue, or undated).
  const inScope = tasks
    .filter((t) => (mode === "school" ? t.isSchool : !t.isSchool))
    .filter((t) => {
      if (!t.dueDate) return true;
      return parseISO(t.dueDate) <= windowEnd;
    });

  const grouped: Record<Stage, Task[]> = { "Not Started": [], "In Progress": [], Done: [] };
  for (const t of inScope) {
    const stage = (STAGES.includes(t.status as Stage) ? t.status : "Not Started") as Stage;
    grouped[stage].push(t);
  }

  const activeCount = grouped["Not Started"].length + grouped["In Progress"].length;

  return (
    <div className="flex flex-col h-full">
      <div className="widget-head">
        <p className="section-label">{mode === "school" ? "School Tasks" : "Personal Tasks"}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {activeCount} this week
          </span>
          <button onClick={() => { setLoading(true); load(); }} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)" }}>↻</button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
          <span className="empty-mark" aria-hidden>!</span>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      ) : (
        /* Horizontal funnel: every stage keeps its column, even when empty, so
           the pipeline is always readable end to end. */
        <div className="funnel flex-1">
          {STAGES.map((stage, si) => {
            const items = grouped[stage];
            const meta = STAGE_META[stage];
            return (
              <section key={stage} className="funnel-col">
                <div className="funnel-head">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.dot }} />
                  <span className="funnel-stage">{stage}</span>
                  <span className="funnel-count tabular-nums">{items.length}</span>
                  {si < STAGES.length - 1 && <span className="funnel-rule" aria-hidden />}
                </div>

                <div className="funnel-items widget-scroll">
                  {items.length === 0 && (
                    <p className="funnel-empty">
                      {stage === "Done" ? "Nothing finished yet" : stage === "In Progress" ? "Nothing started" : "All clear"}
                    </p>
                  )}
                  {items.map((task) => {
                    const isDone = task.status === "Done";
                    const due = task.dueDate ? describeDue(task.dueDate) : null;
                    const tone = task.dueDate && !isDone ? dueTone(task.dueDate) : "later";
                    return (
                      <article
                        key={task.id}
                        className="funnel-card group"
                        style={{
                          background: isDone ? "rgba(78,203,113,0.06)" : "rgba(255,249,232,0.03)",
                          opacity: updating === task.id ? 0.5 : 1,
                        }}
                      >
                        <div className="flex items-start gap-1.5">
                          {task.priority && !isDone && (
                            <span className="funnel-priority" style={{ background: PRIORITY_DOT[task.priority] ?? "var(--text-secondary)" }} />
                          )}
                          <p
                            className="funnel-title"
                            title={task.title}
                            style={{ textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-secondary)" : "var(--text-primary)" }}
                          >
                            {task.title}
                          </p>
                          <button
                            className="funnel-del"
                            onClick={() => setConfirmId(confirmId === task.id ? null : task.id)}
                            title={`Remove "${task.title}"`}
                            aria-label={`Remove "${task.title}"`}
                          >
                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <path d="M1.5 1.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>

                        {confirmId === task.id && (
                          <div className="funnel-confirm">
                            <span>Remove?</span>
                            <button onClick={() => removeTask(task.id)} className="danger">Yes</button>
                            <button onClick={() => setConfirmId(null)}>No</button>
                          </div>
                        )}

                        <div className="funnel-meta">
                          {task.course && <span className="funnel-course">{task.course}</span>}
                          {task.origin && (
                            <button
                              className="funnel-origin"
                              data-origin={task.origin}
                              data-open={noteId === task.id || undefined}
                              onClick={() => setNoteId(noteId === task.id ? null : task.id)}
                              aria-expanded={noteId === task.id}
                              title={task.note ? "Where this task came from" : undefined}
                            >
                              {ORIGIN_LABEL[task.origin] ?? task.origin}
                            </button>
                          )}
                          {due ? (
                            <button
                              className="funnel-due"
                              data-tone={isDone ? "done" : tone}
                              onClick={() => openDueEditor(task)}
                              title="Change the due date and time"
                              aria-label={`Due ${due.day}${due.time ? ` at ${due.time}` : ""} — change`}
                            >
                              <svg viewBox="0 0 14 14" width="11" height="11" fill="none" aria-hidden>
                                <rect x="1.2" y="2.4" width="11.6" height="10.4" rx="2" stroke="currentColor" strokeWidth="1.3" />
                                <path d="M1.2 5.6h11.6M4.4 1.2v2.4M9.6 1.2v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                              <span className="funnel-due-day">{due.day}</span>
                              {/* No "all day" label: a task without a time is the
                                  norm, so only a real time is worth the ink. */}
                              {due.time && <span className="funnel-due-time">{due.time}</span>}
                            </button>
                          ) : (
                            <button className="funnel-due-add" onClick={() => openDueEditor(task)}>
                              + due date
                            </button>
                          )}
                        </div>

                        {noteId === task.id && task.note && (
                          <p className="funnel-note">{task.note}</p>
                        )}

                        {editingId === task.id && (
                          <div className="due-editor">
                            <div className="due-editor-row">
                              <input
                                type="date"
                                value={draftDate}
                                onChange={(e) => setDraftDate(e.target.value)}
                                aria-label="Due date"
                              />
                              <input
                                type="time"
                                value={draftTime}
                                onChange={(e) => setDraftTime(e.target.value)}
                                aria-label="Due time"
                              />
                            </div>
                            <div className="due-editor-row">
                              <button
                                className="due-editor-save"
                                disabled={!draftDate}
                                onClick={() => saveDue(task.id, joinDue(draftDate, draftTime))}
                              >
                                Save
                              </button>
                              {draftTime && (
                                <button onClick={() => setDraftTime("")}>All day</button>
                              )}
                              {task.dueDate && (
                                <button onClick={() => saveDue(task.id, null)}>Clear</button>
                              )}
                              <button onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* Move between stages. Buttons, not a select: the column
                            already says where the task is. */}
                        <div className="funnel-move">
                          {STAGES.filter((s) => s !== task.status).map((s) => (
                            <button
                              key={s}
                              disabled={updating === task.id}
                              onClick={() => changeStatus(task.id, s)}
                              title={`Move to ${s}`}
                              aria-label={`Move "${task.title}" to ${s}`}
                            >
                              {s === "Done" ? "✓ Done" : s === "In Progress" ? "→ Doing" : "← To do"}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Quick add — with an optional due date and time before it's created. */}
      <div className="task-add">
        <div className="task-add-row">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            placeholder={`+ Add ${mode} task…`}
            className="task-add-input"
          />
          <button
            className="task-add-when"
            data-active={showAddDue || Boolean(newDate)}
            onClick={() => setShowAddDue((v) => !v)}
            aria-expanded={showAddDue}
            title="Set a due date and time"
          >
            {newDate ? `${format(parseISO(newDate), "MMM d")}${newTime ? ` · ${newTime}` : ""}` : "When?"}
          </button>
          {newTitle.trim() && (
            <button onClick={addTask} disabled={addingTask} className="task-add-save">
              {addingTask ? "…" : "Add"}
            </button>
          )}
        </div>
        {showAddDue && (
          <div className="task-add-row">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Due date" />
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Due time" />
            {(newDate || newTime) && (
              <button className="task-add-clear" onClick={() => { setNewDate(""); setNewTime(""); }}>Clear</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
