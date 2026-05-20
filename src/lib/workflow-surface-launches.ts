/**
 * Merge session-local cohort launches into workflow surface DTOs.
 */

import { resolvePrimaryWorkflowStepId } from "./workflow-launch-plan";
import { deriveWorkflowAttentionItems } from "./workflow-run-attention";
import {
  getWorkflowRunsForWorkflow,
  rollupStateSummaryFromStepRuns,
} from "./workflow-run-storage";
import { cohortLaunchesToRunSummaries } from "./workflow-runs";
import type { WorkflowRunSummary, WorkflowSurfaceEntry } from "./workflow-surface-mock";

export function mergeEntryRunHistory(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowRunSummary[] {
  const { cohortLaunches, runs } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  const launched = cohortLaunchesToRunSummaries(cohortLaunches, runs);
  const fixtureIds = new Set(entry.runHistory.map((r) => r.id));
  const novel = launched.filter((r) => !fixtureIds.has(r.id));
  return [...novel, ...entry.runHistory];
}

function mergeEntryStateSummary(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowSurfaceEntry["stateSummary"] {
  const { runs, stepRuns } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  return rollupStateSummaryFromStepRuns(entry, stepRuns, runs) ?? entry.stateSummary;
}

/** Active step at launch — always the primary action step when present. */
export function resolveInitialWorkflowStepId(entry: WorkflowSurfaceEntry): string | undefined {
  return resolvePrimaryWorkflowStepId(entry);
}

function mergeEntryAttentionItems(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowSurfaceEntry["attentionItems"] {
  const { runs, stepRuns } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  return deriveWorkflowAttentionItems(entry, stepRuns, runs);
}

export function enrichWorkflowSurfaceEntry(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowSurfaceEntry {
  return {
    ...entry,
    runHistory: mergeEntryRunHistory(entry, listId),
    stateSummary: mergeEntryStateSummary(entry, listId),
    attentionItems: mergeEntryAttentionItems(entry, listId),
  };
}
