# Targets Within Workflows — Design Ideas

Targets (audience lists) are the "who" that playbooks run against. Here are ways to integrate them into the Workflows surface.

---

## Option A: Targets as Playbook Configuration (Recommended)

**Concept**: Each playbook has a `targets` field — a reference to a saved target list or inline filters.

**UX**:
- When configuring a playbook in chat, Tomo asks: "Which relationships should this apply to?"
- User can: (1) pick a saved target list, (2) describe filters in chat ("Tier A only", "Europe"), (3) create a new list
- Playbook card shows: "12 targets (Tier A, Heating)" or "Uses list: Q1 Warm Outreach"

**Data model**:
```ts
playbook.targetListId?: string;  // link to saved list
playbook.targetFilters?: { tier, region, stage, ... };  // inline filters
```

---

## Option B: Targets Tab Within Workflows

**Concept**: Workflows page has two tabs: "Playbooks" | "Targets".

**UX**:
- Left panel: tabs at top. "Playbooks" shows playbooks; "Targets" shows target lists (current /targets content)
- Selecting a target list could filter playbooks that use it, or vice versa
- Keeps Targets discoverable without a separate nav item

**Implementation**: Add tab state to workflows page; conditionally render playbooks list or targets list in left panel.

---

## Option C: Targets as First-Class Section in Workflows Left Panel

**Concept**: Workflows left panel has two sections: "Playbooks" (top) and "Target lists" (bottom, collapsible).

**UX**:
- Scroll down to see "Target lists" with a "View all →" link to /targets
- Or inline preview of recent lists (e.g., last 3) with quick "Use in playbook" action
- When user clicks a playbook, the detail shows "Audience: [list name]" with edit link

---

## Option D: Chat-First Target Selection

**Concept**: No separate Targets UI in Workflows. User configures targets entirely via chat.

**UX**:
- "Set up follow-up for my Tier A LPs in Europe"
- Tomo creates/updates a target list and attaches it to the playbook
- "View target lists" link goes to /targets for power users who want to manage lists directly

---

## Recommendation (Implemented)

**Combine A + C** — implemented in `/workflows`:

1. **Option A**: Each playbook has `targetListId` or `targetFilters`. Stored in `mockPlaybooks` + `tomo-playbook-target-overrides` (user can override via "Use in playbook").
2. **Option C**: Workflows left panel has "View target lists →" plus collapsible "Recent target lists" (2–3 items) with "Use in playbook" button. Selecting a list applies it to the currently selected playbook.
3. Chat context includes: "Current targets: [list name or filter summary]. Ask to change."
4. Playbook cards show targets summary (e.g., "Filters: tier: Tier 1-2, stage: Heating" or "List: Q1 Warm (12 members)").
