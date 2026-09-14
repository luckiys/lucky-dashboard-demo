"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { ReactGridLayout, WidthProvider, type Layout, type LayoutItem } from "react-grid-layout/legacy";
import ClockWidget from "@/components/widgets/ClockWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import NotionTasksWidget from "@/components/widgets/NotionTasksWidget";
import NewsWidget from "@/components/widgets/NewsWidget";
import QuickNotesWidget from "@/components/widgets/QuickNotesWidget";
import PomodoroWidget from "@/components/widgets/PomodoroWidget";
import QuickLinksWidget from "@/components/widgets/QuickLinksWidget";
import SpotifyWidget from "@/components/widgets/SpotifyWidget";
import AIAssistantWidget from "@/components/widgets/AIAssistantWidget";
import LectureStudioWidget from "@/components/widgets/LectureStudioWidget";
import ClubsWidget from "@/components/widgets/ClubsWidget";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import DemoBanner from "@/components/demo/DemoBanner";
import DemoTour, { TOUR_KEY } from "@/components/demo/DemoTour";
import WidgetInfo from "@/components/demo/WidgetInfo";
import { addCustomEvent, deleteCustomEventByTitle } from "@/lib/customEvents";
import { demoFetch } from "@/lib/demo/demoFetch";
import { ensureSeeded, resetDemo } from "@/lib/demo/store";
import type { ChatActionArgs, Forecast, Task } from "@/lib/types";

const GridLayout = WidthProvider(ReactGridLayout);

type Mode = "personal" | "college";

const MODE_KEY = "lucky_mode";
// v3: weather sized to show the full forecast; stale v2 layouts could overlap.
const LAYOUT_KEYS: Record<Mode, string> = {
  personal: "lucky_layout_personal_v4",
  college: "lucky_layout_college_v4",
};
// Widgets sent to the shelf. Their geometry stays in the layout so restoring
// puts them back exactly where they were.
const SHELF_KEYS: Record<Mode, string> = {
  personal: "lucky_shelf_personal_v1",
  college: "lucky_shelf_college_v1",
};

// 12 cols, rowHeight 40, margin 16 → px height = 56*h - 16.
// Tasks and calendar own the board; utilities live in a compact left rail.
// Every column stack sums to the same total height, so both boards tile with zero holes.
const DEFAULT_LAYOUTS: Record<Mode, Layout> = {
  personal: [
    // Left rail (utilities). Weather gets room for current + 5-day forecast;
    // Spotify adapts its layout to whatever height it's given.
    { i: "clock",     x: 0, y: 0,  w: 3, h: 4,  minW: 2, minH: 3 },
    { i: "weather",   x: 0, y: 4,  w: 3, h: 8,  minW: 2, minH: 5 },
    { i: "spotify",   x: 0, y: 12, w: 3, h: 5,  minW: 2, minH: 3 },
    { i: "pomodoro",  x: 0, y: 17, w: 3, h: 6,  minW: 2, minH: 5 },
    { i: "notes",     x: 0, y: 23, w: 3, h: 5,  minW: 2, minH: 4 },
    // Center: tasks get 6 columns so the funnel has room to run horizontally.
    { i: "school",    x: 3, y: 0,  w: 6, h: 9,  minW: 4, minH: 5 },
    { i: "personal",  x: 3, y: 9,  w: 6, h: 9,  minW: 4, minH: 5 },
    { i: "calendar",  x: 3, y: 18, w: 6, h: 10, minW: 3, minH: 6 },
    // Right rail
    { i: "assistant", x: 9, y: 0,  w: 3, h: 14, minW: 2, minH: 5 },
    { i: "news",      x: 9, y: 14, w: 3, h: 9,  minW: 2, minH: 4 },
    { i: "links",     x: 9, y: 23, w: 3, h: 5,  minW: 2, minH: 3 },
  ],
  college: [
    { i: "school",    x: 0, y: 0,  w: 6, h: 12, minW: 4, minH: 5 },
    { i: "calendar",  x: 6, y: 0,  w: 6, h: 12, minW: 3, minH: 6 },
    { i: "lecture",   x: 0, y: 12, w: 6, h: 12, minW: 4, minH: 6 },
    { i: "assistant", x: 6, y: 12, w: 3, h: 12, minW: 2, minH: 5 },
    { i: "clubs",     x: 9, y: 12, w: 3, h: 6,  minW: 2, minH: 3 },
    { i: "pomodoro",  x: 9, y: 18, w: 3, h: 6,  minW: 2, minH: 5 },
    { i: "collegelinks", x: 0, y: 24, w: 12, h: 4, minW: 2, minH: 3 },
  ],
};

function overlapArea(a: LayoutItem, b: { x: number; y: number; w: number; h: number }): number {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox * oy;
}

const GRID_COLS = 12;

/* ---- Layout integrity ----
   react-grid-layout's own correctBounds only clamps x/w to the column count —
   it will happily render a layout that violates a widget's own minW/minH, or
   one where two cards sit on the same cells. Every layout we save goes through
   these first, so a bad drop can't leave the board painted over itself. */

function clampItem(it: LayoutItem): LayoutItem {
  const w = Math.min(GRID_COLS, Math.max(it.minW ?? 1, it.w));
  const h = Math.max(it.minH ?? 1, it.h);
  return { ...it, w, h, x: Math.min(Math.max(0, it.x), GRID_COLS - w), y: Math.max(0, it.y) };
}

// Walk in reading order and push each collision below whatever it landed on.
// That guarantees no overlap while keeping the board recognisable, instead of
// reshuffling everything the way a full compaction would.
function resolveOverlaps(items: Layout): Layout {
  const placed: LayoutItem[] = [];
  for (const raw of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const it = clampItem(raw);
    for (let guard = 0; guard < 200; guard++) {
      const hit = placed.find((p) => overlapArea(p, it) > 0);
      if (!hit) break;
      it.y = hit.y + hit.h;
    }
    placed.push(it);
  }
  const byId = new Map(placed.map((p) => [p.i, p]));
  return items.map((it) => byId.get(it.i) ?? it); // original order: React keys stay put
}

// Close the vertical holes a resize or a swap leaves behind. Each card floats
// up until it meets another; x never changes, so deliberate side-by-side
// placement survives.
function floatUp(items: Layout): Layout {
  const placed: LayoutItem[] = [];
  for (const raw of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const it = { ...raw };
    while (it.y > 0) {
      const probe = { ...it, y: it.y - 1 };
      if (placed.some((p) => overlapArea(p, probe) > 0)) break;
      it.y = probe.y;
    }
    placed.push(it);
  }
  const byId = new Map(placed.map((p) => [p.i, p]));
  return items.map((it) => byId.get(it.i) ?? it);
}

// Shelved widgets aren't on the board, so their stored geometry must be left
// exactly as it is — restoring them depends on it.
function sanitizeLayout(next: Layout, shelvedIds: string[], tidy = false): Layout {
  const onBoard = next.filter((l) => !shelvedIds.includes(l.i));
  const resolved = resolveOverlaps(onBoard);
  const fixed = new Map((tidy ? floatUp(resolved) : resolved).map((l) => [l.i, l]));
  return next.map((l) => fixed.get(l.i) ?? l);
}

// Swap targeting: the widget under the dragged card's CENTER wins (precise, matches
// where the user is pointing). Falls back to largest overlap for big/small mismatches.
function findSwapTarget(items: Layout, movingId: string, rect: LayoutItem): LayoutItem | null {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let centerHit: LayoutItem | null = null;
  let best: LayoutItem | null = null;
  let bestArea = 0;
  for (const it of items) {
    if (it.i === movingId) continue;
    if (cx >= it.x && cx < it.x + it.w && cy >= it.y && cy < it.y + it.h) centerHit = it;
    const area = overlapArea(it, rect);
    if (area > bestArea) { bestArea = area; best = it; }
  }
  return centerHit ?? (bestArea > 0 ? best : null);
}

// Only the size constraints — a saved layout keeps its own x/y/w/h.
function pickMins(l?: LayoutItem) {
  return l ? { minW: l.minW, minH: l.minH } : {};
}

/** The stored mode, validated. Anything unrecognised falls back to personal. */
function readMode(): Mode {
  if (typeof window === "undefined") return "personal";
  try {
    return localStorage.getItem(MODE_KEY) === "college" ? "college" : "personal";
  } catch {
    return "personal";
  }
}

/** The stored layout for a mode, repaired, or the default when there isn't a
 *  usable one. Module scope so the board's initial state can be read straight
 *  out of localStorage instead of being patched in after the first paint. */
function loadLayoutFor(m: Mode): Layout {
  if (typeof window === "undefined") return DEFAULT_LAYOUTS[m];
  try {
    const saved = localStorage.getItem(LAYOUT_KEYS[m]);
    if (saved) {
      const parsed = JSON.parse(saved) as Layout;
      const ids = new Set(parsed.map((l) => l.i));
      const complete = DEFAULT_LAYOUTS[m].every((l) => ids.has(l.i)) && parsed.length === DEFAULT_LAYOUTS[m].length;
      if (complete) {
        // Carry the current min sizes over: a layout saved before a widget's
        // minimums changed would otherwise keep re-breaking on every load.
        const mins = new Map(DEFAULT_LAYOUTS[m].map((l) => [l.i, l]));
        const withMins = parsed.map((l) => ({ ...l, ...pickMins(mins.get(l.i)) }));
        // Repair rather than discard — a single bad drop shouldn't cost the
        // whole arrangement.
        return sanitizeLayout(withMins, readShelf(m));
      }
      localStorage.removeItem(LAYOUT_KEYS[m]);
    }
  } catch {}
  return DEFAULT_LAYOUTS[m];
}

function readShelf(m: Mode): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SHELF_KEYS[m]) ?? "[]");
    const valid = new Set(DEFAULT_LAYOUTS[m].map((l) => l.i));
    if (Array.isArray(saved)) return saved.filter((id: unknown) => typeof id === "string" && valid.has(id as string));
  } catch {}
  return [];
}

// Human-readable names, used by the shelf.
const WIDGET_LABELS: Record<string, string> = {
  clock: "Local time",
  weather: "Weather",
  spotify: "Spotify",
  pomodoro: "Pomodoro",
  notes: "Quick notes",
  school: "School tasks",
  personal: "Personal tasks",
  calendar: "Calendar",
  assistant: "Assistant",
  news: "News",
  links: "Quick links",
  collegelinks: "College links",
  lecture: "Lecture studio",
  clubs: "Clubs",
};

/** No external store to watch: `hydrated` only ever changes once, when React
 *  swaps the server snapshot for the client one. */
const subscribeNever = () => () => {};

function Card({ children, highlight, onRemove, label, id }: {
  children: React.ReactNode; highlight?: boolean; onRemove?: () => void; label?: string; id: string;
}) {
  return (
    <div className={`glass card p-5 h-full w-full relative overflow-hidden widget-draggable${highlight ? " swap-target" : ""}`}>
      <div className="drag-grip">{[...Array(6)].map((_, i) => <span key={i} />)}</div>
      <WidgetInfo id={id} label={label} />
      {onRemove && (
        <button
          className="card-remove no-drag"
          onClick={onRemove}
          title={`Send ${label ?? "widget"} to the shelf`}
          aria-label={`Send ${label ?? "widget"} to the shelf`}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M1.5 1.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weather, setWeather] = useState<Forecast | null>(null);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [linksRefreshKey, setLinksRefreshKey] = useState(0);
  /* Read straight out of localStorage. These initializers also run on the server,
     where the guards inside them return the defaults — but nothing is painted
     until the client has hydrated, so the server's answer is never rendered. */
  const [mode, setMode] = useState<Mode>(readMode);
  const [layout, setLayout] = useState<Layout>(() => loadLayoutFor(readMode()));
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [shelved, setShelved] = useState<string[]>(() => readShelf(readMode()));
  const [shelfOpen, setShelfOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  /* Has the client taken over from the server-rendered markup? The board reads
     localStorage, so it cannot paint until then without a hydration mismatch.
     There is nothing to subscribe to — the snapshot simply differs between
     server and client, which is exactly what this hook is for, and unlike a
     setState in an effect it doesn't schedule an extra render pass. */
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);

  /* Mirrors of the three values the drag/resize callbacks need to read. Those
     callbacks must stay identity-stable — re-creating them while a gesture is in
     flight drops it — so they read the current board through a ref instead of
     closing over it. Synced in an effect, never during render: a render can be
     thrown away and re-run, and a ref written during one would keep the value
     from the discarded attempt. Effects flush before the next user event, so the
     handlers never see a stale board. */
  const layoutRef = useRef<Layout>(layout);
  const modeRef = useRef<Mode>(mode);
  const shelvedRef = useRef<string[]>(shelved);
  const shelfBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    layoutRef.current = layout;
    modeRef.current = mode;
    shelvedRef.current = shelved;
  }, [layout, mode, shelved]);

  // Only these render on the board; shelved widgets keep their layout entry.
  const visibleLayout = layout.filter((l) => !shelved.includes(l.i));

  // Seed the sample data before any widget asks for it. The store also seeds
  // itself on first read, so this is only about doing it once, up front.
  useEffect(ensureSeeded, []);

  // Close the shelf when clicking anywhere else.
  useEffect(() => {
    if (!shelfOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!shelfBoxRef.current?.contains(e.target as Node)) setShelfOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setShelfOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [shelfOpen]);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setLayout(loadLayoutFor(m));
    setShelved(readShelf(m));
    setShelfOpen(false);
    localStorage.setItem(MODE_KEY, m);
  };

  // Persist the shelf as a effect of the state, not at each call site — two
  // removals in the same tick would otherwise race and drop the first one.
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(SHELF_KEYS[mode], JSON.stringify(shelved)); } catch {}
  }, [shelved, mode, hydrated]);

  const loadTasks = useCallback(() => {
    demoFetch("/api/notion")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []));
  }, []);

  useEffect(() => {
    loadTasks();
    demoFetch("/api/weather").then((r) => r.json()).then(setWeather);
  }, [loadTasks]);

  // The single write path for the layout — so nothing reaches localStorage or
  // the grid without being checked for overlaps and minimum sizes first.
  const persist = useCallback((next: Layout, tidy = false) => {
    const safe = sanitizeLayout(next, shelvedRef.current, tidy);
    setLayout(safe);
    try { localStorage.setItem(LAYOUT_KEYS[modeRef.current], JSON.stringify(safe)); } catch {}
  }, []);

  // Send a widget to the shelf; its geometry is kept for a later restore.
  const shelveWidget = useCallback((id: string) => {
    setShelved((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // Bring one back. If its old spot is now taken, drop it below the board
  // instead of letting it overlap.
  const restoreWidget = useCallback((id: string) => {
    setLayout((prevLayout) => {
      const item = prevLayout.find((l) => l.i === id);
      if (!item) return prevLayout;
      const onBoard = prevLayout.filter((l) => l.i !== id && !shelvedRef.current.includes(l.i));
      if (!onBoard.some((o) => overlapArea(o, item) > 0)) return prevLayout;
      const maxY = onBoard.reduce((m, o) => Math.max(m, o.y + o.h), 0);
      const next = prevLayout.map((l) => (l.i === id ? { ...l, x: 0, y: maxY } : l));
      try { localStorage.setItem(LAYOUT_KEYS[modeRef.current], JSON.stringify(next)); } catch {}
      return next;
    });
    setShelved((prev) => prev.filter((s) => s !== id));
  }, []);

  const onDragStart = useCallback(() => setDragging(true), []);

  // Swap targeting must ignore shelved widgets — they aren't on the board.
  const boardItems = useCallback(
    () => layoutRef.current.filter((l) => !shelvedRef.current.includes(l.i)),
    []
  );

  const onDrag = useCallback((_l: Layout, _old: LayoutItem | null, newItem: LayoutItem | null) => {
    if (!newItem) return;
    const target = findSwapTarget(boardItems(), newItem.i, newItem);
    setSwapTargetId(target?.i ?? null);
  }, [boardItems]);

  const onDragStop = useCallback((_l: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
    setSwapTargetId(null);
    setDragging(false);
    if (!oldItem || !newItem) return;
    const base = layoutRef.current;
    const target = findSwapTarget(boardItems(), newItem.i, newItem);
    if (target) {
      persist(base.map((it) => {
        if (it.i === newItem.i) return { ...it, x: target.x, y: target.y, w: target.w, h: target.h };
        if (it.i === target.i) return { ...it, x: oldItem.x, y: oldItem.y, w: oldItem.w, h: oldItem.h };
        return it;
      }));
    } else {
      persist(base.map((it) => (it.i === newItem.i ? { ...it, x: oldItem.x, y: oldItem.y } : it)));
    }
  }, [persist, boardItems]);

  // Take the whole layout react-grid-layout produced: growing a card pushes its
  // neighbours down, and keeping only the resized item's w/h would throw those
  // pushes away and leave the two cards sitting on top of each other.
  const onResizeStop = useCallback((next: Layout, _old: LayoutItem | null, newItem: LayoutItem | null) => {
    if (!newItem) return;
    const moved = new Map(next.map((l) => [l.i, l]));
    persist(layoutRef.current.map((it) => {
      const m = moved.get(it.i);
      return m ? { ...it, x: m.x, y: m.y, w: m.w, h: m.h } : it;
    }));
  }, [persist]);

  // Close the gaps left by resizing and swapping, without moving anything
  // sideways. Explicit rather than automatic: silently hoisting a card the user
  // deliberately parked low would be worse than the gap.
  const tidyLayout = () => persist(layoutRef.current, true);

  // Reset restores every shelved widget too, so the board comes back whole.
  const resetLayout = () => {
    persist(DEFAULT_LAYOUTS[mode]);
    setShelved([]);
    setShelfOpen(false);
    try { localStorage.removeItem(LAYOUT_KEYS[mode]); } catch {}
  };

  const handleChatAction = async (action: string, args: ChatActionArgs) => {
    switch (action) {
      case "add_note":
        await demoFetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: args.content, color: args.color ?? "purple" }),
        });
        setNotesRefreshKey((k) => k + 1);
        break;
      case "add_task":
        await demoFetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: args.title,
            dueDate: args.dueDate,
            course: args.course,
            // The assistant picks the database; anything not explicitly school
            // lands in personal.
            isSchool: args.database === "school",
          }),
        });
        setTimeout(loadTasks, 1000);
        break;
      case "delete_task": {
        const q = String(args.title ?? "").trim().toLowerCase();
        if (!q) break;
        const scoped = args.database
          ? tasks.filter((t) => (args.database === "school" ? t.isSchool : !t.isSchool))
          : tasks;
        // Prefer an exact title, then fall back to a contains match.
        const match =
          scoped.find((t) => t.title.toLowerCase() === q) ??
          scoped.find((t) => t.title.toLowerCase().includes(q));
        if (match) {
          await demoFetch(`/api/notion?id=${encodeURIComponent(match.id)}`, { method: "DELETE" });
          setTimeout(loadTasks, 800);
        }
        break;
      }
      case "add_event":
        // Both are declared required on the tool, but this is a model's output —
        // check rather than assert, and do nothing rather than file a blank event.
        if (args.title && args.date) {
          addCustomEvent({
            title: args.title,
            date: args.date,
            startTime: args.startTime,
            endTime: args.endTime,
            allDay: args.allDay,
            location: args.location,
          });
        }
        break;
      case "delete_event":
        deleteCustomEventByTitle(String(args.title ?? ""), args.date);
        break;
      case "add_quick_link": {
        if (!args.label || !args.url) break;
        const saved = localStorage.getItem("lucky_links");
        const links: unknown[] = saved ? JSON.parse(saved) : [];
        links.push({ id: crypto.randomUUID(), label: args.label, url: args.url, icon: args.icon ?? "🔗" });
        localStorage.setItem("lucky_links", JSON.stringify(links));
        setLinksRefreshKey((k) => k + 1);
        break;
      }
    }
  };

  const activeCount = tasks.filter((t) => t.status !== "Done").length;

  // Widgets per mode. Cells render only what the layout references.
  const cells: Record<string, React.ReactNode> = {
    clock: <ClockWidget />,
    weather: <WeatherWidget />,
    assistant: <AIAssistantWidget dashboardContext={{ tasks, weather }} onAction={handleChatAction} />,
    school: <NotionTasksWidget mode="school" />,
    personal: <NotionTasksWidget mode="personal" />,
    spotify: <SpotifyWidget />,
    calendar: <CalendarWidget />,
    news: <NewsWidget />,
    notes: <QuickNotesWidget key={notesRefreshKey} />,
    pomodoro: <PomodoroWidget />,
    links: <QuickLinksWidget key={linksRefreshKey} />,
    collegelinks: <QuickLinksWidget storageKey="lucky_links_college" variant="college" />,
    lecture: <LectureStudioWidget />,
    clubs: <ClubsWidget />,
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen p-4 md:p-6 dashboard-bg">
      {!welcomeDone && (
        <WelcomeOverlay
          onDone={() => {
            setWelcomeDone(true);
            // First visit gets the tour automatically; after that it's on the
            // Tour button, so a returning visitor isn't walked through it again.
            try { if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true); } catch {}
          }}
        />
      )}
      {tourOpen && <DemoTour onClose={() => setTourOpen(false)} />}

      <DemoBanner />

      {/* Command bar */}
      <div className="command-bar mb-5 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-word">Lucky<span>OS</span></p>
            <p className="brand-status">
              <span className="brand-led" aria-hidden />
              demo build
            </p>
          </div>
        </div>

        {/* Mode switch */}
        <div data-tour="mode" className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
          {(["personal", "college"] as Mode[]).map((m) => (
            <button key={m} onClick={() => switchMode(m)}
              className="text-xs font-semibold px-4 py-1.5 rounded-full capitalize transition-all"
              style={{
                background: mode === m ? "rgba(201,242,79,0.32)" : "transparent",
                color: mode === m ? "#e3f7a8" : "var(--text-secondary)",
              }}>
              {m === "personal" ? "Personal" : "College"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full tabular-nums" style={{ background: "rgba(201,242,79,0.14)", border: "1px solid rgba(201,242,79,0.3)", color: "#e3f7a8" }}>
              {activeCount} active
            </span>
          )}
          {/* Shelf — widgets removed from the board live here */}
          <div className="relative" ref={shelfBoxRef}>
            <button data-tour="shelf" onClick={() => setShelfOpen((o) => !o)}
              className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5 flex items-center gap-1.5"
              style={{
                color: shelved.length ? "var(--accent-purple)" : "var(--text-secondary)",
                border: `1px solid ${shelved.length ? "rgba(201,242,79,0.35)" : "var(--border)"}`,
              }}
              aria-expanded={shelfOpen}
              title="Widgets you've removed from the board">
              Shelf
              {shelved.length > 0 && <span className="tabular-nums">{shelved.length}</span>}
            </button>

            {shelfOpen && (
              <div className="shelf-panel">
                <p className="shelf-title">Shelf</p>
                {shelved.length === 0 ? (
                  <p className="shelf-empty">
                    Nothing here yet. Hover a widget and hit <span aria-hidden>✕</span> to store it — it&apos;ll wait here until you put it back.
                  </p>
                ) : (
                  <ul className="shelf-list">
                    {shelved.map((id) => (
                      <li key={id}>
                        <button className="shelf-item" onClick={() => restoreWidget(id)} title={`Put ${WIDGET_LABELS[id] ?? id} back on the board`}>
                          <span>{WIDGET_LABELS[id] ?? id}</span>
                          <span className="shelf-restore">Restore</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div data-tour="tools" className="flex items-center gap-2">
            <button onClick={tidyLayout}
              className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              title="Pull the cards up to close any gaps">
              Tidy
            </button>
            <button onClick={resetLayout}
              className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              title="Restore every widget and reset positions">
              Reset
            </button>
          </div>
          <button onClick={() => setTourOpen(true)}
            className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title="Replay the intro tour">
            Tour
          </button>
          <button
            data-tour="reset-demo"
            onClick={() => {
              // Everything the demo owns lives in this browser, so a reset is a
              // wipe and a reload rather than anything server-side.
              resetDemo();
              window.location.reload();
            }}
            className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title="Restore the sample data and the default board">
            Reset demo
          </button>
        </div>
      </div>

      {/* Grid — keyed by mode so switching remounts cleanly with staggered entrances */}
      <div key={mode} className={welcomeDone ? "rgl-stagger" : "rgl-stagger"}>
        <GridLayout
          layout={visibleLayout}
          cols={12}
          rowHeight={40}
          margin={[16, 16]}
          compactType={null}
          // preventCollision refuses any resize that touches a neighbour — the
          // card just snaps back and nothing happens. Letting it through pushes
          // the neighbour instead; persist() keeps the result a valid board.
          preventCollision={false}
          allowOverlap={dragging}
          isDraggable
          isResizable
          draggableCancel="button, a, select, input, textarea, option, .no-drag"
          resizeHandles={["se"]}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
        >
          {visibleLayout.map((item) => (
            <div key={item.i} data-tour={item.i}>
              <Card
                id={item.i}
                highlight={swapTargetId === item.i}
                label={WIDGET_LABELS[item.i]}
                onRemove={() => shelveWidget(item.i)}
              >
                {cells[item.i]}
              </Card>
            </div>
          ))}
        </GridLayout>
      </div>

      <footer className="demo-foot">
        <p>
          Demo build · sample data, no live integrations · everything you change stays in your browser
        </p>
        <p>
          Drag a card onto another to swap · drag the corner to resize · ⓘ on any card explains what it&apos;s wired to
        </p>
      </footer>
    </div>
  );
}
