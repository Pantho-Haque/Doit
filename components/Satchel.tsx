"use client";
import { Coins, Gem, Gift, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { LOOT } from "@/lib/world";
import { game } from "@/storage/store";

export default observer(function Satchel() {
  const { s } = game;
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("40");

  return (
    <div className="view">
      <header className="chapter">
        <div className="kicker">Satchel</div>
        <h1>
          <Coins className="h1-icon" /> {s.gold} gold
        </h1>
        <p className="lede">Spend gold on rewards you choose yourself. Treat it like a promise to yourself.</p>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>Your rewards</h2>
          <small>you set the price</small>
        </div>
        <ul className="list">
          {s.rewards.map((r) => (
            <li key={r.id} className="reward">
              <Gift className="reward-icon" />
              <span className="reward-title">{r.title}</span>
              <button className="btn small" disabled={s.gold < r.cost} onClick={() => game.buyReward(r.id)}>
                <Coins /> {r.cost}
              </button>
              <button className="icon-btn" aria-label={`Remove ${r.title}`} onClick={() => game.removeReward(r.id)}>
                <X />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="reward-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (game.addReward(title, Number(cost))) setTitle("");
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New reward, e.g. Order takeout" aria-label="Reward" />
          <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min={1} max={9999} aria-label="Cost in gold" />
          <button className="btn" disabled={!title.trim()}>
            Add
          </button>
        </form>
      </section>

      {s.adventure && (
        <section className="section">
          <div className="section-head">
            <h2>Loot</h2>
            <small>dropped by finished quests and bosses</small>
          </div>
          <div className="loot-grid">
            {LOOT.map((l) => {
              const n = s.loot[l.id] ?? 0;
              return (
                <div key={l.id} className={`loot ${l.rarity} ${n ? "" : "missing"}`}>
                  <div className="gem">
                    <Gem />
                  </div>
                  {n > 0 && <span className="count">×{n}</span>}
                  <span className="rarity">{l.rarity}</span>
                  <b>{n ? l.name : "Undiscovered"}</b>
                  <p>{n ? l.desc : "Keep finishing quests. Something is out there."}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
});
