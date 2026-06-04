import type { ContactSuggestion } from "@/lib/contact-suggestions";

/** §3.3a BR-3.3a.6 — max Today interrupt cards per local calendar day. */
export const RELATIONSHIP_SUGGESTION_INTERRUPT_CAP = 3;

/** §3.3a — likely tier eligible for Today when at or above this score. */
export const RELATIONSHIP_SUGGESTION_LIKELY_MIN_CONFIDENCE = 70;

export function isOpenContactSuggestion(s: ContactSuggestion): boolean {
  return s.status === "pending" || s.status === "surfaced";
}

function sortByPriority(a: ContactSuggestion, b: ContactSuggestion): number {
  if (b.confidence !== a.confidence) return b.confidence - a.confidence;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export type ContactSuggestionSurfacing = {
  /** Up to 3 likely suggestions for Today → Other Tasks (BR-3.3a.6). */
  todayInterrupts: ContactSuggestion[];
  /** Maybe + likely overflow — Settings → Suggested contacts (BR-3.8.14). */
  settingsQueue: ContactSuggestion[];
};

/**
 * Partition open suggestions for Today interrupts vs Settings queue.
 * Rows on Today are excluded from the settings list (no duplicate ids).
 */
export function partitionContactSuggestionsForSurfacing(
  suggestions: ContactSuggestion[]
): ContactSuggestionSurfacing {
  const open = suggestions.filter(isOpenContactSuggestion);

  const likelyEligible = open
    .filter(
      (s) =>
        s.classification === "likely_investor_relationship" &&
        s.confidence >= RELATIONSHIP_SUGGESTION_LIKELY_MIN_CONFIDENCE
    )
    .sort(sortByPriority);

  const todayInterrupts = likelyEligible.slice(0, RELATIONSHIP_SUGGESTION_INTERRUPT_CAP);
  const todayIds = new Set(todayInterrupts.map((s) => s.id));

  const maybeQueue = open
    .filter((s) => s.classification === "maybe_investor_relationship" && !todayIds.has(s.id))
    .sort(sortByPriority);

  const overflowLikely = likelyEligible
    .slice(RELATIONSHIP_SUGGESTION_INTERRUPT_CAP)
    .filter((s) => !todayIds.has(s.id));

  const settingsQueue = [...maybeQueue, ...overflowLikely].sort(sortByPriority);

  return { todayInterrupts, settingsQueue };
}

export function countSettingsQueueSuggestions(suggestions: ContactSuggestion[]): number {
  return partitionContactSuggestionsForSurfacing(suggestions).settingsQueue.length;
}

export function classificationHeadline(classification: ContactSuggestion["classification"]): string {
  if (classification === "likely_investor_relationship") {
    return "Possible new investor relationship";
  }
  if (classification === "maybe_investor_relationship") {
    return "Possible investor — review";
  }
  return "Contact suggestion";
}
