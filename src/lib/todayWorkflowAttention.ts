import type { ActionItem } from "@/lib/mockData";
import {
  normalizeWorkflowSurfaceId,
  workflowSourceIdFromAction,
  workflowSurfaceHref,
} from "@/lib/workflow-id-resolve";
import { resolveWorkflowPillLabelForAction, type WorkflowPillLabel } from "@/lib/workflow-pill-label";

export const UNGROUPED_ATTENTION_KEY = "__ungrouped";
export const UNGROUPED_PILL_LABEL = "Other Tasks";

/** Lower score = more urgent (matches Today action queue sort). */
export function computeActionUrgencyScore(action: ActionItem, todayYmd: string): number {
  const urgencyOrder: Record<string, number> = { blocked: 0, approval: 1, in_progress: 2 };
  const base = urgencyOrder[action.status] ?? 3;
  const overdue = action.dueDate && action.dueDate < todayYmd;
  return base + (overdue ? -0.25 : 0);
}

export type WorkflowAttentionGroup = {
  id: string;
  pillLabel: WorkflowPillLabel;
  /** Surface `workflows.id` for `/workflows?workflow=`; omitted for ungrouped bucket. */
  workflowSurfaceId?: string;
  workflowHref?: string;
  urgencyScore: number;
  items: ActionItem[];
};

function groupKeyForAction(action: ActionItem): string {
  const sourceId = workflowSourceIdFromAction(action);
  if (!sourceId) return UNGROUPED_ATTENTION_KEY;
  return normalizeWorkflowSurfaceId(sourceId) ?? sourceId;
}

/**
 * Group attention actions by workflow attribution. Groups are ordered by most urgent
 * item in each group (urgency-first). Ungrouped bucket is always last.
 */
export function buildWorkflowAttentionGroups(
  sortedActions: ActionItem[],
  todayYmd: string = new Date().toISOString().slice(0, 10),
): WorkflowAttentionGroup[] {
  const byKey = new Map<string, ActionItem[]>();
  for (const action of sortedActions) {
    const key = groupKeyForAction(action);
    const list = byKey.get(key) ?? [];
    list.push(action);
    byKey.set(key, list);
  }

  const groups: WorkflowAttentionGroup[] = [];

  for (const [key, items] of byKey) {
    if (key === UNGROUPED_ATTENTION_KEY) continue;
    const urgencyScore = Math.min(...items.map((a) => computeActionUrgencyScore(a, todayYmd)));
    const sample = items[0]!;
    const pillLabel = resolveWorkflowPillLabelForAction(sample) ?? "Workflow";
    groups.push({
      id: key,
      pillLabel,
      workflowSurfaceId: key,
      workflowHref: workflowSurfaceHref(key),
      urgencyScore,
      items,
    });
  }

  groups.sort((a, b) => a.urgencyScore - b.urgencyScore);

  const ungrouped = byKey.get(UNGROUPED_ATTENTION_KEY);
  if (ungrouped?.length) {
    groups.push({
      id: UNGROUPED_ATTENTION_KEY,
      pillLabel: UNGROUPED_PILL_LABEL,
      urgencyScore: Math.min(...ungrouped.map((a) => computeActionUrgencyScore(a, todayYmd))),
      items: ungrouped,
    });
  }

  return groups;
}

/** Default expanded: most urgent group plus any group with 2+ cards. */
export function defaultExpandedWorkflowGroupIds(groups: WorkflowAttentionGroup[]): Set<string> {
  const expanded = new Set<string>();
  if (groups.length === 0) return expanded;
  const sorted = [...groups].sort((a, b) => a.urgencyScore - b.urgencyScore);
  expanded.add(sorted[0]!.id);
  for (const g of groups) {
    if (g.items.length >= 2) expanded.add(g.id);
  }
  return expanded;
}
