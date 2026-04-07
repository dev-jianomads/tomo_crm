import type { IntroductionStatus } from "@/lib/mockLpNetwork";

export const LP_INTRO_STORAGE_KEY = "tomo-lp-intro-state";
export const LP_DISMISSED_STORAGE_KEY = "tomo-lp-dismissed";
/** Persisted flag: after “Request introduction”, auto-step to `lp_pending` (demo). */
export const LP_INTRO_AUTO_ADVANCE_KEY = "tomo-lp-intro-auto-advance";

/** `fundId::mandateId` → intro workflow state */
export type LpIntroPersisted = Record<string, { status: IntroductionStatus; updatedAt: string }>;

/** `fundId` → mandate ids hidden with “Not now” */
export type LpDismissedPersisted = Record<string, string[]>;

export function threadStorageKey(fundId: string, mandateId: string): string {
  return `${fundId}::${mandateId}`;
}

/** Parse storage keys produced by `threadStorageKey`. */
export function parseThreadKey(key: string): { fundId: string; mandateId: string } | null {
  const idx = key.indexOf("::");
  if (idx <= 0 || idx >= key.length - 1) return null;
  return { fundId: key.slice(0, idx), mandateId: key.slice(idx + 2) };
}

export function getIntroStatus(
  map: LpIntroPersisted,
  fundId: string,
  mandateId: string
): IntroductionStatus {
  return map[threadStorageKey(fundId, mandateId)]?.status ?? "eligible";
}

export function getThreadMeta(
  map: LpIntroPersisted,
  fundId: string,
  mandateId: string
): { status: IntroductionStatus; updatedAt: string } | undefined {
  return map[threadStorageKey(fundId, mandateId)];
}

/** Allocator-facing list pill (execution-plan style). */
export function introStatusToLpPortalPill(status: IntroductionStatus): string {
  switch (status) {
    case "eligible":
      return "Eligible";
    case "gp_requested":
      return "Pending";
    case "lp_pending":
      return "Review";
    case "lp_approved":
      return "Meeting booked";
    case "connected":
      return "Closed";
  }
}

export function formatIntroUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
