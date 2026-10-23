// Run: pnpm check  (Node 23.6+ runs TypeScript directly)
import assert from "node:assert/strict";
import { dayKey, levelInfo, parseQuest, reward } from "./world.ts";

const now = new Date(2026, 9, 23, 23, 30); // late evening: UTC would already be the next day in many zones

assert.equal(dayKey(0, now), "2026-10-23");
assert.equal(dayKey(1, now), "2026-10-24");
assert.equal(dayKey(-23, now), "2026-09-30");

const q = parseQuest("Ship onboarding !hard #Work tomorrow", now);
assert.deepEqual(q, { title: "Ship onboarding", diff: "hard", tag: "work", due: "2026-10-24", ritual: false, main: false });

const r = parseQuest("Read 10 pages daily !easy", now);
assert.equal(r.title, "Read 10 pages");
assert.equal(r.ritual, true);
assert.equal(r.diff, "easy");
assert.equal(parseQuest("Email #team-ops !main", now).tag, "team-ops");
assert.equal(parseQuest("Email #team-ops !main", now).main, true);
assert.equal(parseQuest("Fix today's bug", now).title, "Fix today's bug"); // "today's" is not the keyword

assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 100, title: "Wanderer" });
assert.deepEqual(levelInfo(100), { level: 2, into: 0, need: 160, title: "Scout" });
assert.deepEqual(levelInfo(259), { level: 2, into: 159, need: 160, title: "Scout" });
assert.equal(levelInfo(99999).title, "Legend");

assert.deepEqual(reward({ diff: "normal", main: true }), { xp: 38, gold: 10, steps: 2 });

console.log("world rules ok");
