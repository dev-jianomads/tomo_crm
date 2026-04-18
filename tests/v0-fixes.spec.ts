import { expect, test } from "@playwright/test";
import { applyQaSession } from "./fixtures/qa-session";

test.beforeEach(async ({ page }) => {
  await applyQaSession(page);
});

test.describe("Phase 0 stabilization checks", () => {
  test("Today page has title-only header without instructional subtitle", async ({ page }) => {
    await page.goto("/home");

    const header = page.getByTestId("page-list-header");
    await expect(header).toBeVisible();
    await expect(page.getByTestId("page-header-title-today")).toHaveText("Today");
    await expect(header).not.toContainText(
      "Prioritize actions and meetings for the active fund, skim briefs, and ask Tomo to reason over what needs attention next."
    );
  });

  test("Relationships page removes subtitle and uses Signal naming", async ({ page }) => {
    await page.goto("/relationships");

    await expect(page.getByTestId("page-header-title-relationships")).toHaveText("Relationships");
    await expect(page.getByTestId("page-list-header")).not.toContainText(
      "Explore LP and prospect records with filters and table views—open a row for the full profile, timeline, and Tomo chat."
    );

    await expect(page.getByTestId("relationships-sort-momentum")).toBeVisible();
    await expect(page.getByTestId("relationships-sort-momentum")).toContainText("Signal");
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
    const chipBar = page.getByTestId("relationships-filter-suggestion-chips");
    const chip = chipBar.getByRole("button", { name: chipName });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(chipBar.getByRole("button", { name: chipName })).toBeVisible();
  });

  test("Workflows page header is title-only with no subtitle", async ({ page }) => {
    await page.goto("/workflows");

    await expect(page.getByTestId("page-header-title-workflows")).toHaveText("Workflows");
    await expect(page.getByTestId("page-list-header")).not.toContainText(
      "Workflows run on schedule, check evidence, and create drafts."
    );
    await expect(page.getByTestId("page-list-header")).not.toContainText("View lists");
  });
});
