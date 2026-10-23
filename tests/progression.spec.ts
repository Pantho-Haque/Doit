import { at, card, closeModal, complete, day, expect, nav, quest, save, stored, test } from "./fixtures";

const noLoot = (page: import("@playwright/test").Page) => page.evaluate(() => ((window as unknown as { __rand: number }).__rand = 0.99));

test.describe("levels, chapters and bosses", () => {
  test("crossing 100 XP levels you up with a modal and a new title", async ({ page, open }) => {
    await open({ data: save({ xp: 95 }) });
    await noLoot(page);
    await complete(page, "Write report");
    expect(await closeModal(page)).toBe("You are now a Scout");
    await expect(page.locator(".rank")).toHaveText("Scout · Lv 2");
    await expect(page.locator(".xp-label")).toContainText("20 / 160 XP");
    await expect(page.locator(".xp-label")).toContainText("140 to Pathfinder");
  });

  test("reaching the gate completes the chapter, unlocks the journal and moves to the next region", async ({ page, open }) => {
    await open({ data: save({ step: 6 }) });
    await noLoot(page);
    await complete(page, "Write report");
    expect(await closeModal(page)).toBe("Whispering Pines");
    const s = await stored(page);
    expect(s).toMatchObject({ chapter: 1, step: 0, journal: [0], gold: 20 + 5 + 50 });
    await expect(page.locator(".map-card .region")).toHaveText("Ember Ridge");
    await expect(page.locator(".chapter .kicker")).toHaveText("Chapter II · Ember Ridge");

    await nav(page, "Journal");
    await expect(page.locator(".entry").first()).not.toHaveClass(/locked/);
    await expect(page.locator(".entry").first().locator(".story")).toContainText("You set out before dawn");
    await expect(page.locator(".entry").nth(1)).toContainText("You are here. 7 more steps");
  });

  test("extra steps carry over past the gate", async ({ page, open }) => {
    await open({ data: save({ step: 6, quests: [quest("Huge", { diff: "hard", main: true })] }) });
    await noLoot(page);
    await complete(page, "Huge"); // 3 steps: 6 → gate (7) → 2 into the next region
    await closeModal(page);
    expect(await stored(page)).toMatchObject({ chapter: 1, step: 2 });
  });

  test("several big moments in one click queue up as separate modals", async ({ page, open }) => {
    await open({ data: save({ step: 6, xp: 95, bossHp: 10 }) });
    await noLoot(page);
    await complete(page, "Write report");
    expect(await closeModal(page)).toBe("Whispering Pines");
    expect(await closeModal(page)).toBe("The Someday Wyrm");
    expect(await closeModal(page)).toBe("You are now a Scout");
    await expect(page.locator("dialog.modal[open]")).toHaveCount(0);
  });

  test("defeating the boss pays out, drops an epic item and brings the next boss", async ({ page, open }) => {
    await open({ data: save({ bossHp: 10 }) });
    await noLoot(page);
    await complete(page, "Write report");
    expect(await closeModal(page)).toBe("The Someday Wyrm");
    const s = await stored(page);
    expect(s).toMatchObject({ bossIndex: 1, bossHp: 400, gold: 20 + 5 + 100 });
    expect(s.loot.cloak).toBe(1);
    await expect(page.locator(".boss h3")).toHaveText("The Inbox Hydra");
    await expect(page.locator(".boss .card-head")).toContainText("400 / 400 HP");
  });

  test("bosses loop after the last one", async ({ page, open }) => {
    await open({ data: save({ bossIndex: 2, bossHp: 5 }) });
    await noLoot(page);
    await complete(page, "Write report");
    await closeModal(page);
    await expect(page.locator(".boss h3")).toHaveText("The Someday Wyrm");
    expect(await stored(page)).toMatchObject({ bossIndex: 3, bossHp: 300 });
  });

  test("every hit shows the damage on the boss", async ({ page, open }) => {
    await open();
    await noLoot(page);
    await complete(page, "Write report");
    await expect(page.locator(".boss .card-head")).toContainText("275 / 300 HP");
    await expect(page.locator(".boss > .bar.hp i")).toHaveAttribute("style", /width: 91\.6/);
  });

  test("boss turns furious below 35% HP", async ({ page, open }) => {
    await open({ data: save({ bossHp: 100 }) });
    await expect(page.locator(".boss .lair .boss-art")).toHaveClass(/enraged/);
    await expect(page.locator(".boss-hint")).toHaveText("It's furious. Finish it off.");
  });

  test("tapping the boss shows one of its taunts, then it fades", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Taunt The Someday Wyrm" }).click();
    const taunt = page.locator(".taunt");
    await expect(taunt).toBeVisible();
    const text = (await taunt.innerText()).replace(/[“”]/g, "");
    expect(["Tomorrow. You'll do it tomorrow…", "Someday is so comfortable.", "Rest first. Start later. Much later.", "You have plenty of time. Plenty."]).toContain(text);
    await expect(taunt).toHaveCount(0, { timeout: 5000 });
  });

  test("bestiary shows current, slain and unknown bosses", async ({ page, open }) => {
    await open({ data: save({ bossIndex: 4, bossHp: 200 }) }); // beaten: Wyrm ×2, Hydra ×1, Lord ×1; hunting Hydra
    await page.getByRole("button", { name: "All bosses (bestiary)" }).click();
    const book = page.getByRole("dialog", { name: "Bestiary" });
    await expect(book).toBeVisible();
    await expect(book.locator(".kicker").first()).toHaveText("Bestiary · 4 slain");
    const beasts = book.locator(".beast");
    await expect(beasts.nth(0)).toHaveClass(/slain/);
    await expect(beasts.nth(0)).toContainText("Slain ×2");
    await expect(beasts.nth(1)).toHaveClass(/current/);
    await expect(beasts.nth(1)).toContainText("Hunting now");
    await expect(beasts.nth(2)).toContainText("Slain ×1");
    await book.getByRole("button", { name: "Close" }).click();
    await expect(book).toBeHidden();
  });

  test("a new player sees the unmet bosses as unknown silhouettes", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "All bosses (bestiary)" }).click();
    const beasts = page.getByRole("dialog", { name: "Bestiary" }).locator(".beast");
    await expect(beasts.nth(0)).toHaveClass(/current/);
    for (const i of [1, 2]) {
      await expect(beasts.nth(i)).toHaveClass(/locked/);
      await expect(beasts.nth(i).locator("b")).toHaveText("? ? ?");
      await expect(beasts.nth(i)).not.toContainText("Hydra");
      await expect(beasts.nth(i)).not.toContainText("Busywork");
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Bestiary" })).toBeHidden();
  });
});

test.describe("undo can't break the game", () => {
  test("undo after crossing a gate never goes below the start of the new region", async ({ page, open }) => {
    await open({ data: save({ step: 6 }) });
    await noLoot(page);
    await complete(page, "Write report");
    await closeModal(page);
    await page.locator(".done-list summary").click();
    await card(page, "Write report").getByRole("button", { name: /as not done/ }).click();
    const s = await stored(page);
    expect(s.step).toBe(0);
    expect(s.chapter).toBe(1);
  });

  test("undo after a boss died does not heal the new boss", async ({ page, open }) => {
    await open({ data: save({ bossHp: 10 }) });
    await noLoot(page);
    await complete(page, "Write report");
    await closeModal(page);
    await page.locator(".done-list summary").click();
    await card(page, "Write report").getByRole("button", { name: /as not done/ }).click();
    expect(await stored(page)).toMatchObject({ bossIndex: 1, bossHp: 400 });
  });

  test("XP and gold never go negative", async ({ page, open }) => {
    await open({
      data: save({ xp: 3, gold: 1, quests: [quest("Done earlier", { done: true, doneDay: day(), reward: { xp: 25, gold: 5, steps: 1, boss: 0 } })] }),
    });
    await page.locator(".done-list summary").click();
    await card(page, "Done earlier").getByRole("button", { name: /as not done/ }).click();
    expect(await stored(page)).toMatchObject({ xp: 0, gold: 0, step: 0 });
  });
});

test.describe("loot", () => {
  test("a lucky roll drops loot with a rarity toast and it lands in the satchel", async ({ page, open }) => {
    await open();
    await page.evaluate(() => ((window as unknown as { __rand: number }).__rand = 0));
    await complete(page, "Write report");
    const toast = page.locator(".toast.common");
    await expect(toast).toContainText("Loot found");
    await expect(toast).toContainText("Lantern of Early Hours");
    await nav(page, "Satchel");
    const lantern = page.locator(".loot", { hasText: "Lantern of Early Hours" });
    await expect(lantern.locator(".count")).toHaveText("×1");
    await expect(page.locator(".loot.missing")).toHaveCount(4);
  });
});

test.describe("new day", () => {
  test("rituals reset, streaks continue and yesterday's finished quests are cleared", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Report"), quest("Walk", { ritual: true, due: undefined })] }) });
    await noLoot(page);
    await complete(page, "Report");
    await complete(page, "Walk");

    await page.clock.setFixedTime(at(1));
    await page.reload();
    await noLoot(page);
    await expect(card(page, "Walk").locator(".seal")).toHaveAttribute("aria-pressed", "false");
    await expect(card(page, "Walk").locator(".streak")).toHaveText("1");
    await expect(card(page, "Report")).toHaveCount(0);

    await complete(page, "Walk");
    await expect(card(page, "Walk").locator(".streak")).toHaveText("2");
    expect((await stored(page)).streak).toBe(2);
  });

  test("missing days breaks the day streak and ritual streaks", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Walk", { ritual: true, due: undefined })] }) });
    await noLoot(page);
    await complete(page, "Walk");
    await page.clock.setFixedTime(at(3));
    await page.reload();
    await expect(card(page, "Walk").locator(".streak")).toHaveText("0");
    expect((await stored(page)).streak).toBe(0);
    await expect(page.locator(".stat", { hasText: "day streak" }).locator("b")).toHaveText("0");
  });

  test("an Ember Charm saves the streak once and is used up", async ({ page, open }) => {
    await open({ data: save({ streak: 5, lastDoneDay: day(-2), lastSeenDay: day(-2), loot: { charm: 1 } }) });
    await expect(page.locator(".toast", { hasText: "Streak saved" })).toBeVisible();
    const s = await stored(page);
    expect(s.streak).toBe(5);
    expect(s.loot.charm).toBe(0);
    await expect(page.locator(".companion .line")).toContainText("Ember Charm");
  });

  test("the app notices midnight when you come back to the tab", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Walk", { ritual: true, due: undefined })] }) });
    await complete(page, "Walk");
    await page.clock.setFixedTime(at(1));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(card(page, "Walk").locator(".seal")).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("adventure mode off", () => {
  test("hides story, map, boss, journal and loot, and uses plain words", async ({ page, open }) => {
    await open({ data: save({ step: 6 }) });
    await page.getByRole("switch", { name: "Adventure mode" }).click();
    await expect(page.locator(".rail")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Top priority" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();
    await expect(page.locator(".chapter .kicker")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Journal" })).toHaveCount(0);

    // progress still counts, but no story pop-ups interrupt
    await page.evaluate(() => ((window as unknown as { __rand: number }).__rand = 0));
    await complete(page, "Write report");
    await expect(page.locator("dialog.modal[open]")).toHaveCount(0);
    await expect(page.locator(".toast", { hasText: "Loot found" })).toHaveCount(0);
    expect((await stored(page)).chapter).toBe(1);

    await nav(page, "Satchel");
    await expect(page.locator(".loot")).toHaveCount(0);
  });

  test("turning it off while reading the journal falls back to Today", async ({ page, open }) => {
    await open();
    await nav(page, "Journal");
    await page.getByRole("switch", { name: "Adventure mode" }).click();
    await expect(page.locator(".quick")).toBeVisible();
  });
});
