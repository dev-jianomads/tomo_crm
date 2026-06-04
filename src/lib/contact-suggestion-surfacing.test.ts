import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactSuggestion } from "./contact-suggestions";
import {
  partitionContactSuggestionsForSurfacing,
  RELATIONSHIP_SUGGESTION_INTERRUPT_CAP,
} from "./contact-suggestion-surfacing";

function mockSuggestion(
  partial: Partial<ContactSuggestion> & Pick<ContactSuggestion, "id" | "classification" | "confidence">
): ContactSuggestion {
  return {
    createdAt: "2026-06-01T00:00:00.000Z",
    senderEmail: "a@b.com",
    senderDomain: "b.com",
    reason: "test",
    evidence: ["e"],
    prefill: {
      person_name: "A",
      email: "a@b.com",
      firm_name: "B",
      domain: "b.com",
    },
    status: "pending",
    ...partial,
  };
}

describe("contact-suggestion-surfacing", () => {
  it("caps likely Today interrupts at 3", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      mockSuggestion({
        id: `l${i}`,
        classification: "likely_investor_relationship",
        confidence: 80 + i,
        createdAt: `2026-06-0${i + 1}T00:00:00.000Z`,
      })
    );
    const { todayInterrupts, settingsQueue } = partitionContactSuggestionsForSurfacing(rows);
    assert.equal(todayInterrupts.length, RELATIONSHIP_SUGGESTION_INTERRUPT_CAP);
    assert.equal(settingsQueue.length, 2);
    assert.ok(settingsQueue.every((s) => s.classification === "likely_investor_relationship"));
  });

  it("puts maybe rows in settings queue only", () => {
    const { todayInterrupts, settingsQueue } = partitionContactSuggestionsForSurfacing([
      mockSuggestion({ id: "m1", classification: "maybe_investor_relationship", confidence: 60 }),
    ]);
    assert.equal(todayInterrupts.length, 0);
    assert.equal(settingsQueue.length, 1);
  });
});
