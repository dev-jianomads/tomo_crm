import { expect, test } from "@playwright/test";
import { applyQaSession } from "./fixtures/qa-session";

test.beforeEach(async ({ page }) => {
  await applyQaSession(page);
});

test.describe("Phase 1 — safety + demo-critical", () => {
  test("Primary nav uses Lists label (not Pipeline)", async ({ page }) => {
    await page.goto("/home");
    const listsNav = page.getByTestId("nav-rail-link-pipeline");
    await expect(listsNav).toBeVisible();
    await expect(listsNav).toHaveAttribute("href", "/pipeline");
    await expect(listsNav).toHaveAttribute("aria-label", "Lists");
    await expect(page.getByRole("link", { name: "Pipeline" })).toHaveCount(0);
  });

  test("Workflow diagram shows trigger kind badge", async ({ page }) => {
    await page.goto("/workflows?playbook=pb-intro-tracker");
    await expect(page.getByTestId("workflow-process-flow")).toBeVisible();
    const kindBadge = page.getByTestId("workflow-trigger-kind-badge");
    await expect(kindBadge).toBeVisible();
    await expect(kindBadge).toHaveAttribute("data-trigger-kind", "EVENT");
    await expect(kindBadge).toHaveText("EVENT");
    await expect(page.getByTestId("workflow-outbound-safety")).toBeVisible();
  });

  test("Today commitment row shows Open calendar link", async ({ page }) => {
    await page.goto("/home");
    const links = page.getByTestId("today-commitment-open-calendar");
    await expect(links.first()).toBeVisible();
    await expect(links.first()).toHaveText("Open calendar");
  });

  test("Today action drawer shows primary CTAs and amend flow (no execution strip)", async ({ page }) => {
    await page.goto("/home");
    await page.getByTestId("today-action-row-a1").click();
    await expect(page.getByRole("button", { name: /Approve & send/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Amend$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Find another time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Do later/i })).toBeVisible();
    await expect(page.getByTestId("drawer-tomo-chat")).toHaveCount(0);
    await page.getByRole("button", { name: /^Amend$/ }).click();
    await expect(page.getByTestId("action-amend-chat")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Back$/ })).toBeVisible();
  });

  test("Today commitment drawer shows primary CTAs and amend flow (no chat strip until amend)", async ({ page }) => {
    await page.goto("/home");
    await page.getByTestId("today-commitment-row-c1").click();
    await expect(page.getByRole("button", { name: /Approve and Send/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Amend$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Attach Document/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Close$/ })).toBeVisible();
    await expect(page.getByTestId("drawer-tomo-chat")).toHaveCount(0);
    await page.getByRole("button", { name: /^Amend$/ }).click();
    await expect(page.getByTestId("commitment-amend-chat")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Back$/ })).toBeVisible();
  });
});
