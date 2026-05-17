# Workflows Surface Implementation Plan — 2026-05-17

## Purpose

This plan records the implementation direction for the V1 `/workflows` surface after the workflow scope was reduced to four entries: **Post-Meeting Execution**, **F7 Three-Touch Qualification**, **Themed Outreach**, and **Trip Orchestrator**.

The design reference is `design/tomo_workflows_v8.html`. The HTML file remains a visual / interaction reference only and should not be modified as part of this plan.

## Target UX

The Workflows page should behave as a workflow control room, not as a list that immediately opens a generic detail drawer.

The intended hierarchy is:

1. The collapsed workflow list shows the four SRS workflow entries.
2. Clicking a workflow expands it inline as an accordion.
3. The expanded card shows visual steps, current state, attention items, and run history.
4. Clicking a specific step opens the right drawer or modal for granular work.

The page-level accordion is where users understand and operate the workflow. The drawer is reserved for step-level work such as LP draft review, step settings, or outcome capture.

## Interaction Model

### Collapsed Workflow Cards

Each card shows:

- workflow name
- default / configurable-template badge
- short flow summary
- active toggle
- high-level stats such as running now, done last 30d, awaiting approval, skipped
- `View flow` / `Hide flow` affordance

### Expanded Workflow Card

The expanded body should remain inline on `/workflows` and include:

- meta strip: last activity, outbound safety, capture rate, or last run
- visual process flow
- attention row for pending approvals / replies / outcomes
- in-flight state summary, such as drafted / sent / waiting / replied / outcome-ready
- recent run history
- Tomo prompt scoped to workflow-level edits or questions

### Step Click Behavior

Process-flow steps should declare an action type. Clicking a step routes to the correct secondary surface:

- `draft_batch`: opens batch LP draft review drawer
- `single_draft`: opens single-draft drawer
- `settings`: opens step config tray / drawer
- `outcome_capture`: opens outcome capture drawer
- `run_config`: opens run setup / configuration modal
- `readonly`: no drawer; optional tooltip or expanded description only

The current generic workflow detail drawer should not be the primary interaction when a user clicks a workflow card.

## Mock Data Requirements

Add a dedicated fixture module, recommended path:

`src/lib/workflow-surface-mock.ts`

The fixture should model the future API response shape closely enough that production wiring is a data-source swap rather than a component rewrite.

Required mock data:

- four workflow entries
- collapsed-card summary stats
- expanded-card meta strip data
- visual process steps with action types
- in-flight state by step
- attention items
- run history
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

### Phase 4 — Step Interaction Routing

- Add step-action routing from process-flow nodes.
- Route draft steps to draft-review drawers.
- Route settings / structure affordances to config drawers.
- Route outcome steps to outcome capture.
- Keep locked defaults structurally locked while allowing content settings where specified.

Deliverable: users can move from workflow-level understanding to step-level action.

### Phase 5 — Batch Review Drawer

- Implement the primary batch review drawer from the reference mock.
- Support:
  - batch-wide Tomo edits
  - per-LP draft expansion and editing
  - per-draft Tomo edits
  - attachment chips
  - approve one / approve all
  - status handling for ready, edited, approved, skipped

Deliverable: F7 and outreach draft steps can be reviewed at LP level without leaving the workflow page.

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
2. Four-card accordion shell.
3. F7 expanded body.
4. F7 draft step to batch review drawer.
5. Post-Meeting expanded body.
6. Themed Outreach and Trip Orchestrator expanded bodies.
7. Run/config modals.
8. Production API wiring (use `docs/WORKFLOW_SURFACE_API_MAPPING_2026-05-17.md` + `src/lib/workflow-surface-api-mapping.ts`).

The highest-value proof point is F7 accordion expansion plus a clickable draft step that opens the batch LP draft drawer.
