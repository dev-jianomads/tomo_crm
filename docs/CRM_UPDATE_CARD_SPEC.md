# CRM Update Card (a3) — Spec & Mock Data

> **First card** in "What needs your attention". Middle step in a workflow. Trigger: "No response in 5d". Card appears because of the **Set reminder** suggestion.

**Clarification:** CRM is the source of truth. Tomo's suggested updates are temporary — user applies or rejects via chat.

**Workflow linkage:** This card is the middle step of playbook `pb-no-response-stall` ("No Response → Re-engage"). Drawer has a "View workflow" button that navigates to `/workflows?playbook=pb-no-response-stall`.

---

## 1. Card (list view)

| Field | Value |
|-------|-------|
| **Title** | Update CRM: Lumen interest and next step |
| **Meta** | No response in 5d |
| **Pills** | Blocked, Overdue |

---

## 2. Section 1: Content Details

| Field | Value |
|-------|-------|
| **Header** | Action — "Lumen interest and next step" |
| **Why** | No response in 5d |
| **Status** | Blocked |
| **Evidence** | No reply after 2 follow-ups, Opened performance note once, Stall risk rising |

---

## 3. Section 2: Tomo Assistance (3 blocks)

### Block 1: Pill / label — "Blocked"
- **Label:** Suggested status
- **Content:** Tomo suggests marking this as **Blocked** (explains why it's in attention)

### Block 2: Set reminder
- **Label:** Set reminder
- **Content:** Set a 3-day reminder
- *This is why the card appears in "What needs your attention"*

### Block 3: CRM updates (table)
- **Label:** Proposed updates (temporary suggestions — CRM is source of truth)
- **Rows:**

| Field | Current | Update | Reason |
|-------|---------|--------|--------|
| Stall risk | — | Rising | No response in 5d |
| Status | — | Blocked | No response in 5d |

---

## 4. Section 3: Tomo Chat — dynamic suggestions

Derived from Section 2 blocks:
- "Apply blocked status"
- "Set reminder"
- "Apply CRM updates"
- "Explain why blocked"
- "Skip reminder"

---

## 5. Section 4: Activity Log (past only — 2 touches)

| ts | actor | summary |
|----|-------|---------|
| 5d ago | User | Initial reach out |
| 2d ago | User | Follow-up |

*Both touches are User — Tomo only drafts; user sends emails. No "Today" entries.*

---

## 6. Mock data changes

### `mockData.ts` — action a3 (first in list)

```ts
{
  id: "a3",
  title: "Update CRM: Lumen interest and next step",
  status: "blocked",
  trigger: "No response in 5d",
  evidence: ["No reply after 2 follow-ups", "Opened performance note once", "Stall risk rising"],
  type: "crm_update",
  suggestedUpdates: ["Stall risk: Rising", "Status: Blocked"],
  dueDate: "2025-03-01",
  activityLog: [
    { id: "al5", ts: "5d ago", actor: "User", summary: "Initial reach out" },
    { id: "al6", ts: "2d ago", actor: "User", summary: "Follow-up" },
  ],
}
```

### `mockTomoAssistance.ts` — a3

```ts
"a3": {
  blocks: [
    { kind: "status", label: "Suggested status", value: "Blocked" },
    { kind: "reminder", label: "Set reminder", content: "Set a 3-day reminder" },
    {
      kind: "crm_update",
      label: "Proposed updates",
      rows: [
        { field: "Stall risk", current: "—", update: "Rising", reason: "No response in 5d" },
        { field: "Status", current: "—", update: "Blocked", reason: "No response in 5d" },
      ],
    },
  ],
  suggestedPrompts: ["Apply blocked status", "Set reminder", "Apply CRM updates", "Explain why blocked", "Skip reminder"],
},
```
