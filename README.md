# LuckyOS — interactive demo

A public, fully interactive demo of my personal command center: a drag-to-arrange
dashboard that pulls my coursework, calendar, now-playing, weather and news into one
board and lets me act on all of it in one place.

**Live demo →** _(deployed on Vercel — link in the repo description)_

Everything below is the real application. What changed is where the data comes from:
the live version reads my Notion workspace, a Google Calendar ICS feed, Spotify and a
Brightspace sync, and none of those are connected here. In their place is one
browser-side module that answers the same routes with the same response shapes, so the
widgets themselves are untouched.

> The private original lives in a separate repository. This one exists to be opened and
> used by someone who doesn't have my credentials.

---

## What to try

The board is real, so rearrange it:

- **Drag a card onto another** — they swap places and sizes. The target highlights as you
  hover it; the board never reflows underneath you.
- **Drag the bottom-right corner** — widgets adapt to shape, not just size. Make Spotify
  short and wide and it switches to a horizontal layout.
- **Hit the ✕ on a card** — it goes to the shelf, keeping its exact geometry, and the
  shelf puts it back where it was.
- **Switch Personal / College** — two separate layouts with different widgets, each
  remembering its own arrangement and shelf.
- **Add and delete tasks and notes**, move them through the funnel, edit due dates — all
  of it persists.
- **Ask the assistant** to add or remove something: _"add a task to study for the
  CNIT 25501 quiz on Friday"_.
- **ⓘ on any card** — what that widget is wired to in the live version.

An intro tour runs on first load and is re-launchable from **Tour** in the top right.
**Reset demo** puts everything back.

---

## The part I'd point at

Coursework files itself.

A GitHub Actions cron on `0 */3 * * *` reads my Brightspace ICS feed, diffs every
assignment against the school Notion database by its ICS UID, and upserts what changed.
It is idempotent by construction — re-running it never duplicates a row, and because it
only ever writes the title and due date, a task I've already marked Done doesn't get
reopened three hours later.

A second step runs `if: always()` and audits the week ahead: it exits non-zero when a row
is missing, has drifted from the feed, or has gone stale, which fails the run and makes
GitHub email me. That failure *is* the alert. The whole workflow replaced two crontab
entries that only fired when my laptop happened to be open.

The result is that the school column on this board is not something I maintain. It is a
report on state that arrives on its own, and the audit is there because a sync you don't
check is a sync you don't have.

## Other things worth reading the source for

- **Layout integrity** (`src/app/page.tsx`) — `react-grid-layout`'s own `correctBounds`
  only clamps columns; it will happily render two cards on the same cells or one that
  violates its declared `minW`/`minH`. Every layout that reaches state or localStorage
  goes through an overlap resolver and a clamp first, so a bad drop can't leave the board
  painted over itself, and a stored layout is repaired on load rather than discarded.
- **Swap targeting** — the widget under the dragged card's *centre* wins, falling back to
  largest overlap. Matching where you're actually pointing matters more than area when a
  small card is dragged over a large one.
- **Optimistic writes with real rollback** — status moves and date edits change the card
  immediately and revert if the write fails, rather than showing a spinner or lying about
  what was stored.
- **Notion's multi-source databases** — both of mine hold more than one data source, so
  reads go through `dataSources.query`; the older `databases.query` can't address them and
  returns nothing at all. Creates read the target's schema first, because the two
  databases disagree on whether the title property is `Task` or `Name`.
- **Recurring events** — the Google feed is read-only ICS, so repeats arrive as rules and
  are expanded per view window with `ical-expander`. Events created on the board can't be
  written back, so they live locally and are merged in at render time.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · `react-grid-layout` · `date-fns`.
No component library — the card, the funnel, the calendar grid and the icon set are all
hand-built, on one accent colour and one typeface. See the design notes in the private
repo for why.

---

## How the demo differs from the live app

| | Live | Demo |
|---|---|---|
| School + personal tasks | Notion, `dataSources.query` | Sample rows in `localStorage` |
| Coursework arriving | GitHub Actions cron → Brightspace ICS → Notion | Pre-seeded, with the pipeline described per row |
| Calendar | Google Calendar ICS, expanded server-side | Generated class schedule + sample events |
| Spotify | Web API, OAuth refresh-token flow | Fixed playlist, local playhead, working transport |
| Weather | Open-Meteo, cached 30 min | Fixed forecast, identical response shape |
| News | RSS from nine feeds | Invented headlines — no outlet is quoted |
| Assistant | A model with five tool definitions the board executes | Browser-side intent matcher, same envelope, same execution |
| Lecture Studio | `pdf-parse` + five model prompts | One sample lecture, five pre-generated artifacts |
| Access | Password gate on every route | None |

Concretely: `src/app/api/*` was deleted and replaced by `src/lib/demo/demoFetch.ts`,
every call site says `demoFetch` instead of `fetch`, and the auth proxy is gone.
Nothing else about the widgets changed — the loading states, empty states, optimistic
updates and rollbacks are the code that runs in the live version.

Your data stays in your browser. Nothing is sent anywhere, and there is no server-side
state to share.

## Running it

```bash
npm install
npm run dev
```

No environment variables, no keys, no account. That's the point.
