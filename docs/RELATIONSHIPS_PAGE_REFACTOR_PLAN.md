# Relationships Page UI Refactor — Implementation Plan

Implementation plan for refactoring the Relationships page from side-by-side columns to a top-filter / bottom-content layout with drawer-based detail view.

---

## Requirements Summary

| # | Requirement | Current State |
|---|-------------|---------------|
| 1 | Top filtering header + bottom content (20/80 default split) | Side-by-side list/detail columns via AppShell |
| 2 | Top filtering: key filter fields | Single search input only |
| 3 | Top filtering: 1-line Tomo prompt for natural language filter | Not present |
| 4 | Bottom content: Card or List view (user-selectable via header icons) | List-only (vertical buttons) |
| 5 | Record selection → right-side drawer (reuse Today's ContextDrawer) | Inline detail in right column |

---

## Current Architecture

- **Page:** `src/app/relationships/page.tsx`
- **Layout:** Uses `AppShell` with `listContent` (search + relationship list) and `detailContent` (RelationshipDetail)
- **Data:** `Relationship` from `src/lib/mockData.ts` — fields: `id`, `name`, `firm`, `momentumScore`, `momentumTrend`, `velocity`, `lastInteraction`, `nextMove`, `openLoops`, `band`
- **Drawer to reuse:** `ContextDrawer` from `src/components/context-drawer.tsx` (Today page uses it with `section1Content`, `section2Content`, `section3Entries`)

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Filter header: key filters + Tomo prompt box]                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Resize handle — 20/80 default]                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Content: Card view | List view — toggle icons in header]                    │
│ [Relationship cards or list items — scrollable]                              │
└─────────────────────────────────────────────────────────────────────────────┘

On record click → ContextDrawer slides in from right:
  - Section 1: RelationshipDetail (current snapshot, status, open emails, etc.)
  - Section 2: Tomo chat UI (DrawerSection2TomoChat)
  - Section 3: Activity log
```

---

## Implementation Plan

### Phase 1: Layout & Structure

**Goal:** Replace side-by-side columns with top filter header + bottom content, with resizable 20/80 split.

**Tasks:**

1. **1.1** Stop using AppShell detail column for Relationships.
   - Pass `detailVisible={false}` to AppShell (same pattern as Today page).
   - Pass empty `detailContent` placeholder.

2. **1.2** Build new layout inside `listContent`:
   - **Top section (filter header):** Fixed height or flex-shrink-0. Contains:
     - Key filter fields (see Phase 2)
     - Tomo natural language prompt box (see Phase 3)
   - **Resize handle:** Draggable row-resize (reuse pattern from Today: `usePersistentState`, `splitContainerRef`, mouse handlers). Default 20% top / 80% bottom. Storage key: `tomo-relationships-split-ratio`.
   - **Bottom section:** Flex-1, overflow-hidden. Contains:
     - Header row with view toggle (Card | List icons)
     - Scrollable content area (cards or list items)

3. **1.3** Ensure AppShell list panel takes full width when `detailVisible={false}` (already supported).

**Files:** `src/app/relationships/page.tsx`, `src/lib/storage.ts` (add key if needed)

**Risk:** Filter header + resize + content may feel cramped on small viewports. **Mitigation:** Stack filters vertically on mobile; consider hiding resize on mobile or using fixed 30/70.

---

### Phase 2: Key Filter Fields

**Goal:** Add structured filter controls in the top header.

**Tasks:**

2. **2.1** Identify and implement key filter fields:
   - **Search** (name, firm) — keep existing behavior
   - **Band** — dropdown: All | Heating Up | Active-Stable | Cooling | Stalled
   - **Momentum trend** — dropdown or pills: All | Up | Flat | Down
   - **Velocity** — dropdown: All | Fast | Moderate | Slow
   - **Open loops** — optional: filter by "has open loops" (boolean)

2. **2.2** Wire filters to `filtered` state. Combine with existing `query` search. **Filter state persists** across page navigations (usePersistentState).

2. **2.3** Layout: Single row on desktop (flex-wrap), stacked on mobile. Compact controls (small inputs, pills for trends).

**Files:** `src/app/relationships/page.tsx`

**Risk:** Too many filters clutter the header. **Mitigation:** Start with Search + Band + Momentum trend; add Velocity/Open loops if needed. Consider collapsible "More filters" on mobile.

---

### Phase 3: Tomo Natural Language Filter Prompt

**Goal:** One-line prompt box where users type natural language; Tomo interprets and applies filters.

**Tasks:**

3. **3.1** Add a prompt input in the filter header:
   - Placeholder: e.g. "Ask Tomo to filter: e.g. 'show cooling relationships' or 'high momentum LPs'"
   - Single line, compact height.

3. **3.2** **Option A (MVP — client-side heuristic):**
   - On submit/Enter: parse common phrases (e.g. "cooling", "heating", "stalled", "high momentum", "open loops") and map to existing filter state.
   - No backend required. Limited but functional.

3. **3.3** **Option B (full NL):**
   - Call API (e.g. `/api/tomo/filter-relationships`) with user text.
   - API returns structured filter criteria; client applies them.
   - Requires backend + LLM integration.

**Decision:** Start with Option A (client heuristic) for MVP.

**Files:** `src/app/relationships/page.tsx`, optionally `src/app/api/tomo/filter-relationships/route.ts` (Option B)

**Risk:** Heuristic parsing may miss edge cases. **Mitigation:** Show applied filters as chips so user sees what Tomo "understood"; allow manual override.

---

### Phase 4: Card vs List View

**Goal:** User can switch between Card view and List view via header icons.

**Tasks:**

4. **4.1** Add view mode state: `"card" | "list"` (persist with `usePersistentState`, key: `tomo-relationships-view-mode`, default: `"list"`).

4. **4.2** Add toggle icons in the content header (next to "Relationships" or section title):
   - List icon: `Bars3Icon` or `ListBulletIcon`
   - Card icon: `Squares2X2Icon` or `SquaresPlusIcon`
   - Highlight active mode.

4. **4.3** Card view: Grid layout (`grid grid-cols-1 md:grid-cols-3`). 3 columns on desktop; scrollable vertically when many cards. Each card shows:
   - Name, firm
   - MomentumChip, open loops
   - Last interaction, next move
   - Same click handler as list item.

4. **4.4** List view: Reuse existing vertical list layout (current button styling).

**Files:** `src/app/relationships/page.tsx`

**Risk:** Card view may truncate on small screens. **Mitigation:** Responsive grid (1 col mobile, 2–3 cols desktop); `line-clamp` on long text.

---

### Phase 5: ContextDrawer on Record Selection

**Goal:** Reuse Today's `ContextDrawer`; when user selects a relationship, drawer slides in from right with detail, Tomo chat, activity log.

**Tasks:**

5. **5.1** Add `selectedId` state (or `selectedRelationship`). On card/list click, set `selectedId`; do not open detail column.

5. **5.2** Render `ContextDrawer` when `selectedId` is set:
   - `open={Boolean(selectedId)}`
   - `onClose={() => setSelectedId(null)}`
   - `title={selectedRelationship?.name ?? "Relationship"}`

5. **5.3** `section1Content`: Render `RelationshipDetail` (extract from current page or keep as is). Pass `relationship={selectedRelationship}`.

5. **5.4** `section2Content`: Render `DrawerSection2TomoChat` with:
   - `entityKey={selectedId}`
   - `selection={{ type: "relationship", id: selectedId }}`
   - `contextLabel={selectedRelationship?.name}`
   - `initialMessage` and `suggestions` from relationship-specific Tomo assistance (add to `mockTomoAssistance` or create `mockTomoRelationshipAssistance`)

5. **5.5** `section3Entries`: Map relationship activity to `ActivityLogEntry[]`. **Use mock data for now** (same as RelationshipDetail's MockRecentActivityBox).

5. **6.6** Ensure `DrawerSection2TomoChat` and `drawer-chat` API accept `type: "relationship"` if needed. Check `api/tomo/drawer-chat` route.

**Files:** `src/app/relationships/page.tsx`, `src/lib/mockTomoAssistance.ts` (add relationship entries), `src/app/api/tomo/drawer-chat/route.ts` (if selection type must be extended)

**Risk:** DrawerSection2TomoChat/API may not support `relationship` type. **Mitigation:** Reuse `entityKey` + `selection`; API can treat relationship like other entities. Add `relationship` to `TomoAssistance` map if needed.

---

## Implementation Order

| Step | Phase | Task | Dependencies |
|------|-------|------|--------------|
| 1 | 1 | Layout: top filter + bottom content, 20/80 split, `detailVisible={false}` | — |
| 2 | 2 | Key filter fields (search, band, momentum, velocity) | 1 |
| 3 | 4 | Card vs List view toggle | 1 |
| 4 | 5 | ContextDrawer on selection, RelationshipDetail + Tomo chat + activity log | 1 |
| 5 | 3 | Tomo natural language filter prompt (Option A heuristic) | 2 |

**Recommended sequence:** 1 → 2 → 3 → 4 → 5 (layout first, then filters, view toggle, drawer, then NL prompt).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-------------|
| AppShell list panel too narrow when full-width | Low | AppShell already supports `detailVisible={false}`; list takes full width |
| 20/80 split too small for filters on small screens | Medium | Clamp split to 25–75%; ensure filter header is compact; stack filters on mobile |
| Tomo NL filter requires backend | Medium | Start with client-side heuristic (Phase 3 Option A); document API approach for later |
| DrawerSection2TomoChat doesn't support relationship type | Low | Extend `selection` type; API can handle generically by `entityKey` |
| Card view truncates important info | Low | Use `line-clamp`, tooltips; ensure key fields visible |
| Activity log for relationships is mock-only | Low | Use same mock pattern as RelationshipDetail's `MockRecentActivityBox`; real data later |
| Two different drawer patterns (Today vs Relationships) | Low | Both use `ContextDrawer`; consistent UX |

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/app/relationships/page.tsx` | Full refactor: layout, filters, view toggle, drawer, remove detail column usage |
| `src/lib/storage.ts` | Add `tomo-relationships-split-ratio`, `tomo-relationships-view-mode` keys (if not auto-created) |
| `src/lib/mockTomoAssistance.ts` | Add `r1`, `r2`, … entries for relationship-specific Tomo prompts (optional; can use generic fallback) |
| `src/app/api/tomo/drawer-chat/route.ts` | Extend to accept `selection.type === "relationship"` if needed |
| `src/components/context-drawer.tsx` | No changes (already generic) |
| `src/components/drawer-section-2-tomo-chat.tsx` | Verify `selection` type supports `relationship`; extend if necessary |

---

## Testing Checklist

- [ ] Relationships page shows top filter header + bottom content (no side-by-side columns)
- [ ] Resize handle adjusts top/bottom split; ratio persists on reload
- [ ] Key filters (search, band, momentum, velocity) filter the list correctly
- [ ] Card/List view toggle works; selection persists
- [ ] Clicking a relationship opens ContextDrawer from right (not inline detail)
- [ ] Drawer shows RelationshipDetail, Tomo chat, Activity log
- [ ] Tomo chat in drawer works for selected relationship
- [ ] Closing drawer returns to list; no detail column visible
- [ ] Tomo NL prompt (Phase 3) applies filters when implemented
- [ ] Mobile: layout degrades gracefully (stacked filters, single-column cards)

---

## Decisions (Confirmed)

| Item | Decision |
|------|----------|
| Tomo NL filter | Option A (client heuristic) for MVP |
| Filter persistence | Yes — persist across navigations |
| Card layout | 3 columns on desktop; scrollable vertically when many cards |
| Activity log | Mock data for now |
