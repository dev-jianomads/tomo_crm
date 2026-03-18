# Today Page — Workflow Context Integration (Draft)

**Goal:** Update the Today page cards based on context from workflows — both **Tomo Default** and **User Defined**.

---

## Current State

- **Today** = `/home` (today redirects to home)
- **Cards:**
  1. **What needs your attention** — Action items (from mockData)
  2. **Coming up** — Commitments (from mockData)
  3. **Daily Brief** (modal) — 4 blocks: Priority Follow-ups, Meetings Requiring Prep, Momentum Signals, Open Execution Loops
- **Workflow links today:** Only User Defined playbooks (via `workflowPlaybookId`, `SuggestedWorkflows`, `mockTomoAssistance`). Tomo Default workflows are not referenced.

---

## Proposed Changes

### 1. Action cards — workflow badge

**Current:** Actions with `workflowPlaybookId` show a "→ workflow" button that links to the playbook.

**Proposed:**
- Resolve workflow name from both User Defined (`suggestedPlaybooks`) and Tomo Default (`tomoDefaultWorkflows`)
- Show workflow name on the badge, e.g. "No Response → Re-engage" or "Email Scheduling Assistant"
- Support new action type `workflowTomoDefaultId` (e.g. `td-email-scheduling`) for Tomo Default–triggered actions

**Example:** An action triggered by "Email Scheduling Assistant" would show a badge: `Email Scheduling Assistant →` linking to workflows (we could add `?tomoDefault=td-email-scheduling` or similar).

---

### 2. Coming up — workflow context

**Current:** Commitments show title, datetime, LP, and pills ("Happening today", "Within 72h").

**Proposed:**
- Add optional `workflowContext` to commitments (or derive from linked brief)
- When a commitment is linked to a workflow (e.g. Post-Meeting Execution), show a small label: "Post-Meeting prep" or "Meeting Notes → Actions"
- Helps user see which workflow suggested or is relevant to this meeting

---

### 3. Daily Brief — workflow-driven blocks

**Current:** 4 blocks with hardcoded items.

**Proposed:** Derive block content from enabled workflows.

| Block | User Defined workflows | Tomo Default workflows |
|-------|------------------------|------------------------|
| **Priority Follow-ups** | Warm Intro Tracker, Post-Meeting Execution, Update → Follow-Up, No Response → Re-engage | — |
| **Meetings Requiring Prep** | Post-Meeting Execution | Meeting Notes → Actions |
| **Momentum Signals** | No Response → Re-engage, Update → Follow-Up | — |
| **Open Execution Loops** | DDQ Response Engine | Website → CRM Sync, Email Scheduling Assistant |

**Implementation:** Create a `getDailyBriefFromWorkflows()` helper that:
- Takes `suggestedPlaybooks`, `tomoDefaultWorkflows`, `relationships`, `actions`, `commitments`, `briefs`
- Returns blocks with items derived from workflow targets and mock evidence
- Keeps the same block structure (icon, title, subtitle, items, insight)

---

### 4. New: Workflow activity card (optional)

**Proposed:** Add a third column or a collapsible section: **"Workflow activity"**

- **User Defined:** "X LPs match [workflow name] criteria" with link to workflows
- **Tomo Default:** "X scheduling emails need response", "X contacts need website scan for CRM updates"
- Surfaces workflow-driven opportunities without cluttering the main cards

---

### 5. Suggested workflows — include Tomo Default

**Current:** `SuggestedWorkflows` (in BriefDetail drawer) shows only User Defined playbooks.

**Proposed:**
- Extend to show both User Defined and Tomo Default workflows
- Tomo Default: simple trigger → action, no target count
- User Defined: name, description, target count (unchanged)

---

## Data model changes

| Entity | Change |
|--------|--------|
| `ActionItem` | Add optional `workflowTomoDefaultId?: string` (for Tomo Default–triggered actions) |
| `Commitment` | Add optional `workflowContext?: string` or `workflowPlaybookId?: string` |
| Mock data | Add 1–2 actions with `workflowTomoDefaultId`; add workflow context to 1–2 commitments |

---

## Implementation order (suggested)

1. **Phase 1:** Daily Brief — workflow-driven blocks (biggest impact)
2. **Phase 2:** Action cards — workflow badge for both User Defined and Tomo Default
3. **Phase 3:** Suggested workflows — include Tomo Default
4. **Phase 4:** Coming up — workflow context on commitments
5. **Phase 5 (optional):** Workflow activity card

---

## Open questions

1. **Tomo Default on Today:** Should Tomo Default workflows surface as "suggested" items (e.g. "2 emails need scheduling") even without real email/website data? (We’d use mock counts for now.)
2. **Workflow activity card:** Add as a third column, or fold into Daily Brief?
3. **Commitment workflow context:** Store in mockData or derive from brief/action linkage?

---

*Draft for review — feedback welcome before implementation.*
