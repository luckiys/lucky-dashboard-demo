/* The demo's stand-in for the assistant.
 *
 * The live widget POSTs to /api/chat, which hands the model a system prompt plus
 * five real tool definitions — add_task, delete_task, add_event, add_note,
 * add_quick_link — and returns either prose or the tool call the model chose. The
 * dashboard then executes it.
 *
 * There is no model here, and no key to call one with. What follows is a small
 * intent matcher that emits the *same* envelope the route did, so the execution
 * half of the feature — the interesting half — is genuinely running: ask it to add
 * a task and a real row appears in the right column. It is not pretending to be an
 * LLM, and it says so when it doesn't understand. */

import type { DemoTask } from "./seed";
import { dayOffset } from "./seed";

export type ChatReply =
  | { type: "action"; action: string; args: Record<string, unknown>; message: string | null }
  | { type: "message"; content: string };

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Pull a date out of free text and return it as YYYY-MM-DD, or null. */
function parseDate(text: string): string | null {
  const t = text.toLowerCase();

  const explicit = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];

  if (/\btoday\b|\btonight\b/.test(t)) return dayOffset(0);
  if (/\btomorrow\b/.test(t)) return dayOffset(1);

  const inDays = t.match(/\bin (\d{1,2}) days?\b/);
  if (inDays) return dayOffset(Number(inDays[1]));

  if (/\bnext week\b/.test(t)) return dayOffset(7);

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) continue;
    const today = new Date().getDay();
    // "Monday" means the next one; "next Monday" means the one after that.
    let delta = (i - today + 7) % 7;
    if (delta === 0) delta = 7;
    if (/\bnext \w+day\b/.test(t)) delta += 7;
    return dayOffset(delta);
  }
  return null;
}

/** "at 3pm", "at 15:00", "by 9" → "HH:mm". */
function parseTime(text: string): string | undefined {
  const m = text.toLowerCase().match(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const mer = m[3];
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  // A bare hour is taken literally; guessing am/pm wrong is worse than not guessing.
  if (h > 23) h = 23;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** Strip the command verb and any trailing date phrase off a title. */
function cleanTitle(raw: string): string {
  return raw
    .replace(/^\s*(please\s+)?(add|create|make|new|schedule|book|set up|put|remind me to|remove|delete|drop)\s+(a\s+|an\s+|the\s+)?(task|todo|to-?do|note|event|reminder|link)?\s*(called|named|that says|:|to)?\s*/i, "")
    .replace(/\b(on|by|at|due|for)?\s*(today|tonight|tomorrow|next week|in \d{1,2} days?|\d{4}-\d{2}-\d{2}|(next\s+)?(sun|mon|tues|wednes|thurs|fri|satur)day)\b/gi, "")
    .replace(/\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,.:;-]+$/, "")
    .trim();
}

const SCHOOL_HINT =
  /\b(class|lecture|lab|quiz|exam|midterm|final|homework|hw|assignment|problem set|pset|reading|study|course|professor|cnit|stat|engr|com\s?\d|ma\s?\d)\b/i;

/** Course codes the demo knows about, so "CNIT 25501 lab" gets a badge. */
function parseCourse(text: string): string | undefined {
  const m = text.match(/\b(CNIT|STAT|ENGR|COM|MA|CS|ECE|PHYS|CHM)\s?(\d{3,5})\b/i);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : undefined;
}

function describeDue(iso: string | null): string {
  if (!iso) return "no due date";
  if (iso === dayOffset(0)) return "due today";
  if (iso === dayOffset(1)) return "due tomorrow";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `due ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

const CANT_HELP =
  "That one needs the real model. This demo runs a small intent matcher in the browser instead of calling an LLM — it handles adding and deleting tasks, notes, events and links, and summarising what's on the board. Try \"add task: finish the lab report tomorrow\".";

export function respond(text: string, tasks: DemoTask[] = []): ChatReply {
  const t = text.trim();
  const lower = t.toLowerCase();

  /* ---- delete a task ---- */
  if (/\b(delete|remove|drop|get rid of)\b/.test(lower) && /\btask|todo|to-?do\b/.test(lower)) {
    const title = cleanTitle(t);
    if (!title) return { type: "message", content: "Which task should I remove? Name a distinctive part of the title." };
    return { type: "action", action: "delete_task", args: { title }, message: null };
  }

  /* ---- add a note ---- */
  if (/\b(note|remember that|jot)\b/.test(lower) && /\b(add|make|new|jot|write|remember)\b/.test(lower)) {
    const content = cleanTitle(t) || t;
    return { type: "action", action: "add_note", args: { content, color: "purple" }, message: null };
  }

  /* ---- add a calendar event ---- */
  if (/\b(event|meeting|appointment|call|class|dinner|interview)\b/.test(lower) && /\b(add|schedule|book|put|create)\b/.test(lower)) {
    const date = parseDate(t) ?? dayOffset(0);
    const startTime = parseTime(t);
    const title = cleanTitle(t) || "New event";
    return {
      type: "action",
      action: "add_event",
      args: { title, date, startTime, allDay: !startTime },
      message: null,
    };
  }

  /* ---- add a quick link ---- */
  if (/\b(link|shortcut|bookmark)\b/.test(lower) && /\b(add|save|new)\b/.test(lower)) {
    const url = t.match(/https?:\/\/\S+/)?.[0];
    if (!url) return { type: "message", content: "Give me the URL too — \"add a link to https://example.com called Example\"." };
    const label = t.match(/\b(?:called|named|labelled|labeled)\s+(.+)$/i)?.[1]?.trim() ?? new URL(url).hostname.replace(/^www\./, "");
    return { type: "action", action: "add_quick_link", args: { label, url, icon: "🔗" }, message: null };
  }

  /* ---- add a task ---- */
  if (/\b(add|create|make|new|remind me to)\b/.test(lower)) {
    const title = cleanTitle(t);
    if (!title) return { type: "message", content: "What should the task say?" };
    const date = parseDate(t);
    const time = parseTime(t);
    const dueDate = date && time ? new Date(`${date}T${time}:00`).toISOString() : date;
    const course = parseCourse(t);
    const isSchool = Boolean(course) || SCHOOL_HINT.test(t);
    return {
      type: "action",
      action: "add_task",
      args: { title, database: isSchool ? "school" : "personal", dueDate, course },
      message: null,
    };
  }

  /* ---- read the board ---- */
  const active = tasks.filter((x) => x.status !== "Done");

  if (/\b(focus|priorit|what.*(do|due|next)|today)\b/.test(lower)) {
    if (!active.length) return { type: "message", content: "Nothing active on the board. Add a task and ask again." };
    const soonest = [...active]
      .filter((x) => x.dueDate)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 3);
    if (!soonest.length) return { type: "message", content: `${active.length} active tasks, none with a date on them. Worth giving the top one a due date.` };
    return {
      type: "message",
      content: `Start with ${soonest.map((x) => `"${x.title}" (${describeDue(x.dueDate)})`).join(", then ")}. ${active.length} active in total.`,
    };
  }

  if (/\b(recap|summar|week|overview|how.*(look|going))\b/.test(lower)) {
    const school = active.filter((x) => x.isSchool).length;
    const personal = active.length - school;
    const doing = tasks.filter((x) => x.status === "In Progress").length;
    const done = tasks.filter((x) => x.status === "Done").length;
    return {
      type: "message",
      content: `${school} school and ${personal} personal tasks open, ${doing} already in progress, ${done} finished. The school side arrives on its own from the Brightspace cron; the personal side is all hand-entered.`,
    };
  }

  if (/\b(weather|cold|rain|temperature|forecast)\b/.test(lower)) {
    return { type: "message", content: "54°F and overcast, feels like 51°F. Rain moving in tomorrow — the forecast row in the weather card has the next five days." };
  }

  if (/\b(cron|sync|brightspace|notion|how.*work|architect|built|stack)\b/.test(lower)) {
    return {
      type: "message",
      content: "School tasks come from a GitHub Actions cron running every three hours: it reads the Brightspace ICS feed, diffs it against Notion, upserts what's new, then audits the week ahead and fails the run if anything is missing. Everything else is read live — Notion, a Google Calendar ICS feed, Spotify, Open-Meteo, RSS.",
    };
  }

  if (/\b(hi|hey|hello|yo)\b/.test(lower) && lower.length < 24) {
    return { type: "message", content: "Hey. Ask me to add or remove a task, or what to focus on today." };
  }

  return { type: "message", content: CANT_HELP };
}
