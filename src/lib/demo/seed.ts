/* Seed data for the public demo.
 *
 * The real dashboard reads Notion, a Google Calendar ICS feed, Spotify, Open-Meteo
 * and a handful of RSS feeds. None of those are reachable here — there are no keys
 * and no account to read — so this file stands in for all of them.
 *
 * Everything is generated relative to "today" at call time rather than hard-coded,
 * so the board looks alive whenever someone opens it, not stale from the day it
 * was written. */

export interface DemoTask {
  id: string;
  title: string;
  status: "Not Started" | "In Progress" | "Done";
  priority: "High" | "Medium" | "Low" | null;
  dueDate: string | null;
  course: string | null;
  isSchool: boolean;
  url: string;
  /** Demo-only. Explains where this row came from in the live system. */
  note?: string;
  /** Demo-only. "Brightspace sync" vs "typed by hand" — drives the row badge. */
  origin?: "sync" | "manual" | "assistant";
}

export interface DemoNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
}

export interface DemoTrack {
  track: string;
  artists: string;
  album: string;
  duration: number;
  /** Inline SVG cover — the demo has no external image host and no CSP escape hatch. */
  image: string;
  url: string;
}

/* ---------- date helpers ---------- */

const DAY = 864e5;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** N days from today as YYYY-MM-DD (an all-day Notion date). */
export function dayOffset(n: number): string {
  const d = new Date(startOfToday().getTime() + n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** N days from today at HH:mm local, as a full ISO timestamp (a timed Notion date). */
export function dayAt(n: number, hh: number, mm = 0): string {
  const d = new Date(startOfToday().getTime() + n * DAY);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

/* ---------- tasks ----------
   The Brightspace sync writes school titles as "[COURSE] name"; the live API route
   splits that prefix off into its own field before the widget ever sees it, so the
   rows here are already in that post-split shape. Their notes describe the pipeline
   that put them there, which is the part of this project worth explaining. */

const SYNC_NOTE =
  "Arrived on its own. A GitHub Actions cron (0 */3 * * *) pulls the Brightspace ICS feed, diffs it against the school Notion database, and upserts anything new — no one typed this row.";

export function seedTasks(): DemoTask[] {
  return [
    /* ---- school: written by the sync ---- */
    {
      id: "demo-s1",
      title: "Lab 7 — Database Implementation",
      status: "In Progress",
      priority: "High",
      dueDate: dayAt(1, 23, 59),
      course: "CNIT 25501",
      isSchool: true,
      url: "",
      origin: "sync",
      note: SYNC_NOTE,
    },
    {
      id: "demo-s2",
      title: "ERD normalization quiz",
      status: "Not Started",
      priority: "High",
      dueDate: dayAt(2, 11, 30),
      course: "CNIT 27200",
      isSchool: true,
      url: "",
      origin: "sync",
      note: "Same cron. The 11:30 time comes straight from the ICS VEVENT — timed due dates are stored as a full ISO timestamp in Notion, all-day ones as a bare YYYY-MM-DD, and the widget reads the 'T' to tell them apart.",
    },
    {
      id: "demo-s3",
      title: "Problem set 4",
      status: "Not Started",
      priority: "Medium",
      dueDate: dayOffset(4),
      course: "STAT 35000",
      isSchool: true,
      url: "",
      origin: "sync",
      note: "The sync is idempotent — it re-runs every three hours and matches on the Brightspace UID, so a row is never duplicated and an edited due date is corrected in place.",
    },
    {
      id: "demo-s4",
      title: "Read ch. 9 before lecture",
      status: "Not Started",
      priority: "Low",
      dueDate: dayOffset(5),
      course: "COM 21700",
      isSchool: true,
      url: "",
      origin: "sync",
      note: "A second workflow step audits the week ahead after every sync and exits non-zero on a missing or drifted row, which fails the Action and emails me. That replaced a crontab entry that used to mail from my laptop.",
    },
    {
      id: "demo-s5",
      title: "Lab 6 — Joins and subqueries",
      status: "Done",
      priority: "Medium",
      dueDate: dayOffset(-2),
      course: "CNIT 25501",
      isSchool: true,
      url: "",
      origin: "sync",
      note: "Marking this Done wrote back to Notion via pages.update. The sync respects status — it only ever touches the title and due date, so a finished task doesn't get reopened three hours later.",
    },
    {
      id: "demo-s6",
      title: "Final project proposal",
      status: "In Progress",
      priority: "Medium",
      dueDate: dayAt(6, 17, 0),
      course: "ENGR 13300",
      isSchool: true,
      url: "",
      origin: "sync",
      note: "Both Notion databases hold more than one data source, so reads go through dataSources.query rather than databases.query — the older call can't address them and returns nothing.",
    },

    /* ---- personal: typed here, written straight to Notion ---- */
    {
      id: "demo-p1",
      title: "Ship the portfolio redesign",
      status: "In Progress",
      priority: "High",
      dueDate: dayOffset(3),
      isSchool: false,
      course: null,
      url: "",
      origin: "manual",
      note: "Added from this board. A create POSTs to the personal data source, reads its schema first to find the real title property, and only sends fields that actually exist there — the two databases don't agree on whether it's 'Task' or 'Name'.",
    },
    {
      id: "demo-p2",
      title: "Renew the parking permit",
      status: "Not Started",
      priority: "Medium",
      dueDate: dayAt(2, 9, 0),
      isSchool: false,
      course: null,
      url: "",
      origin: "manual",
      note: "Status moves are optimistic: the card jumps columns immediately and the Notion write happens behind it. If the write fails the card snaps back rather than lying about what's stored.",
    },
    {
      id: "demo-p3",
      title: "Gym — push day",
      status: "Not Started",
      priority: "Low",
      dueDate: dayOffset(0),
      isSchool: false,
      course: null,
      url: "",
      origin: "manual",
      note: "Try the ✕ on this card. In the live version delete is an archive — Notion has no hard delete over the API — so it stays recoverable from the workspace trash.",
    },
    {
      id: "demo-p4",
      title: "Call home Sunday",
      status: "Not Started",
      priority: null,
      dueDate: dayOffset(6),
      isSchool: false,
      course: null,
      url: "",
      origin: "manual",
      note: "Undated and low-stakes rows still show up: the widget's window is 'overdue, due within seven days, or no date at all', so nothing quietly disappears.",
    },
    {
      id: "demo-p5",
      title: "Book the flight home for break",
      status: "Done",
      priority: "High",
      dueDate: dayOffset(-1),
      isSchool: false,
      course: null,
      url: "",
      origin: "assistant",
      note: "Created by the assistant. It doesn't parse commands with regex — the model is given real tool definitions (add_task, delete_task, add_event, add_note, add_quick_link) and picks one, including which of the two databases the task belongs in.",
    },
    {
      id: "demo-p6",
      title: "Reply to the internship recruiter",
      status: "In Progress",
      priority: "High",
      dueDate: dayAt(1, 18, 0),
      isSchool: false,
      course: null,
      url: "",
      origin: "manual",
      note: "Due dates are editable in place. Clearing one sends an explicit null to Notion rather than omitting the field, because omitting it would leave the old date sitting there.",
    },
  ];
}

/* ---------- notes ---------- */

export function seedNotes(): DemoNote[] {
  const t = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
  return [
    {
      id: "demo-n1",
      content: "Everything on this board is fake data. Add and delete freely — it all lives in your browser.",
      color: "purple",
      createdAt: t(4),
      updatedAt: t(4),
    },
    {
      id: "demo-n2",
      content: "Office hours moved to Thursday 2pm — Hampton 2123",
      color: "blue",
      createdAt: t(190),
      updatedAt: t(190),
    },
    {
      id: "demo-n3",
      content: "Ask about the sync failure email from Tuesday's cron run",
      color: "orange",
      createdAt: t(1400),
      updatedAt: t(1400),
    },
  ];
}

/* ---------- calendar ----------
   The live board reads a read-only Google Calendar ICS feed and expands recurring
   events with ical-expander. This stands in for the expanded output: a repeating
   class schedule plus a few one-offs, generated across whatever window is asked for. */

interface Recurring {
  title: string;
  /** 0 = Sunday. */
  days: number[];
  startHour: number;
  startMin: number;
  durationMin: number;
  location: string;
}

const RECURRING: Recurring[] = [
  { title: "CNIT 25501 — Lecture", days: [1, 3], startHour: 9, startMin: 30, durationMin: 50, location: "Knoy Hall B032" },
  { title: "CNIT 25501 — Lab", days: [2], startHour: 13, startMin: 30, durationMin: 110, location: "Knoy Hall B026" },
  { title: "STAT 35000 — Lecture", days: [1, 3, 5], startHour: 11, startMin: 30, durationMin: 50, location: "University Hall 217" },
  { title: "COM 21700 — Lecture", days: [2, 4], startHour: 15, startMin: 0, durationMin: 75, location: "Beering Hall 1245" },
  { title: "ENGR 13300 — Studio", days: [4], startHour: 10, startMin: 30, durationMin: 110, location: "Wang Hall 3501" },
];

/** One-offs, placed relative to today so the month view is never empty. */
function oneOffs(): DemoEvent[] {
  return [
    { id: "demo-e1", title: "Scope — weekly build night", start: dayAt(1, 18, 30), end: dayAt(1, 20, 30), allDay: false, location: "Krach Leadership Center" },
    { id: "demo-e2", title: "Coffee with the CS TA", start: dayAt(2, 8, 0), end: dayAt(2, 8, 45), allDay: false, location: "Vienna Espresso" },
    { id: "demo-e3", title: "Career fair — engineering", start: dayOffset(3), end: dayOffset(3), allDay: true, location: "France A. Córdova Rec Center" },
    { id: "demo-e4", title: "Recruiter call — phone screen", start: dayAt(4, 16, 0), end: dayAt(4, 16, 45), allDay: false, location: "Zoom" },
    { id: "demo-e5", title: "Purdue Think — pitch practice", start: dayAt(5, 19, 0), end: dayAt(5, 20, 0), allDay: false, location: "Rawls Hall 1086" },
    { id: "demo-e6", title: "Home game vs. Iowa", start: dayAt(6, 12, 0), end: dayAt(6, 15, 30), allDay: false, location: "Ross-Ade Stadium" },
    { id: "demo-e7", title: "Advisor meeting", start: dayAt(-2, 14, 0), end: dayAt(-2, 14, 30), allDay: false, location: "Young Hall 810" },
    { id: "demo-e8", title: "Fall break", start: dayOffset(12), end: dayOffset(14), allDay: true, location: null },
    { id: "demo-e9", title: "Hackathon — BoilerMake", start: dayOffset(9), end: dayOffset(11), allDay: true, location: "France A. Córdova Rec Center" },
    { id: "demo-e10", title: "Dentist", start: dayAt(-5, 10, 30), end: dayAt(-5, 11, 15), allDay: false, location: "West Lafayette Dental" },
  ];
}

/** Expand the recurring schedule across [start, end], the way ical-expander would. */
export function seedEvents(start: Date, end: Date): DemoEvent[] {
  const out: DemoEvent[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  let guard = 0;
  while (cursor <= end && guard++ < 400) {
    const dow = cursor.getDay();
    for (const r of RECURRING) {
      if (!r.days.includes(dow)) continue;
      const s = new Date(cursor);
      s.setHours(r.startHour, r.startMin, 0, 0);
      const e = new Date(s.getTime() + r.durationMin * 60_000);
      out.push({
        id: `demo-rec-${r.title}-${s.toISOString().slice(0, 10)}`,
        title: r.title,
        start: s.toISOString(),
        end: e.toISOString(),
        allDay: false,
        location: r.location,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const ev of oneOffs()) {
    const s = new Date(ev.allDay ? `${ev.start}T00:00:00` : ev.start);
    if (s >= start && s <= end) out.push(ev);
  }

  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/* ---------- weather ----------
   Shaped exactly like the Open-Meteo response the live route proxies, so the
   widget parsing it doesn't know the difference. Codes are WMO weather codes. */

export function seedWeather() {
  const codes = [3, 61, 80, 2, 0];
  const highs = [58, 54, 61, 66, 63];
  const lows = [41, 39, 44, 48, 45];
  const time = Array.from({ length: 5 }, (_, i) => dayOffset(i));
  return {
    current: {
      time: new Date().toISOString(),
      temperature_2m: 54.3,
      apparent_temperature: 51.1,
      weather_code: 3,
      wind_speed_10m: 9.4,
      relative_humidity_2m: 68,
    },
    daily: {
      time,
      weather_code: codes,
      temperature_2m_max: highs,
      temperature_2m_min: lows,
    },
    demo: true,
  };
}

/* ---------- news ----------
   Stand-ins for the RSS pull (TechCrunch / Wired / HN, Bloomberg / Fortune, BBC /
   NYT). Headlines are invented — no real outlet is being quoted. */

export interface DemoArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toUTCString();

export function seedNews(category: string): DemoArticle[] {
  const feeds: Record<string, DemoArticle[]> = {
    tech: [
      { title: "Edge runtimes quietly became the default for small apps", link: "#", pubDate: hoursAgo(1), description: "Sample headline. The live dashboard parses real RSS server-side and caches it for 30 minutes.", source: "Sample Tech Wire" },
      { title: "A case for boring state management in 2026", link: "#", pubDate: hoursAgo(3), description: "Sample headline generated for this demo — no outlet is being quoted.", source: "Sample Tech Wire" },
      { title: "The scheduler is the product: what cron taught a generation of tools", link: "#", pubDate: hoursAgo(5), description: "Sample headline written to fill the widget.", source: "Bytes Weekly" },
      { title: "Grid layouts are back, and this time they persist", link: "#", pubDate: hoursAgo(8), description: "Sample headline written to fill the widget.", source: "Bytes Weekly" },
      { title: "Students are building their own dashboards instead of buying them", link: "#", pubDate: hoursAgo(11), description: "Sample headline written to fill the widget.", source: "Orange Board" },
      { title: "Why your API wrapper should read the schema first", link: "#", pubDate: hoursAgo(14), description: "Sample headline written to fill the widget.", source: "Orange Board" },
      { title: "Optimistic UI, pessimistic rollback", link: "#", pubDate: hoursAgo(19), description: "Sample headline written to fill the widget.", source: "Bytes Weekly" },
      { title: "The quiet return of the single-user app", link: "#", pubDate: hoursAgo(23), description: "Sample headline written to fill the widget.", source: "Sample Tech Wire" },
    ],
    business: [
      { title: "Campus startups are hiring earlier than ever", link: "#", pubDate: hoursAgo(2), description: "Sample headline for the demo feed.", source: "Ledger Daily" },
      { title: "Internship offers move up a full quarter", link: "#", pubDate: hoursAgo(4), description: "Sample headline for the demo feed.", source: "Ledger Daily" },
      { title: "Small teams, long runways: the new default", link: "#", pubDate: hoursAgo(7), description: "Sample headline for the demo feed.", source: "Market Room" },
      { title: "What a four-person company spends on tooling", link: "#", pubDate: hoursAgo(10), description: "Sample headline for the demo feed.", source: "Market Room" },
      { title: "The return of the productivity line item", link: "#", pubDate: hoursAgo(16), description: "Sample headline for the demo feed.", source: "Founders Note" },
      { title: "Hiring managers say portfolios beat GPAs", link: "#", pubDate: hoursAgo(21), description: "Sample headline for the demo feed.", source: "Founders Note" },
    ],
    world: [
      { title: "Regional transit expansion clears final vote", link: "#", pubDate: hoursAgo(1), description: "Sample headline for the demo feed.", source: "Global Desk" },
      { title: "Record turnout in municipal elections", link: "#", pubDate: hoursAgo(5), description: "Sample headline for the demo feed.", source: "Global Desk" },
      { title: "Grain corridor reopens after six-week pause", link: "#", pubDate: hoursAgo(9), description: "Sample headline for the demo feed.", source: "Wire Service" },
      { title: "Coastal cities publish joint adaptation plan", link: "#", pubDate: hoursAgo(13), description: "Sample headline for the demo feed.", source: "Wire Service" },
      { title: "Universities sign cross-border research pact", link: "#", pubDate: hoursAgo(18), description: "Sample headline for the demo feed.", source: "Global Desk" },
      { title: "Rail strike averted hours before deadline", link: "#", pubDate: hoursAgo(22), description: "Sample headline for the demo feed.", source: "Wire Service" },
    ],
  };
  return feeds[category] ?? feeds.tech;
}
