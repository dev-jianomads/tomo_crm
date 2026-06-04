import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Relationship } from "./mockData";
import {
  applyBackfillToRelationship,
  RE_ENGAGEMENT_SILENCE_THRESHOLD_DAYS,
  runContactResolutionBackfill,
} from "./contact-resolution-backfill";

function baseRel(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: "lp-1",
    name: "Sarah Lee",
    firm: "Northbridge FO",
    primaryEmail: "sarah.lee@northbridgefo.com",
    daysSinceLastMeaningfulContact: 50,
    stage: "Sourced",
    momentumDirection: "Cooling",
    tier: "Tier 2",
    relationshipOwner: "You",
    investorType: "Family office",
    strategyFit: "Active mandate",
    strategyType: "Long/short equity",
    lpLocation: "North America",
    investmentRemit: "Global",
    typicalCheckSize: "$25–50M",
    fundSizePreference: "No cap",
    source: "Direct",
    lastFundHistory: "New prospect",
    decisionTimeline: "Q2",
    fiscalYearEnd: "Dec",
    consultantDependent: "Direct",
    esgRequired: "No",
    nextMove: "Follow up",
    openLoops: 1,
    band: "Cooling",
    meaningfulTouchesSinceStageEntry: 0,
    ...overrides,
  };
}

describe("contact-resolution-backfill", () => {
  it("queues re-engagement when prior silence exceeds threshold", () => {
    const rel = baseRel({ daysSinceLastMeaningfulContact: RE_ENGAGEMENT_SILENCE_THRESHOLD_DAYS });
    const result = runContactResolutionBackfill({
      relationship: rel,
      senderEmail: "sarah.lee@northbridgefo.com",
    });
    assert.equal(result.reEngagementQueued, true);
    assert.ok(result.linkedInteractionCount >= 1);
  });

  it("resets days since touch and increments touches in stage", () => {
    const rel = baseRel();
    const result = runContactResolutionBackfill({
      relationship: rel,
      senderEmail: "sarah.lee@northbridgefo.com",
    });
    const patched = applyBackfillToRelationship(rel, result);
    assert.equal(patched.daysSinceLastMeaningfulContact, 0);
    assert.ok((patched.meaningfulTouchesSinceStageEntry ?? 0) >= 1);
    assert.equal(patched.momentumDirection, "Heating up");
  });
});
