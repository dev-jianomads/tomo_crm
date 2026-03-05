# Drawer 4-Section Implementation Plan

> **Goal:** Transform the drawer into a contextualised, Tomo-assisted execution space with four distinct sections. Design for reuse across Today, Relationships, Activity, Materials, and other pages.

---

## 1. Design Overview

### 1.1 Four Sections (Top → Bottom)

| Section | Purpose | Content |
|--------|---------|---------|
| **1. Content Details** | Show the selected entity’s core data | Action/Commitment/Brief metadata, evidence, status, linked entities |
| **2. Tomo Assistance** | AI-generated execution aids | Insight, draft replies, CRM updates, suggested workflows — **dynamic per card type** |
| **3. Tomo Chat** | Contextual chat with suggested prompts | Same TomoAssistant UI as home; **suggestions derived from Section 2** |
| **4. Activity Log** | Entity-specific activity history | Timestamp, actor (TOMO/User), summary — at bottom of drawer |

### 1.2 Data Flow

```
Card click → selection (type + id)
    ↓
Drawer opens with:
  - Section 1: Entity data (from mockData / API)
  - Section 2: Tomo outputs (mocked per card type; later from Tomo API)
  - Section 3: Tomo chat with suggestions (derived from Section 2)
  - Section 4: Activity log (from entity; e.g. action.activityLog)
```

---

## 2. Section Specifications

### Section 1: Content Details

- **Purpose:** User sees what they selected — the “what” before the “how.”
- **Content:** Entity-specific (action, commitment, brief).
- **Source:** Existing `ActionDetail`, `CommitmentDetail`, `BriefDetail` — **refactored** to render only the “details” portion (no Tomo blocks, no workflows, no chat).
- **Layout:** Scrollable block; compact header + evidence/metadata.

### Section 2: Tomo Assistance (Dynamic)

- **Purpose:** Tomo’s pre-computed outputs for this context.
- **Content:** Varies by card type. Possible blocks:
  - **Tomo insight** — short contextual note (e.g. “Keep the next move tight and confirm owner”)
  - **Draft replies** — email/meeting invite drafts
  - **Update to CRM** — proposed field changes
  - **Suggested workflow** — playbook(s) to run
- **Per card type:**

| Card Type | Typical Section 2 Blocks |
|-----------|--------------------------|
| Action (outreach) | Insight, Draft email, Suggested workflow |
| Action (scheduling) | Insight, Draft invite, Suggested workflow |
| Action (crm_update) | Insight, CRM updates, Suggested workflow |
| Action (follow_up) | Insight, Draft follow-up, Suggested workflow |
| Commitment | Insight (meeting prep), **Tomo-drafted brief** (when linked), Suggested workflow |
| Brief | Insight (summary), Agenda draft, Commitments draft, Suggested workflow |

- **Source:** Mock per card; later from Tomo API. Each block is optional.

### Section 3: Tomo Chat

- **Purpose:** User can ask follow-ups, refine drafts, or run ad-hoc commands.
- **Content:** `TomoAssistant` (same as home page).
- **Dynamic suggestions:** Derived from Section 2. Examples:
  - If Section 2 has draft email → “Tone it down”, “Make it shorter”, “Add next steps”
  - If Section 2 has CRM updates → “Explain why this update”, “Add another field”
  - If Section 2 has suggested workflow → “Run this workflow”, “Explain this playbook”
  - **Approval flows:** “Approve & send”, “Reject”, “Edit draft” — via chat suggestions, not explicit buttons
  - Fallback: “Explain why urgent”, “Draft follow-up”, “Propose times”, “Create action”

### Section 4: Activity Log

- **Purpose:** Show entity-specific activity history (what happened, when, by whom).
- **Content:** List of entries: `{ ts, actor: "TOMO" | "User", summary }`.
- **Source:** From entity data — e.g. `action.activityLog`, or mock "Recent activity" for commitments/briefs.
- **Layout:** Compact block at bottom; scrollable if many entries; fixed/collapsible height.
- **Placement:** Always at the very bottom of the drawer, below Tomo Chat.

---

## 3. Mock Data Strategy

### 3.1 Should Cards Mock Data for Sections 1, 2, 3, 4?

**Recommendation: Yes, with a clear split.**

| Section | Data Source | Rationale |
|---------|-------------|-----------|
| **1. Content Details** | Existing entity data (actions, commitments, briefs) | Already in mockData; no change to card payload |
| **2. Tomo Assistance** | **New mock structure per entity** | Cards don’t need to hold this; drawer fetches by `selection.type` + `selection.id` |
| **3. Chat suggestions** | **Derived from Section 2** | Computed when Section 2 is known; no extra card data |
| **4. Activity Log** | Entity data (e.g. `action.activityLog`) or mock | Actions have `activityLog`; commitments/briefs use mock "Recent activity" |

### 3.2 Proposed Mock Structure for Section 2

Add a new mock module (e.g. `src/lib/mockTomoAssistance.ts`) that maps entity id → Tomo outputs:

```ts
// mockTomoAssistance.ts
export type TomoAssistanceBlock =
  | { kind: "insight"; label: string; content: string }
  | { kind: "draft"; label: string; content: string; type?: "email" | "invite" }
  | { kind: "crm_update"; label: string; rows: { field: string; current: string; update: string; reason: string }[] }
  | { kind: "workflow"; label: string; playbooks: { id: string; name: string; description: string }[] };

export type TomoAssistance = {
  blocks: TomoAssistanceBlock[];
  suggestedPrompts: string[];  // For Section 3
};

export const tomoAssistanceByEntity: Record<string, TomoAssistance> = {
  "a1": { blocks: [...], suggestedPrompts: ["Tone it down", "Make it shorter", ...] },
  "a2": { ... },
  "c1": { ... },
  "b1": { ... },
};
```

- **Cards:** No change. Cards only pass `{ type, id }` on click.
- **Drawer:** Looks up `tomoAssistanceByEntity[selection.id]` (with fallback for unknown ids).

### 3.3 Card Redesign / New Cards

- Cards remain **static** in structure: they display `title`, `meta`, `pills`, and trigger `onSelect(id)`.
- If you add new card types (e.g. “Momentum signal”, “Open loop”), you:
  1. Add the entity type and mock data.
  2. Add a `TomoAssistance` entry for that entity.
  3. Add a Content Details component for that type.
- No need to embed Section 2/3 data in the card itself.

---

## 4. Component Architecture

### 4.1 New / Refactored Components

| Component | Responsibility |
|-----------|----------------|
| `ContextDrawer` | New; replaces `ApprovalDrawer` for this use case. Renders 4-section layout, header, close. |
| `DrawerSection1ContentDetails` | Wrapper that renders ActionDetail/CommitmentDetail/BriefDetail **content only** (no Tomo blocks, no activity log). |
| `DrawerSection2TomoAssistance` | Renders blocks from `TomoAssistance` (insight, draft, crm_update, workflow). |
| `DrawerSection3TomoChat` | Wraps `TomoAssistant` with drawer-specific context + dynamic suggestions. |
| `DrawerSection4ActivityLog` | Renders activity log entries (ts, actor, summary) at bottom of drawer. |

### 4.2 Refactor Existing Detail Components

- **ActionDetail**, **CommitmentDetail**, **BriefDetail**: Extract a “details-only” variant (or prop `mode="detailsOnly"`) that:
  - Keeps: header, evidence, metadata, status.
  - Removes: Tomo insight boxes, draft blocks, CRM update tables, SuggestedWorkflows, explicit approval buttons, **activity log** (moved to Section 4).
- **Commitment (Coming up):** Section 1 = commitment details; Section 2 = **Tomo-drafted brief** (summary, agenda, commitments) when `briefId` exists.
- Use these inside `DrawerSection1ContentDetails`.

### 4.3 Drawer Layout (Visual)

```
┌─────────────────────────────────────┐
│ [Title]                        [X]   │  ← Header (existing)
├─────────────────────────────────────┤
│ Section 1: Content Details           │
│ - Entity header, evidence, status    │
│ - Scrollable                         │
├─────────────────────────────────────┤
│ Section 2: Tomo Assistance           │
│ - Insight | Draft | CRM | Workflow   │
│ - Dynamic blocks, scrollable         │
├─────────────────────────────────────┤
│ Section 3: Tomo Chat                 │
│ - Suggestion chips (from Section 2)  │
│ - Messages + input                   │
│ - Fixed height, scrollable messages  │
├─────────────────────────────────────┤
│ Section 4: Activity Log             │
│ - ts | actor | summary               │
│ - Compact, at bottom                 │
└─────────────────────────────────────┘
```

- **Resize:** Optional: allow user to drag between Section 2 and Section 3 (Phase 4).
- **Scroll:** Section 1 and 2 scroll together; Section 3 has its own scroll for messages; Section 4 compact/fixed at bottom.
- **Mobile:** Side fly-in (same as desktop); no full-screen or bottom sheet.

---

## 5. Implementation Phases

### Phase 1: Structure & Section 1 (Foundation)

| Task | Description |
|------|-------------|
| 1.1 | Create `ContextDrawer` component with 4-section layout (fixed structure, placeholder content for 2 & 3, Section 4 activity log) |
| 1.2 | Refactor `ActionDetail`, `CommitmentDetail`, `BriefDetail` to support `mode="detailsOnly"` |
| 1.3 | Integrate Section 1 into `ContextDrawer`; wire selection from home page |
| 1.4 | Replace `ApprovalDrawer` usage on home with `ContextDrawer` |

| 1.5 | Create `DrawerSection4ActivityLog`; extract activity log from ActionDetail/CommitmentDetail into Section 4 |

**Outcome:** Drawer opens with Section 1 and Section 4 populated; Sections 2 & 3 are placeholders.

---

### Phase 2: Section 2 (Tomo Assistance)

| Task | Description |
|------|-------------|
| 2.1 | Add `mockTomoAssistance.ts` with `TomoAssistance` type and mock data for actions, commitments, briefs |
| 2.2 | Create `DrawerSection2TomoAssistance` to render insight, draft, crm_update, workflow blocks |
| 2.3 | Wire Section 2 to `tomoAssistanceByEntity[selection.id]` |
| 2.4 | Add fallback when entity has no Tomo assistance (e.g. “No suggestions yet”) |

**Outcome:** Section 2 shows dynamic Tomo blocks per card.

---

### Phase 3: Section 3 (Tomo Chat + Dynamic Suggestions)

| Task | Description |
|------|-------------|
| 3.1 | Create `DrawerSection3TomoChat` wrapping `TomoAssistant` |
| 3.2 | Pass `suggestedPrompts` from Section 2 mock into TomoAssistant `suggestions` prop |
| 3.3 | Provide drawer-specific `TomoChatContext` (or scoped provider) — **separate from main Tomo chat** |
| 3.4 | Drawer chat is **card-specific** (ephemeral per drawer open); main home Tomo chat remains **global** |

**Outcome:** Section 3 has Tomo chat with dynamic suggestions; drawer chat is isolated from main chat.

---

### Phase 4: Polish & Extensibility

| Task | Description |
|------|-------------|
| 4.1 | Optional: Resizable split between Section 2 and Section 3 |
| 4.2 | Extract `ContextDrawer` props interface for reuse (e.g. `selection`, `onClose`, `pageContext`) |
| 4.3 | Document adapter pattern for other pages (Relationships, Activity, Materials) |
| 4.4 | Mobile: **side fly-in** (same as desktop; no full-screen or bottom sheet) |

**Outcome:** Drawer is reusable and ready for other pages.

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Chat context collision** | High | **Resolved:** Drawer chat is card-specific and separate; main Tomo chat is global |
| **Section 2 mock drift** | Medium | Keep `TomoAssistance` shape aligned with future API; add `entityType` to mock for type-safe lookups |
| **Drawer too tall on small screens** | Medium | Section 3 fixed height (e.g. 200px); Sections 1 & 2 share remaining space with internal scroll |
| **Approval flows** | Medium | **Resolved:** Use chat suggestions ("Approve & send", "Reject", "Edit draft"); no explicit buttons |
| **Reuse on other pages** | Low | Design `ContextDrawer` with generic `selection: { type, id, ... }` and `getSection1Content`, `getTomoAssistance` as props or adapters |

---

## 7. Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/context-drawer.tsx` | **Create** — 4-section drawer shell |
| `src/components/drawer-section-1-content-details.tsx` | **Create** — wrapper for detail content |
| `src/components/drawer-section-2-tomo-assistance.tsx` | **Create** — Tomo blocks renderer |
| `src/components/drawer-section-3-tomo-chat.tsx` | **Create** — Tomo chat with suggestions |
| `src/components/drawer-section-4-activity-log.tsx` | **Create** — activity log at bottom |
| `src/lib/mockTomoAssistance.ts` | **Create** — mock Tomo outputs per entity |
| `src/components/approval-drawer.tsx` | **Keep** or **deprecate** — use ContextDrawer for all, or keep for approval-only overlay if needed |
| `src/app/home/page.tsx` | **Modify** — use ContextDrawer, pass selection, wire sections |
| `src/app/home/page.tsx` (ActionDetail, etc.) | **Modify** — add `detailsOnly` mode or extract detail-only components |

---

## 8. Resolved Decisions

| Decision | Choice |
|----------|--------|
| **Chat scope** | Drawer chat is **card-specific** (ephemeral per drawer open); main Tomo chat is **global** |
| **Approval flows** | Use **chat suggestions** (e.g. "Approve & send", "Reject", "Edit draft"); no explicit buttons |
| **Coming up (commitments)** | On click: Section 1 = commitment details; Section 2 = **Tomo-drafted brief** (summary, agenda, commitments) |
| **Mobile** | **Side fly-in** (same as desktop; no full-screen or bottom sheet) |

---

## 9. Summary

- **4 sections:** Content Details → Tomo Assistance → Tomo Chat → Activity Log.
- **Mock strategy:** Cards pass `{ type, id }`; drawer fetches Section 2 from `mockTomoAssistance`; Section 3 suggestions come from Section 2.
- **Phases:** 1 (structure + Section 1) → 2 (Section 2) → 3 (Section 3 + suggestions) → 4 (polish + reuse).
- **Decisions:** Drawer chat = card-specific; main chat = global. Approval via chat suggestions. Commitments show Tomo-drafted brief in Section 2. Mobile = side fly-in.
- **Reuse:** `ContextDrawer` designed with generic selection and adapters for Relationships, Activity, Materials.
