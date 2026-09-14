"use client";

import { useState } from "react";
import { WIDGET_NOTES } from "./widgetNotes";

/* The ⓘ on every card. Opens a panel *inside* the card rather than a floating
   popover: the card already clips its own overflow, and a popover would either be
   clipped or have to escape the grid item's stacking context. */

export default function WidgetInfo({ id, label }: { id: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const note = WIDGET_NOTES[id];
  if (!note) return null;

  return (
    <>
      <button
        className="card-info no-drag"
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={`What ${label ?? "this widget"} connects to in the live version`}
        aria-label={`What ${label ?? "this widget"} connects to in the live version`}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="5.9" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 6.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="4" r="0.85" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="info-panel no-drag" role="dialog" aria-label={`${label ?? id} — how it works`}>
          <div className="info-panel-scroll widget-scroll">
            <p className="section-label">{label ?? id} — how it works</p>

            <dl className="info-rows">
              <div>
                <dt>Live</dt>
                <dd>{note.source}</dd>
              </div>
              <div>
                <dt>Here</dt>
                <dd>{note.demo}</dd>
              </div>
            </dl>

            <p className="info-detail">{note.detail}</p>
          </div>

          <button className="info-close" onClick={() => setOpen(false)}>
            Back to the widget
          </button>
        </div>
      )}
    </>
  );
}
