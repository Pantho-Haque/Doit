"use client";
import { Coins, Flame, Settings2, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useRef, type CSSProperties } from "react";
import { game } from "@/storage/store";
import { Profile, Settings } from "./Sidebar";

/** Phone header: rank, XP and streak always in view; profile + settings live in a bottom sheet. */
export default observer(function AppBar({ onTour }: { onTour: () => void }) {
  const { s, level } = game;
  const sheet = useRef<HTMLDialogElement>(null);
  const open = () => sheet.current?.showModal();
  const close = () => sheet.current?.close();

  return (
    <>
      <header className="appbar">
        <button className="appbar-me" onClick={open}>
          <span className="emblem sm" style={{ "--p": level.into / level.need } as CSSProperties}>
            <span>{level.level}</span>
          </span>
          <span className="appbar-who">
            <b>{s.name}</b>
            <span>{level.title}</span>
          </span>
          <span className="sr-only">, level {level.level}. Open profile</span>
        </button>
        <span className="pill" title="Day streak">
          <Flame /> {s.streak}
        </span>
        <span className="pill" title="Gold">
          <Coins /> {s.gold}
        </span>
        <button className="icon-btn appbar-settings" onClick={open} aria-label="Settings">
          <Settings2 />
        </button>
        <div className="appbar-xp" aria-hidden>
          <i style={{ width: `${(level.into / level.need) * 100}%` }} />
        </div>
      </header>

      <dialog ref={sheet} className="sheet" aria-label="Profile and settings" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="sheet-head">
          <span className="kicker">Your expedition</span>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <X />
          </button>
        </div>
        <Profile />
        <Settings
          onTour={() => {
            close();
            onTour();
          }}
        />
      </dialog>
    </>
  );
});
