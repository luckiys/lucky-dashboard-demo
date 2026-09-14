/* What each card is wired to in the live dashboard.
 *
 * The demo runs on sample data, so the interesting part of most of these widgets —
 * where the data comes from and what it cost to get it there — is invisible. These
 * notes put it back. Shown from the ⓘ on every card. */

export interface WidgetNote {
  /** The real source, one line. */
  source: string;
  /** What's happening in the demo instead. */
  demo: string;
  /** The part worth explaining. */
  detail: string;
}

export const WIDGET_NOTES: Record<string, WidgetNote> = {
  school: {
    source: "Notion — school tasks database, read with dataSources.query",
    demo: "Sample coursework in your browser. Add, move and delete all work.",
    detail:
      "These rows aren't typed by hand. A GitHub Actions cron on 0 */3 * * * reads my Brightspace ICS feed, diffs every assignment against Notion by its ICS UID, and upserts what changed — so a new lab shows up here within three hours of the professor posting it. A second step audits the week ahead and exits non-zero if a row is missing or has drifted, which fails the Action and emails me. That workflow replaced two crontab entries that only ran when my laptop was open.",
  },
  personal: {
    source: "Notion — personal tasks database, read with dataSources.query",
    demo: "Sample tasks in your browser. Everything persists until you reset.",
    detail:
      "Both Notion databases hold more than one data source, so reads go through dataSources.query rather than the older databases.query, which can't address them and quietly returns nothing. Creates read the target's schema first: the two databases don't agree on whether the title property is called Task or Name, so guessing it fails on one of them. Status moves and date edits are optimistic — the card changes instantly and rolls back if the write fails.",
  },
  calendar: {
    source: "Google Calendar, via a read-only ICS feed expanded with ical-expander",
    demo: "A generated class schedule plus sample events, rebuilt around today's date.",
    detail:
      "The ICS feed is read-only, so recurring events arrive as rules rather than dates and have to be expanded per view window. Events you create on the board can't be written back to Google — they live in this browser and get merged with the feed at render time, which is why they're marked differently. Task due dates are overlaid on the same grid so the week reads as one thing.",
  },
  spotify: {
    source: "Spotify Web API — currently-playing and playback control, OAuth refresh-token flow",
    demo: "A fixed playlist with a playhead that actually advances. Play, pause, next and previous all work.",
    detail:
      "The live version stores a refresh token and exchanges it for an access token on each poll, because access tokens expire in an hour. Playback control needs Premium and an active device, so the widget distinguishes 'no device' from 'not Premium' from 'not connected' rather than showing one generic failure. The cover art here is inline SVG — the demo makes no external requests at all.",
  },
  weather: {
    source: "Open-Meteo — current conditions and a five-day forecast, cached 30 minutes",
    demo: "A fixed forecast for West Lafayette, shaped exactly like the real response.",
    detail:
      "Open-Meteo needs no API key, which is why it won over the alternatives. Conditions come back as WMO weather codes rather than text, so the icons are drawn from a code-to-shape map on a 24px grid — no emoji, no icon font, so every glyph matches the stroke weight of the rest of the UI.",
  },
  news: {
    source: "RSS — TechCrunch, Wired and Hacker News; Bloomberg and Fortune; BBC and NYT",
    demo: "Invented headlines. No real outlet is being quoted.",
    detail:
      "Parsed server-side with a small regex reader rather than a dependency, because the feeds only differ in whether they wrap fields in CDATA. Responses are cached for 30 minutes so switching categories back and forth doesn't hammer anyone's feed.",
  },
  assistant: {
    source: "A chat model with five real tool definitions the dashboard executes",
    demo: "A browser-side intent matcher that returns the same envelope the model did.",
    detail:
      "The model is given add_task, delete_task, add_event, add_note and add_quick_link as tools, including which of the two Notion databases a task belongs in, and the dashboard runs whatever it picks. Here the matching is done with rules instead of a model — but the execution half is the real code, so asking it to add a task genuinely creates one in the right column. It tells you when it doesn't understand rather than inventing something.",
  },
  lecture: {
    source: "PDF text extraction with pdf-parse, then five prompts against a chat model",
    demo: "One sample lecture with five pre-generated artifacts and honest loading delays.",
    detail:
      "Upload a PDF or paste a transcript and it produces notes, a summary, a cheat sheet, flashcards and a practice quiz. The first three come back as plain text; the last two are asked for as JSON and parsed into card and quiz interfaces, with a fallback that shows the raw output when the model doesn't comply. Text is capped at 24k characters to stay inside the context window.",
  },
  notes: {
    source: "A JSON file on disk, written through an API route",
    demo: "localStorage. Same shapes, same endpoints.",
    detail:
      "Deliberately not Notion. Quick notes are for things that shouldn't survive the week, and routing them through a database made capturing one slower than writing it on paper. Capped at twenty — past that it's a task, not a note.",
  },
  clock: {
    source: "The browser clock",
    demo: "Identical — nothing to fake here.",
    detail:
      "Every numeral on the board uses tabular figures, which is why this doesn't twitch as the seconds change. It's the smallest detail on the page and the one you'd notice most if it were missing.",
  },
  pomodoro: {
    source: "Local, no network",
    demo: "Identical — fully working.",
    detail: "State lives in the component. It keeps running while you rearrange the board around it, because remounting a timer on a drag would make the feature useless.",
  },
  links: {
    source: "localStorage, per browser",
    demo: "Identical — fully working. Add and remove links freely.",
    detail: "Shortcuts are personal and tiny; syncing them somewhere would cost more than it returns. The assistant can add one for you.",
  },
  collegelinks: {
    source: "localStorage, per browser — a separate set from the personal board",
    demo: "Identical — fully working.",
    detail: "The two modes keep separate link sets under separate keys, so the college board isn't cluttered with personal shortcuts and vice versa.",
  },
  clubs: {
    source: "localStorage, per browser",
    demo: "Identical — fully working.",
    detail: "Seeded with the organisations I'm actually in. Small enough that a database would be theatre.",
  },
};
