# Tomo MVP (March 31, 2026)

This document has two layers:

1. **MVP product scope** — what TOMO is intended to ship with (integrations, Stripe, Settings, security posture). This restores **MVP 2** intent alongside the mock app.
2. **Current repository** — the Next.js prototype (mock auth, mock data, `localStorage`, stub integration buttons). Where behavior differs from MVP, it is labeled **prototype only**.

**Resolved decisions (product):** No dedicated **Momentum** page or **“View in Momentum”** links. **Pipeline** is the canonical IA for list building (legacy `/targets` may redirect). **Today** uses **“What needs your attention”** and **“Coming up”** only (no separate momentum-shifts column). **Google Sheets export** is in MVP. **Slack / Telegram** and **Cmd+K / global omnibar** are **post-MVP**. **Briefs** as a product surface (dedicated tab/page flow) is **out of MVP**. **Tomo** is **not** required to be collapsed by default—inline chat on **Today** and **Workflows** matches MVP UX. **Activity** remains a **user + Tomo/system** audit trail.

---

## 1. Product overview

**TOMO** is a lightweight, AI-assisted execution workspace for fundraising, investor relations, and deal flow. The MVP focuses on a clean, fast workflow that is accurate, reliable, privacy-preserving, and shippable.

**Core value in MVP:**

- Auto-organise investor interactions from **Google Workspace** or **Microsoft 365** (**Gmail / Outlook** email, **calendar**, **contacts**).
- Maintain a clean **relationship system** with minimal manual data entry; Tomo reasons over synced metadata (and optional content where policy allows).
- Turn context into **next steps** inside **Today**, with **human-in-the-loop** for outbound actions.
- Make **movement and health** visible through the **relationship** and **materials** surfaces (and **pipeline** / funnel views)—without a separate momentum analytics page.
- Support **list building** via **Pipeline** (saved filtered lists, funnel-style views, workflow audiences). Legacy URLs may redirect **`/targets`** → **`/pipeline`**.
- Provide **traceability** via an **Activity** audit trail: **chronological log of user actions and Tomo/system actions**, with filters and detail.
- Run **Tomo** as a **server-orchestrated agent** with **tool calls** (structured actions), not chat-only: filters, CRM updates, workflow edits, and drafts are invoked through **surface-gated tools** (see §3). This layer is **new versus original MVP2** copy and is central to the current product/engineering plan.

**Prototype note:** The repo still uses **mock** mail/calendar/contacts and **stub** OAuth; see §4 for MVP vs prototype integrations and §9 for the prototype vs MVP matrix.

---

## 2. Web workspace scope

### 2.1 Global layout and navigation (prototype IA)

**Desktop:** Left rail: **Today**, **Relationships**, **Pipeline**, **Workflows**; below that, **Activity**, **Settings**.

**Mobile:** Bottom nav with the same six items.

**MVP 2 intent (not fully reflected in the prototype):**

- **Header:** **Global search** and a **Fund selector** dropdown (**All** + per-fund list; fund list **managed in Settings**). In the prototype, header search is absent (`/search` only) and the fund selector is **implemented but hidden** in code.

### 2.2 TOMO assistant (chat)

**MVP UX:** Tomo is **not** collapsed by default everywhere. **Today** and **Workflows** use **inline** chat so the assistant is visible in the primary workflow. Other areas use a **FAB → dock/sheet** that starts closed until the user opens it. **Suggestion chips** are **context-aware** (page + selected entity where applicable).

**Prototype:** Matches the above pattern; chips and **which API surface** (`general`, `drawer`, `workflow`, `filter`, `workflow_creator`) vary by screen—see §3.

### 2.3 Today (primary execution surface)

**MVP:** Full-width main column; **inline Tomo** + **Daily Brief** modal; **“What needs your attention”** and **“Coming up”** only—no separate **“Momentum shifts”** column. Selecting an item opens a **context drawer** (detail, Tomo section, activity snippet) without navigating away. Rich previews (due dates, short evidence, status) apply to attention items where relevant.

**Not in MVP:** A standalone **Briefs** page or materials **Briefs** tab as a required surface (see §8).

### 2.4 Pipeline (list building, funnel, workflows)

**Pipeline** (`/pipeline`): natural-language + structured filters, **named saved lists**, funnel-style stage distribution, workflow linking. This is the canonical **list-building** experience for outreach planning and workflow audiences.

### 2.5 Workflows

Playbooks (suggested, Tomo defaults, user-created), visual process flow, AI-assisted editing (streaming in repo on this surface).

### 2.6 Relationships

List / card / kanban, filters, drawer detail (snapshot, status, open loops, path to actions). In MVP, backed by the **built-in relationship model** + sync, not only mocks.

### 2.7 Materials

Investor-facing materials with engagement and momentum-style signals (metadata-first; no MVP requirement for a separate briefs-oriented tab or route).

### 2.8 Activity (audit trail)

Chronological **audit trail** of **user-initiated actions** and **Tomo/system actions** (what the user did and what Tomo did), with filters (**fund**, **event type**, **date range**) and a **list + detail** layout. Activity sits **above Settings** in the nav.

### 2.9 Settings (**MVP 2** — intended ship scope)

Settings is a first-class MVP surface and includes:

| Section | MVP purpose |
|--------|-------------|
| **Profile** | Identity and preferences used for personalization (e.g. Today summaries, Tomo tone). |
| **Integrations** | **Google** and **Microsoft 365**: **email (Gmail / Outlook)**, **calendar**, **contacts**. Connection status, reconnect, and policy hooks for what Tomo may ingest. |
| **Notifications** | Delivery preferences (**email**, **in-app**) for recaps, meeting prep, follow-ups, escalations—aligned to what MVP channels support. |
| **Billing & plan** | **Stripe**: current plan, upgrade/manage seats, Customer Portal as appropriate. |
| **Funds** | **Fund management** — configure the list that feeds the **Fund selector** (All + funds). |

**Post-MVP:** **Slack** and **Telegram** (messaging connectors and notification routing) — see §8.

**Prototype:** Sections exist; integration and Stripe flows are **stubs / local state** until backend wiring. Prototype onboarding UI may still show Slack/Telegram placeholders.

---

## 3. Tomo agent orchestration and tools *(new vs original MVP2)*

Original MVP2 narrative did not spell out an **agent runtime**. The current app is built around a **unified orchestrator** that streams assistant turns and exposes **tools** (callable skills) the model may invoke—**scoped by surface** so the agent cannot use inappropriate capabilities from the wrong UI context.

### 3.1 MVP intent

- **Single orchestration entry** (conceptually `POST /api/tomo/orchestrate` in the prototype) with **tenant-scoped** execution in production.
- **Tool calls** are the contract for side effects: filtering, CRM writes, workflow definition changes, and drafts—not free-form text claiming an action occurred.
- **Surface gating** reduces mistaken cross-feature behavior and narrows the attack surface versus “all tools always on.”
- **Human-in-the-loop** for outbound: draft tools return content for review; **no autonomous send** from the agent.
- **Activity** (and server **audit logs**) should record **significant tool executions** and integration actions in production; the prototype Activity feed is mock-oriented.

### 3.2 APIs and implementation (prototype)

| Piece | Role |
|-------|------|
| `POST /api/tomo/orchestrate` | Streaming agent (Vercel AI SDK `streamText` + OpenAI); registers **tools** based on `context.surface` and injects **system prompt** from `context` (`page`, `selection`, `todayContext`, `workflowContext`, `pipelineContext`, `workflowCreator`, etc.). |
| `POST /api/tomo/filter-relationships` | Standalone NL → structured filter criteria; shares parsing logic with the orchestrator’s `filter_relationships` tool (`parseFilterPrompt`). |
| `GET /api/version` | Build / deploy id. |

Orchestration source of truth in repo: `src/app/api/tomo/orchestrate/route.ts`.

### 3.3 Surfaces (`context.surface`) — which tools are allowed

| Surface | Tools exposed to the model |
|---------|----------------------------|
| **`general`** | `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply` |
| **`drawer`** | `update_crm`, `draft_reply` (entity-scoped; list-wide filter redirected to UI) |
| **`workflow`** | `update_workflow` only |
| **`filter`** | `filter_relationships`, `update_crm` (single-entity CRM rules; disambiguation via `relationshipLookup` in context) |
| **`workflow_creator`** | `create_user_workflow` only (name, trigger, action → client persists and links the pre-selected pipeline) |

The **Today** page uses **`general`** with rich **`todayContext`** (actions, commitments, daily brief blocks) in the system prompt so the model can answer “what needs attention” without necessarily calling tools.

### 3.4 Tools (skills / tool calls)

| Tool | Purpose |
|------|---------|
| **`filter_relationships`** | Natural language → structured **relationship filter criteria** (for Pipeline / Relationships list). |
| **`update_workflow`** | Replace **workflow definition** (title, trigger, ordered action/wait steps); returns markdown + definition for the UI. |
| **`update_crm`** | Apply **CRM field / status / reminder** updates on **`entityId`** or bulk **`relationshipIds`** (e.g. pipeline stage selection). |
| **`draft_reply`** | Produce an **email** or **meeting-invite** draft (prototype uses stub text; production uses policy-bound generation). |
| **`create_user_workflow`** | Finalize a **user-defined workflow** from the pipeline workflow-creator dialog; client applies persistence. |

**Prototype caveat:** `update_crm` / workflow apply paths are largely **stubbed** on the server (ack payloads); the UI may simulate application. Production MVP wires tools to **real persistence**, **RBAC**, and **policies**.

### 3.5 Related engineering docs

- `docs/WORKFLOW_CREATOR_ORCHESTRATOR_PLAN.md` — workflow creator and orchestrator roadmap/detail in this repository.

---

## 4. Integrations (MVP scope)

### 4.1 Google Workspace / Microsoft 365 (**MVP**)

**MVP ships** authenticated connections for:

- **Email** — Gmail and Microsoft Outlook (as exposed by each provider’s APIs).
- **Calendar**
- **Contacts**

**Ingestion model (MVP 2):** **Metadata-first** by default; **full message/body or attachment ingestion** is **optional** and **policy-controlled** on the server. Tokens and secrets are **not** stored in browser storage in production; the prototype’s `localStorage` flags are stand-ins only.

### 4.2 CRM and destinations (**MVP**)

- **Built-in relationship system** — contacts, organisations, interactions, tasks/loops, materials, actions (authoritative in MVP for IR workflow).
- **Affinity** — **optional MVP integration**: push/sync on a **fixed schema** and/or use as **source context for Tomo** (per product spec). Wire in Settings alongside Google/Microsoft.
- **Google Sheets export** — **MVP**: export to a **TOMO-defined layout** (Settings / workspace configuration as appropriate).

### 4.3 Tomo context sources (MVP)

For **MVP**, Tomo reasons primarily over data from:

- **Email** and **calendar** (Gmail / Outlook) and **contacts** (§4.1), under the metadata-first / policy-controlled ingestion model.
- **Optional Affinity** CRM as sync and/or context (§4.2).
- The **built-in relationship system** (interactions, tasks, materials, actions) once live sync exists.

**Post-MVP:** Optional **Tomo meeting bot** participation and **meeting transcripts** as additional ingestion/context—see §8.

---

## 5. Workspaces, funds, and user models (**MVP**)

### 5.1 Individual workspace (solo)

Private data and integrations per user; **Fund selector** segments work within the workspace.

### 5.2 Team workspace (shared)

Shared relationship data and shared views (Today, Pipeline, Workflows, Activity, etc.).

**RBAC (MVP 2):** **Admin**, **Partner**, **Analyst** — enforced **server-side**. Integrations remain **per-user** where OAuth requires it; workspace-level config for policies and destinations (e.g. Affinity, Sheets).

**Prototype:** Plan choice on auth is UI-only; no shared workspace or RBAC enforcement in app logic.

---

## 6. Subscription and billing (**Stripe** — **MVP**)

### 6.1 Plans

- **Individual** — one seat; core Google/Microsoft integrations; built-in relationship system; Pipeline, Today, Workflows, Activity; optional Affinity; **Google Sheets export** per packaging.
- **Team** — seat-based; shared data and views; RBAC; workspace-level export/destination configuration.

### 6.2 Upgrade path

**Individual → Team** via **Stripe Checkout**; upgrading user becomes **Admin**; existing data becomes shared. **Downgrade to Individual** not supported in MVP 2.

**Prototype:** No Stripe SDK or live Checkout in repo; Settings shows placeholder copy.

---

## 7. Security and compliance (**MVP target**)

MVP 2 baseline (production, not the mock):

- **Region selection** at onboarding (e.g. US/EU) with **in-region** storage and backups.
- **Encryption in transit** (TLS 1.2+) and **at rest** (KMS-managed keys).
- **Strict tenant isolation** and **server-side RBAC**.
- **Metadata-first** ingestion; **content ingestion opt-in** and policy-controlled.
- **No sensitive data** in **browser storage** (localStorage / IndexedDB / sessionStorage / cookies) for secrets or message bodies.
- **Human-in-the-loop** for outbound communication; **no autonomous sending**.
- **Audit logging** for authentication, admin actions, integration actions, and **material Tomo tool executions** (orchestrator §3) where they change data or integrations.
- **SOC 2** and **CASA Tier 2** checklist maintained as a **compliance appendix** in the broader system documentation set.

The **current prototype** violates several of these (e.g. `localStorage` session and flags) by design until auth, API, and Stripe are implemented.

---

## 8. Out of scope (MVP) and post-MVP

**Explicitly out of scope for MVP baseline:**

- **Dedicated Momentum page** (and **“View in Momentum”** links).
- **Briefs** as a dedicated product surface (no required Briefs page or materials briefs-tab flow in MVP).
- Multi-party conversational scheduling and automated meeting booking.
- Deep enrichment / web scraping for allocator intelligence.
- Additional CRMs beyond **Affinity** and **Google Sheets export**.
- Document ingestion/retrieval over Drive/SharePoint **beyond materials metadata** (unless product expands scope).
- Advanced permissions beyond **simple RBAC**.
- **Slack** and **Telegram** connectors and notification delivery (messaging product).
- **Cmd+K / global omnibar** search (header search remains the MVP pattern per MVP 2; omnibar-style UX is post-MVP).

**Post-MVP (directional):** Slack/Telegram as above; **Cmd+K / omnibar**; investor update drafting, DDQ Q&A assistant, notes (including voice), proprietary momentum scoring, deliverable orchestration (deck/DDQ/data room).

**Post-MVP — Tomo meeting bot and transcripts:**

- **Tomo meeting bot (optional):** Users may **opt in** to adding a **Tomo bot participant** when **scheduling or joining** meetings (provider-specific: calendar invites, conference links, or equivalent). Scope includes consent UX, clear disclosure to other attendees, join/leave behavior, and compliance with recording/transcription rules in each jurisdiction and tenant policy. **MVP** still excludes multi-party conversational scheduling and automated meeting booking (see explicit out-of-scope list above); the **meeting bot** is a **post-MVP** capability layered on top of calendar/meetings integrations.
- **Meeting transcripts as a Tomo input source:** **Transcripts** (and associated metadata: time, attendees, linked calendar event) become a **first-class context source** for Tomo alongside **email**, **calendar**, **contacts**, and **Affinity**—subject to the same **tenant policies**, **retention**, and **metadata-first vs full-content** choices as other channels. Used for prep (e.g. Today), relationship timelines, Activity, and **orchestrator context** (§3) when wired—**post-MVP**.

---

## 9. Prototype vs MVP (repository honesty)

| Area | MVP intent | This repo today |
|------|------------|-----------------|
| Gmail / Outlook, Calendar, Contacts | Real OAuth + sync | Stub UI / `localStorage` |
| Affinity | Optional, Tomo source / push | Stub |
| Google Sheets export | MVP | Stub |
| Stripe | Checkout + portal | Not wired |
| Settings | MVP sections (no Slack/Telegram in MVP) | UI + stubs; onboarding may show Slack/Telegram |
| Fund header selector | Visible | Hidden in `app-shell` |
| Header global search | Yes | Only `/search` page |
| Security / storage | Server sessions, no secrets in browser | Mock session in `localStorage` |
| Tomo orchestrator + tools | Surface-gated tool calls, audit in prod | Implemented routes + stubs for CRM/draft apply |
| Tomo meeting bot + transcript ingestion | Post-MVP optional bot + transcripts as context | Not in repo |

---

## 10. Engineering reference (prototype routes)

| Route | Behavior |
|--------|----------|
| `/` | Auth / onboarding / home redirect |
| `/home` | Today |
| `/relationships` | Relationships |
| `/pipeline` | Pipeline |
| `/workflows` | Workflows |
| `/activity` | Activity log |
| `/settings` | Settings |
| `/targets` | Redirect → `/pipeline` |
| `/today` | Redirect → `/home` |
| `/tasks` | Redirect → `/activity` |
| `/contacts` | Redirect → `/relationships` |
| `/lp-network` | LP Network mock — qualified intro list (prototype; not MVP `Relationship` schema) |
| `/lp-network/mandate` | LP mandate preview / intros panel (prototype) |

**Also in prototype (not MVP requirements):** `/materials`, `/search`; legacy **`/briefs`** redirect may exist in code but **Briefs** is not part of the MVP spec (§8).

**Stack:** Next.js 16, React 19, Tailwind CSS 4, Vercel AI SDK, Zod 4, Sonner.

**APIs in repo:** `POST /api/tomo/orchestrate`, `POST /api/tomo/filter-relationships`, `GET /api/version`. **Orchestration and tools:** §3.

---

*Last updated March 31, 2026 — MVP scope, orchestration, and resolved product decisions aligned.*
