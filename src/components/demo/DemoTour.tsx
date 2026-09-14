"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* The intro tour.
 *
 * A dashboard whose whole point is that you rearrange it is useless as a demo if
 * nobody discovers the rearranging. This walks through it once: swap, resize, shelf,
 * modes, and where the architecture notes live. It highlights the real element on
 * the real board rather than showing screenshots, so every step can be tried the
 * moment it's explained. */

export const TOUR_KEY = "demo_tour_done_v1";

interface Step {
  title: string;
  body: string;
  /** CSS selector for the element to spotlight. Omitted → centred, no cutout. */
  selector?: string;
  /** Preferred side; falls back to whatever fits. */
  side?: "top" | "bottom" | "left" | "right";
  figure?: "swap" | "resize" | "shelf";
}

const STEPS: Step[] = [
  {
    title: "This is a working demo",
    body:
      "Every widget below is the real dashboard, running on sample data instead of my Notion, calendar and Spotify. Nothing is a screenshot — add a task, drag a card, resize it. Sixty seconds and you'll have seen all of it.",
  },
  {
    title: "Drag a card onto another to swap",
    body:
      "Pick a card up anywhere that isn't a button and drop it on top of another one. They trade places and sizes — the one you're targeting lights up as you hover it. The board never reflows around you.",
    selector: '[data-tour="school"]',
    side: "right",
    figure: "swap",
  },
  {
    title: "Drag the corner to resize",
    body:
      "Every card has a handle in its bottom-right. Widgets adapt to whatever shape you give them: make Spotify short and wide and it switches to a horizontal layout; give the weather card height and the full five-day forecast appears.",
    selector: '[data-tour="school"] .react-resizable-handle',
    side: "right",
    figure: "resize",
  },
  {
    title: "Don't want a widget? Shelve it",
    body:
      "Hover any card and hit the ✕ in its corner. It leaves the board but keeps its exact position, so putting it back later drops it where it was.",
    selector: '[data-tour="weather"]',
    side: "right",
    figure: "shelf",
  },
  {
    title: "The shelf holds what you removed",
    body:
      "Shelved widgets wait here with a count. Click one to put it back. Nothing is ever destroyed by tidying up.",
    selector: '[data-tour="shelf"]',
    side: "bottom",
  },
  {
    title: "Two boards, not one",
    body:
      "Personal and College are separate layouts with separate widgets — the college board swaps in Lecture Studio and Clubs and drops the news feed. Each remembers its own arrangement and its own shelf.",
    selector: '[data-tour="mode"]',
    side: "bottom",
  },
  {
    title: "Tidy and Reset",
    body:
      "Tidy floats every card up to close the gaps a resize left behind, without moving anything sideways. Reset restores the default board and brings back everything you shelved.",
    selector: '[data-tour="tools"]',
    side: "bottom",
  },
  {
    title: "Every card explains itself",
    body:
      "The ⓘ on a card says what it's wired to in the live version — the Notion queries, the ICS expansion, the Spotify token refresh, and the GitHub Actions cron that files my coursework without me. That's the part sample data hides.",
    selector: '[data-tour="school"] .card-info',
    side: "right",
  },
  {
    title: "Go break it",
    body:
      "Everything you change is yours alone — it's kept in your browser, not on a server. Reset demo in the top right puts the whole thing back exactly as you found it.",
    selector: '[data-tour="reset-demo"]',
    side: "bottom",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;
const CARD_W = 340;
const GAP = 14;

export default function DemoTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];

  const finish = useCallback(() => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    onClose();
  }, [onClose]);

  /* Measure the step's target. Returns null for a step with no target, or one
     whose element isn't on the board in this mode — those render centred. */
  const measure = useCallback(() => {
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.selector]);

  useEffect(() => {
    const el = step.selector ? document.querySelector(step.selector) : null;

    // Highlight the card the target lives in, not just the target, so the ✕ and
    // the resize handle — which only appear on hover — are visible during their step.
    const host = el?.closest(".widget-draggable") ?? el;
    host?.classList.add("tour-lit");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    // Measured after the scroll settles, never during the effect body: the rect
    // is only meaningful once the element has stopped moving.
    const t = setTimeout(measure, el ? 340 : 0);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      host?.classList.remove("tour-lit");
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.selector, measure]);

  /* Place the card against the spotlight, preferring the requested side and
     falling back to whichever one actually fits. Written straight to the node
     rather than held in state: this is a measurement of the DOM being fed back
     into the DOM, and a render in between would only add a frame of jitter. */
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (!rect) {
      card.style.top = "";
      card.style.left = "";
      return;
    }

    const h = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const fits = {
      bottom: rect.top + rect.height + GAP + h < vh,
      top: rect.top - GAP - h > 0,
      right: rect.left + rect.width + GAP + CARD_W < vw,
      left: rect.left - GAP - CARD_W > 0,
    };
    const order: (keyof typeof fits)[] = step.side
      ? [step.side, "bottom", "top", "right", "left"]
      : ["bottom", "top", "right", "left"];
    const side = order.find((s) => fits[s]) ?? "bottom";

    const clampX = (x: number) => Math.max(16, Math.min(x, vw - CARD_W - 16));
    const clampY = (y: number) => Math.max(16, Math.min(y, vh - h - 16));

    const place =
      side === "bottom" ? { top: rect.top + rect.height + GAP, left: clampX(rect.left) }
      : side === "top" ? { top: rect.top - GAP - h, left: clampX(rect.left) }
      : side === "right" ? { top: clampY(rect.top), left: rect.left + rect.width + GAP }
      : { top: clampY(rect.top), left: rect.left - GAP - CARD_W };

    card.style.top = `${place.top}px`;
    card.style.left = `${place.left}px`;
  }, [rect, step.side, i]);

  const next = useCallback(() => (i === STEPS.length - 1 ? finish() : setI((n) => n + 1)), [i, finish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, next, back]);

  const centred = !rect;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Dashboard tour">
      {/* The scrim. With a target it's a ring around the cutout; without one it's a
          plain wash. Pointer events stay off the hole so the board is still usable. */}
      {rect ? (
        <div
          className="tour-hole"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div className="tour-scrim" onClick={finish} />
      )}

      <div ref={cardRef} className={`tour-card${centred ? " centred" : ""}`}>
        <div className="tour-card-head">
          <span className="tour-step">
            {String(i + 1).padStart(2, "0")} <span>/ {String(STEPS.length).padStart(2, "0")}</span>
          </span>
          <button className="tour-skip" onClick={finish}>
            Skip tour
          </button>
        </div>

        <h2 className="tour-title">{step.title}</h2>
        {step.figure && <Figure kind={step.figure} />}
        <p className="tour-body">{step.body}</p>

        <div className="tour-foot">
          <div className="tour-dots" aria-hidden>
            {STEPS.map((_, n) => (
              <span key={n} data-on={n <= i || undefined} />
            ))}
          </div>
          <div className="tour-actions">
            {i > 0 && (
              <button className="tour-back" onClick={back}>
                Back
              </button>
            )}
            <button className="tour-next" onClick={next}>
              {i === STEPS.length - 1 ? "Start using it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tiny looping diagrams. Cheaper than words for "drag this onto that", and they
   stop the tour from being eight paragraphs in a row. */
function Figure({ kind }: { kind: "swap" | "resize" | "shelf" }) {
  return (
    <div className="tour-figure" aria-hidden>
      <svg viewBox="0 0 300 92" width="100%" height="92">
        <defs>
          <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,249,232,0.10)" />
            <stop offset="1" stopColor="rgba(255,249,232,0.03)" />
          </linearGradient>
        </defs>

        {kind === "swap" && (
          <g>
            <rect className="tf-a" x="14" y="16" width="118" height="60" rx="9" fill="url(#tf)" stroke="rgba(255,246,224,0.16)" />
            <rect className="tf-b" x="168" y="16" width="118" height="60" rx="9" fill="url(#tf)" stroke="rgba(201,242,79,0.45)" />
            <path d="M140 38h20" stroke="#c9f24f" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M154 32l6 6-6 6" stroke="#c9f24f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160 56h-20" stroke="rgba(236,231,218,0.5)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M146 50l-6 6 6 6" stroke="rgba(236,231,218,0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {kind === "resize" && (
          <g>
            <rect className="tf-grow" x="90" y="14" width="120" height="64" rx="9" fill="url(#tf)" stroke="rgba(201,242,79,0.45)" />
            <g className="tf-handle">
              <path d="M198 70l10-10M203 71l6-6" stroke="#c9f24f" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
        )}

        {kind === "shelf" && (
          <g>
            <rect className="tf-leave" x="30" y="16" width="110" height="60" rx="9" fill="url(#tf)" stroke="rgba(255,246,224,0.16)" />
            <g stroke="#c9f24f" strokeWidth="1.4" strokeLinecap="round">
              <path d="M122 26l10 10m0-10l-10 10" />
            </g>
            <rect x="186" y="24" width="90" height="44" rx="8" fill="none" stroke="rgba(201,242,79,0.4)" strokeDasharray="3 4" />
            <text x="231" y="51" textAnchor="middle" fontSize="11" fill="#c9f24f" fontFamily="inherit">
              Shelf
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
