"use client";
import { Lock } from "lucide-react";
import { observer } from "mobx-react-lite";
import { REGIONS, roman } from "@/lib/world";
import { game } from "@/storage/store";

export default observer(function Journal() {
  const { s, stepsToGate } = game;
  const current = s.chapter % REGIONS.length;

  return (
    <div className="view">
      <header className="chapter">
        <div className="kicker">Journal</div>
        <h1>The story so far</h1>
        <p className="lede">Each region you cross adds a page. Reach a gate to unlock its chapter.</p>
      </header>
      <div className="entries">
        {REGIONS.map((r, i) => {
          const open = s.journal.includes(i);
          return (
            <article key={r.name} className={open ? "entry" : "entry locked"}>
              <div className="kicker">Chapter {roman(i + 1)}</div>
              <h2>{r.name}</h2>
              {open ? (
                <p className="story">{r.story}</p>
              ) : (
                <p className="locked-text">
                  <Lock />
                  {i === current
                    ? `You are here. ${stepsToGate} more ${stepsToGate === 1 ? "step" : "steps"} to the gate.`
                    : "Still beyond the edge of your map."}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
});
