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

test.describe("Phase 0 stabilization checks", () => {
  test("Today page has title-only header without instructional subtitle", async ({ page }) => {
    await page.goto("/home");

    await expect(page.getByText("Today", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(
        "Prioritize actions and meetings for the active fund, skim briefs, and ask Tomo to reason over what needs attention next."
      )
    ).toHaveCount(0);
  });

  test("Relationships page removes subtitle and uses Signal naming", async ({ page }) => {
    await page.goto("/relationships");

    await expect(page.getByText("Relationships", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(
        "Explore LP and prospect records with filters and table views—open a row for the full profile, timeline, and Tomo chat."
      )
    ).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Signal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Momentum" })).toHaveCount(0);
  });

  test("Relationships drawer activity attribution is GP/TOMO only", async ({ page }) => {
    await page.goto("/relationships");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await page.getByRole("button", { name: "Activity log" }).click();

    await expect(page.getByText("User", { exact: true })).toHaveCount(0);
  });

  test("Relationships chips persist after chip click", async ({ page }) => {
    await page.goto("/relationships");

    const chipName = "Tier 1 LPs";
    const chip = page.getByRole("button", { name: chipName });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(page.getByRole("button", { name: chipName })).toBeVisible();
  });

  test("Workflows page header updates to lists naming and no subtitle", async ({ page }) => {
    await page.goto("/workflows");

    await expect(page.getByText("Workflows", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Workflows run on schedule, check evidence, and create drafts.")
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View lists →" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View pipelines →" })).toHaveCount(0);
  });
});
