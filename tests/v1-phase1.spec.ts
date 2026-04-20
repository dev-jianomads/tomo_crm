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

  test("Lists page is browse-only: title-only header, no create/filter strip (L2)", async ({ page }) => {
    await page.goto("/pipeline");

    await expect(page.getByTestId("page-header-title-lists")).toHaveText("Lists");
    const header = page.getByTestId("page-list-header");
    await expect(header).not.toContainText("Refine the CRM with natural-language filters");
    await expect(page.getByRole("link", { name: /View workflows/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /LP Network/ })).toHaveCount(0);
    await expect(page.getByTestId("lists-quick-filters")).toHaveCount(0);
    await expect(page.getByPlaceholder("Name your list here")).toHaveCount(0);
  });

  test("Lists drawer: funnel, companies by stage, workflows, CTAs; no tile Use in workflow (L3)", async ({
    page,
  }) => {
    await page.goto("/pipeline");
    await page.getByRole("button", { name: /Q1 Target List/i }).first().click();

    await expect(page.getByText("Funnel by stage")).toBeVisible();
    await expect(page.getByText("Companies by stage")).toBeVisible();
    await expect(page.getByTestId("list-drawer-workflows")).toBeVisible();
    await expect(page.getByTestId("list-drawer-actions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Amend list" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workflow" })).toBeVisible();
    await expect(page.getByText("Use in workflow")).toHaveCount(0);

    await page.getByRole("button", { name: "Amend list" }).click();
    await expect(page.getByTestId("amend-list-modal")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await expect(page.getByLabel("Add to list")).toBeVisible();
  });

  test("Workflow diagram shows trigger kind badge", async ({ page }) => {
    await page.goto("/workflows?playbook=pb-intro-tracker");
    await expect(page.getByTestId("workflow-process-flow")).toBeVisible();
    const kindBadge = page.getByTestId("workflow-trigger-kind-badge");
    await expect(kindBadge).toBeVisible();
    await expect(kindBadge).toHaveAttribute("data-trigger-kind", "EVENT");
    await expect(kindBadge).toHaveText("EVENT");
    await expect(page.getByTestId("workflow-outbound-safety-chip")).toBeVisible();
    await page.getByTestId("workflow-outbound-safety-chip").click();
    await expect(page.getByTestId("workflow-duplicate-prevention-modal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Duplicate workflow prevention" })).toBeVisible();
    await page.getByTestId("workflow-dup-modal-close").click();
  });

  test("Workflow drawer: add-step placeholder, persist trigger override, reset restores default", async ({
    page,
  }) => {
    await page.goto("/workflows");
    await page.evaluate(() => localStorage.removeItem("tomo-workflow-definition-overrides-v2"));
    await page.goto("/workflows?playbook=pb-intro-tracker");

    await expect(page.getByTestId("workflow-detail-drawer")).toBeVisible();
    await expect(page.getByTestId("workflow-process-flow")).toBeVisible();

    await page.getByTestId("workflow-flow-add-step").click();
    await expect(page.getByTestId("workflow-add-step-placeholder")).toBeVisible();
    await page.getByTestId("workflow-add-step-placeholder").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("workflow-add-step-placeholder")).toHaveCount(0);

    const marker = `E2E_TRIGGER_${Date.now()}`;
    await page.getByTestId("workflow-flow-trigger").click();
    await expect(page.getByTestId("workflow-step-config-panel")).toBeVisible();
    await page.getByTestId("workflow-step-config-panel").locator("textarea").first().fill(marker);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("workflow-flow-trigger")).toContainText(marker);

    await page.reload();
    await expect(page.getByTestId("workflow-detail-drawer")).toBeVisible();
    await expect(page.getByTestId("workflow-flow-trigger")).toContainText(marker);

    await page.getByTestId("workflow-drawer-reset").click();
    await expect(page.getByTestId("workflow-flow-trigger")).toContainText("CC'd introduction email detected");
    await expect(page.getByTestId("workflow-flow-trigger")).not.toContainText(marker);
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
