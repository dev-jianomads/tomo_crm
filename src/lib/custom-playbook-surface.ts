import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import { workflowDefinitionFromCustomStored } from "@/lib/customPlaybooks";
import type { WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

/** Map a user-built custom playbook to the workflows surface accordion card shape. */
export function customPlaybookToSurfaceEntry(
  c: CustomPlaybookStored,
  activated = false
): WorkflowSurfaceEntry {
  const def = workflowDefinitionFromCustomStored(c);

  return {
    id: c.id,
    name: c.name,
    kind: "user_custom",
    status: activated ? "active" : "inactive",
    badgeLabel: "Custom build",
    summary: c.action,
    triggerLabel: c.trigger,
    stats: activated
      ? [{ label: "On this list", value: "Active", tone: "good" }]
      : [{ label: "Status", value: "Saved", tone: "muted" }],
    meta: [
      { label: "Trigger", value: c.trigger },
      { label: "Primary action", value: c.action },
    ],
    steps: [
      {
        id: `${c.id}-trigger`,
        nodeType: "trigger",
        actionType: "readonly",
        title: "When",
        description: c.trigger,
        statusLabel: "Trigger",
      },
      ...def.steps.map((step, index) => ({
        id: `${c.id}-step-${index}`,
        nodeType: "action" as const,
        actionType: "readonly" as const,
        title:
          index === 0 && c.actionBuild?.actionDescription?.trim()
            ? c.actionBuild.actionDescription.trim()
            : step.name,
        description: step.description,
        statusLabel: "Action",
      })),
    ],
    attentionItems: activated
      ? []
      : [{ id: `${c.id}-activate`, label: "saved — activate to run on this list", count: 1, actionLabel: "Activate below" }],
    stateSummary: {
      title: activated ? "Monitoring this workflow on the list" : "Saved on this list — activate when ready to run",
      segments: [{ id: `${c.id}-action`, label: "Primary action", drafted: 0, sent: 0, waiting: 0 }],
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
