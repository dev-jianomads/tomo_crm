/**
 * Derive monitor-only attention items from workflow_step_runs (Phase 6).
 */

import { launchParametersToStepPlan, launchStepPlanFromSurfaceEntry } from "@/lib/workflow-launch-plan";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "@/lib/workflow-runs";
import type { WorkflowAttentionItem, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

export function deriveWorkflowAttentionItems(
  entry: WorkflowSurfaceEntry,
  stepRuns: readonly WorkflowStepRunRecord[],
  runs: readonly WorkflowRunRecord[]
): WorkflowAttentionItem[] {
  if (entry.status !== "active" || runs.length === 0) {
    return [];
  }

  const plan =
    launchParametersToStepPlan(runs[0]!.launchParameters) ?? launchStepPlanFromSurfaceEntry(entry);
  const followUpStepId = plan?.followUpStepId;
  if (!followUpStepId) return [];

  const runIds = new Set(runs.map((r) => r.id));
  const scoped = stepRuns.filter((sr) => runIds.has(sr.workflowRunId));
  const readyCount = scoped.filter(
    (sr) => sr.workflowStepId === followUpStepId && sr.status === "in_progress"
  ).length;

  if (readyCount === 0) return [];

  return [
    {
      id: `${entry.id}-follow-up-ready`,
      label: "follow-up drafts ready — work in Today",
      count: readyCount,
      actionLabel: "Open follow-up step",
      stepId: followUpStepId,
    },
  ];
}
