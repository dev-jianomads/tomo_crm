# Filter Bar + CRM Update Expansion — Implementation Plan

> **Goal:** Expand the filter bar into a unified "Filter & Update" surface so users can both filter the CRM and request CRM updates for **one specific relationship** from the same prompt box, without needing to open the drawer.

---

## 1. Problem Statement

Users sometimes use the filter bar to request CRM updates for a **single relationship** (e.g., "update Lumen to heating", "mark Acme as blocked"). Currently:

- **Filter bar** (`RelationshipsFilterChat`) only supports `filter_relationships` — it cannot perform CRM updates.
- **CRM updates** are only available in the drawer when viewing a single relationship or pipeline stage.
- The drawer explicitly redirects filter requests: *"Use the filter bar above to filter the list."*

This creates friction: users must open a row’s drawer to update, even when they know which relationship they want to change.

---

## 2. Proposed Solution

Expand the filter bar into a **Filter & CRM Update** surface that:

1. **Keeps** natural-language filtering (`filter_relationships`).
2. **Adds** single-entity CRM updates (`update_crm`) — **one row at a time**.
3. **Requires Tomo to ask for and confirm the row** (name or company) when the user does not provide it, so updates are precise.
4. Updates the prompt, hint, and suggestions so users understand both capabilities.

**Key principle:** At this top level, users typically want to update **one particular row**, not all rows. Tomo must never assume bulk — it must ask and confirm the target relationship before applying changes.

---

## 3. Architecture Overview

### 3.1 Current Flow

```
Filter Bar (RelationshipsFilterChat)
  └─ surface: "filter", intentHint: "filter"
  └─ Tools: filter_relationships only
  └─ Context: currentFilters, page

Drawer (DrawerSection2TomoChat)
  └─ surface: "drawer", intentHint: (none)
  └─ Tools: update_crm, draft_reply
  └─ Context: selection (entityId or relationshipIds)
```

### 3.2 Target Flow

```
Filter Bar (RelationshipsFilterChat) — expanded
  └─ surface: "filter"
  └─ Tools: filter_relationships + update_crm
  └─ Context: currentFilters, page, relationshipLookup (id, name, firm for search)
  └─ onCrmUpdate callback to persist changes
  └─ CRM updates: single entity only; Tomo asks for name/company if missing
```

---

## 4. Implementation Plan

### Phase 1: Orchestrator Changes

**File:** `src/app/api/tomo/orchestrate/route.ts`

| Task | Details |
|------|---------|
| **1.1** Add `update_crm` to filter surface | Today `update_crm` is only on `general` and `drawer`. Add it when `surface === "filter"`. |
| **1.2** Extend `OrchestratorContext` | Add `relationshipLookup?: { id: string; name: string; firm: string }[]` so Tomo can resolve "Lumen" or "Acme Capital" to an entityId. Use the **filtered** list (or full list if unfiltered) for search scope. |
| **1.3** Update filter surface system prompt | Replace the filter-only prompt with a dual-purpose prompt that: (a) explains both filter and update capabilities, (b) **requires** Tomo to ask for name or company when the user requests a CRM update without specifying which relationship, (c) instructs Tomo to confirm the row before calling update_crm, (d) use entityId only (never relationshipIds for bulk) in this surface. |

**System prompt changes (filter surface):**

```
You are helping with the relationship list. You can:
1. filter_relationships — Parse natural language into filter criteria (e.g. "show Tier 1", "cooling relationships")
2. update_crm — Apply CRM field updates to ONE specific relationship (e.g. "update Lumen to heating", "mark Acme Capital as blocked")

CRITICAL for CRM updates:
- Updates apply to ONE row only. Never update multiple relationships from this surface.
- If the user requests a CRM update but does NOT specify which relationship (name or company), you MUST ask: "Which relationship? Please provide the name or company."
- Once the user provides a name or company, search the relationshipLookup in context (match name or firm, case-insensitive). If exactly one match: confirm briefly (e.g. "Updating Lumen Capital to heating") and call update_crm with entityId. If multiple matches: ask the user to disambiguate. If no match: say no relationship found and suggest checking the name.
- Only call update_crm when you have a confirmed entityId.

When the user asks to filter, call filter_relationships. For "clear" or "show all", return empty filters.

Rules: Be conversational but concise. Always confirm the target row before making a CRM change.
```

---

### Phase 2: RelationshipsFilterChat Component

**File:** `src/components/relationships-filter-chat.tsx`

| Task | Details |
|------|---------|
| **2.1** Add props | `relationshipLookup?: { id: string; name: string; firm: string }[]`, `onCrmUpdate?: (payload: CrmUpdatePayload) => void` |
| **2.2** Handle `update_crm` tool | Add `onToolCall` (or extend `onFinish`) to detect `update_crm` tool parts, call `onCrmUpdate`, and show toast. Reuse the same pattern as `DrawerSection2TomoChat`. |
| **2.3** Pass context to transport | Include `relationshipLookup` in the request body `context`. |
| **2.4** Relax `intentHint` | Change from fixed `"filter"` to `"filter" | "crm" | "general"` or remove it so the model can infer intent. For now, use `"general"` or omit when both tools are available. |

**UI copy changes:**

| Element | Current | Proposed |
|---------|---------|----------|
| Header | "Ask Tomo to filter" | "Ask Tomo" or "Filter & update" |
| Initial message | "How can I help you filter the CRM?" | "Filter the list or update a relationship — what would you like to do?" |
| Placeholder | `e.g. "Tier 1 with no contact in 14 days" or "cooling" — type "clear" to reset` | `e.g. "Tier 1 LPs" or "update Lumen to heating" — type "clear" to reset filters` |
| Suggestions (chips) | Filter-only | Mix of filter + single-row update examples (see below) |

**Suggested chips (filter + single-row update):**

```ts
const SUGGESTIONS = [
  // Filter
  "cooling relationships",
  "Tier 1 LPs",
  "no contact in 14 days",
  "family offices in North America",
  "heating up",
  "show all",
  // Single-row CRM update (user provides name/company in follow-up if needed)
  "update Lumen to heating",
  "mark Acme as blocked",
  "set reminder for Lumen Capital",
];
```

---

### Phase 3: Relationships Page Integration

**File:** `src/app/relationships/page.tsx`

| Task | Details |
|------|---------|
| **3.1** Pass `relationshipLookup` | `filtered.map(r => ({ id: r.id, name: r.name, firm: r.firm }))` — the filtered list for name/firm search. |
| **3.2** Pass `onCrmUpdate` | Use existing `handleCrmUpdate` (already used by drawer). |
| **3.3** Optional: `onFilterApplied` | Keep existing behavior (e.g. toast) if desired. |

**Snippet:**

```tsx
<RelationshipsFilterChat
  currentFilters={filterCriteria}
  onFiltersChange={setFilterCriteria}
  onClearFilters={clearFilters}
  onFilterApplied={() => toast.success("Filters applied")}
  relationshipLookup={filtered.map((r) => ({ id: r.id, name: r.name, firm: r.firm }))}
  onCrmUpdate={handleCrmUpdate}
/>
```

---

### Phase 4: Pipeline Page Integration

**File:** `src/app/pipeline/page.tsx`

| Task | Details |
|------|---------|
| **4.1** Add `handleCrmUpdate` | Same pattern as relationships page: update `relationshipOverrides` (or equivalent store). Pipeline page currently does not persist CRM updates; this would require adding override state. |
| **4.2** Pass `relationshipLookup` | `applyFilters(relationships, filterCriteria).map(r => ({ id: r.id, name: r.name, firm: r.firm }))` |
| **4.3** Pass `onCrmUpdate` | Wire to the new handler. |

**Note:** Pipeline page may not have `relationshipOverrides` today. Phase 4 can be deferred.

---

### Phase 5: Edge Cases & Safety

| Scenario | Handling |
|----------|----------|
| **User says "update to heating" (no name)** | Tomo asks: "Which relationship? Please provide the name or company." |
| **User says "update Lumen to heating"** | Tomo searches relationshipLookup for "Lumen", finds match, confirms "Updating Lumen Capital to heating", calls update_crm with entityId. |
| **Multiple matches (e.g. "Lumen" matches 2 firms)** | Tomo asks user to disambiguate (e.g. "Did you mean Lumen Capital or Lumen Partners?") |
| **No match** | Tomo: "I couldn't find a relationship matching that name. Try filtering first or check the spelling." |
| **Empty filtered list** | Pass `relationshipLookup: []`. Tomo: "No relationships in the current view. Adjust filters or show all to update one." |
| **Ambiguous intent** | "Tier 1" alone → filter. "Update Tier 1 to heating" → Tomo asks which Tier 1 relationship (there may be many). |

---

## 5. File Change Summary

| File | Changes |
|------|---------|
| `src/app/api/tomo/orchestrate/route.ts` | Add `update_crm` to filter surface; extend context with `relationshipLookup`; update filter system prompt (ask & confirm row) |
| `src/components/relationships-filter-chat.tsx` | New props `relationshipLookup`, `onCrmUpdate`; handle `update_crm`; update header, message, placeholder, chips |
| `src/app/relationships/page.tsx` | Pass `relationshipLookup`, `onCrmUpdate` |
| `src/app/pipeline/page.tsx` | (Optional) Same as relationships |

---

## 6. Testing Checklist

- [ ] Filter: "cooling relationships" → filters applied
- [ ] Filter: "show all" → filters cleared
- [ ] Update with name: "update Lumen to heating" → Tomo confirms and updates that row
- [ ] Update without name: "mark as blocked" → Tomo asks "Which relationship? Please provide the name or company."
- [ ] User provides name in follow-up → Tomo resolves, confirms, updates
- [ ] Multiple matches → Tomo asks user to disambiguate
- [ ] No match → Tomo explains and suggests filtering or checking spelling
- [ ] Placeholder and chips reflect filter + single-row update
- [ ] Toast confirms CRM update for the correct row

---

## 7. Rollout Options

| Option | Description |
|-------|-------------|
| **A. Full rollout** | Implement all phases; both Relationships and Pipeline pages get filter + CRM. |
| **B. Relationships first** | Phases 1–3 only; Pipeline page unchanged. Validate UX, then add Pipeline. |
| **C. Feature flag** | Add a flag to toggle CRM capability in the filter bar; default off initially. |

**Recommendation:** Option B — Relationships page first, then Pipeline once validated.

---

## 8. Future Enhancements

- **Bulk updates (optional):** If users later request "update all cooling to heating", add a separate flow with explicit confirmation. Out of scope for v1.
- **Draft from filter bar:** Add `draft_reply` for single-entity outreach.

---

## 9. Approval Checklist

Before implementation, confirm:

- [ ] Naming: "Filter & update" vs "Ask Tomo" vs other header/label
- [ ] Chip examples: use real relationship names from mock data or generic placeholders
- [ ] Pipeline page: include in v1 or defer
