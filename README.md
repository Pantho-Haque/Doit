# Doit · Expedition

A todo app where every finished task moves you across a map.
Quests earn XP, gold and steps on the trail. Reaching a region's gate unlocks the next chapter of the story.
Everything is stored in your browser (localStorage). There is no backend.

## Run

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # game rules self-check
pnpm build
```

## Tests

```sh
pnpm test         # Playwright: builds the app and runs the UI suite
pnpm test:ui      # same, in Playwright's interactive runner
pnpm verify       # lint + types + rules check + UI suite — run before every commit
```

The suite (`tests/`) runs in four browsers: desktop 1440px, tablet 1024px, Android phone (Pixel 7) and iPhone 13 (WebKit).
Every test fails if the page logs an error, and all tests run on a fixed date so day-based logic is repeatable.

| File | Covers |
|---|---|
| `quests.spec.ts` | quick-add parsing and validation, HTML safety, long titles, main quest, rituals, complete/undo, double clicks, rename, quest sheet, abandon + undo, due dates and sorting, empty states, `/` shortcut |
| `progression.spec.ts` | level-ups, chapter gates and overflow, queued modals, boss hits/kills/loop, enraged state, taunts, bestiary, loot, undo limits, day rollover, streaks, Ember Charm, midnight, Adventure mode off |
| `campfire-satchel.spec.ts` | focus timer (pause, reset, tabs, demo speed), finishing a quest from the fire, away-from-tab, sound on/off, rewards, loot grid, journal spoilers |
| `data.spec.ts` | reload persistence, first visit, corrupt storage, old save formats, storage failures, backup download/restore, reset confirmation, name and theme |
| `layout.spec.ts` | no sideways scroll, nav state, tasks above the fold, tab bar/+ button overlap, settings alignment, side-panel fit, phone top bar, 44px tap targets, 16px inputs, bottom sheets, toast position, focus rings, reduced motion |
| `tour.spec.ts` | first-run tour, every step on screen and not covering its target, keyboard, blocked background, skipped steps, replay |
| `a11y.spec.ts` | axe-core WCAG 2.2 AA audit of every view, sheet, modal and the tour, in dark and light themes |

## Quick add

| Type | Result |
|---|---|
| `Ship the deck !hard #work tomorrow` | hard quest, tag `work`, due tomorrow |
| `Read 10 pages daily` | daily ritual (habit with a streak) |
| `Plan the week !main` | main quest: 1.5× XP, double gold, +1 step |

Press `/` anywhere to jump to quick add. Double-click a quest to rename it.

## Views

- **Today**: main quest, side quests, daily rituals
- **Journal**: story chapters unlocked at each gate
- **Campfire**: focus timer that earns XP
- **Satchel**: spend gold on rewards you define, plus loot you've found

A guided tour runs on first visit. Replay it with **Take the tour** in the sidebar.
Sounds (campfire crackle, boss hits, growls) are generated live with the Web Audio API and can be muted in the sidebar.

Standalone animated boss art lives in `public/boss/*.svg` (normal and enraged versions). The in-app boss is `components/BossArt.tsx`.

Turn off **Adventure mode** in the sidebar for a plain, distraction-free task list.
Use **Your data → Download backup** to keep a copy of your progress.

Product plan and research: [docs/adventure-plan.md](docs/adventure-plan.md).
