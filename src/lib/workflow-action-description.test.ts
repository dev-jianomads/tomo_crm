import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveWorkflowActionDescription,
  isMetaActionDescription,
  shortenToProcessLabel,
} from "./workflow-action-description";

test("extracts and shortens objective from optimised prompt", () => {
  const instruction = [
    "**Objective**: Write personalized cover letter emails inviting LPs to the Melbourne Roadshow.",
    "**Tone**: Professional",
  ].join("\n");

  const label = deriveWorkflowActionDescription({
    instruction,
    actionDescription: "Lock in the Optimised prompt for drafting cohort outreach emails",
  });

  assert.equal(isMetaActionDescription(label), false);
  assert.ok(label.split(/\s+/).length <= 7);
  assert.match(label, /Melbourne Roadshow/i);
});

test("rejects meta lock-in labels from the tool", () => {
  assert.equal(
    isMetaActionDescription("Lock in the Optimised prompt for drafting cohort outreach emails"),
    true
  );
});

test("shortenToProcessLabel caps word count", () => {
  const s = shortenToProcessLabel(
    "Write personalized cover letter emails inviting LPs to the Melbourne Roadshow"
  );
  assert.ok(s.split(/\s+/).length <= 7);
});
