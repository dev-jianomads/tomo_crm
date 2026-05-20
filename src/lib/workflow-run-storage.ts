/**
 * Session-local persistence for workflow runs (mock / dev until Supabase wiring).
 */

import { readFromStorage, writeToStorage } from "./storage";
import type {
  CohortLaunchRecord,
  LaunchCohortInput,
  LaunchCohortResult,
  RecordWorkflowSendInput,
  WorkflowRunRecord,
  WorkflowStepRunRecord,
  WorkflowTaggedInteraction,
} from "./workflow-runs";
import {
  applyInboundReplyAttribution,
  applyOutboundWorkflowTag,
  attributeInboundReply,
  buildCohortLaunch,
  taggedOutboundInteraction,
} from "./workflow-runs";

const STORAGE_KEY = "tomo-workflow-runs-v1";

export type WorkflowRunsStore = {
  cohortLaunches: CohortLaunchRecord[];
  runs: WorkflowRunRecord[];
  stepRuns: WorkflowStepRunRecord[];
  interactions: WorkflowTaggedInteraction[];
};

const EMPTY_STORE: WorkflowRunsStore = {
  cohortLaunches: [],
  runs: [],
  stepRuns: [],
  interactions: [],
};

export function loadWorkflowRunsStore(): WorkflowRunsStore {
  return readFromStorage<WorkflowRunsStore>(STORAGE_KEY, EMPTY_STORE);
}

export function saveWorkflowRunsStore(store: WorkflowRunsStore): void {
  writeToStorage(STORAGE_KEY, store);
}

export function launchWorkflowCohort(
  input: LaunchCohortInput,
  options?: { initialWorkflowStepId?: string }
): LaunchCohortResult & { cohort: CohortLaunchRecord } {
  const store = loadWorkflowRunsStore();
  const { cohort, runs, stepRuns, skippedLpContactIds } = buildCohortLaunch(
    { ...input, initialWorkflowStepId: options?.initialWorkflowStepId ?? input.initialWorkflowStepId },
    store.runs
  );

  saveWorkflowRunsStore({
    cohortLaunches: [cohort, ...store.cohortLaunches],
    runs: [...runs, ...store.runs],
    stepRuns: [...stepRuns, ...store.stepRuns],
    interactions: store.interactions,
  });

  return {
    cohortLaunchId: cohort.id,
    workflowRunIds: runs.map((r) => r.id),
    skippedLpContactIds,
    cohort,
  };
}

export function recordWorkflowOutboundSend(send: RecordWorkflowSendInput): boolean {
  const store = loadWorkflowRunsStore();
  const stepIdx = store.stepRuns.findIndex((sr) => sr.id === send.workflowStepRunId);
  if (stepIdx < 0) return false;

  const tagged = taggedOutboundInteraction(send);
  const nextStepRuns = [...store.stepRuns];
  nextStepRuns[stepIdx] = applyOutboundWorkflowTag(nextStepRuns[stepIdx]!, send);

  saveWorkflowRunsStore({
    ...store,
    stepRuns: nextStepRuns,
    interactions: [...store.interactions.filter((i) => i.id !== tagged.id), tagged],
  });
  return true;
}

export function attributeWorkflowInboundReply(inbound: WorkflowTaggedInteraction) {
  const store = loadWorkflowRunsStore();
  const outboundById = new Map(store.interactions.filter((i) => i.direction === "outbound").map((i) => [i.id, i]));

  const result = attributeInboundReply(inbound, store.runs, store.stepRuns, outboundById);
  if (!result.attributed || !result.workflowStepRunId) {
    return { ...result, store };
  }

  const stepIdx = store.stepRuns.findIndex((sr) => sr.id === result.workflowStepRunId);
  if (stepIdx < 0) return { ...result, store };

  const nextStepRuns = [...store.stepRuns];
  nextStepRuns[stepIdx] = applyInboundReplyAttribution(nextStepRuns[stepIdx]!, inbound);

  const taggedInbound: WorkflowTaggedInteraction = {
    ...inbound,
    workflowRunId: result.workflowRunId ?? null,
    workflowStepRunId: result.workflowStepRunId ?? null,
  };

  saveWorkflowRunsStore({
    ...store,
    stepRuns: nextStepRuns,
    interactions: [...store.interactions.filter((i) => i.id !== taggedInbound.id), taggedInbound],
  });

  return { ...result, store: loadWorkflowRunsStore() };
}

export function getWorkflowRunsForWorkflow(
  workflowId: string,
  listId?: string
): { cohortLaunches: CohortLaunchRecord[]; runs: WorkflowRunRecord[] } {
  const store = loadWorkflowRunsStore();
  const runs = store.runs.filter(
    (r) => r.workflowId === workflowId && (listId == null || r.listId === listId)
  );
  const cohortIds = new Set(runs.map((r) => r.cohortLaunchId));
  const cohortLaunches = store.cohortLaunches.filter((c) => cohortIds.has(c.id));
  return { cohortLaunches, runs };
}
