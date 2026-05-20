import assert from "node:assert/strict";
import test from "node:test";
import { customPlaybookToSurfaceEntry } from "./custom-playbook-surface";
import type { CustomPlaybookStored } from "./custom-playbook-schema";
import { deriveWorkflowTelemetry, telemetryToHeaderStats } from "./workflow-telemetry";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "./workflow-runs";

const baseCustom: CustomPlaybookStored = {
  id: "wf-custom-test",
  name: "Test outreach",
  trigger: "Manual",
  action: "Email: Hello",
  actionSpec: { kind: "send_email", subject: "Hello", body: "Hi" },
  createdAt: "2026-05-01T00:00:00.000Z",
};

test("deriveWorkflowTelemetry — primary ready and follow-up queued", () => {
  const entry = customPlaybookToSurfaceEntry(
    {
      ...baseCustom,
      followUp: {
        trigger: "Wait 7 days",
        triggerSpec: { kind: "wait", days: 7, condition: "no_reply" },
        action: "Email: Re",
        actionSpec: { kind: "send_email", subject: "Re", body: "Follow up" },
        actionBuild: {
          actionName: "Follow-up",
          contextText: "",
          attachments: [],
          tomoInstruction: "Nudge",
          actionDescription: "Follow-up email",
          baseSubject: "Re",
          baseBody: "Follow up",
          lpDrafts: [],
          approvedAllAt: "2026-05-20T00:00:00.000Z",
        },
      },
    },
    true
  );

  const runs: WorkflowRunRecord[] = [
    {
      id: "run-1",
      cohortLaunchId: "cohort-1",
      workspaceId: "w",
      workflowId: entry.id,
      lpContactId: "lp-1",
      listId: "list-1",
      listName: "Q1",
      status: "running",
      startedAt: "2026-05-20T09:00:00.000Z",
      launchParameters: {
        primary_step_id: `${entry.id}-primary`,
        follow_up_step_id: `${entry.id}-follow-up`,
        follow_up_trigger_kind: "wait",
        follow_up_wait_days: "7",
      },
    },
  ];

  const stepRuns: WorkflowStepRunRecord[] = [
    {
      id: "sr-primary",
      workflowRunId: "run-1",
      workflowStepId: `${entry.id}-primary`,
      status: "pending",
      outputJsonb: {},
    },
    {
      id: "sr-follow",
      workflowRunId: "run-1",
      workflowStepId: `${entry.id}-follow-up`,
      status: "pending",
      outputJsonb: { deferredLeg: "follow_up" },
    },
  ];

  const runHistory = [
    {
      id: "cohort-1",
      listName: "Q1",
      startedAtLabel: "started 20 May",
      lpCount: 1,
      statusLabel: "1 running",
    },
  ];

  const t = deriveWorkflowTelemetry(entry, runs, stepRuns, runHistory);
  assert.ok(t);
  assert.equal(t.inFlight, 1);
  assert.equal(t.primaryReady, 1);
  assert.equal(t.sent, 0);
  assert.match(t.primaryLine, /ready in Action Drawer/);
  assert.match(t.followUpLine, /queued \(7d\)/);

  const stats = telemetryToHeaderStats(entry, t);
  assert.equal(stats[0]?.label, "Running now");
  assert.equal(stats[0]?.value, "1");
});
