/**
 * Follow-up leg advancement after launch (Phase 4).
 *
 * @see docs/WORKFLOW_FOLLOW_UP_BUILDER_PLAN.md
 */

import { launchParametersToStepPlan } from "@/lib/workflow-launch-plan";
import type {
  WorkflowRunRecord,
  WorkflowStepRunRecord,
  WorkflowStepRunStatus,
} from "@/lib/workflow-runs";

export type WorkflowRunAdvanceEvent =
  | "follow_up_skipped_lp_replied"
  | "follow_up_activated_on_reply"
  | "follow_up_activated_wait_elapsed";

export type WorkflowRunAdvanceResult = {
  stepRuns: WorkflowStepRunRecord[];
  changed: boolean;
  events: WorkflowRunAdvanceEvent[];
};

function cloneStepRuns(stepRuns: readonly WorkflowStepRunRecord[]): WorkflowStepRunRecord[] {
  return stepRuns.map((sr) => ({
    ...sr,
    outputJsonb: { ...sr.outputJsonb },
  }));
}

function stepRunsForRun(
  stepRuns: readonly WorkflowStepRunRecord[],
  workflowRunId: string
): WorkflowStepRunRecord[] {
  return stepRuns.filter((sr) => sr.workflowRunId === workflowRunId);
}

function patchStepRun(
  stepRuns: WorkflowStepRunRecord[],
  stepRunId: string,
  patch: Partial<WorkflowStepRunRecord> & { status?: WorkflowStepRunStatus }
): boolean {
  const idx = stepRuns.findIndex((sr) => sr.id === stepRunId);
  if (idx < 0) return false;
  stepRuns[idx] = {
    ...stepRuns[idx]!,
    ...patch,
    outputJsonb: { ...stepRuns[idx]!.outputJsonb, ...patch.outputJsonb },
  };
  return true;
}

function deferredFollowUp(
  stepRuns: readonly WorkflowStepRunRecord[],
  workflowRunId: string
): WorkflowStepRunRecord | undefined {
  return stepRunsForRun(stepRuns, workflowRunId).find(
    (sr) => sr.outputJsonb.deferredLeg === "follow_up"
  );
}

function primaryStepRun(
  stepRuns: readonly WorkflowStepRunRecord[],
  workflowRunId: string,
  primaryStepId?: string
): WorkflowStepRunRecord | undefined {
  const forRun = stepRunsForRun(stepRuns, workflowRunId);
  if (primaryStepId) {
    const match = forRun.find((sr) => sr.workflowStepId === primaryStepId);
    if (match) return match;
  }
  return forRun.find(
    (sr) =>
      sr.outputJsonb.deferredLeg !== "follow_up" &&
      sr.workflowStepId.endsWith("-primary")
  );
}

function isFollowUpDeferredPending(sr: WorkflowStepRunRecord): boolean {
  return sr.outputJsonb.deferredLeg === "follow_up" && sr.status === "pending";
}

function activateFollowUp(
  stepRuns: readonly WorkflowStepRunRecord[],
  followUp: WorkflowStepRunRecord,
  now: Date,
  event: WorkflowRunAdvanceEvent
): WorkflowRunAdvanceResult {
  const next = cloneStepRuns(stepRuns);
  patchStepRun(next, followUp.id, {
    status: "in_progress",
    outputJsonb: {
      activatedAt: now.toISOString(),
    },
  });
  return { stepRuns: next, changed: true, events: [event] };
}

function skipFollowUp(
  stepRuns: readonly WorkflowStepRunRecord[],
  followUp: WorkflowStepRunRecord,
  reason: string
): WorkflowRunAdvanceResult {
  const next = cloneStepRuns(stepRuns);
  patchStepRun(next, followUp.id, {
    status: "skipped",
    outputJsonb: { skippedReason: reason },
  });
  return { stepRuns: next, changed: true, events: ["follow_up_skipped_lp_replied"] };
}

/**
 * After primary outbound is recorded as sent. No-op today; wait clock starts via `sentAt`.
 */
export function advanceWorkflowRunOnSend(
  stepRuns: readonly WorkflowStepRunRecord[],
  _sentStepRun: WorkflowStepRunRecord
): WorkflowRunAdvanceResult {
  return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
}

/**
 * After inbound reply is attributed to the primary step run.
 * - `wait` + `no_reply`: skip deferred follow-up (LP replied).
 * - `on_inbound_reply`: activate follow-up for contextual draft.
 */
export function advanceWorkflowRunOnReply(
  stepRuns: readonly WorkflowStepRunRecord[],
  repliedPrimaryStepRun: WorkflowStepRunRecord,
  launchParameters: Record<string, string> = {},
  now: Date = new Date()
): WorkflowRunAdvanceResult {
  const followUp = deferredFollowUp(stepRuns, repliedPrimaryStepRun.workflowRunId);
  if (!followUp || !isFollowUpDeferredPending(followUp)) {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  const triggerKind =
    followUp.outputJsonb.followUpTriggerKind ??
    launchParametersToStepPlan(launchParameters)?.followUpTriggerKind;

  if (triggerKind === "wait") {
    return skipFollowUp(stepRuns, followUp, "lp_replied_before_wait");
  }

  if (triggerKind === "on_inbound_reply") {
    return activateFollowUp(stepRuns, followUp, now, "follow_up_activated_on_reply");
  }

  return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
}

/**
 * Mock scheduler: when primary was sent, no reply, and wait window elapsed → follow-up actionable.
 */
export function advanceWorkflowRunOnWaitElapsed(
  stepRuns: readonly WorkflowStepRunRecord[],
  run: WorkflowRunRecord,
  now: Date = new Date()
): WorkflowRunAdvanceResult {
  const plan = launchParametersToStepPlan(run.launchParameters);
  const primary = primaryStepRun(stepRuns, run.id, plan?.primaryStepId);
  const followUp = deferredFollowUp(stepRuns, run.id);

  if (!primary || !followUp || !isFollowUpDeferredPending(followUp)) {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  const triggerKind = followUp.outputJsonb.followUpTriggerKind ?? plan?.followUpTriggerKind;
  if (triggerKind !== "wait") {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  if (primary.status === "replied") {
    return skipFollowUp(stepRuns, followUp, "lp_replied_before_wait");
  }

  if (primary.status !== "sent") {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  const sentAt = primary.outputJsonb.sentAt;
  if (!sentAt) {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  const rawWaitDays =
    followUp.outputJsonb.followUpWaitDays ??
    plan?.followUpWaitDays ??
    Number(run.launchParameters.follow_up_wait_days);
  const waitDays =
    typeof rawWaitDays === "number" && Number.isFinite(rawWaitDays) && rawWaitDays > 0
      ? rawWaitDays
      : 7;

  const deadline = Date.parse(sentAt) + waitDays * 24 * 60 * 60 * 1000;
  if (Number.isNaN(deadline) || now.getTime() < deadline) {
    return { stepRuns: cloneStepRuns(stepRuns), changed: false, events: [] };
  }

  return activateFollowUp(stepRuns, followUp, now, "follow_up_activated_wait_elapsed");
}

/** Apply wait-elapsed advancement for all runs of a workflow (mock poll on read). */
export function applyWaitElapsedAdvancements(
  stepRuns: readonly WorkflowStepRunRecord[],
  runs: readonly WorkflowRunRecord[],
  options?: { workflowId?: string; now?: Date }
): WorkflowRunAdvanceResult {
  const now = options?.now ?? new Date();
  let next = cloneStepRuns(stepRuns);
  const events: WorkflowRunAdvanceEvent[] = [];
  let changed = false;

  for (const run of runs) {
    if (options?.workflowId && run.workflowId !== options.workflowId) continue;
    if (run.status !== "running" && run.status !== "paused") continue;

    const result = advanceWorkflowRunOnWaitElapsed(next, run, now);
    if (result.changed) {
      changed = true;
      next = result.stepRuns;
      events.push(...result.events);
    }
  }

  return { stepRuns: next, changed, events };
}

export function mergeAdvanceIntoStore<T extends { stepRuns: WorkflowStepRunRecord[] }>(
  store: T,
  advanced: WorkflowRunAdvanceResult
): T {
  if (!advanced.changed) return store;
  const byId = new Map(advanced.stepRuns.map((sr) => [sr.id, sr]));
  return {
    ...store,
    stepRuns: store.stepRuns.map((sr) => byId.get(sr.id) ?? sr),
  };
}
