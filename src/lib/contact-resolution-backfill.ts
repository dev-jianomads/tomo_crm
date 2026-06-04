/**
 * Mock §3.3a contact resolution backfill — links inbound rows and updates LP state client-side.
 * Production: SQS `contact-resolution-backfill` + `lp_interactions` + hot path (BR-3.3.13).
 */

import type { ContactSuggestion } from "@/lib/contact-suggestions";
import type { Band, MomentumDirection, Relationship } from "@/lib/mockData";
import { normalizeEmail } from "@/lib/relationship-email";

export const CONTACT_RESOLUTION_LOOKBACK_DAYS = 90;
export const CONTACT_RESOLUTION_LOOKAHEAD_DAYS = 14;
export const CONTACT_RESOLUTION_MOCK_INTERACTIONS_KEY =
  "tomo-contact-resolution-linked-interactions-v1";

/** Days of prior GP-side silence before mock enqueues Signal 2 (re-engagement). */
export const RE_ENGAGEMENT_SILENCE_THRESHOLD_DAYS = 45;

export type MockLinkedInteraction = {
  id: string;
  lpContactId: string;
  senderEmail: string;
  subject?: string;
  bodyPreview?: string;
  interactedAt: string;
  direction: "inbound";
  isMeaningfulTouch: boolean;
};

export type ContactResolutionBackfillResult = {
  senderEmail: string;
  linkedInteractionCount: number;
  meaningfulTouchCount: number;
  reEngagementQueued: boolean;
  hotPathQueued: boolean;
  linkedInteractions: MockLinkedInteraction[];
};

export type RunContactResolutionBackfillInput = {
  relationship: Relationship;
  senderEmail: string;
  suggestion?: Pick<
    ContactSuggestion,
    "sourceSubject" | "sourceBodyPreview" | "prefill" | "createdAt"
  >;
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Heuristic mock: 1 primary inbound + optional older thread in lookback window. */
export function estimateMockLinkedInteractions(
  input: RunContactResolutionBackfillInput
): MockLinkedInteraction[] {
  const email = normalizeEmail(input.senderEmail);
  const subject = input.suggestion?.sourceSubject;
  const body = input.suggestion?.sourceBodyPreview;
  const recentAt = input.suggestion?.createdAt ?? new Date().toISOString();

  const primary: MockLinkedInteraction = {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lpContactId: input.relationship.id,
    senderEmail: email,
    subject,
    bodyPreview: body,
    interactedAt: recentAt,
    direction: "inbound",
    isMeaningfulTouch: true,
  };

  const rows = [primary];

  if (body && body.length > 120) {
    rows.push({
      id: `li-${Date.now()}-t2-${Math.random().toString(36).slice(2, 7)}`,
      lpContactId: input.relationship.id,
      senderEmail: email,
      subject: subject ? `Re: ${subject}` : "Earlier thread",
      bodyPreview: body.slice(0, 80),
      interactedAt: daysAgoIso(12),
      direction: "inbound",
      isMeaningfulTouch: true,
    });
  }

  return rows;
}

export function runContactResolutionBackfill(
  input: RunContactResolutionBackfillInput
): ContactResolutionBackfillResult {
  const linkedInteractions = estimateMockLinkedInteractions(input);
  const meaningfulTouchCount = linkedInteractions.filter((r) => r.isMeaningfulTouch).length;
  const priorDays = input.relationship.daysSinceLastMeaningfulContact;
  const reEngagementQueued = priorDays >= RE_ENGAGEMENT_SILENCE_THRESHOLD_DAYS;

  return {
    senderEmail: normalizeEmail(input.senderEmail),
    linkedInteractionCount: linkedInteractions.length,
    meaningfulTouchCount,
    reEngagementQueued,
    hotPathQueued: meaningfulTouchCount > 0,
    linkedInteractions,
  };
}

function momentumAfterBackfill(current: MomentumDirection): MomentumDirection {
  if (current === "Cooling") return "Heating up";
  return current;
}

function bandAfterBackfill(current: Band, momentum: MomentumDirection): Band {
  if (momentum === "Heating up") return "Heating Up";
  if (momentum === "Cooling") return "Cooling";
  return current;
}

/** Apply mock hot-path LP state updates after backfill (§3.3a item 7). */
export function applyBackfillToRelationship(
  relationship: Relationship,
  result: ContactResolutionBackfillResult
): Relationship {
  const momentumDirection = momentumAfterBackfill(relationship.momentumDirection);
  const nextMove =
    result.linkedInteractions[0]?.subject != null
      ? `Review linked inbound — ${result.linkedInteractions[0].subject}`
      : relationship.nextMove;

  return {
    ...relationship,
    primaryEmail: relationship.primaryEmail || result.senderEmail,
    daysSinceLastMeaningfulContact: 0,
    meaningfulTouchesSinceStageEntry:
      (relationship.meaningfulTouchesSinceStageEntry ?? 0) + result.meaningfulTouchCount,
    momentumDirection,
    band: bandAfterBackfill(relationship.band, momentumDirection),
    openLoops: relationship.openLoops + (result.linkedInteractionCount > 0 ? 1 : 0),
    nextMove,
  };
}

export function appendMockLinkedInteractions(rows: MockLinkedInteraction[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CONTACT_RESOLUTION_MOCK_INTERACTIONS_KEY);
    const prev = raw ? (JSON.parse(raw) as MockLinkedInteraction[]) : [];
    window.localStorage.setItem(
      CONTACT_RESOLUTION_MOCK_INTERACTIONS_KEY,
      JSON.stringify([...prev, ...rows])
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getMockLinkedInteractionsForContact(lpContactId: string): MockLinkedInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONTACT_RESOLUTION_MOCK_INTERACTIONS_KEY);
    const all = raw ? (JSON.parse(raw) as MockLinkedInteraction[]) : [];
    return all.filter((r) => r.lpContactId === lpContactId);
  } catch {
    return [];
  }
}

export function formatContactResolutionBackfillToast(result: ContactResolutionBackfillResult): {
  title: string;
  description: string;
} {
  const parts = [
    `${result.linkedInteractionCount} inbound email${result.linkedInteractionCount === 1 ? "" : "s"} linked (${CONTACT_RESOLUTION_LOOKBACK_DAYS}d lookback)`,
    `${result.meaningfulTouchCount} meaningful touch${result.meaningfulTouchCount === 1 ? "" : "es"}`,
  ];
  if (result.hotPathQueued) {
    parts.push("silence refresh queued");
  }
  if (result.reEngagementQueued) {
    parts.push("re-engagement (Signal 2) queued");
  }
  return {
    title: "Contact resolution backfill complete",
    description: parts.join(" · "),
  };
}
