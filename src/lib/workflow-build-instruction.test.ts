import assert from "node:assert/strict";
import test from "node:test";
import { buildCohortDraftInstruction } from "./workflow-build-instruction";

test("buildCohortDraftInstruction merges workflow trigger and context", () => {
  const instruction = buildCohortDraftInstruction({
    workflowName: "Melbourne Roadshow",
    trigger: "May 29, 2026",
    contextText: "Invite LP to roadshow",
  });
  assert.match(instruction, /Melbourne Roadshow/);
  assert.match(instruction, /May 29/);
  assert.match(instruction, /Invite LP/);
});
