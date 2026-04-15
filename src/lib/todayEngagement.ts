/**
 * Tracks which attention-queue actions were surfaced vs opened (engaged).
 * Persists in localStorage (per browser). Server-side user DB can replace this later.
 */

import type { ActionItem } from "@/lib/mockData";

const STORAGE_KEY = "tomo-today-action-engagement-v1";

export type TodayEngagementState = {
  version: 1;
  /** actionId → first time we showed it in the attention strip */
  surfacedAt: Record<string, number>;
  /** actionId → last time user opened the row / drawer */
  engagedAt: Record<string, number>;
};

const emptyState = (): TodayEngagementState => ({
  version: 1,
  surfacedAt: {},
  engagedAt: {},
});

export function loadTodayEngagementState(): TodayEngagementState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as TodayEngagementState;
    if (parsed?.version !== 1 || typeof parsed.surfacedAt !== "object" || typeof parsed.engagedAt !== "object") {
      return emptyState();
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveTodayEngagementState(state: TodayEngagementState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

/** Mark attention-queue ids as surfaced (idempotent timestamps). */
export function mergeSurfaced(
  prev: TodayEngagementState,
  attentionIds: string[],
  now = Date.now()
): TodayEngagementState {
  const surfacedAt = { ...prev.surfacedAt };
  let changed = false;
  for (const id of attentionIds) {
    if (surfacedAt[id] == null) {
      surfacedAt[id] = now;
      changed = true;
    }
  }
  if (!changed) return prev;
  return { ...prev, surfacedAt };
}

export function mergeEngaged(prev: TodayEngagementState, actionId: string, now = Date.now()): TodayEngagementState {
  return {
    ...prev,
    engagedAt: { ...prev.engagedAt, [actionId]: now },
  };
}

/**
 * Actions that were surfaced but never engaged (drawer not opened), still present in CRM list.
 * Oldest surfaced first, capped.
 */
export function getStillInTodoActions(
  allActions: ActionItem[],
  state: TodayEngagementState,
  cap = 5
): ActionItem[] {
  const { surfacedAt, engagedAt } = state;
  const candidates: ActionItem[] = [];
  for (const a of allActions) {
    if (surfacedAt[a.id] == null) continue;
    if (engagedAt[a.id] != null) continue;
    candidates.push(a);
  }
  candidates.sort((a, b) => surfacedAt[a.id]! - surfacedAt[b.id]!);
  return candidates.slice(0, cap);
}

export function resetTodayEngagement(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
