/**
 * Computed workflow health for the accordion (no fixture stats / state panels).
 */

import { launchParametersToStepPlan, launchStepPlanFromSurfaceEntry } from "@/lib/workflow-launch-plan";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "@/lib/workflow-runs";
import type { WorkflowRunSummary, WorkflowStat, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";
import { getWorkflowRunsForWorkflow } from "@/lib/workflow-run-storage";

export type WorkflowTelemetry = {
  hasRuns: boolean;
  inFlight: number;
  sent: number;
  replied: number;
  primaryReady: number;
  primaryLine: string;
  followUpLine?: string;
  latestRun?: WorkflowRunSummary;
  olderRunCount: number;
};

const READY_STATUSES = new Set<WorkflowStepRunRecord["status"]>([
  "pending",
  "in_progress",
  "awaiting_approval",
  "approved",
]);

function resolveStepPlan(
  entry: WorkflowSurfaceEntry,
  runs: readonly WorkflowRunRecord[]
): ReturnType<typeof launchParametersToStepPlan> {
  if (runs.length > 0) {
    return launchParametersToStepPlan(runs[0]!.launchParameters);
  }
  return launchStepPlanFromSurfaceEntry(entry);
}

function scopeStepRuns(
  stepRuns: readonly WorkflowStepRunRecord[],
  runs: readonly WorkflowRunRecord[]
): WorkflowStepRunRecord[] {
  const runIds = new Set(runs.map((r) => r.id));
  return stepRuns.filter((sr) => runIds.has(sr.workflowRunId));
}

function countByStep(
  scoped: readonly WorkflowStepRunRecord[],
  stepId: string,
  statuses: Set<WorkflowStepRunRecord["status"]>
): number {
  return scoped.filter((sr) => sr.workflowStepId === stepId && statuses.has(sr.status)).length;
}

function formatFollowUpQueued(plan: NonNullable<ReturnType<typeof launchParametersToStepPlan>>): string {
  if (plan.followUpTriggerKind === "wait" && plan.followUpWaitDays != null) {
    return `queued (${plan.followUpWaitDays}d)`;
  }
  if (plan.followUpTriggerKind === "on_inbound_reply") {
    return "queued (on reply)";
  }
  return "queued";
}

function buildFollowUpLine(
  scoped: readonly WorkflowStepRunRecord[],
  followUpStepId: string,
  plan: NonNullable<ReturnType<typeof launchParametersToStepPlan>>
): string {
  const followUpRuns = scoped.filter((sr) => sr.workflowStepId === followUpStepId);
  const ready = followUpRuns.filter((sr) => sr.status === "in_progress").length;
  if (ready > 0) {
    return `${ready} ready in Action Drawer`;
  }
  const allPending = followUpRuns.length > 0 && followUpRuns.every((sr) => sr.status === "pending");
  if (allPending) {
    return formatFollowUpQueued(plan);
  }
  const sent = countByStep(scoped, followUpStepId, new Set(["sent"]));
  const replied = countByStep(scoped, followUpStepId, new Set(["replied"]));
  if (replied > 0) return `${replied} replied`;
  if (sent > 0) return `${sent} sent`;
  return formatFollowUpQueued(plan);
}

export function deriveWorkflowTelemetry(
  entry: WorkflowSurfaceEntry,
  runs: readonly WorkflowRunRecord[],
  stepRuns: readonly WorkflowStepRunRecord[],
  runHistory: readonly WorkflowRunSummary[]
): WorkflowTelemetry | null {
  const relevantRuns = runs.filter((r) => r.workflowId === entry.id);
  if (relevantRuns.length === 0) {
    return null;
  }

  const plan = resolveStepPlan(entry, relevantRuns);
  const primaryStepId = plan?.primaryStepId ?? resolvePrimaryFallback(entry);
  if (!primaryStepId) return null;

  const scoped = scopeStepRuns(stepRuns, relevantRuns);
  const inFlight = relevantRuns.filter((r) => r.status === "running").length;
  const sent = countByStep(scoped, primaryStepId, new Set(["sent"]));
  const replied = countByStep(scoped, primaryStepId, new Set(["replied"]));
  const primaryReady = scoped.filter(
    (sr) => sr.workflowStepId === primaryStepId && READY_STATUSES.has(sr.status)
  ).length;

  let primaryLine: string;
  if (primaryReady > 0) {
    primaryLine = `${primaryReady} ready in Action Drawer`;
  } else if (sent + replied > 0) {
    primaryLine = `${sent} sent${replied > 0 ? ` · ${replied} replied` : ""}`;
  } else {
    primaryLine = "complete on primary";
  }

  let followUpLine: string | undefined;
  if (plan?.followUpStepId) {
    followUpLine = buildFollowUpLine(scoped, plan.followUpStepId, plan);
  }

  const latestRun = runHistory[0];
  const olderRunCount = Math.max(0, runHistory.length - 1);

  return {
    hasRuns: true,
    inFlight,
    sent,
    replied,
    primaryReady,
    primaryLine,
    followUpLine: followUpLine ? `Follow-up: ${followUpLine}` : undefined,
    latestRun,
    olderRunCount,
  };
}

function resolvePrimaryFallback(entry: WorkflowSurfaceEntry): string | undefined {
  const primary = entry.steps.find(
    (s) => s.nodeType === "action" && (s.id.endsWith("-primary") || s.actionType !== "outcome_capture")
  );
  return primary?.id;
}

export function loadWorkflowTelemetry(
  entry: WorkflowSurfaceEntry,
  listId: string | null,
  runHistory: readonly WorkflowRunSummary[]
): WorkflowTelemetry | null {
  const { runs, stepRuns } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  return deriveWorkflowTelemetry(entry, runs, stepRuns, runHistory);
}

/** Header stats from session runs only (replaces fixture counters). */
export function telemetryToHeaderStats(
  entry: WorkflowSurfaceEntry,
  telemetry: WorkflowTelemetry | null
): WorkflowStat[] {
  if (entry.kind === "user_custom" && entry.status === "inactive") {
    return [{ label: "Status", value: "Saved", tone: "muted" }];
  }

  if (!telemetry?.hasRuns) {
    if (entry.kind === "user_custom" && entry.status === "active") {
      return [{ label: "On this list", value: "Active", tone: "good" }];
    }
    return [];
  }

  const stats: WorkflowStat[] = [
    { label: "Running now", value: String(telemetry.inFlight), tone: "default" },
  ];

  if (telemetry.replied > 0) {
    stats.push({ label: "Replied", value: String(telemetry.replied), tone: "good" });
  } else if (telemetry.sent > 0) {
    stats.push({ label: "Sent", value: String(telemetry.sent), tone: "default" });
  }

  return stats;
}
