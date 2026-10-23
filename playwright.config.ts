import { defineConfig, devices } from "@playwright/test";

const PORT = 4317;

// desktop runs everything; tablet + phone run the layout, tour and accessibility suites
const shared = /(layout|tour|a11y)\.spec\.ts/;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // real scrollbars on desktop (headless hides them), so scrollbar layout shifts are caught
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } } },
    { name: "tablet", testMatch: shared, use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: "phone", testMatch: shared, use: { ...devices["Pixel 7"] } },
    { name: "iphone", testMatch: shared, use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
