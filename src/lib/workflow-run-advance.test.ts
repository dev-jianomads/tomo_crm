import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  advanceWorkflowRunOnReply,
  advanceWorkflowRunOnWaitElapsed,
} from "./workflow-run-advance";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "./workflow-runs";

const runId = "run-1";
const primaryStepId = "wf-custom-primary";
const followUpStepId = "wf-custom-follow-up";

function baseRun(): WorkflowRunRecord {
  return {
    id: runId,
    cohortLaunchId: "cohort-1",
    workspaceId: "ws-1",
    workflowId: "wf-custom",
    lpContactId: "lp-a",
    listId: "list-1",
    listName: "List",
    status: "running",
    startedAt: "2026-05-01T10:00:00.000Z",
    launchParameters: {
      primary_step_id: primaryStepId,
      follow_up_step_id: followUpStepId,
      follow_up_trigger_kind: "wait",
      follow_up_wait_days: "7",
    },
  };
}

function primarySent(sentAt: string): WorkflowStepRunRecord {
  return {
    id: "sr-primary",
    workflowRunId: runId,
    workflowStepId: primaryStepId,
    status: "sent",
    outputJsonb: { sentAt, lpEmailThreadId: "thread-1" },
  };
}

function followUpPending(triggerKind: "wait" | "on_inbound_reply", waitDays = 7): WorkflowStepRunRecord {
  return {
    id: "sr-follow-up",
    workflowRunId: runId,
    workflowStepId: followUpStepId,
    status: "pending",
    outputJsonb: {
      deferredLeg: "follow_up",
      followUpTriggerKind: triggerKind,
      ...(triggerKind === "wait" ? { followUpWaitDays: waitDays } : {}),
    },
  };
}

describe("workflow-run-advance (Phase 4)", () => {
  it("wait trigger: reply on primary skips follow-up", () => {
    const primary = primarySent("2026-05-10T10:00:00.000Z");
    const followUp = followUpPending("wait");
    const replied = { ...primary, status: "replied" as const, outputJsonb: { ...primary.outputJsonb, repliedAt: "2026-05-11T10:00:00.000Z" } };

    const result = advanceWorkflowRunOnReply([primary, followUp], replied, baseRun().launchParameters);
    assert.equal(result.changed, true);
    const fu = result.stepRuns.find((sr) => sr.id === "sr-follow-up");
    assert.equal(fu?.status, "skipped");
    assert.equal(fu?.outputJsonb.skippedReason, "lp_replied_before_wait");
  });

  it("on_inbound_reply: reply on primary activates follow-up", () => {
    const primary = primarySent("2026-05-10T10:00:00.000Z");
    const followUp = followUpPending("on_inbound_reply");
    const replied = { ...primary, status: "replied" as const };

    const result = advanceWorkflowRunOnReply([primary, followUp], replied, {
      follow_up_trigger_kind: "on_inbound_reply",
    });
    assert.equal(result.changed, true);
    const fu = result.stepRuns.find((sr) => sr.id === "sr-follow-up");
    assert.equal(fu?.status, "in_progress");
    assert.ok(fu?.outputJsonb.activatedAt);
  });

  it("wait elapsed with no reply activates follow-up", () => {
    const sentAt = "2026-05-01T10:00:00.000Z";
    const primary = primarySent(sentAt);
    const followUp = followUpPending("wait", 7);
    const now = new Date("2026-05-10T12:00:00.000Z");

    const result = advanceWorkflowRunOnWaitElapsed([primary, followUp], baseRun(), now);
    assert.equal(result.changed, true);
    const fu = result.stepRuns.find((sr) => sr.id === "sr-follow-up");
    assert.equal(fu?.status, "in_progress");
    assert.equal(result.events[0], "follow_up_activated_wait_elapsed");
  });

  it("wait not elapsed leaves follow-up pending", () => {
    const primary = primarySent("2026-05-10T10:00:00.000Z");
    const followUp = followUpPending("wait", 7);
    const now = new Date("2026-05-12T10:00:00.000Z");

    const result = advanceWorkflowRunOnWaitElapsed([primary, followUp], baseRun(), now);
    assert.equal(result.changed, false);
    assert.equal(result.stepRuns.find((sr) => sr.id === "sr-follow-up")?.status, "pending");
  });
});
