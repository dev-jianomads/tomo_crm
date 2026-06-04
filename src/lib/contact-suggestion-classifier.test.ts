import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyInboundEmail,
  lookupGoldenClassifierFixture,
} from "./contact-suggestion-classifier";

describe("contact-suggestion-classifier", () => {
  it("returns golden fixture for Sarah Lee without LLM", async () => {
    const result = await classifyInboundEmail({
      from: "Sarah Lee <sarah.lee@northbridgefo.com>",
      subject: "Intro",
      body: "Please send deck and DDQ.",
    });
    assert.equal(result.usedFixture, true);
    assert.equal(result.usedLlm, false);
    assert.equal(result.outcome, "suggestion");
    if (result.outcome === "suggestion") {
      assert.equal(result.classification, "likely_investor_relationship");
      assert.equal(result.suggestion.senderEmail, "sarah.lee@northbridgefo.com");
    }
  });

  it("classifies vendor golden email as no suggestion", async () => {
    const result = await classifyInboundEmail({
      from: "Mark Evans <mark.evans@ledgerfundadmin.com>",
      subject: "Demo",
      body: "Fund admin software demo.",
    });
    assert.equal(result.usedFixture, true);
    assert.equal(result.outcome, "no_suggestion");
    if (result.outcome === "no_suggestion") {
      assert.equal(result.classification, "vendor_or_service_provider");
    }
  });

  it("skips exact CRM email match", async () => {
    const result = await classifyInboundEmail({
      from: "Emma Wilson <emma@firm.com>",
      subject: "DDQ",
      body: "Updated DDQ attached.",
      crmMatchConfidence: "exact_email",
      existingContactName: "Emma Wilson",
    });
    assert.equal(result.outcome, "skipped");
    if (result.outcome === "skipped") {
      assert.equal(result.skipReason, "existing_relationship");
    }
  });

  it("lookupGoldenClassifierFixture finds priya fixture", () => {
    assert.notEqual(lookupGoldenClassifierFixture("priya.shah@meridianadvisors.com"), null);
  });
});
