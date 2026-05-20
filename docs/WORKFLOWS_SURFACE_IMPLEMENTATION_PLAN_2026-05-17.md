# Workflows Surface Implementation Plan — 2026-05-17

**Updated 2026-05-21 (SRS v0.12):** Expanded accordion simplified — **process flow** retained; **computed telemetry panel** replaces meta strip, `stateSummary` segment boxes, and fixture run history. See `src/lib/workflow-telemetry.ts` and §3.12 item 9 in `TOMO_V1_SRS_DRAFT_2026-05-20.md`.

## Purpose

This plan records the implementation direction for the V1 `/workflows` surface after the workflow scope was reduced to four entries: **Post-Meeting Execution**, **F7 Three-Touch Qualification**, **Themed Outreach**, and **Trip Orchestrator**.

The design reference is `design/tomo_workflows_v8.html`. The HTML file remains a visual / interaction reference for layout and process-flow styling only and should not be modified as part of this plan. **Fixture health metrics in v8 are not normative for V1** (see SRS BR-3.12.21).

## Target UX

The Workflows page should behave as a workflow control room, not as a list that immediately opens a generic detail drawer.

The intended hierarchy is:

1. The collapsed workflow list shows the four SRS workflow entries.
2. Clicking a workflow expands it inline as an accordion.
3. The expanded card shows the **process flow** and, when runs exist on the list, a **computed telemetry panel** (not fixture segment boxes or demo run history).
4. Clicking a specific step opens the right drawer or modal for granular work.

The page-level accordion is where users understand and operate the workflow. The drawer is reserved for step-level work such as LP draft review, step settings, or outcome capture.

## Interaction Model

### Collapsed Workflow Cards

Each card shows:

- workflow name
- default / configurable-template badge
- short flow summary
- **computed** header stats when list-scoped runs exist (`Running now`; `Replied` / `Sent`) — **Saved** for inactive custom; **empty** for seeded/Tailored with no runs (no fixture counters)
- `View flow` / `Hide flow` affordance
- **No on/off toggle** in V1 (seeded + active custom = always active on list; saved custom shows **Activate** in expanded body)
- **Delete** (trash + confirm) for Tailored + user custom only

### Expanded Workflow Card

The expanded body remains inline on `/workflows`.

**Saved custom:** Activate / Edit action banner only (blueprint on collapsed summary).

**Active:**

- **Horizontal process flow** (click step → monitor drawer)
- **Telemetry panel** when `workflow_runs` exist for workflow + selected list (`deriveWorkflowTelemetry`):
  - `N in flight · N sent · N replied`
  - `Primary: …` · optional `Follow-up: …`
  - Latest cohort run line
  - Operational signals (e.g. follow-up drafts ready) — no approve/send CTAs
- **Empty state** when no runs (Launch hint for `launchable` templates)
- **Launch run** panel (`WorkflowRunConfigPanel`) only when launchable **and** no active cohort
- **Earlier runs** section only when `runHistory.length > 1`

**Removed from expanded V1 UI:** meta strip, `stateSummary` segment panel, monitor-only banner, fixture run history, draft-approval strip.

### Step Click Behavior (V1 — active workflows)

On **active** Workflows-surface cards, clicking any actionable step opens a **monitor-only** drawer (`workflow-step-action-drawer.tsx` + `workflow-step-monitor-panel.tsx`): metrics, frozen parameters, LP status table, Close. **No** approve / edit / send in this drawer.

Live-run draft approval routes through the **Action Drawer** (§3.9 SRS), not the Workflows step drawer.

Process-flow steps still declare an `actionType` for mock routing and future saved-workflow edit paths:

- `draft_batch` / `single_draft` (active): monitor drawer only
- `settings` / `run_config`: monitor or blocked on active cards per SRS
- `outcome_capture`: outcome surface where specified
- `readonly`: optional tooltip only

**Create wizard** (custom create) is the unified five-step dialog — not a step click on active cards.

The generic workflow detail drawer is not the primary interaction when a user clicks a workflow card.

## Mock Data Requirements

Add a dedicated fixture module, recommended path:

`src/lib/workflow-surface-mock.ts`

The fixture should model the future API response shape closely enough that production wiring is a data-source swap rather than a component rewrite.

Required mock data:

- four workflow entries (structure + process steps + `runConfig` where launchable)
- visual process steps with action types
- **no fixture** collapsed stats, meta strip, `stateSummary` segments, attention items, or run history on seeded entries — health comes from session `workflow_runs` via `workflow-telemetry.ts`
- draft batches by workflow step
- per-LP draft subject / body / recipient / firm / tier / attachment / status
- F7 outcome capture options and pending outcome examples
- Themed Outreach parameters: selected list, theme / content kernel, optional follow-up setting
- Trip Orchestrator parameters: destination, date range, eligible LP count, scheduling constraints

Suggested shape:

```ts
type WorkflowSurfaceEntry = {
  id: string;
  name: string;
  kind: "locked_default" | "configurable_template";
  baseTemplateId?: string;
  status: "active" | "inactive";
  summary: string;
  stats: WorkflowStat[];
  meta: WorkflowMetaItem[];
  steps: WorkflowStepNode[];
  attentionItems: WorkflowAttentionItem[];
  stateSummary: WorkflowStateSummary;
  runHistory: WorkflowRunSummary[];
  telemetry?: WorkflowTelemetry | null; // enrichWorkflowSurfaceEntry
};
```

## Phased Implementation Plan

### Phase 1 — Mock Data Contract

- Create `src/lib/workflow-surface-mock.ts`.
- Define workflow-surface types and fixtures for the four V1 entries.
- Include draft batches and step-action metadata from day one.
- Keep existing lower-level mock files only where still needed by unrelated surfaces.

Deliverable: UI can render the target workflow surface from one structured fixture.

### Phase 2 — Accordion Layout

- Replace workflow-card click-to-detail-drawer behavior with inline accordion expansion.
- Render the left list rail, selected-list header, section dividers, and four cards in the style of `tomo_workflows_v8.html`.
- Maintain only one expanded card at a time unless product later chooses multi-expand.

Deliverable: `/workflows` visually and behaviorally matches the reference card-list model.

### Phase 3 — Expanded Workflow Body

- Build reusable components:
  - `WorkflowAccordionCard`
  - `WorkflowExpandedBody`
  - `WorkflowMetaStrip`
  - `WorkflowInlineProcessFlow`
  - `WorkflowAttentionRow`
  - `WorkflowRunStateSummary`
  - `WorkflowRunHistory`
- Drive differences through mock data, not per-workflow branching where avoidable.

Deliverable: expanding a card gives the operational dashboard inline.

### Phase 4 — Monitor-only step drawer (active workflows) — **scaffolded**

- `workflow-step-monitoring-mock.ts` — per-step monitoring payloads.
- `workflow-step-monitor-panel.tsx` — metrics, parameters, LP table.
- `workflow-step-action-drawer.tsx` — replaces draft-approval UI for active step clicks.

Deliverable: clicking a step on an active card shows read-only monitoring; Close only.

### Phase 4b — Create wizard (custom create) — **implemented**

- `workflow-create-draft.ts` — wizard state + step validation (`name` | `trigger` | `action` | `draft` | `personalise`).
- `workflow-build-modal.tsx` — **single large dialog** (`max-w-5xl`) with header tabs: Name → Trigger (Tomo + `confirm_workflow_trigger` / `advance_workflow_wizard_step`) → Action (context + **.docx/.pdf upload** + Tomo two-phase composer + `confirm_workflow_action_prompt`) → Draft (LLM cohort draft via `/api/tomo/generate-workflow-cohort-draft`) → Personalise (master–detail).
- `workflow-wizard-file-upload.tsx` + `parse-workflow-documents.ts` — client-side mammoth (docx) + pdf.js (pdf text layer).
- `workflow-cohort-draft.ts` + `generate-workflow-cohort-draft/route.ts` — structured LLM cohort template generation for the Draft step.
- `workflow-action-build.ts` — per-LP draft scaffolding, action pills, `mergeContextWithAttachmentText`, offline template fallback.
- Orchestrator: wizard tools when `workflowCreator.wizardStep` is set; legacy `create_user_workflow` retained for Lists pipeline attach only.
- `customPlaybooks.appendCustomPlaybookWithActionBuild()` on **Save & finish**.

Deliverable: **New workflow** persists only after wizard completion; runtime send approval stays in Action Drawer.

### Phase 5 — Batch review (Action Drawer / runtime only)

- Batch LP draft review for **in-flight runs** lives in the **Action Drawer**, not the Workflows step drawer (SRS BR-3.12.12).
- Reference mock (`tomo_workflows_v8.html`) batch drawer patterns inform Action Drawer UX, not active-workflow step clicks.

Deliverable: F7 and outreach live-run drafts reviewed via Action Drawer per §3.9.

### Phase 6 — Run / Config Modals

- Add run setup for configurable templates.
- Themed Outreach run setup captures List, theme / content kernel, and optional follow-up.
- Trip Orchestrator run setup captures destination, date range, source list, and scheduling constraints.
- Locked defaults expose content settings and run history, not structural editing.

Deliverable: templates can be configured and launched from the Workflows surface.

### Phase 7 — Production Data Prep

**Status: delivered** (documentation + machine-readable map; no production API in this repo step).

- Map fixture fields to future API data from:
  - `workflows`
  - `workflow_steps`
  - `workflow_runs`
  - `workflow_step_runs`
  - `tomo_action_log`
  - `outbound_safety_log`
- Keep API response shape close to `WorkflowSurfaceEntry`.

**Deliverables**

1. **`docs/WORKFLOW_SURFACE_API_MAPPING_2026-05-17.md`** — Narrative mapping, suggested `GET` shape, and implementation checklist for engineers wiring Postgres / API routes (canonical columns per **SRS §6.2.6**).
2. **`src/lib/workflow-surface-api-mapping.ts`** — `WorkflowSurfaceFieldSource` rows grouped by DTO (`WORKFLOW_SURFACE_ENTRY_SOURCES`, step, draft batch, outcome, run history, run config) for drift-friendly reference next to the mock types.

**Related:** `src/lib/workflow-surface-mock.ts` file header links to both artifacts above.

## Recommended Build Order

1. Mock data contract.
2. Four-card accordion shell (trigger-first, active seeded cards, delete not toggle).
3. F7 expanded body + monitor drawer on step click.
4. Five-step create wizard wired into build modal (custom workflows).
5. Post-Meeting expanded body.
6. Themed Outreach and Trip Orchestrator expanded bodies.
7. Run/config modals (list header; not primary on active expanded cards).
8. Production API wiring (use `docs/WORKFLOW_SURFACE_API_MAPPING_2026-05-17.md` + `src/lib/workflow-surface-api-mapping.ts`).

**Current proof point:** accordion expansion + monitor-only step drawer + custom **New workflow** five-step wizard → saved card.

**Deferred:** batch approve/edit in Workflows step drawer for active cards (superseded by monitor-only + Action Drawer).
