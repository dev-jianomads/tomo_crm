import type { IntroductionStatus } from "@/lib/mockLpNetwork";

export const LP_INTRO_STORAGE_KEY = "tomo-lp-intro-state";
export const LP_DISMISSED_STORAGE_KEY = "tomo-lp-dismissed";

/** `fundId::mandateId` → intro workflow state */
export type LpIntroPersisted = Record<string, { status: IntroductionStatus; updatedAt: string }>;

/** `fundId` → mandate ids hidden with “Not now” */
export type LpDismissedPersisted = Record<string, string[]>;

export function threadStorageKey(fundId: string, mandateId: string): string {
  return `${fundId}::${mandateId}`;
}

export function getIntroStatus(
  map: LpIntroPersisted,
  fundId: string,
  mandateId: string
): IntroductionStatus {
  return map[threadStorageKey(fundId, mandateId)]?.status ?? "eligible";
}
