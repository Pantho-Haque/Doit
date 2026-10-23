"use client";
import { Compass, Gem, Info, Map as MapIcon, Swords, X } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as sfx from "@/lib/sound";
import { BOSSES, STEPS_PER_REGION as N, pick, roman } from "@/lib/world";
import { game } from "@/storage/store";
import BossArt from "./BossArt";

const D = "M40 392 C 150 392, 270 360, 236 296 S 52 246, 74 186 S 262 150, 244 96 S 120 44, 160 22";
const TREES = [[100, 345], [128, 352], [272, 330], [204, 238], [228, 228], [28, 252], [24, 150], [146, 190], [176, 178], [276, 146], [60, 62], [86, 44], [254, 40], [112, 104], [40, 300]];
const TOPO = [[250, 372, [18, 32, 46]], [56, 40, [14, 26, 38]], [36, 222, [16, 28]], [280, 210, [12, 24]]] as const;

export default observer(function Rail({ inline }: { inline?: boolean }) {
  const { s, region, nextRegion, companion } = game;
  return (
    <aside className={inline ? "rail inline" : "rail"} aria-label="Expedition">
      <section className="card map-card">
        <div className="card-head">
          <span>
            <MapIcon /> Chapter {roman(s.chapter + 1)}
          </span>
          <span>{s.step + 1} / {N}</span>
        </div>
        <div className="region">{region.name}</div>
        <Trail step={s.step} gate={nextRegion.name} />
      </section>

      <section className="card companion">
        <div className="avatar">
          <Compass />
        </div>
        <div>
          <div className="who">Ash · your cartographer</div>
          <p className="line" key={companion}>
            “{companion}”
          </p>
        </div>
      </section>

      <BossCard />
    </aside>
  );
});

const BossCard = observer(function BossCard() {
  const { s, boss } = game;
  const hp = Math.max(0, s.bossHp);
  const [hit, setHit] = useState<{ key: number; dmg: number } | null>(null);
  const [taunt, setTaunt] = useState<string | null>(null);
  const prev = useRef({ hp: s.bossHp, index: s.bossIndex });
  const timers = useRef<number[]>([]);
  const book = useRef<HTMLDialogElement>(null);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // flinch + damage number whenever the same boss loses HP
  useEffect(() => {
    const p = prev.current;
    if (s.bossIndex === p.index && s.bossHp < p.hp) {
      const h = { key: Date.now(), dmg: p.hp - s.bossHp };
      setHit(h);
      later(() => setHit((cur) => (cur === h ? null : cur)), 900);
    }
    prev.current = { hp: s.bossHp, index: s.bossIndex };
  }, [s.bossHp, s.bossIndex]);

  const poke = () => {
    if (taunt) return;
    if (s.sound) sfx.growl();
    setTaunt(pick(boss.taunts));
    later(() => setTaunt(null), 2800);
  };

  return (
    <section className="card boss">
      <div className="card-head">
        <span>
          <Swords /> Weekly boss
        </span>
        <span className="hp-wrap">
          {hp} / {boss.hp} HP
          <button className="icon-btn info-btn" onClick={() => book.current?.showModal()} aria-label="All bosses (bestiary)">
            <Info />
          </button>
        </span>
      </div>
      <Bestiary dialog={book} />
      <div className="lair" key={s.bossIndex}>
        <button className="lair-btn" onClick={poke} aria-label={`Taunt ${boss.name}`}>
          <BossArt variant={s.bossIndex} name={boss.name} enraged={hp / boss.hp < 0.35} hit={!!hit} roaring={!!taunt} />
        </button>
        {hit && (
          <span className="dmg" key={hit.key} aria-hidden>
            −{hit.dmg}
          </span>
        )}
        {taunt && (
          <div className="taunt" role="status">
            “{taunt}”
          </div>
        )}
      </div>
      <h3>{boss.name}</h3>
      <p>{boss.lore}</p>
      <div className="bar hp" role="progressbar" aria-label={`${boss.name} health`} aria-valuenow={hp} aria-valuemax={boss.hp}>
        <i style={{ width: `${(hp / boss.hp) * 100}%` }} />
      </div>
      <small className="boss-hint">{hp / boss.hp < 0.35 ? "It's furious. Finish it off." : "Tap the beast if you dare."}</small>
    </section>
  );
});

/** Times boss `i` has been beaten, given `defeats` total kills (bosses come in a fixed loop). */
const beaten = (i: number, defeats: number) => (defeats > i ? Math.floor((defeats - 1 - i) / BOSSES.length) + 1 : 0);

/** Every boss at a glance. Unmet ones stay as silhouettes to make you curious. */
const Bestiary = observer(function Bestiary({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  const { bossIndex, bossHp } = game.s;
  const current = bossIndex % BOSSES.length;
  const close = () => dialog.current?.close();

  return (
    <dialog ref={dialog} className="sheet bestiary" aria-label="Bestiary" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet-head">
        <span className="kicker">Bestiary · {bossIndex} slain</span>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <X />
        </button>
      </div>
      <p className="bestiary-lede">Every XP you earn is a strike. Bring a beast down and the next one crawls out of the fog.</p>
      <ul className="bestiary-list">
        {BOSSES.map((b, i) => {
          const n = beaten(i, bossIndex);
          const state = i === current ? "current" : n > 0 ? "slain" : "locked";
          return (
            <li key={b.name} className={`beast ${state}`}>
              <div className="beast-art">
                <BossArt variant={i} name={state === "locked" ? "Unknown beast" : b.name} enraged={false} hit={false} roaring={false} />
              </div>
              <div className="beast-info">
                <span className="kicker">{state === "current" ? "Hunting now" : state === "slain" ? `Slain ×${n}` : "Not yet seen"}</span>
                <b>{state === "locked" ? "? ? ?" : b.name}</b>
                <span className="beast-hp">{b.hp} HP</span>
                <p>{state === "locked" ? "Something stirs beyond the edge of your map. Defeat the beast before it to draw it out." : b.lore}</p>
                {state === "current" && (
                  <span className="bar hp">
                    <i style={{ width: `${(Math.max(0, bossHp) / b.hp) * 100}%` }} />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="bestiary-reward">
        <Gem /> Each kill: 100 gold and a guaranteed epic item
      </div>
    </dialog>
  );
});

function Trail({ step, gate }: { step: number; gate: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [geo, setGeo] = useState<{ L: number; pts: { x: number; y: number }[] } | null>(null);

  useLayoutEffect(() => {
    const p = ref.current!;
    const L = p.getTotalLength();
    setGeo({ L, pts: Array.from({ length: N }, (_, i) => p.getPointAtLength((L * i) / (N - 1))) });
  }, []);

  return (
    <svg className="trail" viewBox="0 0 300 420" role="img" aria-label={`Trail map: waypoint ${step + 1} of ${N}, gate to ${gate} at the top`}>
      <g className="topo">
        {TOPO.flatMap(([x, y, rs]) => rs.map((r) => <circle key={`${x}${y}${r}`} cx={x} cy={y} r={r} />))}
      </g>
      <g className="trees">
        {TREES.map(([x, y]) => (
          <path key={`${x},${y}`} d={`M${x} ${y - 12} L${x + 7} ${y + 3} L${x - 7} ${y + 3} Z`} />
        ))}
      </g>
      <path ref={ref} d={D} className="t-base" />
      {geo && (
        <>
          <path d={D} className="t-prog" style={{ strokeDasharray: geo.L, strokeDashoffset: geo.L * (1 - step / (N - 1)) }} />
          {geo.pts.map((pt, i) =>
            i === N - 1 ? (
              <g key={i} className="gate" transform={`translate(${pt.x} ${pt.y})`}>
                <path d="M-1 8 V-14 L12 -9 L-1 -4" />
                <text x={16} y={-2} className="t-label">{gate}</text>
              </g>
            ) : (
              <circle key={i} cx={pt.x} cy={pt.y} r={5} className={i <= step ? "node on" : "node"} />
            ),
          )}
          <text x={geo.pts[0].x - 8} y={geo.pts[0].y + 22} className="t-label">Camp</text>
          <g className="marker" style={{ transform: `translate(${geo.pts[step].x}px, ${geo.pts[step].y}px)` }}>
            <circle r={14} className="pulse" />
            <circle r={7} className="core" />
          </g>
        </>
      )}
    </svg>
  );
}
