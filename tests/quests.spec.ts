import { addQuest, card, complete, day, expect, quest, save, stored, test } from "./fixtures";

test.describe("quick add", () => {
  test("parses difficulty, tag and due date, then clears the input", async ({ page, open }) => {
    await open();
    const input = page.getByRole("textbox", { name: "New quest" });
    await input.fill("Ship the deck !hard #Work tomorrow");

    // live preview before saving
    const chips = page.locator(".chips");
    await expect(chips).toContainText("Hard · +50 XP");
    await expect(chips).toContainText("#work");
    await expect(chips).toContainText("Tomorrow");

    await input.press("Enter");
    await expect(input).toHaveValue("");
    const c = card(page, "Ship the deck");
    await expect(c.locator(".q-meta")).toContainText("Hard");
    await expect(c.locator(".q-meta")).toContainText("#work");
    await expect(c.locator(".q-meta")).toContainText("Tomorrow");
    await expect(c.locator(".q-xp")).toHaveText("+50 XP");

    const s = await stored(page);
    expect(s.quests[0]).toMatchObject({ title: "Ship the deck", diff: "hard", tag: "work", due: day(1) });
  });

  test("blank, whitespace-only and token-only input cannot be added", async ({ page, open }) => {
    await open();
    const input = page.getByRole("textbox", { name: "New quest" });
    const add = page.locator(".quick").getByRole("button", { name: "Add" });
    const before = (await stored(page)).quests.length;

    await expect(add).toBeDisabled();
    for (const v of ["   ", "!hard #work tomorrow", "daily"]) {
      await input.fill(v);
      await expect(add).toBeDisabled();
      await input.press("Enter");
    }
    expect((await stored(page)).quests.length).toBe(before);
  });

  test("hint chips append tokens and keep focus in the input", async ({ page, open }) => {
    await open();
    const input = page.getByRole("textbox", { name: "New quest" });
    await input.fill("Stretch");
    await input.fill("");
    await page.locator(".chips").getByRole("button", { name: "daily" }).click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("daily ");
    await input.press("Home");
    await input.pressSequentially("Stretch ");
    await input.press("Enter");
    await expect(page.locator(".section", { hasText: "Daily rituals" }).locator(".q-title", { hasText: "Stretch" })).toBeVisible();
  });

  test("HTML in a title is shown as text, never run", async ({ page, open }) => {
    await open();
    await addQuest(page, `<img src=x onerror="window.__xss=1"> bold <b>move</b>`);
    await expect(page.locator(".q-title", { hasText: "<img src=x" })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(page.locator(".q-title b")).toHaveCount(0);
  });

  test("a very long unbroken title wraps inside its card", async ({ page, open }) => {
    await open();
    const long = "Supercalifragilistic".repeat(12);
    await addQuest(page, long);
    const c = card(page, long);
    const list = await c.locator("xpath=..").boundingBox();
    const box = await c.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(list!.x + list!.width + 1);
  });

  test("!main replaces the previous main quest (only one at a time)", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Old focus", { main: true }), quest("Other")] }) });
    await addQuest(page, "New focus !main");
    const mainSlot = page.locator("[data-tour=main]");
    await expect(mainSlot.locator(".q-title")).toHaveText("New focus");
    await expect(card(page, "Old focus")).not.toHaveClass(/main/);
    expect((await stored(page)).quests.filter((q: { main: boolean }) => q.main)).toHaveLength(1);
  });

  test("daily creates a ritual with no due date and a streak counter", async ({ page, open }) => {
    await open();
    await addQuest(page, "Meditate daily !easy");
    const c = card(page, "Meditate");
    await expect(c.locator(".streak")).toHaveText("0");
    await expect(c.locator(".due")).toHaveCount(0);
    const q = (await stored(page)).quests.find((x: { title: string }) => x.title === "Meditate");
    expect(q).toMatchObject({ ritual: true, diff: "easy" });
    expect(q.due).toBeUndefined();
  });

  test("/ jumps to quick add from anywhere, but types normally inside fields", async ({ page, open }) => {
    await open();
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Satchel" }).click();
    await page.keyboard.press("/");
    const input = page.getByRole("textbox", { name: "New quest" });
    await expect(input).toBeFocused();
    await page.keyboard.type("a/b");
    await expect(input).toHaveValue("a/b");
  });
});

test.describe("completing quests", () => {
  test("rewards XP, gold and a map step, and undo gives back exactly the same", async ({ page, open }) => {
    await open();
    await complete(page, "Write report");
    let s = await stored(page);
    expect(s).toMatchObject({ xp: 25, gold: 25, step: 1, streak: 1 });
    await expect(page.locator(".xp-label")).toContainText("25 / 100 XP");
    await expect(page.locator(".daybar")).toContainText("1 of 2 done today");
    await expect(page.locator(".done-list summary")).toHaveText("Completed today · 1");

    await page.locator(".done-list summary").click();
    await card(page, "Write report").getByRole("button", { name: /as not done/ }).click();
    s = await stored(page);
    expect(s).toMatchObject({ xp: 0, gold: 20, step: 0, bossHp: 300 });
    await expect(card(page, "Write report").locator(".seal")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".done-list")).toHaveCount(0);
  });

  test("main quest pays 1.5× XP, double gold and an extra step", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Big one", { main: true, diff: "hard" })] }) });
    await expect(card(page, "Big one").locator(".q-xp")).toHaveText("+75 XP");
    await complete(page, "Big one");
    expect(await stored(page)).toMatchObject({ xp: 75, gold: 40, step: 3 });
  });

  test("rapid double click completes only once", async ({ page, open }) => {
    await open();
    await card(page, "Write report").locator(".seal").dblclick();
    await expect(card(page, "Write report").locator(".seal")).toHaveAttribute("aria-pressed", "true");
    expect((await stored(page)).xp).toBe(25);
  });

  test("rituals count streaks up and back down on undo", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Walk", { ritual: true, due: undefined, streak: 4, diff: "easy" })] }) });
    await complete(page, "Walk");
    await expect(card(page, "Walk").locator(".streak")).toHaveText("5");
    await card(page, "Walk").getByRole("button", { name: /as not done/ }).click();
    await expect(card(page, "Walk").locator(".streak")).toHaveText("4");
    // and can be completed again right after undo
    await complete(page, "Walk");
    await expect(card(page, "Walk").locator(".streak")).toHaveText("5");
  });

  test("finishing everything for today shows the all-done line", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("Only task")] }) });
    await complete(page, "Only task");
    await expect(page.locator(".companion .line")).toContainText("Every quest for today is done");
    await expect(page.locator(".daybar")).toContainText("1 of 1 done today");
  });
});

test.describe("editing and removing", () => {
  test("abandon shows an undo toast that restores the quest in the same place", async ({ page, open }) => {
    await open({ data: save({ quests: [quest("First"), quest("Second"), quest("Third")] }) });
    await card(page, "Second").hover();
    await card(page, "Second").getByRole("button", { name: "Abandon quest" }).click();
    await expect(card(page, "Second")).toHaveCount(0);
    const toast = page.locator(".toast", { hasText: "Quest abandoned" });
    await expect(toast).toContainText("Second");
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(toast).toHaveCount(0);
    expect((await stored(page)).quests.map((q: { title: string }) => q.title)).toEqual(["First", "Second", "Third"]);
  });

  test("double-click renames inline; Escape cancels; empty keeps the old title", async ({ page, open }) => {
    await open();
    const title = card(page, "Write report").locator(".q-title");
    await title.dblclick();
    const edit = page.getByRole("textbox", { name: "Quest title" });
    await edit.fill("Write the Q4 report");
    await edit.press("Enter");
    await expect(card(page, "Write the Q4 report")).toBeVisible();

    await card(page, "Write the Q4 report").locator(".q-title").dblclick();
    await edit.fill("Should not stick");
    await edit.press("Escape");
    await expect(card(page, "Write the Q4 report")).toBeVisible();

    await card(page, "Write the Q4 report").locator(".q-title").dblclick();
    await edit.fill("   ");
    await edit.press("Enter");
    await expect(card(page, "Write the Q4 report")).toBeVisible();
  });

  test("quest sheet edits title, difficulty, due date and main flag", async ({ page, open }) => {
    await open();
    await card(page, "Write report").hover();
    await card(page, "Write report").getByRole("button", { name: "Edit “Write report”" }).click();
    const sheet = page.getByRole("dialog", { name: "Edit quest" });
    await expect(sheet).toBeVisible();

    await sheet.getByRole("textbox", { name: "Quest title" }).fill("Write final report");
    await sheet.getByRole("group", { name: "Difficulty" }).getByRole("button", { name: /^Hard/ }).click();
    await sheet.getByRole("group", { name: "Due date" }).getByRole("button", { name: "Someday" }).click();
    await expect(sheet.getByRole("group", { name: "Due date" }).getByRole("button", { name: "Someday" })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "Make it the main quest" }).click();
    await expect(sheet.getByRole("button", { name: "Remove as main quest" })).toBeVisible();
    // XP shown on the difficulty buttons follows the main-quest bonus
    await expect(sheet.getByRole("group", { name: "Difficulty" })).toContainText("Hard · 75 XP");
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(sheet).toBeHidden();

    const c = page.locator("[data-tour=main]").locator("li.quest");
    await expect(c.locator(".q-title")).toHaveText("Write final report");
    await expect(c.locator(".q-xp")).toHaveText("+75 XP");
    await expect(c.locator(".due")).toHaveCount(0);
  });

  test("quest sheet closes on Escape and on backdrop click", async ({ page, open }) => {
    await open();
    const sheet = page.getByRole("dialog", { name: "Edit quest" });
    for (const how of ["escape", "backdrop"]) {
      await card(page, "Call mom").hover();
      await card(page, "Call mom").getByRole("button", { name: "Edit “Call mom”" }).click();
      await expect(sheet).toBeVisible();
      if (how === "escape") await page.keyboard.press("Escape");
      else await page.mouse.click(5, 5);
      await expect(sheet).toBeHidden();
    }
  });

  test("abandon from the sheet closes it and offers undo", async ({ page, open }) => {
    await open();
    await card(page, "Call mom").hover();
    await card(page, "Call mom").getByRole("button", { name: "Edit “Call mom”" }).click();
    await page.getByRole("dialog", { name: "Edit quest" }).getByRole("button", { name: "Abandon quest" }).click();
    await expect(page.getByRole("dialog", { name: "Edit quest" })).toBeHidden();
    await expect(card(page, "Call mom")).toHaveCount(0);
    await expect(page.locator(".toast", { hasText: "Quest abandoned" })).toBeVisible();
  });

  test("focus button takes the quest to the campfire, preselected", async ({ page, open }) => {
    await open();
    await card(page, "Call mom").hover();
    await card(page, "Call mom").getByRole("button", { name: "Focus on this at the campfire" }).click();
    await expect(page.getByRole("heading", { name: "Pick one quest. Let it burn." })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveValue("q-call-mom");
  });
});

test.describe("dates and empty states", () => {
  test("overdue quests are marked late and fogged; sorted before today and tomorrow", async ({ page, open }) => {
    await open({
      data: save({
        quests: [quest("Later", { due: day(1) }), quest("Now", { due: day() }), quest("Late", { due: day(-1) }), quest("Way late", { due: day(-9) })],
      }),
    });
    const titles = await page.locator("li.quest .q-title").allInnerTexts();
    expect(titles).toEqual(["Way late", "Late", "Now", "Later"]);
    await expect(card(page, "Late").locator(".due")).toHaveText("Yesterday");
    await expect(card(page, "Late").locator(".due")).toHaveClass(/late/);
    await expect(card(page, "Late").locator(".fogtag")).toBeVisible();
    await expect(card(page, "Way late").locator(".due")).toHaveText("Oct 14");
    await expect(card(page, "Later").locator(".due")).toHaveText("Tomorrow");
    await expect(card(page, "Now").locator(".fogtag")).toHaveCount(0);
  });

  test("empty lists show guidance instead of blank space", async ({ page, open }) => {
    await open({ data: save({ quests: [] }) });
    await expect(page.locator("[data-tour=main] .empty")).toContainText("No main quest yet");
    await expect(page.locator(".empty", { hasText: "The trail is clear" })).toBeVisible();
    await expect(page.locator(".empty", { hasText: "daily" })).toBeVisible();
    await expect(page.locator(".daybar")).toContainText("0 of 0 done today");
  });
});
