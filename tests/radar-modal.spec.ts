import { expect, test } from "@playwright/test";
import { applyQaSession } from "./fixtures/qa-session";

test.beforeEach(async ({ page }) => {
  await applyQaSession(page);
});

test.describe("Phase 5 — Radar Modal (Appendix I)", () => {
  test("opens from Today, shows taxonomy + footer, Esc closes", async ({ page }) => {
    await page.goto("/home");

    await page.getByTestId("today-open-radar").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /^On my radar$/i })).toBeVisible();

    await expect(dialog.getByRole("button", { name: "Commitments" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Gone quiet" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Next 7 days at a glance" })).toBeVisible();

    await expect(dialog.getByText(/Daily Brief delivered also via email/i)).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Brief settings" })).toHaveAttribute("href", "/settings/notifications");

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
