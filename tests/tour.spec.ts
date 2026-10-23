import type { Page } from "@playwright/test";
import { expect, isPhone, save, stored, test } from "./fixtures";

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

async function openSettings(page: Page) {
  if (isPhone(page)) await page.getByRole("button", { name: "Settings" }).click();
}

test("first visit runs the tour; every step is on screen, points at something real, and never covers it", async ({ page, open }) => {
  await open({ data: save({ tourDone: false }) });
  const card = page.locator(".tour-card");
  await expect(card).toBeVisible();
  const total = Number((await card.locator(".kicker").innerText()).split("/")[1]);
  expect(total).toBe(9);
  const vp = page.viewportSize()!;

  for (let i = 1; i <= total; i++) {
    await expect(card.locator(".kicker")).toHaveText(`${i} / ${total}`);
    await page.waitForTimeout(500); // spotlight glides + target scrolls into view
    const c = (await card.boundingBox())!;
    expect(c.x, `step ${i} card left`).toBeGreaterThanOrEqual(0);
    expect(c.y, `step ${i} card top`).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width, `step ${i} card right`).toBeLessThanOrEqual(vp.width);
    expect(c.y + c.height, `step ${i} card bottom`).toBeLessThanOrEqual(vp.height);

    const spot = page.locator(".tour-spot:not(.none)");
    if (i > 1) {
      const s = (await spot.boundingBox())!;
      expect(s.width * s.height, `step ${i} highlights something`).toBeGreaterThan(200);
      expect(s.y + s.height, `step ${i} target is on screen`).toBeGreaterThan(0);
      expect(s.y, `step ${i} target is on screen`).toBeLessThan(vp.height);
      const visible = Math.min(s.width * s.height, vp.width * vp.height);
      expect(overlap(c, s) / visible, `step ${i} card covers the highlighted part`).toBeLessThan(0.25);
    }
    await expect(card.getByRole("button", { name: i === 1 ? "Show me" : i === total ? "Start adventuring" : "Next" })).toBeFocused();
    await card.getByRole("button", { name: i === 1 ? "Show me" : i === total ? "Start adventuring" : "Next" }).click();
  }
  await expect(card).toHaveCount(0);
  expect((await stored(page)).tourDone).toBe(true);
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(page.locator(".tour-card")).toHaveCount(0);
});

test("tour works with the keyboard: arrows move, Escape closes for good", async ({ page, open }) => {
  await open({ data: save({ tourDone: false }) });
  const kicker = page.locator(".tour-card .kicker");
  await expect(kicker).toHaveText("1 / 9");
  await page.keyboard.press("ArrowLeft");
  await expect(kicker).toHaveText("1 / 9");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(kicker).toHaveText("3 / 9");
  await page.keyboard.press("ArrowLeft");
  await expect(kicker).toHaveText("2 / 9");
  await page.keyboard.press("Escape");
  await expect(page.locator(".tour-card")).toHaveCount(0);
  expect((await stored(page)).tourDone).toBe(true);
});

test("the page underneath can't be clicked during the tour", async ({ page, open }) => {
  await open({ data: save({ tourDone: false }) });
  await expect(page.locator(".tour-card")).toBeVisible();
  await page.mouse.click(10, (page.viewportSize()!.height * 2) / 3);
  await expect(page.locator(".tour-card")).toBeVisible();
  expect((await stored(page)).xp).toBe(0);
});

test("steps for things that aren't there are skipped", async ({ page, open }) => {
  await open({ data: save({ tourDone: false, quests: [], adventure: false }) });
  // no quest to complete, no map, no boss → 9 - 3
  await expect(page.locator(".tour-card .kicker")).toHaveText("1 / 6");
});

test("the tour can be replayed from settings and starts on Today", async ({ page, open }) => {
  await open();
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Satchel" }).click();
  await openSettings(page);
  await page.getByRole("button", { name: "Take the tour" }).click();
  await expect(page.locator(".tour-card")).toBeVisible();
  await expect(page.locator(".quick")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Profile and settings" })).toBeHidden();
});
