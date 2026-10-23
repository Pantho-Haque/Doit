"use client";
import { useId } from "react";

// One menacing head design, dressed differently per boss:
// 0 Someday Wyrm (ember red), 1 Inbox Hydra (three green heads), 2 Lord of Busywork (violet, crowned).
const LOOKS = [
  { body: ["#5a2636", "#1a0a10"], edge: "#93404f", eye: ["#fff0a8", "#ff7a1f"], lair: "#3a1414" },
  { body: ["#215248", "#0a1c19"], edge: "#3d8a78", eye: ["#f1ffa8", "#7bd13a"], lair: "#0f2a22" },
  { body: ["#3b2d68", "#120c22"], edge: "#6a52b0", eye: ["#d8fbff", "#3fa9ff"], lair: "#1c1438" },
];

const HEADS = {
  single: [{ x: 120, y: 96, s: 0.9, r: 0, d: 0 }],
  hydra: [
    { x: 60, y: 110, s: 0.56, r: -16, d: -1.3 },
    { x: 180, y: 110, s: 0.56, r: 16, d: -2.4 },
    { x: 120, y: 98, s: 0.8, r: 0, d: 0 },
  ],
};

const EMBERS = [[30, 0], [70, 1.4], [104, 2.6], [150, 0.7], [188, 2], [214, 3.1]];

export default function BossArt({
  variant, enraged, hit, roaring, name,
}: { variant: number; enraged: boolean; hit: boolean; roaring: boolean; name: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const v = variant % LOOKS.length;
  const look = LOOKS[v];
  const u = (k: string) => `url(#${k}${id})`;
  const heads = v === 1 ? HEADS.hydra : HEADS.single;

  return (
    <svg
      viewBox="0 0 240 170"
      className={["boss-art", enraged && "enraged", hit && "hit", roaring && "roaring"].filter(Boolean).join(" ")}
      role="img"
      aria-label={`${name}${enraged ? ", badly wounded and furious" : ""}`}
    >
      <defs>
        <radialGradient id={`lair${id}`} cx="50%" cy="100%" r="90%">
          <stop offset="0" stopColor={look.lair} />
          <stop offset="1" stopColor="#09070a" />
        </radialGradient>
        <radialGradient id={`rage${id}`} cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="#ff3b1f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff3b1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`body${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.body[0]} />
          <stop offset="1" stopColor={look.body[1]} />
        </linearGradient>
        <linearGradient id={`horn${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#6d6150" />
          <stop offset="1" stopColor="#efe4cc" />
        </linearGradient>
        <linearGradient id={`eye${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.eye[0]} />
          <stop offset="1" stopColor={look.eye[1]} />
        </linearGradient>
        <radialGradient id={`maw${id}`} cx="50%" cy="80%" r="70%">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="0.45" stopColor="#d2361b" />
          <stop offset="1" stopColor="#2a0505" />
        </radialGradient>
        <linearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#09070a" stopOpacity="0" />
          <stop offset="1" stopColor="#09070a" />
        </linearGradient>
        <filter id={`glow${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`blur${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="240" height="170" fill={u("lair")} />
      <ellipse className="lair-glow" cx="120" cy="170" rx="150" ry="90" fill={u("rage")} />
      {EMBERS.map(([x, d]) => (
        <circle key={x} className="ember" cx={x} cy={160} r={1.3} style={{ animationDelay: `${d}s` }} />
      ))}

      {heads.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.r}) scale(${h.s})`}>
          <Head u={u} edge={look.edge} delay={h.d} crown={v === 2} />
        </g>
      ))}

      <rect y="118" width="240" height="52" fill={u("fade")} />
      <g className="fog">
        <ellipse cx="50" cy="162" rx="70" ry="12" />
        <ellipse cx="180" cy="166" rx="80" ry="12" style={{ animationDelay: "-4s" }} />
        <ellipse cx="120" cy="170" rx="90" ry="10" style={{ animationDelay: "-2s" }} />
      </g>
    </svg>
  );
}

function Head({ u, edge, delay, crown }: { u: (k: string) => string; edge: string; delay: number; crown: boolean }) {
  const anim = { animationDelay: `${delay}s` };
  return (
    <>
      {/* neck */}
      <path d="M-30 30 C-34 70 -40 100 -52 130 L52 130 C40 100 34 70 30 30 Z" fill={u("body")} />
      <g fill="none" stroke={edge} strokeOpacity="0.5" strokeWidth="1.5">
        <path d="M-24 66 Q0 76 24 66" />
        <path d="M-27 84 Q0 95 27 84" />
        <path d="M-31 102 Q0 114 31 102" />
      </g>

      <g className="bob" style={anim}>
        {/* horns and spikes */}
        <path d="M-26 -38 C-46 -48 -60 -70 -52 -92 C-44 -74 -32 -62 -12 -50 Z" fill={u("horn")} />
        <path d="M26 -38 C46 -48 60 -70 52 -92 C44 -74 32 -62 12 -50 Z" fill={u("horn")} />
        <path d="M-50 -4 L-74 4 L-50 12 Z M-46 14 L-66 28 L-40 24 Z" fill={u("body")} stroke={edge} strokeWidth="1" />
        <path d="M50 -4 L74 4 L50 12 Z M46 14 L66 28 L40 24 Z" fill={u("body")} stroke={edge} strokeWidth="1" />

        {/* fiery maw, revealed when the jaw drops */}
        <path className="maw" d="M-26 35 L0 40 L26 35 L20 58 L0 66 L-20 58 Z" fill={u("maw")} />
        <g className="jaw" style={anim}>
          <path d="M-27 37 C-22 50 -10 60 0 66 C10 60 22 50 27 37 L16 42 L0 46 L-16 42 Z" fill={u("body")} stroke={edge} strokeWidth="1.2" />
          <path d="M-15 43 l3 -7 l3 7 Z M9 43 l3 -7 l3 7 Z M-3 46 l3 -6 l3 6 Z" fill="#efe4cc" />
        </g>

        {/* skull */}
        <path
          d="M0 -50 C30 -50 50 -30 52 -5 C54 12 42 26 28 36 L0 40 L-28 36 C-42 26 -54 12 -52 -5 C-50 -30 -30 -50 0 -50 Z"
          fill={u("body")}
          stroke={edge}
          strokeWidth="1.6"
        />
        <g fill="none" stroke={edge} strokeWidth="1.3" strokeOpacity="0.8">
          <path d="M-16 -36 Q-8 -29 0 -36 Q8 -29 16 -36" />
          <path d="M-11 -25 Q-5 -19 0 -25 Q5 -19 11 -25" />
          <path d="M0 -14 V14" strokeOpacity="0.4" />
        </g>
        <g className="cracks" fill="none" stroke="#ff7a1f" strokeWidth="1.6" strokeLinecap="round">
          <path d="M-12 -46 L-6 -34 L-14 -24 L-8 -14" />
          <path d="M20 -40 L14 -28 L22 -18" />
          <path d="M-34 18 L-24 22 L-28 30" />
        </g>
        {/* teeth on the upper lip */}
        <path d="M-24 35 l3 9 l3 -8 Z M-14 37 l3 10 l3 -9 Z M8 38 l3 9 l3 -10 Z M18 36 l3 8 l3 -9 Z" fill="#efe4cc" />

        {/* angry brows and burning eyes */}
        <ellipse className="halo" cx="-22" cy="5" rx="17" ry="9" fill={u("eye")} filter={u("blur")} />
        <ellipse className="halo" cx="22" cy="5" rx="17" ry="9" fill={u("eye")} filter={u("blur")} />
        <g className="eyes" filter={u("glow")}>
          <path className="eye" d="M-37 -4 L-9 3 L-15 12 L-32 9 Z" fill={u("eye")} />
          <path className="eye" d="M37 -4 L9 3 L15 12 L32 9 Z" fill={u("eye")} />
          <ellipse cx="-22" cy="5" rx="1.7" ry="5" fill="#120505" />
          <ellipse cx="22" cy="5" rx="1.7" ry="5" fill="#120505" />
        </g>
        <path d="M-42 -16 L-5 -5 L-7 2 L-42 -7 Z M42 -16 L5 -5 L7 2 L42 -7 Z" fill="#0b0608" />

        {/* nostrils breathing smoke */}
        <path d="M-7 25 l-5 -5 M7 25 l5 -5" stroke="#0b0608" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="smoke" cx="-10" cy="22" r="3.5" style={{ animationDelay: `${delay}s`, ["--sx" as string]: "-22px" }} />
        <circle className="smoke" cx="10" cy="22" r="3.5" style={{ animationDelay: `${delay - 1.6}s`, ["--sx" as string]: "22px" }} />

        {crown && (
          <g>
            <path d="M-26 -44 L-22 -68 L-11 -54 L0 -76 L11 -54 L22 -68 L26 -44 Z" fill="#e3b341" stroke="#8a6414" strokeWidth="1.2" />
            <circle cx="0" cy="-54" r="3.4" fill="#ff4d6d" />
          </g>
        )}
      </g>
    </>
  );
}
