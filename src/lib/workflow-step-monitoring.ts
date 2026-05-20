/**
 * Step monitor drawer payloads — real data for custom workflows, mock for templates.
 */

import { loadCustomPlaybooks } from "@/lib/customPlaybooks";
import { launchParametersToStepPlan } from "@/lib/workflow-launch-plan";
import { getWorkflowRunsForWorkflow } from "@/lib/workflow-run-storage";
import type { WorkflowRunRecord, WorkflowStepRunRecord } from "@/lib/workflow-runs";
import type { CustomPlaybookStored } from "@/lib/custom-playbook-schema";
import { formatFollowUpTriggerLabel } from "@/lib/workflow-follow-up-design";
import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";
import {
  getMockWorkflowStepMonitoring,
  type WorkflowStepLpRow,
  type WorkflowStepMetricKey,
  type WorkflowStepMonitoring,
} from "@/lib/workflow-step-monitoring-mock";

export type { WorkflowStepLpRow, WorkflowStepMetricKey, WorkflowStepMonitoring };

function stepRunToEmailStatus(status: WorkflowStepRunRecord["status"]): WorkflowStepLpRow["emailStatus"] {
  if (status === "sent" || status === "replied") return status;
  if (status === "skipped") return "skipped";
  return "draft";
}

function formatShortTimestamp(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function lpLabelForRun(
  run: WorkflowRunRecord,
  runIndex: number,
  playbook: CustomPlaybookStored | null
): Pick<WorkflowStepLpRow, "lpName" | "firmName"> {
  const drafts = playbook?.actionBuild?.lpDrafts ?? [];
  const draft = drafts[runIndex];
  if (draft) return { lpName: draft.lpName, firmName: draft.firmName };
  return { lpName: run.lpContactId, firmName: run.listName };
}

function metricsFromStepRuns(rows: readonly WorkflowStepRunRecord[]): Record<WorkflowStepMetricKey, number> {
  const metrics: Record<WorkflowStepMetricKey, number> = {
    drafted: 0,
    sent: 0,
    replied: 0,
    skipped: 0,
  };
  for (const sr of rows) {
    if (sr.status === "pending" || sr.status === "in_progress" || sr.status === "awaiting_approval" || sr.status === "approved") {
      metrics.drafted += 1;
    } else if (sr.status === "sent") {
      metrics.sent += 1;
    } else if (sr.status === "replied") {
      metrics.replied += 1;
      metrics.sent += 1;
    } else if (sr.status === "skipped") {
      metrics.skipped += 1;
    }
  }
  return metrics;
}

function sortedRuns(runs: readonly WorkflowRunRecord[]): WorkflowRunRecord[] {
  return [...runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function buildCustomWorkflowStepMonitoring(
  entry: WorkflowSurfaceEntry,
  step: WorkflowStepNode,
  playbook: CustomPlaybookStored | null,
  runs: readonly WorkflowRunRecord[],
  stepRuns: readonly WorkflowStepRunRecord[]
): WorkflowStepMonitoring {
  const plan = launchParametersToStepPlan(runs[0]?.launchParameters ?? {});
  const primaryStepId = plan?.primaryStepId ?? `${entry.id}-primary`;
  const followUpStepId = plan?.followUpStepId ?? `${entry.id}-follow-up`;
  const orderedRuns = sortedRuns(runs);
  const runIndexById = new Map(orderedRuns.map((r, i) => [r.id, i]));

  if (step.nodeType === "trigger") {
    return {
      stepId: step.id,
      status: runs.length > 0 ? "running" : "idle",
      metrics: { drafted: 0, sent: 0, replied: 0, skipped: 0 },
      showParameters: true,
      showLpTable: false,
      parameters: [
        { label: "Trigger", value: entry.triggerLabel },
        { label: "Enrolled LPs", value: String(runs.length) },
        ...(playbook?.followUp && playbook.followUp.triggerSpec
          ? [{ label: "Follow-up when", value: formatFollowUpTriggerLabel(playbook.followUp.triggerSpec) }]
          : []),
      ],
      footnote: "Enrollment is read-only while this workflow is active.",
    };
  }

  if (step.nodeType === "wait") {
    const waitingLps = orderedRuns.filter((run) => {
      const forRun = stepRuns.filter((sr) => sr.workflowRunId === run.id);
      const primary = forRun.find((sr) => sr.workflowStepId === primaryStepId);
      const followUp = forRun.find((sr) => sr.outputJsonb.deferredLeg === "follow_up");
      return primary?.status === "sent" && followUp?.status === "pending";
    }).length;

    return {
      stepId: step.id,
      status: waitingLps > 0 ? "running" : "complete",
      metrics: { drafted: 0, sent: 0, replied: 0, skipped: 0 },
      showParameters: true,
      showLpTable: false,
      visibleMetrics: [],
      parameters: [
        { label: "Wait window", value: step.timingLabel ?? "—" },
        { label: "LPs in wait", value: String(waitingLps) },
      ],
      footnote:
        waitingLps > 0
          ? "Tomo advances follow-up when the wait elapses with no reply (mock: checked on page load)."
          : "No LPs are currently in the wait window.",
    };
  }

  const isFollowUpStep = step.id === followUpStepId || step.id.endsWith("-follow-up");
  const stepIdFilter = isFollowUpStep ? followUpStepId : primaryStepId;
  const rows = stepRuns.filter((sr) => sr.workflowStepId === stepIdFilter);

  const lpRows: WorkflowStepLpRow[] = rows.map((sr) => {
    const run = runs.find((r) => r.id === sr.workflowRunId);
    const idx = run ? (runIndexById.get(run.id) ?? 0) : 0;
    const labels = run ? lpLabelForRun(run, idx, playbook) : { lpName: "LP", firmName: "—" };
    return {
      id: sr.id,
      ...labels,
      emailStatus: stepRunToEmailStatus(sr.status),
      sentAtLabel: formatShortTimestamp(sr.outputJsonb.sentAt),
      repliedAtLabel: formatShortTimestamp(sr.outputJsonb.repliedAt),
    };
  });

  const metrics = metricsFromStepRuns(rows);
  const followUpBuild = playbook?.followUp?.actionBuild;

  if (isFollowUpStep) {
    return {
      stepId: step.id,
      status: metrics.drafted > 0 || metrics.sent > 0 ? "running" : "idle",
      metrics,
      visibleMetrics: ["drafted", "sent", "skipped"],
      showParameters: true,
      showLpTable: lpRows.length > 0,
      parameters: [
        {
          label: "Draft template",
          value: followUpBuild?.baseSubject
            ? `Subject: ${followUpBuild.baseSubject}`
            : "Follow-up template from workflow builder",
        },
        {
          label: "Cohort template",
          value: followUpBuild?.actionDescription?.trim() || step.description || "—",
        },
        { label: "Timing", value: step.timingLabel ?? step.statusLabel ?? "Per trigger" },
      ],
      lpRows,
      footnote:
        metrics.drafted > 0
          ? "Follow-up drafts are ready in Today — approve and send from the Action Drawer."
          : "Follow-up activates after wait elapses or when Tomo attributes an LP reply.",
    };
  }

  return {
    stepId: step.id,
    status: runs.length > 0 ? "running" : "idle",
    metrics,
    visibleMetrics: ["drafted", "sent", "replied", "skipped"],
    showParameters: true,
    showLpTable: lpRows.length > 0,
    parameters: [
      {
        label: "Primary template",
        value: playbook?.actionBuild?.actionDescription?.trim() || step.title,
      },
      {
        label: "Subject",
        value: playbook?.actionBuild?.baseSubject?.trim() || "—",
      },
    ],
    lpRows,
    footnote: "Primary sends and replies are tracked per LP. Draft review happens in Today.",
  };
}

export function getWorkflowStepMonitoring(
  entry: WorkflowSurfaceEntry,
  step: WorkflowStepNode,
  listId?: string | null
): WorkflowStepMonitoring {
  if (entry.kind !== "user_custom" || entry.status !== "active") {
    return getMockWorkflowStepMonitoring(entry, step);
  }

  const { runs, stepRuns } = getWorkflowRunsForWorkflow(entry.id, listId ?? undefined);
  if (runs.length === 0) {
    return {
      stepId: step.id,
      status: "idle",
      metrics: { drafted: 0, sent: 0, replied: 0, skipped: 0 },
      showParameters: true,
      showLpTable: false,
      parameters: [{ label: "Status", value: "No cohort launch on this list yet" }],
      footnote: "Activate the workflow to enroll LPs and start monitoring.",
    };
  }

  const playbook = loadCustomPlaybooks().find((p) => p.id === entry.id) ?? null;
  return buildCustomWorkflowStepMonitoring(entry, step, playbook, runs, stepRuns);
}
