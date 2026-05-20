import type {
  WorkflowAttentionItem,
  WorkflowMetaItem,
  WorkflowStat,
} from "@/lib/workflow-surface-mock";

/** Surface entries kept in mock data but not shown on /workflows. */
export const WORKFLOW_SURFACE_UI_HIDDEN_IDS = new Set<string>(["wf-f7-three-touch"]);

export function isWorkflowSurfaceVisibleInUi(workflowId: string): boolean {
  return !WORKFLOW_SURFACE_UI_HIDDEN_IDS.has(workflowId);
}

const OUTBOUND_SAFETY_LABEL = "outbound safety";

function isApprovalRelatedAttention(item: WorkflowAttentionItem): boolean {
  const label = item.label.toLowerCase();
  const action = item.actionLabel.toLowerCase();
  return (
    label.includes("awaiting approval") ||
    label.includes("draft waiting") ||
    label.includes("drafts awaiting") ||
    action.includes("review draft") ||
    action === "review now" ||
    action.includes("review drafts")
  );
}

/** Meta rows shown on the expanded workflow card (outbound safety stays in data, hidden here). */
export function visibleWorkflowMeta(meta: WorkflowMetaItem[]): WorkflowMetaItem[] {
  return meta.filter((item) => item.label.toLowerCase() !== OUTBOUND_SAFETY_LABEL);
}

/** Header stats — drop approval-queue counters on monitor-only workflows. */
export function visibleWorkflowStats(stats: WorkflowStat[]): WorkflowStat[] {
  return stats.filter((stat) => !stat.label.toLowerCase().includes("awaiting approval"));
}

/** Attention strip items — monitoring signals only, no draft-approval queue. */
export function visibleWorkflowAttentionItems(items: WorkflowAttentionItem[]): WorkflowAttentionItem[] {
  return items.filter((item) => !isApprovalRelatedAttention(item));
}
