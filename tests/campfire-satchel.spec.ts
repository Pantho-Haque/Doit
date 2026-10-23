import { expect, nav, quest, save, stored, test } from "./fixtures";

test.describe("campfire", () => {
  test("a full session earns XP and focus minutes, then resets", async ({ page, open }) => {
    await open({ fakeTimers: true });
    await nav(page, "Campfire");
    const timer = page.getByRole("timer");
    await expect(timer).toHaveText("25:00");
    await page.getByRole("group", { name: "Session length" }).getByRole("button", { name: "15 min" }).click();
    await expect(timer).toHaveText("15:00");

    await page.getByRole("button", { name: "Light the fire" }).click();
    await expect(page.locator(".fire")).toHaveClass(/lit/);
    // settings are locked while the fire burns
    await expect(page.getByRole("combobox")).toBeDisabled();
    await expect(page.getByRole("group", { name: "Session length" }).getByRole("button", { name: "25 min" })).toBeDisabled();

    await page.clock.runFor(60_000);
    await expect(timer).toHaveText("14:00");
    await page.clock.runFor(14 * 60_000);
    await expect(page.locator(".toast", { hasText: "Session complete · +9 XP" })).toBeVisible();
    await expect(timer).toHaveText("15:00");
    await expect(page.locator(".fire")).toHaveClass(/idle/);
    expect(await stored(page)).toMatchObject({ xp: 9, focusMin: 15, bossHp: 291 });
  });

  test("pause keeps the time, rekindle continues, reset goes back to full", async ({ page, open }) => {
    await open({ fakeTimers: true });
    await nav(page, "Campfire");
    await page.getByRole("button", { name: "Light the fire" }).click();
    await page.clock.runFor(5 * 60_000);
    await page.getByRole("button", { name: "Pause" }).click();
    await page.clock.runFor(5 * 60_000);
    await expect(page.getByRole("timer")).toHaveText("20:00");
    await page.getByRole("button", { name: "Rekindle" }).click();
    await page.clock.runFor(60_000);
    await expect(page.getByRole("timer")).toHaveText("19:00");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("timer")).toHaveText("25:00");
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  test("the timer keeps running when you switch tabs inside the app", async ({ page, open }) => {
    await open({ fakeTimers: true });
    await nav(page, "Campfire");
    await page.getByRole("button", { name: "Light the fire" }).click();
    await nav(page, "Today");
    await page.clock.runFor(3 * 60_000);
    await nav(page, "Campfire");
    await expect(page.getByRole("timer")).toHaveText("22:00");
  });

  test("demo speed finishes a 25 minute session in 25 seconds", async ({ page, open }) => {
    await open({ fakeTimers: true });
    await nav(page, "Campfire");
    await page.getByRole("checkbox", { name: /Demo speed/ }).check();
    await page.getByRole("button", { name: "Light the fire" }).click();
    await page.clock.runFor(25_000);
    await expect(page.locator(".toast", { hasText: "Session complete · +15 XP" })).toBeVisible();
  });

  test("you can finish the linked quest from the campfire", async ({ page, open }) => {
    await open();
    await nav(page, "Campfire");
    await page.getByRole("combobox").selectOption({ label: "Call mom" });
    await page.getByRole("button", { name: "Quest done" }).click();
    await expect(page.getByRole("combobox")).toHaveValue("");
    expect((await stored(page)).quests.find((q: { title: string }) => q.title === "Call mom").done).toBe(true);
  });

  test("wandering to another browser tab makes Ash comment", async ({ page, open }) => {
    await open();
    await nav(page, "Campfire");
    await page.getByRole("button", { name: "Light the fire" }).click();
    const flip = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
        document.dispatchEvent(new Event("visibilitychange"));
      }, hidden);
    await flip(true);
    await flip(false);
    await nav(page, "Today");
    await expect(page.locator(".companion .line")).toContainText("The fire flickered while you were away");
  });

  test("fire sound plays only when sound is on, and stops with the fire", async ({ page, open }) => {
    await open({ data: save({ sound: true }), fakeAudio: true });
    await nav(page, "Campfire");
    await page.getByRole("button", { name: "Light the fire" }).click();
    expect(await page.evaluate(() => (window as unknown as { __audio: string[] }).__audio)).toContain("createBufferSource");
    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Fire sounds on" }).click();
    await expect(page.getByRole("button", { name: "Fire sounds off" })).toHaveAttribute("aria-pressed", "false");

    await page.evaluate(() => ((window as unknown as { __audio: string[] }).__audio.length = 0));
    await page.getByRole("button", { name: /Light the fire|Rekindle/ }).click();
    expect(await page.evaluate(() => (window as unknown as { __audio: string[] }).__audio)).toEqual([]);
  });

  test("with sound off, no audio is ever created", async ({ page, open }) => {
    await open({ data: save({ sound: false, bossHp: 5 }), fakeAudio: true });
    await page.locator("li.quest .seal").first().click();
    await page.locator("dialog.modal[open]").getByRole("button").click();
    await page.getByRole("button", { name: "Taunt The Inbox Hydra" }).click();
    expect(await page.evaluate(() => (window as unknown as { __audio: string[] }).__audio)).toEqual([]);
  });
});

test.describe("satchel", () => {
  test("buying a reward costs gold; unaffordable rewards are disabled", async ({ page, open }) => {
    await open({ data: save({ gold: 60, rewards: [{ id: "a", title: "Coffee", cost: 50 }, { id: "b", title: "Day off", cost: 200 }] }) });
    await nav(page, "Satchel");
    const coffee = page.locator(".reward", { hasText: "Coffee" });
    const dayOff = page.locator(".reward", { hasText: "Day off" });
    await expect(dayOff.getByRole("button", { name: "200" })).toBeDisabled();
    await coffee.getByRole("button", { name: "50" }).click();
    await expect(page.locator(".toast", { hasText: "Reward claimed" })).toContainText("Coffee");
    await expect(page.locator("h1")).toContainText("10 gold");
    await expect(coffee.getByRole("button", { name: "50" })).toBeDisabled();
    expect((await stored(page)).gold).toBe(10);
  });

  test("new rewards need a name and a positive whole price", async ({ page, open }) => {
    await open({ data: save({ rewards: [] }) });
    await nav(page, "Satchel");
    const name = page.getByRole("textbox", { name: "Reward" });
    const cost = page.getByRole("spinbutton", { name: "Cost in gold" });
    const add = page.locator(".reward-form").getByRole("button", { name: "Add" });

    await expect(add).toBeDisabled();
    await name.fill("Movie night");
    for (const bad of ["0", "-5"]) {
      await cost.fill(bad);
      await add.click();
      await expect(page.locator(".reward")).toHaveCount(0);
    }
    await cost.fill("42.6"); // the browser's own number validation only allows whole gold
    await add.click();
    await expect(page.locator(".reward")).toHaveCount(0);
    await cost.fill("43");
    await add.click();
    await expect(page.locator(".reward", { hasText: "Movie night" }).getByRole("button", { name: "43" })).toBeVisible();
    await expect(name).toHaveValue("");

    await page.getByRole("button", { name: "Remove Movie night" }).click();
    await expect(page.locator(".reward")).toHaveCount(0);
  });

  test("loot shows what you own and hides what you haven't found", async ({ page, open }) => {
    await open({ data: save({ loot: { charm: 2, cloak: 1 } }) });
    await nav(page, "Satchel");
    await expect(page.locator(".loot", { hasText: "Ember Charm" }).locator(".count")).toHaveText("×2");
    await expect(page.locator(".loot.epic")).toContainText("Cloak of Deep Work");
    await expect(page.locator(".loot.missing")).toHaveCount(3);
    await expect(page.locator(".loot.missing").first()).toContainText("Undiscovered");
  });
});

test.describe("journal", () => {
  test("locked chapters don't spoil the story", async ({ page, open }) => {
    await open({ data: save({ chapter: 1, journal: [0] }) });
    await nav(page, "Journal");
    await expect(page.locator(".entry.locked")).toHaveCount(4);
    await expect(page.locator(".entry.locked .story")).toHaveCount(0);
    await expect(page.locator(".entry").nth(1)).toContainText("You are here");
    await expect(page.locator(".entry").nth(2)).toContainText("Still beyond the edge of your map.");
  });
});

test("long reward and quest names never push the layout sideways", async ({ page, open }) => {
  const long = "Averyveryverylongwordwithoutanyspaces".repeat(5);
  await open({ data: save({ quests: [quest(long)], rewards: [{ id: "x", title: long, cost: 10 }] }) });
  for (const view of ["Today", "Campfire", "Satchel"]) {
    await nav(page, view);
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    expect(sw, view).toBeLessThanOrEqual(w);
  }
});
