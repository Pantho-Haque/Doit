# Doit: Expedition — product plan

Turn Doit from a plain list into an adventure where **getting things done moves you across a map**.
It has to work as a serious tool first, so the game layer sits on top of a solid task manager and can be turned off.

Run it: `pnpm install && pnpm dev`, then open http://localhost:3000.

---

## 1. What the most popular todo/habit apps do to keep people coming back

| App | Hook that keeps users engaged | What we borrow | What we avoid |
|---|---|---|---|
| **Habitica** | Your tasks are an RPG: XP, gold, levels, boss fights with friends, a shop of rewards you define yourself | XP/levels, weekly boss damaged by finished tasks, **self-defined rewards bought with gold** | HP loss and character death for missed dailies. It makes people feel punished, and many quit |
| **Finch** | A companion pet whose story moves forward as you take care of yourself. Gentle tone, never shames you | A **companion character** (Ash, the Cartographer) who narrates progress and reacts to what you do | Childish art style. We keep it clean and grown-up |
| **Forest** | A tree grows while you stay focused. Leave the app and it withers | **Campfire** focus timer that burns while you work | Killing the tree. Ours only flickers and the companion nudges you |
| **Todoist** | Karma points, daily/weekly goals, streaks, very fast natural-language input | **Natural-language quick add** (`!hard #work tomorrow`), streaks, daily goal | — |
| **Duolingo** | Streaks, streak freeze, friendly push messages with personality, variable rewards | Streaks + **Ember Charm** (streak freeze) found as loot; companion voice in notifications | Guilt-trip notifications |
| **TickTick** | Pomodoro, habit tracker and tasks in one app | Daily rituals (habits) with their own streaks inside the same list | Feature overload |
| **Things 3 / MS To Do** | Calm, beautiful UI; a "My Day" planning ritual each morning | Clean typography, a **Today** view, a morning briefing, and one "main quest" (eat-the-frog) | — |

**What they have in common**
1. **A loop you can feel in seconds**: finish a task → immediate visible reward (sound, animation, number going up).
2. **Progress that builds over time**: levels, streaks, a story that unlocks. Gives a reason to come back tomorrow.
3. **Variable rewards**: you don't know when loot drops, which makes finishing tasks more exciting.
4. **A character that cares**: a companion makes the app feel alive instead of like a spreadsheet.
5. **Rituals**: morning plan, evening recap. The app becomes part of the day.
6. **Gentle consequences**: the apps that last don't punish people. Losing a streak hurts enough on its own.

---

## 2. The concept — "Doit: Expedition"

You are a **Wayfarer** crossing a hand-drawn world, guided by **Ash, the Cartographer**.

- The world has **regions** (chapters): Whispering Pines → Ember Ridge → Glass Lake → The Sunken Archive → Skyward Peak.
- Each region is a trail of **8 waypoints**. **Every finished quest moves you forward.** Reaching the gate unlocks a **journal entry** (the story) and the next region.
- A **weekly boss** (the Someday Wyrm, the Inbox Hydra, the Lord of Busywork) loses HP for every XP you earn that week.
- Overdue tasks are shown as **fog** on the quest. It's a visual nudge, not a penalty.

### Core loop
```
Plan (morning briefing) → Pick a Main Quest → Do (Campfire focus) → Complete
   → XP + gold + steps on the map + boss damage + chance of loot
   → Chapter gate? → Journal entry unlocked → Next region
   → Evening recap → Streak kept → Come back tomorrow
```

### Words we use
| Plain | In-app |
|---|---|
| Task | Quest |
| Most important task | Main Quest (1.5× XP, +1 step) |
| Habit | Daily Ritual |
| Pomodoro | Campfire |
| Points | XP, gold |
| Project/tag | #tag (later: Guild) |

---

## 3. Features

### MVP (first release)
- **Quests**: title, difficulty (easy/normal/hard), tag, due date, main-quest flag.
- **Quick add with natural language**: `Ship onboarding !hard #work tomorrow`, `Read 10 pages daily`, `!main`.
- **Today view**: chapter header + companion line, Main Quest slot, Side Quests, Daily Rituals, Completed (collapsed).
- **Rewards on completion**: seal-stamp animation, sparks, floating `+XP`, XP bar fill, map marker moves.
- **Expedition map**: SVG trail, 8 waypoints per region, gate → chapter complete modal.
- **Levels and titles**: Wanderer → Scout → Pathfinder → Ranger → Trailblazer → Wayfinder → Cartographer → Legend.
- **Daily streak** and per-ritual streaks.
- **Adventure mode on/off**. Off = clean, professional task manager (no story, boss or loot).
- Dark (night expedition) and light (daybreak parchment) themes.

### v2
- **Weekly boss** with lore and a guaranteed epic drop when defeated.
- **Loot** (30% drop chance, 50% on hard/main quests): Lantern of Early Hours, Map Fragment, Compass of Priorities, Ember Charm (streak freeze, it actually works), Cloak of Deep Work.
- **Satchel**: your loot plus **self-defined rewards** bought with gold (Habitica's best idea).
- **Campfire focus timer** linked to a quest. Earns kindling XP. The fire flickers if you leave the tab.
- **Journal**: story entries unlocked per region.
- Morning briefing and evening recap (notifications in Ash's voice).

### v3
- **Party / Guild**: friends fight the weekly boss together (Habitica parties, but no shared punishment).
- **Seasons**: new map and bosses every ~8 weeks. Cosmetic rewards for the season (map skins, marker trails).
- Calendar view, recurring rules, subtasks ("quest steps").
- Sounds and haptics (mobile), PWA with offline support.

---

## 4. Game numbers (starting values, tune with real data)

| Thing | Value |
|---|---|
| XP | easy 10 · normal 25 · hard 50 · main quest ×1.5 |
| Gold | easy 2 · normal 5 · hard 10 |
| Map steps | easy/normal 1 · hard 2 · main quest +1 · 7 steps reach the gate |
| Level curve | level *n* needs `100 + (n-1)·60` XP |
| Loot chance | 30% normal, 50% hard/main · rarity 65% common / 27% rare / 8% epic |
| Boss HP | 300 / 400 / 500, damage = XP earned |
| Campfire | 25 min → 15 XP (0.6 XP/min) |

Rule: All rewards are calculated in one place (`lib/world.ts` + the store), so tuning means changing numbers, not code.

---

## 5. Story system
- Each region has: name, one-line blurb (Today header), a journal entry (unlocked at the gate), and a hue for the map.
- Ash's lines are picked by event: `greet`, `complete`, `main_complete`, `all_done`, `focus_left`, `streak_saved`, `chapter_done`.
  Keep each line short, warm and never guilt-tripping.
- Story content lives in a JSON/TS file so writers can add regions without code changes.

---

## 6. Keeping it professional
- **Productivity comes first.** Quick add, keyboard shortcuts (`/` to add, `Enter` to save), fast list. The game never slows down task entry.
- **Adventure mode toggle** for work contexts and people who just want a list.
- **No punishments**: no HP loss or character death. Overdue = fog. Missed day = streak resets unless you own an Ember Charm.
- Grown-up visual language: serif display font (Fraunces), clean sans UI (Inter Tight), mono numbers, topographic map textures. No cartoon art.
- Accessibility: real buttons, `aria-pressed` on completion, focus rings, `prefers-reduced-motion` turns off all animations.

---

## 6b. Mobile UX rules (research, Oct 2026)

| Finding | What Doit does |
|---|---|
| The bottom of the phone screen is the easy thumb zone; top corners are the hardest reach | Tabs and the **+** button sit at the bottom; the top bar only *shows* status |
| Bottom tab bars work best with 3–5 labelled destinations, always visible, active item marked | Today · Map · Journal · Campfire · Satchel, with labels and a highlighted pill |
| A floating action button should be reserved for the single most common action | The **+** button only adds a quest, and only shows on Today |
| Touch targets need at least 44×44pt (iOS) / 48dp (Android) | Seal, tabs, sheet rows and top-bar buttons are 44–54px |
| Habitica's loop works because the reward is instant and visible | XP bar and level ring live in the sticky top bar, so every completion moves them on screen |
| Finch's home screen gets crowded when goals, pet and adventure progress compete | The phone home screen is tasks first; the map and boss shrink to one tappable strip |
| iOS Safari zooms the page when an input's text is under 16px | All inputs are 16px on phones |
| Hidden menus hurt discoverability | Everything a quest can do is one tap away in the **⋯** sheet, with text labels |

Sources: [UXPin – mobile navigation](https://www.uxpin.com/studio/blog/mobile-navigation-examples/),
[Parachute – thumb zone](https://parachutedesign.ca/blog/thumb-zone-ux/),
[Uxcel – FAB](https://app.uxcel.com/glossary/fabs),
[AppMySite – bottom navigation](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/),
[ScreensDesign – Habitica](https://screensdesign.com/showcase/habitica-gamified-taskmanager),
[ScreensDesign – Finch](https://screensdesign.com/showcase/finch-self-care-pet),
[CSS-Tricks – 16px inputs on iOS](https://css-tricks.com/?p=339455).

## 7. How it's built (frontend only, no backend)

Next.js 15 + React 19 + MobX. **All data is saved in the browser's localStorage** under one key, `doit:v1`.

| File | What it holds |
|---|---|
| `lib/world.ts` | Game content and pure rules: regions, story, bosses, loot, XP numbers, quick-add parser, level curve |
| `lib/world.check.mts` | Self-check for those rules: `pnpm check` |
| `storage/store.ts` | MobX store: the whole save, every action (complete, undo, rewards, campfire timer, day rollover), autosave |
| `components/App.tsx` | Layout and views, `/` shortcut |
| `components/Sidebar.tsx` | Profile, level ring, XP, nav, Adventure mode, theme, backup/restore |
| `components/Today.tsx` | Chapter header, quick add, quest cards |
| `components/Rail.tsx` | Trail map (SVG), companion, weekly boss |
| `components/Campfire.tsx` · `Journal.tsx` · `Satchel.tsx` | The other three views |
| `components/Effects.tsx` | Toasts, modals (native `<dialog>`), XP sparks |
| `app/globals.css` | Design tokens (night + daybreak themes) and all styles |

Notes
- The app renders only in the browser (`next/dynamic` with `ssr: false`) because it reads localStorage.
- Old saves from the first version (`todos` key) are imported automatically on first run.
- localStorage lives in one browser on one device. **Download backup / Restore backup** in the sidebar protects against cleared browser data.
- Party, leaderboards and sync between devices need a server, so they're out of scope while the app is frontend-only.

## 8. How we measure it
- **D1 / D7 / D30 retention** (main goal of the game layer).
- Tasks completed per active user per day.
- % of days with a main quest chosen.
- Streak length distribution, Ember Charm use.
- % of users with Adventure mode off (if high, the game layer isn't working for them).

---

## 9. Roadmap

| Phase | Scope | Size |
|---|---|---|
| 1 | Schema migration, quest fields, natural-language input, Today view redesign | ~1 week |
| 2 | XP/levels/streaks, server reward events, completion animations, map + chapters | ~1–2 weeks |
| 3 | Journal, Campfire timer, loot, Satchel + custom rewards, weekly boss | ~2 weeks |
| 4 | Notifications (morning/evening), PWA, sounds | ~1 week |
| 5 | Auth, parties, seasons | later |
