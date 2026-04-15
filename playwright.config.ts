import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Visible browser locally; headless in CI or when PLAYWRIGHT_HEADLESS=1 / `playwright test --headless`. */
const headless = Boolean(process.env.CI) || process.env.PLAYWRIGHT_HEADLESS === "1";

/**
 * Delay between Playwright actions (ms). Default 500 for easier headed observation;
 * 0 in CI. Override: PLAYWRIGHT_SLOW_MO=250 or PLAYWRIGHT_SLOW_MO=0
 */
const slowMo =
  process.env.CI || process.env.PLAYWRIGHT_SLOW_MO === "0"
    ? 0
    : Number(process.env.PLAYWRIGHT_SLOW_MO ?? 500);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 7_000,
  },
  reporter: "list",
  use: {
    baseURL,
    headless,
    slowMo,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
