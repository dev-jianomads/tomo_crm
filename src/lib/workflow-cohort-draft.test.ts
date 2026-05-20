import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkflowCohortDraftUserPrompt,
  formatPrimaryTemplateForPrompt,
  mockTomoGenerateFollowUpDraft,
} from "./workflow-cohort-draft";

describe("workflow-cohort-draft follow-up", () => {
  it("formatPrimaryTemplateForPrompt includes subject and body", () => {
    const block = formatPrimaryTemplateForPrompt({
      subject: "Q1 themes",
      body: "Hi {{lp_first_name}}, sharing themes.",
      trigger: "New LP on list",
      actionDescription: "Send themed outreach",
    });
    assert.match(block, /Primary outreach already sent/);
    assert.match(block, /Subject: Q1 themes/);
    assert.match(block, /sharing themes/);
    assert.match(block, /Primary trigger: New LP on list/);
  });

  it("buildWorkflowCohortDraftUserPrompt embeds primary template for follow_up", () => {
    const prompt = buildWorkflowCohortDraftUserPrompt({
      workflowName: "Themed — follow-up",
      listName: "Tier 1",
      instruction: "Short nudge referencing primary",
      contextText: "Keep tone warm",
      trigger: "Wait 7 days, no reply",
      draftKind: "follow_up",
      primaryTemplate: {
        subject: "Themes",
        body: "Primary body here",
      },
    });
    assert.match(prompt, /Draft kind: follow-up/);
    assert.match(prompt, /Follow-up trigger/);
    assert.match(prompt, /Primary outreach already sent/);
    assert.match(prompt, /Follow-up instruction/);
    assert.match(prompt, /Keep tone warm/);
  });

  it("mockTomoGenerateFollowUpDraft uses Re: subject from primary", () => {
    const draft = mockTomoGenerateFollowUpDraft({
      workflowName: "WF",
      listName: "List A",
      contextText: "",
      instruction: "Nudge gently",
      trigger: "Wait 7 days",
      primaryTemplate: { subject: "Quarterly update", body: "Hi there" },
    });
    assert.equal(draft.subject, "Re: Quarterly update");
    assert.match(draft.body, /\{\{lp_first_name\}\}/);
    assert.match(draft.actionDescription, /List A/);
  });
});
