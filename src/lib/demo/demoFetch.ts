/* The demo's backend, running in the browser.
 *
 * The original app had a /api route for each integration. This file answers the
 * exact same paths with the exact same response shapes, so the widgets were not
 * rewritten to accommodate it — every call site just says `demoFetch` instead of
 * `fetch`. That keeps the interesting code (the widgets, the grid, the optimistic
 * updates and their rollbacks) byte-for-byte what it is in the live version.
 *
 * Everything is synchronous underneath; the delays are added on purpose so the
 * loading and error states the widgets implement are actually exercised. */

import { seedEvents, seedNews, seedWeather } from "./seed";
import * as store from "./store";
import { respond } from "./assistant";
import { ARTIFACTS, SAMPLE_CHARS, SAMPLE_NAME, SAMPLE_TEXT, type LectureKind } from "./lecture";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A plausible round-trip, so shimmer and disabled states are visible. */
const NETWORK = () => 120 + Math.random() * 180;
/** Generation is slow in the live version too; the widget's spinner should mean something. */
const GENERATION = () => 900 + Math.random() * 700;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sortTasks<T extends { dueDate: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export async function demoFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const path = url.pathname;
  const method = (init?.method ?? "GET").toUpperCase();

  const body = async <T>(): Promise<T> => {
    if (typeof init?.body === "string") return JSON.parse(init.body) as T;
    return {} as T;
  };

  /* ---------- tasks (Notion) ---------- */
  if (path === "/api/notion") {
    await wait(NETWORK());

    if (method === "GET") {
      return json({ tasks: sortTasks(store.getTasks()) });
    }

    if (method === "POST") {
      const b = await body<{ title?: string; dueDate?: string | null; course?: string; isSchool?: boolean; status?: string }>();
      if (!b.title?.trim()) return json({ error: "A task title is required" }, 400);
      const task = store.addTask({
        title: b.title,
        dueDate: b.dueDate ?? null,
        course: b.course ?? null,
        isSchool: Boolean(b.isSchool),
        status: (b.status as "Not Started") ?? "Not Started",
      });
      return json({ id: task.id, database: task.isSchool ? "school" : "personal" });
    }

    if (method === "PATCH") {
      const b = await body<{ id?: string; status?: string; dueDate?: string | null }>();
      if (!b.id) return json({ error: "A task id is required" }, 400);
      const patch: { status?: "Not Started" | "In Progress" | "Done"; dueDate?: string | null } = {};
      if (b.status) patch.status = b.status as "Not Started";
      if ("dueDate" in b) patch.dueDate = b.dueDate ?? null;
      return store.updateTask(b.id, patch) ? json({ ok: true }) : json({ error: "Not found" }, 404);
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "A task id is required" }, 400);
      return store.deleteTask(id) ? json({ ok: true, id }) : json({ error: "Not found" }, 404);
    }
  }

  /* ---------- quick notes ---------- */
  if (path === "/api/notes") {
    await wait(NETWORK());

    if (method === "GET") return json({ notes: store.getNotes() });

    if (method === "POST") {
      const b = await body<{ content?: string; color?: string }>();
      return json({ note: store.addNote(b.content ?? "", b.color ?? "purple") });
    }

    if (method === "PATCH") {
      const b = await body<{ id?: string; content?: string }>();
      const note = b.id ? store.updateNote(b.id, b.content ?? "") : null;
      return note ? json({ note }) : json({ error: "Not found" }, 404);
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (id) store.deleteNote(id);
      return json({ ok: true });
    }
  }

  /* ---------- weather (Open-Meteo shape) ---------- */
  if (path === "/api/weather") {
    await wait(NETWORK());
    return json(seedWeather());
  }

  /* ---------- news (RSS shape) ---------- */
  if (path === "/api/news") {
    await wait(NETWORK());
    const category = url.searchParams.get("category") ?? "tech";
    return json({ articles: seedNews(category), category, demo: true });
  }

  /* ---------- calendar (expanded ICS shape) ---------- */
  if (path === "/api/calendar") {
    await wait(NETWORK());
    const now = Date.now();
    const start = new Date(url.searchParams.get("start") ?? now - 42 * 864e5);
    const end = new Date(url.searchParams.get("end") ?? now + 84 * 864e5);
    return json({ events: seedEvents(start, end), demo: true });
  }

  /* ---------- spotify ---------- */
  if (path === "/api/spotify/now-playing") {
    // No delay: this polls every five seconds and the playhead should look smooth.
    return json(store.nowPlaying());
  }

  if (path === "/api/spotify/control") {
    const b = await body<{ action?: string }>();
    const action = b.action ?? "";
    if (!["play", "pause", "next", "prev"].includes(action)) return json({ error: "bad action" }, 400);
    store.control(action as "play");
    return json({ ok: true });
  }

  /* ---------- lecture studio ---------- */
  if (path === "/api/lecture") {
    // A file upload: the live route extracts the text with pdf-parse. Here any file
    // resolves to the one sample lecture the canned artifacts were written against.
    if (init?.body instanceof FormData) {
      await wait(GENERATION());
      const file = init.body.get("file");
      const name = file instanceof File ? file.name : SAMPLE_NAME;
      return json({ text: SAMPLE_TEXT, chars: SAMPLE_CHARS, name });
    }

    await wait(GENERATION());
    const b = await body<{ kind?: string }>();
    const kind = b.kind as LectureKind | undefined;
    if (!kind || !(kind in ARTIFACTS)) return json({ error: "Bad request" }, 400);
    return json({ kind, ...ARTIFACTS[kind] });
  }

  /* ---------- assistant ---------- */
  if (path === "/api/chat") {
    const b = await body<{ messages?: { role: string; content: string }[]; context?: { tasks?: never[] } }>();
    const last = [...(b.messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? "";
    // Long enough to read as thinking, short enough not to annoy.
    await wait(420 + Math.random() * 420);
    return json(respond(last, store.getTasks()));
  }

  return json({ error: `No demo handler for ${method} ${path}` }, 404);
}
