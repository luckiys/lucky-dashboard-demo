# Reference: the coursework sync

`brightspace-sync.yml` is the GitHub Actions workflow from the live repository,
copied here verbatim as reference. It is kept in `docs/` rather than
`.github/workflows/` on purpose — in this demo repo there are no secrets to give it,
so scheduling it would only produce a failing run every three hours.

It is the piece of the project the demo can't show you, because what it does is make
coursework appear on the board without anyone touching it.

Two steps:

1. **Sync** — read the Brightspace ICS feed, diff it against the school Notion database
   by ICS UID, upsert what changed. Idempotent: re-running never duplicates a row, and
   it only writes the title and due date, so a task already marked Done isn't reopened.
2. **Audit** — runs `if: always()`, so it still reports when the sync itself failed.
   It checks the week ahead and exits non-zero on anything missing, drifted or stale,
   which fails the workflow and makes GitHub email me. That failure is the alert.

`concurrency` with `cancel-in-progress: false` keeps a slow run from overlapping the
next scheduled one, because both write to Notion.

The two scripts it calls (`sync-brightspace.mjs`, `check-brightspace.mjs`) are not
included here — they carry my database and feed identifiers.
