# Today Page Implementation Plan

Implementation plan for the Today page redesign based on the provided requirements and screenshots.

---

## Requirements Summary

| # | Requirement | Current State |
|---|-------------|---------------|
| 1 | Fixed height, no overflow/scroll | Bottom half has `overflow-auto`; content scrolls |
| 2 | Tomo chat UI (top half) | Present; shares space with greeting |
| 3 | Side-by-side: What needs your attention + Coming up (bottom half) | Stacked vertically |
| 4 | Item cards: deduplicate pills, move to right, fit to 2 rows | Duplication: chips (left) + StatusPill/date (right); multi-row layout |
| 5 | Side fly-in on card click (replace expanded right column) | Uses AppShell detail panel (persistent column) + ApprovalDrawer |
| 6 | User slider between top/bottom half | No slider; fixed split |
| 7 | Move suggested workflows to individual detail view | Shown on main page between chat and lists |

---

## Implementation Plan

### Phase 1: Layout & Structure

#### 1.1 Fixed Height, No Scroll

**Goal:** Main content fits viewport; no vertical scroll in default view.

**Approach:**
- Make the Today list content area use `h-[calc(100vh-...)]` or `flex-1 min-h-0` so it fills available space without overflowing.
- Ensure the parent chain (AppShell list panel) has `overflow-hidden` at the right level so children can use `flex` and `min-h-0` to partition space.
- Remove `overflow-auto` from the bottom half; instead rely on fixed proportions and internal overflow only where needed (e.g., long lists within each column).

**Files:** `src/app/home/page.tsx`, possibly `src/components/app-shell.tsx` if list panel needs height constraints.

**Risk:** On small viewports or with many items, content may be cramped. Mitigation: cap visible items per section (e.g., 3–4 per column) with "See more" if needed.

---

#### 1.2 Top/Bottom Split with User Slider

**Goal:** Resizable divider between Tomo chat (top) and attention/coming-up (bottom).

**Approach:**
- Add a draggable splitter (similar to AppShell’s list/detail column resize).
- Use `usePersistentState` (e.g. `tomo-today-split-ratio`) to persist ratio (default 50/50).
- Top section: greeting + Tomo chat. Bottom section: two columns (attention + coming up).
- Mouse/touch handlers for drag; clamp ratio (e.g. 25%–75%).

**Files:** `src/app/home/page.tsx`, `src/lib/storage.ts` (if new key).

**Risk:** Slider UX on mobile (touch targets). Mitigation: hide or simplify on mobile (e.g., fixed 50/50 or collapsible sections).

---

#### 1.3 Side-by-Side: What Needs Your Attention + Coming Up

**Goal:** Bottom half shows two columns: attention items | coming up.

**Approach:**
- Replace single-column layout with `grid grid-cols-2` or `flex` with two equal-width children.
- Each column: section title + scrollable list (only that column scrolls if needed).
- Responsive: stack vertically on narrow viewports (e.g. `< 768px`).

**Files:** `src/app/home/page.tsx`.

**Risk:** Uneven content height; one column much longer. Mitigation: `overflow-y-auto` per column with `min-h-0` so both scroll independently.

---

### Phase 2: Item Card Redesign

#### 2.1 Deduplicate Pills, Move to Right, 2 Rows

**Goal:** Each card fits in 2 rows; pills on right; no duplicate status (Needs approval, Overdue, Past due).

**Current duplication:**
- `chips`: `["Needs approval", "Overdue"]` (UrgencyChip, left)
- `StatusPill`: maps `status` → "Needs approval", "In progress", "Blocked" (right)
- `date`: "Past due", "Due today" (right)

**Approach:**
- Consolidate into a single right-aligned pill group:
  - Status: "Needs approval" | "In progress" | "Blocked" (from `status`)
  - Urgency: "Overdue" only when `dueDate < today` (avoid "Past due" text duplication)
  - Optional: "Draft ready" when `action.draft` exists
- Layout:
  - **Row 1:** Title (left) | Pills (right)
  - **Row 2:** Meta/trigger (left) | Extra (e.g. "Draft ready") if any (right)
- Remove `chips` and `date` from TodayGroup item shape where redundant; pass only consolidated `pills: string[]` for right side.

**Files:** `src/app/home/page.tsx` (TodayGroup, item mapping).

**Risk:** Long titles or many pills overflow. Mitigation: `truncate`/`line-clamp-1` on title, `flex-wrap` for pills with `gap-1`, max 2–3 pills.

---

### Phase 3: Side Fly-In (Replace Right Column)

#### 3.1 Use Fly-In Drawer Instead of Detail Column

**Goal:** On card click, show a side fly-in overlay (like ApprovalDrawer), not the AppShell detail column.

**Approach:**
- Stop using `detailContent` / `detailVisible` for Today. Pass `detailVisible={false}` to AppShell so the detail column is never shown.
- Reuse/extend `ApprovalDrawer` or create a generic `DetailDrawer` that:
  - Slides in from the right (already done by ApprovalDrawer)
  - Renders `ActionDetail`, `CommitmentDetail`, or `BriefDetail` based on selection
  - Opens for any selection (action, commitment, brief), not only approval flows
- Approval flows: keep opening ApprovalDrawer when action needs approval/draft; otherwise use the same drawer for non-approval actions and commitments.

**Files:** `src/app/home/page.tsx`, `src/components/approval-drawer.tsx` (or new `DetailDrawer`).

**Risk:** Two drawers (approval vs generic) could conflict. Mitigation: single drawer component with different content; approval content takes precedence when applicable.

---

### Phase 4: Suggested Workflows in Detail View

#### 4.1 Move Workflows to Individual Detail View

**Goal:** Remove "Suggested workflows" from main Today view; show relevant workflows inside each item’s detail (fly-in).

**Approach:**
- Remove the "Suggested workflows" block from the main Today content.
- Add a "Suggested workflows" section to `ActionDetail`, `CommitmentDetail`, and optionally `BriefDetail`.
- Workflow relevance:
  - **Option A (simple):** Show top 2 enabled playbooks for all items.
  - **Option B (contextual):** Add `playbookIds?: string[]` to ActionItem/Commitment in mock data; filter `suggestedPlaybooks` by that.
  - **Option C (heuristic):** Map `action.type` → playbooks (e.g. `outreach` → Warm Intro, Post-Meeting; `scheduling` → Post-Meeting).
- Reuse existing workflow card UI; link to `/workflows?playbook={id}`.

**Files:** `src/app/home/page.tsx`, `src/lib/mockData.ts` (if adding associations).

**Risk:** Relevance logic may feel arbitrary without real data. Mitigation: start with Option A; refine with product input.

---

## Implementation Order

| Step | Task | Dependencies |
|------|------|---------------|
| 1 | Fixed height + no scroll | — |
| 2 | Side-by-side attention + coming up | 1 |
| 3 | Item card: 2 rows, pills right, dedupe | — |
| 4 | User slider top/bottom | 1 |
| 5 | Fly-in drawer (replace detail column) | — |
| 6 | Move workflows to detail view | 5 |

Recommended sequence: **1 → 2 → 3** (layout + cards), then **5 → 6** (drawer + workflows), then **4** (slider).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fixed height too restrictive on small screens | Medium | Use `min-height` and allow scroll only when viewport is small; consider responsive breakpoints |
| Slider conflicts with existing AppShell resize | Low | Slider is inside list content; AppShell resize is list vs detail. No overlap once detail column is removed |
| Drawer + ApprovalDrawer both open | Medium | Use single drawer; route content by selection type and approval state |
| Workflow relevance unclear | Low | Start with "show all" or simple heuristic; iterate with feedback |
| 2-row cards truncate important info | Medium | Prioritize title + meta; use tooltips or expand-on-hover for overflow |
| Mobile: side-by-side + slider | High | Stack columns on mobile; hide or simplify slider |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/home/page.tsx` | Layout, TodayGroup, item mapping, drawer usage, remove workflows from main, add to detail |
| `src/components/app-shell.tsx` | Possibly adjust list panel height/overflow when `detailVisible=false` |
| `src/components/approval-drawer.tsx` | Generalize for all detail types, or add `DetailDrawer` |
| `src/lib/storage.ts` | Add `tomo-today-split-ratio` if persisting slider |
| `src/lib/mockData.ts` | Optional: add `playbookIds` to actions/commitments |

---

## Testing Checklist

- [ ] Default view fits viewport without main scroll
- [ ] Top/bottom slider works and persists
- [ ] Attention and Coming up are side-by-side on desktop
- [ ] Cards show 2 rows with pills on right, no duplication
- [ ] Clicking a card opens fly-in drawer (not detail column)
- [ ] Approval actions still open approval flow in drawer
- [ ] Suggested workflows appear in detail view, not main page
- [ ] Mobile: layout degrades gracefully (stacked, no/fixed slider)
