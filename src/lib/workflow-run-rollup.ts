/**
 * Roll up workflow_step_runs into stateSummary segments for custom workflows (Phase 4).
 */

import { launchParametersToStepPlan } from "@/lib/workflow-launch-plan";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "@/lib/workflow-runs";
import type { WorkflowStateSummary, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

function countForStepIds(
  stepRuns: readonly WorkflowStepRunRecord[],
  stepIds: Set<string>
): { drafted: number; sent: number; waiting: number } {
  let drafted = 0;
  let sent = 0;
  let waiting = 0;

  for (const sr of stepRuns) {
    if (!stepIds.has(sr.workflowStepId)) continue;
    if (sr.status === "pending" || sr.status === "in_progress" || sr.status === "awaiting_approval" || sr.status === "approved") {
      drafted += 1;
    } else if (sr.status === "sent") {
      sent += 1;
      waiting += 1;
    } else if (sr.status === "replied") {
      sent += 1;
    } else if (sr.status === "skipped" || sr.status === "failed") {
      /* no-op */
    }
  }

  return { drafted, sent, waiting };
}

export function rollupStateSummaryFromStepRuns(
  entry: WorkflowSurfaceEntry,
  stepRuns: readonly WorkflowStepRunRecord[],
  runs: readonly WorkflowRunRecord[]
): WorkflowStateSummary | null {
  if (entry.kind !== "user_custom" || runs.length === 0) return null;

  const workflowId = entry.id;
  const relevantRuns = runs.filter((r) => r.workflowId === workflowId);
  if (relevantRuns.length === 0) return null;

  const plan = launchParametersToStepPlan(relevantRuns[0]!.launchParameters);
  const primaryId = plan?.primaryStepId ?? `${workflowId}-primary`;
  const followUpId = plan?.followUpStepId;

  const runIds = new Set(relevantRuns.map((r) => r.id));
  const scoped = stepRuns.filter((sr) => runIds.has(sr.workflowRunId));

  if (scoped.length === 0) return null;

  const segments = entry.stateSummary.segments.map((seg) => {
    const isFollowUp = seg.id.endsWith("-follow-up");
    const stepIds = new Set(
      isFollowUp && followUpId ? [followUpId] : [primaryId]
    );
    return { ...seg, ...countForStepIds(scoped, stepIds) };
  });

  const replied = scoped.filter((sr) => sr.status === "replied").length;
  const readyForOutcome = 0;

  return {
    ...entry.stateSummary,
    title:
      relevantRuns.some((r) => r.status === "running")
        ? `Where the ${relevantRuns.filter((r) => r.status === "running").length} in-flight LPs are`
        : entry.stateSummary.title,
    segments,
    replied,
    readyForOutcome,
    skipped: scoped.filter((sr) => sr.status === "skipped").length,
  };
}
