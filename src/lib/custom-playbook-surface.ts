import type { CustomPlaybookStored } from "@/lib/custom-playbook-schema";
import {
  actionStepName,
  formatActionSpecForWorkflowDescription,
  validateStoredFollowUp,
} from "@/lib/custom-playbook-schema";
import {
  formatFollowUpTriggerLabel,
  workflowCustomStepIds,
  type WorkflowFollowUpTrigger,
} from "@/lib/workflow-follow-up-design";
import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";
import type { WorkflowDefinition, WorkflowStep } from "@/lib/workflow-templates";

export function hasValidStoredFollowUp(c: CustomPlaybookStored): boolean {
  if (!c.followUp) return false;
  return validateStoredFollowUp(c.followUp).ok;
}

/** Short timing chip for inline wait nodes (e.g. `7d`). */
export function followUpWaitTimingLabel(spec: WorkflowFollowUpTrigger): string | undefined {
  if (spec.kind !== "wait") return undefined;
  return `${spec.days}d`;
}

function primaryActionTitle(c: CustomPlaybookStored): string {
  return c.actionBuild?.actionDescription?.trim() || actionStepName(c.actionSpec!) || "Primary action";
}

function followUpActionTitle(followUp: NonNullable<CustomPlaybookStored["followUp"]>): string {
  return (
    followUp.actionBuild?.actionDescription?.trim() ||
    (followUp.actionSpec?.kind === "send_email" ? "Follow-up email" : followUp.action)
  );
}

/** Collapsed card summary — includes follow-up when configured. */
export function customWorkflowCardSummary(c: CustomPlaybookStored): string {
  if (!hasValidStoredFollowUp(c) || !c.followUp) return c.action;
  const triggerHint = c.followUp.triggerSpec
    ? formatFollowUpTriggerLabel(c.followUp.triggerSpec)
    : c.followUp.trigger;
  return `${c.action} · Follow-up after ${triggerHint.toLowerCase()}`;
}

/** Process-flow nodes for accordion expanded view (stable ids for Phase 3 runs). */
export function customPlaybookSurfaceSteps(c: CustomPlaybookStored): WorkflowStepNode[] {
  const ids = workflowCustomStepIds(c.id);
  const nodes: WorkflowStepNode[] = [
    {
      id: ids.trigger,
      nodeType: "trigger",
      actionType: "readonly",
      title: "When",
      description: c.trigger,
      statusLabel: "Trigger",
    },
    {
      id: ids.primary,
      nodeType: "action",
      actionType: c.actionBuild ? "single_draft" : "readonly",
      title: primaryActionTitle(c),
      description:
        c.actionBuild?.actionDescription?.trim() ||
        (c.actionSpec ? formatActionSpecForWorkflowDescription(c.actionSpec) : c.action),
      timingLabel: "Day 0",
      statusLabel: "Draft",
    },
  ];

  const followUp = c.followUp;
  if (!followUp || !hasValidStoredFollowUp(c)) return nodes;

  const spec = followUp.triggerSpec;
  if (spec?.kind === "wait") {
    nodes.push({
      id: ids.wait,
      nodeType: "wait",
      actionType: "settings",
      title: "Wait",
      description: formatFollowUpTriggerLabel(spec),
      timingLabel: followUpWaitTimingLabel(spec),
      statusLabel: "Wait",
      locked: true,
    });
  }

  nodes.push({
    id: ids.followUp,
    nodeType: "action",
    actionType: followUp.actionBuild ? "single_draft" : "readonly",
    title: followUpActionTitle(followUp),
    description:
      followUp.actionBuild?.actionDescription?.trim() ||
      (followUp.actionSpec?.kind === "send_email"
        ? `Subject: ${followUp.actionSpec.subject}`
        : followUp.action),
    timingLabel: spec?.kind === "on_inbound_reply" ? "On reply" : undefined,
    statusLabel: "Follow-up",
  });

  return nodes;
}

/** Map a user-built custom playbook to the workflows surface accordion card shape. */
export function customPlaybookToSurfaceEntry(
  c: CustomPlaybookStored,
  activated = false
): WorkflowSurfaceEntry {
  const withFollowUp = hasValidStoredFollowUp(c);
  const steps = customPlaybookSurfaceSteps(c);

  const meta: WorkflowSurfaceEntry["meta"] = [
    { label: "Trigger", value: c.trigger },
    { label: "Primary action", value: c.action },
  ];
  if (withFollowUp && c.followUp) {
    meta.push(
      {
        label: "Follow-up when",
        value: c.followUp.triggerSpec
          ? formatFollowUpTriggerLabel(c.followUp.triggerSpec)
          : c.followUp.trigger,
      },
      { label: "Follow-up action", value: c.followUp.action }
    );
  }

  const segments: WorkflowSurfaceEntry["stateSummary"]["segments"] = [
    { id: `${c.id}-primary`, label: "Primary action", drafted: 0, sent: 0, waiting: 0 },
  ];
  if (withFollowUp) {
    segments.push({ id: `${c.id}-follow-up`, label: "Follow-up", drafted: 0, sent: 0, waiting: 0 });
  }

  return {
    id: c.id,
    name: c.name,
    kind: "user_custom",
    status: activated ? "active" : "inactive",
    badgeLabel: withFollowUp ? "Custom · follow-up" : "Custom build",
    summary: customWorkflowCardSummary(c),
    triggerLabel: c.trigger,
    stats: activated
      ? [{ label: "On this list", value: "Active", tone: "good" }]
      : [{ label: "Status", value: "Saved", tone: "muted" }],
    meta,
    steps,
    attentionItems: activated
      ? []
      : [
          {
            id: `${c.id}-activate`,
            label: withFollowUp
              ? "saved — primary + follow-up · activate to run"
              : "saved — activate to run on this list",
            count: 1,
            actionLabel: "Activate below",
          },
        ],
    stateSummary: {
      title: activated
        ? withFollowUp
          ? "Monitoring primary and follow-up on this list"
          : "Monitoring this workflow on the list"
        : withFollowUp
          ? "Saved — activate when ready (primary + follow-up)"
          : "Saved on this list — activate when ready to run",
      segments,
      replied: 0,
      readyForOutcome: 0,
      skipped: 0,
    },
    runHistory: [],
  };
}

export function isUserCustomWorkflowEntry(entry: WorkflowSurfaceEntry): boolean {
  return entry.kind === "user_custom";
}
