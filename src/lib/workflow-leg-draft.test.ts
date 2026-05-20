import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAdvanceLegStep,
  initialWorkflowLegDraft,
  workflowLegDraftToStored,
} from "./workflow-leg-draft";

describe("workflow-leg-draft", () => {
  it("workflowLegDraftToStored returns null when incomplete", () => {
    assert.equal(workflowLegDraftToStored(initialWorkflowLegDraft()), null);
  });

  it("workflowLegDraftToStored persists complete send_email leg", () => {
    const draft = {
      ...initialWorkflowLegDraft(),
      actionDescription: "Follow-up nudge",
      actionPromptConfirmed: true,
      tomoInstruction: "Short nudge",
      actionSpec: { kind: "send_email" as const, subject: "Re: Hi", body: "Just checking in." },
      baseSubject: "Re: Hi",
      baseBody: "Just checking in.",
      lpDrafts: [
        {
          id: "lp-1",
          lpName: "Alex",
          firmName: "Fund",
          roleLabel: "Partner",
          tierLabel: "T1",
          email: "a@test.com",
          subject: "Re: Hi",
          body: "Just checking in.",
          status: "ready" as const,
          personalised: false,
        },
      ],
    };
    assert.ok(canAdvanceLegStep("draft", draft));
    const stored = workflowLegDraftToStored(draft);
    assert.ok(stored);
    assert.equal(stored?.triggerSpec?.kind, "wait");
    assert.equal(stored?.actionSpec?.kind, "send_email");
    assert.ok(stored?.actionBuild?.lpDrafts.every((d) => !d.personalised));
  });
});
