"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { game } from "@/storage/store";

type Step = { sel?: string; title: string; body: string; adv?: boolean };

const STEPS: Step[] = [
  {
    title: "Welcome to your expedition",
    body: "Doit turns your to-do list into a journey. Every task you finish earns XP and gold, moves you across a map, and wounds a boss. Here's a one-minute tour.",
  },
  {
    sel: ".quick",
    title: "Add quests fast",
    body: "Type a task and press Enter. Add !easy or !hard for difficulty, #tag for a project, tomorrow for a due date, daily for a habit, or !main for your top priority. Press / anywhere to jump here.",
  },
  {
    sel: "[data-tour=main]",
    title: "Pick one main quest",
    body: "Star the one thing that matters most today. It's worth 1.5× XP, double gold and an extra step on the map.",
  },
  {
    sel: ".quest .seal",
    title: "Complete to advance",
    body: "Tap the seal when a quest is done. You earn XP and gold, and your marker moves along the trail. Tap it again to undo.",
  },
  {
    sel: ".profile, .appbar",
    title: "Your rank and streak",
    body: "XP levels you up from Wanderer to Legend. Finish at least one quest a day to keep your streak burning.",
  },
  {
    sel: ".map-card, .expedition",
    adv: true,
    title: "The map",
    body: "Seven steps reach the gate of a region. Crossing it unlocks the next chapter of the story in your Journal.",
  },
  {
    sel: ".boss, .exp-boss",
    adv: true,
    title: "Slay the weekly boss",
    body: "Every XP you earn hits this beast. Bring it down for 100 gold and an epic item. Tap it on the map to hear what it thinks of you.",
  },
  {
    sel: ".nav",
    title: "Journal, Campfire, Satchel",
    body: "Read your story, focus by a crackling fire (with sound), and spend gold on rewards you set yourself.",
  },
  {
    sel: "[data-tour=mode], .appbar-settings",
    title: "Make it yours",
    body: "Settings hold Adventure mode (turn it off for a calm, plain list), sound, theme and backups. Everything is saved in this browser. Replay this tour from settings any time.",
  },
];

const CARD_W = 340;
const CARD_H = 230; // estimate, used only to decide where the card fits
const GAP = 14;

export default function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = steps[i];

  // build the step list from what is actually on screen (no quests → skip the quest step, etc.)
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setSteps(STEPS.filter((s) => (!s.adv || game.s.adventure) && (!s.sel || visible(s.sel))));
      setI(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    next.current?.focus({ preventScroll: true });
    const el = step.sel ? visible(step.sel) : null;
    if (!el) return setRect(null);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const t = setTimeout(update, 450);
    addEventListener("resize", update);
    addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      removeEventListener("resize", update);
      removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  const last = i === steps.length - 1;
  const go = (d: number) => (last && d > 0 ? onClose() : setI((n) => Math.max(0, Math.min(steps.length - 1, n + d))));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!open || !step) return null;

  return (
    <div className="tour">
      <div className="tour-catch" onClick={(e) => e.stopPropagation()} />
      <div
        className={rect ? "tour-spot" : "tour-spot none"}
        style={rect ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 } : undefined}
      />
      <div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" style={place(rect)}>
        <div className="tour-top">
          <span className="kicker">
            {i + 1} / {steps.length}
          </span>
          <button className="tour-skip" onClick={onClose}>
            Skip tour
          </button>
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-foot">
          <div className="tour-dots" aria-hidden>
            {steps.map((_, k) => (
              <i key={k} className={k === i ? "on" : ""} />
            ))}
          </div>
          {i > 0 && (
            <button className="btn small ghost" onClick={() => go(-1)}>
              Back
            </button>
          )}
          <button ref={next} className="btn small primary" onClick={() => go(1)}>
            {last ? "Start adventuring" : i === 0 ? "Show me" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** First match that is actually rendered (desktop and phone layouts hide different parts). */
function visible(sel: string) {
  return [...document.querySelectorAll(sel)].find((el) => el.getClientRects().length > 0) ?? null;
}

/** Put the card below, above, right or left of the target, whichever fits first. */
function place(r: DOMRect | null): CSSProperties {
  const vw = innerWidth;
  const vh = innerHeight;
  const w = Math.min(CARD_W, vw - 32);
  const clampX = (x: number) => Math.max(16, Math.min(x, vw - w - 16));
  const clampY = (y: number) => Math.max(16, Math.min(y, vh - CARD_H - 16));
  if (!r) return { width: w, left: (vw - w) / 2, top: Math.max(16, vh / 2 - CARD_H / 2) };
  const cx = clampX(r.left + r.width / 2 - w / 2);
  if (r.bottom + GAP + CARD_H < vh) return { width: w, left: cx, top: r.bottom + GAP };
  if (r.top - GAP - CARD_H > 0) return { width: w, left: cx, bottom: vh - r.top + GAP };
  if (r.right + GAP + w < vw) return { width: w, left: r.right + GAP, top: clampY(r.top) };
  if (r.left - GAP - w > 0) return { width: w, left: r.left - GAP - w, top: clampY(r.top) };
  return { width: w, left: (vw - w) / 2, bottom: 16 };
}
