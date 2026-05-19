import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import { workflowDefinitionFromCustomStored } from "@/lib/customPlaybooks";
import type { WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

/** Map a user-built custom playbook to the workflows surface accordion card shape. */
export function customPlaybookToSurfaceEntry(c: CustomPlaybookStored): WorkflowSurfaceEntry {
  const def = workflowDefinitionFromCustomStored(c);

  return {
    id: c.id,
    name: c.name,
    kind: "configurable_template",
    status: "inactive",
    badgeLabel: "Custom build",
    summary: c.action,
    triggerLabel: c.trigger,
    stats: [{ label: "Not running", value: "-", tone: "muted" }],
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
        title: step.name,
        description: step.description,
        statusLabel: "Action",
      })),
    ],
    attentionItems: [],
    stateSummary: {
      title: "Saved on this list — turn on when ready to run",
      segments: [
        { id: `${c.id}-draft`, label: "Draft", drafted: 0, sent: 0, waiting: 0 },
      ],
      replied: 0,
      readyForOutcome: 0,
      skipped: 0,
    },
    runHistory: [],
  };
}
