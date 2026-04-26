# Tomo MVP 3

**Stakeholder-facing alignment doc** for TOMO’s **MVP3** product definition and the **Next.js mock** in this repo (`tomo_crm`), **April 24, 2026**.

This document is organized in **four layers** so readers do not mix them up:

| Part | What it answers |
| --- | --- |
| **1. Introduction** | What TOMO is and what “MVP3” means here. |
| **2. What’s in the mock app** | What you can see and click in the **current repository** (prototype). |
| **3. From mock to MVP3 ship** | What is **missing or stubbed** relative to the **intended MVP3** release (backlog / product gap). |
| **4. Post-MVP** | What is **explicitly not** in MVP3 baseline (later). |

**Deep product and engineering detail** (sync rules, signal math, schema sketches, API tables) lives in **appendices** at the end.

---

## 1. Introduction

**TOMO** is a lightweight, **AI-assisted execution workspace** for fundraising, investor relations, and deal flow.

**MVP3** is the **evolution of the MVP2 vision**: same North Star, updated information architecture (no **Momentum** page; **Pipeline** is list-building; **Workflows** and **Tomo orchestration** are explicit), and clarified **integrations** and **messaging** scope.

**“Mock app”** in this doc means: the **code in this repository** (mock data, local auth/session patterns, stub integrations, partial server apply paths). It is **not** a promise of production behavior.

**Core value the product aims for in MVP3:**

- Connect **Google Workspace** / **Microsoft 365** (email, calendar, contacts) and keep a **clean relationship** record with **minimal** manual entry.
- Turn that context into **next steps** on **Today**, with **human-in-the-loop** outbound.
- **Pipeline (Lists)** for audience and list work; **Workflows** for playbooks; **Activity** for traceability.
- **Tomo** as an **orchestrating** assistant (context + **tool calls** + review), not chat-only.
- **Settings** as a first-class surface: profile, integrations, notifications, billing, funds.

**Tomo** = product name; **tomo_crm** = repository folder name in examples.

---

## 2. What’s in the mock app (this repository)

**Summary:** A **navigable UI** with **mock data** and a **real orchestrator route**; many “connected” or “paid” flows are **UI-only** or **stub** until backend work lands.

### 2.1 Navigation and shell

**Primary navigation** (desktop rail + mobile bottom bar): **Today** (`/home`), **Relationships**, **Lists** (route `/pipeline` — the Pipeline / list-building surface), **Workflows**, **Insights**, **Settings**. Source: `src/components/app-shell.tsx`.

**Not in the main nav** but implemented: **Activity** at `/activity` (direct URL or links).

**Extra prototype routes** (not described as core MVP3 IA, but in the app): **LP Network** (`/lp-network`…), **Materials** (`/materials`), standalone **`/search`**.

**Header:** Tomo title + user avatar placeholder. **No** global **search** in the header. **Fund** selector appears **in header on LP Network**; **not** globally for all pages.

**Legacy redirects (examples):** `/targets` → `/pipeline`; `/today` → `/home`; `/tasks` → `/home`; `/contacts` → `/relationships`; `/workflow` → `/workflows`; `/briefs` → `/materials?tab=briefs`.

### 2.2 Surfaces (high level)

| Surface | In the mock |
| --- | --- |
| **Today** | “What needs your attention” and “Coming up” columns; **On My Radar** (button + modal); **Daily Brief** / email demo flows; **context drawers** for actions and meetings. **List/detail** split in `AppShell` is **off** on Today. **Inline Tomo** defaults to a **single-line** expand-into-full-chat control (persisted). |
| **Pipeline / Lists** | Natural-language and structured list behavior, saved lists, workflow linkage, funnel-style ideas — **as implemented** with **mock** relationship data. |
| **Workflows** | Playbooks, Tomo defaults, custom flows, **drawer**-based editing; **no** **global** shell Tomo on this route (workflow-scoped Tomo in drawer). |
| **Relationships** | List / **kanban** / filters; **drawer** with Tomo/CRM/draft affordances. |
| **Activity** | Filterable log; **mock** feed. |
| **Settings** | Sections for profile, integrations, notifications, billing, funds; **stubs** for many connections and Stripe. **Slack / Telegram** may appear for demo copy. |
| **Insights** | **Demo** page (`/insights`) with **Singapore-style** mock metrics — **prototype slice**, not locked as a shipping requirement in §4. |

### 2.3 Tomo and agent orchestration (as coded)

- **Endpoint:** `POST /api/tomo/orchestrate` — streaming assistant with **surface-gated** tools (see **Appendix B**).
- **Today** can pass **`todayContext`** (actions, commitments, daily **brief** blocks) when the user has inline chat open.
- **Caveat:** many tool **apply** paths (e.g. CRM update persistence) are **acknowledged in code** but **not** fully wired to a production database — the UI may **simulate** state.

**FAB / dock / sheet:** Global Tomo is **not** on Today, Workflows, Relationships, or Pipeline; those surfaces use **inline** or **drawer** chat. **Insights** and **Settings** (among others) use a **FAB** → dock (desktop) or sheet (mobile).

### 2.4 Integrations, auth, billing, security (mock honesty)

- **Gmail, Outlook, Calendar, Contacts, Affinity, Sheets, Stripe:** **stub** or **local flags**; not production OAuth/token handling.
- **Session:** **mock** patterns (e.g. `localStorage`) **do not** meet production “no secrets in the browser” posture.
- **Team / RBAC:** plan choice in UI where present; **no** real **enforced** workspace RBAC in app logic (see **§3**).

### 2.5 Onboarding (`/onboarding`, mock)

- **Step 3 of 8** is **connect email** (the mock orders **calendar** and **contacts** before it). After a successful connect, a **second screen** on the **same** step asks whether TOMO may read roughly the **last 6 months** of mail for relationship enrichment, statuses, profile/summary, and tone-matched drafts, or **new mail only** (future sync; some of those features stay **limited** until the user enables history in **Settings**). The choice is stored client-side on `OnboardingState` as `emailHistoryScope` (`six_months` | `future_only`); production should align **OAuth** scopes, retention, and **server**-backed persistence.
- **Production** follow-on (not reflected in the mock): **async** computation of those **derived** fields, **placeholder** / **fallback** UI for **activity** and **snapshot**-style surfaces, and **incremental** plus **scheduled** **recompute** after mail **sync** are specified in **Appendix C** (**C.1** async derivation, **C.3** ongoing updates) and in `docs/EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md` under **Relationship intelligence (email-derived)**.

---

## 3. From mock to MVP3 ship (gaps)

This section is the **backlog in product terms**: what the **mock** is **missing** to match **MVP3 shipping intent** (as agreed in product decisions, not as “everything in Appendix C is done day one” — Appendix C is the **spec depth** for delivery teams).

### 3.1 Product shape and navigation

| Gap | MVP3 ship intent |
| --- | --- |
| **Activity** not in main nav | **Activity** in **primary** **navigation** (with Today, Relationships, Pipeline, Workflows, Settings) and **header** / mobile patterns aligned with spec. |
| **Insights** in primary nav; `/insights` demo | **Not** a committed MVP3 core nav item **unless** product pulls it in from **roadmap**; current page is a **slice** of future analytics, not a ship blocker by itself. |
| **“Lists”** vs “Pipeline” label | Aligned to **one** product vocabulary (repo already leans **Lists** in the shell; confirm with **PRODUCT_DECISIONS** and marketing). **Route** can stay `/pipeline`. |
| **No header search; only `/search`** | **Header** **search** (MVP2/MVP3 intent) with real index; **Cmd+K** / omnibar remains **out** of MVP3 (see **§4**). |
| **Fund selector** not global | **Fund** list from **Settings** drives a **global** **header** (or agreed) **selector** “All + funds” for relevant surfaces, not only LP Network. |
| **Materials / LP Network** in codebase | Treat as **prototype**; **MVP3** **scope** for LP-network-style flows is a **separate** product decision. |

### 3.2 Data, sync, and integrations

| Gap | MVP3 ship intent |
| --- | --- |
| Stub OAuth / **localStorage** “connected” | **Real** **OAuth**, **server-stored** tokens, **metadata-first** (and **policy**-controlled **content**) ingestion. |
| No durable multi-tenant data | **Persistent** **CRM** and **event** data with **tenant** isolation. |
| **CSV** import (may be partial in UI) | **Required** path: **import**, **mapping** preview, **duplicates**, **non-empty** Today/Pipeline after onboarding. |
| **Affinity** / **Sheets** | **As** in packaging: real **connectors** or **export** to agreed layout. |
| **Slack V1** | **Scoped** **daily** **brief** (and **selected** **entry** points), **not** a full **messaging** **OS**; **wiring** + **compliance** with tenant policy. |
| **Telegram** in Settings | **Out** of **MVP3** as a **messaging** **product** (see **§4**) — UI can stay **off** or **clearly** **“**post-MVP**”** so it is not confused with **ship**. |

### 3.3 Tomo agent, tools, and audit

| Gap | MVP3 ship intent |
| --- | --- |
| **Tool** calls **not** always **persisting** | **update_crm**, **workflows**, **drafts** **write** to **authoritative** **store**; **Activity** and **server** **audit** **log** for **material** **actions** and **integration** **events**. |
| “Tomo did it” in UI only | **Attribution** and **traceability** meet **compliance**-minded **expectations** (see Appendix C, Activity coverage). |

### 3.4 Commercial, workspace, and security

| Gap | MVP3 ship intent |
| --- | --- |
| **Stripe** placeholder | **Live** **billing**: **Individual** / **Team**, **Checkout**, **Customer** **Portal** as per **packaging**; **no** **downgrade** to **Individual** in MVP3 **per** prior **decision**. |
| **Solo** vs **team** in UI | **Enforced** **server-side** **RBAC** (Admin, Partner, Analyst), **shared** data model where **Team** is sold, **per-user** **OAuth** where **required**. |
| **Prototype** **storage** | **Production** **security** **baseline**: **region** choice, **encryption**, **no** **sensitive** **data** in **browser** **storage** for **secrets** **bodies**, **HITL** **outbound**, **audit** (align with **§6** in **prior** **specs** and **org** **checklists**). |

### 3.5 How to use the detailed specs

The **operational** and **architectural** **depth** (sync **SLOs**, **onboarding** **steps**, **signal** **flags**, **retrieval** **recipes**, **schema** **sketches**) lives in **Appendix C** and **D**. Those sections are **MVP3-aligned** **delivery** **reference**; they are **not** a claim that the **current** **mock** **implements** them end-to-end.

---

## 4. Post-MVP (explicitly not MVP3 baseline)

**Out of scope** for **MVP3** **shipping** **intent** (non-exhaustive):

- **Dedicated** **Momentum** page and “**view** in **Momentum**” **flows**.
- **Briefs** as a **standalone** **first-class** product **page** (redirects to **materials** are **not** a substitute for a **strategic** **decision** if the **market** **requires** a **separate** **surface**).
- **Cmd+K** / **global** **omnibar** (header **search** is the **MVP3** **pattern**).
- **Telegram** and **broad** **Slack** **workflows** (beyond the **scoped** **Slack** **V1** in **§3**), **messaging**-native **OS**.
- **Multi-party** **conversational** **scheduling** and **autonomous** **booking**.
- **Deep** **enrichment** / **web** **scraping** for **allocator** **intelligence** (beyond what **MVP3** **locks** in).
- **CRM** **pluralism**: **more** than **Affinity** + **Sheets** **export** on **day** one **(baseline** **MVP3** as **documented**).
- **Permissions** **beyond** **simple** **RBAC**.
- **Tomo** **meeting** **bot**; **transcript**-**first** **ingestion**; **recording**-**derived** **notes** as a **default** **input** **layer**.
- **Strong** **Level** **B** **post**-**meeting** **capture** (push, **voice**, **deeper** **mobile**), **as** the **default** **promise** (see **Level** **A** in **Appendix** **C** for **web**-first **framing**).

**Directional** **later** (illustrative): richer **messaging** **connectors**, **Insights**-style **analytics** **in** **full**, **deeper** **mobile**, **transcripts**, **meeting** **bot**, **vector** / **RAG** **at** **scale**, **more** **drafting** and **orchestration** **surfaces**.

**Post**-**meeting** **capture:** **level** **A** (**responsive** **web** **reminder** + **save** to **CRM**) can **sit** in **MVP3**; **level** **B** (**strong** **mobile**, **push**, **voice**) and **any** **bot**-**centric** **capture** are **not** the **same** as **MVP3** **baseline** **in** this **doc**.

---

## Appendix: MVP2 → MVP3 (narrative change map)

| Area | MVP 2 | MVP 3 |
| --- | --- | --- |
| **IA** | Today, Momentum, Relationships, **Targets**, Activity, Settings | **No** Momentum page; **Pipeline/Lists**; **Workflows**; Activity; Settings (**Insights** = **optional** / **proto** in **app**) |
| **List building** | Targets | **Pipeline/Lists**; `/targets` → `/pipeline` |
| **Tomo** | “**Collapsed** **everywhere**” (older copy) | **Inline** on **Today**; **workflow**-scoped on **Workflows**; **FAB** **elsewhere** |
| **Today** | Momentum **column** | **What** **needs** **attention** + **Coming** **up**; **On** **My** **Radar** as **optional** **modal** in **mock** |
| **Messaging** | Undecided / **broad** | **Slack** **V1** **narrow**; **Telegram** / **broad** **Slack** = **post**-MVP **(§4**)** |
| **Search** | Header | Header **(ship)**; **omnibar** **=** **post**-MVP |

---

## Appendix A — Routes and stack (engineering snapshot)

| Route | Behavior |
| --- | --- |
| `/` | Auth / onboarding / → `/home` when session+onboarding |
| `/home` | **Today** |
| `/relationships` | **Relationships** |
| `/pipeline` | **Pipeline (Lists in UI)** |
| `/workflows` | **Workflows** |
| `/insights` | **Insights (demo / prototype metrics slice)** |
| `/activity` | **Activity** (not in main nav) |
| `/settings` | **Settings** |
| `/targets` | Redirect → `/pipeline` |
| `/today` | Redirect → `/home` |
| `/tasks` | Redirect → `/home` |
| `/contacts` | Redirect → `/relationships` |
| `/workflow` | Redirect → `/workflows` |
| `/briefs` | Redirect → `/materials?tab=briefs` |
| `/lp-network`, `/lp-network/mandate` | Prototype **LP** network |
| `/materials` | Prototype |
| `/search` | Prototype (mock) |

**Stack:** Next.js 16, React 19, Tailwind 4, Vercel AI SDK, Zod 4, Sonner.

**APIs (non-exhaustive):** `POST /api/tomo/orchestrate`, `POST /api/tomo/filter-relationships`, `GET /api/version`, `POST /api/cron/daily-brief` (as present in repo for demos).

---

## Appendix B — Tomo orchestration (API in repo)

| Piece | Role |
| --- | --- |
| `POST /api/tomo/orchestrate` | Streaming agent; **tools** and system prompt depend on `context.surface` and other `context` fields. |
| `POST /api/tomo/filter-relationships` | NL → structured filter; shared with `filter_relationships` tool. |
| `GET /api/version` | Build / deploy id. |

**Tools (names as in code):** `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply`, `create_user_workflow` (where enabled).

| Surface (examples) | Tool scope (summary) |
| --- | --- |
| `general` | `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply` — Today can enrich with `todayContext` |
| `drawer` | `update_crm`, `draft_reply` |
| `workflow` | `update_workflow` only |
| `filter` | `filter_relationships`, `update_crm` (with disambiguation context) |
| `workflow_creator` | `create_user_workflow` only |

**Caveat:** many apply paths are stubbed; production requires persistence, RBAC, and audit wiring.

**Related doc:** `docs/WORKFLOW_CREATOR_ORCHESTRATOR_PLAN.md`, `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md`.

---

## Appendix C — Detailed MVP3 product and delivery specifications

*The subsections below are the prior “§11 V1 operational” content: sync, onboarding, signals, meeting prep, Activity coverage, Daily Brief, Slack V1, post-meeting capture rules, etc. They are **reference** for **delivery**, not a claim that the mock implements each item.*

### C.1 Sync, historical context, and degraded-state handling

MVP3 should make the sync boundary more explicit. During onboarding, a user who connects **email** is offered an explicit follow-on choice on the **same** step: allow reading roughly the **last 6 months** of mail (relationship enrichment, status, profile/summary, tone-aware drafts) or **new mail only**; calendar context may still be used per calendar connector policy. The user may also grant broader historical **calendar** context (where the product and provider support it) so the system can compute real last-touch dates, generate initial meeting briefs, create more specific follow-up drafts, and surface Day 1 pipeline insight soon after setup.

For MVP3, the practical operating target is **near-real-time enough** for daily execution, not theoretical instant sync. The intended target is that new emails and calendar events are reflected quickly enough for **same-day** workflow use, with follow-up drafts and re-engagement logic not **waiting until the next morning** unless the user is offline. The implementation may use provider webhooks, polling, or a unified sync service; the user-facing expectation should be stated clearly.

**Operational expectations to lock into MVP3:**

- Initial **email** backfill, where the user opts in, targets roughly the **last 6 months**; **calendar** (and other) historical windows should be stated in product copy and may differ by connector. Where the user chooses **new email only** for mail, backfill is **not** applied for the features that depend on history (see **§2.5** mock and **C.2**).
- **Update latency** should support same-day execution, with higher urgency for inbound messages that may drive re-engagement handling.
- **Out-of-office** replies should be detected and excluded from meaningful-touch and signal interpretation where appropriate.
- **Thread linkage** should preserve conversation continuity so replies are treated as part of the same relationship thread.
- If sync becomes stale beyond the acceptable operating window, the product should **degrade visibly** rather than silently. Pipeline and signal-dependent surfaces should show a clear **sync-delayed** or **signals may be out of date** state rather than presenting stale certainty.

**Async derivation, placeholders, and tone (simple baseline):** Initial backfill and downstream derived fields (relationship summary and snapshot, activity views tied to mail, tone- or style models for drafting) are not instant. Compute is asynchronous; the product uses placeholders (skeleton UI, “still building,” or empty with explanation) and per-field or per-surface readiness so users do not see false precision or overconfident drafts before data exists. If tone of voice is not ready, draft flows use a generic default and explicit copy that personalization is still calibrating (or equivalent). Staleness and processing state stay observable, consistent with visible degradation in **C.1** and **C.3**.

### C.2 CSV-first import and onboarding sequence

MVP3 should make the onboarding path explicit rather than assuming data will already exist. A **CSV-first** CRM import path is required in V1 so that teams without a direct connector can still get immediate value. **Affinity** can remain an MVP connector, but **CSV import** is the universal baseline.

**Intended onboarding sequence for MVP3:**

- Connect email, then (same step) choose **6-month** mail access vs **new mail only** and persist consent with OAuth-aligned scopes.
- Connect calendar.
- Import LP pipeline via **CSV** or supported connector.
- Review a **five-row field-mapping preview** before commit.
- Resolve **duplicate detection** and **merge** prompts where imported contacts match existing records.
- Set initial operating preferences (e.g. follow-up threshold) where applicable.
- Begin processing with a **visible progress** narrative rather than a blank loading state.
- Open the user into a **non-empty** Today or Pipeline experience as soon as **partial** value is available.

The document should explicitly state that onboarding cannot proceed to a **completed** operating state until at least **one LP record** has been created successfully, and that the product should **not** show an **empty** Today or **empty** Pipeline if processing is still underway. **Partial** results, **sync-in-progress** states, and **progress milestones** are part of the value demonstration.

### C.3 Nightly computation job and event-driven processing

MVP3 can include a practical backend computation layer without overcommitting to unnecessary theory. In product terms, the system should recompute relationship state on a **regular schedule** so pipeline flags, daily brief content, and summary counts remain current even when not every insight is calculated live in the browser.

A reasonable MVP3 specification is:

- A **scheduled** backend job recalculates relationship state after sync has completed for the relevant day.
- The recompute sequence may include sync health, interaction metrics, signal observations, meaningful-touch calculations, **fat-middle** detection, pipeline flags, follow-up compliance checks, and summary counts used by Today or Pipeline surfaces.
- This is an **implementation approach**, not a promise of a particular architecture. The product requirement is that these **derived** states stay **current** and **explainable**.
- **Re-engagement** should be treated **separately** from the nightly job because it is **time-sensitive**. Where feasible, it should use an **event-driven** path so an LP re-engaging after silence can surface **the same day** rather than waiting for the next scheduled recompute.

**Ongoing update of email-derived profile and aggregates (simple model):** After initial setup, new and changed mail from the sync layer should trigger incremental recompute of affected relationship- and user-level derived data (for example, last-touch cues, relationship summaries backed by mail evidence, rolling tone- or style-related features for drafting). A daily cron alone is not the primary mechanism for fresh inbound-driven signals: the default is event-driven or queue-based workers that run after sync confirms new messages. A daily (or similar) scheduled job remains the reconciliation and aggregate-repaint layer—catching missed work, cheaper rollups, and drift—so same-day surfaces are not held hostage to midnight, while periodic batch work still enforces consistency and keeps operations simple. See also the epic under **Relationship intelligence (email-derived)** in `docs/EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md`.

### C.4 Day 1 pipeline enrichment and the CRM–reality gap

MVP3 should explicitly preserve the **Day 1** product moment: the user sees the gap between what their **CRM** says is active and what their **real** email and calendar history suggests is actually happening. This should not be left as an implied benefit.

The Pipeline surface should make clear that Tomo is using **real** relationship activity, not just imported CRM labels. MVP3 should therefore call out:

- **Real last meaningful touch** rather than merely last email sent or last CRM update.
- **Named LPs in the “gap set”** where CRM suggests active relationships but recent **substantive** interaction is absent.
- A **prominent gap statement** that helps the user interpret the data immediately rather than forcing manual analysis.

**Meaningful touch** should be framed as a core concept in MVP3 because it underpins pipeline enrichment, silence logic, and later signal flags.

### C.5 Meeting prep brief

Meeting prep should be locked into MVP3 as a **first-class** workflow outcome rather than a vague assistant capability. The brief is **not** a generic summary. Its job is to make the user better prepared for a real **LP** meeting within minutes.

The meeting prep brief in MVP3 should identify:

- **Unanswered questions**
- **Missed or promised materials**
- **Relationship context**
- A **suggested focus** for the meeting
- **Recent documents** exchanged

The document should also state that **prompt iteration** is required before shipping. **Prompt quality** is part of the product requirement here. A generic or fluffy brief is not good enough just because a brief exists.

### C.6 Follow-up draft standards

MVP3 should tighten the follow-up draft specification so it reads like an **operational** product feature rather than a general drafting capability.

The follow-up draft should include:

- **Trigger timing** after an LP meeting ends
- **Dependence on tone calibration** so the draft sounds like the user
- **Dependence on post-meeting capture** where available so the draft can reflect what was actually discussed
- A **quality bar** that aims for **approval with minimal edits** (for example, approval with **fewer than five** substantive edits) rather than a **complete** rewrite

Where post-meeting capture is **skipped**, the draft can still be generated, but the product should acknowledge that **additional user context** improves specificity.

### C.7 Signal flags, thresholds, and exclusions

MVP3 should move from general language about status and movement to a more **codified** flag model. The exact numeric rules can still be refined in implementation, but the product document should state that flags are **rule-based**, **threshold-driven**, and **explained** in plain language.

The MVP3 signal layer should include:

- **Exact** flag rule intent for **Green**, **Amber**, and **Red** states
- **Context-specific** threshold tables based on relationship state or intent
- A **plain-English** explanation beneath each flag so the user knows **why** it is set
- An **explicit list** of what is **excluded** from V1 where confidence is too low or integration cost is too high

A simple mock structure for MVP3 is:

- **Green:** active and **within** threshold
- **Amber:** **approaching** threshold, **drifting**, or quiet without decisive movement
- **Red:** threshold **breached**, materially **cooling**, or **urgent re-engagement** detected

The point of codifying this in MVP3 is to make the signal layer feel **objective** and **explainable** rather than “magical.”

### C.8 Re-engagement urgent flag

MVP3 should explicitly include a **re-engagement urgent** path. This is separate from general pipeline status because it is a **same-day** operating event, not just a dashboard condition.

A reasonable MVP3 rule mock-up is:

- If an **LP** sends a new **inbound** message after an **extended silence** period, Tomo marks the relationship as **urgent re-engagement**
- The item should surface prominently in the **action drawer** and/or **Daily Brief**
- Tomo should generate a **draft response** using recent context
- The urgent state should **clear** or be **recomputed** once the user responds or the underlying relationship state changes

The important point for the document is that re-engagement is **time-critical** and should **not** depend **solely** on the slower **scheduled** computation path.

### C.9 Named pipeline filters

MVP3 should make the practitioner-facing **named** filters explicit in the Pipeline surface. These should not be left as a generic idea about audience creation.

The **named** filters to call out are:

- **Drifting**
- **Quiet – Fat Middle**
- **Re-engaged**
- **One-Way**

Each filter should use **practitioner** language and should imply an **action**, not merely a data slice. The **One-Way** filter is especially useful as a simple first-pass diagnostic because it requires little interpretation.

### C.10 Three-Touch qualification sequence

MVP3 should include a **guided** qualification workflow for **quiet** relationships rather than stopping at passive observation. A reasonable MVP3 version is a **Three-Touch Qualification Sequence** with **strict** user **approval** at each step.

A practical mock-up for the document is:

- **Touch 1:** an immediate, relevant **insight** or re-opening **note**
- **Touch 2:** a follow-up **direction** question **several** days later if no reply arrives
- **Touch 3:** a **respectful** qualifying **close** if the relationship **remains** quiet

The sequence should be described as a stateful workflow with timing windows, explicit outcomes, and human approval at every outbound step. Reasonable outcome classes for MVP3 are:

- warmer than expected
- maintaining but non-committal
- genuinely dormant

This gives the product a defined answer to the user question: what do I do with quiet LPs now?

### C.11 Tone calibration

MVP3 should explicitly state that Tomo can read a sample of the user’s historical sent emails, infer tone and style patterns, store a tone profile on the user or workspace profile, and use that profile in drafting. This is important enough to mention directly because draft quality depends on it.

The tone profile can capture elements such as greeting style, sign-off preference, formality, sentence shape, and paragraph structure. It should be reusable in follow-up drafts and other drafting workflows, and should be refreshable over time.

### C.12 Activity, auditability, and event coverage

MVP3 should strengthen the rationale for Activity beyond generic traceability. For institutional users, this surface helps support auditability, internal review, and trust in an AI-assisted system.

The document should make clear that Activity covers examples such as:

- draft generated
- draft approved and sent
- draft edited before send
- signal flag raised or changed
- re-engagement detected
- sequence step created, approved, sent, completed, or cancelled
- post-meeting capture completed or skipped

This keeps the system legible to users and easier to explain to compliance-minded stakeholders.

### C.13 Daily Brief behavior and Slack V1 scope

MVP3 should tighten the Daily Brief behavior and broaden the scoped Slack statement carefully.

Daily Brief behavior should specify:

- auto-open on first daily login
- a first-login condition based on the user’s local day rather than every page load
- required content blocks such as today’s meetings, urgent or approval-needed actions, follow-up compliance, and a key signal change or callout

Slack V1 can be broadened, but still remain controlled. A reasonable MVP3 statement is that Slack supports daily brief notifications and selected Tomo skills or tool-call entry points that help users jump into work, not a full Slack-native operating model.

### C.14 Warm intro detection

MVP3 should make warm intro detection explicit because it already aligns with the prototype workflow direction. A reasonable V1 rule is that Tomo can detect likely introduction emails where the user is included alongside other parties, classify them with high confidence, create or suggest the relevant relationship record, and prepare a draft reply workflow for the user to approve.

### C.15 Post-meeting capture refinements

The post-meeting capture section should be tightened further with a few concrete operating rules:

- the target interaction should take under 60 seconds
- one meeting should produce one prompt rather than repeated nagging
- completion, skip, and save-with-no-change outcomes should be tracked so the team can see whether the workflow is actually being used

These rules help the feature stay useful rather than turning into administrative friction.

**Post-meeting scope (MVP3 vs post-MVP, recap):** MVP3 is a **web** workspace. **Level A** = **responsive** **web** **reminder** and **structured** **save** to the relationship system — not a **meeting** **bot** or **transcript**-first **ingestion** as **default**. **Level B** = **stronger** **mobile**, **push**, **voice** — see **§4**. See also **C.6** and **C.15** above.

---

## Appendix D — Draft: retrieval architecture and signal layer (engineering)

*Prior “§12” content: bounded retrieval vs RAG, intent recipes, deterministic signals, schema sketch, reply-velocity example. Does not assert every table exists in the database today.*

### D.1 Simplified MVP retrieval architecture

- Use synced email, calendar, contacts, structured CRM records, and bounded LLM orchestration rather than broad semantic retrieval in the first release.
- Optimise for the actual MVP jobs: who needs attention, what happened recently, what should happen next, and what draft or CRM update should be proposed.
- Keep retrieval explainable: Tomo should be able to say which rows, thread slices, or meeting records were used to assemble context.
- Treat vector DB + RAG as a later capability for wider semantic recall over larger unstructured bodies and document repositories, not as an MVP prerequisite.

| Approach | MVP fit | Why preferred / not preferred now |
| --- | ---: | --- |
| Bounded retrieval over SQL + filters + indexed text | High | Matches Today, Pipeline, drawer, follow-up draft, and guided actions. Lower operational complexity and easier debugging. |
| Broad semantic search over vector DB + RAG | Low for initial MVP | Useful later for open-ended recall, but adds infrastructure, product ambiguity, and harder-to-explain failures before core workflows are proven. |

### D.2 Limitations and mitigation via intent classification and retrieval recipes

| Limitation | MVP mitigation | Level 1 retrieval recipe |
| --- | --- | --- |
| No broad semantic recall across all mail / notes / docs | Classify a small number of user intents and map each to a fixed retrieval recipe | Relationship drawer anchor + current relationship snapshot + last 5 activities + latest draft context |
| User asks for “more context” before redrafting | Expand only from known bounded sources around the LP rather than searching the whole corpus | Recent thread context; prior meeting context; latest qualitative capture; current signal state |
| Risk of vague or inconsistent redrafts | Return compact context packets assembled deterministically before prompting the model | SQL/filter retrieval for the LP, fixed row limits, and structured context JSON passed into the draft prompt |

- Start with a small intent set only: recent thread context, prior meeting context, open loops, qualitative CRM context, and relationship signal context.
- Each intent maps to a fixed SQL / filter recipe, not open-ended retrieval.
- Level 1 should stay cheap and immediate for MVP: no vector lookup, no corpus-wide scan, no freeform semantic answerability promise.

### D.3 MVP signal layer — deterministic where possible

| Signal | Priority in MVP | Deterministic formula / window | Store current state | Log event when |
| --- | --- | --- | --- | --- |
| Reply velocity | Highest | Use last 3 LP reply latencies. Compare latest latency to average of prior 2. Classify accelerating / flat / decelerating using thresholds, e.g. ≤ -20%, between -20% and +20%, ≥ +20%. | `lp_state.reply_velocity_trend`; `lp_state.reply_velocity_last_calc_at` | Trend changes or crosses into decelerating state |
| Reply initiation | High | Over last 5 exchanges, ratio = LP-initiated exchanges ÷ total exchanges. Flag low if ratio = 0 across 5 exchanges. | `lp_state.reply_initiation_ratio` | Ratio hits 0, materially improves, or materially worsens |
| Reply substance proxy | Medium, conservative | Use LP reply word count over last 3 replies plus question presence. Only use as supporting evidence; do not make standalone claims from it. | `lp_state.reply_substance_trend` (optional) or derive on read | Substance declines across 3 replies and coincides with other cooling context |
| Calendar friction | High | Weighted view over last 3 meetings: accept latency, reschedule count, and duration ratio = actual / booked. Classify improving / flat / worsening. | `lp_state.calendar_friction_trend` | Trend changes or friction breaches threshold |

- For MVP, use these signals only for sorting, prioritisation, drawer context, and draft/action support.
- Treat re-engagement after silence, richer pipeline flags, meeting composition shifts, document engagement, and NLP-based interpretation as post-MVP enhancements unless confidence improves materially.
- Calculation pattern: append raw interaction events first, compute rolling-window metrics second, update current state third, and write a signal log row only when a meaningful change or trigger occurs.

### D.4 Supporting schema and tables — tight MVP shape

| Table | Purpose | Key columns for MVP |
| --- | --- | --- |
| relationships | Durable LP / relationship record and current CRM attributes | `id`, `workspace_id`, `lp_name`, `organisation`, `current_stage`, `tier`, `relationship_owner`, `mandate_fit`, `stated_intent`, `last_draft_id`, `created_at`, `updated_at` |
| relationship_interactions | Raw synced email and calendar events used for retrieval and signal calculation | `id`, `relationship_id`, `source_type`, `event_type`, `thread_id`, `event_ts`, `direction`, `participants_json`, `subject`, `snippet`, `body_text_policy_allowed`, `word_count`, `reply_latency_hrs`, `meeting_booked_mins`, `meeting_actual_mins`, `accept_latency_hrs`, `was_rescheduled`, `metadata_json` |
| relationship_state | Current computed operating state read by drawer, pipeline, and drafting flows | `relationship_id`, `reply_velocity_trend`, `reply_initiation_ratio`, `reply_substance_trend`, `calendar_friction_trend`, `last_meaningful_touch_at`, `days_since_meaningful_touch`, `sync_status`, `last_sync_at`, `last_computed_at` |
| relationship_signal_log | Historical signal observations for auditability and trigger history | `id`, `relationship_id`, `signal_type`, `signal_direction`, `signal_value_json`, `detected_at`, `trigger_source_interaction_id`, `action_triggered`, `action_type`, `dismissed_by_user`, `dismissal_note` |
| relationship_qualitative_log | Optional user-supplied updates captured after meetings | `id`, `relationship_id`, `captured_at`, `captured_by`, `meeting_interaction_id`, `stated_intent_update`, `mandate_fit_assessment`, `objection_raised`, `allocation_window_note`, `next_ic_date_mentioned`, `notes_json` |

- Keep raw interactions append-only. Do not overwrite event history when metrics are recalculated.
- Use `relationship_state` for the latest computed values the UI needs to read quickly.
- Use `relationship_signal_log` for historical detections, auditability, and trigger traceability.
- Keep schema tight in MVP; additional signal tables and richer event models can be added later if required.

### D.5 Concrete example — reply velocity

| Step | What happens | Example |
| --- | --- | --- |
| 1. Capture raw event | LP sends an inbound email. System writes a new interaction row with `thread_id`, timestamp, direction, `word_count`, and `reply_latency_hrs`. | Latest reply latency = 96 hours |
| 2. Pull rolling window | System looks up the last 3 LP reply latencies for this relationship. | [24, 48, 96] hours |
| 3. Calculate trend | Compare latest latency to average of prior two latencies. `delta_pct` = (96 - avg(24,48)) / avg(24,48). | avg prior two = 36; delta = +166.7% |
| 4. Classify state | Apply threshold bands to classify current trend. | Classified as decelerating |
| 5. Update current state | Write latest trend and calc timestamp into `relationship_state`. | `reply_velocity_trend` = decelerating |
| 6. Write observation if changed | If prior state was flat or accelerating, append a signal log row. | `signal_type` = reply_velocity; `action_triggered` = false or true depending on UI rules |
| 7. Use in product | Pipeline ordering, drawer explanation, Daily Brief prioritisation, and draft context can all read the same state. | Drawer note: “Replies have slowed materially vs the prior two touchpoints.” |

- This example is intentionally deterministic and explainable. It avoids requiring NLP or semantic retrieval in order to produce a useful signal.
- The same pattern can be reused for reply initiation, reply substance proxy, and calendar friction: capture raw event → compute rolling window → update current state → log only meaningful changes.

---

*Last updated: April 24, 2026. Main body: four-part structure; appendices: engineering reference and detailed specs.*
