"use client";
import {
  Backpack, BookOpen, Coins, Compass, Download, Flame, Map as MapIcon, Moon, Mountain, RotateCcw,
  Signpost, Sun, Timer, Upload, Volume2, VolumeX,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { useRef, useState, type CSSProperties } from "react";
import { TITLES } from "@/lib/world";
import { game } from "@/storage/store";
import type { View } from "./App";

// `compact` items only show on tablet/phone, where the map has no side panel of its own.
const NAV: { id: View; label: string; icon: typeof Compass; adv?: boolean; compact?: boolean }[] = [
  { id: "today", label: "Today", icon: Compass },
  { id: "map", label: "Map", icon: MapIcon, adv: true, compact: true },
  { id: "journal", label: "Journal", icon: BookOpen, adv: true },
  { id: "campfire", label: "Campfire", icon: Flame },
  { id: "satchel", label: "Satchel", icon: Backpack },
];

export default observer(function Sidebar({ view, setView, onTour }: { view: View; setView: (v: View) => void; onTour: () => void }) {
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark">
          <Mountain />
        </span>
        <span>
          Doit
          <small>Expedition</small>
        </span>
      </div>

      <Profile />

      <nav className="nav" aria-label="Main">
        {NAV.filter((n) => !n.adv || game.s.adventure).map(({ id, label, icon: Icon, compact }) => (
          <button key={id} className={compact ? "compact-only" : undefined} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <Settings onTour={onTour} />
      </div>
    </aside>
  );
});

export const Profile = observer(function Profile() {
  const { s, level } = game;
  const next = TITLES[Math.min(level.level, TITLES.length - 1)];
  return (
    <section className="profile" aria-label="Your profile">
      <div className="who-row">
        <div className="emblem" style={{ "--p": level.into / level.need } as CSSProperties} title={`Level ${level.level}`}>
          <span>{level.level}</span>
        </div>
        <div className="who-text">
          <input
            className="name-input"
            defaultValue={s.name}
            key={s.name}
            aria-label="Your name"
            onBlur={(e) => game.setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <div className="rank">
            {level.title} · Lv {level.level}
          </div>
        </div>
      </div>
      <div className="bar" role="progressbar" aria-label="Experience" aria-valuenow={level.into} aria-valuemax={level.need}>
        <i style={{ width: `${(level.into / level.need) * 100}%` }} />
      </div>
      <div className="xp-label">
        <span>
          {level.into} / {level.need} XP
        </span>
        <span>
          {level.need - level.into} to {next}
        </span>
      </div>
      <div className="stats">
        <div className="stat">
          <Flame />
          <b>{s.streak}</b>
          <small>day streak</small>
        </div>
        <div className="stat">
          <Coins />
          <b>{s.gold}</b>
          <small>gold</small>
        </div>
        <div className="stat">
          <Timer />
          <b>{s.focusMin}</b>
          <small>focus min</small>
        </div>
      </div>
    </section>
  );
});

export const Settings = observer(function Settings({ onTour }: { onTour: () => void }) {
  const { s } = game;
  const file = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([game.exportData()], { type: "application/json" }));
    a.download = `doit-backup-${game.today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="settings">
      <button className="switch-row tour-btn" onClick={onTour}>
        <span>Take the tour</span>
        <Signpost />
      </button>
      <button className="switch-row" data-tour="mode" role="switch" aria-checked={s.adventure} onClick={game.toggleAdventure}>
        <span>Adventure mode</span>
        <span className="switch" />
      </button>
      <button className="switch-row" role="switch" aria-checked={s.sound} onClick={game.toggleSound}>
        <span>Sound</span>
        {s.sound ? <Volume2 /> : <VolumeX />}
      </button>
      <button className="switch-row" onClick={game.toggleTheme}>
        <span>{s.theme === "dark" ? "Night expedition" : "Daybreak"}</span>
        {s.theme === "dark" ? <Moon /> : <Sun />}
      </button>
      <details className="data-menu">
        <summary>Your data</summary>
        <p>Everything is saved in this browser only. Download a backup to keep it safe.</p>
        <button onClick={download}>
          <Download /> Download backup
        </button>
        <button onClick={() => file.current?.click()}>
          <Upload /> Restore backup
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) game.importData(await f.text());
            e.target.value = "";
          }}
        />
        <button
          className="danger"
          onBlur={() => setConfirmReset(false)}
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            game.reset();
            setConfirmReset(false);
          }}
        >
          <RotateCcw /> {confirmReset ? "Tap again to erase everything" : "Start a new journey"}
        </button>
      </details>
    </div>
  );
});
