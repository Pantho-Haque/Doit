"use client";
import { Plus } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState, useSyncExternalStore } from "react";
import { roman } from "@/lib/world";
import { game } from "@/storage/store";
import AppBar from "./AppBar";
import Campfire from "./Campfire";
import Effects from "./Effects";
import Journal from "./Journal";
import Rail from "./Rail";
import Satchel from "./Satchel";
import Sidebar from "./Sidebar";
import Today from "./Today";
import Tour from "./Tour";

export type View = "today" | "map" | "journal" | "campfire" | "satchel";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

export default observer(function App() {
  const [view, setView] = useState<View>("today");
  const [touring, setTouring] = useState(false);
  const { theme, adventure } = game.s;
  const compact = useMedia("(max-width: 1180px)"); // no side panel: map gets its own tab
  const mobile = useMedia("(max-width: 760px)"); // top bar + bottom tabs
  let shown = view;
  if (!adventure && (view === "journal" || view === "map")) shown = "today";
  if (!compact && view === "map") shown = "today";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d1012" : "#f3eee2");
  }, [theme]);

  // first visit: start the tour once the page has settled
  useEffect(() => {
    if (game.s.tourDone) return;
    const t = setTimeout(() => setTouring(true), 800);
    return () => clearTimeout(t);
  }, []);

  const startTour = () => {
    setView("today");
    setTouring(true);
  };

  // "/" jumps to quick add from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      setView("today");
      requestAnimationFrame(() => document.getElementById("quick-add")?.focus());
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={adventure ? "app" : "app calm"}>
      <Sidebar view={shown} setView={setView} onTour={startTour} />
      {mobile && <AppBar onTour={startTour} />}
      <main className="main" key={shown}>
        {shown === "today" && (
          <Today
            onFocus={(id) => {
              game.setFocusQuest(id);
              setView("campfire");
            }}
            onMap={() => setView("map")}
          />
        )}
        {shown === "map" && (
          <div className="view">
            <header className="chapter">
              <div className="kicker">Chapter {roman(game.s.chapter + 1)}</div>
              <h1>{game.region.name}</h1>
              <p className="lede">{game.region.blurb}</p>
            </header>
            <Rail inline />
          </div>
        )}
        {shown === "journal" && <Journal />}
        {shown === "campfire" && <Campfire />}
        {shown === "satchel" && <Satchel />}
      </main>
      {adventure && !compact && <Rail />}
      {mobile && shown === "today" && (
        // focus must happen inside the tap itself, or iOS won't open the keyboard
        <button className="fab" aria-label="Add a quest" onClick={() => document.getElementById("quick-add")?.focus()}>
          <Plus />
        </button>
      )}
      <Effects />
      <Tour
        open={touring}
        onClose={() => {
          setTouring(false);
          game.finishTour();
        }}
      />
    </div>
  );
});
