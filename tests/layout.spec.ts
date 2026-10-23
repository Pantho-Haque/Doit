import type { Locator, Page } from "@playwright/test";
import { card, expect, isCompact, isPhone, nav, noHorizontalScroll, quest, save, test } from "./fixtures";

const many = save({
  quests: [
    quest("Plan the week", { main: true, diff: "hard", tag: "work" }),
    ...Array.from({ length: 9 }, (_, i) => quest(`Side quest number ${i + 1}`, { tag: i % 2 ? "home" : "work" })),
    quest("Walk", { ritual: true, due: undefined }),
    quest("Read", { ritual: true, due: undefined }),
  ],
});

const box = async (l: Locator) => (await l.boundingBox())!;

async function openSettings(page: Page) {
  if (isPhone(page)) await page.getByRole("button", { name: "Settings" }).click();
}

async function views(page: Page) {
  const v = ["Today", "Campfire", "Satchel", "Journal"];
  if (isCompact(page)) v.push("Map");
  return v;
}

test("no view scrolls sideways", async ({ page, open }) => {
  await open({ data: many });
  for (const v of await views(page)) {
    await nav(page, v);
    await noHorizontalScroll(page);
  }
});

test("each nav tab shows its view and is marked as current", async ({ page, open }) => {
  await open();
  const tabs = page.getByRole("navigation", { name: "Main" });
  for (const v of await views(page)) {
    await tabs.getByRole("button", { name: v }).click();
    await expect(tabs.getByRole("button", { name: v })).toHaveAttribute("aria-current", "page");
    await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
  }
});

test("Map tab and expedition strip only appear when there is no side panel", async ({ page, open }) => {
  await open();
  const mapTab = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Map" });
  if (isCompact(page)) {
    await expect(mapTab).toBeVisible();
    await expect(page.locator(".expedition")).toBeVisible();
    await expect(page.locator(".rail")).toHaveCount(0);
    await page.locator(".expedition").click();
    await expect(page.locator(".rail.inline .map-card")).toBeVisible();
    await expect(page.locator(".rail.inline .boss")).toBeVisible();
  } else {
    await expect(mapTab).toBeHidden();
    await expect(page.locator(".expedition")).toBeHidden();
    await expect(page.locator(".rail")).toBeVisible();
  }
});

for (const [label, data] of [["with a main quest", many], ["without a main quest", save()]] as const) {
  test(`tasks are visible on the first screen without scrolling (${label})`, async ({ page, open }) => {
    await open({ data });
    const vp = page.viewportSize()!;
    const b = await box(page.locator("li.quest").first());
    let bottomLimit = vp.height;
    if (isPhone(page)) bottomLimit = (await box(page.getByRole("navigation", { name: "Main" }))).y;
    expect(b.y + b.height, "first quest card fits above the fold").toBeLessThanOrEqual(bottomLimit);
    await expect(page.getByRole("textbox", { name: "New quest" })).toBeInViewport();
  });
}

test("the bottom of the list isn't hidden behind the tab bar or the + button", async ({ page, open }) => {
  await open({ data: many });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const last = page.locator("li.quest").last();
  const b = await box(last);
  if (isPhone(page)) {
    const navTop = (await box(page.getByRole("navigation", { name: "Main" }))).y;
    expect(b.y + b.height).toBeLessThanOrEqual(navTop);
    const fab = await box(page.getByRole("button", { name: "Add a quest" }));
    const more = await box(last.getByRole("button", { name: /^Edit/ }));
    const hit = more.x < fab.x + fab.width && more.x + more.width > fab.x && more.y < fab.y + fab.height && more.y + more.height > fab.y;
    expect(hit, "the last card's menu button is not under the + button").toBe(false);
  } else {
    expect(b.y + b.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
});

test("settings rows fill the full width (icons line up on the right)", async ({ page, open }) => {
  await open();
  await openSettings(page);
  const container = page.locator(isPhone(page) ? "dialog.sheet[open] .settings" : ".side-foot .settings");
  const c = await box(container);
  const rows = container.locator(".switch-row");
  await expect(rows).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const r = await box(rows.nth(i));
    expect(Math.abs(r.width - c.width), `row ${i} width`).toBeLessThanOrEqual(1);
    const icon = await box(rows.nth(i).locator("svg, .switch").last());
    expect(r.x + r.width - (icon.x + icon.width), `row ${i} icon hugs the right edge`).toBeLessThanOrEqual(16);
  }
});

test("desktop side panel shows map, guide and boss without its own scrollbar", async ({ page, open }) => {
  test.skip(isCompact(page), "desktop only");
  await open();
  const boss = await box(page.locator(".boss .lair"));
  expect(boss.y + boss.height / 2, "boss is visible on a 900px screen").toBeLessThan(page.viewportSize()!.height);
  const color = await page.locator(".rail").evaluate((el) => getComputedStyle(el).scrollbarColor);
  expect(color).toMatch(/transparent|rgba\(0, 0, 0, 0\)/);
});

test("desktop side panel keeps the same width whether or not it overflows", async ({ page, open }) => {
  test.skip(isCompact(page), "desktop only");
  await open();
  const width = async (h: number) => {
    await page.setViewportSize({ width: 1440, height: h });
    return (await box(page.locator(".boss .lair"))).width;
  };
  // 700px overflows (scrollbar), 1400px fits (none), ~1010px used to flip between the two
  const sizes = [await width(700), await width(1400), await width(1010)];
  await page.locator(".lair-btn").click();
  sizes.push((await box(page.locator(".boss .lair"))).width);
  expect(new Set(sizes).size, `boss width per state: ${sizes}`).toBe(1);
});

test.describe("phone conventions", () => {
  test.beforeEach(({ page }) => test.skip(!isPhone(page), "phone only"));

  test("profile and settings live in the top bar, not above the tasks", async ({ page, open }) => {
    await open();
    await expect(page.locator(".appbar")).toBeVisible();
    await expect(page.locator(".side .profile")).toBeHidden();
    await expect(page.locator(".side-foot")).toBeHidden();
    const bar = await box(page.locator(".appbar"));
    expect(bar.height).toBeLessThanOrEqual(80);
  });

  test("top bar stays put while scrolling and shows XP progress", async ({ page, open }) => {
    await open({ data: save({ ...many, xp: 50 }) });
    await page.evaluate(() => scrollTo(0, 800));
    const bar = await box(page.locator(".appbar"));
    expect(bar.y).toBeLessThanOrEqual(1);
    await expect(page.locator(".appbar-xp i")).toHaveAttribute("style", /width: 50%/);
  });

  test("touch targets are at least 44px", async ({ page, open }) => {
    await open();
    const targets = [
      ...(await page.getByRole("navigation", { name: "Main" }).getByRole("button").all()),
      page.getByRole("button", { name: "Add a quest" }),
      page.getByRole("button", { name: "Settings" }),
      page.locator(".appbar-me"),
      ...(await page.locator("li.quest").first().getByRole("button").all()),
    ];
    for (const t of targets) {
      if (!(await t.isVisible())) continue;
      const b = await box(t);
      const name = (await t.getAttribute("aria-label")) ?? (await t.innerText());
      const size = Math.min(b.width, b.height);
      expect(size, `"${name}" is big enough to tap`).toBeGreaterThanOrEqual(44);
    }
  });

  test("tapping just outside the drawn seal still completes the quest", async ({ page, open }) => {
    await open();
    // the drawn circle is 28px centred in the 44px button: tap 6px outside the circle
    const b = await box(card(page, "Write report").locator(".seal"));
    expect(b.width).toBeGreaterThanOrEqual(44);
    await page.mouse.click(b.x + b.width / 2 - 14 - 6, b.y + b.height / 2);
    await expect(card(page, "Write report").locator(".seal")).toHaveAttribute("aria-pressed", "true");
  });

  test("text fields are at least 16px so iPhones don't zoom", async ({ page, open }) => {
    await open();
    const sizes = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll("input:not([type=file]):not([type=checkbox]), select, textarea")]
          .filter((el) => (el as HTMLElement).offsetParent || el.closest("dialog[open]"))
          .map((el) => [el.getAttribute("aria-label") ?? el.id, parseFloat(getComputedStyle(el).fontSize)] as const),
      );
    const all = [...(await sizes())];
    await page.locator("li.quest").first().locator(".q-body").click();
    all.push(...(await sizes()));
    await page.keyboard.press("Escape");
    await nav(page, "Satchel");
    all.push(...(await sizes()));
    await nav(page, "Campfire");
    all.push(...(await sizes()));
    expect(all.length).toBeGreaterThan(3);
    for (const [name, size] of all) expect(size, `${name} font size`).toBeGreaterThanOrEqual(16);
  });

  test("tapping a quest opens its sheet from the bottom of the screen", async ({ page, open }) => {
    await open();
    await page.locator("li.quest").first().locator(".q-title").click();
    const sheet = page.getByRole("dialog", { name: "Edit quest" });
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(400);
    const b = await box(sheet);
    expect(Math.round(b.y + b.height)).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
    expect(b.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
  });

  test("only the menu button shows on cards (no row of tiny icons)", async ({ page, open }) => {
    await open();
    const c = page.locator("li.quest").first();
    await expect(c.getByRole("button", { name: /^Edit/ })).toBeVisible();
    await expect(c.getByRole("button", { name: "Abandon quest" })).toBeHidden();
    await expect(c.getByRole("button", { name: "Make this the main quest" })).toBeHidden();
  });

  test("+ button focuses quick add", async ({ page, open }) => {
    await open({ data: many });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole("button", { name: "Add a quest" }).click();
    await expect(page.getByRole("textbox", { name: "New quest" })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "New quest" })).toBeInViewport();
  });

  test("+ button is only on Today", async ({ page, open }) => {
    await open();
    await nav(page, "Satchel");
    await expect(page.getByRole("button", { name: "Add a quest" })).toHaveCount(0);
  });

  test("notifications appear at the top, clear of the + button and tab bar", async ({ page, open }) => {
    await open();
    await page.locator("li.quest").first().locator(".q-title").click();
    await page.getByRole("dialog", { name: "Edit quest" }).getByRole("button", { name: "Abandon quest" }).click();
    const t = await box(page.locator(".toast"));
    const bar = await box(page.locator(".appbar"));
    expect(t.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    expect(t.y + t.height).toBeLessThan(page.viewportSize()!.height / 2);
  });

  test("settings sheet closes from its X and from the backdrop", async ({ page, open }) => {
    await open();
    const sheet = page.getByRole("dialog", { name: "Profile and settings" });
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    await page.locator(".appbar-me").click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(sheet).toBeHidden();
  });
});

test("keyboard users can see where focus is", async ({ page, open }) => {
  test.skip(isPhone(page), "no keyboard on phones");
  await open();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const style = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      const wrap = el.parentElement ? getComputedStyle(el.parentElement).boxShadow : "none";
      return { tag: el.tagName, label: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 20), outline: cs.outlineStyle, shadow: cs.boxShadow, wrapperShadow: wrap };
    });
    // the ring may sit on the field's wrapper (e.g. quick add highlights the whole bar)
    const visible = style.outline !== "none" || style.shadow !== "none" || style.wrapperShadow !== "none";
    expect(visible, `focus ring on ${style.tag} "${style.label}"`).toBe(true);
  }
});

test("reduced-motion users get no flying sparks or looping animation", async ({ page, open }) => {
  await open();
  await card(page, "Write report").locator(".seal").click();
  await expect(page.locator(".fx-spark")).toHaveCount(0);
  await nav(page, "Campfire");
  await page.getByRole("button", { name: "Light the fire" }).click();
  const dur = await page.locator(".flame").first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(dur).toBeLessThan(0.01);
});
