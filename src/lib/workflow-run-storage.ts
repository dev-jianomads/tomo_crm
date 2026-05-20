/**
 * Session-local persistence for workflow runs (mock / dev until Supabase wiring).
 */

import { readFromStorage, writeToStorage } from "./storage";
import { stepPlanToLaunchParameters } from "./workflow-launch-plan";
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
  applyWaitElapsedAdvancements,
  advanceWorkflowRunOnReply,
  advanceWorkflowRunOnSend,
  mergeAdvanceIntoStore,
} from "./workflow-run-advance";
import { rollupStateSummaryFromStepRuns } from "./workflow-run-rollup";
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
  input: LaunchCohortInput
): LaunchCohortResult & { cohort: CohortLaunchRecord; stepRuns: WorkflowStepRunRecord[] } {
  const store = loadWorkflowRunsStore();
  const launchParameters = input.stepPlan
    ? stepPlanToLaunchParameters(input.stepPlan, input.launchParameters ?? {})
    : (input.launchParameters ?? {});

  const { cohort, runs, stepRuns, skippedLpContactIds } = buildCohortLaunch(
    { ...input, launchParameters },
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
    stepRuns,
  };
}

function refreshStoreAdvancements(
  store: WorkflowRunsStore,
  workflowId?: string
): { store: WorkflowRunsStore; changed: boolean } {
  const waitResult = applyWaitElapsedAdvancements(store.stepRuns, store.runs, { workflowId });
  if (!waitResult.changed) return { store, changed: false };
  return { store: mergeAdvanceIntoStore(store, waitResult), changed: true };
}

export function recordWorkflowOutboundSend(send: RecordWorkflowSendInput): boolean {
  const { store } = refreshStoreAdvancements(loadWorkflowRunsStore());
  const stepIdx = store.stepRuns.findIndex((sr) => sr.id === send.workflowStepRunId);
  if (stepIdx < 0) return false;

  const tagged = taggedOutboundInteraction(send);
  let nextStepRuns = [...store.stepRuns];
  const sentStep = applyOutboundWorkflowTag(nextStepRuns[stepIdx]!, send);
  nextStepRuns[stepIdx] = sentStep;

  const run = store.runs.find((r) => r.id === send.workflowRunId);
  const sendAdvance = advanceWorkflowRunOnSend(nextStepRuns, sentStep);
  if (sendAdvance.changed) nextStepRuns = sendAdvance.stepRuns;

  saveWorkflowRunsStore({
    ...store,
    stepRuns: nextStepRuns,
    interactions: [...store.interactions.filter((i) => i.id !== tagged.id), tagged],
  });
  return true;
}

export function attributeWorkflowInboundReply(inbound: WorkflowTaggedInteraction) {
  let { store } = refreshStoreAdvancements(loadWorkflowRunsStore());
  const outboundById = new Map(store.interactions.filter((i) => i.direction === "outbound").map((i) => [i.id, i]));

  const result = attributeInboundReply(inbound, store.runs, store.stepRuns, outboundById);
  if (!result.attributed || !result.workflowStepRunId) {
    return { ...result, store, advanceEvents: [] as string[] };
  }

  const stepIdx = store.stepRuns.findIndex((sr) => sr.id === result.workflowStepRunId);
  if (stepIdx < 0) return { ...result, store, advanceEvents: [] as string[] };

  let nextStepRuns = [...store.stepRuns];
  const repliedPrimary = applyInboundReplyAttribution(nextStepRuns[stepIdx]!, inbound);
  nextStepRuns[stepIdx] = repliedPrimary;

  const run = store.runs.find((r) => r.id === result.workflowRunId);
  const replyAdvance = advanceWorkflowRunOnReply(
    nextStepRuns,
    repliedPrimary,
    run?.launchParameters ?? {}
  );
  if (replyAdvance.changed) nextStepRuns = replyAdvance.stepRuns;

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

  return {
    ...result,
    store: loadWorkflowRunsStore(),
    advanceEvents: replyAdvance.events,
    updatedFollowUpStepRun: nextStepRuns.find(
      (sr) =>
        sr.workflowRunId === result.workflowRunId &&
        sr.outputJsonb.deferredLeg === "follow_up"
    ),
  };
}

export function getWorkflowRunsForWorkflow(
  workflowId: string,
  listId?: string
): {
  cohortLaunches: CohortLaunchRecord[];
  runs: WorkflowRunRecord[];
  stepRuns: WorkflowStepRunRecord[];
} {
  let store = loadWorkflowRunsStore();
  const refreshed = refreshStoreAdvancements(store, workflowId);
  if (refreshed.changed) {
    saveWorkflowRunsStore(refreshed.store);
    store = refreshed.store;
  }

  const runs = store.runs.filter(
    (r) => r.workflowId === workflowId && (listId == null || r.listId === listId)
  );
  const runIds = new Set(runs.map((r) => r.id));
  const stepRuns = store.stepRuns.filter((sr) => runIds.has(sr.workflowRunId));
  const cohortIds = new Set(runs.map((r) => r.cohortLaunchId));
  const cohortLaunches = store.cohortLaunches.filter((c) => cohortIds.has(c.id));
  return { cohortLaunches, runs, stepRuns };
}

export { rollupStateSummaryFromStepRuns };
