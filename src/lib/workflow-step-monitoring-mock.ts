/**
 * Read-only step monitoring payloads for the workflow step monitor drawer.
 */

import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

export type WorkflowStepLpRow = {
  id: string;
  lpName: string;
  firmName: string;
  emailStatus: "draft" | "approved" | "sent" | "replied" | "skipped" | "waiting";
  sentAtLabel?: string;
  repliedAtLabel?: string;
};

export type WorkflowStepMonitoring = {
  stepId: string;
  status: "idle" | "running" | "complete";
  metrics: {
    drafted: number;
    approved: number;
    sent: number;
    waiting: number;
    replied: number;
    skipped: number;
  };
  /** Resolved trigger / run parameters (read-only). */
  parameters?: Array<{ label: string; value: string }>;
  lpRows?: WorkflowStepLpRow[];
  footnote?: string;
};

function demoLpRows(prefix: string): WorkflowStepLpRow[] {
  return [
    { id: `${prefix}-1`, lpName: "Charly Malek", firmName: "UBS HFS", emailStatus: "sent", sentAtLabel: "today 9:12am", repliedAtLabel: "today 11:04am" },
    { id: `${prefix}-2`, lpName: "Marie-Claude Dumas", firmName: "Wellcome Trust", emailStatus: "sent", sentAtLabel: "today 9:12am" },
    { id: `${prefix}-3`, lpName: "James McIntyre", firmName: "Future Fund", emailStatus: "waiting" },
    { id: `${prefix}-4`, lpName: "Edoardo Lanzavecchia", firmName: "Lingotto", emailStatus: "approved" },
  ];
}

/** Mock monitoring for a clicked process-flow step. */
export function getWorkflowStepMonitoring(
  entry: WorkflowSurfaceEntry,
  step: WorkflowStepNode
): WorkflowStepMonitoring {
  if (step.nodeType === "trigger") {
    return {
      stepId: step.id,
      status: "complete",
      metrics: { drafted: 0, approved: 0, sent: 0, waiting: 0, replied: 0, skipped: 0 },
      parameters: [
        { label: "Trigger", value: entry.triggerLabel },
        ...(entry.runConfig?.fields.map((f) => ({ label: f.label, value: f.value })) ?? []),
      ],
      footnote: "Enrollment is read-only while this workflow is active.",
    };
  }

  if (step.actionType === "draft_batch" || step.actionType === "single_draft") {
    return {
      stepId: step.id,
      status: "running",
      metrics: { drafted: 4, approved: 2, sent: 2, waiting: 1, replied: 1, skipped: 0 },
      lpRows: demoLpRows(step.id),
      footnote: "Pending approvals open in Action Drawer — this panel is monitor-only.",
    };
  }

  if (step.nodeType === "wait") {
    return {
      stepId: step.id,
      status: "running",
      metrics: { drafted: 0, approved: 0, sent: 6, waiting: 4, replied: 2, skipped: 0 },
      parameters: [{ label: "Wait window", value: step.timingLabel ?? "—" }],
    };
  }

  if (step.nodeType === "outcome" || step.actionType === "outcome_capture") {
    return {
      stepId: step.id,
      status: "running",
      metrics: { drafted: 0, approved: 0, sent: 8, waiting: 0, replied: 3, skipped: 1 },
      parameters: [
        { label: "Warmer than expected", value: "3" },
        { label: "Maintaining", value: "4" },
        { label: "Dormant", value: "1" },
        { label: "Pending capture", value: "1" },
      ],
    };
  }

  return {
    stepId: step.id,
    status: "idle",
    metrics: { drafted: 0, approved: 0, sent: 0, waiting: 0, replied: 0, skipped: 0 },
    footnote: "No monitoring data for this step yet.",
  };
}
