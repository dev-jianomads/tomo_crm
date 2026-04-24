import type { ActionItem } from "@/lib/mockData";

/**
 * “Today’s” attention column vs the collapsible “Previous” backlog.
 * In production, this would be a server field (e.g. surfaced-for date);
 * the mock uses a day offset so dates stay correct relative to the user’s current day.
 */
export function getLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isTodayAttentionSlot(a: ActionItem): boolean {
  return (a.attentionListDayOffset ?? 0) === 0;
}

/** Group heading for a prior attention bucket (e.g. “Yesterday — Apr 24”, “Tue, Apr 22”). */
export function formatPreviousAttentionDayHeading(anchor: Date, offset: number): string {
  if (offset <= 0) return "Today";
  const d = new Date(anchor);
  d.setDate(d.getDate() - offset);
  const dayPart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (offset === 1) return `Yesterday — ${dayPart}`;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
