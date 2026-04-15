import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Visible browser locally; headless in CI or when PLAYWRIGHT_HEADLESS=1 / `playwright test --headless`. */
const headless = Boolean(process.env.CI) || process.env.PLAYWRIGHT_HEADLESS === "1";

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
