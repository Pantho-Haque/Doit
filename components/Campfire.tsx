"use client";
import { Check, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { observer } from "mobx-react-lite";
import { game } from "@/storage/store";
import { burst } from "./Effects";

const EMBERS = Array.from({ length: 10 }, (_, i) => ({ x: `${(i % 2 ? 1 : -1) * (10 + ((i * 17) % 40))}px`, delay: `${(i * 0.27).toFixed(2)}s` }));

export default observer(function Campfire() {
  const f = game.focus;
  const open = game.s.quests.filter((q) => !q.done);
  const quest = open.find((q) => q.id === f.questId);
  const mm = String(Math.floor(f.left / 60)).padStart(2, "0");
  const ss = String(f.left % 60).padStart(2, "0");

  return (
    <div className="view campfire">
      <header className="chapter">
        <div className="kicker">Campfire</div>
        <h1>Pick one quest. Let it burn.</h1>
        <p className="lede">
          Focus sessions earn XP and wound the boss. If you wander off to another tab, the fire flickers and Ash will notice.
        </p>
      </header>

      <div className="hearth">
        <div className={`fire ${f.running ? "lit" : "idle"}`} aria-hidden>
          <div className="glow" />
          <div className="embers">
            {EMBERS.map((e, i) => (
              <i key={i} style={{ ["--x" as string]: e.x, animationDelay: e.delay }} />
            ))}
          </div>
          <div className="flames">
            <div className="flame f1" />
            <div className="flame f2" />
            <div className="flame f3" />
          </div>
          <div className="logs">
            <i />
            <i />
          </div>
        </div>
        <div className="timer" role="timer" aria-label={`${mm} minutes ${ss} seconds left`}>
          {mm}:{ss}
        </div>
        <div className="bar">
          <i style={{ width: `${(1 - f.left / f.total) * 100}%` }} />
        </div>
      </div>

      <div className="focus-controls">
        <label className="field">
          <span>Quest</span>
          <select value={quest ? f.questId : ""} onChange={(e) => game.setFocusQuest(e.target.value)} disabled={f.running}>
            <option value="">Free focus, no quest</option>
            {open.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Length</span>
          <div className="seg" role="group" aria-label="Session length">
            {[15, 25, 50].map((m) => (
              <button key={m} aria-pressed={f.total === m * 60} disabled={f.running} onClick={() => game.setFocusLength(m)}>
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          {f.running ? (
            <button className="btn" onClick={game.pauseFocus}>
              <Pause /> Pause
            </button>
          ) : (
            <button className="btn primary" onClick={game.startFocus}>
              <Play /> {f.left < f.total ? "Rekindle" : "Light the fire"}
            </button>
          )}
          <button className="btn ghost" onClick={game.resetFocus} disabled={f.left === f.total && !f.running}>
            <RotateCcw /> Reset
          </button>
          {quest && (
            <button
              className="btn ghost"
              onClick={(e) => {
                burst(e.currentTarget, "Quest done");
                game.complete(quest.id);
              }}
            >
              <Check /> Quest done
            </button>
          )}
        </div>

        <button className="btn ghost sound-btn" aria-pressed={game.s.sound} onClick={game.toggleSound}>
          {game.s.sound ? <Volume2 /> : <VolumeX />} Fire sounds {game.s.sound ? "on" : "off"}
        </button>

        <label className="demo">
          <input type="checkbox" checked={f.speed > 1} onChange={game.toggleDemoSpeed} />
          Demo speed (1 second = 1 minute)
        </label>
      </div>
    </div>
  );
});
