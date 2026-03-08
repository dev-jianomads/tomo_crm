# Drawer Implementation Plan

> **Goal:** Transform the drawer into a contextualised, Tomo-assisted execution space with 3 sections. Tomo speaks first (agent-like). Powered by Vercel AI SDK. Designed for reuse across Today, Relationships, Activity, Materials, and other pages.

---

## 1. Design

### 1.1 Three Sections

| Section | Purpose | Content |
|--------|---------|---------|
| **1. Content Details** | Selected entity's core data | Action/Commitment/Brief metadata, evidence, status, linked entities |
| **2. Tomo Chat** | Agent-like conversational assistance | Tomo's initial message (CRM updates, drafts, insights, workflows) + suggestion chips + chat |
| **3. Activity Log** | Entity-specific history | Timestamp, actor (TOMO/User), summary |

### 1.2 Layout

```
┌─────────────────────────────────────┐
│ [Title]                        [X]   │
├─────────────────────────────────────┤
│ Section 1: Content Details           │
│ - Entity header, evidence, status    │
│ - Scrollable                         │
├─────────────────────────────────────┤
│ Section 2: Tomo Chat                 │
│ - Tomo's initial message (rich)      │
│ - Suggestion chips + messages + input│
│ - Fixed height, scrollable           │
├─────────────────────────────────────┤
│ Section 3: Activity Log             │
│ - ts | actor | summary               │
│ - Compact, fixed at bottom           │
└─────────────────────────────────────┘
```

### 1.3 Data Flow

```
Card click → selection (type + id)
    ↓
Drawer opens with:
  - Section 1: Entity data (from mockData / API)
  - Section 2: Tomo Chat — initialMessage + suggestedPrompts from getTomoAssistance(id), then useChat for conversation
  - Section 3: Activity log (from entity data)
```

---

## 2. Tomo Initial Message

When the drawer opens, Tomo speaks first with context. The initial message is rendered as static UI above the `useChat` conversation (same pattern as Workflows page `welcomeText`).

### 2.1 Content Mapping

| Block Type | Initial Message Pattern | Example |
|------------|-------------------------|---------|
| **crm_update** | "Can I update CRM as follows?" + table | "Can I update CRM? [Field / Current / Update / Reason table]" |
| **draft** | "Here's a draft:" + content | "Here's a draft email: [body]. Want me to adjust?" |
| **insight** | Lead with insight, offer help | "Northwind momentum is up. I can draft the email or run the workflow." |
| **status** | Combine with CRM or standalone | "Suggested status: Blocked. Want me to apply and set a reminder?" |
| **reminder** | Combine or standalone | "Set a 3-day reminder?" |
| **workflow** | Mention + suggestion chip | "Suggested workflow: **No Response → Re-engage**." |
| **brief** | Summary + agenda + commitments | "Here's a Tomo-drafted brief: [summary]. Agenda: [list]." |

### 2.2 Data Model

```ts
export type TomoInitialMessage = {
  text: string;
  blocks?: TomoMessageBlock[];
};

export type TomoMessageBlock =
  | { kind: "crm_table"; rows: { field: string; current: string; update: string; reason: string }[] }
  | { kind: "draft"; content: string; type?: "email" | "invite" }
  | { kind: "brief"; summary?: string; agenda?: string[]; commitments?: string[] }
  | { kind: "workflow_link"; playbookId: string; name: string };

export type TomoAssistance = {
  initialMessage: TomoInitialMessage;
  suggestedPrompts: string[];
};
```

Mock module `src/lib/mockTomoAssistance.ts` maps entity id → `TomoAssistance`. Adapter `blocksToInitialMessage()` converts existing `blocks` during migration.

---

## 3. Components

| Component | Responsibility |
|-----------|----------------|
| `ContextDrawer` | 3-section shell (Content → Tomo Chat → Activity Log), header, close, ESC. |
| `DrawerSection2TomoChat` | Static initial message (`TomoMessageContent`) + `useChat` conversation + suggestion chips. Ephemeral per card. |
| `TomoMessageContent` | Renders `text` + optional rich `blocks` (crm_table, draft, brief, workflow_link). |
| `DrawerSection3ActivityLog` | Activity log entries at bottom. |

Existing `ActionDetail`, `CommitmentDetail`, `BriefDetail` use `detailsOnly` mode for Section 1 (no Tomo blocks, no activity log).

---

## 4. Vercel AI SDK

### 4.1 Client

```ts
const transport = useMemo(
  () =>
    new DefaultChatTransport({
      api: "/api/tomo/drawer-chat",
      body: {
        entityId: entityKey,
        selection: { type: selection.type, id: selection.id },
        assistanceContext: getTomoAssistance(entityKey),
      },
    }),
  [entityKey, selection]
);

const { messages, sendMessage, setMessages } = useChat({ transport });

// Reset when card changes
useEffect(() => { setMessages([]); }, [entityKey, setMessages]);
```

### 4.2 API Route: `/api/tomo/drawer-chat`

1. Read `messages`, `entityId`, `assistanceContext` from request body.
2. Build system prompt with card context + `assistanceContext.initialMessage.blocks`.
3. Define tools: `apply_crm_updates`, `set_reminder`, `apply_blocked_status`.
4. Return `streamText(...).toUIMessageStreamResponse()`.

### 4.3 Message Shape

`useChat` uses `UIMessage[]` with `parts`. Current `TomoAssistant` uses `TomoMessage[]` with `{ from, text }`. Options:
- Adapt `TomoAssistant` to render `UIMessage.parts`, or
- Thin wrapper mapping `UIMessage` → `{ from, text }` for existing UI.

---

## 5. Implementation Phases

### Phase 1: Foundation (Low Risk)

> Drawer shell with content details + activity log. Tomo Chat is a placeholder.

| Task | Description |
|------|-------------|
| 1.1 | Modify `ContextDrawer` to 3-section layout (remove `section2Content` prop) |
| 1.2 | Refactor `ActionDetail`, `CommitmentDetail`, `BriefDetail` to support `detailsOnly` mode |
| 1.3 | Wire Section 1 into `ContextDrawer`; connect selection from home page |
| 1.4 | Replace `ApprovalDrawer` usage on home with `ContextDrawer` |
| 1.5 | Rename `DrawerSection4ActivityLog` → `DrawerSection3ActivityLog`; wire into Section 3 |

**Shippable outcome:** Drawer opens with entity details (Section 1) and activity log (Section 3). Section 2 shows placeholder.

---

### Phase 2: Initial Message + Mock Chat (Medium Risk)

> Tomo speaks first with rich content. Chat still uses mock responses.

| Task | Description |
|------|-------------|
| 2.1 | Add `TomoInitialMessage`, `TomoMessageBlock` types; add `blocksToInitialMessage()` adapter |
| 2.2 | Migrate `mockTomoAssistance.ts` from `blocks` to `initialMessage` format |
| 2.3 | Create `TomoMessageContent` component (renders crm_table, draft, brief, workflow_link) |
| 2.4 | Create `DrawerSection2TomoChat` with static initial message above mock chat |
| 2.5 | Wire `getTomoAssistance(selection.id)` → pass `initialMessage` + `suggestedPrompts` |
| 2.6 | Remove `DrawerSection2TomoAssistance` and `DrawerSection3TomoChat` |

**Shippable outcome:** Drawer fully functional with Tomo speaking first (rich initial message) and mock chat responses. No SDK dependency yet.

---

### Phase 3: Vercel AI SDK (High Risk)

> Replace mock chat with real AI. Separate from UI work to isolate risk.

| Task | Description |
|------|-------------|
| 3.1 | Create `/api/tomo/drawer-chat` route with system prompt, context injection, tools |
| 3.2 | Define tools: `apply_crm_updates`, `set_reminder`, `apply_blocked_status` |
| 3.3 | Replace mock `onSend` in `DrawerSection2TomoChat` with `useChat` + `DefaultChatTransport` |
| 3.4 | Pass `entityId`, `selection`, `assistanceContext` via transport `body` |
| 3.5 | Handle `UIMessage` rendering (adapt `TomoAssistant` or add wrapper) |
| 3.6 | Ephemeral chat: reset messages on `entityKey` change |

**Shippable outcome:** Drawer chat is AI-powered. If this phase hits issues, Phase 2 mock chat still works.

---

### Phase 4: Polish (Low Risk)

| Task | Description |
|------|-------------|
| 4.1 | Workflow links in initial message navigate correctly |
| 4.2 | Fallback when no `initialMessage`: "What can I help you with?" + default suggestions |
| 4.3 | Extract `ContextDrawer` props interface for reuse on other pages |
| 4.4 | Mobile: side fly-in (same as desktop) |
| 4.5 | Optional: resizable split between Section 1 and Section 2 |

**Shippable outcome:** Drawer is polished and reusable across pages.

---

## 6. Files

| File | Phase | Action |
|------|-------|--------|
| `src/components/context-drawer.tsx` | 1 | **Modify** — 3-section layout, remove `section2Content` |
| `src/components/drawer-section-4-activity-log.tsx` | 1 | **Rename** → `drawer-section-3-activity-log.tsx` |
| `src/lib/mockTomoAssistance.ts` | 2 | **Modify** — migrate to `initialMessage` format |
| `src/components/tomo-message-content.tsx` | 2 | **Create** — renders rich blocks in initial message |
| `src/components/drawer-section-2-tomo-chat.tsx` | 2 | **Create** — initial message + mock chat |
| `src/components/drawer-section-2-tomo-assistance.tsx` | 2 | **Remove** |
| `src/components/drawer-section-3-tomo-chat.tsx` | 2 | **Remove** |
| `src/app/api/tomo/drawer-chat/route.ts` | 3 | **Create** — API route with tools |
| `src/components/drawer-section-2-tomo-chat.tsx` | 3 | **Modify** — replace mock with `useChat` |
| `src/app/home/page.tsx` | 1-3 | **Modify** — wire `ContextDrawer`, remove old Section 2 wiring |

---

## 7. Risks

| Risk | Impact | Phase | Mitigation |
|------|--------|-------|------------|
| **Context for action execution** | High | 3 | Pass `assistanceContext.initialMessage.blocks` in transport `body`; include in system prompt. |
| **Rich message rendering** | Medium | 2 | `TomoMessageContent` handles each block kind; reuse styles from existing renderers. |
| **UIMessage vs TomoMessage** | Medium | 3 | Adapter or wrapper to bridge shapes. Isolate in Phase 3 so Phase 2 mock works regardless. |
| **Two API routes** | Low | 3 | Workflows use `/api/tomo/chat`; drawer uses `/api/tomo/drawer-chat`. Share base utilities. |
| **Workflow block in chat** | Medium | 2 | Use suggestion chip "Run workflow" or inline link instead of button. |
| **Long initial messages** | Low | 2 | Keep concise; collapsible sections for drafts if needed. |
| **Chat context collision** | High | — | **Resolved:** Drawer chat is card-specific; main Tomo chat is global. |
| **Approval flows** | Medium | — | **Resolved:** Use chat suggestions, no explicit buttons. |

---

## 8. Decisions

| Decision | Choice |
|----------|--------|
| **Chat scope** | Drawer = card-specific (ephemeral); main = global |
| **Initial message** | Static UI above `useChat` (like Workflows `welcomeText`) |
| **Approval flows** | Chat suggestions ("Approve & send", "Reject", "Edit draft") |
| **Commitments** | Section 1 = details; Section 2 = Tomo's initial message with drafted brief |
| **Mobile** | Side fly-in (same as desktop) |
| **SDK** | `useChat` + `DefaultChatTransport` + `/api/tomo/drawer-chat` |

---

## 9. Summary

- **3 sections:** Content Details → Tomo Chat (initial message + conversation) → Activity Log.
- **4 phases:** Foundation → Initial Message + Mock Chat → Vercel AI SDK → Polish.
- **Each phase is independently shippable.** Phase 3 (SDK) is isolated so Phase 2 mock chat is the fallback.
- **Vercel AI SDK:** `useChat`, `DefaultChatTransport`, `/api/tomo/drawer-chat` with tools (`apply_crm_updates`, `set_reminder`, `apply_blocked_status`).
- **Reuse:** `ContextDrawer` designed with generic props for other pages.
