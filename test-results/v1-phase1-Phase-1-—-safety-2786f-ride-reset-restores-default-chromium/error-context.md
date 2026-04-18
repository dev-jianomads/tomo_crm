# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v1-phase1.spec.ts >> Phase 1 — safety + demo-critical >> Workflow drawer: add-step placeholder, persist trigger override, reset restores default
- Location: tests/v1-phase1.spec.ts:65:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('workflow-detail-drawer')
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 7000ms
  - waiting for getByTestId('workflow-detail-drawer')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - banner [ref=e13]:
      - generic [ref=e15]: Tomo
      - generic [ref=e17]: JD
    - generic [ref=e18]:
      - complementary [ref=e19]:
        - generic [ref=e20]:
          - link "Today" [ref=e21] [cursor=pointer]:
            - /url: /home
            - img [ref=e23]
          - link "Relationships" [ref=e25] [cursor=pointer]:
            - /url: /relationships
            - img [ref=e27]
          - link "Lists" [ref=e29] [cursor=pointer]:
            - /url: /pipeline
            - img [ref=e31]
          - link "Workflows" [ref=e33] [cursor=pointer]:
            - /url: /workflows
            - img [ref=e35]
        - generic [ref=e37]:
          - link "Activity" [ref=e38] [cursor=pointer]:
            - /url: /activity
            - img [ref=e40]
          - link "Settings" [ref=e42] [cursor=pointer]:
            - /url: /settings
            - img [ref=e44]
      - main [ref=e47]:
        - generic [ref=e50]:
          - paragraph [ref=e53]: Workflows
          - generic [ref=e54]:
            - generic [ref=e55]:
              - paragraph [ref=e56]: Lists
              - generic [ref=e57]:
                - button "Q1 Target List 33 relationships" [ref=e58]:
                  - paragraph [ref=e59]: Q1 Target List
                  - paragraph [ref=e60]: 33 relationships
                - button "Active Diligence Focus 29 relationships" [ref=e61]:
                  - paragraph [ref=e62]: Active Diligence Focus
                  - paragraph [ref=e63]: 29 relationships
                - button "Family Office Outreach 23 relationships" [ref=e64]:
                  - paragraph [ref=e65]: Family Office Outreach
                  - paragraph [ref=e66]: 23 relationships
            - generic [ref=e67]:
              - generic [ref=e68]:
                - paragraph [ref=e69]: Tomo Default
                - paragraph [ref=e70]: Global automations — not tied to a list
                - generic [ref=e71]:
                  - generic [ref=e72]:
                    - button "Website & News → Relationship Updates" [ref=e73]:
                      - paragraph [ref=e74]: Website & News → Relationship Updates
                    - 'switch "Website & News → Relationship Updates: on" [checked] [ref=e76]'
                  - generic [ref=e78]:
                    - button "Email Scheduling Assistant" [ref=e79]:
                      - paragraph [ref=e80]: Email Scheduling Assistant
                    - 'switch "Email Scheduling Assistant: on" [checked] [ref=e82]'
                  - generic [ref=e84]:
                    - button "Meeting → Follow-Up" [ref=e85]:
                      - paragraph [ref=e86]: Meeting → Follow-Up
                    - 'switch "Meeting → Follow-Up: on" [checked] [ref=e88]'
              - generic [ref=e92]:
                - paragraph [ref=e93]: Select a list
                - paragraph [ref=e94]: Choose a fund list on the left to see and attach workflows.
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { applyQaSession } from "./fixtures/qa-session";
  3   | 
  4   | test.beforeEach(async ({ page }) => {
  5   |   await applyQaSession(page);
  6   | });
  7   | 
  8   | test.describe("Phase 1 — safety + demo-critical", () => {
  9   |   test("Primary nav uses Lists label (not Pipeline)", async ({ page }) => {
  10  |     await page.goto("/home");
  11  |     const listsNav = page.getByTestId("nav-rail-link-pipeline");
  12  |     await expect(listsNav).toBeVisible();
  13  |     await expect(listsNav).toHaveAttribute("href", "/pipeline");
  14  |     await expect(listsNav).toHaveAttribute("aria-label", "Lists");
  15  |     await expect(page.getByRole("link", { name: "Pipeline" })).toHaveCount(0);
  16  |   });
  17  | 
  18  |   test("Lists page is browse-only: title-only header, no create/filter strip (L2)", async ({ page }) => {
  19  |     await page.goto("/pipeline");
  20  | 
  21  |     await expect(page.getByTestId("page-header-title-lists")).toHaveText("Lists");
  22  |     const header = page.getByTestId("page-list-header");
  23  |     await expect(header).not.toContainText("Refine the CRM with natural-language filters");
  24  |     await expect(page.getByRole("link", { name: /View workflows/ })).toHaveCount(0);
  25  |     await expect(page.getByRole("link", { name: /LP Network/ })).toHaveCount(0);
  26  |     await expect(page.getByTestId("lists-quick-filters")).toHaveCount(0);
  27  |     await expect(page.getByPlaceholder("Name your list here")).toHaveCount(0);
  28  |   });
  29  | 
  30  |   test("Lists drawer: funnel, companies by stage, workflows, CTAs; no tile Use in workflow (L3)", async ({
  31  |     page,
  32  |   }) => {
  33  |     await page.goto("/pipeline");
  34  |     await page.getByRole("button", { name: /Q1 Target List/i }).first().click();
  35  | 
  36  |     await expect(page.getByText("Funnel by stage")).toBeVisible();
  37  |     await expect(page.getByText("Companies by stage")).toBeVisible();
  38  |     await expect(page.getByTestId("list-drawer-workflows")).toBeVisible();
  39  |     await expect(page.getByTestId("list-drawer-actions")).toBeVisible();
  40  |     await expect(page.getByRole("button", { name: "Amend list" })).toBeVisible();
  41  |     await expect(page.getByRole("button", { name: "Create workflow" })).toBeVisible();
  42  |     await expect(page.getByText("Use in workflow")).toHaveCount(0);
  43  | 
  44  |     await page.getByRole("button", { name: "Amend list" }).click();
  45  |     await expect(page.getByTestId("amend-list-modal")).toBeVisible();
  46  |     await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  47  |     await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  48  |     await expect(page.getByLabel("Add to list")).toBeVisible();
  49  |   });
  50  | 
  51  |   test("Workflow diagram shows trigger kind badge", async ({ page }) => {
  52  |     await page.goto("/workflows?playbook=pb-intro-tracker");
  53  |     await expect(page.getByTestId("workflow-process-flow")).toBeVisible();
  54  |     const kindBadge = page.getByTestId("workflow-trigger-kind-badge");
  55  |     await expect(kindBadge).toBeVisible();
  56  |     await expect(kindBadge).toHaveAttribute("data-trigger-kind", "EVENT");
  57  |     await expect(kindBadge).toHaveText("EVENT");
  58  |     await expect(page.getByTestId("workflow-outbound-safety-chip")).toBeVisible();
  59  |     await page.getByTestId("workflow-outbound-safety-chip").click();
  60  |     await expect(page.getByTestId("workflow-duplicate-prevention-modal")).toBeVisible();
  61  |     await expect(page.getByRole("heading", { name: "Duplicate workflow prevention" })).toBeVisible();
  62  |     await page.getByTestId("workflow-dup-modal-close").click();
  63  |   });
  64  | 
  65  |   test("Workflow drawer: add-step placeholder, persist trigger override, reset restores default", async ({
  66  |     page,
  67  |   }) => {
  68  |     await page.goto("/workflows");
  69  |     await page.evaluate(() => localStorage.removeItem("tomo-workflow-definition-overrides-v2"));
  70  |     await page.goto("/workflows?playbook=pb-intro-tracker");
  71  | 
  72  |     await expect(page.getByTestId("workflow-detail-drawer")).toBeVisible();
  73  |     await expect(page.getByTestId("workflow-process-flow")).toBeVisible();
  74  | 
  75  |     await page.getByTestId("workflow-flow-add-step").click();
  76  |     await expect(page.getByTestId("workflow-add-step-placeholder")).toBeVisible();
  77  |     await page.getByTestId("workflow-add-step-placeholder").getByRole("button", { name: "Close" }).click();
  78  |     await expect(page.getByTestId("workflow-add-step-placeholder")).toHaveCount(0);
  79  | 
  80  |     const marker = `E2E_TRIGGER_${Date.now()}`;
  81  |     await page.getByTestId("workflow-flow-trigger").click();
  82  |     await expect(page.getByTestId("workflow-step-config-panel")).toBeVisible();
  83  |     await page.getByTestId("workflow-step-config-panel").locator("textarea").first().fill(marker);
  84  |     await page.getByRole("button", { name: "Save as default" }).click();
  85  |     await expect(page.getByTestId("workflow-flow-trigger")).toContainText(marker);
  86  | 
  87  |     await page.reload();
> 88  |     await expect(page.getByTestId("workflow-detail-drawer")).toBeVisible();
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  89  |     await expect(page.getByTestId("workflow-flow-trigger")).toContainText(marker);
  90  | 
  91  |     await page.getByTestId("workflow-drawer-reset").click();
  92  |     await expect(page.getByTestId("workflow-flow-trigger")).toContainText("CC'd introduction email detected");
  93  |     await expect(page.getByTestId("workflow-flow-trigger")).not.toContainText(marker);
  94  |   });
  95  | 
  96  |   test("Today commitment row shows Open calendar link", async ({ page }) => {
  97  |     await page.goto("/home");
  98  |     const links = page.getByTestId("today-commitment-open-calendar");
  99  |     await expect(links.first()).toBeVisible();
  100 |     await expect(links.first()).toHaveText("Open calendar");
  101 |   });
  102 | 
  103 |   test("Today action drawer shows primary CTAs and amend flow (no execution strip)", async ({ page }) => {
  104 |     await page.goto("/home");
  105 |     await page.getByTestId("today-action-row-a1").click();
  106 |     await expect(page.getByRole("button", { name: /Approve & send/i })).toBeVisible();
  107 |     await expect(page.getByRole("button", { name: /^Amend$/ })).toBeVisible();
  108 |     await expect(page.getByRole("button", { name: /Find another time/i })).toBeVisible();
  109 |     await expect(page.getByRole("button", { name: /Do later/i })).toBeVisible();
  110 |     await expect(page.getByTestId("drawer-tomo-chat")).toHaveCount(0);
  111 |     await page.getByRole("button", { name: /^Amend$/ }).click();
  112 |     await expect(page.getByTestId("action-amend-chat")).toBeVisible();
  113 |     await expect(page.getByRole("button", { name: /^Back$/ })).toBeVisible();
  114 |   });
  115 | 
  116 |   test("Today commitment drawer shows primary CTAs and amend flow (no chat strip until amend)", async ({ page }) => {
  117 |     await page.goto("/home");
  118 |     await page.getByTestId("today-commitment-row-c1").click();
  119 |     await expect(page.getByRole("button", { name: /Approve and Send/i })).toBeVisible();
  120 |     await expect(page.getByRole("button", { name: /^Amend$/ })).toBeVisible();
  121 |     await expect(page.getByRole("button", { name: /Attach Document/i })).toBeVisible();
  122 |     await expect(page.getByRole("button", { name: /^Close$/ })).toBeVisible();
  123 |     await expect(page.getByTestId("drawer-tomo-chat")).toHaveCount(0);
  124 |     await page.getByRole("button", { name: /^Amend$/ }).click();
  125 |     await expect(page.getByTestId("commitment-amend-chat")).toBeVisible();
  126 |     await expect(page.getByRole("button", { name: /^Back$/ })).toBeVisible();
  127 |   });
  128 | });
  129 | 
```