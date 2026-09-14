// Events you create on the dashboard.
//
// The Google Calendar feed is a read-only ICS URL, so events added here live
// alongside it rather than in Google. They're stored per-browser and merged
// into the calendar view at render time.

export interface CustomEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  allDay: boolean;
  location: string | null;
  custom: true;
}

const KEY = "lucky_events_v1";
const CHANGED = "lucky:events-changed";

export function loadCustomEvents(): CustomEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    // Anything in localStorage is untrusted input — an older schema, a half-written
    // value, or another tab's key. Validate the three fields the calendar reads
    // rather than casting and hoping.
    return (raw as Partial<CustomEvent>[])
      .filter((e) => Boolean(e) && typeof e.id === "string" && typeof e.title === "string" && typeof e.start === "string")
      .map((e) => ({ ...e, custom: true as const }) as CustomEvent);
  } catch {
    return [];
  }
}

function save(events: CustomEvent[]) {
  try { localStorage.setItem(KEY, JSON.stringify(events)); } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

export function addCustomEvent(input: {
  title: string;
  date: string;          // YYYY-MM-DD
  startTime?: string;    // HH:mm
  endTime?: string;      // HH:mm
  allDay?: boolean;
  location?: string | null;
}): CustomEvent | null {
  const title = input.title?.trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;

  const allDay = input.allDay ?? !input.startTime;
  let start: Date, end: Date;
  if (allDay) {
    start = new Date(`${input.date}T00:00:00`);
    end = new Date(`${input.date}T23:59:59`);
  } else {
    start = new Date(`${input.date}T${input.startTime}:00`);
    // Default to a one-hour block when no end is given.
    end = input.endTime
      ? new Date(`${input.date}T${input.endTime}:00`)
      : new Date(start.getTime() + 60 * 60 * 1000);
    if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  if (Number.isNaN(start.getTime())) return null;

  const ev: CustomEvent = {
    id: `custom-${crypto.randomUUID()}`,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: input.location?.trim() || null,
    custom: true,
  };
  save([...loadCustomEvents(), ev]);
  return ev;
}

export function deleteCustomEvent(id: string): boolean {
  const all = loadCustomEvents();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  save(next);
  return true;
}

// Delete by title (and optional date) — what the assistant has to work with.
export function deleteCustomEventByTitle(title: string, date?: string): CustomEvent | null {
  const q = title.trim().toLowerCase();
  const match = loadCustomEvents().find(
    (e) => e.title.toLowerCase().includes(q) && (!date || e.start.slice(0, 10) === date)
  );
  if (!match) return null;
  deleteCustomEvent(match.id);
  return match;
}

export function onCustomEventsChanged(fn: () => void): () => void {
  window.addEventListener(CHANGED, fn);
  window.addEventListener("storage", fn); // other tabs
  return () => {
    window.removeEventListener(CHANGED, fn);
    window.removeEventListener("storage", fn);
  };
}
