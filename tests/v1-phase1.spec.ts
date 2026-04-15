import { expect, test } from "@playwright/test";

const SESSION_SEED = {
  email: "qa@example.com",
  onboardingComplete: true,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((session) => {
    window.localStorage.setItem("tomo-session", JSON.stringify(session));
  }, SESSION_SEED);
});

test.describe("Phase 1 — safety + demo-critical", () => {
  test("Primary nav uses Lists label (not Pipeline)", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("link", { name: "Lists" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pipeline" })).toHaveCount(0);
  });

  test("Workflow diagram shows trigger kind badge", async ({ page }) => {
    await page.goto("/workflows?playbook=pb-intro-tracker");
    await expect(page.getByText("Process flow")).toBeVisible();
    await expect(page.getByText("EVENT", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Outbound safety")).toBeVisible();
  });

  test("Today commitment row shows signal line", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByText(/Signal: Heating up/)).toBeVisible();
  });

  test("Today drawer shows execution vs draft chip groups when opening an action", async ({ page }) => {
    await page.goto("/home");
    await page.getByRole("button", { name: /PAAMCO Prisma : Peter Zakowich/ }).first().click();
    await expect(page.getByText("Execution", { exact: true })).toBeVisible();
    await expect(page.getByText("Draft with Tomo", { exact: true })).toBeVisible();
  });
});
