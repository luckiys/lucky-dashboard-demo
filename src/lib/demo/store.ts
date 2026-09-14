/* The demo's database.
 *
 * Every visitor gets their own copy in localStorage, seeded on first load. That
 * is deliberate: adds, deletes, status moves and the playhead all persist across
 * a refresh, but nothing a visitor does is visible to anyone else, and "Reset
 * demo" puts the board back. No server, no shared state, no keys. */

import { seedNotes, seedTasks, type DemoNote, type DemoTask } from "./seed";
import { PLAYLIST } from "./playlist";

const KEYS = {
  tasks: "demo_tasks_v1",
  notes: "demo_notes_v1",
  player: "demo_player_v1",
  seeded: "demo_seeded_v1",
} as const;

/** Bumped whenever the seed changes, so a returning visitor isn't stuck on an old board. */
const SEED_VERSION = "4";

const browser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!browser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!browser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Seed on first visit, and re-seed when the seed version moves. */
export function ensureSeeded() {
  if (!browser()) return;
  if (localStorage.getItem(KEYS.seeded) === SEED_VERSION) return;
  write(KEYS.tasks, seedTasks());
  write(KEYS.notes, seedNotes());
  localStorage.removeItem(KEYS.player);
  localStorage.setItem(KEYS.seeded, SEED_VERSION);
}

/** Wipe everything this demo owns — tasks, notes, playhead, layouts, links, clubs. */
export function resetDemo() {
  if (!browser()) return;
  const mine = [
    ...Object.values(KEYS),
    "lucky_events_v1",
    "lucky_links",
    "lucky_links_college",
    "lucky_clubs",
    "lucky_mode",
    "lucky_layout_personal_v4",
    "lucky_layout_college_v4",
    "lucky_shelf_personal_v1",
    "lucky_shelf_college_v1",
    "demo_tour_done_v1",
  ];
  for (const k of mine) localStorage.removeItem(k);
}

/* ---------- tasks ---------- */

export function getTasks(): DemoTask[] {
  ensureSeeded();
  return read<DemoTask[]>(KEYS.tasks, []);
}

export function setTasks(tasks: DemoTask[]) {
  write(KEYS.tasks, tasks);
}

export function addTask(input: {
  title: string;
  dueDate?: string | null;
  status?: DemoTask["status"];
  priority?: DemoTask["priority"];
  course?: string | null;
  isSchool?: boolean;
  origin?: DemoTask["origin"];
  note?: string;
}): DemoTask {
  // The sync writes school titles as "[COURSE] name"; mirror that so a task added
  // with a course reads the same as a synced one.
  const raw = input.title.trim();
  const match = raw.match(/^\[([^\]]+)\]\s*(.+)$/);
  const course = input.course ?? (match ? match[1] : null);
  const title = match ? match[2] : raw;

  const task: DemoTask = {
    id: `demo-${crypto.randomUUID()}`,
    title,
    status: input.status ?? "Not Started",
    priority: input.priority ?? null,
    dueDate: input.dueDate ?? null,
    course,
    isSchool: input.isSchool ?? false,
    url: "",
    origin: input.origin ?? "manual",
    note:
      input.note ??
      "You added this. In the live board the same action POSTs to the matching Notion data source and the row shows up in the workspace within a second.",
  };
  setTasks([task, ...getTasks()]);
  return task;
}

export function updateTask(id: string, patch: Partial<Pick<DemoTask, "status" | "dueDate">>): boolean {
  const tasks = getTasks();
  const i = tasks.findIndex((t) => t.id === id);
  if (i === -1) return false;
  // dueDate: null is meaningful (clear the date), so check for the key.
  tasks[i] = {
    ...tasks[i],
    ...(patch.status ? { status: patch.status } : {}),
    ...("dueDate" in patch ? { dueDate: patch.dueDate ?? null } : {}),
  };
  setTasks(tasks);
  return true;
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const next = tasks.filter((t) => t.id !== id);
  if (next.length === tasks.length) return false;
  setTasks(next);
  return true;
}

/* ---------- notes ---------- */

export function getNotes(): DemoNote[] {
  ensureSeeded();
  return read<DemoNote[]>(KEYS.notes, []);
}

export function addNote(content: string, color = "purple"): DemoNote {
  const now = new Date().toISOString();
  const note: DemoNote = { id: `demo-${crypto.randomUUID()}`, content, color, createdAt: now, updatedAt: now };
  write(KEYS.notes, [note, ...getNotes()].slice(0, 20));
  return note;
}

export function updateNote(id: string, content: string): DemoNote | null {
  const notes = getNotes();
  const i = notes.findIndex((n) => n.id === id);
  if (i === -1) return null;
  notes[i] = { ...notes[i], content, updatedAt: new Date().toISOString() };
  write(KEYS.notes, notes);
  return notes[i];
}

export function deleteNote(id: string) {
  write(KEYS.notes, getNotes().filter((n) => n.id !== id));
}

/* ---------- player ----------
   Progress is derived from the wall clock rather than stored per tick, so it keeps
   advancing while the tab is backgrounded and survives a refresh — the same way a
   real now-playing endpoint behaves. */

interface PlayerState {
  index: number;
  playing: boolean;
  /** Progress in ms at the moment `since` was stamped. */
  base: number;
  /** Epoch ms. */
  since: number;
}

function playerState(): PlayerState {
  const s = read<PlayerState | null>(KEYS.player, null);
  if (s && typeof s.index === "number") return s;
  const fresh: PlayerState = { index: 0, playing: true, base: 42_000, since: Date.now() };
  write(KEYS.player, fresh);
  return fresh;
}

function elapsed(s: PlayerState): number {
  return s.playing ? s.base + (Date.now() - s.since) : s.base;
}

/** Advance past any tracks that finished while nobody was looking. */
function normalize(s: PlayerState): PlayerState {
  let state = { ...s };
  let guard = 0;
  while (guard++ < 50) {
    const dur = PLAYLIST[state.index % PLAYLIST.length].duration;
    const at = elapsed(state);
    if (at < dur) break;
    state = { index: (state.index + 1) % PLAYLIST.length, playing: state.playing, base: 0, since: Date.now() - (at - dur) };
  }
  write(KEYS.player, state);
  return state;
}

export function nowPlaying() {
  const s = normalize(playerState());
  const t = PLAYLIST[s.index % PLAYLIST.length];
  return {
    connected: true,
    playing: s.playing,
    progress: Math.min(t.duration, Math.max(0, elapsed(s))),
    duration: t.duration,
    track: t.track,
    artists: t.artists,
    album: t.album,
    image: t.image,
    url: t.url,
    demo: true,
  };
}

export function control(action: "play" | "pause" | "next" | "prev") {
  const s = normalize(playerState());
  const at = elapsed(s);
  switch (action) {
    case "play":
      write(KEYS.player, { ...s, playing: true, base: at, since: Date.now() });
      break;
    case "pause":
      write(KEYS.player, { ...s, playing: false, base: at, since: Date.now() });
      break;
    case "next":
      write(KEYS.player, { ...s, index: (s.index + 1) % PLAYLIST.length, base: 0, since: Date.now() });
      break;
    case "prev":
      // Same as every player: restart the track unless you're already near the top.
      if (at > 4000) write(KEYS.player, { ...s, base: 0, since: Date.now() });
      else write(KEYS.player, { ...s, index: (s.index - 1 + PLAYLIST.length) % PLAYLIST.length, base: 0, since: Date.now() });
      break;
  }
}
