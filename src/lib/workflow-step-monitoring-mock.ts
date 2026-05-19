/**
 * Read-only step monitoring payloads for the workflow step monitor drawer.
 */

import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

export type WorkflowStepLpRow = {
  id: string;
  lpName: string;
  firmName: string;
  emailStatus: "draft" | "sent" | "replied" | "skipped";
  sentAtLabel?: string;
  repliedAtLabel?: string;
};

export type WorkflowStepMetricKey = "drafted" | "sent" | "replied" | "skipped";

export type WorkflowStepMonitoring = {
  stepId: string;
  status: "idle" | "running" | "complete";
  metrics: Record<WorkflowStepMetricKey, number>;
  visibleMetrics?: WorkflowStepMetricKey[];
  showParameters?: boolean;
  showLpTable?: boolean;
  /** Resolved trigger / run parameters (read-only). */
  parameters?: Array<{ label: string; value: string }>;
  lpRows?: WorkflowStepLpRow[];
  footnote?: string;
};

function demoSendLpRows(prefix: string): WorkflowStepLpRow[] {
  return [
    {
      id: `${prefix}-1`,
      lpName: "Charly Malek",
      firmName: "UBS HFS",
      emailStatus: "sent",
      sentAtLabel: "today 9:12am",
      repliedAtLabel: "today 11:04am",
    },
    {
      id: `${prefix}-2`,
      lpName: "Marie-Claude Dumas",
      firmName: "Wellcome Trust",
      emailStatus: "sent",
      sentAtLabel: "today 9:12am",
    },
    {
      id: `${prefix}-3`,
      lpName: "James McIntyre",
      firmName: "Future Fund",
      emailStatus: "draft",
    },
    {
      id: `${prefix}-4`,
      lpName: "Edoardo Lanzavecchia",
      firmName: "Lingotto",
      emailStatus: "replied",
      sentAtLabel: "yesterday 4:30pm",
      repliedAtLabel: "today 8:15am",
    },
  ];
}

function isFollowUpStep(step: WorkflowStepNode): boolean {
  const haystack = `${step.id} ${step.title} ${step.description}`.toLowerCase();
  return haystack.includes("follow-up") || haystack.includes("follow up") || haystack.includes("non-responder");
}

/** Mock monitoring for a clicked process-flow step. */
export function getWorkflowStepMonitoring(
  entry: WorkflowSurfaceEntry,
  step: WorkflowStepNode
): WorkflowStepMonitoring {
  const emptyMetrics: Record<WorkflowStepMetricKey, number> = {
    drafted: 0,
    sent: 0,
    replied: 0,
    skipped: 0,
  };

  if (step.nodeType === "trigger") {
    return {
      stepId: step.id,
      status: "complete",
      metrics: emptyMetrics,
      showParameters: true,
      showLpTable: false,
      parameters: [
        { label: "Trigger", value: entry.triggerLabel },
        ...(entry.runConfig?.fields.map((f) => ({ label: f.label, value: f.value })) ?? []),
      ],
      footnote: "Enrollment is read-only while this workflow is active.",
    };
  }

  if (step.nodeType === "wait") {
    return {
      stepId: step.id,
      status: "running",
      metrics: emptyMetrics,
      showParameters: true,
      showLpTable: false,
      visibleMetrics: [],
      parameters: [{ label: "Wait window", value: step.timingLabel ?? "—" }],
    };
  }

  if (step.actionType === "draft_batch" || step.actionType === "single_draft") {
    if (isFollowUpStep(step)) {
      return {
        stepId: step.id,
        status: "running",
        metrics: { drafted: 4, sent: 2, replied: 0, skipped: 0 },
        visibleMetrics: ["drafted", "sent"],
        showParameters: true,
        showLpTable: false,
        parameters: [
          { label: "Draft template", value: "Generic follow-up nudge from workflow defaults" },
          { label: "Audience", value: "Non-responders from prior send step" },
          { label: "Timing", value: step.timingLabel ?? "Per workflow schedule" },
        ],
      };
    }

    return {
      stepId: step.id,
      status: "running",
      metrics: { drafted: 4, sent: 2, replied: 1, skipped: 0 },
      visibleMetrics: ["drafted", "sent", "replied", "skipped"],
      showParameters: false,
      showLpTable: true,
      lpRows: demoSendLpRows(step.id),
    };
  }

  if (step.nodeType === "outcome" || step.actionType === "outcome_capture") {
    return {
      stepId: step.id,
      status: "running",
      metrics: { drafted: 0, sent: 8, replied: 3, skipped: 1 },
      visibleMetrics: ["sent", "replied", "skipped"],
      showParameters: true,
      showLpTable: false,
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
    metrics: emptyMetrics,
    showParameters: false,
    showLpTable: false,
    footnote: "No monitoring data for this step yet.",
  };
}
