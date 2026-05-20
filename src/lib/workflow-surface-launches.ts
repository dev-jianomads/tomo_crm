/**
 * Merge session-local cohort launches into workflow surface DTOs.
 */

import { getWorkflowRunsForWorkflow } from "./workflow-run-storage";
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

export function resolveInitialWorkflowStepId(entry: WorkflowSurfaceEntry): string | undefined {
  const firstAction = entry.steps.find((s) => s.nodeType === "action" && s.actionType !== "outcome_capture");
  return firstAction?.id;
}

export function enrichWorkflowSurfaceEntry(
  entry: WorkflowSurfaceEntry,
  listId: string | null
): WorkflowSurfaceEntry {
  return {
    ...entry,
    runHistory: mergeEntryRunHistory(entry, listId),
  };
}
