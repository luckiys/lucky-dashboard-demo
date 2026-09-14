"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  format, addDays, addWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isSameMonth,
  differenceInMinutes, startOfDay,
} from "date-fns";
import { addCustomEvent, deleteCustomEvent, loadCustomEvents, onCustomEventsChanged } from "@/lib/customEvents";
import { demoFetch } from "@/lib/demo/demoFetch";

type View = "day" | "week" | "month";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  custom?: boolean;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  course: string | null;
  priority: string | null;
  status: string;
  isSchool: boolean;
}

const HOUR_H = 44; // px per hour in the time grid
const PRIORITY_COLOR: Record<string, string> = { High: "#ef4444", Medium: "#f97316", Low: "#4ecb71" };

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function eventOnDay(ev: CalEvent, day: Date): boolean {
  if (ev.allDay) return ev.start.slice(0, 10) === dayKey(day);
  return isSameDay(new Date(ev.start), day);
}

// Assign overlapping timed events to side-by-side lanes (like Google Calendar).
function layoutDayEvents(events: CalEvent[]) {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const laneEnds: number[] = [];
  const placed = timed.map((ev) => {
    const s = new Date(ev.start).getTime();
    const e = new Date(ev.end).getTime();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); }
    else laneEnds[lane] = e;
    return { ev, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

export default function CalendarWidget() {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [miniMonth, setMiniMonth] = useState(new Date());
  const [feedEvents, setFeedEvents] = useState<CalEvent[]>([]);
  const [mine, setMine] = useState<CalEvent[]>([]);
  const [composing, setComposing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const containerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width > 520));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const range = useMemo(() => {
    if (view === "day") return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 1) };
    if (view === "week") return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) };
  }, [view, cursor]);

  const rangeStartISO = range.start.toISOString();
  const rangeEndISO = range.end.toISOString();

  useEffect(() => {
    const s = addDays(new Date(rangeStartISO), -7).toISOString();
    const e = addDays(new Date(rangeEndISO), 7).toISOString();
    demoFetch(`/api/calendar?start=${s}&end=${e}`)
      .then((r) => r.json())
      .then((d) => { setFeedEvents(d.events ?? []); setError(d.error ?? null); })
      .catch((err) => setError(err.message));
  }, [rangeStartISO, rangeEndISO]);

  // Events created on the dashboard, kept in this browser and merged with the
  // read-only Google feed.
  useEffect(() => {
    const sync = () => setMine(loadCustomEvents());
    sync();
    return onCustomEventsChanged(sync);
  }, []);

  const events = useMemo<CalEvent[]>(() => [...feedEvents, ...mine], [feedEvents, mine]);

  useEffect(() => {
    demoFetch("/api/notion")
      .then((r) => r.json())
      .then((d) => setTasks((d.tasks ?? []).filter((t: Task) => t.dueDate)));
  }, []);

  useEffect(() => {
    if ((view === "week" || view === "day") && gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 7 * HOUR_H;
    }
  }, [view]);

  const days = useMemo(() => eachDayOfInterval({ start: range.start, end: range.end }), [range]);

  const tasksOnDay = (day: Date) => tasks.filter((t) => t.dueDate?.slice(0, 10) === dayKey(day));
  const allDayEventsOnDay = (day: Date) => events.filter((e) => e.allDay && eventOnDay(e, day));
  const timedEventsOnDay = (day: Date) => events.filter((e) => !e.allDay && eventOnDay(e, day));

  const nav = (dir: 1 | -1) => {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addMonths(c, dir));
  };
  const goToday = () => { setCursor(new Date()); setMiniMonth(new Date()); };

  const periodLabel = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, MMMM d");
    if (view === "month") return format(cursor, "MMMM yyyy");
    const s = startOfWeek(cursor), e = endOfWeek(cursor);
    return isSameMonth(s, e) ? `${format(s, "MMM d")} – ${format(e, "d")}` : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  }, [view, cursor]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Header */}
      <div className="widget-head">
        <p className="section-label">Calendar</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setComposing((c) => !c)}
            className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
            style={{
              color: composing ? "var(--accent-purple)" : "var(--text-secondary)",
              border: `1px solid ${composing ? "rgba(201,242,79,0.4)" : "var(--border)"}`,
            }}
            aria-expanded={composing}
          >
            + Event
          </button>
          <button onClick={goToday} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Today</button>
          <button onClick={() => nav(-1)} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>‹</button>
          <button onClick={() => nav(1)} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>›</button>
          <div className="flex rounded-lg overflow-hidden ml-1" style={{ border: "1px solid var(--border)" }}>
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className="text-xs px-2 py-1 capitalize transition-colors"
                style={{ background: view === v ? "rgba(201,242,79,0.2)" : "transparent", color: view === v ? "var(--accent-purple)" : "var(--text-secondary)" }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{periodLabel}</p>

      {composing && (
        <EventComposer
          defaultDate={dayKey(cursor)}
          onClose={() => setComposing(false)}
          onCreate={(input) => { addCustomEvent(input); setComposing(false); }}
        />
      )}

      {error && (
        <div className="text-xs mb-2 px-2 py-1 rounded-lg" style={{ color: "var(--accent-orange)", background: "rgba(249,115,22,0.1)" }}>{error}</div>
      )}

      <div className="flex gap-3 flex-1 min-h-0">
        {wide && (
          <div className="flex-shrink-0" style={{ width: 150 }}>
            <MiniCalendar month={miniMonth} selected={cursor} onPrev={() => setMiniMonth((m) => subMonths(m, 1))} onNext={() => setMiniMonth((m) => addMonths(m, 1))} onPick={(d) => setCursor(d)} />
            <UpcomingList tasks={tasks} events={events} />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {view === "month" ? (
            <MonthView cursor={cursor} tasksOnDay={tasksOnDay} allDayEventsOnDay={allDayEventsOnDay} timedEventsOnDay={timedEventsOnDay} onPickDay={(d) => { setCursor(d); setView("day"); }} />
          ) : (
            <TimeGrid days={days} gridScrollRef={gridScrollRef} now={now} tasksOnDay={tasksOnDay} allDayEventsOnDay={allDayEventsOnDay} timedEventsOnDay={timedEventsOnDay} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mini month calendar ---------------- */
function MiniCalendar({ month, selected, onPrev, onNext, onPick }: {
  month: Date; selected: Date; onPrev: () => void; onNext: () => void; onPick: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{format(month, "MMM yyyy")}</span>
        <div className="flex gap-0.5">
          <button onClick={onPrev} className="text-xs px-1 rounded hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>‹</button>
          <button onClick={onNext} className="text-xs px-1 rounded hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>{d}</div>
        ))}
        {days.map((d) => {
          const sel = isSameDay(d, selected);
          const tod = isToday(d);
          return (
            <button key={d.toISOString()} onClick={() => onPick(d)}
              className="aspect-square rounded flex items-center justify-center transition-colors"
              style={{
                fontSize: "var(--fs-micro)",
                background: sel ? "var(--accent-purple)" : tod ? "rgba(255,255,255,0.08)" : "transparent",
                color: sel ? "#fff" : isSameMonth(d, month) ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: isSameMonth(d, month) ? 1 : 0.4,
              }}>
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Upcoming list ---------------- */
function UpcomingList({ tasks, events }: { tasks: Task[]; events: CalEvent[] }) {
  const today = startOfDay(new Date());
  // `when` is always a bare yyyy-MM-dd (task due dates from Notion may carry a time component).
  const items = [
    ...tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today).map((t) => ({ when: t.dueDate!.slice(0, 10), label: t.title, color: t.priority ? PRIORITY_COLOR[t.priority] : "var(--accent-purple)" })),
    ...events.filter((e) => new Date(e.start) >= today).map((e) => ({ when: e.start.slice(0, 10), label: e.title, color: "var(--accent-blue)" })),
  ]
    .filter((it) => !isNaN(new Date(it.when + "T12:00:00").getTime()))
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 5);

  if (items.length === 0) return null;
  return (
    <div>
      <p className="section-label mb-1.5">Upcoming</p>
      <div className="flex flex-col gap-1">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: it.color }} />
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: "var(--fs-tiny)", color: "var(--text-primary)" }} title={it.label}>{it.label}</p>
              <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>{format(new Date(it.when + "T12:00:00"), "EEE, MMM d")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Week / Day time grid ---------------- */
function TimeGrid({ days, gridScrollRef, now, tasksOnDay, allDayEventsOnDay, timedEventsOnDay }: {
  days: Date[];
  gridScrollRef: React.RefObject<HTMLDivElement | null>;
  now: Date;
  tasksOnDay: (d: Date) => Task[];
  allDayEventsOnDay: (d: Date) => CalEvent[];
  timedEventsOnDay: (d: Date) => CalEvent[];
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cols = `40px repeat(${days.length}, 1fr)`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="text-center pb-1">
            <div style={{ fontSize: "var(--fs-tiny)", color: "var(--text-secondary)" }}>{format(d, "EEE")}</div>
            <div className="mx-auto flex items-center justify-center rounded-full" style={{
              width: 22, height: 22, fontSize: "12px", fontWeight: 600,
              background: isToday(d) ? "var(--accent-blue)" : "transparent",
              color: isToday(d) ? "#fff" : "var(--text-primary)",
            }}>{format(d, "d")}</div>
          </div>
        ))}
      </div>

      {/* All-day strip */}
      <div className="grid border-b" style={{ gridTemplateColumns: cols, borderColor: "var(--border)" }}>
        <div className="text-right pr-1" style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)", paddingTop: 2 }}>all-day</div>
        {days.map((d) => (
          <div key={d.toISOString()} className="px-0.5 py-0.5 flex flex-col gap-0.5 border-l" style={{ borderColor: "var(--border)", minHeight: 18 }}>
            {allDayEventsOnDay(d).map((e) => (
              <div key={e.id} className="rounded px-1 flex items-center gap-1 group cal-event"
                style={{
                  fontSize: "var(--fs-micro)",
                  background: e.custom ? "rgba(201,242,79,0.2)" : "rgba(79,158,248,0.2)",
                  color: e.custom ? "var(--accent-purple)" : "var(--accent-blue)",
                }}
                title={e.title}>
                <span className="truncate">{e.title}</span>
                {e.custom && (
                  <button className="cal-del-inline no-drag" onClick={() => deleteCustomEvent(e.id)}
                    title={`Delete "${e.title}"`} aria-label={`Delete "${e.title}"`}>×</button>
                )}
              </div>
            ))}
            {tasksOnDay(d).map((t) => (
              <div key={t.id} className="truncate rounded px-1" style={{ fontSize: "var(--fs-micro)", background: "rgba(201,242,79,0.18)", color: "var(--accent-purple)" }} title={`Due: ${t.title}`}>
                {t.course ? `${t.course} · ` : ""}{t.title}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={gridScrollRef} className="widget-scroll flex-1 min-h-0">
        <div className="grid relative" style={{ gridTemplateColumns: cols, height: 24 * HOUR_H }}>
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="absolute right-1 -translate-y-1/2" style={{ top: h * HOUR_H, fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>
                {h === 0 ? "" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const { placed, lanes } = layoutDayEvents(timedEventsOnDay(d));
            return (
              <div key={d.toISOString()} className="relative border-l" style={{ borderColor: "var(--border)" }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0" style={{ top: h * HOUR_H, borderTop: "1px solid var(--border)", opacity: 0.5 }} />
                ))}
                {isToday(d) && (
                  <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: (nowMin / 60) * HOUR_H }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
                    <div className="flex-1 h-px" style={{ background: "#ef4444" }} />
                  </div>
                )}
                {placed.map(({ ev, lane }) => {
                  const s = new Date(ev.start);
                  const e = new Date(ev.end);
                  const top = (s.getHours() * 60 + s.getMinutes()) / 60 * HOUR_H;
                  const height = Math.max(18, (differenceInMinutes(e, s) / 60) * HOUR_H - 2);
                  const width = 100 / lanes;
                  return (
                    <div key={ev.id} className="absolute rounded px-1 overflow-hidden z-10 group cal-event" title={`${ev.title}${ev.location ? " · " + ev.location : ""}`}
                      style={{
                        top, height, left: `calc(${lane * width}% + 1px)`, width: `calc(${width}% - 2px)`,
                        // Events you added read chartreuse; the Google feed stays blue.
                        background: ev.custom ? "rgba(201,242,79,0.85)" : "rgba(79,158,248,0.85)",
                        color: ev.custom ? "#10100a" : "#fff",
                        borderLeft: `2px solid ${ev.custom ? "#9dc32b" : "#1d6fd6"}`,
                      }}>
                      {ev.custom && (
                        <button className="cal-del no-drag" onClick={() => deleteCustomEvent(ev.id)}
                          title={`Delete "${ev.title}"`} aria-label={`Delete "${ev.title}"`}>×</button>
                      )}
                      <div className="truncate" style={{ fontSize: "var(--fs-micro)", fontWeight: 600, lineHeight: 1.2 }}>{ev.title}</div>
                      {height > 30 && <div className="truncate" style={{ fontSize: "var(--fs-micro)", opacity: 0.9 }}>{format(s, "h:mm")}–{format(e, "h:mma")}</div>}
                      {height > 44 && ev.location && <div className="truncate" style={{ fontSize: "var(--fs-micro)", opacity: 0.85 }}>{ev.location}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Month view ---------------- */
function MonthView({ cursor, tasksOnDay, allDayEventsOnDay, timedEventsOnDay, onPickDay }: {
  cursor: Date;
  tasksOnDay: (d: Date) => Task[];
  allDayEventsOnDay: (d: Date) => CalEvent[];
  timedEventsOnDay: (d: Date) => CalEvent[];
  onPickDay: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center pb-1" style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 widget-scroll" style={{ gridAutoRows: "minmax(56px, 1fr)" }}>
        {days.map((d) => {
          const items = [
            ...timedEventsOnDay(d).map((e) => ({ label: e.title, color: "var(--accent-blue)" })),
            ...allDayEventsOnDay(d).map((e) => ({ label: e.title, color: "var(--accent-blue)" })),
            ...tasksOnDay(d).map((t) => ({ label: t.title, color: t.priority ? PRIORITY_COLOR[t.priority] : "var(--accent-purple)" })),
          ];
          return (
            <button key={d.toISOString()} onClick={() => onPickDay(d)}
              className="text-left p-1 border transition-colors hover:bg-white/5 overflow-hidden"
              style={{ borderColor: "var(--border)", background: isToday(d) ? "rgba(79,158,248,0.06)" : "transparent" }}>
              <div className="flex items-center justify-center rounded-full mb-0.5" style={{
                width: 18, height: 18, fontSize: "var(--fs-tiny)",
                background: isToday(d) ? "var(--accent-blue)" : "transparent",
                color: isToday(d) ? "#fff" : isSameMonth(d, cursor) ? "var(--text-primary)" : "var(--text-secondary)",
              }}>{format(d, "d")}</div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((it, i) => (
                  <div key={i} className="flex items-center gap-1 min-w-0">
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: it.color }} />
                    <span className="truncate" style={{ fontSize: "var(--fs-micro)", color: "var(--text-primary)" }} title={it.label}>{it.label}</span>
                  </div>
                ))}
                {items.length > 3 && <span style={{ fontSize: "var(--fs-micro)", color: "var(--text-secondary)" }}>+{items.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Add-event form ---------------------------------------------------- */
function EventComposer({ defaultDate, onCreate, onClose }: {
  defaultDate: string;
  onCreate: (i: { title: string; date: string; startTime?: string; endTime?: string; allDay?: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title, date, allDay, startTime: allDay ? undefined : startTime, endTime: allDay ? undefined : endTime });
  };

  return (
    <form className="event-composer no-drag" onSubmit={submit} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
        aria-label="Event title"
        className="event-composer-title"
      />
      <div className="event-composer-row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        {!allDay && (
          <>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start time" />
            <span className="event-composer-sep">to</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End time" />
          </>
        )}
        <label className="event-composer-allday">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>
        <button type="submit" className="event-composer-save" disabled={!title.trim()}>Add</button>
        <button type="button" onClick={onClose} className="event-composer-cancel">Cancel</button>
      </div>
      <p className="event-composer-note">
        Saved on this device. Your Google Calendar feed is read-only, so events added here live alongside it.
      </p>
    </form>
  );
}
