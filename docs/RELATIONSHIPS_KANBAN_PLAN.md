# Relationships Kanban — Locked spec & phased plan

Decisions aligned with product answers (March 2025). Complements the exploratory notes from the initial Kanban discussion.

**Status:** Phase 1 + **Phase 2** implemented — Kanban board lives in `src/components/relationships-kanban-board.tsx` with **`@dnd-kit/core`**; toolbar icon remains **`TableCellsIcon`** (column picker stays **`ViewColumnsIcon`**).

---

## Locked product decisions

| Topic | Decision |
|--------|----------|
| **Columns** | Always render **all** `STAGE_OPTIONS` from `src/lib/mockData.ts` (8 stages), even when empty. |
| **Sort** | Kanban card order **follows the same sort as the list header** (`sortColumn`, `sortDirection`, `sortedFiltered`). No separate Kanban-only sort. |
| **Terminal stages** | Drops onto **Closed** or **Pass** require a **confirm modal** before persisting `stage`. |
| **Data model** | Stage changes are **`stage`-only overrides** via existing `relationshipOverrides`; **`band` is not recomputed** on stage move. |
| **Cards** | Show **firm** (company) and **name**, **stacked vertically** (firm above name or vice versa — default: **firm on top, name below**). |
| **Card width & text** | Cards are **fixed width**; long firm/name **truncate with ellipsis** (`…`). Layout targets **all eight columns visible without horizontal scroll** in the relationships content viewport (below the filter split). |

---

## Viewport layout strategy

**Goal:** Eight stage columns fit in the **available width** of the bottom content area (the scrollable panel under the resize handle), not the full window.

**Suggested approach:**

1. **Board container:** `width: 100%`, `overflow-x: hidden` (no horizontal page scroll for the board).
2. **Columns:** `display: flex` with `flex: 1 1 0` and `min-width: 0` per column so each gets **equal share** of row width; small consistent `gap` (e.g. `gap-2`).
3. **Column body:** `overflow-y: auto` so tall stacks scroll **within** the column, not the whole page width.
4. **Cards:** `width: 100%` of the column (minus padding), `max-w-full`, with `truncate` / `line-clamp-1` (or single-line `text-overflow: ellipsis`) on firm and name lines so ellipsis rules are predictable.
5. **Narrow viewports:** If minimum readable column width is violated (e.g. very small laptops), choose one: **(A)** allow horizontal scroll only below a breakpoint, or **(B)** reduce font/padding — document which you ship. Default recommendation: **equal flex columns + truncation** first; add **horizontal scroll** under a `min-w-*` per column only if usability fails.

---

## Phased implementation (updated)

### Phase 1 — View + read-only board ✅

- Add `viewMode: "list" | "card" | "kanban"` with persistence; Kanban toolbar icon (`TableCellsIcon`; column picker stays `ViewColumnsIcon`).
- Render **8 columns** in `STAGE_OPTIONS` order.
- **Data pipeline:** `filtered` → apply **same sort** as list (`sortedFiltered` or shared sort helper) → **group by `stage`** into columns.
- Empty columns: show header + empty state (e.g. “No contacts”).
- Card UI: stacked firm + name, truncation, full width of column.
- Card click → same `activeId` / drawer as today.

### Phase 2 — Drag-and-drop + CRM update ✅

- `@dnd-kit/core` + `@dnd-kit/utilities`; `DragOverlay`, `PointerSensor` with **8px** activation (reduces accidental drags vs row click).
- On drop: if target stage ≠ current stage:
  - If target is **Closed** or **Pass** → open **confirm modal**; on confirm, apply override; on cancel, revert visual.
  - Else → apply `{ stage: targetStage }` via `setRelationshipOverrides` (reuse `normalizeFieldValue` / `FIELD_TO_REL_KEY` for `"stage"` if applicable).
- Toast on success; no `band` recompute.

### Phase 3 — Polish

- Keyboard / non-pointer path for moving stage (menu or modal) for accessibility.
- Real API: PATCH + rollback; keep local overrides as dev/offline if needed.
- Virtualize column lists if card counts grow large.

---

## Implementation risks (still relevant)

| Risk | Mitigation |
|------|------------|
| **`band` vs `stage` mismatch** | Accepted by design; avoid implying band auto-updates in UI copy. |
| **Sort + grouping** | Header sort is global; some sorts (e.g. name) order cards **within** each stage column consistently — document that for users. |
| **Confirm modal UX** | Use clear copy (“Move to Closed?”) and primary/secondary actions; ensure drag-cancel restores position. |
| **Eight equal columns** | Very narrow widths → truncation-heavy; test at ~1280px and ~1024px content width. |

---

## Files likely touched

- `src/app/relationships/page.tsx` — view toggle, board, modal, DnD wiring.
- `src/lib/mockData.ts` — `STAGE_OPTIONS` (read-only reference for column order).
- `package.json` — `@dnd-kit/*` dependencies.
- Optional: `src/components/relationships-kanban-board.tsx` (extract if `page.tsx` grows too large).
