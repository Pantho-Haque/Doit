import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { dayKey, type Quest } from "../lib/world";

/** All tests run on this local date/time so day logic (due dates, streaks, rollover) is repeatable. */
export const NOW = new Date(2026, 9, 23, 9, 30); // Fri 23 Oct 2026, 09:30 local
export const day = (offset = 0) => dayKey(offset, NOW);
export const at = (offset: number, h = 9) => new Date(2026, 9, 23 + offset, h, 30);

export function quest(title: string, extra: Partial<Quest> = {}): Quest {
  return {
    id: `q-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    diff: "normal",
    main: false,
    ritual: false,
    streak: 0,
    done: false,
    due: day(),
    ...extra,
  };
}

export function save(over: Record<string, unknown> = {}) {
  return {
    name: "Tester",
    xp: 0,
    gold: 20,
    streak: 0,
    lastSeenDay: day(),
    chapter: 0,
    step: 0,
    journal: [],
    bossIndex: 0,
    bossHp: 300,
    focusMin: 0,
    loot: {},
    rewards: [{ id: "r1", title: "Fancy coffee", cost: 50 }],
    quests: [quest("Write report"), quest("Call mom", { diff: "easy", tag: "personal" })],
    adventure: true,
    theme: "dark",
    sound: false,
    tourDone: true,
    ...over,
  };
}

export type OpenOptions = {
  /** saved game to start from; `null` = brand-new visitor */
  data?: Record<string, unknown> | null;
  /** raw string written to storage (for corrupt-data tests) */
  raw?: string;
  /** old v0 app data under the `todos` key */
  legacy?: unknown[];
  time?: Date;
  /** fake timers: drive time with page.clock.runFor() */
  fakeTimers?: boolean;
  storageThrows?: boolean;
  fakeAudio?: boolean;
};

type Fixtures = {
  errors: string[];
  open: (o?: OpenOptions) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  // every test fails if the page logs an error or throws
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console: ${m.text()}`);
      });
      await use(errors);
      expect(errors, "page logged errors").toEqual([]);
    },
    { auto: true },
  ],

  open: async ({ page }, use) => {
    await use(async (o = {}) => {
      const time = o.time ?? NOW;
      if (o.fakeTimers) await page.clock.install({ time });
      else await page.clock.setFixedTime(time);

      await page.addInitScript(
        ({ data, raw, legacy, throws, fakeAudio }) => {
          // seed storage once per test, not on every reload
          if (!sessionStorage.getItem("__seeded")) {
            sessionStorage.setItem("__seeded", "1");
            localStorage.clear();
            if (raw !== undefined) localStorage.setItem("doit:v1", raw);
            else if (data) localStorage.setItem("doit:v1", JSON.stringify(data));
            if (legacy) localStorage.setItem("todos", JSON.stringify(legacy));
          }

          // repeatable randomness; tests can force a value with window.__rand = 0
          let seed = 42;
          const prng = () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
          const w = window as unknown as { __rand?: number; __audio: string[] };
          Math.random = () => w.__rand ?? prng();

          if (throws) {
            Storage.prototype.setItem = () => {
              throw new DOMException("quota", "QuotaExceededError");
            };
          }

          if (fakeAudio) {
            w.__audio = [];
            const any: unknown = new Proxy(function () {}, {
              get: (_t, k) => (k === "connect" ? (n: unknown) => n ?? any : k === "value" ? 0 : any),
              set: () => true,
              apply: () => any,
            });
            class FakeAudio {
              currentTime = 0;
              sampleRate = 100;
              state = "running";
              destination = any;
              constructor() {
                w.__audio.push("context");
              }
              resume() {
                return Promise.resolve();
              }
              createBuffer(_c: number, len: number) {
                return { getChannelData: () => new Float32Array(len) };
              }
            }
            for (const m of ["createGain", "createBufferSource", "createBiquadFilter", "createOscillator"]) {
              (FakeAudio.prototype as unknown as Record<string, () => unknown>)[m] = () => {
                w.__audio.push(m);
                return any;
              };
            }
            (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudio;
          }
        },
        { data: o.data === undefined ? save() : o.data, raw: o.raw, legacy: o.legacy, throws: !!o.storageThrows, fakeAudio: !!o.fakeAudio },
      );

      await page.goto("/");
      await expect(page.locator(".app")).toBeVisible();
    });
  },
});

export { expect };

// ---------- helpers ----------

/** The saved game as it is in localStorage right now. */
export async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("doit:v1") ?? "null"));
}

const exact = (t: string) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
export const card = (page: Page, title: string): Locator => page.locator("li.quest", { has: page.locator(".q-title", { hasText: exact(title) }) });

export async function complete(page: Page, title: string) {
  await card(page, title).first().getByRole("button", { name: `Complete “${title}”` }).click();
  await expect(card(page, title).first().locator(".seal")).toHaveAttribute("aria-pressed", "true");
}

export async function addQuest(page: Page, text: string) {
  const input = page.getByRole("textbox", { name: "New quest" });
  await input.fill(text);
  await input.press("Enter");
  await expect(input).toHaveValue("");
}

export async function nav(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name }).click();
}

/** Close the reward/story modal on top and return its title. */
export async function closeModal(page: Page) {
  const modal = page.locator("dialog.modal[open]");
  await expect(modal).toBeVisible();
  const title = await modal.locator("h2").innerText();
  await modal.getByRole("button").click();
  return title;
}

export async function noHorizontalScroll(page: Page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(sw, "page must not scroll sideways").toBeLessThanOrEqual(w);
}

export const isCompact = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 1180;
export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 760;
