import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { customPlaybookToSurfaceEntry } from "@/lib/custom-playbook-surface";
import type { CustomPlaybookStored } from "@/lib/custom-playbook-schema";
import { deriveWorkflowAttentionItems } from "./workflow-run-attention";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "./workflow-runs";

const playbook: CustomPlaybookStored = {
  id: "pb-phase6",
  name: "Phase 6 test",
  trigger: "New LP",
  action: "Outreach",
  actionSpec: { kind: "send_email", subject: "Hi", body: "Body" },
  actionBuild: {
    actionName: "Outreach",
    contextText: "",
    attachments: [],
    tomoInstruction: "Send",
    baseSubject: "Hi",
    baseBody: "Body",
    lpDrafts: [],
  },
  followUp: {
    trigger: "Wait 7 days",
    triggerSpec: { kind: "wait", days: 7, condition: "no_reply" },
    action: "Nudge",
    actionSpec: { kind: "send_email", subject: "Re: Hi", body: "Nudge" },
    actionBuild: {
      actionName: "Nudge",
      contextText: "",
      attachments: [],
      tomoInstruction: "Nudge",
      baseSubject: "Re: Hi",
      baseBody: "Nudge",
      lpDrafts: [],
    },
  },
  createdAt: new Date().toISOString(),
};

describe("deriveWorkflowAttentionItems", () => {
  it("returns follow-up ready attention when step runs are in_progress", () => {
    const entry = customPlaybookToSurfaceEntry(playbook, true);
    const runs: WorkflowRunRecord[] = [
      {
        id: "run-1",
        cohortLaunchId: "cohort-1",
        workspaceId: "ws",
        workflowId: playbook.id,
        lpContactId: "lp-1",
        listId: "list-1",
        listName: "Tier 1",
        status: "running",
        startedAt: new Date().toISOString(),
        launchParameters: {
          primary_step_id: `${playbook.id}-primary`,
          follow_up_step_id: `${playbook.id}-follow-up`,
        },
      },
    ];
    const stepRuns: WorkflowStepRunRecord[] = [
      {
        id: "sr-primary",
        workflowRunId: "run-1",
        workflowStepId: `${playbook.id}-primary`,
        status: "sent",
        outputJsonb: { sentAt: new Date().toISOString() },
      },
      {
        id: "sr-follow",
        workflowRunId: "run-1",
        workflowStepId: `${playbook.id}-follow-up`,
        status: "in_progress",
        outputJsonb: { deferredLeg: "follow_up", activatedAt: new Date().toISOString() },
      },
    ];

    const items = deriveWorkflowAttentionItems(entry, stepRuns, runs);
    assert.equal(items.length, 1);
    assert.match(items[0]!.label, /follow-up drafts ready/i);
    assert.equal(items[0]!.count, 1);
    assert.equal(items[0]!.stepId, `${playbook.id}-follow-up`);
  });

  it("returns empty when no follow-up step runs are ready", () => {
    const entry = customPlaybookToSurfaceEntry(playbook, true);
    const runs: WorkflowRunRecord[] = [
      {
        id: "run-1",
        cohortLaunchId: "cohort-1",
        workspaceId: "ws",
        workflowId: playbook.id,
        lpContactId: "lp-1",
        listId: "list-1",
        listName: "Tier 1",
        status: "running",
        startedAt: new Date().toISOString(),
        launchParameters: { follow_up_step_id: `${playbook.id}-follow-up` },
      },
    ];
    const stepRuns: WorkflowStepRunRecord[] = [
      {
        id: "sr-follow",
        workflowRunId: "run-1",
        workflowStepId: `${playbook.id}-follow-up`,
        status: "pending",
        outputJsonb: { deferredLeg: "follow_up" },
      },
    ];

    assert.deepEqual(deriveWorkflowAttentionItems(entry, stepRuns, runs), []);
  });
});
