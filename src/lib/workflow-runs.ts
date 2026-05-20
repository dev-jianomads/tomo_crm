/**
 * Workflow run identity, cohort launch, outbound tagging, and inbound reply attribution.
 *
 * Production: `workflow_runs.id` and `cohort_launch_id` are UUIDs from `gen_random_uuid()`.
 * Mock: same shape persisted in localStorage via `workflow-run-storage.ts`.
 *
 * SRS §3.12 — one `workflow_runs` row per LP per execution; `cohort_launch_id` groups
 * a single Launch click across the cohort for run history / outcomes UI.
 */

export type WorkflowRunStatus = "running" | "paused" | "completed" | "cancelled" | "failed";

export type WorkflowStepRunStatus =
  | "pending"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "sent"
  | "replied"
  | "skipped"
  | "failed";

/** Per-LP execution row (maps to `workflow_runs`). */
export type WorkflowRunRecord = {
  id: string;
  cohortLaunchId: string;
  workspaceId: string;
  workflowId: string;
  lpContactId: string;
  listId: string;
  listName: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt?: string;
  outcome?: string;
  launchParameters: Record<string, string>;
  startedByUserId?: string;
};

/** Cohort-level launch envelope (UI run history / outcomes view). */
export type CohortLaunchRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  listId: string;
  listName: string;
  startedAt: string;
  startedByUserId?: string;
  launchParameters: Record<string, string>;
  lpCount: number;
  statusLabel: string;
};

export type WorkflowStepRunRecord = {
  id: string;
  workflowRunId: string;
  workflowStepId: string;
  status: WorkflowStepRunStatus;
  startedAt?: string;
  completedAt?: string;
  outputJsonb: {
    sentInteractionId?: string;
    providerInternetMessageId?: string;
    lpEmailThreadId?: string;
    sentAt?: string;
    repliedAt?: string;
    inboundInteractionId?: string;
  };
};

/** Outbound / inbound email row subset for attribution (maps to `lp_interactions` + metadata). */
export type WorkflowTaggedInteraction = {
  id: string;
  lpContactId: string;
  lpEmailThreadId: string | null;
  direction: "inbound" | "outbound";
  interactedAt: string;
  providerInternetMessageId: string | null;
  inReplyToMessageId?: string | null;
  workflowRunId: string | null;
  workflowStepRunId: string | null;
  isOoo?: boolean;
  isMeaningfulTouch?: boolean;
};

export type LaunchCohortInput = {
  workspaceId: string;
  workflowId: string;
  listId: string;
  listName: string;
  lpContactIds: string[];
  launchParameters?: Record<string, string>;
  startedByUserId?: string;
  /** First send step id from workflow definition (mock: first action step). */
  initialWorkflowStepId?: string;
};

export type LaunchCohortResult = {
  cohortLaunchId: string;
  workflowRunIds: string[];
  skippedLpContactIds: string[];
};

export type RecordWorkflowSendInput = {
  workflowRunId: string;
  workflowStepRunId: string;
  interaction: Omit<WorkflowTaggedInteraction, "workflowRunId" | "workflowStepRunId">;
};

export type AttributeReplyInput = {
  inbound: WorkflowTaggedInteraction;
};

export type AttributeReplyResult = {
  attributed: boolean;
  workflowRunId?: string;
  workflowStepRunId?: string;
  cohortLaunchId?: string;
};

export function newWorkflowRunId(): string {
  return crypto.randomUUID();
}

export function newCohortLaunchId(): string {
  return crypto.randomUUID();
}

export function newWorkflowStepRunId(): string {
  return crypto.randomUUID();
}

/** Active = running or paused (SRS partial unique index). */
export function isActiveWorkflowRunStatus(status: WorkflowRunStatus): boolean {
  return status === "running" || status === "paused";
}

/**
 * Create one workflow run per LP for a cohort launch. Skips LPs that already have an
 * active run for the same workflow (BR-3.12 / AC-3.11.2).
 */
export function buildCohortLaunch(
  input: LaunchCohortInput,
  existingRuns: readonly WorkflowRunRecord[]
): { cohort: CohortLaunchRecord; runs: WorkflowRunRecord[]; stepRuns: WorkflowStepRunRecord[]; skippedLpContactIds: string[] } {
  const cohortLaunchId = newCohortLaunchId();
  const startedAt = new Date().toISOString();
  const launchParameters = input.launchParameters ?? {};

  const activeByLp = new Map<string, WorkflowRunRecord>();
  for (const run of existingRuns) {
    if (run.workflowId !== input.workflowId) continue;
    if (!isActiveWorkflowRunStatus(run.status)) continue;
    activeByLp.set(run.lpContactId, run);
  }

  const runs: WorkflowRunRecord[] = [];
  const stepRuns: WorkflowStepRunRecord[] = [];
  const skippedLpContactIds: string[] = [];

  for (const lpContactId of input.lpContactIds) {
    if (activeByLp.has(lpContactId)) {
      skippedLpContactIds.push(lpContactId);
      continue;
    }

    const workflowRunId = newWorkflowRunId();
    runs.push({
      id: workflowRunId,
      cohortLaunchId,
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      lpContactId,
      listId: input.listId,
      listName: input.listName,
      status: "running",
      startedAt,
      launchParameters,
      startedByUserId: input.startedByUserId,
    });

    if (input.initialWorkflowStepId) {
      stepRuns.push({
        id: newWorkflowStepRunId(),
        workflowRunId,
        workflowStepId: input.initialWorkflowStepId,
        status: "pending",
        startedAt,
        outputJsonb: {},
      });
    }
  }

  const cohort: CohortLaunchRecord = {
    id: cohortLaunchId,
    workspaceId: input.workspaceId,
    workflowId: input.workflowId,
    listId: input.listId,
    listName: input.listName,
    startedAt,
    startedByUserId: input.startedByUserId,
    launchParameters,
    lpCount: runs.length,
    statusLabel: runs.length > 0 ? `${runs.length} enrolled` : "No LPs enrolled",
  };

  return { cohort, runs, stepRuns, skippedLpContactIds };
}

/** Tag outbound send on interaction metadata + step run output (Action Drawer approve+send). */
export function applyOutboundWorkflowTag(
  stepRun: WorkflowStepRunRecord,
  send: RecordWorkflowSendInput
): WorkflowStepRunRecord {
  return {
    ...stepRun,
    status: "sent",
    completedAt: send.interaction.interactedAt,
    outputJsonb: {
      ...stepRun.outputJsonb,
      sentInteractionId: send.interaction.id,
      providerInternetMessageId: send.interaction.providerInternetMessageId ?? undefined,
      lpEmailThreadId: send.interaction.lpEmailThreadId ?? undefined,
      sentAt: send.interaction.interactedAt,
    },
  };
}

export function taggedOutboundInteraction(
  send: RecordWorkflowSendInput
): WorkflowTaggedInteraction {
  return {
    ...send.interaction,
    workflowRunId: send.workflowRunId,
    workflowStepRunId: send.workflowStepRunId,
  };
}

/**
 * Attribute inbound reply to the most recent eligible sent step on the same thread.
 * Excludes OOO; requires inbound after outbound sent_at.
 */
export function attributeInboundReply(
  inbound: WorkflowTaggedInteraction,
  runs: readonly WorkflowRunRecord[],
  stepRuns: readonly WorkflowStepRunRecord[],
  outboundById: ReadonlyMap<string, WorkflowTaggedInteraction>
): AttributeReplyResult {
  if (inbound.direction !== "inbound") return { attributed: false };
  if (inbound.isOoo) return { attributed: false };

  const inboundAt = Date.parse(inbound.interactedAt);
  if (Number.isNaN(inboundAt)) return { attributed: false };

  let parentOutbound: WorkflowTaggedInteraction | undefined;

  if (inbound.inReplyToMessageId) {
    for (const out of outboundById.values()) {
      if (
        out.providerInternetMessageId &&
        out.providerInternetMessageId === inbound.inReplyToMessageId
      ) {
        parentOutbound = out;
        break;
      }
    }
  }

  const candidateStepRuns = stepRuns
    .filter((sr) => sr.status === "sent" || sr.status === "replied")
    .filter((sr) => {
      const sentAt = sr.outputJsonb.sentAt;
      if (!sentAt) return false;
      if (Date.parse(sentAt) >= inboundAt) return false;

      if (parentOutbound?.workflowStepRunId === sr.id) return true;

      const threadId = sr.outputJsonb.lpEmailThreadId;
      if (threadId && inbound.lpEmailThreadId && threadId === inbound.lpEmailThreadId) return true;

      return false;
    })
    .sort((a, b) => Date.parse(b.outputJsonb.sentAt ?? "") - Date.parse(a.outputJsonb.sentAt ?? ""));

  const matched = candidateStepRuns[0];
  if (!matched) return { attributed: false };
  if (matched.status === "replied") {
    const run = runs.find((r) => r.id === matched.workflowRunId);
    return {
      attributed: true,
      workflowRunId: matched.workflowRunId,
      workflowStepRunId: matched.id,
      cohortLaunchId: run?.cohortLaunchId,
    };
  }

  const run = runs.find((r) => r.id === matched.workflowRunId);
  return {
    attributed: true,
    workflowRunId: matched.workflowRunId,
    workflowStepRunId: matched.id,
    cohortLaunchId: run?.cohortLaunchId,
  };
}

export function applyInboundReplyAttribution(
  stepRun: WorkflowStepRunRecord,
  inbound: WorkflowTaggedInteraction
): WorkflowStepRunRecord {
  return {
    ...stepRun,
    status: "replied",
    outputJsonb: {
      ...stepRun.outputJsonb,
      repliedAt: inbound.interactedAt,
      inboundInteractionId: inbound.id,
    },
  };
}

export function cohortLaunchesToRunSummaries(
  cohorts: readonly CohortLaunchRecord[],
  runs: readonly WorkflowRunRecord[]
): Array<{
  id: string;
  cohortLaunchId: string;
  listName: string;
  startedAtLabel: string;
  lpCount: number;
  statusLabel: string;
}> {
  return [...cohorts]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .map((cohort) => {
      const cohortRuns = runs.filter((r) => r.cohortLaunchId === cohort.id);
      const running = cohortRuns.filter((r) => r.status === "running").length;
      const completed = cohortRuns.filter((r) => r.status === "completed").length;
      let statusLabel = cohort.statusLabel;
      if (cohortRuns.length > 0) {
        if (running > 0) statusLabel = `${running} running`;
        else if (completed === cohortRuns.length) statusLabel = "All complete";
        else statusLabel = `${cohortRuns.length} enrolled`;
      }

      return {
        id: cohort.id,
        cohortLaunchId: cohort.id,
        listName: cohort.listName,
        startedAtLabel: formatRunStartedLabel(cohort.startedAt),
        lpCount: cohort.lpCount,
        statusLabel,
      };
    });
}

export function formatRunStartedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `today ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return `started ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}
