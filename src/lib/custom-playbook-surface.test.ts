import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  customPlaybookSurfaceSteps,
  customPlaybookToSurfaceEntry,
  customWorkflowCardSummary,
  followUpWaitTimingLabel,
  hasValidStoredFollowUp,
} from "./custom-playbook-surface";
import type { CustomPlaybookStored } from "./custom-playbook-schema";
import { workflowDefinitionFromCustomStored } from "./customPlaybooks";

const baseCustom: CustomPlaybookStored = {
  id: "pb-custom-test",
  name: "Test outreach",
  trigger: "Manual launch on list",
  action: "Email: Hello",
  actionSpec: { kind: "send_email", subject: "Hello", body: "Body" },
  actionBuild: {
    actionName: "Themed batch",
    contextText: "",
    attachments: [],
    tomoInstruction: "Draft outreach",
    actionDescription: "Themed insight outreach",
    baseSubject: "Hello",
    baseBody: "Body",
    lpDrafts: [
      {
        id: "lp-1",
        lpName: "Alex",
        firmName: "Fund",
        roleLabel: "Partner",
        tierLabel: "T1",
        email: "a@test.com",
        subject: "Hello",
        body: "Body",
        status: "ready",
        personalised: false,
      },
    ],
  },
  createdAt: "2026-05-20T00:00:00.000Z",
};

describe("custom-playbook-surface (Phase 2)", () => {
  it("primary-only: two nodes", () => {
    const steps = customPlaybookSurfaceSteps(baseCustom);
    assert.equal(steps.length, 2);
    assert.equal(steps[0]?.id, "pb-custom-test-trigger");
    assert.equal(steps[1]?.id, "pb-custom-test-primary");
  });

  it("with wait follow-up: trigger, primary, wait, follow-up", () => {
    const c: CustomPlaybookStored = {
      ...baseCustom,
      followUp: {
        trigger: "Wait 7 days — no reply",
        triggerSpec: { kind: "wait", days: 7, condition: "no_reply" },
        action: "Email: Re: Hello",
        actionSpec: { kind: "send_email", subject: "Re: Hello", body: "Nudge" },
        actionBuild: {
          actionName: "Follow-up nudge",
          contextText: "",
          attachments: [],
          tomoInstruction: "Nudge",
          actionDescription: "Light follow-up",
          baseSubject: "Re: Hello",
          baseBody: "Nudge",
          lpDrafts: baseCustom.actionBuild!.lpDrafts,
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    };
    assert.equal(hasValidStoredFollowUp(c), true);
    const steps = customPlaybookSurfaceSteps(c);
    assert.equal(steps.length, 4);
    assert.equal(steps[2]?.nodeType, "wait");
    assert.equal(steps[2]?.timingLabel, "7d");
    assert.equal(steps[3]?.id, "pb-custom-test-follow-up");
    assert.equal(followUpWaitTimingLabel({ kind: "wait", days: 7, condition: "no_reply" }), "7d");
  });

  it("on_inbound_reply: no wait node", () => {
    const c: CustomPlaybookStored = {
      ...baseCustom,
      followUp: {
        trigger: "When LP replies",
        triggerSpec: { kind: "on_inbound_reply", condition: "any_reply" },
        action: "Email: Re:",
        actionSpec: { kind: "send_email", subject: "Re:", body: "Thanks" },
        actionBuild: {
          actionName: "Reply",
          contextText: "",
          attachments: [],
          tomoInstruction: "Reply",
          actionDescription: "Contextual reply",
          baseSubject: "Re:",
          baseBody: "Thanks",
          lpDrafts: baseCustom.actionBuild!.lpDrafts,
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    };
    const steps = customPlaybookSurfaceSteps(c);
    assert.equal(steps.length, 3);
    assert.equal(steps[2]?.timingLabel, "On reply");
  });

  it("surface entry reflects follow-up in summary and badge", () => {
    const entry = customPlaybookToSurfaceEntry({
      ...baseCustom,
      followUp: {
        trigger: "Wait 3 days — no reply",
        triggerSpec: { kind: "wait", days: 3, condition: "no_reply" },
        action: "Email: Re:",
        actionSpec: { kind: "send_email", subject: "Re:", body: "Hi" },
        actionBuild: {
          ...baseCustom.actionBuild!,
          actionDescription: "Nudge",
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    });
    assert.equal(entry.stateSummary.segments.length, 0);
    assert.ok(entry.summary.includes("Follow-up"));
    assert.equal(entry.badgeLabel, "Custom · follow-up");
    assert.equal(entry.stats.length, 0);
  });

  it("workflowDefinitionFromCustomStored includes wait + follow-up steps", () => {
    const def = workflowDefinitionFromCustomStored({
      ...baseCustom,
      followUp: {
        trigger: "Wait 7 days — no reply",
        triggerSpec: { kind: "wait", days: 7, condition: "no_reply" },
        action: "Email: Re:",
        actionSpec: { kind: "send_email", subject: "Re:", body: "Nudge" },
        actionBuild: {
          ...baseCustom.actionBuild!,
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    });
    assert.equal(def.steps.length, 3);
    assert.equal(def.steps[1]?.type, "wait");
    assert.equal(def.steps[2]?.type, "action");
  });
});
