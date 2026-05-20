import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKFLOW_FOLLOW_UP_V15,
  defaultFollowUpTriggerSpec,
  formatFollowUpTriggerLabel,
  isFollowUpActionAllowed,
  isFollowUpTriggerAllowed,
  isWorkflowLegComplete,
  validateStoredFollowUp,
  workflowCustomStepIds,
} from "./workflow-follow-up-design";
import type { WorkflowLeg } from "./workflow-follow-up-design";

describe("workflow-follow-up-design (Phase 0)", () => {
  it("locks v1.5 scope constants", () => {
    assert.equal(WORKFLOW_FOLLOW_UP_V15.maxFollowUpLegs, 1);
    assert.equal(WORKFLOW_FOLLOW_UP_V15.followUpPersonalisePerLp, false);
    assert.deepEqual(WORKFLOW_FOLLOW_UP_V15.allowedFollowUpActionKinds, ["send_email"]);
  });

  it("workflowCustomStepIds", () => {
    assert.deepEqual(workflowCustomStepIds("pb-custom-abc"), {
      trigger: "pb-custom-abc-trigger",
      primary: "pb-custom-abc-primary",
      wait: "pb-custom-abc-wait",
      followUp: "pb-custom-abc-follow-up",
    });
  });

  it("accepts wait + no_reply and on_inbound_reply triggers", () => {
    assert.equal(
      isFollowUpTriggerAllowed({ kind: "wait", days: 7, condition: "no_reply" }),
      true
    );
    assert.equal(
      isFollowUpTriggerAllowed({ kind: "on_inbound_reply", condition: "any_reply" }),
      true
    );
    assert.equal(isFollowUpTriggerAllowed({ kind: "wait", days: 0, condition: "no_reply" }), false);
  });

  it("formatFollowUpTriggerLabel", () => {
    assert.equal(
      formatFollowUpTriggerLabel(defaultFollowUpTriggerSpec()),
      "Wait 7 days — no reply"
    );
    assert.equal(
      formatFollowUpTriggerLabel({ kind: "on_inbound_reply", condition: "any_reply" }),
      "When LP replies to primary email"
    );
  });

  it("isFollowUpActionAllowed — send_email only", () => {
    assert.equal(
      isFollowUpActionAllowed({
        kind: "send_email",
        subject: "Re:",
        body: "Following up",
      }),
      true
    );
    assert.equal(
      isFollowUpActionAllowed({
        kind: "schedule_meeting",
        title: "Meet",
        datetime: "2026-06-01T10:00:00Z",
      }),
      false
    );
  });

  it("validateStoredFollowUp — empty follow-up ok", () => {
    assert.deepEqual(validateStoredFollowUp(undefined), { ok: true });
  });

  it("validateStoredFollowUp — rejects incomplete leg", () => {
    const incomplete: WorkflowLeg = {
      trigger: "Wait 7 days",
      triggerSpec: defaultFollowUpTriggerSpec(),
      action: "",
    };
    const result = validateStoredFollowUp(incomplete);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.includes("incomplete")));
    }
  });
});
