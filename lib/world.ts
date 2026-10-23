// Game content and pure rules. No React, no storage: easy to tune and to check (`pnpm check`).

export type Diff = "easy" | "normal" | "hard";

export type Quest = {
  id: string;
  title: string;
  diff: Diff;
  tag?: string;
  due?: string; // local day key, YYYY-MM-DD
  main: boolean;
  ritual: boolean;
  streak: number; // rituals only
  done: boolean;
  doneDay?: string;
  reward?: { xp: number; gold: number; steps: number; boss: number };
};

export const DIFF: Record<Diff, { xp: number; gold: number; steps: number; label: string; pips: number }> = {
  easy: { xp: 10, gold: 2, steps: 1, label: "Easy", pips: 1 },
  normal: { xp: 25, gold: 5, steps: 1, label: "Normal", pips: 2 },
  hard: { xp: 50, gold: 10, steps: 2, label: "Hard", pips: 3 },
};

export const STEPS_PER_REGION = 8; // waypoints on the trail; the last one is the gate

export const REGIONS = [
  {
    name: "Whispering Pines",
    blurb: "Mist hangs between the pines. Every quest you finish clears a little more of the path.",
    story:
      "You set out before dawn with an empty map and a pack full of intentions. The pines whispered the names of every task you had been avoiding. One by one you answered them, and the mist thinned. At the edge of the forest stood a stone marker carved with a single word: BEGIN. Someone had walked this way before you, and they had left the map unfinished on purpose.",
  },
  {
    name: "Ember Ridge",
    blurb: "Old campfires glow along the ridge. Each belongs to someone who finished what they started.",
    story:
      "The ridge glows at night with campfires that never quite went out. Travelers say each one belongs to someone who finished what they started. You lit your own and watched the sparks climb toward the pass. Ash inked a new line on your map: “Momentum is a fire you feed, not one you find.”",
  },
  {
    name: "Glass Lake",
    blurb: "The lake reflects everything, including the tasks you keep pushing to tomorrow.",
    story:
      "The lake is so still it mirrors the sky, and the tasks you keep pushing to tomorrow. You saw them all, floating just under the surface. Crossing took longer than planned, but every oar stroke was something done. On the far shore, the reflection showed only you.",
  },
  {
    name: "The Sunken Archive",
    blurb: "Below the hills lie shelves of half-written plans from a thousand someday lists.",
    story:
      "Beneath the hills lie shelves of half-written plans from a thousand someday lists. In the deepest room you found a ledger in your own handwriting, dated years from now, listing everything you would finish. The ink was still wet.",
  },
  {
    name: "Skyward Peak",
    blurb: "Above the clouds the whole map is visible at once. The last climb is yours.",
    story:
      "Above the clouds, the whole map is visible at once: every forest, ridge and lake you crossed, one finished quest at a time. Ash hands you the pen. “From here,” they say, “you draw the next map yourself.”",
  },
];

export const BOSSES = [
  {
    name: "The Someday Wyrm",
    hp: 300,
    lore: "Feeds on tasks postponed to “someday”. Every XP you earn wounds it.",
    taunts: ["Tomorrow. You'll do it tomorrow…", "Someday is so comfortable.", "Rest first. Start later. Much later.", "You have plenty of time. Plenty."],
  },
  {
    name: "The Inbox Hydra",
    hp: 400,
    lore: "Cut one thread and two more appear. Finished quests starve it.",
    taunts: ["Just one more email…", "Reply-all. REPLY-ALL!", "Check your inbox again. Something new arrived.", "Unread: 4,182."],
  },
  {
    name: "Lord of Busywork",
    hp: 500,
    lore: "Looks productive. Isn't. Only finished work pierces its armor.",
    taunts: ["Reorganize your folders first.", "Let's schedule a meeting about it.", "Color-code the list. Then begin.", "Being busy is basically the same as done."],
  },
];

export type Rarity = "common" | "rare" | "epic";
export const LOOT: { id: string; name: string; rarity: Rarity; desc: string }[] = [
  { id: "lantern", name: "Lantern of Early Hours", rarity: "common", desc: "A keepsake for the ones who start before the world wakes." },
  { id: "map", name: "Torn Map Fragment", rarity: "common", desc: "Part of a region nobody has charted yet." },
  { id: "compass", name: "Compass of Priorities", rarity: "rare", desc: "Always points at the one thing that matters most." },
  { id: "charm", name: "Ember Charm", rarity: "rare", desc: "Saves your streak once if you miss a day. Used automatically." },
  { id: "cloak", name: "Cloak of Deep Work", rarity: "epic", desc: "Woven from uninterrupted hours. Rarely seen." },
];

export const TITLES = ["Wanderer", "Scout", "Pathfinder", "Ranger", "Trailblazer", "Wayfinder", "Cartographer", "Legend"];

export const LINES = {
  greet: [
    "Morning, Wayfarer. Pick a main quest first. It clears the most fog.",
    "The trail is quiet today. A good day to finish something hard.",
  ],
  complete: [
    "Clean strike. The path ahead is clearer.",
    "That one had been lurking for a while. Well done.",
    "Steady steps. That's how ridges get climbed.",
    "Marked on the map. On to the next.",
  ],
  main: ["The main quest is done. Everything else today is a bonus."],
  allDone: ["Every quest for today is done. Rest by the fire. You earned it."],
  focusLeft: ["The fire flickered while you were away. It's still burning, come back to it."],
  focusDone: ["The fire burned bright. That was real, deep work."],
  streakSaved: ["You missed a day, so your Ember Charm burned to keep your streak alive."],
};

export const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Local-time day key (toISOString would use UTC and flip the day at the wrong hour). */
export function dayKey(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function levelInfo(xp: number) {
  let level = 1;
  let need = 100;
  while (xp >= need) {
    xp -= need;
    level++;
    need = 100 + (level - 1) * 60;
  }
  return { level, into: xp, need, title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
}

export function reward(q: Pick<Quest, "diff" | "main">) {
  const d = DIFF[q.diff];
  return q.main
    ? { xp: Math.round(d.xp * 1.5), gold: d.gold * 2, steps: d.steps + 1 }
    : { xp: d.xp, gold: d.gold, steps: d.steps };
}

/** Quick-add parser: "Ship onboarding !hard #work tomorrow", "Read 10 pages daily", "!main". */
export function parseQuest(raw: string, today = new Date()) {
  const out = { title: "", diff: "normal" as Diff, tag: undefined as string | undefined, due: dayKey(0, today), ritual: false, main: false };
  let t = ` ${raw} `;
  t = t.replace(/\s!(easy|normal|hard)(?=\s)/i, (_, d: string) => ((out.diff = d.toLowerCase() as Diff), " "));
  t = t.replace(/\s!main(?=\s)/i, () => ((out.main = true), " "));
  t = t.replace(/\s#([\p{L}\p{N}_-]+)/u, (_, g: string) => ((out.tag = g.toLowerCase()), " "));
  t = t.replace(/\s(today|tomorrow)(?=\s)/i, (_, d: string) => ((out.due = dayKey(d.toLowerCase() === "tomorrow" ? 1 : 0, today)), " "));
  t = t.replace(/\s(daily|every ?day)(?=\s)/i, () => ((out.ritual = true), " "));
  out.title = t.replace(/\s+/g, " ").trim();
  return out;
}

export function rollLoot(chance: number, forceRarity?: Rarity) {
  if (!forceRarity && Math.random() > chance) return null;
  const r = Math.random();
  const rarity = forceRarity ?? (r < 0.65 ? "common" : r < 0.92 ? "rare" : "epic");
  return pick(LOOT.filter((l) => l.rarity === rarity));
}

export const roman = (n: number) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? String(n);

export function dueLabel(due: string, today = new Date()) {
  if (due === dayKey(0, today)) return "Today";
  if (due === dayKey(1, today)) return "Tomorrow";
  if (due === dayKey(-1, today)) return "Yesterday";
  return new Date(`${due}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
