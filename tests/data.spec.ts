import { readFile } from "node:fs/promises";
import { addQuest, card, complete, expect, quest, save, stored, test } from "./fixtures";

test.describe("saving", () => {
  test("everything survives a reload", async ({ page, open }) => {
    await open();
    await addQuest(page, "Persist me !hard");
    await complete(page, "Call mom");
    await page.getByRole("switch", { name: "Adventure mode" }).click();
    await page.reload();
    await expect(card(page, "Persist me")).toBeVisible();
    await expect(card(page, "Call mom").locator(".seal")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("switch", { name: "Adventure mode" })).toHaveAttribute("aria-checked", "false");
  });

  test("first visit starts with a sample journey and the tour", async ({ page, open }) => {
    await open({ data: null });
    await expect(page.locator(".tour-card")).toBeVisible();
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.locator("li.quest").first()).toBeVisible();
    expect((await stored(page)).tourDone).toBe(true);
  });

  test("corrupt saved data does not crash the app", async ({ page, open }) => {
    await open({ raw: "{not json" });
    await expect(page.locator(".quick")).toBeVisible();
    await expect(page.locator("li.quest").first()).toBeVisible();
  });

  test("saves from an older version get the new fields filled in", async ({ page, open }) => {
    const old = save();
    delete (old as Record<string, unknown>).sound;
    delete (old as Record<string, unknown>).tourDone;
    await open({ data: old });
    const s = await stored(page);
    expect(s.sound).toBe(true);
    await expect(page.locator(".tour-card")).toBeVisible();
  });

  test("todos from the first version of the app are carried over", async ({ page, open }) => {
    await open({ data: null, legacy: [{ id: 1, title: "Learn React", completed: false }, { id: 2, title: "Learn MobX", completed: true }] });
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(card(page, "Learn React")).toBeVisible();
    expect((await stored(page)).quests.map((q: { title: string; done: boolean }) => [q.title, q.done])).toEqual([
      ["Learn React", false],
      ["Learn MobX", true],
    ]);
  });

  test("if the browser refuses to save, the app keeps working for the session", async ({ page, open }) => {
    await open({ data: null, storageThrows: true });
    await page.getByRole("button", { name: "Skip tour" }).click();
    await addQuest(page, "Still works");
    await expect(card(page, "Still works")).toBeVisible();
  });
});

test.describe("backup and reset", () => {
  test("download backup saves a dated JSON file with the whole journey", async ({ page, open }) => {
    await open({ data: save({ xp: 123 }) });
    await page.locator(".side-foot summary", { hasText: "Your data" }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
    expect(download.suggestedFilename()).toBe("doit-backup-2026-10-23.json");
    const data = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(data.xp).toBe(123);
    expect(data.quests).toHaveLength(2);
  });

  test("restoring a valid backup replaces the journey", async ({ page, open }) => {
    await open();
    await page.locator(".side-foot summary", { hasText: "Your data" }).click();
    const backup = JSON.stringify(save({ xp: 500, quests: [quest("From backup")] }));
    await page.locator('input[type="file"]').first().setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(backup) });
    await expect(page.locator(".toast", { hasText: "Backup restored" })).toBeVisible();
    await expect(card(page, "From backup")).toBeVisible();
    await expect(card(page, "Write report")).toHaveCount(0);
  });

  test("restoring a wrong file shows an error and changes nothing", async ({ page, open }) => {
    await open();
    await page.locator(".side-foot summary", { hasText: "Your data" }).click();
    for (const content of ["not json at all", JSON.stringify({ hello: "world" }), JSON.stringify({ quests: "nope", xp: 1 })]) {
      await page.locator('input[type="file"]').first().setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from(content) });
      await expect(page.locator(".toast", { hasText: "That file isn't a Doit backup" }).last()).toBeVisible();
    }
    await expect(card(page, "Write report")).toBeVisible();
  });

  test("restoring the same file twice works (input resets)", async ({ page, open }) => {
    await open();
    await page.locator(".side-foot summary", { hasText: "Your data" }).click();
    const file = { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(save({ quests: [quest("Again")] }))) };
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await expect(card(page, "Again")).toBeVisible();
    await addQuest(page, "Temporary");
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await expect(card(page, "Temporary")).toHaveCount(0);
  });

  test("starting over needs a second click, and clicking away cancels", async ({ page, open }) => {
    await open({ data: save({ xp: 300 }) });
    await page.locator(".side-foot summary", { hasText: "Your data" }).click();
    const reset = page.getByRole("button", { name: "Start a new journey" });
    await reset.click();
    const confirm = page.getByRole("button", { name: "Tap again to erase everything" });
    await expect(confirm).toBeVisible();
    await page.locator(".quick input").click(); // blur cancels
    await expect(page.getByRole("button", { name: "Start a new journey" })).toBeVisible();
    expect((await stored(page)).xp).toBe(300);

    await page.getByRole("button", { name: "Start a new journey" }).click();
    await page.getByRole("button", { name: "Tap again to erase everything" }).click();
    expect((await stored(page)).xp).toBe(0);
  });
});

test.describe("name and theme", () => {
  test("renaming yourself updates the greeting; blank falls back to Wayfarer", async ({ page, open }) => {
    await open();
    const name = page.getByRole("textbox", { name: "Your name" });
    await name.fill("Ada");
    await name.press("Enter");
    await expect(page.locator("h1")).toContainText(", Ada.");
    await name.fill("   ");
    await name.press("Enter");
    await expect(page.locator("h1")).toContainText(", Wayfarer.");
    await expect(name).toHaveValue("Wayfarer");
  });

  test("names are capped at 24 characters", async ({ page, open }) => {
    await open();
    const name = page.getByRole("textbox", { name: "Your name" });
    await name.fill("A".repeat(60));
    await name.press("Enter");
    expect((await stored(page)).name).toHaveLength(24);
  });

  test("theme switches, persists, and is applied before the app loads (no flash)", async ({ page, open }) => {
    await open();
    await page.getByRole("button", { name: "Night expedition" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(243, 238, 226)");

    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __early: string | undefined }).__early = document.documentElement.dataset.theme;
      });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { __early?: string }).__early)).toBe("light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f3eee2");
  });
});
