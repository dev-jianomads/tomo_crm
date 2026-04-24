# Tomo MVP 3

**Stakeholder-facing revision of MVP 2,** incorporating the current mock app UI, route-level behavior, and feature decisions. **Revised to match the code in this repository as of April 24, 2026** (MVP3 prototype / Next.js app in `tomo_crm`).

| | |
| --- | --- |
| **Document purpose** | Align the original MVP 2 document to the evolved mock app and clarified product decisions, while keeping the format readable for non-technical stakeholders. |
| **How to read this** | The document distinguishes **intended MVP 3 product scope** from **prototype-only behavior** so stakeholders can separate shipping intent from the current implementation. In navigation and chrome, the prototype has **intentional label differences** (e.g. **Lists** for Pipeline) that are called out in §2.1. |

---

## Executive summary

- MVP 3 keeps the original TOMO goal: an AI-assisted execution workspace for fundraising, investor relations, and deal flow.
- **Information architecture (shipping intent):** **Today, Relationships, Pipeline (list building), Workflows, Activity, and Settings.** Momentum is not a dedicated page.
- **Current prototype (this repo):** Primary navigation is **Today** (`/home`), **Relationships**, **Lists** (route `/pipeline` — same surface as Pipeline), **Workflows**, **Insights** (`/insights`), and **Settings**. **Activity** exists at `/activity` but is **omitted from the main rail and bottom nav**; **LP Network** and **Materials** are additional **prototype** routes, not part of the core MVP3 IA.
- **Pipeline** (shown as **Lists** in the shell) is the canonical list-building surface; **legacy `/targets` redirects to `/pipeline`.**
- **Today** is built around two primary columns: **What needs your attention** and **Coming up** (no third column for “Momentum shifts”). The prototype also exposes **On My Radar** (button + modal) for signal-style callouts. **Details** for actions and meetings use a **context drawer**; the list/detail split column is not used on Today (`detailVisible={false}` in code).
- **Tomo** is integrated as **inline chat on Today** and **workflows** use the workflow-specific surfaces; elsewhere the app uses a **FAB → dock or sheet** (not shown on Home, Workflows, Relationships, or Pipeline). On Today, inline chat defaults to a **single-line “expand to chat”** control (user-expandable, persisted) rather than a permanently expanded panel.
- **Settings** remains a first-class MVP surface: profile, integrations, notifications, billing and plan, and fund management.
- **Integrations and exports:** Google Workspace, Microsoft 365, Stripe billing, **CSV-first** CRM import, Affinity, **Google Sheets export**, and a **scoped Slack integration** remain in the MVP3 **product** narrative. **Slack V1** is limited to **daily brief notifications** and **selected** Tomo skills or tool-call entry points rather than broad messaging workflows; **broader Slack workflows and Telegram** are **post-MVP** for a full messaging product (the Settings UI may still list Slack/Telegram for demos — see §9).
- MVP 3 makes the **Tomo agent orchestration layer** explicit: the assistant is not only a chat surface, but a **coordinating layer** that assembles context, proposes actions, and drives workflow execution with human review. Implementation: **`POST /api/tomo/orchestrate`** with **surface-gated tools** (see **Appendix B**).
- MVP 3 can support **Level A post-meeting capture** as a responsive web workflow. Stronger **mobile** behavior and **voice/transcription** sit in post-MVP (see §7).

---

## Resolved product decisions carried into MVP 3

| Decision area | MVP 3 position | Current prototype (repo) |
| --- | --- | --- |
| Information architecture | No dedicated Momentum page. Pipeline is the canonical list-building surface. Legacy `/targets` may redirect to `/pipeline`. | Nav label **Lists**; route `/pipeline`. **Insights** in primary nav. **Activity** not in main nav (route still `/activity`). |
| Today surface | **What needs your attention** and **Coming up** only; no third column for momentum shifts. | **On My Radar** as **button + modal** (momentum/signal content), not a main column. Daily Brief in flows/modals. Inline Tomo: **default collapsed** to single-line; expands to full inline chat. |
| Assistant behavior | Tomo is not required to be collapsed by default. Inline on Today and Workflows is part of the intended experience. | Today defaults to **collapsed** expander; Workflows: shell assistant **hidden**; **workflow drawer** has workflow-scoped Tomo. FAB hidden on home, workflows, relationships, pipeline. |
| Briefs | Not a dedicated MVP **product** surface, tab, or page as a requirement. | `/briefs` **redirects** to `/materials?tab=briefs`. |
| Exports and connectors | Google Sheets export in MVP. Slack narrowed for **daily brief** + entry points. Telegram / broad Slack: post-MVP. | Loops used for **demo** daily-brief email resend; Slack in Settings (stub / “soon”). |
| Search model | Header search = intended MVP pattern. **Cmd+K / global omnibar** = post-MVP. | **No** search in the app header; standalone **`/search`** page with mock data. |
| Traceability | Activity = chronological log of user actions and Tomo/system actions. | `/activity` with fund/type filters; **mock** feed. |

---

## 1. Product overview

TOMO is a lightweight, AI-assisted execution workspace for fundraising, investor relations, and deal flow. MVP 3 preserves the original product intent from MVP 2, but updates the narrative to reflect the mock app’s navigation, assistant behavior, and clarified shipping decisions.

**Core value in MVP 3:**

- Auto-organise investor interactions from **Google Workspace** or **Microsoft 365** across email, calendar, and contacts.
- Maintain a clean relationship system with minimal manual data entry.
- Turn context into next steps inside **Today**, with a human in the loop for outbound actions.
- Support list building and workflow audience creation through **Pipeline** (in-product **Lists**) rather than legacy Targets.
- Make movement, health, and status visible through relationship, materials, and pipeline views, **without a separate Momentum page**.
- Provide traceability through **Activity** as a chronological audit trail of user and Tomo/system actions.
- Use **Tomo agent orchestration** to combine synced context, workflow logic, and user intent into guided next steps rather than treating chat as a standalone feature.

---

## 2. Web workspace scope

### 2.1 Global layout and navigation

**MVP3 product intent (shipping):** Desktop and mobile: **Today, Relationships, Pipeline, Workflows, Activity, Settings**; header **search**; **Fund** selector (funds from Settings).

**Current prototype (`src/components/app-shell.tsx`):** **Desktop** left rail: **Today** (`/home`), **Relationships**, **Lists** ( `/pipeline` ), **Workflows**; **Insights** (`/insights`); **Settings**. **No Activity in the rail.** **Mobile** bottom nav uses the same items. The **header** has the Tomo mark and a **placeholder user avatar**; it does **not** include a global search box or a global **Fund** dropdown—**with one exception: the fund selector is shown on LP Network** (prototype).

### 2.2 TOMO assistant

**Intent:** On **Today** and **Workflows**, Tomo is part of the primary workflow (inline or workflow drawer). On other areas, a **floating action button** opens a **dock** (desktop) or **sheet** (mobile). Suggestion chips are **context-aware** (page and section).

**Prototype:** Default chips vary by `section` (e.g. Home, relationships, pipeline, insights). **Today** passes **`todayContext`** (actions, commitments, daily brief blocks) into the orchestrator when expanded. **Relationships** and **Pipeline** do not use the global FAB. See **Appendix B** for tool surfaces.

### 2.3 Today

**Intent:** **What needs your attention** and **Coming up**; **Daily Brief** (e.g. first daily login / modal); selecting items opens a **context drawer** without a full page navigation.

**Prototype:** Two main columns match the intent. **On My Radar** (modal) adds a compact view of “radar” lines in addition. **Detail column** in `AppShell` is **turned off**; drawers present detail. **Inline Tomo** is **collapsible** (single-line by default, persisted in `localStorage`).

### 2.4 Pipeline (Lists in the UI)

**Pipeline** at **`/pipeline`**: natural-language and structured filters, named saved lists, funnel-style stage distribution, workflow linking. **Legacy** **`/targets` → `/pipeline`**.

**Note:** The implementation plan in `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md` standardizes the label **Lists** in nav/CTAs for demo coherence.

### 2.5 Workflows

Playbooks, Tomo defaults, user-created processes, and AI-assisted editing. **Shell-level** Tomo is **not** mounted on the workflows route; interaction is via the **workflow detail drawer** and related components.

### 2.6 Relationships

List, card, or kanban-style access and a **detail drawer** (snapshot, status, open loops, actions).

### 2.7 Materials

Investor-facing materials; **`/briefs` redirects to materials with the briefs tab**. Not required to ship a **standalone Briefs product page** in MVP3.

### 2.8 Activity

Chronological audit trail with fund, type, and date-style filters. **In the shipping IA** it sits with other core surfaces. **In the current prototype** it is **not** in the main navigation (direct URL or deep links only).

### 2.9 Settings

**Profile, Integrations, Notifications, Billing and plan, Funds** (first-class in MVP3). The **Fund** list configured here is intended to feed a global **Fund** selector (prototype: selector shown only in selected contexts).

---

## 3. Integrations and data flow

### 3.1 Google Workspace and Microsoft 365

MVP3 ships (product intent) with authenticated connections for email, calendar, and contacts. **Ingestion** remains **metadata-first** with optional, policy-controlled content. Onboarding may offer **up to 90 days** of historical email/calendar context for Day 1 enrichment.

**Prototype:** Stub OAuth, mock providers, and `localStorage` flags are **not** production.

### 3.2 Relationship system and destinations

Built-in TOMO relationship data is the core system of record. **CSV-first import** is the universal baseline. **Affinity** and **Google Sheets** export stay in scope. **Slack** in MVP3 narrative = **tight** scope: daily brief notifications + **selected** tool entry points, not a full messaging OS.

### 3.3 Agent orchestration (product) + implementation (repo)

**Product:** Tomo assembles context, proposes actions, and coordinates workflow steps; **human-in-the-loop** for outbound send.

**Repository:** A single streaming endpoint and **surface-gated** tools. See **Appendix B** for the API and tool table (source: `src/app/api/tomo/orchestrate/route.ts`).

### 3.4 Prototype honesty

Stub OAuth, local state, and browser persistence for sessions or demo flags are **placeholders** only.

---

## 4. Workspaces, funds, and user models

MVP3 continues to support **individual** and **team** workspaces. **RBAC (Admin, Partner, Analyst)** in product intent. **Prototype:** no enforced shared workspace or RBAC in app logic.

---

## 5. Subscription and billing

**Stripe** remains the billing platform. **Individual** and **Team** plans; upgrade from Individual to Team; **no downgrade to Individual** in MVP3 per prior decisions.

**Prototype:** no live Stripe; Settings shows placeholders.

---

## 6. Security and compliance

Production target unchanged from prior specs: **region-aware hosting, encryption, tenant isolation, metadata-first defaults, no secrets in browser storage, HITL outbound, auditable events.**

**Prototype:** `localStorage` and mock session violate several production requirements by design.

---

## 7. Post-meeting capture scope

MVP3 remains a **web workspace**; **Level A** = responsive web: reminder after a meeting, structured notes back into the relationship system—**not** a meeting bot, recording, or transcript as first-class input. **Level B** = stronger mobile, push, voice, transcription — post-MVP. Meeting bot and transcript-first ingestion remain **out of** MVP3 baseline (see §8).

---

## 8. Out of scope and post-MVP

**Out of MVP** for this release (non-exhaustive; overlaps with prior specs):

- Dedicated **Momentum** page and any **“View in Momentum”** drill-through links.
- **Briefs** as a standalone product surface.
- **Telegram** connectors and **broad Slack workflows** beyond the scoped **Slack V1** (daily brief + entry points) described above and in the executive summary.
- **Cmd+K** or **global omnibar** search.
- Multi-party conversational scheduling and autonomous booking.
- Deep enrichment or web scraping for allocator intelligence.
- **Additional CRM integrations** beyond **Affinity** and **Google Sheets export** (in baseline MVP3).
- **Advanced permissions** beyond simple RBAC.
- **Tomo meeting bot**; **transcript-first** meeting ingestion; **recording-derived** notes as an additional first-class product input.
- **Insights** (as in the current `/insights` **Singapore-style demo** page): treated as a **prototype slice** of nightly/execution metrics, not a required MVP3 ship list unless product promotes it from roadmap.

**Directional post-MVP:** Broader messaging, richer drafting, **Insights-style** analytics in full, stronger mobile post-meeting capture, voice, meeting bot, transcript ingestion, etc.

For clarity: a **light post-meeting capture** reminder can sit inside the responsive web boundary; **meeting bot** and **transcript-first** ingestion are **post-MVP** input-layer expansions.

---

## 9. Prototype vs intended MVP 3

| Area | MVP3 intent | This repository today |
| --- | --- | --- |
| Primary nav / labels | Today, Relationships, **Pipeline**, Workflows, Activity, Settings | **Lists** label for pipeline route; **Insights** in nav; **Activity** not in main nav; **/insights** = demo page |
| Today layout | Two columns + Daily Brief; drawer detail | + **On My Radar** modal; **collapsible** inline Tomo; **no** list/detail `AppShell` column |
| Fund selector | In header, funds from Settings | Shown on **LP Network**; not global in header for all pages |
| Search | Header search | **`/search` page only** (mock results) |
| Integrations | Real OAuth and sync | Stubs, `localStorage` |
| Slack / Telegram in Settings | Product: Slack V1 scope only for MVP3 narrative | **Both** can appear in UI; wiring partial / stub |
| `/tasks` | (Product TBD) | **Redirects to `/home`**, not Activity |
| `/briefs` | / | **Redirects to `/materials?tab=briefs`** |
| **Tomo** | Orchestrated tools + audit | **Orchestrator live**; many apply paths **stubbed** |

---

## 10. Clarifications

This document is an **alignment** update, not a full product reset. **MVP3** is the MVP 2 vision, revised to match the **evolved** mock and clarified decisions.

---

## Appendix: high-level change map from MVP 2 to MVP 3 (product narrative)

| Area | MVP 2 framing | MVP 3 update |
| --- | --- | --- |
| IA | Today, Momentum, Relationships, Targets, Activity, Settings | Today, Relationships, **Pipeline/Lists**, **Workflows**, Activity, Settings (+ **Insights** as prototype add-on) |
| List building | Targets | **Pipeline/Lists** canonical; `/targets` → `/pipeline` |
| Assistant | Collapsed by default everywhere | **Inline** on Today (expandable) and **workflow-scoped** on Workflows; **FAB** elsewhere |
| Today | Momentum shifts + Momentum | **What needs your attention** + **Coming up**; **On My Radar** as prototype (modal) |
| Briefs | Right-panel / embedded | No dedicated Briefs product surface; redirect to materials may exist in prototype |
| Messaging | Slack / Telegram optional | **Slack V1** in MVP3 narrative: daily brief + entry points; **Telegram** / broad messaging post-MVP |
| Search | Header search | Still intended; **Cmd+K** post-MVP |

**Additional clarity:** **Tomo agent orchestration** is explicit in the narrative; **Slack** is **narrowed** to scoped MVP3 use; **post-meeting capture** = Level A (web) vs Level B (mobile) vs meeting-bot post-MVP.

---

## 11. V1 operational additions and feature specifications

These sections are **product/engineering** specifications for the MVP3 wave. They are not implied to be fully implemented in the current prototype (see §9).

### 11.1 Sync, historical context, and degraded-state handling

MVP3 should make the sync boundary more explicit. During onboarding, a user may optionally grant Tomo access to up to **90 days** of historical email and calendar context so the system can compute real last-touch dates, generate initial meeting briefs, create more specific follow-up drafts, and surface Day 1 pipeline insight immediately after setup.

For MVP3, the practical operating target is **near-real-time enough** for daily execution, not theoretical instant sync. The intended target is that new emails and calendar events are reflected quickly enough for **same-day** workflow use, with follow-up drafts and re-engagement logic not **waiting until the next morning** unless the user is offline. The implementation may use provider webhooks, polling, or a unified sync service; the user-facing expectation should be stated clearly.

**Operational expectations to lock into MVP3:**

- Initial historical sync can cover up to **90 days** where the user chooses to provide it.
- **Update latency** should support same-day execution, with higher urgency for inbound messages that may drive re-engagement handling.
- **Out-of-office** replies should be detected and excluded from meaningful-touch and signal interpretation where appropriate.
- **Thread linkage** should preserve conversation continuity so replies are treated as part of the same relationship thread.
- If sync becomes stale beyond the acceptable operating window, the product should **degrade visibly** rather than silently. Pipeline and signal-dependent surfaces should show a clear **sync-delayed** or **signals may be out of date** state rather than presenting stale certainty.

### 11.2 CSV-first import and onboarding sequence

MVP3 should make the onboarding path explicit rather than assuming data will already exist. A **CSV-first** CRM import path is required in V1 so that teams without a direct connector can still get immediate value. **Affinity** can remain an MVP connector, but **CSV import** is the universal baseline.

**Intended onboarding sequence for MVP3:**

- Connect email.
- Connect calendar.
- Import LP pipeline via **CSV** or supported connector.
- Review a **five-row field-mapping preview** before commit.
- Resolve **duplicate detection** and **merge** prompts where imported contacts match existing records.
- Set initial operating preferences (e.g. follow-up threshold) where applicable.
- Begin processing with a **visible progress** narrative rather than a blank loading state.
- Open the user into a **non-empty** Today or Pipeline experience as soon as **partial** value is available.

The document should explicitly state that onboarding cannot proceed to a **completed** operating state until at least **one LP record** has been created successfully, and that the product should **not** show an **empty** Today or **empty** Pipeline if processing is still underway. **Partial** results, **sync-in-progress** states, and **progress milestones** are part of the value demonstration.

### 11.3 Nightly computation job and event-driven processing

MVP3 can include a practical backend computation layer without overcommitting to unnecessary theory. In product terms, the system should recompute relationship state on a **regular schedule** so pipeline flags, daily brief content, and summary counts remain current even when not every insight is calculated live in the browser.

A reasonable MVP3 specification is:

- A **scheduled** backend job recalculates relationship state after sync has completed for the relevant day.
- The recompute sequence may include sync health, interaction metrics, signal observations, meaningful-touch calculations, **fat-middle** detection, pipeline flags, follow-up compliance checks, and summary counts used by Today or Pipeline surfaces.
- This is an **implementation approach**, not a promise of a particular architecture. The product requirement is that these **derived** states stay **current** and **explainable**.
- **Re-engagement** should be treated **separately** from the nightly job because it is **time-sensitive**. Where feasible, it should use an **event-driven** path so an LP re-engaging after silence can surface **the same day** rather than waiting for the next scheduled recompute.

### 11.4 Day 1 pipeline enrichment and the CRM–reality gap

MVP3 should explicitly preserve the **Day 1** product moment: the user sees the gap between what their **CRM** says is active and what their **real** email and calendar history suggests is actually happening. This should not be left as an implied benefit.

The Pipeline surface should make clear that Tomo is using **real** relationship activity, not just imported CRM labels. MVP3 should therefore call out:

- **Real last meaningful touch** rather than merely last email sent or last CRM update.
- **Named LPs in the “gap set”** where CRM suggests active relationships but recent **substantive** interaction is absent.
- A **prominent gap statement** that helps the user interpret the data immediately rather than forcing manual analysis.

**Meaningful touch** should be framed as a core concept in MVP3 because it underpins pipeline enrichment, silence logic, and later signal flags.

### 11.5 Meeting prep brief

Meeting prep should be locked into MVP3 as a **first-class** workflow outcome rather than a vague assistant capability. The brief is **not** a generic summary. Its job is to make the user better prepared for a real **LP** meeting within minutes.

The meeting prep brief in MVP3 should identify:

- **Unanswered questions**
- **Missed or promised materials**
- **Relationship context**
- A **suggested focus** for the meeting
- **Recent documents** exchanged

The document should also state that **prompt iteration** is required before shipping. **Prompt quality** is part of the product requirement here. A generic or fluffy brief is not good enough just because a brief exists.

### 11.6 Follow-up draft standards

MVP3 should tighten the follow-up draft specification so it reads like an **operational** product feature rather than a general drafting capability.

The follow-up draft should include:

- **Trigger timing** after an LP meeting ends
- **Dependence on tone calibration** so the draft sounds like the user
- **Dependence on post-meeting capture** where available so the draft can reflect what was actually discussed
- A **quality bar** that aims for **approval with minimal edits** (for example, approval with **fewer than five** substantive edits) rather than a **complete** rewrite

Where post-meeting capture is **skipped**, the draft can still be generated, but the product should acknowledge that **additional user context** improves specificity.

### 11.7 Signal flags, thresholds, and exclusions

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

### 11.8 Re-engagement urgent flag

MVP3 should explicitly include a **re-engagement urgent** path. This is separate from general pipeline status because it is a **same-day** operating event, not just a dashboard condition.

A reasonable MVP3 rule mock-up is:

- If an **LP** sends a new **inbound** message after an **extended silence** period, Tomo marks the relationship as **urgent re-engagement**
- The item should surface prominently in the **action drawer** and/or **Daily Brief**
- Tomo should generate a **draft response** using recent context
- The urgent state should **clear** or be **recomputed** once the user responds or the underlying relationship state changes

The important point for the document is that re-engagement is **time-critical** and should **not** depend **solely** on the slower **scheduled** computation path.

### 11.9 Named pipeline filters

MVP3 should make the practitioner-facing **named** filters explicit in the Pipeline surface. These should not be left as a generic idea about audience creation.

The **named** filters to call out are:

- **Drifting**
- **Quiet – Fat Middle**
- **Re-engaged**
- **One-Way**

Each filter should use **practitioner** language and should imply an **action**, not merely a data slice. The **One-Way** filter is especially useful as a simple first-pass diagnostic because it requires little interpretation.

### 11.10 Three-Touch qualification sequence

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

### 11.11 Tone calibration

MVP3 should explicitly state that Tomo can read a sample of the user’s historical sent emails, infer tone and style patterns, store a tone profile on the user or workspace profile, and use that profile in drafting. This is important enough to mention directly because draft quality depends on it.

The tone profile can capture elements such as greeting style, sign-off preference, formality, sentence shape, and paragraph structure. It should be reusable in follow-up drafts and other drafting workflows, and should be refreshable over time.

### 11.12 Activity, auditability, and event coverage

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

### 11.13 Daily Brief behavior and Slack V1 scope

MVP3 should tighten the Daily Brief behavior and broaden the scoped Slack statement carefully.

Daily Brief behavior should specify:

- auto-open on first daily login
- a first-login condition based on the user’s local day rather than every page load
- required content blocks such as today’s meetings, urgent or approval-needed actions, follow-up compliance, and a key signal change or callout

Slack V1 can be broadened, but still remain controlled. A reasonable MVP3 statement is that Slack supports daily brief notifications and selected Tomo skills or tool-call entry points that help users jump into work, not a full Slack-native operating model.

### 11.14 Warm intro detection

MVP3 should make warm intro detection explicit because it already aligns with the prototype workflow direction. A reasonable V1 rule is that Tomo can detect likely introduction emails where the user is included alongside other parties, classify them with high confidence, create or suggest the relevant relationship record, and prepare a draft reply workflow for the user to approve.

### 11.15 Post-meeting capture refinements

The post-meeting capture section should be tightened further with a few concrete operating rules:

- the target interaction should take under 60 seconds
- one meeting should produce one prompt rather than repeated nagging
- completion, skip, and save-with-no-change outcomes should be tracked so the team can see whether the workflow is actually being used

These rules help the feature stay useful rather than turning into administrative friction.

---

## 12. Draft for discussion — simplified retrieval architecture and signal layer

This section replaces the earlier narrative draft with compact tables, concrete schema, and one worked example for discussion with engineering. The goal is a retrieval and signal architecture that is tight enough for MVP yet extensible later. It does **not** assert that every table exists in the repository today.

### 12.1 Simplified MVP retrieval architecture

- Use synced email, calendar, contacts, structured CRM records, and bounded LLM orchestration rather than broad semantic retrieval in the first release.
- Optimise for the actual MVP jobs: who needs attention, what happened recently, what should happen next, and what draft or CRM update should be proposed.
- Keep retrieval explainable: Tomo should be able to say which rows, thread slices, or meeting records were used to assemble context.
- Treat vector DB + RAG as a later capability for wider semantic recall over larger unstructured bodies and document repositories, not as an MVP prerequisite.

| Approach | MVP fit | Why preferred / not preferred now |
| --- | ---: | --- |
| Bounded retrieval over SQL + filters + indexed text | High | Matches Today, Pipeline, drawer, follow-up draft, and guided actions. Lower operational complexity and easier debugging. |
| Broad semantic search over vector DB + RAG | Low for initial MVP | Useful later for open-ended recall, but adds infrastructure, product ambiguity, and harder-to-explain failures before core workflows are proven. |

### 12.2 Limitations and mitigation via intent classification and retrieval recipes

| Limitation | MVP mitigation | Level 1 retrieval recipe |
| --- | --- | --- |
| No broad semantic recall across all mail / notes / docs | Classify a small number of user intents and map each to a fixed retrieval recipe | Relationship drawer anchor + current relationship snapshot + last 5 activities + latest draft context |
| User asks for “more context” before redrafting | Expand only from known bounded sources around the LP rather than searching the whole corpus | Recent thread context; prior meeting context; latest qualitative capture; current signal state |
| Risk of vague or inconsistent redrafts | Return compact context packets assembled deterministically before prompting the model | SQL/filter retrieval for the LP, fixed row limits, and structured context JSON passed into the draft prompt |

- Start with a small intent set only: recent thread context, prior meeting context, open loops, qualitative CRM context, and relationship signal context.
- Each intent maps to a fixed SQL / filter recipe, not open-ended retrieval.
- Level 1 should stay cheap and immediate for MVP: no vector lookup, no corpus-wide scan, no freeform semantic answerability promise.

### 12.3 MVP signal layer — deterministic where possible

| Signal | Priority in MVP | Deterministic formula / window | Store current state | Log event when |
| --- | --- | --- | --- | --- |
| Reply velocity | Highest | Use last 3 LP reply latencies. Compare latest latency to average of prior 2. Classify accelerating / flat / decelerating using thresholds, e.g. ≤ -20%, between -20% and +20%, ≥ +20%. | `lp_state.reply_velocity_trend`; `lp_state.reply_velocity_last_calc_at` | Trend changes or crosses into decelerating state |
| Reply initiation | High | Over last 5 exchanges, ratio = LP-initiated exchanges ÷ total exchanges. Flag low if ratio = 0 across 5 exchanges. | `lp_state.reply_initiation_ratio` | Ratio hits 0, materially improves, or materially worsens |
| Reply substance proxy | Medium, conservative | Use LP reply word count over last 3 replies plus question presence. Only use as supporting evidence; do not make standalone claims from it. | `lp_state.reply_substance_trend` (optional) or derive on read | Substance declines across 3 replies and coincides with other cooling context |
| Calendar friction | High | Weighted view over last 3 meetings: accept latency, reschedule count, and duration ratio = actual / booked. Classify improving / flat / worsening. | `lp_state.calendar_friction_trend` | Trend changes or friction breaches threshold |

- For MVP, use these signals only for sorting, prioritisation, drawer context, and draft/action support.
- Treat re-engagement after silence, richer pipeline flags, meeting composition shifts, document engagement, and NLP-based interpretation as post-MVP enhancements unless confidence improves materially.
- Calculation pattern: append raw interaction events first, compute rolling-window metrics second, update current state third, and write a signal log row only when a meaningful change or trigger occurs.

### 12.4 Supporting schema and tables — tight MVP shape

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

### 12.5 Concrete example — reply velocity

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

## Appendix A — Engineering reference (prototype routes, April 2026)

| Route | Behavior |
| --- | --- |
| `/` | Auth / onboarding / **→ `/home`** when session+onboarding |
| `/home` | **Today** |
| `/relationships` | Relationships |
| `/pipeline` | **Pipeline (Lists in UI)** |
| `/workflows` | Workflows |
| `/insights` | **Insights (demo / prototype metrics slice)** |
| `/activity` | Activity (**not in main nav**) |
| `/settings` | Settings |
| `/targets` | **Redirect** → `/pipeline` |
| `/today` | **Redirect** → `/home` |
| `/tasks` | **Redirect** → `/home` |
| `/contacts` | **Redirect** → `/relationships` |
| `/workflow` | **Redirect** → `/workflows` |
| `/briefs` | **Redirect** → `/materials?tab=briefs` |
| `/lp-network`, `/lp-network/mandate` | **Prototype** LP network |
| `/materials` | Prototype |
| `/search` | Prototype (mock) |

**Stack (package.json):** Next.js 16, React 19, Tailwind 4, Vercel AI SDK, Zod 4, Sonner.

**APIs (non-exhaustive):** `POST /api/tomo/orchestrate`, `POST /api/tomo/filter-relationships`, `GET /api/version`, `POST /api/cron/daily-brief` (as present in repo for demos).

---

## Appendix B — Tomo agent orchestration (implementation in repo)

| Piece | Role |
| --- | --- |
| `POST /api/tomo/orchestrate` | Streaming agent; **tools** and **system prompt** depend on `context.surface` and other `context` fields. |
| `POST /api/tomo/filter-relationships` | NL → structured filter; shared with `filter_relationships` tool. |
| `GET /api/version` | Build / deploy id. |

**Tools (exposed to the model; names as in code):** `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply`, `create_user_workflow` (where enabled).

| Surface (examples) | Tool scope (summary) |
| --- | --- |
| `general` | `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply` — **Today** enriches with `todayContext` in `general` |
| `drawer` | `update_crm`, `draft_reply` |
| `workflow` | `update_workflow` only |
| `filter` | `filter_relationships`, `update_crm` (with disambiguation context) |
| `workflow_creator` | `create_user_workflow` only |

**Caveat:** many **apply** paths are **stubbed** on the server; production MVP3 requires **persistence, RBAC, and audit** wiring.

**Related doc:** `docs/WORKFLOW_CREATOR_ORCHESTRATOR_PLAN.md`, `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md`.

---

*Last updated: April 24, 2026 — aligned to `tomo_crm` (MVP3 prototype) and MVP3 product narrative.*
