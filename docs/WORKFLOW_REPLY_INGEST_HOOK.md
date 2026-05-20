# Workflow reply ingest hook (Phase 4)

When inbound email is ingested and matched to an outbound workflow send, call the same pipeline as `POST /api/workflows/attribute-reply` and persist advancement side effects.

## Steps

1. Load `workflow_runs`, `workflow_step_runs`, and outbound `lp_interactions` for the LP/thread.
2. `POST /api/workflows/attribute-reply` with `{ inbound, runs, stepRuns, outboundInteractions }`.
3. If `attributed` and `updatedStepRun`:
   - Update the primary step run row to `replied`.
4. If `advancedStepRuns` is present (follow-up workflows):
   - Merge step run rows (follow-up → `skipped` for wait+no_reply, or `in_progress` for on_inbound_reply).
5. On a schedule (or mock read of `/workflows`), run wait-elapsed advancement for `wait` triggers without reply.

## Mock / dev

`attributeWorkflowInboundReply` in `workflow-run-storage.ts` runs reply advancement and saves locally.

`getWorkflowRunsForWorkflow` refreshes wait-elapsed advancement when the workflows page loads run history.

## Response fields

| Field | Meaning |
|-------|---------|
| `updatedStepRun` | Primary step run after reply attribution |
| `advancedStepRuns` | Full step run list when follow-up leg changed |
| `advanceEvents` | e.g. `follow_up_skipped_lp_replied`, `follow_up_activated_on_reply` |
