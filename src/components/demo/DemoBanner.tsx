"use client";

import { useState } from "react";

/* The standing "this isn't real data" notice, with the architecture write-up
   folded behind it. A demo that quietly looks live is worse than useless when the
   point is to show what was actually built, so this says so up front and then
   explains what the sample data is standing in for. */

const REPO = "https://github.com/luckiys/lucky-dashboard-demo";

export default function DemoBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="demo-banner-wrap">
      <div className="demo-banner">
        <span className="demo-chip">
          <span className="demo-dot" aria-hidden />
          Demo
        </span>

        <p className="demo-banner-text">
          The real board reads my Notion, Google Calendar, Spotify and a Brightspace sync. None of
          that is connected here — everything below is sample data living in your browser.
        </p>

        <div className="demo-banner-actions">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Close" : "What's real?"}
          </button>
          <a href={REPO} target="_blank" rel="noreferrer noopener">
            Source
          </a>
        </div>
      </div>

      {open && (
        <div className="demo-about">
          <section>
            <p className="section-label">What this is</p>
            <p>
              A single-user command center I built for myself and use daily: coursework, calendar,
              now-playing, weather, notes, a Pomodoro timer, an assistant that can act on the board,
              and a study tool that turns lecture PDFs into notes, flashcards and practice quizzes.
              Next.js App Router, TypeScript, Tailwind, <code>react-grid-layout</code>.
            </p>
          </section>

          <section>
            <p className="section-label">The part I&apos;d point at</p>
            <p>
              Coursework files itself. A GitHub Actions cron on <code>0 */3 * * *</code> reads my
              Brightspace ICS feed, diffs every assignment against Notion by its ICS UID, and upserts
              what changed — idempotent, so re-running it never duplicates a row or reopens something
              I finished. A second step audits the week ahead and exits non-zero when a row is missing
              or has drifted, which fails the run and emails me. It replaced two crontab entries that
              only fired when my laptop happened to be open.
            </p>
          </section>

          <section>
            <p className="section-label">What the demo changed</p>
            <p>
              The password gate is gone and every <code>/api</code> route was replaced by one
              browser-side module answering the same paths with the same response shapes. The widgets
              are untouched — the optimistic updates, the rollbacks, the layout repair, the loading
              and empty states are all the code that runs in the live version. The ⓘ on each card
              says exactly what it stands in for.
            </p>
          </section>

          <section>
            <p className="section-label">Your copy</p>
            <p>
              Tasks, notes, layouts, the shelf and the playhead are yours and stay in this browser.
              Nothing is sent anywhere. <strong>Reset demo</strong> puts it all back.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
