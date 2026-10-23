"use client";
import { Check, ChevronRight, Ellipsis, Flame, Footprints, Plus, Star, Swords, Trash2 } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DIFF, STEPS_PER_REGION, dayKey, dueLabel, parseQuest, reward, roman, type Diff, type Quest } from "@/lib/world";
import { game } from "@/storage/store";
import { burst } from "./Effects";

type OnFocus = (id: string) => void;
type OnMore = (id: string) => void;

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default observer(function Today({ onFocus, onMap }: { onFocus: OnFocus; onMap: () => void }) {
  const { s, region, nextRegion, stepsToGate, todayStats: st, mainQuest, sideQuests, rituals, completed, companion } = game;
  const adv = s.adventure;
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const card = (q: Quest) => <QuestCard key={q.id} q={q} onFocus={onFocus} onMore={setSheetFor} />;

  return (
    <div className="view">
      <header className="chapter">
        {adv && (
          <div className="kicker">
            Chapter {roman(s.chapter + 1)} · {region.name}
          </div>
        )}
        <h1>
          {greeting()}, {s.name}.
        </h1>
        {adv && <p className="lede wide-only">{region.blurb}</p>}
        {adv && <p className="lede compact-only">“{companion}” <span className="lede-who">Ash</span></p>}
        <div className="daybar">
          <span>
            <span className="mini-ring" style={{ "--p": st.total ? st.done / st.total : 0 } as CSSProperties} />
            <b>{st.done}</b> of <b>{st.total}</b> done today
          </span>
          {adv && (
            <span className="wide-only">
              <Footprints />
              <b>{stepsToGate}</b> {stepsToGate === 1 ? "step" : "steps"} to {nextRegion.name}
            </span>
          )}
        </div>
        {adv && <Expedition onMap={onMap} />}
      </header>

      <QuickAdd />

      <Section tour="main" title={adv ? "Main quest" : "Top priority"} hint="1.5× XP · double gold · +1 step">
        {mainQuest ? (
          <ul className="list">{card(mainQuest)}</ul>
        ) : (
          <div className="empty">
            No {adv ? "main quest" : "top priority"} yet. Open a quest’s <Ellipsis className="inline" /> menu or tap the <Star className="inline" /> to choose the one that matters most today.
          </div>
        )}
      </Section>

      <Section title={adv ? "Side quests" : "Tasks"} hint={`${sideQuests.length} open`}>
        {sideQuests.length ? (
          <ul className="list">{sideQuests.map(card)}</ul>
        ) : (
          <div className="empty">The trail is clear. Add a quest, or enjoy the view.</div>
        )}
      </Section>

      <Section title={adv ? "Daily rituals" : "Habits"} hint="reset every morning">
        {rituals.length ? (
          <ul className="list">{rituals.map(card)}</ul>
        ) : (
          <div className="empty">
            Add a habit with the word <code>daily</code>, like “Stretch 10 min daily”.
          </div>
        )}
      </Section>

      {completed.length > 0 && (
        <details className="section done-list">
          <summary>Completed today · {completed.length}</summary>
          <ul className="list">{completed.map(card)}</ul>
        </details>
      )}

      <QuestSheet id={sheetFor} onClose={() => setSheetFor(null)} onFocus={onFocus} />
    </div>
  );
});

/** Tablet/phone stand-in for the side panel: trail progress and the boss at a glance. */
const Expedition = observer(function Expedition({ onMap }: { onMap: () => void }) {
  const { s, nextRegion, stepsToGate, boss } = game;
  const hp = Math.max(0, s.bossHp);
  return (
    <button className="expedition compact-only" onClick={onMap}>
      <span className="exp-row">
        <Footprints />
        <span>
          <b>{stepsToGate}</b> {stepsToGate === 1 ? "step" : "steps"} to {nextRegion.name}
        </span>
        <ChevronRight className="exp-go" />
      </span>
      <span className="exp-trail" aria-hidden>
        {Array.from({ length: STEPS_PER_REGION }, (_, i) => (
          <i key={i} className={i === s.step ? "here" : i < s.step ? "on" : i === STEPS_PER_REGION - 1 ? "gate" : ""} />
        ))}
      </span>
      <span className="exp-boss">
        <Swords />
        <span className="exp-boss-name">{boss.name}</span>
        <span className="bar hp">
          <i style={{ width: `${(hp / boss.hp) * 100}%` }} />
        </span>
        <b>{hp}</b>
      </span>
      <span className="sr-only">Open the map</span>
    </button>
  );
});

const DUE: { label: string; day: () => string | null }[] = [
  { label: "Today", day: () => dayKey() },
  { label: "Tomorrow", day: () => dayKey(1) },
  { label: "Someday", day: () => null },
];

/** Everything you can do to a quest, in one place. Bottom sheet on phones, dialog on desktop. */
const QuestSheet = observer(function QuestSheet({ id, onClose, onFocus }: { id: string | null; onClose: () => void; onFocus: OnFocus }) {
  const ref = useRef<HTMLDialogElement>(null);
  const q = id ? game.s.quests.find((x) => x.id === id) : undefined;

  useEffect(() => {
    const d = ref.current!;
    if (q && !d.open) d.showModal();
    if (!q && d.open) d.close();
  }, [q]);

  const close = () => ref.current?.close();
  const dueNow = q?.due ? (q.due === dayKey() ? "Today" : q.due === dayKey(1) ? "Tomorrow" : null) : "Someday";

  return (
    <dialog ref={ref} className="sheet" aria-label="Edit quest" onClose={onClose} onClick={(e) => e.target === e.currentTarget && close()}>
      {q && (
        <>
          <input
            key={q.id}
            className="sheet-title"
            defaultValue={q.title}
            aria-label="Quest title"
            onBlur={(e) => game.rename(q.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <div className="field">
            <span>Difficulty</span>
            <div className="seg" role="group" aria-label="Difficulty">
              {(Object.keys(DIFF) as Diff[]).map((d) => (
                <button key={d} aria-pressed={q.diff === d} onClick={() => game.updateQuest(q.id, { diff: d })}>
                  {DIFF[d].label} · {reward({ diff: d, main: q.main }).xp} XP
                </button>
              ))}
            </div>
          </div>
          {!q.ritual && (
            <div className="field">
              <span>Due</span>
              <div className="seg" role="group" aria-label="Due date">
                {DUE.map((d) => (
                  <button key={d.label} aria-pressed={dueNow === d.label} onClick={() => game.updateQuest(q.id, { due: d.day() })}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="sheet-actions">
            {!q.ritual && !q.done && (
              <button className="sheet-row" onClick={() => game.toggleMain(q.id)}>
                <Star /> {q.main ? "Remove as main quest" : "Make it the main quest"}
              </button>
            )}
            {!q.done && (
              <button
                className="sheet-row"
                onClick={() => {
                  close();
                  onFocus(q.id);
                }}
              >
                <Flame /> Focus on it at the campfire
              </button>
            )}
            <button
              className="sheet-row danger"
              onClick={() => {
                close();
                game.remove(q.id);
              }}
            >
              <Trash2 /> Abandon quest
            </button>
          </div>
          <button className="btn primary sheet-done" onClick={close}>
            Done
          </button>
        </>
      )}
    </dialog>
  );
});

function Section({ title, hint, tour, children }: { title: string; hint?: string; tour?: string; children: ReactNode }) {
  return (
    <section className="section" data-tour={tour}>
      <div className="section-head">
        <h2>{title}</h2>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </section>
  );
}

const TOKENS = ["!easy", "!hard", "!main", "#work", "tomorrow", "daily"];

function QuickAdd() {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const p = text.trim() ? parseQuest(text) : null;

  return (
    <div>
      <form
        className="quick"
        onSubmit={(e) => {
          e.preventDefault();
          if (game.addQuest(text)) setText("");
        }}
      >
        <Plus className="quick-icon" />
        <input
          id="quick-add"
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New quest…  e.g. Ship the deck !hard #work tomorrow"
          aria-label="New quest"
          autoComplete="off"
        />
        <kbd aria-hidden>/</kbd>
        <button className="btn primary" disabled={!p?.title}>
          Add
        </button>
      </form>
      <div className={p ? "chips" : "chips hints"} aria-live="polite">
        {p ? (
          <>
            <span className={`chip d-${p.diff}`}>
              {DIFF[p.diff].label} · +{reward(p).xp} XP
            </span>
            {p.tag && <span className="chip">#{p.tag}</span>}
            {p.ritual ? <span className="chip">Daily ritual</span> : <span className="chip">{dueLabel(p.due)}</span>}
            {p.main && !p.ritual && <span className="chip ember">Main quest</span>}
          </>
        ) : (
          TOKENS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => {
                setText((v) => `${v.trim()} ${t}`.trimStart() + " ");
                input.current?.focus();
              }}
            >
              {t}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const touch = () => matchMedia("(hover: none)").matches;

const QuestCard = observer(function QuestCard({ q, onFocus, onMore }: { q: Quest; onFocus: OnFocus; onMore: OnMore }) {
  const [editing, setEditing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cancel = useRef(false);
  const r = reward(q);
  const d = DIFF[q.diff];
  const overdue = !q.done && !!q.due && q.due < game.today;

  const toggle = (el: HTMLElement) => {
    if (q.done) {
      setLeaving(false);
      return game.uncomplete(q.id);
    }
    if (leaving) return;
    burst(el, `+${r.xp} XP`);
    navigator.vibrate?.(14);
    setLeaving(true);
    // let the stamp animation play before the card moves to "Completed"
    setTimeout(() => game.complete(q.id), q.ritual ? 0 : 420);
  };

  return (
    <li className={["quest", q.done && "done", leaving && !q.done && "leaving", q.main && "main", overdue && "fog"].filter(Boolean).join(" ")}>
      <button
        className="seal"
        aria-pressed={q.done}
        aria-label={q.done ? `Mark “${q.title}” as not done` : `Complete “${q.title}”`}
        onClick={(e) => toggle(e.currentTarget)}
      >
        <Check />
      </button>

      <div className="q-body" onClick={() => !editing && touch() && onMore(q.id)}>
        {editing ? (
          <input
            className="q-edit"
            defaultValue={q.title}
            autoFocus
            aria-label="Quest title"
            onBlur={(e) => {
              if (!cancel.current) game.rename(q.id, e.target.value);
              cancel.current = false;
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancel.current = true;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <div className="q-title" onDoubleClick={() => !touch() && setEditing(true)}>
            {q.title}
          </div>
        )}
        <div className="q-meta">
          <span className={`diff d-${q.diff}`}>
            <span className="pips" aria-hidden>
              {[1, 2, 3].map((i) => (
                <i key={i} className={i <= d.pips ? "on" : ""} />
              ))}
            </span>
            {d.label}
          </span>
          {q.tag && <span className="tag">#{q.tag}</span>}
          {q.due && <span className={overdue ? "due late" : "due"}>{dueLabel(q.due)}</span>}
          {overdue && game.s.adventure && <span className="fogtag">fog creeping</span>}
          {q.ritual && (
            <span className="streak" title="Ritual streak">
              <Flame /> {q.streak}
            </span>
          )}
        </div>
      </div>

      <span className="q-xp">+{r.xp} XP</span>

      <div className="q-actions">
        {!q.ritual && !q.done && (
          <button className="icon-btn hover-act" aria-label="Make this the main quest" aria-pressed={q.main} onClick={() => game.toggleMain(q.id)}>
            <Star />
          </button>
        )}
        {!q.done && (
          <button className="icon-btn hover-act" aria-label="Focus on this at the campfire" onClick={() => onFocus(q.id)}>
            <Flame />
          </button>
        )}
        <button className="icon-btn" aria-label={`Edit “${q.title}”`} onClick={() => onMore(q.id)}>
          <Ellipsis />
        </button>
        <button className="icon-btn hover-act" aria-label="Abandon quest" onClick={() => game.remove(q.id)}>
          <Trash2 />
        </button>
      </div>
    </li>
  );
});
