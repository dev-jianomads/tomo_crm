import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  launchStepPlanFromCustomStored,
  resolveLaunchInputFromEntry,
  resolvePrimaryWorkflowStepId,
  stepPlanToLaunchParameters,
} from "./workflow-launch-plan";
import { customPlaybookSurfaceSteps } from "./custom-playbook-surface";
import type { CustomPlaybookStored } from "./custom-playbook-schema";
import { customPlaybookToSurfaceEntry } from "./custom-playbook-surface";

const baseCustom: CustomPlaybookStored = {
  id: "pb-custom-x",
  name: "Outreach",
  trigger: "Manual",
  action: "Email: Hi",
  actionSpec: { kind: "send_email", subject: "Hi", body: "Body" },
  actionBuild: {
    actionName: "Outreach",
    contextText: "",
    attachments: [],
    tomoInstruction: "Draft",
    actionDescription: "Primary outreach",
    baseSubject: "Hi",
    baseBody: "Body",
    lpDrafts: [],
  },
  createdAt: "2026-05-20T00:00:00.000Z",
};

describe("workflow-launch-plan (Phase 3)", () => {
  it("resolvePrimaryWorkflowStepId prefers -primary suffix", () => {
    const entry = customPlaybookToSurfaceEntry(baseCustom);
    assert.equal(resolvePrimaryWorkflowStepId(entry), "pb-custom-x-primary");
  });

  it("launchStepPlanFromCustomStored includes follow-up metadata", () => {
    const plan = launchStepPlanFromCustomStored({
      ...baseCustom,
      followUp: {
        trigger: "Wait 5 days — no reply",
        triggerSpec: { kind: "wait", days: 5, condition: "no_reply" },
        action: "Email: Re:",
        actionSpec: { kind: "send_email", subject: "Re:", body: "Nudge" },
        actionBuild: {
          ...baseCustom.actionBuild!,
          actionDescription: "Nudge",
          baseSubject: "Re:",
          baseBody: "Nudge",
          lpDrafts: [
            {
              id: "lp-1",
              lpName: "Alex",
              firmName: "Fund",
              roleLabel: "Partner",
              tierLabel: "T1",
              email: "a@test.com",
              subject: "Re:",
              body: "Nudge",
              status: "ready",
              personalised: false,
            },
          ],
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    });
    assert.equal(plan.primaryStepId, "pb-custom-x-primary");
    assert.equal(plan.followUpStepId, "pb-custom-x-follow-up");
    assert.equal(plan.followUpTriggerKind, "wait");
    assert.equal(plan.followUpWaitDays, 5);
  });

  it("resolveLaunchInputFromEntry for custom stored", () => {
    const entry = customPlaybookToSurfaceEntry(baseCustom);
    const resolved = resolveLaunchInputFromEntry(entry, baseCustom);
    assert.ok(resolved);
    assert.equal(resolved?.initialWorkflowStepId, "pb-custom-x-primary");
    const params = stepPlanToLaunchParameters(resolved!.stepPlan);
    assert.equal(params.primary_step_id, "pb-custom-x-primary");
  });

  it("surface steps align with launch plan ids", () => {
    const c = {
      ...baseCustom,
      followUp: {
        trigger: "Wait 7 days — no reply",
        triggerSpec: { kind: "wait" as const, days: 7, condition: "no_reply" as const },
        action: "Email: Re:",
        actionSpec: { kind: "send_email" as const, subject: "Re:", body: "N" },
        actionBuild: {
          ...baseCustom.actionBuild!,
          baseSubject: "Re:",
          baseBody: "N",
          lpDrafts: [
            {
              id: "lp-1",
              lpName: "Alex",
              firmName: "Fund",
              roleLabel: "Partner",
              tierLabel: "T1",
              email: "a@test.com",
              subject: "Re:",
              body: "N",
              status: "ready",
              personalised: false,
            },
          ],
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    };
    const steps = customPlaybookSurfaceSteps(c);
    const plan = launchStepPlanFromCustomStored(c);
    assert.equal(steps.find((s) => s.id === plan.primaryStepId)?.nodeType, "action");
    assert.equal(steps.find((s) => s.id === plan.followUpStepId)?.nodeType, "action");
  });
});
