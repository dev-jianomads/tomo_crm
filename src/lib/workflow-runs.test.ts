import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attributeInboundReply,
  buildCohortLaunch,
  isActiveWorkflowRunStatus,
} from "./workflow-runs";
import type { WorkflowRunRecord, WorkflowStepRunRecord, WorkflowTaggedInteraction } from "./workflow-runs";

describe("workflow-runs", () => {
  it("skips LPs with an active run for the same workflow", () => {
    const existing: WorkflowRunRecord[] = [
      {
        id: "run-1",
        cohortLaunchId: "cohort-1",
        workspaceId: "ws-1",
        workflowId: "wf-f7",
        lpContactId: "lp-a",
        listId: "list-1",
        listName: "Fat Middle",
        status: "running",
        startedAt: "2026-05-01T10:00:00.000Z",
        launchParameters: {},
      },
    ];

    const { runs, skippedLpContactIds } = buildCohortLaunch(
      {
        workspaceId: "ws-1",
        workflowId: "wf-f7",
        listId: "list-1",
        listName: "Fat Middle",
        lpContactIds: ["lp-a", "lp-b"],
        initialWorkflowStepId: "step-1",
      },
      existing
    );

    assert.deepEqual(skippedLpContactIds, ["lp-a"]);
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.lpContactId, "lp-b");
    assert.ok(runs[0]?.cohortLaunchId);
    assert.notEqual(runs[0]?.id, "run-1");
  });

  it("attributes inbound reply via thread after sent_at", () => {
    const runs: WorkflowRunRecord[] = [
      {
        id: "run-b",
        cohortLaunchId: "cohort-2",
        workspaceId: "ws-1",
        workflowId: "wf-themed",
        lpContactId: "lp-b",
        listId: "list-1",
        listName: "Quiet",
        status: "running",
        startedAt: "2026-05-10T09:00:00.000Z",
        launchParameters: {},
      },
    ];

    const stepRuns: WorkflowStepRunRecord[] = [
      {
        id: "step-run-1",
        workflowRunId: "run-b",
        workflowStepId: "themed-send",
        status: "sent",
        outputJsonb: {
          sentAt: "2026-05-10T10:00:00.000Z",
          lpEmailThreadId: "thread-99",
          providerInternetMessageId: "<out@tomo.test>",
        },
      },
    ];

    const outbound: WorkflowTaggedInteraction = {
      id: "int-out",
      lpContactId: "lp-b",
      lpEmailThreadId: "thread-99",
      direction: "outbound",
      interactedAt: "2026-05-10T10:00:00.000Z",
      providerInternetMessageId: "<out@tomo.test>",
      workflowRunId: "run-b",
      workflowStepRunId: "step-run-1",
    };

    const inbound: WorkflowTaggedInteraction = {
      id: "int-in",
      lpContactId: "lp-b",
      lpEmailThreadId: "thread-99",
      direction: "inbound",
      interactedAt: "2026-05-10T11:00:00.000Z",
      providerInternetMessageId: "<in@tomo.test>",
      inReplyToMessageId: "<out@tomo.test>",
      workflowRunId: null,
      workflowStepRunId: null,
    };

    const result = attributeInboundReply(
      inbound,
      runs,
      stepRuns,
      new Map([[outbound.id, outbound]])
    );

    assert.equal(result.attributed, true);
    assert.equal(result.workflowRunId, "run-b");
    assert.equal(result.workflowStepRunId, "step-run-1");
    assert.equal(result.cohortLaunchId, "cohort-2");
  });

  it("does not attribute OOO inbound", () => {
    const result = attributeInboundReply(
      {
        id: "int-ooo",
        lpContactId: "lp-b",
        lpEmailThreadId: "thread-99",
        direction: "inbound",
        interactedAt: "2026-05-10T11:00:00.000Z",
        providerInternetMessageId: "<ooo@tomo.test>",
        workflowRunId: null,
        workflowStepRunId: null,
        isOoo: true,
      },
      [],
      [],
      new Map()
    );
    assert.equal(result.attributed, false);
  });

  it("isActiveWorkflowRunStatus", () => {
    assert.equal(isActiveWorkflowRunStatus("running"), true);
    assert.equal(isActiveWorkflowRunStatus("completed"), false);
  });
});
