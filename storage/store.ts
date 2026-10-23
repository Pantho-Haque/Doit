"use client";
import { autorun, makeAutoObservable, toJS } from "mobx";
import {
  BOSSES, LINES, LOOT, REGIONS, STEPS_PER_REGION,
  dayKey, levelInfo, parseQuest, pick, reward, rollLoot, roman,
  type Quest, type Rarity,
} from "@/lib/world";
import * as sfx from "@/lib/sound";

const KEY = "doit:v1";

export type Save = {
  name: string;
  xp: number;
  gold: number;
  streak: number;
  lastDoneDay?: string;
  lastSeenDay: string;
  chapter: number; // regions cleared so far; current region = chapter % REGIONS.length
  step: number; // waypoint inside the current region
  journal: number[];
  bossIndex: number;
  bossHp: number;
  focusMin: number;
  loot: Record<string, number>;
  rewards: { id: string; title: string; cost: number }[];
  quests: Quest[];
  adventure: boolean;
  theme: "dark" | "light";
  sound: boolean;
  tourDone: boolean;
};

export type Tone = "ember" | "moss" | "danger" | Rarity;
export type GameEvent =
  | { type: "toast"; text: string; sub?: string; tone?: Tone; undo?: () => void; adv?: boolean }
  | { type: "modal"; kicker: string; title: string; body: string; cta: string; adv?: boolean };

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): Save {
  const q = (title: string, extra: Partial<Quest> = {}): Quest => ({
    id: uid(), title, diff: "normal", main: false, ritual: false, streak: 0, done: false, due: dayKey(), ...extra,
  });
  return {
    name: "Wayfarer", xp: 0, gold: 20, streak: 0, lastSeenDay: dayKey(),
    chapter: 0, step: 0, journal: [], bossIndex: 0, bossHp: BOSSES[0].hp, focusMin: 0, loot: {},
    rewards: [
      { id: uid(), title: "Watch an episode", cost: 30 },
      { id: uid(), title: "Fancy coffee", cost: 50 },
      { id: uid(), title: "A guilt-free afternoon off", cost: 200 },
    ],
    quests: [
      q("Plan the week ahead", { diff: "hard", main: true, tag: "work" }),
      q("Reply to the emails that are waiting", { tag: "work", due: dayKey(-1) }),
      q("Book the dentist appointment", { diff: "easy", tag: "personal" }),
      q("Outline the next blog post", { tag: "writing", due: dayKey(1) }),
      q("Morning walk, 20 min", { diff: "easy", ritual: true, due: undefined }),
      q("Read 10 pages", { diff: "easy", ritual: true, due: undefined }),
    ],
    adventure: true,
    theme: "dark",
    sound: true,
    tourDone: false,
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...seed(), ...JSON.parse(raw) }; // fields added later get defaults
    // first run after the old list version: keep the user's todos
    const old = localStorage.getItem("todos");
    if (old) {
      const s = seed();
      s.quests = (JSON.parse(old) as { title: string; completed: boolean }[]).map((t) => ({
        id: uid(), title: String(t.title), diff: "normal", main: false, ritual: false, streak: 0,
        done: !!t.completed, doneDay: t.completed ? dayKey() : undefined, due: dayKey(),
      }));
      return s;
    }
  } catch {
    // blocked or corrupt storage: start fresh rather than crash
  }
  return seed();
}

let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<(e: GameEvent) => void>();
const early: GameEvent[] = []; // events fired before the UI subscribed (e.g. "streak saved" on load)

class Game {
  s: Save = load();
  companion = pick(LINES.greet);
  focus = { running: false, total: 25 * 60, left: 25 * 60, questId: "", speed: 1, away: false };

  constructor() {
    makeAutoObservable(this, { today: false }, { autoBind: true }); // today is a clock read, never cached
    this.rollover();
    autorun(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(toJS(this.s)));
      } catch {
        // storage full or blocked; state still lives in memory for this session
      }
    });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  // ---------- events for the UI (toasts, modals) ----------
  on(fn: (e: GameEvent) => void) {
    listeners.add(fn);
    early.splice(0).forEach(fn);
    return () => void listeners.delete(fn);
  }
  private emit(e: GameEvent) {
    if (!listeners.size) early.push(e);
    listeners.forEach((fn) => fn(e));
  }

  // ---------- derived ----------
  get today() {
    return dayKey();
  }
  get level() {
    return levelInfo(this.s.xp);
  }
  get region() {
    return REGIONS[this.s.chapter % REGIONS.length];
  }
  get nextRegion() {
    return REGIONS[(this.s.chapter + 1) % REGIONS.length];
  }
  get stepsToGate() {
    return STEPS_PER_REGION - 1 - this.s.step;
  }
  get boss() {
    return BOSSES[this.s.bossIndex % BOSSES.length];
  }
  get mainQuest() {
    return this.s.quests.find((q) => q.main && !q.ritual && !q.done);
  }
  get sideQuests() {
    return this.s.quests
      .filter((q) => !q.main && !q.ritual && !q.done)
      .sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
  }
  get rituals() {
    return this.s.quests.filter((q) => q.ritual);
  }
  get completed() {
    return this.s.quests.filter((q) => q.done && !q.ritual);
  }
  get todayStats() {
    const t = this.today;
    const done = this.s.quests.filter((q) => q.done && q.doneDay === t).length;
    const open = this.s.quests.filter((q) => !q.done && (q.ritual || !q.due || q.due <= t)).length;
    return { done, total: done + open };
  }

  // ---------- quests ----------
  addQuest(raw: string) {
    const p = parseQuest(raw);
    if (!p.title) return false;
    if (p.main) this.s.quests.forEach((q) => (q.main = false));
    this.s.quests.unshift({
      id: uid(), title: p.title, diff: p.diff, tag: p.tag, due: p.ritual ? undefined : p.due,
      main: p.main && !p.ritual, ritual: p.ritual, streak: 0, done: false,
    });
    return true;
  }

  complete(id: string) {
    const q = this.s.quests.find((x) => x.id === id);
    if (!q || q.done) return;
    const before = this.level.level;
    const r = reward(q);
    q.done = true;
    q.doneDay = this.today;
    q.reward = { ...r, boss: this.s.bossIndex };
    this.s.xp += r.xp;
    this.s.gold += r.gold;
    if (q.ritual) q.streak++;
    this.bumpStreak();

    this.companion =
      this.todayStats.done === this.todayStats.total ? pick(LINES.allDone)
      : q.main ? pick(LINES.main)
      : pick(LINES.complete);

    this.advance(r.steps);
    this.hitBoss(r.xp);
    const item = rollLoot(q.main || q.diff === "hard" ? 0.5 : 0.3);
    if (item) this.gain(item.id, "Loot found");
    this.checkLevel(before);
  }

  uncomplete(id: string) {
    const q = this.s.quests.find((x) => x.id === id);
    if (!q || !q.done) return;
    const r = q.reward;
    if (r) {
      this.s.xp = Math.max(0, this.s.xp - r.xp);
      this.s.gold = Math.max(0, this.s.gold - r.gold);
      // ponytail: steps never go back past a gate you already crossed
      this.s.step = Math.max(0, this.s.step - r.steps);
      if (r.boss === this.s.bossIndex) this.s.bossHp = Math.min(this.boss.hp, this.s.bossHp + r.xp);
    }
    if (q.ritual) q.streak = Math.max(0, q.streak - 1);
    q.done = false;
    q.doneDay = undefined;
    q.reward = undefined;
  }

  toggleMain(id: string) {
    const q = this.s.quests.find((x) => x.id === id);
    if (!q || q.ritual) return;
    const on = !q.main;
    this.s.quests.forEach((x) => (x.main = false));
    q.main = on;
  }

  updateQuest(id: string, patch: { diff?: Quest["diff"]; due?: string | null }) {
    const q = this.s.quests.find((x) => x.id === id);
    if (!q) return;
    if (patch.diff) q.diff = patch.diff;
    if (patch.due !== undefined && !q.ritual) q.due = patch.due ?? undefined;
  }

  rename(id: string, title: string) {
    const q = this.s.quests.find((x) => x.id === id);
    if (q && title.trim()) q.title = title.trim();
  }

  remove(id: string) {
    const i = this.s.quests.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [q] = this.s.quests.splice(i, 1);
    this.emit({ type: "toast", text: "Quest abandoned", sub: q.title, undo: () => this.restore(q, i) });
  }
  private restore(q: Quest, i: number) {
    this.s.quests.splice(i, 0, q);
  }

  // ---------- progression ----------
  private bumpStreak() {
    if (this.s.lastDoneDay === this.today) return;
    this.s.streak = this.s.lastDoneDay === dayKey(-1) ? this.s.streak + 1 : 1;
    this.s.lastDoneDay = this.today;
  }

  private advance(steps: number) {
    this.s.step += steps;
    const last = STEPS_PER_REGION - 1;
    while (this.s.step >= last) {
      this.s.step -= last;
      const i = this.s.chapter % REGIONS.length;
      if (!this.s.journal.includes(i)) this.s.journal.push(i);
      this.s.chapter++;
      this.s.gold += 50;
      this.emit({
        type: "modal", adv: true,
        kicker: `Chapter ${roman(this.s.chapter)} complete · +50 gold`,
        title: REGIONS[i].name,
        body: REGIONS[i].story,
        cta: `Onward to ${this.region.name}`,
      });
    }
  }

  private hitBoss(dmg: number) {
    this.s.bossHp -= dmg;
    if (this.s.sound && this.s.adventure) sfx.hit();
    if (this.s.bossHp > 0) return;
    const beaten = this.boss;
    this.s.gold += 100;
    const item = rollLoot(1, "epic")!;
    this.s.loot[item.id] = (this.s.loot[item.id] ?? 0) + 1;
    this.s.bossIndex++;
    this.s.bossHp = this.boss.hp;
    this.emit({
      type: "modal", adv: true,
      kicker: "Boss defeated · +100 gold",
      title: beaten.name,
      body: `It collapses into the fog it came from. Among the remains you find the ${item.name}. Ash marks the spot on your map, then frowns at the horizon: ${this.boss.name} is already on its way.`,
      cta: "Claim the spoils",
    });
  }

  private gain(itemId: string, text: string) {
    const item = LOOT.find((l) => l.id === itemId)!;
    this.s.loot[itemId] = (this.s.loot[itemId] ?? 0) + 1;
    this.emit({ type: "toast", text, sub: item.name, tone: item.rarity, adv: true });
  }

  private checkLevel(before: number) {
    const l = this.level;
    if (l.level <= before) return;
    this.emit({
      type: "modal", adv: true,
      kicker: `Level ${l.level}`,
      title: `You are now a ${l.title}`,
      body: "Your pack feels lighter and the map a little wider. Every quest from here counts toward the next rank.",
      cta: "Keep going",
    });
  }

  /** New day: reset rituals, check streaks, clear yesterday's finished quests. */
  rollover() {
    const t = this.today;
    if (this.s.lastSeenDay === t) return;
    const y = dayKey(-1);
    if (this.s.streak > 0 && this.s.lastDoneDay && this.s.lastDoneDay < y) {
      if ((this.s.loot.charm ?? 0) > 0) {
        this.s.loot.charm--;
        this.s.lastDoneDay = y;
        this.companion = pick(LINES.streakSaved);
        this.emit({ type: "toast", text: "Streak saved", sub: "An Ember Charm burned for you", tone: "ember", adv: true });
      } else {
        this.s.streak = 0;
      }
    }
    for (const q of this.rituals) {
      if (q.doneDay !== y && q.doneDay !== t) q.streak = 0;
      q.done = false;
      q.reward = undefined;
    }
    this.s.quests = this.s.quests.filter((q) => q.ritual || !q.done || q.doneDay === t);
    this.s.lastSeenDay = t;
    if (this.companion !== LINES.streakSaved[0]) this.companion = pick(LINES.greet);
  }

  // ---------- campfire (focus timer, not persisted) ----------
  setFocusLength(min: number) {
    if (this.focus.running) return;
    this.focus.total = this.focus.left = min * 60;
  }
  setFocusQuest(id: string) {
    this.focus.questId = id;
  }
  toggleDemoSpeed() {
    this.focus.speed = this.focus.speed === 1 ? 60 : 1;
  }
  startFocus() {
    if (this.focus.running) return;
    this.focus.running = true;
    timer = setInterval(this.tick, 1000);
    if (this.s.sound) sfx.fireStart();
  }
  pauseFocus() {
    this.focus.running = false;
    clearInterval(timer);
    sfx.fireStop();
  }
  resetFocus() {
    this.pauseFocus();
    this.focus.left = this.focus.total;
  }
  private tick() {
    this.focus.left = Math.max(0, this.focus.left - this.focus.speed);
    if (this.focus.left === 0) this.finishFocus();
  }
  private finishFocus() {
    this.pauseFocus();
    const before = this.level.level;
    const minutes = Math.round(this.focus.total / 60);
    const xp = Math.round(minutes * 0.6);
    this.s.xp += xp;
    this.s.focusMin += minutes;
    this.focus.left = this.focus.total;
    this.companion = pick(LINES.focusDone);
    if (this.s.sound) sfx.chime();
    this.emit({ type: "toast", text: `Session complete · +${xp} XP`, sub: `${minutes} minutes of deep work`, tone: "ember" });
    this.hitBoss(xp);
    this.checkLevel(before);
  }
  private onVisibility() {
    if (document.hidden) {
      if (this.focus.running) this.focus.away = true;
      return;
    }
    this.rollover();
    if (this.focus.away) {
      this.focus.away = false;
      if (this.focus.running) this.companion = pick(LINES.focusLeft);
    }
  }

  // ---------- satchel ----------
  addReward(title: string, cost: number) {
    if (!title.trim() || !(cost > 0)) return false;
    this.s.rewards.push({ id: uid(), title: title.trim(), cost: Math.round(cost) });
    return true;
  }
  removeReward(id: string) {
    this.s.rewards = this.s.rewards.filter((r) => r.id !== id);
  }
  buyReward(id: string) {
    const r = this.s.rewards.find((x) => x.id === id);
    if (!r) return;
    if (this.s.gold < r.cost) {
      this.emit({ type: "toast", text: "Not enough gold yet", sub: `${r.cost - this.s.gold} more to go`, tone: "danger" });
      return;
    }
    this.s.gold -= r.cost;
    this.emit({ type: "toast", text: "Reward claimed", sub: `Enjoy: ${r.title}`, tone: "moss" });
  }

  // ---------- settings & data ----------
  setName(name: string) {
    this.s.name = name.trim().slice(0, 24) || "Wayfarer";
  }
  toggleAdventure() {
    this.s.adventure = !this.s.adventure;
  }
  toggleSound() {
    this.s.sound = !this.s.sound;
    if (!this.focus.running) return;
    if (this.s.sound) sfx.fireStart();
    else sfx.fireStop();
  }
  finishTour() {
    this.s.tourDone = true;
  }
  toggleTheme() {
    this.s.theme = this.s.theme === "dark" ? "light" : "dark";
  }
  exportData() {
    return JSON.stringify(toJS(this.s), null, 2);
  }
  importData(json: string) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data?.quests) || typeof data?.xp !== "number") throw new Error("not a Doit backup");
      this.s = { ...seed(), ...data };
      this.emit({ type: "toast", text: "Backup restored", tone: "moss" });
    } catch {
      this.emit({ type: "toast", text: "That file isn't a Doit backup", tone: "danger" });
    }
  }
  reset() {
    this.resetFocus();
    this.s = seed();
    this.companion = pick(LINES.greet);
  }
}

export const game = new Game();
