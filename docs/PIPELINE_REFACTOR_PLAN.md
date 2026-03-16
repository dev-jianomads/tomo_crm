# Pipeline Page Refactor — Staged Implementation Plan

## Overview

Refactor `/pipeline` from the current target-list concept (Region, Interest, Stage, Tier) to a **CRM pipeline**: a saved, named filter over relationships. Pipelines show a funnel by stage state and allow Tomo-assisted CRM updates from funnel sections.

---

## Current State

- **Pipeline page**: Uses `TargetFilter` / `TargetList` (region, interest, stage, tier) with mock members. Stored in `TARGET_LISTS_STORAGE_KEY`. No connection to relationships.
- **Relationships page**: Uses `StructuredFilterCriteria` (26+ fields) with `applyFilters()`, `formatFilterSummary()`. No "create pipeline" action.
- **Stage states** (from `mockData.ts`): `First contact`, `Deck sent`, `Met`, `Active diligence`, `DD`, `Soft circle`, `Closed`, `Pass`.

---

## Target UX

1. **Pipeline = saved filter over CRM** — User applies filters (same as relationships), names it, saves as pipeline.
2. **Creation entry points**:
   - **Relationships page**: Button "Create pipeline" when filters are active → modal to name → creates pipeline from current filter.
   - **Pipeline page**: Filter CRM (same UI as relationships filter chat or simplified filters) → preview filtered list → "Create pipeline" with name.
3. **Pipeline page layout**:
   - **Bottom half**: List of pipelines (name + filter summary). Click to select.
   - **Top half**: When pipeline selected → funnel by stage + list of firms per stage.
4. **Funnel interaction**: Click a stage section → side drawer opens with:
   - Context: pipeline name, stage name, firms in that stage.
   - Tomo UI for CRM updates (e.g. "Move X to DD", "Update stage for these 3").

---

## Data Model

### Pipeline type (replaces TargetList)

```ts
// src/lib/pipelines.ts (new)

import type { StructuredFilterCriteria } from "./relationshipFilters";

export type Pipeline = {
  id: string;
  name: string;
  /** Fund scope — pipelines are per fund */
  fundId: string;
  /** Same filter schema as relationships page */
  filterCriteria: StructuredFilterCriteria;
  createdAt: string; // ISO
};
```

### Storage

- **Key**: `tomo-pipelines-v1` (or `tomo-pipelines-${fundId}-v1` if storing per-fund)
- **Mock pipelines**: 2–3 seeded pipelines with realistic `filterCriteria` for demo, scoped to mock fund(s).
- **Scope**: Pipelines are per fund; list/create/filter by `activeFundId`.

---

## Funnel Display — Avoiding Clutter

**Recommended: Horizontal funnel + collapsible stage rows**

| Approach | Pros | Cons |
|----------|------|------|
| **Horizontal funnel bars** | Clear visual, compact | Hard to show firm names inline |
| **Vertical funnel** | Familiar metaphor | Tall, scroll-heavy |
| **Kanban columns** | Good for drag-drop later | Wide, horizontal scroll |
| **Collapsible stage rows** ✓ | Compact by default, expand on click | Slightly more interaction |

**Proposed layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pipeline: Q1 Fund III Target List                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Funnel (horizontal bars, clickable):                                     │
│ [First contact ███ 3] [Deck sent █████ 5] [Met ██ 2] [Active dil ████ 4] │
│ [DD █ 1] [Soft circle ██ 2] [Closed ███████ 7] [Pass ███ 3]              │
├─────────────────────────────────────────────────────────────────────────┤
│ Stage detail (when section clicked, or default: first non-empty):       │
│ ▼ Deck sent (5) — [Northwind Capital, Peakline Partners, ...]            │
│   Compact: firm names as pills/chips. Click firm → entity drawer.        │
│   Click stage bar → this section expands + drawer opens with Tomo.       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Alternative (simpler):** Single expandable section per stage. Default: show funnel bars only. Click bar → expand that stage’s firm list below + open drawer. Keeps top half minimal.

---

## Staged Implementation

### Stage 1: Data model + mock pipelines

**Goal:** Introduce `Pipeline` type, migrate away from `TargetList`, add mock pipelines.

1. Create `src/lib/pipelines.ts`:
   - `Pipeline` type (includes `fundId`)
   - `PIPELINES_STORAGE_KEY` (store all pipelines; filter by `fundId` at read time)
   - `generateMockPipelines(fundId)` returning 2–3 pipelines with `StructuredFilterCriteria`
   - `usePipelines(fundId)` hook — read/write via `usePersistentState`, filter by fund, merge with mock for initial load
2. Deprecate `src/lib/targets.ts` — Pipeline will replace TargetList; workflows will eventually use Pipeline.
3. Add pipeline-related types to `relationshipFilters` if needed (re-export `StructuredFilterCriteria`).

**Deliverable:** Pipelines exist in storage, types are correct, fund-scoped. No UI changes yet.

---

### Stage 2: Pipeline page — list + create from filters

**Goal:** Single-panel layout. Filter + create at top; pipeline list at bottom. Click pipeline → drawer slides in.

1. **Single panel only** — No right panel by default. Use `detailVisible={false}` so AppShell shows only the left panel. (AppShell: hide mobile detail section when `detailVisible` is false.)
2. **Left panel layout** (top → bottom):
   - **Filter chat**: Reuse `RelationshipsFilterChat` for natural-language filtering.
   - **Create pipeline**: Name input + Create button, with "X in preview" count.
   - **Pipeline list**: Pipelines for current fund (name + `formatFilterSummary(filterCriteria)` + relationship count).
3. **Drawer on pipeline click** — When user clicks a pipeline in the list, `ContextDrawer` slides in from the right with:
   - Pipeline name, relationship count, filter summary.
   - Placeholder: "Funnel view coming in Stage 3".
   - **No Tomo chat yet** — Tomo appears in Stage 5 when user clicks a funnel section (stage).
4. Wire `usePipelines(activeFundId)` for list and create; pass `fundId` when creating.
5. Apply `applyFilters(relationships, pipeline.filterCriteria)` to get filtered relationships for each pipeline (used in Stage 3).

**Deliverable:** Single panel with filter + create + pipeline list. Click pipeline → drawer with basic details. Tomo chat in drawer deferred to Stage 5 (funnel-section click).

---

### Stage 3: Funnel visualization

**Goal:** When a pipeline is selected, top half shows funnel by stage.

1. Compute `filteredRels = applyFilters(relationships, pipeline.filterCriteria)`.
2. Group by `stage`: `Record<Stage, Relationship[]>`.
3. Render horizontal funnel:
   - One segment per stage (use `STAGE_OPTIONS` order — no custom funnel order).
   - Bar width proportional to count (or fixed width with count label).
   - Clickable segments.
4. Below funnel: expandable section for selected stage showing firm names (pills/chips).

**Deliverable:** Selecting a pipeline shows funnel + firm list per stage.

---

### Stage 4: "Create pipeline" from Relationships page

**Goal:** Add creation entry point on relationships page.

1. Add "Create pipeline" button in relationships header/toolbar (visible when `filterCriteria` is non-empty).
2. On click: modal/dialog with name input + "Create" button.
3. On create: add pipeline via shared `usePipelines` logic with `fundId: activeFundId`, then optionally navigate to `/pipeline` or show toast + stay.

**Deliverable:** User can create pipeline from relationships page with current filters, scoped to active fund.

---

### Stage 5: Funnel section → drawer + Tomo

**Goal:** Click funnel stage → drawer with context + Tomo for CRM updates.

1. Extend `ContextDrawer` usage (or add pipeline-specific drawer):
   - **Section 1**: Pipeline name, stage name, list of firms in that stage.
   - **Section 2**: `DrawerSection2TomoChat` with context:
     - `surface: "drawer"`
     - `page: "pipeline"`
     - `selection: { type: "pipeline_stage", pipelineId, stage, relationshipIds: string[] }`
     - **Relationship IDs**: Pass the list of relationship IDs in the selected stage so Tomo can reference them explicitly in updates (e.g. "Move r1, r2 to DD").
   - **Section 3**: Activity log (can be empty for now).
2. Tomo orchestrator: handle `pipeline_stage` selection; pass `relationshipIds` in context so tools (`update_crm`, etc.) can target specific relationships for stage moves, bulk updates.
3. Optional: add `filter_relationships`-style tool that pre-fills with pipeline + stage filter for "show me who’s in Deck sent" type queries.

**Deliverable:** Clicking a funnel stage opens drawer with Tomo; user can request CRM updates; Tomo receives relationship IDs for that stage.

---

### Stage 6: Polish + edge cases

**Goal:** UX polish and robustness.

1. Empty states: no pipelines, no relationships in pipeline, no relationships in selected stage.
2. Delete/rename pipeline (if desired).
3. Responsive layout for funnel (stack stages on mobile).
4. Ensure `formatFilterSummary` is used consistently for pipeline cards.

---

## Decisions (resolved)

1. **Workflows**: Pipeline replaces TargetList; workflows will eventually use Pipeline.
2. **Scope**: Pipelines are per fund (`fundId` on Pipeline; filter by `activeFundId`).
3. **Funnel order**: Use `STAGE_OPTIONS` order as-is.
4. **Drawer context**: Tomo receives `relationshipIds: string[]` for the selected stage so it can reference them explicitly in updates.

---

## File Checklist

| File | Action |
|------|--------|
| `src/lib/pipelines.ts` | Create (Pipeline type, mock data, hook) |
| `src/lib/targets.ts` | Deprecate — Pipeline replaces TargetList; workflows will migrate |
| `src/app/pipeline/page.tsx` | Refactor (layout, funnel, drawer) |
| `src/app/relationships/page.tsx` | Add "Create pipeline" button + modal |
| `src/components/context-drawer.tsx` | No change (reuse as-is) |
| `src/components/drawer-section-2-tomo-chat.tsx` | Extend for `pipeline_stage` selection |
| `src/app/api/tomo/orchestrate/route.ts` | Handle `pipeline_stage` context |
| `src/lib/relationshipFilters.ts` | No change (reuse `applyFilters`, `formatFilterSummary`) |

---

## Estimated Effort

| Stage | Effort |
|-------|--------|
| 1. Data model + mock | 1–2 hrs |
| 2. Pipeline list + create | 2–3 hrs |
| 3. Funnel visualization | 2–3 hrs |
| 4. Create from relationships | 1 hr |
| 5. Drawer + Tomo | 2–3 hrs |
| 6. Polish | 1–2 hrs |
| **Total** | **~10–14 hrs** |
