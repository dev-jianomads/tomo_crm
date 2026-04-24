import type { ActionItem } from "@/lib/mockData";
import { formatPreviousAttentionDayHeading } from "@/lib/todayAttentionDates";

export type ActionSessionOutcome = "approved" | "later" | "dismissed" | undefined;

/**
 * Eligible for the “Previous” strip: past calendar days’ backlog, or “Do later” from today.
 * Approved / dismissed are removed from both columns.
 */
export function isInPreviousAttentionColumn(
  a: ActionItem,
  outcome: ActionSessionOutcome,
): boolean {
  if (outcome === "approved" || outcome === "dismissed") return false;
  const offset = a.attentionListDayOffset ?? 0;
  if (offset > 0) return true;
  if (offset === 0 && outcome === "later") return true;
  return false;
}

export type PreviousAttentionGroup = {
  /** Stable key for React */
  id: string;
  heading: string;
  items: ActionItem[];
};

const DEFERRED_KEY = "deferred";

/**
 * Group previous-day + deferred items for the collapsible “Previous” section.
 * Order: Deferred first, then by day (most recent day first).
 */
export function buildPreviousAttentionGroups(
  sortedActions: ActionItem[],
  outcomeById: Record<string, "approved" | "later" | "dismissed">,
  anchor: Date = new Date(),
): PreviousAttentionGroup[] {
  const items = sortedActions.filter((a) => isInPreviousAttentionColumn(a, outcomeById[a.id]));
  if (items.length === 0) return [];

  const byKey = new Map<string, ActionItem[]>();
  for (const a of items) {
    const out = outcomeById[a.id];
    const offset = a.attentionListDayOffset ?? 0;
    const key =
      offset === 0 && out === "later" ? DEFERRED_KEY : `day:${String(offset).padStart(2, "0")}`;
    const list = byKey.get(key) ?? [];
    list.push(a);
    byKey.set(key, list);
  }

  const groups: PreviousAttentionGroup[] = [];

  const deferred = byKey.get(DEFERRED_KEY);
  if (deferred?.length) {
    groups.push({
      id: DEFERRED_KEY,
      heading: "Deferred",
      items: deferred,
    });
  }

  const dayKeys = [...byKey.keys()]
    .filter((k) => k.startsWith("day:"))
    .sort((a, b) => {
      const na = parseInt(a.slice(4), 10);
      const nb = parseInt(b.slice(4), 10);
      return na - nb;
    });

  for (const dk of dayKeys) {
    const list = byKey.get(dk);
    if (!list?.length) continue;
    const offset = parseInt(dk.slice(4), 10);
    const heading = formatPreviousAttentionDayHeading(anchor, offset);
    groups.push({
      id: dk,
      heading,
      items: list,
    });
  }

  return groups;
}

export function previousAttentionCount(
  sortedActions: ActionItem[],
  outcomeById: Record<string, "approved" | "later" | "dismissed">,
): number {
  return sortedActions.filter((a) => isInPreviousAttentionColumn(a, outcomeById[a.id])).length;
}
