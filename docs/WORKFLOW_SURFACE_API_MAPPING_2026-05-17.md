# Workflow surface — mock to production API mapping (2026-05-17)

## Purpose

Phase 7 defines how the UI contract in `src/lib/workflow-surface-mock.ts` maps onto the canonical CRM tables described in **TOMO V1 SRS §6.2.6** (`workflows`, `workflow_steps`, `workflow_runs`, `workflow_step_runs`, `outbound_safety_log`) and **§6.2** `tomo_action_log`. The goal is a **data-source swap** (`GET /api/...` or server component loader) with **minimal component churn**: responses should stay close to `WorkflowSurfaceEntry` and sibling DTO shapes used by `/workflows`.

## Stability rule

Treat **`WorkflowSurfaceEntry`** (and the types it composes) as the **public read DTO** for the workflows control room. New production-only fields should be **additive** (optional properties) until a breaking version is intentional.

## Primary bundle: one workflow card

A single expanded workflow card is assembled from:

| Concern | Primary tables | Notes |
|--------|----------------|-------|
| Definition + parameters | `workflows` | `workflow_kind`, `template_id`, `parameters_jsonb`, `trigger_*`, `is_active`, `description` |
| Step graph | `workflow_steps` | Ordered `step_index`; UI `actionType` / `nodeType` live in `config_jsonb` or derived columns |
| Cohort / list context | `workflows.target_list_filter_jsonb` + list membership APIs | Selected list on `/workflows` is workspace context, not duplicated on every row |
| Aggregated stats | `workflow_runs`, `workflow_step_runs` | Counts for “running”, “done last 30d”, etc. |
| Meta strip | Mix of aggregates + recent `tomo_action_log` / signals | “Last activity”, “Outbound safety” lines |
| Attention row | `workflow_step_runs` (e.g. `awaiting_approval`) + `tomo_action_log.outcome IS NULL` where relevant | Map `stepId` → `workflow_steps.id` |
| State summary | `workflow_step_runs` rolled up by step | `drafted` / `sent` / `waiting` per segment |
| Run history list | `workflow_runs` (+ join list / cohort label) | One row per **cohort run** or per **LP run** depending on product choice; mock uses cohort-style summaries |
| Run config form | `workflows.parameters_jsonb` (+ list id FK) | Template launch fields; locked defaults read-only with copy from definition |

---

## `WorkflowSurfaceEntry` → tables

| Surface field | Suggested source | Notes |
|---------------|------------------|--------|
| `id` | `workflows.id` | Mock strings (`wf-*`) become UUIDs |
| `name` | `workflows.name` | |
| `kind` | `workflows.workflow_kind` | Map `locked_default` / `configurable_template` per SRS check |
| `status` | `workflows.is_active` | `active` ↔ `is_active = true` |
| `badgeLabel` | UI string from `workflow_kind` + `is_default` or `workflows.slug` | Or `parameters_jsonb.ui_badge` if product needs custom copy |
| `summary` | `workflows.description` or first line of marketing copy | |
| `triggerLabel` | `workflows.trigger_type` + `trigger_config_jsonb` humanized | Or denormalized column if added later |
| `stats[]` | Aggregates over `workflow_runs` / `workflow_step_runs` for **current list** (and workflow) | Not a column on `workflows` |
| `meta[]` | Recent activity: joins on `tomo_action_log`, `workflow_runs`, briefs, etc. | Tone maps to `WorkflowMetaItem.tone` |
| `steps[]` | `workflow_steps` for this `workflow_id` | See [Step node](#workflowstepnode--workflow_steps) |
| `attentionItems[]` | Query `workflow_step_runs` + steps; optional `tomo_action_log` | `stepId` → `workflow_steps.id` (UUID) |
| `stateSummary` | Rollup query keyed by `workflow_steps.step_index` or segment ids in `config_jsonb` | |
| `runHistory[]` | `workflow_runs` grouped by cohort/list + time window | Mock rows are **cohort summaries**; align with product (cohort vs LP row) |
| `baseTemplateId` | `workflows.template_id` | FK to parent template workflow |
| `runConfig` | Built server-side from `parameters_jsonb` + list options API | `editable` ↔ `workflow_kind` / policy |

---

## `WorkflowStepNode` → `workflow_steps`

| Surface field | Suggested storage | Notes |
|---------------|-------------------|--------|
| `id` | `workflow_steps.id` | Stable UUID for routing and attention links |
| `nodeType` | `config_jsonb.ui.nodeType` or `step_type` mapping | SRS `step_type` is operational; UI may need a parallel display enum |
| `actionType` | `config_jsonb.ui.actionType` | Drives drawer: `draft_batch`, `run_config`, etc. |
| `title` | `workflow_steps.name` | |
| `description` | `config_jsonb.ui.description` | |
| `timingLabel` | `config_jsonb.ui.timingLabel` or derived from `wait_duration_hours` | |
| `statusLabel` | `config_jsonb.ui.statusLabel` or computed | |
| `locked` | `config_jsonb.ui.locked` or implied by `workflow_kind = locked_default` | |
| `draftBatchId` | **Not** a DB column on step; **resolve** at read time | See [Draft batches](#workflowdraftbatch--step_drafts--tomo_action_log) |

---

## `WorkflowDraftBatch` → step drafts + `tomo_action_log`

The batch review drawer is backed by **many LP-level rows**, not one JSON blob on the workflow.

| Surface field | Suggested source | Notes |
|---------------|------------------|--------|
| `id` | Synthetic batch id **or** `workflow_step_runs.id` of the parent step wave | API may return `batchId` per pending approval wave |
| `workflowId` | `workflows.id` | |
| `stepId` | `workflow_steps.id` | |
| `eyebrow`, `title`, `context` | Server-computed strings | From workflow name + list + step |
| `batchTomoPlaceholder` | UI default only | Optional `parameters_jsonb` template |
| `drafts[]` | One **pending** send unit per LP | Typically one `tomo_action_log` row (`action_type` workflow-related) **or** `workflow_step_runs.output_jsonb` joined to LP |

Per **`WorkflowDraft`** row:

| Surface field | Suggested source |
|---------------|------------------|
| `id` | `tomo_action_log.id` or draft sub-id in `metadata` |
| `lpName`, `firmName`, `email`, `roleLabel`, `tierLabel` | `lp_contacts` + org + tags |
| `subject`, `body` | `tomo_action_log.metadata` or `workflow_step_runs.output_jsonb` |
| `status` | Map from `tomo_action_log.outcome` + edit detection (`character_change_pct`) and `workflow_step_runs.status` |
| `attachment` | `metadata.attachments[]` or materials join |

**Approve / skip (Phase 5 UI)** maps to updating **`tomo_action_log.outcome`**, **`actioned_at`**, and **`workflow_step_runs.status`** (`approved` / `skipped` / `sent` per SRS), plus **`email_delivery_log`** on send.

---

## `workflowOutcomeCaptures` → `workflow_runs` + pending LPs

| Surface field | Suggested source |
|---------------|------------------|
| `workflowId` | `workflows.id` |
| `pendingLpNames` | LPs in `workflow_runs` with `status = running` at outcome step, `outcome IS NULL` |
| `options` | Product constants or `workflows.parameters_jsonb.outcome_options` | F7 enum aligns with SRS `workflow_runs.outcome` check |

---

## `WorkflowRunSummary` (history) → `workflow_runs`

| Surface field | Suggested source |
|---------------|------------------|
| `id` | `workflow_runs.id` or cohort batch id |
| `listName` | Resolved list / cohort label (`pipelines.name` or filter summary) |
| `startedAtLabel` | `workflow_runs.started_at` (formatted) |
| `lpCount` | Count of runs in cohort |
| `statusLabel` | Derived from run statuses |
| `outcomeSummary` | Aggregated outcomes / replies |

---

## `WorkflowRunConfig` → `workflows.parameters_jsonb`

| Surface field | Suggested source |
|---------------|------------------|
| `workflowId` | `workflows.id` |
| `editable` | From `workflow_kind` (template vs locked) |
| `headline` / `supportingText` | Server defaults or `parameters_jsonb.ui` |
| `fields[]` | Keys inside `parameters_jsonb` (theme, list_id, trip window, toggles) | `kind` + `options` drive form controls; list options from `pipelines` / list API |

**Launch run (Phase 6)** persists into **`workflow_runs`** (per LP) and/or a **cohort enqueue** job; session-only UI becomes `PATCH workflows` + `POST .../run` in production.

---

## Outbound safety line (`meta` / copy)

| UI concept | Table | Notes |
|------------|-------|--------|
| “14-day dedup” / safety | `outbound_safety_log` + workspace policy | Dedup window per SRS; surface string is derived |

---

## `tomo_action_log` touchpoints

| UI flow | `action_type` (examples) | Links |
|---------|--------------------------|--------|
| Step draft surfaced to GP | extend SRS set with workflow-specific types or use `'workflow_step'` + `metadata.workflow_step_id` | `workflow_step_runs.tomo_action_log_id` |
| Batch Tomo rewrite | New log row or tool trace | May also use `agent_tool_calls` for Tomo edits |

Exact `action_type` enum alignment is a **schema migration task**; the mapping above is the integration seam.

---

## Suggested API surface (non-normative)

| Method | Path | Response shape |
|--------|------|----------------|
| GET | `/api/workflows/surface?fundId=&pipelineId=` | `{ entries: WorkflowSurfaceEntry[] }` or split by section |

List-scoped aggregates (`stats`, `meta`, `stateSummary`, `attentionItems`) **must** receive `pipelineId` (or equivalent) so the server can scope `workflow_runs` to the cohort on that list.

---

## Implementation checklist

1. [ ] Replace `workflowSurfaceEntries` import in `src/app/workflows/page.tsx` with fetch to GET surface endpoint.
2. [ ] Map DB UUIDs to stable `slug` for URLs if product keeps human-readable query params; or store slug in `workflows.slug`.
3. [ ] Implement server mappers: `toWorkflowSurfaceEntry(row, aggregates)`.
4. [ ] Wire draft batch endpoint: `GET .../workflows/{id}/steps/{stepId}/draft-batch?pipelineId=` returning `WorkflowDraftBatch`.
5. [ ] Wire PATCH for approvals to `tomo_action_log` + `workflow_step_runs` in one transaction.
6. [ ] Log every outbound against `outbound_safety_log` before send.

---

## Related documents

- `docs/WORKFLOWS_SURFACE_IMPLEMENTATION_PLAN_2026-05-17.md` — UI phases
- `src/lib/workflow-surface-api-mapping.ts` — machine-readable `WorkflowSurfaceFieldSource` tables (keep in sync when DTO fields change)
- `TOMO_V1_SRS_DRAFT_2026-05-17.md` §6.2.6 — canonical columns
- `src/lib/workflow-surface-mock.ts` — UI fixture types and data
