import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { card, expect, isCompact, isPhone, nav, quest, save, test } from "./fixtures";

/** WCAG 2.2 AA rules; prints each failing element so it's easy to fix. */
async function audit(page: Page, what: string) {
  await page.waitForTimeout(450); // let entrance animations settle so contrast is measured on final colors
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const report = r.violations.flatMap((v) => v.nodes.map((n) => `[${v.id}] ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? v.help}`));
  expect(report, `${what}: accessibility problems`).toEqual([]);
}

const data = save({
  quests: [quest("Plan the week", { main: true, diff: "hard" }), quest("Late one", { due: "2026-10-20" }), quest("Walk", { ritual: true, due: undefined, streak: 3 })],
  loot: { lantern: 1, charm: 1 },
  journal: [0],
  chapter: 1,
});

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test("Today", async ({ page, open }) => {
      await open({ data: { ...data, theme } });
      await audit(page, "Today");
    });

    test("Today with a quest completed", async ({ page, open }) => {
      await open({ data: { ...data, theme } });
      await card(page, "Late one").locator(".seal").click();
      await page.locator(".done-list summary").click();
      await audit(page, "Today, completed list open");
    });

    test("Campfire, Satchel, Journal and Map", async ({ page, open }) => {
      await open({ data: { ...data, theme } });
      for (const v of ["Campfire", "Satchel", "Journal", ...(isCompact(page) ? ["Map"] : [])]) {
        await nav(page, v);
        await audit(page, v);
      }
    });

    test("quest sheet", async ({ page, open }) => {
      await open({ data: { ...data, theme } });
      await card(page, "Late one").hover();
      await card(page, "Late one").getByRole("button", { name: /^Edit/ }).click();
      await audit(page, "Quest sheet");
    });

    test("bestiary", async ({ page, open }) => {
      await open({ data: { ...data, theme, bossIndex: 1 } });
      if (isCompact(page)) await nav(page, "Map");
      await page.getByRole("button", { name: "All bosses (bestiary)" }).click();
      await audit(page, "Bestiary");
    });

    test("story modal and toasts", async ({ page, open }) => {
      await open({ data: { ...data, theme, xp: 95 } });
      await page.evaluate(() => ((window as unknown as { __rand: number }).__rand = 0));
      await card(page, "Late one").locator(".seal").click();
      await expect(page.locator("dialog.modal[open]")).toBeVisible();
      await audit(page, "Level-up modal + loot toast");
    });

    test("tour", async ({ page, open }) => {
      await open({ data: { ...data, theme, tourDone: false } });
      await expect(page.locator(".tour-card")).toBeVisible();
      await audit(page, "Tour step 1");
      await page.getByRole("button", { name: "Show me" }).click();
      await audit(page, "Tour step 2");
    });

    test("calm mode", async ({ page, open }) => {
      await open({ data: { ...data, theme, adventure: false } });
      await audit(page, "Calm mode");
    });
  });
}

test("settings sheet on phones", async ({ page, open }) => {
  test.skip(!isPhone(page), "phone only");
  await open();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("dialog.sheet[open] summary", { hasText: "Your data" }).click();
  await audit(page, "Settings sheet");
});

test("sidebar data menu", async ({ page, open }) => {
  test.skip(isPhone(page), "desktop/tablet");
  await open();
  await page.locator(".side-foot summary", { hasText: "Your data" }).click();
  await audit(page, "Data menu");
});
