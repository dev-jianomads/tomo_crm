/**
 * Merge session-local cohort launches into workflow surface DTOs.
 */

import { resolvePrimaryWorkflowStepId } from "./workflow-launch-plan";
import { deriveWorkflowAttentionItems } from "./workflow-run-attention";
import { getWorkflowRunsForWorkflow } from "./workflow-run-storage";
import { cohortLaunchesToRunSummaries } from "./workflow-runs";
import {
  deriveWorkflowTelemetry,
  telemetryToHeaderStats,
} from "./workflow-telemetry";
import type { WorkflowRunSummary, WorkflowSurfaceEntry } from "./workflow-surface-mock";

export function mergeEntryRunHistory(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowRunSummary[] {
  const { cohortLaunches, runs } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  return cohortLaunchesToRunSummaries(cohortLaunches, runs);
}

/** Active step at launch — always the primary action step when present. */
export function resolveInitialWorkflowStepId(entry: WorkflowSurfaceEntry): string | undefined {
  return resolvePrimaryWorkflowStepId(entry);
}

export function enrichWorkflowSurfaceEntry(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowSurfaceEntry {
  const { runs, stepRuns } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  const runHistory = mergeEntryRunHistory(entry, listId);
  const telemetry = deriveWorkflowTelemetry(entry, runs, stepRuns, runHistory);

  return {
    ...entry,
    runHistory,
    telemetry,
    stats: telemetryToHeaderStats(entry, telemetry),
    attentionItems: deriveWorkflowAttentionItems(entry, stepRuns, runs),
  };
}
