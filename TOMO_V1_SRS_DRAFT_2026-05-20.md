# TOMO V1 — Software Requirements Specification (SRS)

**Document status:** DRAFT v0.11 — **User custom workflows (V1):** optional **one follow-up leg** after primary outreach (wait + no reply, or on inbound reply; `send_email` only; cohort follow-up template contextual to primary; activate enrolls primary + deferred follow-up `workflow_step_runs`; advancement on send/reply/wait-elapsed; dual **stateSummary** segments and follow-up monitor drawer on active cards). Retains v0.10: Workflows surface **monitor-only** on active cards and step drawers (no draft-approval queue; operational signals such as “follow-up drafts ready” MAY open the **monitor** drawer only); **contextual** step monitor drawer by node type; planned **workflow run outcomes** view (§3.12 item 15). Five-step primary wizard + **Add follow-up** leg sub-wizard; `draftKind: "follow_up"` on cohort draft API; mock wait advancement on page load until production scheduler ships.
**Audience:** Frontend, backend, infra, security engineering; product management; QA.
**Authoring source:** Tomo V1 Final (Geoff 27.04.26), TOMO V1 Workflows — Final Scope and Rationale (15.05.26), Workflows Surface Implementation Plan (17.05.26), Section 8 (Signals V1 Final), Section 9 (Metrics V1), Document A (CRM Integration Reference), Document B (Onboarding Flow Specification), Tomo Email Ingestion Strategy, Tomo MVP3, mock repository (`tomo_crm`).
**Scope rule:** the body of this document covers V1 only. V2/V3 capability matrix, deferred features, and forward-compatibility notes are in Appendix C.

---

## Table of Contents

1. [Introduction](#1-introduction)
   1.1. Purpose
   1.2. Scope
   1.3. Definitions, acronyms, and abbreviations
   1.4. Intended audience
   1.5. Product overview
   1.6. Document conventions
2. [Overall Description](#2-overall-description)
   2.1. Product perspective
   2.2. Product functions (high-level)
   2.3. User classes and characteristics
   2.4. Operating environment
   2.5. Assumptions and dependencies
3. [System Features / Functional Requirements](#3-system-features--functional-requirements)
   3.1. Authentication and account management
   3.2. Onboarding flow
   3.3. Email and calendar sync
   3.4. CRM integration (CSV + native CRM read — Affinity or Backstop, whichever ships first)
   3.5. Signals engine
   3.6. Metrics engine and Insights page
   3.7. Reminders engine
   3.8. Today / Daily Brief
   3.9. Action Drawer and draft approvals
   3.10. Relationships / LP record
   3.11. Lists and named filters
   3.12. Workflows (playbooks)
   3.13. Meeting lifecycle (prep, transcripts, post-meeting capture)
   3.14. Tomo agent orchestration
   3.15. Activity log
   3.16. Settings (profile, funds, integrations, notifications, billing, team)
   3.17. Search
   3.18. Notifications (Email, Slack)
4. [External Interface Requirements](#4-external-interface-requirements)
   4.1. User interfaces (UX expectations)
   4.2. Software / API interfaces
   4.3. Hardware interfaces
   4.4. Communications interfaces
5. [Non-Functional Requirements](#5-non-functional-requirements)
   5.1. Performance
   5.2. Reliability and availability
   5.3. Security
   5.4. Privacy and data handling
   5.5. Compliance (SOC 2 Type 1, CASA, GDPR/CCPA)
   5.6. Scalability
   5.7. Usability and accessibility
   5.8. Observability
   5.9. Data retention and lifecycle
   5.10. Internationalisation and localisation
6. [Data Requirements](#6-data-requirements)
   6.1. Data model overview
   6.2. Canonical schema (every table, every field)
   6.3. Data dictionary
   6.4. Storage tiers and retention rules
   6.5. Migration and import strategy
7. [System Constraints](#7-system-constraints)
   7.1. Technology stack
   7.2. Regulatory and legal
   7.3. Budget, timeline, and team
   7.4. Build constraints inherited from the mock app
8. [Use Cases / User Stories](#8-use-cases--user-stories)
   8.1. Shell and global behaviour
   8.2. Authentication
   8.3. Onboarding
   8.4. Today / Home
   8.5. Relationships
   8.6. Lists
   8.7. Workflows
   8.8. Insights
   8.9. Activity
   8.10. Settings
   8.11. Search
   8.12. Meeting lifecycle
   8.13. Daily Brief delivery (Email, Slack)
9. [Out of Scope / Future Roadmap](#9-out-of-scope--future-roadmap)
   9.1. Out of V1 scope (deferred)
   9.2. Permanent non-goals
   9.3. V1.5 candidates
10. [Appendices](#10-appendices)
    A. Glossary
    B. Reference documents
    C. V2 / V3 capability matrix and forward-compatibility notes
    D. Text-only ERD (relationship map)
    E. API surface map
    F. Stage threshold matrix and signal computation pseudocode (lifted from Section 8)
    G. Metric computation pseudocode (lifted from Section 9)
    H. Open issues and decisions to lock

---

## 1. Introduction

### 1.1. Purpose

This Software Requirements Specification (SRS) defines the complete set of functional and non-functional requirements for **TOMO V1**, the first production release of TOMO — an AI-assisted execution workspace for institutional fundraising and investor relations (IR). The document is the single source of truth for the V1 build and is the contract between product, engineering, and QA for what V1 ships.

The document also serves as the formal handoff from the mock prototype in `tomo_crm` to the production build. The mock has UI scaffolding for most V1 surfaces but lacks production wiring, signal computation, metric pipelines, real OAuth, real persistence, and most integrations. This SRS specifies what the production build must deliver beyond the mock.

### 1.2. Scope

**In scope (V1):**

- A multi-tenant web application for fundraising workspaces, with identical permissions for all members of a workspace (no role tiering in V1).
- Direct integrations with Microsoft Graph (Outlook mail, Outlook calendar, Microsoft 365 contacts, Teams meetings and transcripts) and Google Workspace (Gmail, Google Calendar, Google Contacts / People API, Google Meet transcripts and recordings via the Meet REST API and Drive). No third-party unification provider (e.g. Nylas) is used; integrations are built directly against vendor APIs.
- Firebase Authentication for sign-up and sign-in to the TOMO app; Microsoft and Google as upstream OAuth identity providers for the user's mail, calendar, and meeting data sources.
- A CRM ingestion pipeline supporting CSV import from any source (Affinity, Backstop, Foliometrics, HubSpot, Excel, Google Sheets, generic) with column auto-mapping, deduplication, and conflict resolution. **Native CRM API integration in V1** is **read-only one-way pull** for **Affinity or Backstop — whichever connector ships first** for the FC cohort (the other CRM continues on CSV until its connector lands; see §3.4). Bi-directional CRM sync (SoR write-back) is deferred — Affinity bi-directional to V2; Backstop bi-directional to V1.5+.
- A nine-signal behavioural engine (per Section 8) that fires nightly batch and event-driven signal observations against email and calendar metadata and writes to an append-only signal log.
- A ten-metric Insights page (per Section 9) computed nightly with selected event-driven recomputation.
- A reminders engine covering open loops, missed replies, and commitments.
- The Today screen, Action Drawer with draft approvals, Relationships page, Lists, Workflows (four seeded V1 workflow entries — two locked defaults plus two configurable templates — plus GP-built **custom workflows** scoped to a selected list), Insights, Activity, Search, and Settings.
- A meeting lifecycle covering prep brief generation, transcript and AI-recap ingestion (Microsoft Teams and Google Meet), the ~10-field post-meeting capture prompt, and follow-up draft generation.
- Daily Brief delivery via in-app, email, and Slack (push only; no Slack-native operating model in V1).
- SOC 2 Type 1 and CASA Tier 2 compliance posture sufficient for institutional security diligence.
- Email backfill per the three-tier ingestion model: 0–12 months full content, 13–36 months metadata only, beyond 36 months no ingestion.

**Out of scope (V1) — see §9 and Appendix C for full V2/V3 capability matrix:**

- DocSend / DealRoom document engagement integrations (V2).
- Newsletter platform integrations such as Mailchimp / HubSpot Marketing (V2).
- NLP-derived signals (question type, commitment language, objection recurrence) (V3).
- Composite, data-validated momentum score (V3).
- Per-IR breakdown of execution health metrics (V2).
- Mobile native applications (responsive web only in V1).
- Multi-party autonomous scheduling and bot-driven calendar negotiation (post-MVP).
- Role-based access control beyond a flat workspace-member model (V2).
- HubSpot and Salesforce bi-directional API integrations (V1.5+).
- Backstop bi-directional API integration (V1.5+; **read-only** Backstop API pull may ship in V1 if Backstop wins the sequencing call vs Affinity — see §3.4).
- Affinity bi-directional API sync (deferred to V2; V1 ships read-only one-way pull for the first native connector only).
- TOMO-staff support-impersonation flow (deferred to V2; V1 uses manual operational support without an in-product impersonation feature — see §1.2 and §9.2).
- Automated workspace transfer on owner departure (deferred to V2; V1 uses a manual support flow).
- Per-fund tenant separation beyond logical isolation (always logical isolation in V1; physical separation only on request V2+).

### 1.3. Definitions, acronyms, and abbreviations

| Term | Definition |
|---|---|
| **GP** | General Partner. The primary user of TOMO. The "fundraiser" in fundraising-team terminology. |
| **LP** | Limited Partner. The investor or prospective investor whose relationship the GP manages. |
| **IR** | Investor Relations. The discipline of managing LP relationships across the lifecycle of a fund. |
| **Founding Circle (FC)** | The first 12 GP cohort using TOMO V1 in a structured high-touch onboarding programme. |
| **Workspace** | The unit of multi-tenancy in TOMO. Multiple workspace members share data, integrations, and signal state within a workspace (no fixed member-count cap). Equivalent to a "team" in SaaS terminology. |
| **Fund** | A specific raise within a workspace (e.g. "Fund III"). A workspace may contain multiple funds. |
| **Meaningful Touch** | A two-way LP interaction satisfying the formal definition in §3.5.1 (lifted from Section 8 §8.2). The unit of measurement for "have we recently connected with this LP." |
| **Pipeline stage** | One of the eight canonical LP stages (`sourced`, `first_meeting`, `nurturing`, `active_diligence`, `soft_commit`, `committed`, `closed_lost`, `on_hold`) per Section 8 §8.2. |
| **Pipeline flag** | The G/A/R (Green / Amber / Red) state computed per LP per the locked algorithm in Section 8 §8.7. |
| **Signal** | A behavioural observation computed from email and calendar metadata that contributes to flag state, fires an action, or appears as a named filter. Nine signals in V1. |
| **Metric** | An aggregate number rendered on the Insights page. Ten metrics in V1. |
| **Reminder** | An item the GP must act on (open loop, missed reply, commitment). Distinct from a signal. |
| **Action Drawer** | The right-hand panel where TOMO surfaces drafts, captures, and approvals for GP review. |
| **Live list** | A saved cohort whose membership is computed from **structured filter criteria** against current LP data (§3.11). UI label **LPs matching**. |
| **Manual list** | A saved cohort with **no structured filter**; membership is exactly the set of explicitly selected LPs (§3.11). UI label **LPs in list**. |
| **Day 1 Gap** | The count of LPs the GP's CRM lists as active but for whom TOMO finds no meaningful touch in 60+ days. Surfaced after initial sync (Home / Insights; not a Document B wizard screen — see §3.2, §3.6). |
| **Tomo** | The product name and the in-app AI agent. The agent appears as inline chat (Today, Workflows) or as a floating dock / mobile sheet (other surfaces). |
| **Tone calibration** | The per-user model TOMO trains on the user's sent-mail history after the workspace bundle is connected (typically post–Step 2) to make drafts sound like the user. |
| **Three-Touch Qualification** | A guided three-step sequence (relevant insight → direction question → respectful close) for qualifying quiet LPs. Default-on workflow in V1. |
| **MS Graph** | Microsoft Graph REST API. The single endpoint surface for Microsoft 365 mail, calendar, contacts, Teams, and Drive. |
| **OAuth** | OAuth 2.0 with OpenID Connect. Used for both Firebase social sign-in and per-user Microsoft / Google data-source authorisation. |
| **CASA** | Cloud Application Security Assessment. A Google-administered third-party security review used in institutional diligence. CASA Tier 2 is the V1 target. |
| **SOC 2 Type 1** | Service Organization Control 2 Type 1 audit. Confirms that controls are designed appropriately at a point in time. V1 target before first GA customer. |
| **PII** | Personally Identifiable Information. |
| **RBAC** | Role-Based Access Control. V1 implements a flat workspace-member model (no role tiering). |
| **SLO / SLA** | Service Level Objective / Agreement. SLOs are internal targets; SLAs are externally committed. |
| **OOO** | Out of office. OOO replies are detected and excluded from meaningful-touch calculations. |
| **Append-only** | Data discipline rule: signal observations, metric snapshots, action log rows, and stage transitions are never overwritten or truncated. Required for V3 dataset integrity. |
| **Insights page** | The single page that surfaces the ten V1 metrics. The page that justifies subscription renewal at Day 14 and beyond. |

### 1.4. Intended audience

This document is written for:

- **Frontend engineering** — implementing the Next.js / React surfaces and component states described in §3 and §4.1.
- **Backend engineering** — implementing the signal engine, metric engine, reminders engine, integrations layer, sync workers, and APIs described in §3 and §4.2.
- **Infrastructure / SRE** — provisioning the AWS environment, Supabase project, Firebase project, Azure App Registration, Google Cloud project, and supporting observability and security controls described in §5 and §7.1.
- **Security engineering** — implementing the controls required for SOC 2 Type 1 and CASA, described in §5.3 to §5.5.
- **Product management** — confirming scope, prioritising trade-offs, signing off on open issues in Appendix H.
- **QA engineering** — building the test plan from the user stories in §8 and the acceptance criteria embedded throughout §3.

The reader is assumed to be familiar with the mock app in `tomo_crm` and to have read the source documents listed in Appendix B.

### 1.5. Product overview

TOMO V1 is a multi-user web application that sits alongside the GP's existing CRM and reads the GP's email and calendar continuously to surface signal-driven prompts for daily fundraising work. The product's defining promise — distilled from the V1 Final document — is:

> A multi-user, all-in-one capital formation workspace that drafts, schedules, follows up, reads pipeline signals, and surfaces reminders faultlessly for one fundraising team — works alongside or replaces existing CRM, quantifies time recovered from Day 1, clears institutional security diligence.

Unlike traditional CRMs (Affinity, Backstop, Foliometrics, HubSpot), TOMO is positioned as the **operational AI layer** that the GP opens each morning. The CRM remains the system of record for compliance and audit. TOMO is what tells the GP what to do today.

V1 ships eight surfaces (Today, Relationships, Lists, Workflows, Insights, Activity, Search, Settings), one onboarding flow, one Action Drawer, one Daily Brief, and one Tomo agent across all surfaces. The agent operates with surface-gated tools and human-in-the-loop on every outbound action — no automatic sending, no automatic CRM mutation.

### 1.6. Document conventions

- "Shall" indicates a binding requirement.
- "Should" indicates a recommended behaviour with stated rationale; deviations require documented justification.
- "May" indicates an optional behaviour that does not block ship.
- Code blocks are pseudocode unless explicitly marked otherwise.
- Field names in code formatting (`like_this`) refer to canonical schema fields defined in §6.
- Section references in the form **§X.Y** are to this SRS unless prefixed (e.g. "Section 8 §8.2" refers to the source document `Section_8_Signals_V1_Final.md`).
- Where this document differs from a source document, this document supersedes for V1 scope. Source documents remain authoritative for context, rationale, and forward-compatibility commentary.
- Open issues that need PM or engineering decision are tagged **[OPEN: id]** inline and consolidated in Appendix H.

---

## 2. Overall Description

### 2.1. Product perspective

TOMO V1 is a new, standalone product. It is not a module of an existing system. It does not replace the GP's CRM on day 1; it sits alongside it. The GP's authoritative records of LP commitments, legal documents, and compliance audit trails remain in their existing CRM (Affinity, Backstop, Foliometrics, HubSpot, etc.). TOMO is the operational AI layer.

**System context (text-only diagram):**

```
                       ┌──────────────────────────┐
                       │      GP (multiple users  │
                       │      per workspace)      │
                       └────────────┬─────────────┘
                                    │ HTTPS (Next.js web app)
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │                   TOMO V1                          │
        │  ┌─────────────────┐    ┌────────────────────┐    │
        │  │  Web app        │    │  API (Next.js     │    │
        │  │  (Next.js 16,   │◄──►│  route handlers + │    │
        │  │  React 19)      │    │  background       │    │
        │  └─────────────────┘    │  workers)         │    │
        │                          └─────────┬─────────┘    │
        │                                    │              │
        │  ┌──────────────────────────────────┴───────────┐ │
        │  │  Persistence: Supabase (Postgres + storage)  │ │
        │  │  Auth: Firebase Authentication               │ │
        │  │  Workers: AWS (signal batch, sync workers,   │ │
        │  │  webhooks, daily brief, action log)          │ │
        │  └──────────────────────────────────────────────┘ │
        └────────┬──────────┬──────────┬────────────────────┘
                 │          │          │
                 ▼          ▼          ▼
        ┌───────────┐ ┌───────────┐ ┌───────────────────────┐
        │ Microsoft │ │ Google    │ │ CRM sources (read):   │
        │ Graph     │ │ Workspace │ │  - Affinity (API read† / CSV) │
        │ (Outlook, │ │ (Gmail,   │ │  - HubSpot (read CSV) │
        │ Calendar, │ │ Calendar, │ │  - Backstop (API read† / CSV) │
        │ Contacts, │ │ Contacts, │ │  - Foliometrics (CSV) │
        │ Teams,    │ │ Meet,     │ │  - Sheets / Excel     │
        │ Drive )   │ │ Drive)    │ │  - Generic CSV        │
        └───────────┘ └───────────┘ └───────────────────────┘
                 │                         │
                 └─────────┬───────────────┘
                           ▼
        ┌───────────────────────────────────────┐
        │ Outbound notifications:               │
        │  - Slack (Webhooks API; daily brief)  │
        │  - Email (transactional via Postmark  │
        │    or AWS SES)                        │
        └───────────────────────────────────────┘

        † Native CRM **read-only** API pull ships for **Affinity or Backstop, whichever comes first** (credentials in **Settings** in the V1 eight-screen mock; onboarding screen 2 is CSV for all pipeline cards). Bi-directional SoR sync is not V1 — see §3.4.
```

External actors and systems that TOMO V1 interacts with are listed in §4.2 with the specific endpoints and authentication patterns.

### 2.2. Product functions (high-level)

V1 delivers twelve product capability areas. Each is a top-level grouping of functional requirements in §3 and a top-level grouping of user stories in §8.

1. **Authentication and account management** — Firebase Auth (email + Google + Microsoft); per-user OAuth for data-source connections; workspace creation; team invites (multiple members per workspace); plan billing via Stripe.
2. **Onboarding** — **Eight-screen** post-auth flow per **Document B** and **`design/tomo_onboarding_v1.html`**: welcome → connect workspace (pick Google or Microsoft) + pipeline (**all pipeline cards use CSV / Excel upload** in the wizard mock, including Affinity-labelled; native CRM API is **Settings**) → fund profile → raise profile → team → tone capture **choice** → first-read notices (mock) → briefing preview → **Take me to the app** / Home. **Three-tier historical email**, **meeting transcripts**, and **Slack** are **not** in the wizard; they are **Settings / background** (may return to onboarding later). See §3.2.
3. **Email and calendar sync** — direct MS Graph and Google Workspace integrations; three-tier ingestion (0–12mo full / 13–36mo metadata / >36mo none); webhook-driven incremental sync; OOO detection.
4. **CRM integration** — generic CSV pipeline with auto-mapping, deduplication, and conflict resolution; **read-only** native CRM API pull for **Affinity or Backstop — whichever connector ships first** (bi-directional / SoR write-back not in V1).
5. **Signals engine** — nine surfaced signals plus three captured attributes; nightly batch and event-driven computation; append-only signal log; pipeline flag computation.
6. **Metrics engine** — ten Insights-page metrics; daily snapshot table; per-metric refresh cadences.
7. **Reminders engine** — open loops, missed replies, commitments; tier-aware thresholds; Action Drawer routing.
8. **Today / Daily Brief** — daily-rhythm landing surface with attention queue, commitments, brief, and inline Tomo chat. Daily Brief delivered also via email and Slack push at user-selected time.
9. **Action Drawer and approvals** — drafts, post-meeting capture, scheduling threads, follow-up reminders, meeting prep briefs; human-in-the-loop on every outbound.
10. **Relationships, Lists, and Workflows** — LP record (full Section 8 §8.4 schema); Lists index and list detail per `design/tomo_lists_v1.html` (live vs manual saved lists, named filters, LP row table in list detail); workflow control room at `/workflows` with four seeded V1 entries (Post-Meeting Execution, F7 Three-Touch Qualification, Themed Outreach, Trip Orchestrator) and a **five-step New workflow wizard** (Name → Trigger → Action → Draft → Personalise) for GP-built custom workflows on the list selected in the Workflows left rail, with an **optional one follow-up leg** (Themed-style: primary → wait or on-reply → follow-up email).
11. **Meeting lifecycle** — prep brief, transcript ingestion (Teams + Meet) with AI recap fallback, post-meeting capture (~10 fields, <60 seconds), follow-up draft.
12. **Tomo agent orchestration** — surface-gated tool calls; CRM updates, draft replies, filter relationships, workflow editing, post-meeting capture. All mutations require user confirmation.

### 2.3. User classes and characteristics

V1 has three classes of human user and one class of system user.

**U1 — General Partner (GP) primary:**
The fundraiser. Reads email and calendar regularly. Uses TOMO daily. The user class on which all UX decisions are optimised. Typical profile: 5–25 years' experience in IR or fund management; comfortable with consumer SaaS but not technical; manages 50–500 LP relationships; often on the road and using mobile responsive web for triage.

**U2 — Workspace teammate (other GP, IR associate, EA):**
Additional workspace members alongside the primary GP—no artificial cap on how many—with identical permissions to other members in V1 (no role tiering). Same OAuth-per-user pattern: each user authorises their own Microsoft / Google account for their own mail/calendar; data is filtered to that user's view where the source system is per-user. Workspace-level data (LPs, signals, metrics, workflows, action log) is shared.

**U3 — TOMO operator (Founding Circle support, "Geoffrey Surface"):**
A TOMO staff user (initially Geoffrey, later customer success) who pairs 1:1 with each Founding Circle GP for a 45-minute onboarding session, plus Day 14, Day 30, and Day 60 reviews. **No in-product impersonation feature ships in V1.** Operator support in V1 is operational only — pairing over Zoom screen-share with the GP, and read-only access to internal ops tooling for spot-checks (e.g. Supabase admin queries against a per-customer audit view, scoped to TOMO staff and themselves logged). Any TOMO-staff data access is documented in the SOC 2 access-management policy and recorded in `auth_events`. The product feature for support impersonation (request, approve, time-bound, audit, revoke) is deferred to V2.

**U4 — System (background workers):**
Nightly signal batch, sync workers, webhook handlers, daily brief generators, action log writers. No human user; runs as service-account principals against Supabase, MS Graph, Google Workspace, and the queue.

### 2.4. Operating environment

**Client (browser):**
- Latest two major versions of Chrome, Edge, Safari, and Firefox on macOS and Windows.
- Mobile: latest two major versions of Safari (iOS) and Chrome (Android). V1 is responsive web only — no native apps.
- Minimum viewport widths: 360px (mobile portrait) to 2560px (large desktop). Breakpoint at 768px between mobile and desktop layouts.
- JavaScript required. No "no-JS" path.

**Application runtime:**
- Next.js 16 App Router on Vercel (production hosting) and AWS (background workers, batch jobs, webhook handlers).
- Node.js 20 LTS or later for serverless and worker runtimes.

**Persistence and auth:**
- Supabase (managed Postgres 16 + Storage). Single project per environment (dev, staging, prod). Logical isolation via row-level security and `workspace_id` foreign keys.
- Firebase Authentication for sign-in. Firebase project per environment.

**Background and scheduled work:**
- AWS for sync workers, webhook handlers, signal batch, metric snapshot, daily brief, and outbound delivery. Specific service choice (ECS Fargate, Lambda, Step Functions, EventBridge) per workload, captured in §5 and the engineering design doc that follows this SRS.

**Identity provider integrations:**
- Microsoft Azure App Registration for MS Graph delegated access (one tenant-multi app, GP authorises in their own M365 tenant).
- Google Cloud OAuth Client for Google Workspace delegated access (one OAuth client, GP authorises in their own Workspace tenant).

**External APIs and protocols:**
- HTTPS / REST against Microsoft Graph v1.0 and beta endpoints (mail, calendar, contacts, online meetings, Teams transcripts, Drive).
- HTTPS / REST against Google Workspace APIs: Gmail API v1, Calendar API v3, People API v1, Meet REST API v2, Drive API v3.
- HTTPS / REST against **Affinity** API v1 (webhooks) and v2 (reads) for the **V1 read-only** pull when Affinity is the first native CRM connector; v2 write endpoints apply when bi-directional Affinity sync is in scope (V2).
- HTTPS / REST against **Backstop** licensed read API for the **V1 read-only** pull when Backstop is the first native CRM connector; write-back remains V1.5+ (§9.1).
- HTTPS / REST against Slack Web API (`chat.postMessage` and OAuth) for daily brief delivery.
- HTTPS against Stripe API for billing.
- SMTP / API against Postmark or AWS SES for transactional email.

### 2.5. Assumptions and dependencies

**Assumptions:**

1. The GP has an active Microsoft 365 or Google Workspace account and has administrator approval (or self-approval, for owner-administrator GPs) to grant the OAuth scopes listed in §4.2.
2. The GP can produce a CSV export from their existing CRM during onboarding. This is universally true for the five FC source CRMs.
3. AI-generated meeting recaps from Microsoft 365 Copilot or Gemini for Workspace are licence-gated upstream; when not available, V1 falls back to ingesting the raw transcript and running TOMO's own LLM summarisation. See §3.13.
4. whichever FC GP relies on **Affinity** for native API read has license tiers granting API access (Scale, Advanced, Enterprise); lower-tier Affinity users fall back to CSV. **Backstop** native read path requires the client's **licensed Backstop API** entitlement; otherwise CSV.
5. The GP grants at minimum read access to their last 12 months of email and calendar. Without it, the Day 1 Gap and most signals do not compute meaningfully.
6. A workspace contains a single fund unless explicitly multi-fund. Multi-fund workspaces (rare in FC) follow the same data model with `fund_id` foreign keys.
7. All times are stored in UTC; rendering uses the user's primary timezone captured at onboarding.

**External dependencies:**

| Dependency | Version / Tier | Risk if unavailable |
|---|---|---|
| Microsoft Graph API | v1.0 + selective beta (Copilot AI insights) | High — blocks Outlook/Teams users; degrade to "transcript only" if AI insight beta drops |
| Google Workspace APIs | Gmail v1, Calendar v3, People v1, Meet v2, Drive v3 | High — blocks Gmail/Meet users |
| Firebase Authentication | Generally available | High — blocks all sign-in |
| Supabase Postgres | Pro plan minimum (point-in-time recovery, daily backups) | High — blocks all reads/writes |
| Vercel hosting | Pro plan | Medium — can self-host on AWS in fallback |
| AWS (SQS, ECS/Lambda, EventBridge, S3, SES) | Standard regions (us-east-1 primary, eu-west-1 secondary V1.5) | High |
| Slack Web API | Free tier OK for outbound chat.postMessage | Low — degrade to email-only daily brief |
| Stripe API | Standard | Medium — blocks paid sign-up; Founding Circle bypass for first 12 |
| Postmark or AWS SES | Standard | Medium — fall back to alternative transactional email provider |
| Affinity API | v1 + v2 (Scale tier or above) | Conditional — **read** endpoints required when Affinity wins native connector sequencing in V1; full bi-directional dependency is V2 |
| Backstop API (licensed read) | Per Backstop contract | Conditional — **read** endpoints required when Backstop wins native connector sequencing in V1; bi-directional dependency is V1.5+ |

**Internal dependencies:**

- The mock app (`tomo_crm`) provides UI scaffolding for most surfaces. V1 production reuses the mock's component library, layout, and routing where appropriate. The Insights page mock implements a partial slice (execution health, lists intel, fat middle); V1 must extend to all ten metrics per Section 9.
- Section 8 (Signals V1 Final) and Section 9 (Metrics V1) are normative. Where this SRS condenses them, the source documents remain authoritative for rationale and forward-compatibility notes.
- Document A (CRM Integration Reference) and Document B (Onboarding Flow Specification) are normative for §3.4 and §3.2 respectively.

---

## 3. System Features / Functional Requirements

This section specifies the functional requirements for V1. Each subsection follows a consistent pattern:

- **Description** — what the capability does and why it exists.
- **Inputs / triggers** — data sources and activation events.
- **Processing** — the rules and steps.
- **Outputs** — what the system writes or surfaces.
- **Business rules** — non-obvious constraints that engineering must respect.
- **Acceptance criteria** — testable outcomes for QA.

Where source documents (Section 8, Section 9, Document A, Document B) are normative, this SRS condenses and references rather than duplicating. Field references in `like_this` notation point to §6 schema.

---

### 3.1. Authentication and account management

**Description.** TOMO uses Firebase Authentication for sign-up and sign-in to the TOMO web app. Microsoft and Google OAuth providers are configured in Firebase to allow GP single-sign-on with their work accounts. Once signed in, the user authorises one or more *data-source* OAuth grants (Microsoft Graph, Google Workspace, Slack, **native CRM read** where implemented — Affinity or Backstop per §3.4) — these are separate from the Firebase auth grant and target the GP's mailboxes, calendars, and meetings (per §1.5). Each user can be a member of multiple workspaces; one workspace is selected as default.

**Inputs / triggers.**

- New user signs up via the auth page.
- Returning user signs in.
- User accepts a workspace invitation.
- User triggers a password reset.
- User initiates account deletion.
- Firebase ID token is presented in the `Authorization` header of every API request.

**Processing.**

1. Sign-up flow supports three Firebase providers in V1: email + password, Google, Microsoft. Magic-link sign-in is **not** in V1 — the original Founding Circle magic-link flow runs server-side and creates the Firebase user behind the scenes; the FC GP then completes a normal Firebase sign-in.
2. On first successful sign-in, if the user has no `users` row, the application creates one (`firebase_uid`, `email`, `email_verified`).
3. If the user has no workspace memberships and is not joining via invitation, the application creates a new `workspaces` row with the user as `owner_user_id` and a `workspace_members` row with `role='owner'`. This atomic creation happens before redirect to onboarding.
4. Workspace invitations are emailed to a target address. The invitation row carries a single-use token (`workspace_members.invitation_token`) with 7-day expiry. Accepting an invitation requires the invitee to be signed into Firebase Auth with the matching email; mismatched emails are rejected with a clear error.
5. Workspace membership has no artificial member-count limit; invite acceptance creates `workspace_members` rows subject only to duplicate-membership checks and eligibility rules (not a numeric cap).
6. Per-user OAuth grants for data sources are initiated from **Settings → Integrations** or during onboarding for the **workspace bundle only** on **screen 2**. **Pipeline** cards on screen 2 do **not** start native CRM OAuth in the V1 mock — they use file import only; CRM API tokens are captured in Settings when applicable. Each grant is a separate OAuth flow against Microsoft (Azure App Registration) or Google (Google Cloud OAuth Client) — Firebase auth is **not** reused for data scopes. Tokens land in `oauth_tokens` encrypted via Supabase Vault.
7. Refresh tokens are used by a background worker to refresh access tokens before expiry. Failed refresh writes `last_refresh_error`; the integration health flips to `degraded` or `disconnected` per §3.16.
8. Password reset uses Firebase's standard reset email flow; TOMO does not handle passwords directly.
9. Account deletion is a soft-delete on `users` followed by a 30-day grace period; on confirmation (or after 30 days), the application hard-deletes and writes a final `auth_events` row. Per §6.4, append-only audit data is preserved; PII is scrubbed where not legally required.
10. Workspace transfer in V1 is manual (per §9.1). The current owner emails support; support verifies, and a TOMO operator runs an admin tool to update `workspaces.owner_user_id` and add the new user to `workspace_members`. Audited in `data_access_log`.

**Outputs.**

- `users`, `workspaces`, `workspace_members`, `oauth_tokens` rows created/updated.
- `auth_events` row per sign-in / sign-out / OAuth grant / refresh / revoke.
- `activity_log` row for every workspace-member action visible to other workspace members.

**Business rules.**

- BR-3.1.1 — V1 has no engineered cap on workspace member count at the database or API layer; membership is rejected only for semantic reasons (duplicate active membership, invalid token, mismatched invite email)—not existing headcount.
- BR-3.1.2 — All workspace members have identical permissions in V1; `role='owner'` differs only in workspace transfer eligibility and billing visibility (cards, invoices).
- BR-3.1.3 — Firebase Auth providers and data-source OAuth providers are independent grants. A user can sign in with Google and authorise Microsoft Graph for data; the inverse is also valid.
- BR-3.1.4 — OAuth tokens are stored encrypted at rest. Plaintext tokens are never logged. Memory access is limited to short-lived worker processes.
- BR-3.1.5 — Account deletion preserves append-only audit data and `lp_signal_log`. PII is scrubbed from `users` (email replaced with hashed identifier).
- BR-3.1.6 — Sessions are managed by Firebase. TOMO does not maintain its own session cookie. Refresh tokens rotate per Firebase defaults.

**Acceptance criteria.**

- AC-3.1.1 — A new user signing up with email + password lands on the onboarding flow with a workspace already created.
- AC-3.1.2 — Successful invite acceptance after several prior members yields a valid `workspace_members` row without a "capacity" rejection.
- AC-3.1.3 — Signing in with Google and then connecting Microsoft Graph (Outlook + Calendar + Teams) results in two `oauth_tokens` rows for the same user, with disjoint scope arrays.
- AC-3.1.4 — Revoking a Microsoft Graph grant in Settings → Integrations sets `oauth_tokens.revoked_at`, marks `crm_sync_status.health='disconnected'`, and writes an `auth_events` row.
- AC-3.1.5 — Account deletion confirmed within the 30-day window successfully purges PII and leaves `lp_signal_log` rows intact (with the user reference NULLed).
- AC-3.1.6 — Workspace transfer via support tool changes `workspaces.owner_user_id`, adds the new owner to `workspace_members`, and logs to `data_access_log`.

---

### 3.2. Onboarding flow

**Description.** **Eight-screen** post-auth experience from sign-up through **Take me to the app** (`/home`), aligned with **`design/tomo_onboarding_v1.html`** and **Document B** (`Document_B_Onboarding_Flow_Specification.md`). Primary chrome: top progress (eight segments + label), **indexing ticker** from screen 2 (mock; non-interactive), **Back** + **Continue** in a **fixed bottom bar** on screens 2–7 — the bar is implemented so **only** those two controls receive pointer events (backdrop does not block the connect grid). Screen 1 uses **Begin setup** in content; screen 8 uses in-content CTAs.

**Moved out of the wizard (background / Settings — may re-enter the wizard later):** in-wizard checkboxes for **SRS three-tier historical email** and **meeting transcripts**, and **Slack** (+ *What’s on my Radar*). Those preferences remain on `OnboardingState` and in production on the user/workspace row for **Settings** and default job behaviour; they are **not** shown in this eight-screen flow.

The wizard **includes** fund profile, raise profile, team list, tone-capture **choice**, a **first-read** notices screen, and a **First-Read Briefing preview** (mock numbers in the client; full briefing async per §3.6 / Briefings).

Closing the browser preserves state. Mock persistence: `ONBOARDING_STATE_STORAGE_KEY` (`tomo-onboarding-v2`) and `OnboardingState` in `src/lib/types.ts` (includes `wizardStep` 1–8). Legacy key `tomo-onboarding` is **not** read. Production mirrors the same shape in `users.onboarding_state_jsonb`.

**Inputs / triggers.**

- A new user who has not finished onboarding (workspace created per §3.1; redirect into the wizard after auth).
- Onboarding state is tracked on the `users` row (`users.onboarding_state_jsonb`, V1 migration — mirrors mock `OnboardingState`: `workspaceBundleConnected`, `wizardStep`, fund/raise/team/tone fields, `crmCsvLabel`, `crmImportMethod`, `affinityConnected`, `optInHistoricalEmailIngestion`, `optInMeetingTranscripts`, `slackWhatsOnRadarPush`, `onboardingComplete`, etc.).

**Processing — eight screens (aligned with Document B).**

1. **Screen 1 — Welcome.** Editorial welcome, identity strip, **Begin setup**. No integrations.

2. **Screen 2 — Connect data.** **Google Workspace** or **Microsoft 365** (required bundle — pick one). **Pipeline:** every card (**Backstop**, **Affinity**, **Foliometrics**, **HubSpot**, **CSV upload**) uses the **same** mock flow: tap card → inline upload panel → optional auto file picker → column mapping → **Confirm import** → panel closes → matching card shows **Connected** (`crmCsvLabel`). **No** Affinity API capture in the wizard; native CRM OAuth/API remains **Settings → Integrations**. **Continue** disabled until workspace connected **and** (`contactImportUploaded` **or** `affinityConnected` if already set from Settings in production).

3. **Screen 3 — Your fund.** Fund name (required), strategy, AUM, narrative.

4. **Screen 4 — Your raise.** Vehicle, targets, counts, aspirations (required fields per Document B).

5. **Screen 5 — Your team.** Signed-in user + optional teammates.

6. **Screen 6 — Your voice.** Tone capture path: sent-mail sample, manual paste, or skip.

7. **Screen 7 — A first read.** Mock partial-read notices (confidence-building).

8. **Screen 8 — Briefing preview.** Mock five-number preview; **Take me to the app** sets `onboardingComplete` and routes Home.

**Cross-step dependencies (summary):** Linear; screen 2 gates workspace + pipeline; screens 3–4 gate on required fields per Document B.

**Resumability.**

- State after navigation is persisted to `users.onboarding_state_jsonb` (or mock localStorage key `tomo-onboarding-v2`).
- `wizardStep` resumes the flow after refresh.

**Outputs.**

- `oauth_tokens` for workspace bundle (and for native CRM read when the GP connects API in **Settings**, not from the eight-screen wizard pipeline cards).
- CRM import from **CSV / Excel confirm** on screen 2 (all pipeline cards) or from native Affinity/Backstop **API pull** when configured in Settings per §3.4.
- Fund/raise/team/tone fields stored in onboarding JSON (and mirrored to profile / workspace tables in production as needed).
- User preference flags for historical email, transcripts, and Slack remain available from **Settings**, not from the wizard.

**Business rules.**

- BR-3.2.1 — **Continue** on screen 2 remains disabled until workspace bundle connect succeeds **and** pipeline requirement is met (**Confirm import** on the CSV path, or `affinityConnected` when mirrored from Settings in production).
- BR-3.2.2 — In the **wizard mock**, **all** pipeline source cards (including Affinity) use **CSV / Excel upload** only; Backstop / HubSpot / Foliometrics **do not** unlock native OAuth on screen 2. Native CRM OAuth is **Settings → Integrations** per §3.4.
- BR-3.2.3 — Wizard completion does not require Slack, historical email opt-in, or meeting-transcript opt-in (those are Settings / background).
- BR-3.2.4 — Three-tier historical ingestion and transcript behaviour remain defined in §3.3 and §3.13; consent and defaults may be applied outside this wizard until those controls return to onboarding.

**Acceptance criteria.**

- AC-3.2.1 — A GP can complete all eight screens and land on `/home` with workspace connected and pipeline requirement satisfied.
- AC-3.2.2 — Closing the browser mid-wizard and reopening resumes at the persisted `wizardStep` with prior field values intact.
- AC-3.2.3 — After **Confirm import** on screen 2, behaviour matches §3.4 CSV ACs; `crmCsvLabel` records which card was chosen. Native Affinity/Backstop API validation applies only when the GP uses **Settings** (or future wizard API step), not the current CSV-only pipeline cards.
- AC-3.2.4 — A GP who never changes historical-email / transcript / Slack flags in Settings still completes onboarding; those features follow §3.3 / §3.13 defaults or deferred enablement.

---

### 3.3. Email and calendar sync

**Description.** Direct integration with Microsoft Graph and Google Workspace APIs (no third-party unifier). Three-tier ingestion (per `tomo_email_ingestion_strategy.md`): 0–12 months full content, 13–36 months metadata only, >36 months no ingestion. Initial backfill runs progressively at onboarding; ongoing sync uses Microsoft Graph subscriptions and Google Pub/Sub watches with a 30-minute delta-polling fallback (per O-9). OOO replies are detected and excluded from meaningful-touch calculations.

**Inputs / triggers.**

- OAuth grant from §3.1 with scopes per §4.2.
- Webhook deliveries from Microsoft Graph subscriptions and Google Pub/Sub.
- Scheduled backfill jobs at onboarding.
- Subscription/watch resubscribe job (every 12 hours, before expiry).
- Delta-polling fallback (every 30 minutes per integration when webhook health is degraded or failing).

**Processing.**

1. **Initial backfill — three phases.**
   - Phase A (sub-2-minute): most recent 90 days, full content. Gates **Day 1 Gap** and other first-session Insights baselines until complete (§3.6); not a wizard-blocking milestones screen (Document B §3.2). Targets ≤ 2 minutes for a typical GP.
   - Phase B (background, ≤ 30 minutes): months 4 through 12, full content.
   - Phase C (background, ≤ 2 hours): months 13 through 36, metadata only — no `body_text`, no `body_html_archived_url`, `metadata_only=true`.
   - All phases write to `lp_interactions` and `lp_calendar_events` with `source` set appropriately.
2. **Ongoing sync.**
   - **Microsoft Graph.** Per-user subscription on `/users/{id}/messages` and `/users/{id}/events`. Delta link maintained in `crm_sync_status.metadata.delta_link`. Subscription expiry max 3 days; resubscribe worker renews before expiry. Webhook signature verified per Microsoft Graph docs.
   - **Google Workspace.** Gmail `users.watch` on the user's mailbox publishing to a Pub/Sub topic; Calendar push notifications via watch channels. History API used to drain delta after each notification.
3. **OOO detection.** Computed at ingest. Patterns matched: subject prefixes (`Out of Office`, `Auto-reply`, `OOO`, `Annual leave`), body phrases (configurable list), Gmail `auto_reply` SMTP header, Microsoft `automaticReply` field. Detected → `lp_interactions.is_ooo=true` and excluded from meaningful-touch.
4. **Meaningful-touch flag.** Computed at ingest per Section 8 §8.2 definition; written to `lp_interactions.is_meaningful_touch`. Recomputed if the body is later promoted to full-content (rare; not in V1 normal path).
5. **Truly-LP-initiated flag.** For inbound interactions, computed at ingest using the strict 14-day window per Section 8 §8.3 Signal 5; written to `lp_interactions.is_truly_lp_initiated`.
6. **Body cleansing.** Signatures, quote-blocks, tracking pixels stripped; cleaned text written to `body_text`. Word count computed per Section 8 §8.9 clarification 9 with a confidence flag (high / low / suppressed). HTML body archived to S3 (full-content tier only) with the key in `body_html_archived_url`.
7. **Thread linking.** Each row's `lp_email_thread_id` resolved by `provider_thread_id` (Gmail) or `conversationId` (Microsoft). New thread → new `lp_email_threads` row.
8. **LP resolution.** Sender / recipient emails matched in priority order: exact `lp_contacts.primary_email` → `lp_contacts.additional_emails` → `lp_organizations.domain` for firm-only resolution. Unresolved interactions are still ingested but with null `lp_contact_id`; backfill resolution runs when a new LP is added.
9. **Re-engagement event-driven hot path.** New inbound `lp_interactions` row triggers the re-engagement check synchronously (per Section 8 §8.3 Signal 2): if `days_since_last_gp_outbound >= 45` and meaningful-touch criteria met, set `lp_state.re_engagement_flag=true`, write `lp_signal_log` with `signal_type='re_engagement'`, force pipeline_flag to red+URGENT for 24 hours, generate the urgent draft, surface in Action Drawer. Target latency ≤ 1 hour from inbox arrival to Action Drawer card (§5.1 SLO).
10. **Sync staleness banner.** When `crm_sync_status.health` for a mail/cal source flips to `degraded` (one failed delta poll) or `failing` (three consecutive failures), a banner is surfaced on Today and Lists indicating "sync delayed" with the last-success timestamp (Tomo MVP3 §C.1 explicit requirement).
11. **Calendar event status.** `lp_calendar_events.status` reflects the meeting's actual outcome. A meeting only counts toward Signal 7 / Metric 6a if `status='completed'` (i.e. it took place). Cancellations and reschedules are tracked but distinct.

**Outputs.**

- `lp_interactions` and `lp_calendar_events` rows created.
- `lp_email_threads` rows created/updated.
- `lp_calendar_event_attendees` rows.
- `lp_signal_log` rows for the event-driven hot path.
- `tomo_action_log` row when an urgent draft is generated.
- `crm_sync_status` updates per integration.

**Business rules.**

- BR-3.3.1 — V1 does not ingest beyond 36 months. The user-selectable "six months / future-only" choice in the mock is removed.
- BR-3.3.2 — Bodies are dropped at the 12-month boundary by a daily retention job (`UPDATE lp_interactions SET body_text=NULL, body_html_archived_url=NULL, metadata_only=true WHERE interacted_at < now() - interval '12 months' AND body_text IS NOT NULL`).
- BR-3.3.3 — Webhook delivery latency target ≤ 1 hour for re-engagement events. If the chosen webhook subscription cannot meet this in production, the 30-minute delta-polling fallback covers the gap.
- BR-3.3.4 — Inbound emails to a shared mailbox or alias still ingest if the configured mailbox owner's OAuth grant covers it; per Risk #2 in the V1 Final doc, edge cases (aliases, shared inboxes, BCC) are validated against real GP accounts before signal-engine wiring.
- BR-3.3.5 — Attachments are not stored in V1 (only `attachment_count` is captured). Document engagement is V2.
- BR-3.3.6 — Body-cleansing word-count confidence below the threshold (per §8.9 clarification 9) → suppress the observation rather than compute on dirty data.

**Acceptance criteria.**

- AC-3.3.1 — A 90-day backfill for a mailbox of ~1,000 emails/month completes within 2 minutes for the Day 1 Gap moment.
- AC-3.3.2 — A 36-month backfill for the same mailbox completes within 2 hours and produces metadata-only rows for months 13–36 with `body_text IS NULL` and `metadata_only=true`.
- AC-3.3.3 — An LP inbound email after 60 days of GP silence triggers an Action Drawer card within 1 hour of inbox arrival.
- AC-3.3.4 — Microsoft Graph subscription expiry within 24 hours triggers automatic resubscription with no perceived gap to the user.
- AC-3.3.5 — Sync degradation surfaces a banner on Today and Lists within 5 minutes of the third consecutive failed delta poll.
- AC-3.3.6 — An OOO reply ("I'm out of office until July 8") does not advance `last_meaningful_touch_at` for that LP.
- AC-3.3.7 — A heavily-quoted reply ("Thanks." with 800 words of quoted prior thread) records `word_count_confidence='suppressed'` and does not contribute a reply-length observation to Signal 4.

---

### 3.4. CRM integration (CSV + native CRM read — Affinity or Backstop, whichever ships first)

**Description.** TOMO ingests the GP's existing CRM via two paths in V1: (a) a generic CSV pipeline that handles Affinity, Backstop, Foliometrics, HubSpot, Salesforce export, Sheets, Excel, and any column-mappable CSV; (b) a **native CRM API read-only one-way pull** for **Affinity or Backstop — whichever connector engineering ships first** for the Founding Circle. Clients on the other CRM use CSV until the second connector lands (same V1 release window or fast-follow per capacity). **Bi-directional** sync (SoR write-back) is **not** V1: Affinity write-back is V2 (Appendix H O-1); Backstop write-back is V1.5+ (§9.1). Document A is normative for everything below.

**Inputs / triggers.**

- CSV upload on **onboarding screen 2** (connect; all pipeline cards use the same file-import path in the V1 wizard mock — see §3.2).
- CSV re-upload via Settings → Integrations or Today review queue.
- **Affinity:** API key in **Settings → Integrations** when using the native read path (not captured on onboarding screen 2 in the current eight-screen mock).
- **Backstop:** licensed API credentials (paste and/or OAuth — per integration design doc) when Backstop is the integrated path.
- **Affinity** v1 webhook deliveries on person/organization events (when Affinity is the integrated path).
- **Backstop:** webhook and/or polling-driven incremental updates per vendor contract (when Backstop is the integrated path).

**Processing — generic CSV pipeline (5 phases per Document A).**

1. **Phase 1 — Column mapping.** Parse headers; auto-map against TOMO's known dictionary using fuzzy match (Levenshtein + token-set ratio) against per-CRM dictionaries (Affinity / Backstop / Foliometrics / HubSpot CSV / generic). Surface ambiguous mappings (typically 4–6 per Backstop export) for GP confirmation. Persist mapping policy to `csv_field_mappings` and tag with `source_crm`.
2. **Phase 2 — Deduplication.** Match incoming rows to existing `lp_contacts` using priority ladder: exact `primary_email` → `name + lp_organizations.domain` → fuzzy name + firm match. Ambiguous matches surface in a small review queue (rows in `csv_dedupe_decisions` with `decision='pending'`).
3. **Phase 3 — Field-level conflict resolution (V1 light).** Per-field policy: factual fields (firm, address, phone) → CRM source wins; TOMO-derived fields (signals, behavioural attributes) → TOMO wins; ambiguous fields (tier, stage, mandate fit) → GP decides via review UI. V1 ships text-only review; full Phase 3 conflict-resolution UI is V1.5.
4. **Phase 4 — Ongoing sync.** Re-runs Phases 1–3 with the saved mapping applied automatically. Volumes are smaller (typically 5–20 changed records). GP-initiated re-upload only in V1; scheduled email-attachment ingestion (Pattern B in Document A) is V1.5.
5. **Phase 5 — Provenance display.** Every field write records `source` and `source_external_id`. LP card surfaces provenance on hover (CRM-imported / GP-edited / TOMO-derived / TOMO-computed).

**Processing — native CRM read-only pull (Affinity or Backstop — whichever ships first).**

*Common rules (both CRMs):* **read-only** in V1 — no SoR mutations. Persist to `lp_organizations`, `lp_contacts`, `lp_interactions`, and related tables with `source` in (`affinity_api`, `backstop_api`) and `source_external_id` set.

**Affinity path (when Affinity is the first native connector shipped):**

1. GP pastes Affinity API key (bearer token) in **Settings → Integrations** when using the native read path (or future onboarding API step). The **eight-screen onboarding** mock uses **CSV / Excel** for all pipeline cards, including the Affinity-labelled card (`crmCsvLabel='affinity'`). Token validated by hitting `GET /v2/auth/whoami`. Stored in `oauth_tokens` with `provider='affinity'`.
2. Initial pull: paginated GET against Affinity `Persons`, `Organizations`, `Lists`, `List Entries`, `Interactions` v2 endpoints. Mapped to `lp_organizations`, `lp_contacts`, `lp_interactions`, `lp_email_threads` with `source='affinity_api'` and `source_external_id` set.
3. Webhook subscription: 1 of Affinity's 3 max webhook slots used. Subscribe to `person.updated` and `organization.updated` v1 events. Webhook handler diffs and applies updates with last-write-wins rules.
4. Custom-field provisioning: **not in V1** (would only matter for write-back). The six TOMO fields (`tomo_signal_flag`, `tomo_signal_evidence`, etc.) are not created on the Affinity workspace until V2.
5. Smart fields are read-only in Affinity by design. TOMO can read them and store as additional context on `lp_contacts.notes` or in a JSONB, but does not surface them as TOMO fields in V1.

**Backstop path (when Backstop is the first native connector shipped):**

1. GP completes Backstop credential capture in Settings → Integrations (native API when shipped). V1 onboarding uses **CSV upload** for Backstop-labelled pipeline data on **screen 2**.
2. Initial pull: paginated read against the Backstop entity set that maps to `lp_organizations`, `lp_contacts`, pipeline fields, and interactions, with `source='backstop_api'`.
3. Incremental strategy: webhooks, change feeds, and/or polling per Backstop — specified in the integration design doc; engineering target is parity with the Affinity read path (fresh LP state without SoR writes from TOMO).
4. **No write-back in V1.** Any Backstop field-mapping table for future write-back ships as an empty migration placeholder only if/when product locks Backstop bi-directional (V1.5+), analogous to `affinity_field_mappings`.

**Outputs.**

- `lp_organizations`, `lp_contacts`, `lp_interactions`, `lp_calendar_events` rows from CSV import or native CRM pull.
- `csv_imports`, `csv_field_mappings`, `csv_dedupe_decisions` rows for CSV path.
- `crm_sync_status` updates per source.
- `activity_log` row for `csv_import_completed` and per-record `crm_record_created`/`crm_record_updated`.

**Business rules.**

- BR-3.4.1 — Auto-mapping policy persists per-source-CRM per-workspace; re-imports apply silently with a confirmation banner ("Using same mapping as last time").
- BR-3.4.2 — TOMO is not a CRM replacement (per Document A "Strategic positioning"); the source CRM remains the system of record for compliance fields. TOMO does not enforce field-format parity.
- BR-3.4.3 — **SoR write-back** for native CRM connectors is **not** in V1. The schema (`affinity_field_mappings`) exists in V1 migration as a V2 placeholder for Affinity.
- BR-3.4.4 — `prior_fund_investor` and `prior_fund_identifier` are captured during CSV import via either a column-mapping for prior-fund tagging (if the GP's CSV has this column) or a post-import tagging step (if not). Re-up cohort filterability from day one is non-negotiable per Section 8 §8.4.
- BR-3.4.5 — `expected_commitment_amount` is not auto-imported from CSV (the data is rarely present). It is captured via the post-meeting capture flow or LP card chat.

**Acceptance criteria.**

- AC-3.4.1 — A Backstop export of 300 LPs maps cleanly with ≤ 6 ambiguous columns surfaced for GP review and imports within 2 minutes.
- AC-3.4.2 — Re-uploading the same Backstop export 30 days later applies the saved mapping automatically and surfaces only the 5–20 changed records.
- AC-3.4.3 — When **Affinity** is the shipped native connector: an FC GP entering a valid Affinity API key in **Settings → Integrations** sees their full pipeline (Persons + Organizations + Lists + Interactions) populated within 5 minutes.
- AC-3.4.3b — When **Backstop** is the shipped native connector: an FC GP completing Backstop credential capture sees the equivalent pipeline entities populated within the **same-order SLO as AC-3.4.3** (target ≤ 5 minutes at FC scale).
- AC-3.4.4 — **Affinity:** a webhook delivery for `person.updated` reflects the change in TOMO within 60 seconds of receipt.
- AC-3.4.4b — **Backstop:** an incremental update reflects the CRM-side change in TOMO within **60 seconds** of receipt when webhooks apply; otherwise within **one polling interval** (document the interval in the integration design doc).
- AC-3.4.5 — A duplicate row in a CSV (matching an existing TOMO contact by email) surfaces in `csv_dedupe_decisions` for GP review and does not auto-merge.
- AC-3.4.6 — An LP card displays provenance on hover ("Imported from Backstop CSV · 3 Apr · GP-edited tier on 14 Apr").

---

### 3.5. Signals engine

**Description.** Computes the nine V1 surfaced signals plus three captured attributes plus two combined captures (warm_ghost, close_proximity) per Section 8. Section 8 is **normative** for definitions, computation, thresholds, and the pipeline-flag algorithm. This subsection specifies the V1 engineering scope and references Section 8 paragraphs.

**Inputs / triggers.**

- Nightly batch run at 02:00 workspace-local time. Runs in dependency order: foundational definitions → silence → reply velocity → reply length → reply initiation → stage stagnation → calendar friction → CC expansion → one-way → warm_ghost capture → close_proximity capture → flag computation → flag-transition log → daily snapshot.
- Event-driven hot path on every new inbound `lp_interactions` row for the re-engagement signal (Signal 2) only.
- Stage transition event (`lp_stage_transitions` row inserted) recomputes `lp_state.days_in_current_stage` and `days_in_prior_stage` immediately.

**Processing.**

1. **Foundational definitions** — Meaningful Touch, Pipeline stage, Direction. Section 8 §8.2 normative.
2. **Signal 1 — Silence.** Section 8 §8.3 normative. Writes `lp_state.last_meaningful_touch_at`, `days_since_meaningful_touch`. Reads `stage_cadence_benchmarks` per stage.
3. **Signal 2 — Re-engagement after silence.** Event-driven, **not nightly**. On every new inbound `lp_interactions` row: if days since last GP outbound to this LP ≥ 45 and meaningful-touch criteria met → set `lp_state.re_engagement_flag=true`, append `lp_signal_log` row with `signal_type='re_engagement'`, force pipeline flag to red+URGENT for 24 hours, generate urgent draft via the action-drawer pipeline.
4. **Signal 3 — Reply velocity trend.** Nightly batch. Suppress when LP has fewer than 5 prior exchanges. Writes `lp_state.reply_velocity_trend`, `reply_velocity_latency_hrs_recent`, `reply_velocity_baseline_hrs`. Section 8 §8.3 normative.
5. **Signal 4 — Reply length trend.** Nightly batch. Suppress when fewer than 3 prior replies or word-count confidence is low. Writes `lp_state.reply_length_trend`, `reply_length_words_recent`, `reply_length_baseline_words`, `reply_length_drop_pct`.
6. **Signal 5 — Reply initiation.** Nightly batch. Strict definition (LP sends with no preceding GP outbound to this LP within 14 days). Writes `lp_state.lp_initiation_count_last_5`, `lp_initiation_ratio`, `last_lp_initiated_at`.
7. **Signal 6 — Stage stagnation.** Nightly batch. Reads `lp_stage_transitions` window function. Writes `lp_state.days_in_current_stage`, `days_in_prior_stage`, `prior_stage_name`, `stage_stagnation_flag`.
8. **Signal 7 — Calendar friction.** Nightly batch. Reads `lp_calendar_events`. Writes `lp_state.calendar_friction_trend`, `calendar_accept_latency_hrs_recent`, `calendar_reschedule_count_last_3`.
9. **Signal 8 — CC expansion.** Nightly batch. Reads `lp_email_threads.participant_emails`. Writes `lp_state.cc_expansion`, `cc_expansion_detected_at`, `cc_expansion_new_contacts`. Triggers GP profile-update prompt in Action Drawer.
10. **Signal 9 — One-way contact.** Nightly batch. Writes `lp_state.last_contact_was_one_way`, `last_outbound_no_reply_sent_at`. 14-day window per §8.3.
11. **Captured attributes.** `mandate_fit` (post-meeting capture chip), `prior_fund_investor` (CSV import / GP-tagged), `days_in_prior_stage` (derived in Signal 6).
12. **Combined captures.** `warm_ghost_flag`, `close_proximity_flag` written to `lp_state` per §8.5. Not surfaced in V1; used as silence override and Section 8 §8.7 algorithm input.
13. **Pipeline flag.** Computed per the locked algorithm in Section 8 §8.7. Result written to `lp_state.pipeline_flag` and `pipeline_flag_reason`. Every transition writes a `lp_signal_log` row with `signal_type='flag_transition'` and metadata `{from_flag, to_flag, reason}`. Required for Metric 9b (cooling caught).
14. **Daily snapshot.** After all signals computed and flags assigned, append a row to `daily_pipeline_summary`. Required for Metrics 2, 9a, 9b sparkline / trend.
15. **Append-only discipline.** Every signal observation writes a new `lp_signal_log` row. Never overwrite, never truncate (per §8.10 V3 dataset principle).

**Outputs.**

- `lp_state` row updated for every active LP.
- `lp_signal_log` rows appended (often 5–10 per LP per night, plus event-driven re-engagement and flag transitions).
- `daily_pipeline_summary` row appended once per workspace per day.
- Action Drawer items generated for amber/red flag breaches and re-engagement events.

**Business rules.**

- BR-3.5.1 — Section 8 is the normative source. Where this SRS appears to differ, Section 8 wins until this SRS is updated.
- BR-3.5.2 — Append-only on `lp_signal_log`, `lp_stage_transitions`, `daily_pipeline_summary`. No overwrites, no truncations, ever.
- BR-3.5.3 — Re-engagement (Signal 2) cannot be batched (per §8.9 clarification 2). If webhook latency exceeds 1 hour, the 30-min polling fallback (§3.3) compensates.
- BR-3.5.4 — Trend signals (3, 4) suppress below their respective sample-size thresholds (5 / 3) rather than computing on noise (§8.9 clarification 5).
- BR-3.5.5 — Reply-length confidence flag suppresses observation when body-cleansing produces dirty content (§8.9 clarification 9).
- BR-3.5.6 — `mandate_fit` is captured GP-confirmed only — TOMO never imputes from email content in V1.
- BR-3.5.7 — Stage thresholds use the `stage_cadence_benchmarks` table; per-fund overrides are V2.
- BR-3.5.8 — **Off-channel suppression.** When `lp_state.off_channel_active_until` is **strictly after** the nightly batch as-of timestamp, the batch **does not** append `lp_signal_log` rows for Signal **1** (Silence), **6** (Stage stagnation), or **9** (One-way contact) for that LP on that run, and **does not** include that LP in the Radar Modal **Gone quiet** cohort or in **Cooling off** rows whose **sole** basis would be silence-class absence (directional deceleration rows from Signals 3 / 4 / 5 / 7 / 8 still emit normally). Re-engagement (Signal 2) is **not** suppressed.
- BR-3.5.9 — **Off-channel window.** Tapping *I'm in touch off-channel* on the LP record (§3.10) sets `off_channel_active_until = now() + interval '30 days'` (workspace-local `now`). Extend resets the 30-day window from the tap instant; Clear sets `off_channel_active_until = null`. Each set, extend, or clear appends one `lp_signal_log` row with `signal_type='off_channel_marked'` and `signal_value_jsonb` including `{action, prior_until, new_until, gp_user_id}`.
- BR-3.5.10 — **Pipeline flag vs off-channel.** While `off_channel_active_until` is in the future, Section 8 §8.7 **must not** assign amber/red **solely** from silence-derived inputs for that LP. Positive-direction overrides and re-engagement **urgent red** remain in effect. When suppression prevents an otherwise-applicable silence-derived flag, `pipeline_flag_reason` **includes** the token `off_channel_suppressed`.
- BR-3.5.11 — **`pipeline_flag='red'` semantics.** Red is **intentionally overloaded**: it may mean (a) negative drift / breach **or** (b) re-engagement **urgent** surfacing (Signal 2). Renderers and operators **must** interpret red via `pipeline_flag_reason`, `lp_state.re_engagement_flag`, and recent `lp_signal_log` rows — never assume red ≡ drift.
- BR-3.5.12 — **Moveable warming predicate.** For Metric 3 and the `MOVEABLE(lp)` partition (Section 9 Today supplement), the EXISTS “directional warming” clause is satisfied **only** when `lp_signal_log` contains at least one row in the **last 30 days** with `is_directional=true` and `signal_type IN ('reply_velocity','reply_length','reply_initiation','calendar_friction')` whose `signal_value_jsonb` is classified as **warming** per Section 8 §8.3 for that signal (e.g. accelerating velocity, lengthening replies, improving initiation, improving calendar friction). Rows of types `silence`, `stage_stagnation`, `one_way_contact`, `re_engagement`, `cc_expansion`, `warm_ghost_capture`, `close_proximity_capture`, `flag_transition`, `override_applied`, and `off_channel_marked` **do not** satisfy this predicate **by themselves**.

**Acceptance criteria.**

- AC-3.5.1 — Nightly batch for a workspace with 500 active LPs completes within 5 minutes.
- AC-3.5.2 — A re-engagement event (LP inbound after 60 days silence) results in an Action Drawer card and a forced-red pipeline flag within 1 hour of email arrival.
- AC-3.5.3 — Every pipeline_flag change writes both an updated `lp_state` row and a new `lp_signal_log` row with `signal_type='flag_transition'`.
- AC-3.5.4 — An LP whose `reply_length_words_recent` dropped from 187 to 31 over three replies (per §8.3 Signal 4 example) shows the relevant LP card narrative line.
- AC-3.5.5 — An LP with `cc_expansion=true` triggers a profile-update prompt in the Action Drawer with the new contact email pre-filled.
- AC-3.5.6 — An LP whose recent activity satisfies any positive-direction signal in the last 14 days has `lp_state.pipeline_flag='green'` regardless of `days_since_meaningful_touch` (Section 8 §8.7 override).
- AC-3.5.7 — `lp_signal_log` entries for the workspace persist indefinitely; a query for signals from 18 months ago returns rows.
- AC-3.5.8 — An LP with `off_channel_active_until` **10 days in the future** and **70** days since last meaningful touch receives **no** new `lp_signal_log` rows of types `silence` or `stage_stagnation` on the nightly batch run and **does not** appear in the Radar Modal **Gone quiet** section for that run.
- AC-3.5.9 — An LP with `off_channel_active_until` **10 days in the future** whose pipeline flag **would** have been `red` **purely** from silence-derived inputs is evaluated to `green` (or `amber` if independent directional cooling signals justify amber), and `pipeline_flag_reason` **includes** `off_channel_suppressed` when silence-derived red was suppressed.
- AC-3.5.10 — An LP with `off_channel_active_until` **10 days in the future** who sends qualifying inbound email after **60** days of GP-side silence **still** triggers Signal 2 (re-engagement) on the event-driven path — off-channel suppression **does not** block re-engagement.

---

### 3.6. Metrics engine and Insights page

**Description.** Computes the ten V1 metrics per Section 9 and renders them on the Insights page. Section 9 is **normative** for definitions, computation, refresh cadences, and schema requirements. Three new schema items (`expected_commitment_amount`, `tomo_action_log`, `daily_pipeline_summary`) are present in §6 and feed this section.

**Inputs / triggers.**

- Nightly batch run, after the signals engine completes (§3.5). Computes Metrics 1–10 in dependency order.
- Event-driven recomputation for: pipeline-stage transitions (Metrics 1, 3, 7), `expected_commitment_amount` changes (Metrics 1, 3, 4, 10), `tomo_action_log` outcome updates (Metrics 5, 6b).

**Processing.** Per Section 9 §9.3, each metric:

| # | Metric | Cadence | Schema dependency |
|---|---|---|---|
| 1 | Capital vs target progress bar | Nightly + on stage transition + on `expected_commitment_amount` change | `funds.raise_target`, `lp_contacts.expected_commitment_amount` |
| 2 | Day 1 Gap, closing | Nightly | `daily_pipeline_summary.day_1_gap_count`, baseline at onboarding |
| 3 | Moveability count | Nightly | §3.5 outputs + `expected_commitment_amount` |
| 4 | LP concentration risk alert | Nightly + on `expected_commitment_amount` change | `funds.raise_target`, `lp_contacts.expected_commitment_amount` |
| 5 | Time Recovered | Nightly (rolling 7d / 30d / cumulative) | `tomo_action_log` |
| 6a | Follow-up compliance rate | Nightly + onboarding baseline | calendar + email sync |
| 6b | Draft approval rate | Nightly (rolling 30d / 60d) | `tomo_action_log` |
| 6c | Scheduling efficiency | Nightly + onboarding baseline | scheduling assistant instrumentation + scheduling-intent pattern library |
| 7 | Direction with mandate qualifier | Nightly | `lp_signal_log` directional + `mandate_fit` |
| 8 | Fat Middle ratio | Nightly | `lp_interactions` meaningful-touch (6 month lookback) |
| 9a | Pipeline velocity + sparkline | Nightly + weekly snapshot | `daily_pipeline_summary` weekly samples |
| 9b | Cooling caught | Nightly | `lp_signal_log` flag_transition entries |
| 10 | Focus list (formerly 60-Day Close List) | Nightly | Section 9 ranking formula §9.3 Metric 10 |

**Insights page rendering.**

- **Section 1 — Where your raise stands (snapshot).** Capital vs Target hero bar; Day 1 Gap two-up left (with 30-day sparkline); Moveability count two-up right (with re-up and active-diligence breakdown); optional Concentration alert banner above the two-up.
- **Section 2 — Momentum (LP behaviour and priority).** Direction summary with mandate-fit qualifier (Metric 7); Pipeline velocity with 8-week sparkline (Metric 9a); **Focus list** — top **10** LPs from the Moveable cohort ranked by Metric 10 score (Metric 10 rename; cap/shrink per BR-3.6.10).
- **Section 3 — What TOMO has done (receipts).** Time Recovered hero block (Metric 5); Execution Health three-cell row (Metrics 6a / 6b / 6c).
- **Deferred surface (V1.5) — still computed in V1:** Metric **9b** (*Cooling caught*) continues to append `lp_signal_log` `flag_transition` inputs nightly but **does not** ship a dedicated Insights block in V1 (see §9.1).
- "How is this calculated?" inline link below each metric opens a help drawer with the formula in plain language.
- "Last updated: today at 2:04am · Next update tonight at 2:00am" header banner.

**Outputs.**

- `daily_pipeline_summary` row appended (driven by §3.5 daily snapshot).
- API responses to `GET /api/insights/{capital,day1gap,moveability,concentration,time-recovered,exec-health,momentum,close-list}` rendering the Insights page (`close-list` route name MAY alias **focus-list** in implementation).

**Business rules.**

- BR-3.6.1 — `tomo_action_log` instrumentation is a **hard V1 dependency** (Section 9 §9.4 schema addition 2). All actions in the Action Drawer, scheduling threads, follow-up reminders, and meeting prep must write to the log from day one of V1 ship.
- BR-3.6.2 — Pre-TOMO baselines for Metrics 6a, 6c, 9a are computed once at onboarding completion against the 90-day pre-onboarding email + calendar history. Stored on the workspace record. Never recomputed.
- BR-3.6.3 — Day 1 Gap baseline is captured once at onboarding completion. The "down N from M at onboarding" annotation reads from the baseline; `current_gap_count` is the live nightly snapshot.
- BR-3.6.4 — `daily_pipeline_summary` is append-only. No row is ever updated or deleted.
- BR-3.6.5 — Concentration threshold hardcoded at 20% in V1; per-fund configurable in V1.5.
- BR-3.6.6 — Per-action time benchmarks (drafts 8m / scheduling 12m / follow-ups 10m / meeting prep 15m) per Appendix H O-2; recalibrate after FC Month 1.
- BR-3.6.7 — Draft edit-level threshold 30% character change (per O-3); below = `approved_with_edits`, at-or-above = `edited_substantially`.
- BR-3.6.8 — Recalibration nudge fires when `draft_approval_rate_30d < 0.50`.
- BR-3.6.9 — Fat Middle **ratio** zones for Metric 8 remain hardcoded 0–30 / 30–60 / 60–100 in V1. **Insights does not render a Fat Middle gauge in V1**; the actionable cohort is the **Quiet — Fat Middle** named filter on Relationships / Lists (§3.11) with the Three-Touch Qualification CTA unchanged.
- BR-3.6.10 — **Focus list (Metric 10)** returns at most **10** `lp_contact` rows from the Moveable cohort ranked by the §9.3 Metric 10 score; if the Moveable cohort has **fewer than 10** members, the list length **shrinks** to match; if the cohort is **empty**, the UI shows the prescribed empty state copy ("No LPs are in the moveable cohort yet — check back as signals develop") instead of a blank list.

**Acceptance criteria.**

- AC-3.6.1 — Insights page loads within 2 seconds for a workspace with 500 LPs (per §5.1 SLO).
- AC-3.6.2 — A workspace with no `funds.raise_target` set sees the top-half rendered with a "set raise target" prompt instead of the hero bar.
- AC-3.6.3 — A workspace with no `tomo_action_log` rows yet (first 24 hours after onboarding) shows Time Recovered as "Just getting started — first signals overnight" rather than 0 hours.
- AC-3.6.4 — A workspace running for 8+ weeks shows a complete pipeline-velocity sparkline; a workspace running for 3 weeks shows only the 3 weekly samples it has.
- AC-3.6.5 — A draft edited at 22% character change is classified `approved_with_edits` and counts toward Metric 6b approval rate.
- AC-3.6.6 — Concentration alert fires for a workspace where one LP's `expected_commitment_amount` is 25% of `(raise_target - committed_sum)` and is hidden when the largest concentration is below 20%.
- AC-3.6.7 — A click-through on Day 1 Gap opens the Relationships page filtered to the same N LPs that compose the count.
- AC-3.6.8 — The Insights page renders **three** titled sections in order: **Where your raise stands**, **Momentum**, **What TOMO has done**, matching §3.6 prose; the **Focus list** (Metric 10) shows **at most 10** ranked Moveable LPs and uses the empty-state copy prescribed in BR-3.6.10 when the Moveable cohort is empty.

---

### 3.7. Reminders engine

**Description.** Three reminder classes per Section 7.3 N-series and §3.7: open loops, missed replies, and commitments. Each writes to the unified `reminders` table and surfaces in the Action Drawer or attention queue. Tier-aware thresholds for missed replies (T1 = 48 business hours; T2/T3/unset = 5 days; per N-series R2). Snooze and resolve flows. Owner-routed.

**Inputs / triggers.**

- Outbound `lp_interactions` rows scanned for commitment language (R1 detection).
- Inbound `lp_interactions` rows that are not subsequently replied to within tier threshold (R2 detection).
- Meeting recaps (`lp_meeting_recaps.action_items_jsonb`) and email scans for commitment language (R3 detection).
- Reminder due-time clock fires hourly.

**Processing.**

1. **R1 — Open Loops.**
   - Detection: outbound emails to LP scanned at ingest using a commitment-language pattern library V1 (LLM classification deferred to V2). Patterns: "I'll send / I'll share / I'll get back to you / I'll introduce / I'll follow up / let me get / let me check / let me find out".
   - On match: `open_loops` row inserted with `confidence` (high/medium/low) per pattern strength.
   - Fulfilment: subsequent outbound to same LP within 14 days containing reference to committed item (per N-series R1) marks the open loop fulfilled. Reference-detection in V1 uses the same pattern library plus simple keyword overlap; LLM classification on outbound to mark fulfilled is V2.
   - At 7 days unfulfilled: insert `reminders` row with `reminder_type='open_loop'`, `assigned_user_id=lp_contacts.relationship_owner_user_id`, due in 24 hours.
2. **R2 — Missed Replies.**
   - Detection: every inbound `lp_interactions` from an LP starts a reply clock.
   - Tier-aware threshold lookup from `lp_contacts.tier`: T1 = 48 hours business hours (9am–6pm local weekdays); T2/T3/unset = 5 calendar days.
   - On threshold breach without an outbound from any GP team member: insert `reminders` row with `reminder_type='missed_reply'`, route to `lp_contacts.relationship_owner_user_id`. If `relationship_owner_user_id` is null, route to `workspaces.owner_user_id`.
3. **R3 — Commitments.**
   - Source: meeting recaps (`lp_meeting_recaps.action_items_jsonb`) and email scans (using the same pattern library as R1 but classifying the *target* commitment).
   - Conservative V1 bar (per N-series R3): only high-confidence commitments auto-create `commitments` rows. Medium / low surface in the post-meeting capture flow for GP confirmation.
   - On confirmation: `commitments.status='open'`, due-date set if specified or null. Reminder fires 1 day before `due_at` (when present).
4. **Snooze.** GP can snooze a reminder to a specific time; `reminders.snoozed_until` set, status flips to `snoozed`. At `snoozed_until`, status flips back to `pending` and re-surfaces.
5. **Auto-resolve.** Open loops auto-resolve when fulfilling outbound is detected. Missed replies auto-resolve when an outbound to the LP is sent. Commitments auto-resolve when fulfilling outbound is detected.
6. **Mark-resolved manually.** GP can mark any reminder resolved with optional notes; writes `resolved_at`, `resolution_evidence_jsonb`.
7. **Owner routing.** Each reminder is assigned to a single workspace member (`assigned_user_id`). UI filters by assignee on Today and Settings → Notifications respect assignee.

**Outputs.**

- `reminders` rows per detection.
- `commitments` and `open_loops` source rows.
- `tomo_action_log` rows when reminders surface as Action Drawer cards (`action_type='open_loop'` or `'missed_reply'`).
- Notifications via configured channels (§3.18).

**Business rules.**

- BR-3.7.1 — V1 commitment-language detection is pattern-library based, not LLM-based. False positives accepted; LLM classification is V2.
- BR-3.7.2 — Tier defaults: T1 if `lp_contacts.tier='tier_1'`, otherwise the unset/T2/T3 threshold applies.
- BR-3.7.3 — Business hours for T1 missed-reply threshold use the LP's primary contact timezone if known, otherwise the workspace primary timezone.
- BR-3.7.4 — Snooze options: 1 hour, 4 hours, tomorrow, next Monday, custom datetime.
- BR-3.7.5 — A reminder for an LP whose `pipeline_stage='closed_lost'` is auto-dismissed.

**Acceptance criteria.**

- AC-3.7.1 — An outbound containing "I'll send the deck Monday" creates an `open_loops` row with `confidence='high'`.
- AC-3.7.2 — A T1 LP whose inbound at 10:00 Monday remains unanswered at 10:00 Wednesday (48 business hours) shows a missed-reply reminder routed to the relationship owner.
- AC-3.7.3 — A T2 LP whose inbound on Monday remains unanswered at the following Saturday (5 days later) shows a missed-reply reminder.
- AC-3.7.4 — An open loop unfulfilled after 7 days surfaces an Action Drawer card.
- AC-3.7.5 — Manually marking a reminder resolved writes `resolved_at` and removes it from the attention queue without auto-resurfacing.

---

### 3.8. Today / Daily Brief

**Description.** Today (`/home`) is the GP's daily landing surface. Greeting, inline Tomo chat, "What needs your attention" (action queue), "Coming up" (commitments + meetings), "On my radar" (signal callouts), and a **unified Daily Brief + On my radar modal** (the **Radar Modal**, IA per **Appendix I**) that auto-opens on first daily login. The same brief is delivered via email and Slack at the user's configured time. Visual reference: `design/tomo_radar_modal_v1.html` in `tomo_crm`.

**Inputs / triggers.**

- User loads `/home`.
- Daily-brief delivery scheduler fires at `user_preferences.daily_brief_send_at_local`.
- First load of the day triggers the auto-open modal logic (compared against `user_preferences.last_daily_brief_seen_local_date`).

**Processing.**

1. **Today page sections.**
   - Greeting: time-of-day-aware, personalised first name only (e.g. *Good morning, Geoffrey*) — **no** appended intelligence sentence in the header; relationship narrative lives in the **Radar Modal** summary and section rows.
   - Inline Tomo chat: pre-loaded with today's context (active actions count, today's meetings, pending approvals). Chat is open by default per `user_preferences.tomo_chat_default_open`.
   - **What needs your attention** (action queue): rendered from `tomo_action_log` rows with `outcome IS NULL` plus `reminders` rows with `status='pending'`. Sorted by priority (re-engagement urgent → red flag → amber flag → tier 1 missed reply → other reminders → drafts awaiting approval). Capped at "today" — older items collapse into a "Previous (N)" control per the user-story template §38.
   - **Coming up**: today's calendar events with LP attendees + commitments due today/tomorrow. Selecting a row opens the **meeting prep drawer** (see §3.9 meeting prep layout; visual reference `design/tomo_drawer_meetingprep_light_v3.html`).
   - **Where the raise stands** (summary card under Coming up): four mutually exclusive counts over **active** LPs (`pipeline_stage` not in terminal closed / pass states). Definitions match Section 9 (Metric 3 + `pipeline_flag` partition); see **Section 9 — Today page supplement** immediately after Metric 3. **Presentation labels:** *Drifting — act*, *Stalling — watch* (amber, not Moveable), *Moveable*, *Healthy — on track*. The section heading and each bucket label expose a **hover hint** with concise copy aligned to the partition rules (show delay ≤300ms; not browser-native `title` tooltips). The headline **Insights →** control links to `/insights`. Each of the **four counts** is independently tappable and deep-links to Relationships with the **named / URL-addressable** filter state for that bucket (AC-3.8.8). Data may be computed on read from `lp_contacts` + `lp_state` + signal log, or materialised on `daily_pipeline_summary` (optional columns below).
   - **On my radar** (entry control + modal): intelligence is surfaced in the **Radar Modal** (narrative summary + collapsible sections per Appendix I), not as inline sentences in the Today header. **Gone quiet** and **Cooling off** row generation respects `lp_state.off_channel_active_until` per BR-3.5.8.
2. **Radar Modal (Daily Brief + On my radar).**
   - Trigger: first page load of the local day (compared against the per-user `last_daily_brief_seen_local_date`).
   - **Normative section taxonomy** (order, default collapsed state, CTA dictionary): **Appendix I — Radar Modal IA (v1)**.
   - Header: eyebrow (*Daily Brief · {date}*), title *On my radar*, narrative summary paragraph, computation stamp (e.g. time computed, lookback window, item count). Optional radar glyph per design system.
   - Body: collapsible sections with evidence-rich rows (tier rail, tags, optional primary/secondary CTAs routing to Action Drawer / commitments / drafts per Appendix I).
   - Footer: channel delivery summary line; **Brief settings** navigates to notification/delivery preferences; **Done** dismisses. User can dismiss via Esc or veil; dismissal does not affect tomorrow's auto-open.
   - **Badge count** (shown next to the entry-point control): count of **navigable / actionable** radar rows across sections for that day (implementation must use one normative rule — see Appendix I).
3. **Daily Brief delivery (email + Slack).**
   - At `user_preferences.daily_brief_send_at_local`, the worker assembles the brief and delivers via configured channels (`user_preferences.daily_brief_channels`).
   - **Email:** HTML via Postmark/SES. **V1:** email uses the **same section taxonomy** as the in-app Radar Modal, optionally shortened (fewer rows per section) for readability; section headings align with Appendix I. Legacy four-theme digest (meetings / urgent / compliance / signals only) is **superseded** for normative structure.
   - **Slack:** a single `chat.postMessage` (or DM) with **section blocks** mirroring Appendix I headings; threading optional per Appendix H O-7.

**Outputs.**

- `tomo_action_log` rows updated when the GP acts in the action queue.
- `email_delivery_log` row per email send.
- Slack message id captured in `email_delivery_log.metadata_jsonb` for debugging (Slack delivery is not logged in `email_delivery_log` directly; a parallel slack_delivery_log could be added in V1.5 if needed — for V1, Slack delivery telemetry lives in `activity_log`).
- `activity_log` row for `daily_brief_sent` per channel.

**Business rules.**

- BR-3.8.1 — Auto-open is local-day-based, not session-based; once seen on a local day, does not re-open even if the user logs out and back in.
- BR-3.8.2 — Slack delivery requires a connected workspace (`slack_workspace_connections` row not revoked) and a user opt-in (`user_preferences.daily_brief_channels` includes 'slack').
- BR-3.8.3 — If both email and Slack are enabled, both are delivered; no de-duplication.
- BR-3.8.4 — Empty-state attention queue surfaces a "Nothing pressing today" state with a link to Lists.
- BR-3.8.5 — **Where the raise stands** counts use the same normative definitions as Section 9 (Metric 3 for the **Moveable** bucket; `lp_state.pipeline_flag` for G/A/R-derived buckets). **Presentation names:** *Stalling — watch* (not "cooling — watch") disambiguates the Today bucket from Radar **Cooling off**. The four buckets are mutually exclusive and sum to the **Today tile cohort** of LPs (non-terminal raise stages per Section 9 Today supplement — production default excludes `pass`, `closed_lost`, and `committed` from *work left*; the mock uses CRM labels **Closed** and **Pass** only).
- BR-3.8.6 — Radar Modal section titles, collapse defaults, and CTA labels match **Appendix I** unless an explicit **[OPEN]** issue records a product exception.
- BR-3.8.7 — **Where the raise stands** hover hints on Today use the normative copy in **Section 9 — Today page supplement (hover hints)**; hints appear within **300ms** of pointer hover (or keyboard focus) on the section heading or a bucket label.

**Acceptance criteria.**

- AC-3.8.1 — A GP loading Today for the first time today sees the Radar Modal (Daily Brief + On my radar) auto-open within 500ms.
- AC-3.8.2 — The same GP reloading Today later in the same local day does not see the modal auto-open.
- AC-3.8.3 — A GP with Slack connected and `daily_brief_channels=['in_app','email','slack']` receives the brief in their Slack DM at 07:30 local.
- AC-3.8.4 — The Today action queue caps at the day's items by default; "Previous (3)" collapsed control surfaces 3 deferred items when expanded.
- AC-3.8.5 — Inline Tomo chat receives `todayContext` (actions, commitments, **Radar Modal payload**, **raise-stands counts**) and returns answers consistent with what's rendered on the page.
- AC-3.8.6 — The **Where the raise stands** card on Today shows four counts (**Moveable**, **Healthy — on track**, **Stalling — watch**, **Drifting — act**) that partition active pipeline LPs per Section 9 Today supplement; the headline **Insights →** control navigates to the Insights page.
- AC-3.8.7 — The in-app Radar Modal implements the section taxonomy and defaults in **Appendix I** (including footer **Brief settings** and **Done**).
- AC-3.8.8 — Each of the four bucket counts on **Where the raise stands** is independently tappable: **Drifting — act** → Relationships cohort `pipeline_flag='red'` among active LPs; **Stalling — watch** → `pipeline_flag='amber'` AND NOT `MOVEABLE(lp)`; **Moveable** → full Moveable predicate; **Healthy — on track** → `pipeline_flag='green'` AND NOT `MOVEABLE(lp)`. Each filter SHALL be a **named filter and/or URL-addressable** Relationships state (see §3.11 combinator).
- AC-3.8.9 — Hovering (or focusing) the **Where the raise stands** heading or any bucket label shows the corresponding hint from Section 9 within **300ms**; hint text matches the normative partition definitions for that bucket.

---

### 3.9. Action Drawer and draft approvals

**Description.** The right-hand panel (or modal on mobile) where TOMO surfaces drafts, capture prompts, scheduling replies, follow-up reminders, meeting-prep briefs, and single-moment AI-assisted flows for GP review and action. Human-in-the-loop on every outbound. Edit-level classification per O-3 drives Metric 6b. Warm Intro Tracker, DDQ Response Engine, and Re-engagement Response are named Action Drawer flows in V1, not Workflows-surface playbooks.

**Inputs / triggers.**

- New row in `tomo_action_log` with `outcome IS NULL` (a generated action awaiting GP).
- Per-LP context (last 5 interactions, last meeting recap, signal state, active reminders) loaded when the drawer opens for a specific LP.

**Processing.**

1. **Drawer cards.** Each card represents one `tomo_action_log` row. Card types:
   - `draft` — a generated email draft (follow-up, scheduling response, themed outreach, trip outreach).
   - `warm_intro` — detected introduction email; GP confirms whether to add / update the LP record and draft a reply.
   - `ddq_response` — detected DDQ-like inbound; GP triggers a draft response using the GP-curated prior DDQ store.
   - `re_engagement_response` — Signal 2 urgent reply draft after an LP inbound following 45+ days of GP silence.
   - `scheduling_thread` — scheduling-intent reply with proposed times and, where needed, follow-up context.
   - `open_loop` — a fulfilment prompt for a tracked open loop.
   - `missed_reply` — a draft reply for a missed-reply reminder.
   - `meeting_prep` — a prep brief generated ahead of a meeting (§3.13).
   - `tier_correction` — a prompt to correct LP tier based on observed behaviour.
   - `mandate_fit_capture` — the post-meeting mandate-fit chip selection.
   - `post_meeting_note` — the post-meeting capture form (§3.13).
   - `workflow_step_send` — an outbound draft step in an active workflow run, including F7 and configurable outreach templates.
2. **Draft approval flow.**
   - Draft rendered editable in the drawer.
   - GP can: approve unchanged, approve with edits, edit substantially, dismiss, or snooze.
   - On approve: TOMO sends the email via the user's connected mailbox (Microsoft Graph `sendMail` / Gmail API `users.messages.send`), writes `email_delivery_log`, updates `tomo_action_log.outcome` and `actioned_at`, computes `character_change_pct` against the original draft.
   - Edit-level classification: `< 30%` → `approved_with_edits`; `>= 30%` → `edited_substantially`.
3. **Tone calibration usage.** Every draft uses the GP's `tone_profiles.prompt_excerpt` as a few-shot prompt prefix.
4. **Scheduling thread context.** When the action is a scheduling response, the drawer surfaces the thread, the GP's available calendar slots (read from connected calendar), and the proposed times in the draft.
5. **Owner routing.** Cards inherit `assigned_user_id` from the underlying reminder or LP `relationship_owner_user_id`. A workspace member sees only their own cards by default; "Show team" toggle shows everyone's.
6. **Success state.** After approve+send, the card collapses into a single confirmation line ("Sent to Frank · 2 min ago"), counted in Time Recovered (Metric 5).
7. **Confirmation gate.** Every mutation (send draft, update CRM, mark resolved) requires explicit GP confirmation. No auto-send, ever (per §1.2).
8. **Named single-moment flows.**
   - **Warm Intro Tracker:** inbound email parsing detects an introduction where the GP is included alongside other parties. The drawer asks whether to add / update the LP pipeline entry and draft a reply. Outcome capture is the binary GP decision plus any confirmed CRM mutation.
   - **DDQ Response Engine:** inbound classification detects a DDQ-like request. The drawer offers to draft a response using the GP-curated prior DDQ store. V1 light is retrieval from curated prior answers, not full RAG.
   - **Re-engagement Response:** Signal 2 fires within 1 hour of qualifying inbound. The drawer surfaces an urgent reply draft; if no LP response follows the GP's reply within the missed-reply threshold, the generic reminders engine handles the nudge.
9. **Scheduling assistant capability (§3.9.x).** Scheduling is a cross-cutting Action Drawer capability, not a Workflows-surface entry. Invocation points: inbound email with scheduling intent; Post-Meeting Execution follow-up drafts that propose a next touch; Re-engagement Response drafts that propose a meeting; Trip Orchestrator replies where the trip date window constrains availability. Processing: classify scheduling intent, query Microsoft Graph / Google Calendar availability, propose three time blocks with timezone handling and an optional date-window constraint, inject the proposed times into a tone-profile-aware draft, and log the outcome for Metric 6c.
10. **Meeting prep drawer (Today — Coming up).** When the GP opens a **Coming up** commitment or calendar-backed meeting row on Today, the context drawer SHALL support the **meeting prep layout** (normative visual reference: `design/tomo_drawer_meetingprep_light_v3.html` in `tomo_crm`). The layout includes: header (meeting-type eyebrow, LP / contact title, relationship subtitle, Esc); **time strip** (scheduled range, location e.g. video link, open-in-calendar, join-meeting when available); **status pills** and contextual quick links (LP record, latest email / intro thread); a configurable narrative block (e.g. *What changed since you last spoke* vs *What you're walking into*) with evidence stamp; **attendees** (initials, role, context, LinkedIn); **last-touch / background synthesis** (multi-paragraph, including quoted commitments where applicable); **open commitments** with provenance lines and state badges (delivered / for today / queued / open); **numbered suggested focus**; **materials at hand** (name, meta, open); **compact activity preview** with affordance to expand the full drawer activity log; **prep action bar** (mark reviewed, print prep, send to phone, add note, draft message before call — mock may no-op or toast); **Approve and send** / amend / attach document / dismiss for distributing the prep pack and closing the drawer. The mock implementation MAY use static JSON on the commitment entity; production SHALL hydrate fields from `briefs` (prep phase), `lp_calendar_events`, `lp_interactions`, `commitments`, open loops, and materials index per §3.13.

**Outputs.**

- `tomo_action_log.outcome`, `actioned_at`, `character_change_pct` set on action.
- Outbound email sent via provider API; `lp_interactions` row eventually re-ingested via webhook with `direction='outbound'` (de-duped via `provider_internet_message_id`).
- `email_delivery_log` row.
- `activity_log` row for draft lifecycle event.
- Scheduling assistant instrumentation used by Metric 6c: detected scheduling intent, proposal generation timestamp, proposed slots, accepted slot when known, and calendar-event creation timestamp.

**Business rules.**

- BR-3.9.1 — Drafts never auto-send. The send button is the only path.
- BR-3.9.2 — A draft is composed by Tomo using the most recent LP context up to send time, including prior emails (full content tier when available; metadata fallback otherwise).
- BR-3.9.3 — Drafts to LPs in `historical_data_only=true` state include a cautious-tone hint in the prompt (per ingestion strategy).
- BR-3.9.4 — Edit-level classification uses Levenshtein-derived character ratio against the originally-generated draft text. Comparison is body-only (subject and signature excluded).
- BR-3.9.5 — Snoozing a draft sets the action `outcome='snoozed'` and re-queues it for the snooze time.
- BR-3.9.6 — A draft addressed to multiple LPs (e.g. fund update batch) is treated as N separate `tomo_action_log` rows.
- BR-3.9.7 — Meeting prep drawer content SHALL remain human-in-the-loop: no auto-send of prep materials; **Approve and send** (or equivalent) is the explicit send path. Optional chips (mark reviewed, print, send to phone) SHALL NOT bypass confirmation for outbound communications.

**Acceptance criteria.**

- AC-3.9.1 — Approving a draft unchanged sends within 2 seconds and shows the success line.
- AC-3.9.2 — A draft edited from 248 characters to 274 characters (~10% change) is classified `approved_with_edits` and contributes to Metric 6b.
- AC-3.9.3 — A draft edited from 248 characters to 580 characters (~134% change) is classified `edited_substantially` and does not count as approval for Metric 6b.
- AC-3.9.4 — An approved scheduling reply with proposed times creates a calendar invite via the connected calendar API (when the GP confirms the time).
- AC-3.9.5 — Drafts to LPs are sent from the GP's authenticated mailbox (visible in their Sent folder), never from a TOMO-managed mailbox.
- AC-3.9.6 — A GP opening a **Coming up** row with meeting prep data sees the time strip, narrative block, attendees when present, open commitments with state badges when present, suggested focus when present, materials list when present, activity preview, prep action bar, and **Approve and send** / dismiss controls consistent with `design/tomo_drawer_meetingprep_light_v3.html` (order and section labels may vary by template e.g. first-contact vs existing investor).
- AC-3.9.7 — **View full history** (or equivalent) from the compact activity preview expands the drawer activity log and scrolls it into view without losing the prep content above.
- AC-3.9.8 — Warm Intro Tracker, DDQ Response Engine, and Re-engagement Response appear as Action Drawer cards and do not create `workflow_runs` or `workflow_step_runs`.
- AC-3.9.9 — A scheduling-intent inbound produces a drawer draft with three proposed time blocks, logs the proposal timestamp, and writes the calendar-event creation timestamp when the GP confirms the meeting.
- AC-3.9.10 — Trip Orchestrator reply handling passes the trip date window into scheduling assistant proposals; proposed times outside that window are rejected.

---

### 3.10. Relationships / LP record

**Description.** The Relationships surface (`/relationships`) is the GP's working CRM view. **Normative visual references (mock repository `tomo_crm`):** list, cards, and Kanban layouts — `design/tomo_relationships_list_v3.html`, `design/tomo_relationships_cards_v3.html`, `design/tomo_relationships_kanban_v3.html`. **LP detail** opens as a **right-hand drawer** (desktop); full-screen sheet on narrow viewports. **Normative drawer layout:** `design/tomo_relationships_lp_drawer_v2.html` (header, signal-evidence block, snapshot, pipeline state, pipeline data, open loops & commitments, Update with Tomo, expandable full record with identity, firm details including fund raised against, behavioural signals grid, activity log). The LP record still satisfies Section 8 §8.4 for surfaced fields; inline editing follows the Manual Update Principle (Tomo MVP3) — the GP types in plain language ("Peter sized at $25M"), Tomo proposes the field change with confirmation gate.

**Product decisions (Relationships page behaviour).**

- **Authoritative UI:** The v3 Relationships HTML mocks above are authoritative for column sets, control bar, filter panel composition, and drawer IA. If this SRS previously listed fewer columns, **the v3 mocks win**; schema additions needed to persist new facets appear in §6.2 (`lp_contacts` and notes below).
- **Create list:** The **Create list** control is **disabled until at least one filter** (structured filter, advanced filter, or equivalent Tomo-applied filter) is active — saving an unfiltered “all LPs” cohort from this surface is out of scope for the control’s enabled state.
- **Group by:** **List** and **Cards** views honour **Group** (`By stage`, `By tier`, `By owner`, `By signal`, `None`). **Kanban** does **not** use Group by — columns are always **pipeline stage**; switching view to Kanban ignores the Group control.
- **Fund context:** The Relationships working set is **scoped to the active fund** in the workspace (`lp_contacts.fund_id` matches the UI’s selected fund; mock app: tie to active fund from funds context). Copy such as “current raise” and “Fund being raised against” refer to that fund.

**Inputs / triggers.**

- User loads `/relationships` (cohort = LPs for **active** `fund_id` unless “all funds” is explicitly a future product mode).
- User selects an LP — opens **detail drawer** from the right (see `design/tomo_relationships_lp_drawer_v2.html`).
- User types in **Update with Tomo** (drawer) or other Tomo surfaces to update fields.

**Processing.**

1. **List view (v3 authoritative column set, in addition to §8.5 sort/search behaviour).**
   - **Stage group rows:** When Group includes stage, render section headers with LP counts and, where data exists, **expected commitment range** for that section (per v3 mocks).
   - **Columns (default set):** **LP** (firm + primary contact name & role); **Tier**; **Type** (`lp_contacts.investor_type` — allocator category); **Geography** (derived display from `lp_organizations.region` / country / city); **Active investments** (derived tags from `prior_fund_investor`, `prior_fund_identifier`, `pipeline_stage`, and workspace `funds` labels — no extra persisted column); **Mandate fit**; **Signal** (directional band / narrative label from `lp_state` + Section 8 signals); **Ticket** (`expected_commitment_amount`); **Last touch** (days since meaningful touch + G/A/R dot; reply-velocity arrow per Signal 3); **Loops** (open loop count); **Next move** (GP-facing next step string); **Owner** (`relationship_owner_user_id`); row actions.
   - **Also required from §3.10 / §8.5:** sortable columns; default sort **pipeline_flag** (red → amber → green) then **days_since_meaningful_touch** desc; “Stuck Nd” when `stage_stagnation_flag` is amber/red; subtle re-up dot when `prior_fund_investor=true`.
2. **Cards view.** Same grouping rules as list; **LP cards** per v3 (`design/tomo_relationships_cards_v3.html`) — signal dot, tier / prior badge, signal pill, last/next touch, ticket, mandate fit, open loops.
3. **Board (Kanban) view.** Columns = canonical pipeline stages (order and chrome per `design/tomo_relationships_kanban_v3.html`). Drag-and-drop writes `lp_stage_transitions`. **Group by is ignored** in this view.
4. **Detail drawer (LP record).** Follow section order and interaction patterns in **`design/tomo_relationships_lp_drawer_v2.html`:** drawer header (Newsreader title, role · firm · tier); **Off-channel chip** (*I'm in touch off-channel* / *Off-channel until {date} — extend* / Clear) per BR-3.5.9; **Signal evidence** (`pipeline_flag_reason` narrative); **Snapshot** (synthesised narrative); **Pipeline state** (stage, pipeline flag, tier, days in stage / prior stage, owner); **Pipeline data** (mandate fit, expected commitment, prior fund, active investments summary); **Open loops & commitments**; **Update with Tomo**; **Show full record** expanding to identity & contact, firm details (**fund being raised against** = active `fund_id`), **behavioural signals** (nine signals + derived rows per §3.5), CRM extended fields as needed; **Activity log** (chronological). Mobile: full-height drawer / sheet equivalent.
5. **Inline editing via Tomo chat (Manual Update Principle).**
   - GP types: "Peter sized at $25M" → Tomo proposes `lp_contacts.expected_commitment_amount=25000000` → confirmation gate → write + `activity_log` row.
   - Direct field editing remains available for power users (chip selectors, numeric sizing) with the same audit rules.
   - Free-text notes go to `lp_notes`.
6. **Filters.**
   - Same named filters as Lists (§3.11), plus full-text search on name and firm; **advanced filters** field set aligned with `design/tomo_relationships_list_v3.html` modal (pipeline, numeric ranges, classification).
7. **Engineering note.** Prototype components live under `src/components/` (e.g. relationship drawer, Kanban). V1 production wires real data via `/api/crm/relationships` (mock) transitioning to `/api/lp-contacts` per §4.2.9 / Appendix migration notes.

**Outputs.**

- `lp_contacts`, `lp_state` updates from edits (including GP mutations to `off_channel_active_until` per §3.10 / BR-3.5.9).
- `lp_stage_transitions` rows on stage changes.
- `lp_notes` rows on free-text notes.
- `agent_tool_calls` rows for chat-driven updates (`tool_name='update_crm'`).
- `activity_log` rows per change.

**Business rules.**

- BR-3.10.1 — Every LP-record mutation requires GP confirmation (Manual Update Principle). Tomo never silently updates a field even when its proposal is correct.
- BR-3.10.2 — Stage changes on the Kanban board write to `lp_stage_transitions` immediately. The trigger ensures `lp_state.days_in_current_stage` is recomputed within seconds.
- BR-3.10.3 — Provenance: every field write records `source` (CRM-imported / GP-edited / TOMO-derived / TOMO-computed) and is rendered on hover.
- BR-3.10.4 — Workspace teammates see and edit the same LPs; concurrent edits use last-write-wins with conflict surfaces in `activity_log`.
- BR-3.10.5 — **Off-channel affordance** on the LP record SHALL call the same persistence rules as BR-3.5.9 (30-day rolling window; append-only `lp_signal_log` audit rows). The chip is visible in the drawer header region per `design/tomo_relationships_lp_drawer_v2.html` engineering placement.

**Acceptance criteria.**

- AC-3.10.1 — Loading the Relationships list with 500 LPs renders in ≤ 1.5 seconds.
- AC-3.10.2 — Dragging an LP from `first_meeting` to `nurturing` on the board writes a `lp_stage_transitions` row and updates `lp_state.days_in_current_stage` within 5 seconds.
- AC-3.10.3 — Typing "Peter sized at $25M" in the LP-card chat surfaces a confirm dialog with the proposed `expected_commitment_amount=25000000`, and writing applies on confirm.
- AC-3.10.4 — The LP card surfaces every Section 8 §8.3–§8.4 surface element listed in §8.8.
- AC-3.10.5 — The LP **detail drawer** implements the section order and primary interactions of `design/tomo_relationships_lp_drawer_v2.html` (off-channel chip when applicable, signal evidence, snapshot, pipeline state, pipeline data, open loops & commitments, Update with Tomo, expandable full record including behavioural signals grid and activity log).
- AC-3.10.6 — Tapping *I'm in touch off-channel* on an LP whose `off_channel_active_until` is null sets the field to **now + 30 days**, appends `lp_signal_log` with `signal_type='off_channel_marked'` and `signal_value_jsonb.action='set'`, and updates the chip label to *Off-channel until {date} — extend* (localized date).

---

### 3.11. Lists and named filters

**Description.** Lists (`/lists`, canonical route; mock repository may still mount the same surface at `/pipeline` pending redirect) is the audience and list-building surface. Same underlying LP rows as `/relationships` but optimised for cohort work — saved lists, named filters, bulk-action seed for workflows. **Normative UI / information architecture (mock repository `tomo_crm`):** `design/tomo_lists_v1.html` — Lists index (page chrome, eyebrow, title + aggregate meta line, subtitle, flat **Your lists** grid with **Live** vs **Manual** semantics, per-row counts and workflow activity, dashed **Create list** affordance) and **list detail** (drawer: header block, funnel-by-stage viz, **LP row table** as the primary membership view, active workflows, **drawer actions** row, **link workflow** modal opened from **Run workflow**). V1 does **not** ship a separate **Tomo defaults** section nor any Tomo-owned **system-preloaded** saved list on the Lists index.

**Inputs / triggers.**

- User loads `/lists`.
- User creates / edits a filter combination (Relationships) or manages explicit list membership (manual lists).
- User saves a filter combination or explicit selection as a list.
- User opens a saved list (list detail / drawer).
- User triggers a workflow run from a list.

**Processing.**

1. **Named filters (V1 set).**
   - **Drifting** — `lp_state.pipeline_flag IN ('amber','red')` AND `pipeline_flag_reason LIKE '%silen%'`.
   - **Quiet — Fat Middle** — warm-stage LPs with no directional signal in last 30 days.
   - **Re-engaged** — `lp_state.re_engagement_flag=true`.
   - **One-Way** — `lp_state.last_contact_was_one_way=true`.
   - **Stuck in stage** — `lp_state.stage_stagnation_flag IN ('amber','red')`.
   - **Slow to advance from [stage]** — `lp_state.days_in_prior_stage > stage benchmark` for the named prior stage.
   - **Confirmed mandate fit** — `lp_contacts.mandate_fit='confirmed_fit'`.
   - **Re-ups · Fund N** — `lp_contacts.prior_fund_investor=true AND prior_fund_identifier=N`.
   - **Close proximity detected** — `lp_state.cc_expansion=true OR lp_state.close_proximity_flag=true`.
   - **The single most valuable query** (Section 8 §8.4) — Tier 1 + confirmed mandate fit + drifting + not in active diligence or later. Available as a **named filter** and **saveable as a user list**; **not** auto-materialised as a Tomo default list (see BR-3.11.3).
2. **Filter combinator.** AND logic across selected filters. Free-text query added on top. Applies to **live** lists only (see item 3).
3. **Saved lists — live vs manual.**
   - **Live list** — Membership is the set of LPs matching **structured filter criteria** (same combinator as Relationships), recomputed on read/write as data changes. UI shows **LPs matching** (per `tomo_lists_v1.html`).
   - **Manual list** — **No structured filter:** filter criteria are empty / null / explicitly marked non-applicable at the API layer; membership is **exactly** the persisted set of explicit `lp_contact` ids the GP chose (add/remove). UI shows a free-text **description** line (italic / muted treatment per mock) and count label **LPs in list**. Amend-list flows add or remove explicit ids without introducing structured criteria.
   - Persistence note: GP saves a live list as named JSONB on `user_preferences.saved_filter_jsonb` (array of `{name, filter_json, list_mode}`) or equivalent until `lp_lists` lands in V1.5; `workflows.target_list_filter_jsonb` continues to carry the filter applied at workflow run time for live lists. Manual lists persist explicit member ids alongside the same list record shape engineering adopts (ids array / join table).
4. **Bulk actions.** From a list, the GP can: trigger a workflow on the cohort (creates one `workflow_runs` per LP), export to CSV, or open a Tomo chat scoped to the cohort.

**Outputs.**

- Filter results returned via `/api/crm/relationships?filter=...`.
- `workflow_runs` rows when a workflow is triggered on a list.
- `agent_tool_calls` rows when Tomo edits a filter via the `filter_relationships` tool.

**Business rules.**

- BR-3.11.1 — **Live lists:** membership is computed from structured criteria against current `lp_state` and `lp_contacts`. No stale snapshots. **Manual lists:** membership is the explicit id set only; structured criteria are not evaluated for inclusion.
- BR-3.11.2 — A workflow triggered on a list de-dupes against `outbound_safety_log` (§3.12) — an LP currently in another active workflow run is skipped with a notice.
- BR-3.11.3 — V1 **does not** seed a Tomo-owned default saved list, **nor** surface a **Tomo defaults** section on the Lists index. Any high-value named filter (including the "single most valuable query") is user-saveable from Relationships / Lists flows but is not auto-created at workspace creation.

**Acceptance criteria.**

- AC-3.11.1 — Selecting "Re-engaged" filter on a workspace with 500 LPs returns the result in ≤ 600ms.
- AC-3.11.2 — Triggering the F7 Three-Touch workflow on a "Quiet — Fat Middle" cohort of 29 LPs creates 29 `workflow_runs` rows, minus any LPs already in another active workflow run.
- AC-3.11.3 — Opening any saved list shows **list detail** whose **primary membership presentation** is a **scrollable LP row table** (columns / hierarchy per `design/tomo_lists_v1.html`: signal indicator, firm / LP name line, meta line, stage, right-aligned stamp) above or beside the funnel section as in the mock; stage-grouped chip-only views **do not** satisfy this criterion alone.
- AC-3.11.4 — The Lists index shows **New list** and **Import cohort** in the top utility row with **visual parity** to `design/tomo_lists_v1.html`; both controls are **disabled placeholders** in V1 (no navigation, no modal, `aria-disabled` or equivalent) until their flows ship.
- AC-3.11.5 — A **manual** saved list persists with **no structured filter** and renders the **Manual** / **LPs in list** copy pattern from the mock; a **live** list renders **Live** / **LPs matching** and a human-readable filter summary line.
- AC-3.11.6 — **List detail** shows a **drawer actions** row per `design/tomo_lists_v1.html`: primary **Run workflow**, **Export CSV** where cohort export is implemented in the build, **Amend list**; **Ask Tomo about this cohort** and **Delete list** are **disabled placeholders** in V1 (visual parity to the mock, no navigation) until those flows ship.
- AC-3.11.7 — **Run workflow** opens the **link workflow** modal in the same document: eyebrow *Run workflow on this list*, title *Pick a workflow*, **System defaults** and **Custom** tabs (with counts), selectable playbook option cards (trigger kind, summary, supporting meta), cohort / dedupe context in the footer, **Cancel**, and continuation into **Workflows** after the GP confirms a playbook **linked to the current list** for configuration or run setup. The **Custom** tab lists **existing** GP-built custom workflows only; **creating** a new custom workflow is initiated from **Workflows** via **New workflow** (§3.12), not from this modal. Roadmap-only system playbooks remain **non-selectable** in the picker.

---

### 3.12. Workflows (playbooks)

**Description.** Workflows are guided multi-step playbooks that earn a Workflows-surface slot only when they span hours or days, preserve meaningful state between steps, and capture an outcome at the end. V1 ships four **seeded** Workflows-surface entries: two locked defaults (**Post-Meeting Execution**, **F7 Three-Touch Qualification**) and two configurable templates (**Themed Outreach**, **Trip Orchestrator**). GPs may additionally define **user custom workflows** (`workflow_kind='user_custom'`) scoped to a **selected list** on `/workflows`; these appear in a **Built on this list** section below the seeded cards. Warm Intro Tracker, DDQ Response Engine, Update → Follow-Up, re-engagement, and scheduling live outside the Workflows surface unless they are invoked through the shared workflow substrate described here. Tomo agent edits seeded/configurable workflows via the `update_workflow` tool. **Custom workflow creation** on `/workflows` uses the **five-step create wizard** (§3.12 item 7) for the **primary** leg, with an optional **follow-up leg** sub-wizard (follow-up trigger → follow-up action → follow-up draft) reachable from **Add follow-up** on Personalise or **Primary | Follow-up** tabs when editing a saved workflow. Orchestrator tools: `confirm_workflow_trigger`, `confirm_workflow_action_prompt`, `advance_workflow_wizard_step`. **Lists** pipeline attach may still use legacy `create_user_workflow` one-shot chat. Workflow runs are per-LP. Outbound deduplication prevents two workflows from sending two messages to the same LP for the same trigger. **V1 custom graph limit:** one primary action + **at most one** optional follow-up (`send_email` only); F7 multi-touch, Trip scheduling-reply legs, and post-meeting capture-form triggers are **not** buildable in the custom wizard (seeded templates only).

**Design reference.** `design/tomo_workflows_v8.html` is authoritative for the list-scoped workflow control room (left **Your lists** rail, list header, Tomo defaults / Tailored sections), locked/default card treatment, accordion expansion pattern, inline process-flow visualisation, and in-flight state summaries. **V1 monitor-only norm (supersedes v8 “batch review” / draft-approval bars on active cards):** active expanded cards and step drawers show **read-only monitoring** only — no amber “drafts awaiting approval” strip, no **Review drafts →** CTAs, no **Awaiting approval** header stat, and no copy directing the GP to approve drafts on the Workflows surface. **Operational monitoring signals** (e.g. “follow-up drafts ready”) MAY appear on the expanded card and MAY open the **step monitor drawer** for that step — they MUST NOT offer approve / send on the Workflows surface. Draft review and send approval for live runs remain exclusively in the **Action Drawer** (§3.9). Its card inventory is reference-only and must be interpreted through the V1 scope in this section: replace **Update → Follow-Up** and **DDQ Response Engine** with configurable-template entries for **Themed Outreach** and **Trip Orchestrator**, while retaining Post-Meeting Execution and F7 Three-Touch as locked defaults. **Process-flow norm (V1):** every workflow card renders **trigger first**, then **action** step(s), optional **wait** nodes, and optional terminal **outcome** — never an action node before the trigger. Post-Meeting **prep brief** is part of the meeting lifecycle (§3.13 Action Drawer) and is **not** a Workflows-surface process-flow step. Implementation phasing: `docs/WORKFLOWS_SURFACE_IMPLEMENTATION_PLAN_2026-05-17.md`, `docs/WORKFLOW_FOLLOW_UP_BUILDER_PLAN.md` (shipped as V1). Mock repository components: `workflow-build-modal.tsx`, `workflow-leg-wizard.tsx`, `workflow-leg-draft.ts`, `workflow-follow-up-design.ts`, `workflow-create-draft.ts`, `workflow-launch-plan.ts`, `workflow-run-advance.ts`, `workflow-run-rollup.ts`, `workflow-run-attention.ts`, `workflow-run-storage.ts`, `workflow-wizard-file-upload.tsx`, `parse-workflow-documents.ts`, `workflow-creator-chat.tsx`, `workflow-cohort-draft.ts`, `workflow-step-action-drawer.tsx`, `workflow-step-monitor-panel.tsx`, `workflow-step-monitoring.ts`, `workflow-step-monitoring-mock.ts` (seeded templates), `workflow-surface-display.ts`, `workflow-surface-launches.ts`, `workflow-action-build.ts`, `custom-playbook-surface.ts`, `workflow-expanded-body.tsx`. Legacy `workflow-action-build-modal.tsx` is superseded by the unified build modal.

**Inputs / triggers.**

- User loads `/workflows` and selects a list in the left rail.
- User clicks **New workflow** (list header CTA; disabled until a list is selected) or opens `/workflows?build=1` with a list context to launch the build modal.
- User triggers a workflow on an LP or a list.
- `lp_calendar_events.status='completed'` triggers Post-Meeting Execution for LP meetings.
- F7 is manually run on a Fat Middle LP / list, or auto-suggested when the Fat Middle filter contains > 0 LPs.
- User manually launches **Themed Outreach** (list + theme) or **Trip Orchestrator** (**send trip emails to list** with destination, dates, and availability in run parameters and email body).
- Trip Orchestrator may be auto-suggested when TOMO detects a multi-day calendar block in a city different from the GP's primary location; the GP still **launches** outreach explicitly (trigger = send trip emails, not trip detection alone).
- User edits a **saved** custom workflow or configurable-template parameters via Tomo chat where permitted (§3.12.8–§3.12.9); **active** workflows on the surface are **monitor-only** (no structural edit, no **Configure run** in the expanded accordion).
- User builds a custom workflow on the currently selected list via the **five-step create wizard** (§3.12 item 7); list is not re-asked.

**Processing.**

1. **Workflow definition.** Stored in `workflows` + `workflow_steps`. `trigger_type` ∈ (manual / signal / event / scheduled). `target_list_filter_jsonb` carries the filter applied at run time (for live lists) or explicit list membership (for manual lists). `template_id` / `base_template_id` and `parameters_jsonb` allow saved configurations to share one base workflow implementation. User custom workflows store `workflow_kind='user_custom'`, a human-readable `trigger` string, typed **primary** `action` + `actionBuild`, and optionally **`followUp`** (second leg: follow-up trigger spec, `send_email` action, `actionBuild`) in `parameters_jsonb` / definition JSON (mock: `CustomPlaybookStored.followUp` in localStorage; production: same shape on `workflows.parameters_jsonb` or normalized `workflow_steps` rows). Production also persists the owning list id (mock: `tomo-playbook-pipeline-overrides`; target: `parameters_jsonb.list_id` or `workflows.lp_list_id` when `lp_lists` lands). Stable custom step ids: `{workflowId}-trigger`, `-primary`, `-wait` (when wait follow-up), `-follow-up`.
2. **V1 workflow entries.** Seeded at workspace creation; all four appear **active on the list** in the Workflows control room (expanded view is monitor-only in V1; production maps to `workflows.is_active=true` for seeded entries on the selected list context):
   - **Post-Meeting Execution** — locked default; **trigger:** LP calendar event completed (meeting ends). **Process flow (Workflows surface):** capture form → follow-up draft within 30 minutes. **Prep brief** (~30 min before meeting) is generated and surfaced via Action Drawer (`meeting_prep`, §3.13), not as a preceding node in the workflow process flow. Capture output informs follow-up, Signal 6 stagnation tracking, and `mandate_fit`.
   - **F7 Three-Touch Qualification** — locked default; **trigger:** GP runs on a Fat Middle list (manual or suggested when Fat Middle > 0). Three sequential draft actions across roughly 14 days (insight → wait → question → wait → respectful close) with final outcome capture; each later draft references earlier touch context.
   - **Themed Outreach** — configurable template (Tailored); **trigger:** GP launches with list + theme / content kernel. **First action:** **Themed insight outreach** (batch personalised drafts); optional wait; optional follow-up to non-responders after 7 days.
   - **Trip Orchestrator** — saved configuration of the Themed Outreach base template (Tailored); **trigger:** **Send trip emails to list** (GP decides when to run outreach). **Actions:** trip outreach emails (dates + availability in copy; destination / window in `parameters_jsonb`) → monitor replies and schedule inside trip window → follow-up if no response. Location cohort filtering is run-setup / list context, not a separate process-flow step before the trigger.
3. **Shared outreach substrate.** Themed Outreach, Trip Orchestrator, and V1 fund-update behaviour share the same base implementation: cohort selection, content kernel, prompt template, batch draft generation, Action Drawer review, GP-approved send, outbound dedup, optional non-responder follow-up, and engagement outcome capture. Fund Update in V1 is a saved Themed Outreach configuration, not a named Workflow entry or structured content-block editor.
4. **Workflow runs.**
   - One `workflow_runs` row per LP per workflow execution.
   - **`workflow_runs.id`** — opaque UUID (`gen_random_uuid()`). **Not** sequential, **not** human-readable / contextual. Used to tag outbound email (`lp_interactions` linkage or `metadata_jsonb`) and attribute inbound replies. **`cohort_launch_id`** — shared UUID across all LP rows created by one **Launch run** click (or one trigger batch); powers run history (“29 LPs · started today”) and the run-scoped outcomes view. Mock implementation: `src/lib/workflow-runs.ts`, `workflow-run-storage.ts`; API: `POST /api/workflows/launch`.
   - At launch: for each LP on the selected list, insert `workflow_runs` + initial `workflow_step_runs` (`pending`). Skip LPs that already have `status IN ('running','paused')` for the same `workflow_id` (partial unique index).
   - Steps execute in order. `step_type='wait'` introduces a delay (`wait_duration_hours`); `step_type='action_draft'` generates a draft and surfaces in Action Drawer with `requires_approval=true` (default V1 — human-in-the-loop on every outbound).
   - GP approves/edits/dismisses per §3.9. Approval advances the run.
   - **Reply attribution (normative).** On Action Drawer approve+send: persist outbound `lp_interactions` and set `workflow_step_runs.output_jsonb` with `sent_interaction_id`, `provider_internet_message_id`, `lp_email_thread_id`, `sent_at`; set `workflow_step_runs.status='sent'`. On inbound ingest (event-driven, same hot-path family as re-engagement): match inbound to the latest eligible `sent` step on the same `lp_email_thread_id` with `interacted_at > sent_at`, or via `In-Reply-To` → parent `provider_internet_message_id`; exclude `is_ooo=true`. Set `workflow_step_runs.status='replied'` and `output_jsonb.replied_at`. Roll up **Replied** counts on workflow monitor UI from step runs. API stubs: `POST /api/workflows/record-send`, `POST /api/workflows/attribute-reply`.
   - **Custom activate + follow-up legs (V1).** **Activate** on a saved custom workflow calls `POST /api/workflows/launch` (mock: `launchWorkflowCohort`) with a **step plan**: primary step id + optional follow-up step id, trigger kind (`wait` | `on_inbound_reply`), and wait days. Per LP: create `workflow_runs` + primary `workflow_step_run` (`pending` / `in_progress`) + follow-up `workflow_step_run` (`pending`, `output_jsonb.deferredLeg='follow_up'`). Initial active step for drafting is always **primary** (`-primary` suffix).
   - **Follow-up advancement (V1).** After primary **sent**: wait clock starts (`sentAt`). **Wait + no_reply:** if LP replies before wait elapses → follow-up `skipped` (`lp_replied_before_wait`); if wait elapses with no reply → follow-up `in_progress`. **On inbound reply trigger:** attributed reply on primary → follow-up `in_progress`. Follow-up send uses same record-send / attribution chain on the follow-up step id. Mock: wait elapsed checked on `/workflows` read (refresh store); production: worker/cron required (documented V1 limitation).
5. **Outbound deduplication.** Before sending, the workflow worker checks `outbound_safety_log` for a row with the same LP + trigger signature in the last N days (default 14). If present, the step skips and notes the skip in `workflow_step_runs.output_jsonb`.
6. **List-scoped layout.** `/workflows` shows a left **Your lists** rail (search + select), a list header (LP count, live/manual, filter summary), and workflow cards for the selected list context. Seeded entries (Tomo defaults, Tailored) are global per workspace; custom builds appear only under **Built on this list** for the list they were created against.
7. **Build custom workflow (five-step wizard).** **New workflow** opens a **single large dialog** (`max-w-5xl`, tabbed header) scoped to the list already selected in the left rail. The client **does not** persist until **Save & finish** on the final step. Steps:
   - **Name** — GP enters workflow name (≥ 2 characters); shown in modal chrome on later steps.
   - **Trigger** — Tomo chat (`surface=workflow_creator`, `workflowCreator.wizardStep='trigger'`). Tomo infers schedule from natural language; **defaults to 9:00 AM** when no time is stated; **must not** re-confirm dates the GP already gave. Orchestrator tools: `confirm_workflow_trigger` (sets trigger + summary), `advance_workflow_wizard_step` (after GP agrees to continue — chat or affirmative reply; optional manual **Next**). No separate “proposed trigger” confirm card — tool call sets `triggerConfirmed` immediately.
   - **Action** — two-column layout: **left** — free-text context, **file upload** (`.docx` and `.pdf`; client extracts plain text via `parse-workflow-documents.ts`, merged into Tomo context), attachment list, status when action prompt is confirmed; **right** — Tomo chat (`wizardStep='action'`) with suggestion pills under the title (e.g. draft cover letter, request meeting, conference / roadshow) and a **two-phase composer**: (1) **initial view** — empty chat history, **8-row** prompt inbox with placeholder **“Describe your action …”** and **Send** (Enter inserts newline; ⌘/Ctrl+Enter sends); suggestion pills pre-fill this inbox; (2) **after first send** — standard **conversation UI** (message bubbles + streaming Tomo replies) with a **single-line** follow-up input and send control at the bottom; **Clear chat** restores the initial 8-row composer. Tomo orchestrates toward a confirmed **action creation prompt**, asks clarifying questions as needed, then calls `confirm_workflow_action_prompt` with `instruction` (full draft-generation prompt), optional `action_description` (process-flow label), and optional `action_kind` (default `send_email`). Tomo **does not** write the full cohort email on this step — it directs the GP to click **Generate drafts** when the prompt is ready. **Generate drafts** is disabled until the prompt is confirmed (via Tomo tool or suggestion pill).
   - **Draft** — after **Generate drafts**, the client calls `POST /api/tomo/generate-workflow-cohort-draft` with the confirmed instruction, merged context text (including extracted attachment text), workflow name, list name, trigger, and attachment names. The LLM returns cohort **subject**, **body** (with `{{lp_first_name}}` placeholder), and **actionDescription** into editable fields; **Regenerate** re-calls the same endpoint. Per-LP rows are seeded from the demo cohort list in the mock (production: resolve from the selected list). Footer **Next — personalise per LP** (not outbound send). If the LLM is unavailable, the client falls back to a deterministic template (mock offline path).
   - **Personalise** — master–detail: LP list left, single draft editor right. Footer: **Save & finish** (primary only) or **Add follow-up** (opens follow-up leg sub-wizard). **Save workflow with follow-up** persists primary + `followUp` via `appendCustomPlaybookWithActionBuild()` (mock: `CustomPlaybookStored` + optional `followUp`). Optional **Approve all** on Draft skips per-LP edits. Per-LP personalise applies to **primary** only in V1 (follow-up: one cohort template for all LPs).
   - **Follow-up leg sub-wizard (optional, V1).** Steps: **Follow-up trigger** (`wait` + `no_reply`, 1–90 days default 7, or `on_inbound_reply`), **Follow-up action** (`send_email` only), **Follow-up draft** (`generate-workflow-cohort-draft` with `draftKind: "follow_up"` + `primaryTemplate`). **Edit action** on saved cards: **Primary | Follow-up** tabs.
   On save: link to selected list, default **saved (inactive)** (`is_active=false`), expand new card, success toast. Deep link: `?build=1` opens the wizard when a list is selected. **Lists “Use in workflow” → Custom** may still use legacy `create_user_workflow` one-shot chat (§3.14); `/workflows` **New workflow** uses the wizard tools above, not `create_user_workflow`, until persistence. **Runtime** draft approval for live runs remains in the **Action Drawer** (§3.9), not in the build or monitor drawers.
8. **Active vs saved (no toggle-off).** V1 does **not** expose an on/off toggle to pause an active workflow on the card chrome. **Seeded entries (Tomo defaults + Tailored):** always **active** on the list in V1; expanded accordion is **monitor-only** (passive monitoring strip where applicable, run history, contextual step monitor) — no **Configure run** banner, no structural step edit while active, no draft-approval queue on the card. **User custom:** **saved** until the GP clicks **Activate** in the expanded card; while saved, **primary** and optional **follow-up** remain editable (**Edit action** → Primary | Follow-up); once **active**, same monitor-only rules as seeded entries. **Removal:** **Tailored** and **user custom** workflows expose a **delete** control (trash icon) with a confirm dialog; delete removes the workflow from the list context (custom: purge definition; tailored saved config: remove from list). **Locked defaults** have **no delete** and **no deactivate** on the card.
9. **Accordion workflow control room.** The default interaction is not workflow-card → generic detail drawer. Each workflow card expands inline as an accordion to show workflow-level operating context: monitor-only banner when active (copy: monitor in-flight LPs and capture outcomes — **no** “review drafts”), meta strip (**Outbound safety** line **hidden** in V1 UI; dedup rules in item 5 still apply), **trigger-first** visual process flow (hint: open monitoring detail per step), **stateSummary** segment panel on active custom workflows with follow-up (**Primary action** + **Follow-up** from `workflow_step_runs`), optional **monitoring strip** (operational signals only — e.g. “follow-up drafts ready”; draft-approval items filtered out; follow-up-ready MAY open monitor drawer), and run history. Card header stats MUST NOT include **Awaiting approval** on active monitor-only workflows; use run-health counters (e.g. **Running now**, **Replied**) instead.
10. **Step-level monitor drawer (active workflows).** On **active** Workflows-surface cards, clicking a process-flow step opens a **read-only monitor drawer** scoped to that step — **contextual content by node type**, with **no** approve, edit, send, or “open in Action Drawer for approval” affordances in the drawer:
    - **Trigger (`nodeType=trigger`):** frozen run parameters (trigger label + `runConfig` fields; enrolled LP count for custom).
    - **Primary send (`single_draft` / `draft_batch`, primary step):** metrics **Drafted · Sent · Replied · Skipped** + LP table. **User custom:** rows from `workflow_step_runs` via `workflow-step-monitoring.ts`.
    - **Wait (`nodeType=wait`):** wait window + count of LPs in wait (primary sent, follow-up `pending`).
    - **Follow-up (`-follow-up` step):** template parameters from `followUp.actionBuild` + **Drafted · Sent · Skipped** + LP table when runs exist.
    - **Outcome (`nodeType=outcome` | `outcome_capture`):** outcome breakdown + aggregate metrics.
    Operational draft review and send approval for in-flight runs route through the **Action Drawer** (§3.9) only. **Saved (inactive)** custom workflows: **Edit action** (**Primary | Follow-up** when configured). **Active** custom: monitor-only structure (no **Edit action**). **Activate** enrolls list with step plan (item 4). **Launch run** on `runConfig.launchable` templates enrolls the selected list — mock session-local until Supabase wiring.
11. **Document upload for action context (wizard).** On the **Action** and **Draft** steps, the GP may attach **`.docx`** (mammoth) or **`.pdf`** (pdf.js text layer) files. The client extracts plain text in-browser, stores it on each attachment (`extractedText`), and merges it with free-text context for Tomo orchestration on the Action step and LLM cohort draft generation on the Draft step. **Unsupported:** image-only / scanned PDFs without a text layer — UI shows a clear error. File picker accept: `.docx,.pdf` (`WORKFLOW_DOCUMENT_ACCEPT`). In the **mock**, attachments are metadata + extracted text in `actionBuild` (binaries stay client-side). **Production:** wizard-uploaded originals are stored with the workflow definition and **attached to outbound emails** when the GP approves and sends via the Action Drawer (same files the GP uploaded at build time, subject to size/type policy).
12. **Visual editor / process flow.** Expanded workflow cards render steps as a horizontal process flow (`workflow-expanded-body.tsx`). **Normative order:** `trigger` → **primary** `action` → optional `wait` → optional **follow-up** `action` → optional `outcome`. **User custom (V1):** **one primary action** + **at most one optional follow-up** (not F7 multi-touch or arbitrary N legs — post-V1). Stable ids: `-primary`, `-wait`, `-follow-up`. Primary label uses `actionBuild.actionDescription` when set. Locked defaults and active Tailored cards are read-only on trigger nodes (`readonly`); active step clicks open the **monitor drawer** (item 10).
13. **Tomo chat editing.** Inline chat on `/workflows` calls the `update_workflow` tool to add/remove/reorder configurable-template steps or alter per-run parameters. Custom workflow **creation** uses `workflow_creator` inside the build modal — not `update_workflow`. Cohort drafts: `POST /api/tomo/generate-workflow-cohort-draft` (`draftKind` default `primary`; follow-up leg passes `draftKind: "follow_up"` + `primaryTemplate`).
14. **Outcome capture.** At workflow run completion, F7 captures one of: warmer than expected / maintaining but non-committal / genuinely dormant. Outreach templates capture engagement outcomes (reply, scheduling accepted, declined, no response) on `workflow_runs.outcome` / output JSON as appropriate.
15. **Workflow run outcomes view (planned — post monitor-only ship).** A dedicated **run-scoped outcomes** surface (not per-step) answers “How did this run perform?” for a completed or in-flight cohort. **Entry:** from run history (**View outcomes**) or query `?view=outcomes&runId=…` on `/workflows` (mock); production target route `/workflows/[workflowId]/runs/[runId]/outcomes`. **Layout:** run selector + cohort headline; horizontal **funnel** (enrolled → sent → replied → outcome captured); workflow-specific outcome mix (F7: warmer / maintaining / dormant; outreach: replied / silent / scheduling); optional engagement timeline; filterable LP table. **Data spine:** `workflow_runs`, `workflow_step_runs` aggregates, `stateSummary`, and run-history DTO fields — not step-drawer metrics. Step monitor drawer remains operational; outcomes view is retrospective GP review. **Phase:** mock scaffold acceptable after monitor-only UI; full charts when run aggregates API lands.

**Outputs.**

- `workflows` and `workflow_steps` rows.
- `workflow_runs` and `workflow_step_runs` rows per execution.
- `tomo_action_log` rows per step that surfaces a draft or capture.
- `outbound_safety_log` rows per outbound.
- `agent_tool_calls` rows for Tomo workflow edits.

**Business rules.**

- BR-3.12.1 — The four V1 workflow entries are seeded once per workspace at creation. **Locked defaults** (Post-Meeting Execution, F7 Three-Touch) cannot be deleted or deactivated from the Workflows card chrome. **Tailored** templates (Themed Outreach, Trip Orchestrator) may be **removed from the current list** via delete (confirm dialog); removal does not delete the workspace seed definition in production — it detaches or hides the list-scoped configuration per product rules.
- BR-3.12.2 — `requires_approval=true` is the default and cannot be disabled in V1 (no auto-send).
- BR-3.12.3 — Outbound dedup window is 14 days globally for V1; per-workflow override is V1.5.
- BR-3.12.16 — `workflow_runs.id` and `cohort_launch_id` are server-generated UUIDs only; clients must not supply contextual or sequential ids.
- BR-3.12.17 — At most one active (`running` or `paused`) `workflow_runs` row per (`workspace_id`, `workflow_id`, `lp_contact_id`). A second launch for the same LP+workflow skips that LP and continues enrolling others.
- BR-3.12.18 — Workflow reply metrics attribute to `workflow_run_id` via thread + send timestamp (and `In-Reply-To` when present), not via custom headers or subject-line tokens in V1.
- BR-3.12.4 — F7 Three-Touch is the **default-on workflow** per V1 Final Decision #2 — the framework's V1 NON-NEGOTIABLE.
- BR-3.12.5 — Workflow-surface inclusion requires multi-step sequencing over hours or days, meaningful state between steps, and outcome capture. Single-moment Action Drawer flows, signal-triggered drafts, and reminder nudges do not receive workflow slots.
- BR-3.12.6 — Themed Outreach is the canonical configurable outreach implementation. Trip Orchestrator and V1 fund-update behaviour are saved configurations / parameter sets, not bespoke workflow engines.
- BR-3.12.7 — A user custom workflow is always created in the context of exactly one list selected on `/workflows`; the build flow MUST NOT ask the GP to pick a different list. Tomo derives the workflow **name** from trigger + action unless the GP supplies one explicitly.
- BR-3.12.8 — Newly created custom workflows default to **saved (inactive)** (`is_active=false`); the GP **activates** from the expanded card when ready to run (no toggle-off to return to saved — delete removes the workflow). Lists **Run workflow** links existing workflows only; it does not create new ones.
- BR-3.12.9 — While a workflow is **active** on the Workflows surface, the expanded card is **monitor-only**: no structural step edits, no **Configure run** primary affordance, no on/off toggle, no draft-approval queue or **Review drafts** CTAs on the card. **Operational monitoring signals** (e.g. follow-up drafts ready) MAY appear and MAY open the **step monitor drawer** — not approve/send on the Workflows surface. Outcome capture and draft review for live runs proceed through the **Action Drawer** (§3.9) and Today. While **saved**, custom workflows remain editable (trigger, primary, optional follow-up, name) until **Activate**; configurable-template structure edits via Tomo are post-V1 on active cards.
- BR-3.12.10 — Every Workflows-surface process flow MUST render the **trigger** as the first node, followed by **action** step(s). Prep brief for Post-Meeting Execution MUST NOT appear as a workflow step (see §3.13). Trip Orchestrator's trigger is **send trip emails to list**, not trip date detection alone.
- BR-3.12.11 — **Create wizard completion** is mandatory for **user custom** workflows initiated from `/workflows` **New workflow**; the client MUST NOT persist without a completed primary `actionBuild` (`appendCustomPlaybookWithActionBuild`). V1 custom workflows: **one launch trigger + one primary action** + **at most one optional follow-up leg** (`send_email` only; follow-up triggers: `wait`+`no_reply` or `on_inbound_reply`; no per-LP follow-up personalise). Arbitrary multi-leg graphs (F7-style) are post-V1.
- BR-3.12.19 — When `followUp` is configured, **Activate** MUST register both primary and follow-up `workflow_step_runs` per LP; follow-up advancement MUST follow item 4 (skip on early reply for wait+no_reply; activate on wait elapsed or on-reply trigger).
- BR-3.12.20 — **V1 production gap (documented):** mock advances wait-elapsed follow-ups on `/workflows` read; production MUST add a scheduler/worker. Mock stores definitions in localStorage until `workflows` / `workflow_steps` Supabase persistence ships.
- BR-3.12.12 — On **active** workflows, the Workflows-surface step drawer is **monitor-only** with **contextual panels** per §3.12 item 10 (no universal six-metric bar; no approved / waiting metrics or LP statuses). Draft approve / edit / send for live runs MUST surface only through the Action Drawer. Wizard draft review at create time is configuration only and does not send outbound mail.
- BR-3.12.18 — **Outbound safety** MUST remain enforced server-side (`outbound_safety_log`, 14-day dedup per BR-3.12.3) even when the **Outbound safety** meta line is hidden on the Workflows expanded card in V1 UI.
- BR-3.12.13 — Wizard **trigger** step: Tomo MUST infer datetime from GP language; if time is omitted, default **9:00 AM** in the GP's workspace timezone (mock: stated in summary). Tomo MUST NOT ask the GP to re-confirm a date or time they already provided.
- BR-3.12.14 — Wizard **document upload** accepts only `.docx` and `.pdf` with extractable text; other types are rejected in the file picker. Extracted text is included in orchestrator context and `actionBuild`. **Production:** stored originals are attached to GP-approved outbound sends from workflow runs; **mock:** only extracted text is persisted (no binary upload).
- BR-3.12.15 — **Saved (inactive)** user custom workflows MUST expose **Edit action** on the expanded card; clicking it opens the create wizard in edit mode and updates the same workflow record on **Save & finish**. **Active** workflows MUST NOT expose **Edit action** in V1.
- BR-3.12.16 — Wizard **Action** step: Tomo MUST orchestrate toward a confirmed **action creation prompt** via `confirm_workflow_action_prompt`. Tomo MUST ask clarifying questions when the GP's intent is vague. Tomo MUST NOT write the full cohort email on the Action step. **Generate drafts** MUST remain disabled until `actionPromptConfirmed` is true (Tomo tool or suggestion pill). The right-column Tomo chat MUST use a **two-phase composer**: an **8-row initial prompt inbox** (placeholder **“Describe your action …”**) before the first message; after the first send, a **conversation transcript** with a **single-line** follow-up input. **Clear chat** MUST restore the initial inbox.
- BR-3.12.17 — Wizard **Draft** step: **Generate drafts** and **Regenerate** MUST call the cohort draft LLM endpoint with the confirmed instruction plus merged context (free text + extracted attachment text). Returned subject/body populate `actionBuild.baseSubject` / `baseBody`; per-LP personalization applies the `{{lp_first_name}}` placeholder. Mock may use a demo LP cohort until list-scoped resolution ships in production.

**Acceptance criteria.**

- AC-3.12.1 — A new workspace has four Workflows-surface entries seeded at first sign-in: Post-Meeting Execution, F7 Three-Touch Qualification, Themed Outreach, and Trip Orchestrator.
- AC-3.12.2 — F7 triggered on a 29-LP Fat Middle cohort creates 29 `workflow_runs`, each with steps queued.
- AC-3.12.3 — A step that would send a duplicate outbound (same LP + signature within 14 days) skips and records the skip.
- AC-3.12.4 — Expanding a workflow card keeps the user on `/workflows` and shows the inline process flow, monitoring strip (when non-empty), and run history; it does **not** show a draft-approval action bar, **Awaiting approval** header stat, or **Outbound safety** in the meta strip; it does not open the generic workflow detail drawer.
- AC-3.12.5 — On an **active** workflow, clicking a process-flow step opens a **monitor-only** step drawer with **contextual** content per §3.12 item 10 (trigger = parameters only; send step = drafted/sent/replied/skipped + LP table without approved/waiting; wait = parameters only; follow-up = draft parameters + drafted/sent counts) and **Close** — **no** approve / edit / send controls and **no** copy directing approval in the Action Drawer. Live-run draft review and approval remain in the Action Drawer (§3.9). Outcome capture for eligible steps may still open an outcome surface where product specifies (F7 / outreach completion).
- AC-3.12.6 — Tomo chat editing a configurable workflow ("Add a wait step of 3 days after step 2") updates `workflow_steps` after GP confirmation and writes an `agent_tool_calls` row.
- AC-3.12.7 — Themed Outreach and Trip Orchestrator runs use the same base template / worker path with different `parameters_jsonb`, prompt template, and reply-handling configuration.
- AC-3.12.8 — A fund-update run can be saved and invoked as a Themed Outreach configuration, but no first-class Fund Update workflow card or structured content-block UI appears in V1.
- AC-3.12.9 — Warm Intro Tracker, DDQ Response Engine, re-engagement drafts, and scheduling replies never appear as Workflows-surface cards in V1; they route through Action Drawer, Signals, and Reminders per §3.9.
- AC-3.12.10 — With a list selected on `/workflows`, **New workflow** opens the **five-step** build dialog (Name → Trigger → Action → Draft → Personalise); Tomo collects **trigger** and **primary action** via wizard tools (not list selection); **Save & finish** persists a `user_custom` workflow with **trigger + primary action** and `actionBuild`, links it to the selected list, defaults to **saved (inactive)**, expands the new card, and shows it under **Built on this list**.
- AC-3.12.11 — `/workflows?build=1` with `pipelineId` / `openList` set opens the create wizard for that list after the page loads.
- AC-3.12.12 — From Lists, **Run workflow** → **Custom** tab shows only workflows already built for that list (or workspace); empty state directs the GP to **New workflow** on `/workflows`.
- AC-3.12.13 — All four seeded workflow cards (Tomo defaults + Tailored) render as **active** on the list (no inactive / "Not running" demo state); expanded bodies show monitor-only copy and do not offer **Configure run** as the primary expanded affordance.
- AC-3.12.14 — Process flows render **trigger** as the first node, then actions: Post-Meeting = meeting ends → capture → follow-up; Themed = launch with topic → **Themed insight outreach** → wait → optional follow-up; Trip = **send trip emails to list** → outreach → monitor/schedule replies → follow-up if no response.
- AC-3.12.15 — **Locked defaults** show no delete control on the card. **Tailored** and **user custom** workflows show delete with confirm; deleting removes the workflow from the list context. **User custom** saved workflows show **Activate** in the expanded banner; there is no toggle to turn an active workflow off.
- AC-3.12.16 — **Trigger** step: `confirm_workflow_trigger` sets trigger text and advances eligibility; GP saying **yes** (or equivalent) calls `advance_workflow_wizard_step` or client fallback advances to **Action** without a redundant date-confirmation card.
- AC-3.12.17 — **Action** step: uploading a `.docx` or text-layer `.pdf` shows parsed status (e.g. `· pdf · parsed`); extracted text is available to Tomo on the action chat. Uploading an unsupported type or a scanned PDF with no text shows an error and does not add the file. Before the first send, the right column shows an **8-row** prompt inbox (placeholder **“Describe your action …”**) with no message history; after send, the UI switches to conversation bubbles and a **single-line** input. Suggestion pills pre-fill the initial inbox. Tomo conversation refines an action creation prompt; `confirm_workflow_action_prompt` sets `tomoInstruction` and enables **Generate drafts**; Tomo does not output the full email body in chat.
- AC-3.12.18 — **Draft** step: **Generate drafts** calls `/api/tomo/generate-workflow-cohort-draft` and populates editable action description, subject, and body; **Regenerate** re-calls the endpoint; GP can edit fields before **Next — personalise per LP**; **Approve all** on Draft saves with cohort base drafts only; **Save & finish** on **Personalise** saves per-LP overrides. Closing the dialog before **Save & finish** does not persist the workflow.
- AC-3.12.19 — Tab header shows all five steps; GP can navigate only to steps already reachable from completed fields (name → confirmed trigger → confirmed action prompt → generated drafts → personalise when enabled).
- AC-3.12.20 — **Personalise** step: left LP list + right single editor; selecting an LP loads that LP's draft (or cohort base); edits mark the LP draft as personalised; **Save & finish** writes `actionBuild` including `lpDrafts[]`.
- AC-3.12.21 — A **saved (inactive)** custom workflow expanded card shows **Edit action** and **Activate**; **Edit action** opens the wizard with name, trigger, primary action, drafts, and attachments restored (**Primary | Follow-up** tabs when follow-up exists); **Save & finish** updates the existing workflow (same id) and refreshes the card.
- AC-3.12.25 — **Add follow-up** on Personalise opens the follow-up leg sub-wizard; **Save workflow with follow-up** persists `followUp` with valid trigger + `send_email` + cohort template; process flow shows trigger → primary → wait (if wait trigger) → follow-up.
- AC-3.12.26 — **Activate** on a custom workflow with follow-up enrolls LPs with primary + deferred follow-up step runs; `launch_parameters` includes `primary_step_id`, `follow_up_step_id`, trigger kind, and wait days.
- AC-3.12.27 — After primary send + wait elapse (mock: backdated `sentAt` + page reload), follow-up step runs become `in_progress`; expanded card shows **Follow-up** segment counts and optional “follow-up drafts ready” attention that opens the follow-up monitor drawer.
- AC-3.12.28 — **Generate follow-up drafts** calls `generate-workflow-cohort-draft` with `draftKind: "follow_up"` and `primaryTemplate`; subject/body reference primary template context.
- AC-3.12.29 — Reply attributed to primary before wait elapses skips wait-based follow-up (`skipped`); `on_inbound_reply` follow-up activates on attributed reply.
- AC-3.12.30 — Active custom workflow: clicking primary, wait, and follow-up process nodes opens monitor drawer with step-appropriate metrics (no approve/send controls).
- AC-3.12.22 — **Production:** when a GP sends an approved workflow-step email that was configured with wizard uploads, the outbound message includes the stored original file(s) from `actionBuild.attachments` (within product size/type limits).
- AC-3.12.23 — Active **Themed Outreach** (and other monitor-only seeded cards) show header stats such as **Running now** and **Replied**, not **Awaiting approval**.
- AC-3.12.24 — Dedup still skips duplicate outbound sends per BR-3.12.3 when the Outbound safety meta line is hidden from the expanded card UI.

---

### 3.13. Meeting lifecycle (prep, transcripts, post-meeting capture)

**Description.** End-to-end lifecycle around an LP meeting: prep brief generated ahead, transcript and AI recap ingested after, post-meeting capture form within 60 seconds, follow-up draft within 30 minutes. Microsoft Teams transcripts via Microsoft Graph; Google Meet transcripts via the Meet REST API and Drive. AI recaps from Microsoft 365 Copilot or Gemini for Workspace where licensed; otherwise TOMO LLM fallback against the raw transcript.

**Inputs / triggers.**

- A new `lp_calendar_events` row created for an LP-attended meeting.
- 30 minutes before meeting → prep brief generation kicks off.
- Meeting end (`status='completed'`) → transcript poll + recap fetch + post-meeting capture surface + follow-up draft generation.
- GP completes post-meeting capture form.

**Processing — prep brief.**

1. 30 min before meeting: read recent context (`lp_meeting_recaps` from prior meetings, last 5 `lp_interactions`, `lp_state`, open `commitments`, `open_loops`).
2. Generate prep brief using LLM with structured prompt: unanswered questions, missed/promised materials, relationship context, suggested focus, recent documents exchanged.
3. Write `briefs` row with `brief_phase='prep'`, `generated_by='tomo_llm'`.
4. Surface in Action Drawer as `action_type='meeting_prep'`. GP viewing the brief sets `briefs.viewed_at` and writes `tomo_action_log` outcome `viewed`. The same prep payload SHOULD power the **Coming up meeting prep drawer** on Today (§3.9 item 10) when the row references the same meeting / brief.

**Processing — transcript ingestion.**

1. **Microsoft Teams.** Per minute after meeting end, poll `GET /me/onlineMeetings/{id}/transcripts` (requires `OnlineMeetingTranscript.Read.All`). When available, fetch the transcript content (`GET /me/onlineMeetings/{id}/transcripts/{transcriptId}/content?$format=text/vtt` for raw or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` for Word). Parse into structured speaker turns. Write `lp_meeting_transcripts`.
2. **Google Meet.** Read the Meet conference record via `meet.googleapis.com/v2/conferenceRecords` (requires `meetings.space.readonly`). Find the linked transcript Doc in Drive (requires `drive.meet.readonly`). Fetch and parse. Write `lp_meeting_transcripts`.

**Processing — AI recap ingestion.**

1. **Path A — Microsoft 365 Copilot.** When `OnlineMeetingAiInsight.Read.All` is granted and the user has a Copilot licence: `GET /me/onlineMeetings/{id}/aiInsights` (beta endpoint). Parse summary, action items, decisions. Write `lp_meeting_recaps` with `recap_source='ms_copilot'`.
2. **Path B — Gemini for Workspace.** When the GP uses Gemini's "Take notes for me" feature, the notes are saved as a Doc in Drive linked to the Meet conference record. Fetch via `drive.meet.readonly`. Write `lp_meeting_recaps` with `recap_source='google_gemini'`.
3. **Path C — TOMO fallback.** When neither Path A nor Path B yields a recap (no licence or feature not used), TOMO runs its own LLM against `lp_meeting_transcripts.transcript_text`. Generates summary, key points, action items, decisions, unanswered questions. Write `lp_meeting_recaps` with `recap_source='tomo_llm'`.
4. Recap path priority: A → B → C. The first available wins per meeting; if A succeeds, C does not run.

**Processing — post-meeting capture form.**

1. Within minutes of meeting end, surface a single Action Drawer card (`action_type='post_meeting_note'`) pre-filled from the recap.
2. Form is ~10 fields per V1 Final F8. Targets <60 seconds completion. Single-prompt rule (one card per meeting; no nagging).
3. Fields (V1 set):
   - Meeting outcome (one-line).
   - Mandate fit chip (confirmed_fit / potential_fit / mandate_mismatch / unknown) — only surfaced when stage is appropriate (post-`first_meeting`).
   - Stage chip (allow stage advance / hold / decline).
   - Expected sizing chip (numeric, optional).
   - Commitments captured (pre-filled from recap.action_items_jsonb; GP confirms).
   - Open loops created from this meeting (auto-detected; GP confirms).
   - Free-text notes (optional).
4. On submit: writes `briefs` (`brief_phase='post_meeting'`), updates `lp_contacts.mandate_fit`, `pipeline_stage`, `expected_commitment_amount` as appropriate (each as a separate confirmed mutation per Manual Update Principle), creates `commitments` and `open_loops` rows.
5. Skip option allowed; logs `tomo_action_log.outcome='dismissed'` for the post-meeting capture; the `activity_log` records `post_meeting_capture_skipped`.

**Processing — follow-up draft.**

1. Triggered on post-meeting capture submit (or auto, 30 minutes after meeting end if capture skipped).
2. LLM draft using: recap, captured commitments, tone profile.
3. Surface in Action Drawer as `action_type='draft'` with `metadata.template='follow_up'`.
4. Quality bar (per V1 Final F3): aim for approval with fewer than five substantive edits.

**Outputs.**

- `lp_meeting_transcripts`, `lp_meeting_recaps`, `briefs` rows.
- `commitments`, `open_loops` rows.
- `tomo_action_log` rows for prep, capture, follow-up.
- Updates to `lp_contacts.mandate_fit`, `pipeline_stage`, `expected_commitment_amount` per GP confirmation.

**Business rules.**

- BR-3.13.1 — Transcript ingestion requires the user's per-user OAuth grant covering the relevant meeting. Workspace-level service-account access is **not** used.
- BR-3.13.2 — Path-C TOMO fallback is the default for any meeting where Path A or B doesn't yield a recap within 10 minutes of meeting end.
- BR-3.13.3 — Post-meeting capture is one prompt per meeting (no re-nag).
- BR-3.13.4 — Follow-up draft generation depends on tone calibration completion. If `tone_profiles` is missing or stale, generation proceeds with a generic-tone hint surfaced to the GP.
- BR-3.13.5 — Transcript text retention follows the same 12-month full-content rule as email bodies (per §6.4); after 12 months the `transcript_text` field is nulled but `transcript_jsonb` summary turns are retained.
- BR-3.13.6 — Recap ingestion respects user privacy: TOMO does not log raw transcript content to application logs; only durations, speaker counts, and id references.

**Acceptance criteria.**

- AC-3.13.1 — A Teams meeting ending at 14:00 produces a transcript row by 14:05 (for tenants with transcript enabled).
- AC-3.13.2 — A Meet meeting ending at 14:00 produces a transcript row by 14:10 (Drive sync delay tolerance).
- AC-3.13.3 — A meeting where neither M365 Copilot nor Gemini for Workspace is licensed produces a TOMO-LLM recap with summary, key points, action items, and decisions populated within 10 minutes of meeting end.
- AC-3.13.4 — A post-meeting capture form completed in <60 seconds writes the brief, updates the LP fields confirmed, and creates the commitments confirmed.
- AC-3.13.5 — A skipped post-meeting capture still produces a follow-up draft in the Action Drawer within 30 minutes of meeting end (using whatever recap is available).
- AC-3.13.6 — Three substantive edits to a generated follow-up draft remain inside the V1 Final F3 quality bar.

---

### 3.14. Tomo agent orchestration

**Description.** Tomo is the in-app AI agent. Streamed responses via the Vercel AI SDK. Surface-gated tools; not every tool is callable on every page. Mutations require GP confirmation. Audit-grade logging of every tool invocation.

**Inputs / triggers.**

- User types or speaks (text-only V1) into Tomo (inline chat on Today and Workflows; FAB → dock/sheet on other pages).
- Tomo receives the user's message plus surface context (current page, selected LP, today's actions, etc.).
- Tomo decides whether to call a tool and emits the call for execution.

**Processing.**

1. **Endpoint.** `POST /api/tomo/orchestrate` is the unified endpoint. Streaming via Vercel AI SDK. Surface parameter `(home | workflows | workflow_creator | drawer | relationships | lists | targets | activity | materials | search | settings | insights | today)` gates the tool set.
2. **Tools (canonical names from mock).**
   - `filter_relationships` — read-only; returns a filter spec the UI applies.
   - `update_workflow` — mutation; surface=workflows; requires confirmation.
   - `update_crm` — mutation; surfaces=drawer/relationships/today; requires confirmation.
   - `draft_reply` — generative; mutation on send; requires GP send.
   - `create_user_workflow` — mutation; surface=**workflow_creator** only; input: `name`, `trigger`, typed `action`; used for **Lists** pipeline custom attach flow (legacy one-shot chat). On `/workflows` **New workflow**, the client persists via **Save & finish** (`appendCustomPlaybookWithActionBuild`) — not on this tool call.
   - `confirm_workflow_trigger` — mutation; surface=**workflow_creator** when `workflowCreator.wizardStep='trigger'`; input: `trigger`, optional `summary`, optional `inferred_default_time`; sets wizard trigger state (no persistence).
   - `confirm_workflow_action_prompt` — mutation; surface=**workflow_creator** when `workflowCreator.wizardStep='action'`; input: `instruction`, optional `action_description`, optional `action_kind`; sets wizard action creation prompt (`tomoInstruction`, `actionDescription`, `actionPromptConfirmed`) — no persistence, no cohort email generation.
   - `advance_workflow_wizard_step` — non-persisting; surface=**workflow_creator** when `wizardStep='trigger'` and trigger already confirmed; advances client to **Action** step when GP agrees to continue.
   - **`POST /api/tomo/generate-workflow-cohort-draft`** — generative; **not** an orchestrator tool; called by the wizard **Draft** step and follow-up leg when the GP clicks **Generate drafts** / **Regenerate** / **Generate follow-up drafts**. Input: `workflowName`, `listName`, `instruction`, `contextText`, optional `trigger`, optional `attachmentNames`, optional `draftKind` (`primary` | `follow_up`, default `primary`), optional `primaryTemplate` (`subject`, `body`, optional `trigger`, optional `actionDescription`) for contextual follow-up drafts. Output: structured `subject`, `body`, `actionDescription`, `usedLlm` (LLM via Vercel AI SDK `generateObject`; deterministic fallback when `OPENAI_API_KEY` is absent).
   - **`POST /api/workflows/launch`** — enrolls cohort; accepts `stepPlan` (primary + optional follow-up step ids). Mock: `launchWorkflowCohort`.
   - **`POST /api/workflows/record-send`**, **`POST /api/workflows/attribute-reply`** — outbound tagging and inbound reply attribution; reply path may advance follow-up legs per §3.12 item 4.
   - `capture_post_meeting` — mutation; surface=drawer; requires confirmation per field.
   - `compose_meeting_prep` — generative; produces a brief; non-mutating beyond inserting a `briefs` row.
3. **Tool gating.** A surface that doesn't list a tool in its allow-list cannot invoke it. This is enforced server-side regardless of what the model emits.
4. **Confirmation gate.** Every mutation tool returns a "proposed change" payload. The UI renders a confirm/cancel choice. On confirm, the same `agent_tool_calls` row's `confirmation_status` flips to `confirmed` and the change is applied.
5. **Audit.** Every tool call writes a row to `agent_tool_calls` with arguments, result, latency, model, surface, and confirmation status. Errors land in `error`.
6. **Streaming UX.** Token-by-token rendering. First-token latency target ≤ 1.5s (P75) per §5.1.
7. **Privacy.** LLM provider configured for zero retention. No training on customer data. Per §5.4.

**Outputs.**

- Streamed response text rendered in chat.
- `agent_tool_calls` rows.
- Downstream effects per tool (CRM update, workflow change, draft).

**Business rules.**

- BR-3.14.1 — A surface that does not allowlist a tool must reject the tool call with HTTP 403 even if the model emits it.
- BR-3.14.2 — Every mutation tool requires confirmation; auto-execution is disabled in V1.
- BR-3.14.3 — Tool arguments and results are stored in `agent_tool_calls.arguments_jsonb` / `result_jsonb`. Sensitive content (e.g. draft text) is logged as the model emits it; PII is not stripped, but access is limited to workspace members and to TOMO staff only via `data_access_log`-tracked queries.
- BR-3.14.4 — A streaming connection that drops mid-response should still produce a final state (confirmed or cancelled) — the UI prompts the user on reconnect.
- BR-3.14.5 — Tomo never volunteers proposals to send emails. The user has to ask.

**Acceptance criteria.**

- AC-3.14.1 — Tomo on Today receives `todayContext` and answers a question grounded in the rendered actions.
- AC-3.14.2 — A `filter_relationships` tool call returns a filter that, applied client-side, matches the same set of LPs the GP would see by clicking the named filter manually.
- AC-3.14.3 — An `update_crm` proposal showing "Set Peter's mandate_fit to confirmed_fit?" requires explicit confirm before the field is written.
- AC-3.14.4 — Calling `update_workflow` from `surface=relationships` returns a 403 because Workflows is the only surface that allows it.
- AC-3.14.5 — Every Tomo response leaves an `agent_tool_calls` row visible in the audit log within 1 second of completion.
- AC-3.14.6 — `create_user_workflow` is rejected with HTTP 403 when `surface≠workflow_creator`; it is not callable from `surface=workflows`, Today, or Lists.
- AC-3.14.7 — When `workflowCreator.listPreselected=true` (non-wizard Lists attach), the orchestrator instructs Tomo not to ask which list to use and to derive `name` from trigger + action when sufficient.
- AC-3.14.8 — When `workflowCreator.wizardStep='trigger'`, only `confirm_workflow_trigger` and `advance_workflow_wizard_step` are exposed; `create_user_workflow` returns 403 if emitted.
- AC-3.14.9 — When `workflowCreator.wizardStep='action'`, only `confirm_workflow_action_prompt` is exposed; confirmed trigger, context text, uploaded attachment names, and any already-confirmed instruction are injected into the system prompt when present.
- AC-3.14.10 — **Generate drafts** on the wizard Draft step returns LLM-generated subject/body when `OPENAI_API_KEY` is configured; when absent, the endpoint returns a deterministic template fallback and the UI indicates offline/mock mode.

---

### 3.15. Activity log

**Description.** Audit-grade activity event log per Tomo MVP3 §C.12. Filterable by fund, type, date, actor. Backed by the `activity_log` append-only table. Surfaces at `/activity`.

**Inputs / triggers.**

- Postgres triggers on audited tables (`lp_contacts`, `lp_organizations`, `lp_state` (specific columns), `funds`, `workspaces`, `workspace_members`, `oauth_tokens`).
- Application-level inserts for non-table-mutation events (draft sent, signal flag changed, re-engagement detected, workflow step lifecycle, post-meeting capture completed/skipped).

**Processing.**

1. Triggers and application code insert rows into `activity_log` per §6.2.9.
2. UI at `/activity` paginates with filters by fund (when LP is fund-scoped), action type, date range, actor user.
3. Each row renders: time, actor, action, target description, before/after diff (when applicable), and a click-through to the target entity.

**Outputs.**

- `activity_log` rows; UI rendering only.

**Business rules.**

- BR-3.15.1 — `activity_log` is append-only; no edits, no deletes (except via account-deletion procedure with documented justification).
- BR-3.15.2 — Sensitive content in `before_jsonb` / `after_jsonb` (e.g. note bodies) is preserved verbatim — this is an audit log, not a privacy log; access is RLS-scoped to workspace members.
- BR-3.15.3 — Retention is indefinite per §6.4 V3 dataset principle.

**Acceptance criteria.**

- AC-3.15.1 — An LP stage change writes a row visible in `/activity` within 5 seconds.
- AC-3.15.2 — Filtering by `action='draft_sent'` for the last 7 days returns the count matching `tomo_action_log` for the same period and outcome.

---

### 3.16. Settings (profile, funds, integrations, notifications, billing, team)

**Description.** Settings (`/settings`) groups account-level configuration. Sub-pages: Profile, Funds, Integrations, Messaging (Slack), Notifications, Billing, Team.

**Sub-page processing.**

1. **Profile.** Display name, photo, timezone, language. **Appearance:** colour theme preference `system` | `light` | `dark`. Default is **system** (follow the browser or OS `prefers-color-scheme`). The user may override with an explicit light or dark choice; the preference is persisted in `user_preferences` (mock: client storage key `tomo-appearance-preference`). Product chrome and Tomo AI affordances use the **teal** accent defined in the visual language (replacing any legacy peach-only AI styling). Writes `users` and `user_preferences`.
2. **Funds.** Per-workspace funds; raise target, target close, currency, concentration threshold (read-only V1, hardcoded 20%; editable V1.5).
3. **Integrations.** Status banner per provider (`microsoft`, `google`, `slack`, `affinity`). Connect / Reconnect / Disconnect buttons. Health and last-success timestamp from `crm_sync_status`. Granted scopes listed (audit visibility).
4. **Messaging (Slack).** Slack workspace connection via OAuth. Default channel selector. Per-event channel override.
5. **Notifications.** Per-user, per-event-class channel preferences (per `notification_channels` table). Quiet hours.
6. **Billing.** Stripe customer portal link (managed by Stripe; no in-app card entry). Plan tier visible to all members; payment details visible to owner only.
7. **Team.** Member list, invite, revoke, transfer (manual via support in V1). All members have identical permissions in V1.

**Outputs.**

- Updates to `users`, `user_preferences`, `notification_channels`, `funds`, `slack_workspace_connections`, `oauth_tokens`, `workspace_members`.
- `activity_log` rows for sensitive changes (integration_connected/disconnected, member invited/joined/removed, fund_target_changed).

**Business rules.**

- BR-3.16.1 — Disconnecting an integration revokes the OAuth grant upstream when possible, marks `oauth_tokens.revoked_at`, sets `crm_sync_status.health='disconnected'`, and pauses dependent workers.
- BR-3.16.2 — Stripe payment information is never entered in TOMO; the customer portal is the only payment surface.
- BR-3.16.3 — Workspace transfer is unavailable in the in-product UI; users see a "Contact support" affordance with a templated email.

**Acceptance criteria.**

- AC-3.16.1 — Disconnecting Microsoft Graph in Integrations triggers the upstream revoke and surfaces a "Reconnect to resume sync" banner on Today within 30 seconds.
- AC-3.16.2 — Adding another member via invite succeeds when prerequisites are met (matching email accept, unused token); UI does not show a numeric member cap error.
- AC-3.16.3 — A workspace owner sees billing details; a non-owner member sees plan tier but not card information.
- AC-3.16.4 — Changing **Appearance** to light or dark applies immediately and survives reload; **system** tracks OS/browser theme changes without requiring a reload.

---

### 3.17. Search

**Description.** Global search at `/search` and via Cmd/Ctrl+K shortcut. Searches LPs, organizations, meetings, briefs, workflows, materials, and notes. Postgres full-text search + pg_trgm in V1; Algolia / Pinecone deferred to V2.

**Processing.**

1. Postgres `tsvector` columns added to searchable tables (`lp_contacts`, `lp_organizations`, `briefs`, `workflows`, `materials`, `lp_notes`) populated by triggers.
2. Search query: `tsquery` against `tsvector` with rank ordering; pg_trgm for fuzzy match on names.
3. Results grouped by entity type with click-through to the entity page.
4. RLS ensures cross-workspace results are impossible.

**Acceptance criteria.**

- AC-3.17.1 — Searching for "CPPIB" returns matching LPs and organizations with click-through to detail pages.
- AC-3.17.2 — A 1-character typo ("CPPI") still matches "CPPIB" via trigram fallback.
- AC-3.17.3 — Search latency P95 ≤ 400ms for a workspace with 500 LPs.

---

### 3.18. Notifications (Email, Slack)

**Description.** Outbound notifications across channels. Daily Brief (§3.8); urgent re-engagement push; missed-reply push (per tier); open-loop reminder push; commitment due push; cooling-caught push; workflow-step-approval-needed push. Per-channel preferences in `notification_channels`.

**Processing.**

1. Notification worker subscribes to internal events (`reminders` due, `lp_signal_log` re_engagement, etc.).
2. For each event, looks up the recipient user, resolves their `notification_channels` preferences for the event class, and dispatches per channel.
3. **Email.** Postmark or AWS SES. Templated HTML. `email_delivery_log` row per send.
4. **Slack.** `chat.postMessage` to the user's default Slack DM (when Slack is connected and user has opted in). Block layout. Threading for detail.
5. **In-app.** A notifications drawer accessible from the avatar menu shows recent notifications with read/unread state.
6. Quiet hours respected per `notification_channels.quiet_hours_*`.

**Outputs.**

- `email_delivery_log` rows for email.
- `activity_log` rows for Slack and in-app delivery.

**Business rules.**

- BR-3.18.1 — Daily Brief delivery cadence and time per `user_preferences`. All other notifications are event-driven.
- BR-3.18.2 — A re-engagement urgent push always fires regardless of quiet hours (institutional-acceptable; scoped to a small number per week).
- BR-3.18.3 — A missed-reply push for a tier 1 LP fires once at threshold breach; no nag thereafter.

**Acceptance criteria.**

- AC-3.18.1 — A re-engagement detected at 21:00 local time delivers an in-app notification immediately and a Slack DM if Slack is enabled.
- AC-3.18.2 — A missed-reply push for a T1 LP is sent exactly once.
- AC-3.18.3 — Quiet hours from 22:00–07:00 suppress non-urgent notifications during the window.

---

## 4. External Interface Requirements

This section specifies the contracts between TOMO V1 and the systems and humans it interacts with. §4.1 covers user-facing UI expectations. §4.2 enumerates every external API TOMO calls (Microsoft, Google, Slack, Stripe, **Affinity / Backstop (native CRM read)**, LLM, email transactional, observability) and every internal route TOMO exposes. §4.3 confirms hardware non-dependence. §4.4 covers the protocol layer.

---

### 4.1. User interfaces (UX expectations)

**Description.** V1 ships a responsive web application. Desktop-first design with full mobile-responsive support. UI patterns are inherited from the mock app (`tomo_crm`) and refined per the V1 Final non-negotiables. No native mobile apps in V1.

**Layout — desktop (≥ 768px viewport).**

- **Three-pane shell:** left nav rail (fixed, icons only, ~64px) → middle list pane (resizable) → right detail pane (resizable). User-resizable split persisted in `user_preferences.pane_width_px`.
- **Header:** TOMO wordmark, fund selector (when workspace contains > 1 fund), avatar menu (Profile / Settings / Sign out).
- **Tomo presence:**
  - **Inline chat** on Today (`/home`) and Workflows (`/workflows`) — embedded in the main content column.
  - **FAB → dock** on Relationships, Lists, Insights, Activity, Search, Settings, Materials. FAB is bottom-right; dock is fixed 520px wide; `max-w-[90vw]` on smaller desktops.
  - **No Tomo** on Auth and Onboarding (pre-onboarding).

**Layout — mobile (< 768px viewport).**

- **Stacked single-column layout.** List above detail; navigation through bottom-bar tabs.
- **Bottom navigation:** five primary destinations — Today, Relationships, Lists, Workflows, Settings. Insights and Activity reachable via the avatar / overflow menu.
- **Tomo presence:** FAB at `bottom-16 right-4` (above bottom nav). Tap opens a bottom sheet (70–92vh).
- **Touch targets:** 44×44 px minimum per iOS HIG and Material guidelines.

**State surfaces.**

- **Empty states.** Every list and surface has an explicit empty state with a one-line "what to do next" affordance. Never a blank page.
- **Loading states.** Skeletons for list views; spinners only for sub-second waits. Long-running ingestions (onboarding screens 5/6) show a *progress narrative* — text describing what's happening — not a generic spinner. (Per Tomo MVP3 §C.2 and V1 Final risk #1.)
- **Error states.** Inline banner with action (Retry / Reconnect / Contact support). Error toasts for transient failures. No silent failures.
- **Sync staleness banner.** Per §3.3: surfaces on Today and Lists when `crm_sync_status.health` is `degraded` or `failing`. Includes last-success timestamp and Reconnect action.

**Visual system.**

- **Typography.** Newsreader serif for greeting and decorative; system sans for body and UI. Numeric data uses JetBrains Mono (per mock baseline).
- **Color palette.** Navy `#0F1F3D`, teal `#0D7377`, slate `#4A5568`, formula-grey `#6B7280` (per Insights spec). G/A/R flags use semantic green/amber/red — not the brand colours.
- **Density.** Comfortable density default; compact density toggle in Settings → Profile (V1.5).

**Interaction patterns.**

- **Lists surface (index + list detail).** Follow `design/tomo_lists_v1.html` for layout, section structure, list row geometry (icon column, filter / description block, live–manual pill, counts, workflow line), drawer IA (funnel, **LP row table**, workflows, **drawer actions**, **link workflow** modal), and disabled **New list** / **Import cohort** placeholders (§3.11 AC-3.11.3–AC-3.11.7).
- **Workflows surface (`/workflows`).** Follow `design/tomo_workflows_v8.html` for list-scoped control room: left **Your lists** rail, list header with **New workflow** CTA, **Tomo defaults** and **Tailored** seeded cards (all **active**, monitor-only when expanded), **Built on this list** for `user_custom` workflows (**Edit action** with Primary | Follow-up when configured, **Activate**, optional **Add follow-up** in wizard; **delete** with confirm for Tailored + custom; **no delete** on locked defaults), **no on/off toggle** on cards, trigger-first inline process flow (primary → wait → follow-up when configured), **stateSummary** segments + operational attention strip on active custom runs, accordion expansion, **monitor-only** step drawer on active cards, and the **five-step primary wizard** plus optional **follow-up leg** sub-wizard (§3.12 AC-3.12.4–AC-3.12.30). Wizard Tomo chat uses `workflow_creator` with `wizardStep` (`trigger` | `action`).
- **Manual Update Principle.** GP edits CRM fields by talking to Tomo in plain language ("Peter sized at $25M") OR by direct field-edit on the LP card. Tomo's proposal always renders a confirm/cancel before write. Per Tomo MVP3 / Section 8 §3.10 / §3.14.
- **Single-prompt rule.** Post-meeting capture surfaces once per meeting. No re-nag.
- **Confirmation gates.** Every mutation requires explicit user click. No auto-send, no auto-mutate.
- **Keyboard shortcuts.** Cmd/Ctrl+K opens global search. ⌘/⌃+Enter sends a Tomo message. ⎋ closes drawers.
- **Drag-and-drop.** Lists board (Kanban) supports drag to change LP stage; uses `@dnd-kit` (mock baseline).

**Accessibility — WCAG 2.1 AA baseline.**

- All interactive elements keyboard-reachable; visible focus rings.
- ARIA landmarks (`<main>`, `<nav>`, `<aside>`, `<dialog>`).
- Form inputs labelled and described.
- Colour contrast ≥ 4.5:1 for normal text; ≥ 3:1 for large text and UI elements.
- Status messages announced via ARIA live regions where relevant.
- Reader testing with VoiceOver (Safari) and NVDA (Firefox/Edge) before GA.
- Respects `prefers-reduced-motion`; suppresses non-essential animations.
- Touch targets ≥ 44×44 px on mobile.

**Browser support.**

- Chrome, Edge, Safari, Firefox — latest two major versions.
- macOS, Windows, iOS, Android — latest two major OS versions.
- JavaScript required. No no-JS fallback path.

**Performance / responsiveness targets** (§5.1 SLOs apply; UI-specific):

- LCP ≤ 2.5s (P75).
- INP ≤ 200ms (P75).
- CLS ≤ 0.1.
- Tomo agent first-token latency ≤ 1.5s (P75).

**Acceptance criteria.**

- AC-4.1.1 — A new user signing in on iPhone Safari completes onboarding without horizontal scrolling at any step.
- AC-4.1.2 — All primary surfaces are keyboard-navigable from sign-in to draft approval without a mouse.
- AC-4.1.3 — Disabling Slack in Settings → Notifications hides the Slack channel option in Daily Brief delivery without page reload.
- AC-4.1.4 — Sync degradation surfaces the staleness banner within 5 minutes of detection.
- AC-4.1.5 — VoiceOver reads the Lists table G/A/R flag dot as "Red flag, threshold breached" (not just "red dot").

---

### 4.2. Software / API interfaces

This subsection enumerates every external API TOMO calls and every internal API route TOMO exposes in V1.

#### 4.2.1. Microsoft Graph (Outlook, Calendar, Teams, Drive)

- **Tenant model.** Single multi-tenant Azure App Registration. Each GP authorises in their own Microsoft 365 tenant. Application client id and client secret (or certificate) stored in AWS Secrets Manager.
- **Auth.** OAuth 2.0 authorization code with PKCE; delegated permissions only (no application-only access).
- **Token lifetime.** Access tokens 60–90 minutes; refresh tokens long-lived (90 days). Background refresh worker runs at `token_expires_at - 10 minutes`.
- **Scopes (delegated):**

| Scope | Used for |
|---|---|
| `User.Read` | Sign-in profile lookup |
| `offline_access` | Refresh tokens |
| `Mail.ReadWrite` | Read mailbox messages; create drafts |
| `Mail.Send` | Send approved drafts on user's behalf |
| `Calendars.ReadWrite` | Read events; create scheduling holds; create invites on user confirmation |
| `Contacts.Read` | Optional contact import during onboarding |
| `OnlineMeetings.Read` | List user's organised online meetings |
| `OnlineMeetingTranscript.Read.All` | Fetch Teams meeting transcripts |
| `OnlineMeetingArtifact.Read.All` | Recordings and meeting artefacts (needed to enumerate transcripts) |
| `OnlineMeetingAiInsight.Read.All` *(beta)* | Microsoft 365 Copilot AI recap, action items, decisions. Optional — degrades to TOMO LLM fallback when absent. |
| `Files.Read` | Read shared files referenced in emails (V1.5 light) |
| `Subscriptions.Read.All` *(implicit when using subscriptions)* | Manage Graph webhook subscriptions |

- **Endpoints (v1.0 unless beta noted):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/me` | GET | Profile |
| `/me/messages` | GET, POST | List/draft messages |
| `/me/messages/delta` | GET | Incremental sync |
| `/me/sendMail` | POST | Send approved draft |
| `/me/events` | GET, POST | Read/create calendar events |
| `/me/events/delta` | GET | Incremental calendar sync |
| `/me/contacts` | GET | Onboarding contact import |
| `/me/onlineMeetings/{id}` | GET | Meeting metadata |
| `/me/onlineMeetings/{id}/transcripts` | GET | Transcript list |
| `/me/onlineMeetings/{id}/transcripts/{tid}/content` | GET | Transcript content (Word or VTT) |
| `/me/onlineMeetings/{id}/aiInsights` *(beta)* | GET | Copilot AI recap |
| `/subscriptions` | POST, PATCH, DELETE | Manage webhook subscriptions on `/me/messages` and `/me/events` |

- **Rate limits.** Per-tenant and per-app limits enforced by Microsoft. Implementation uses exponential backoff with jitter on `429 Too Many Requests`. Outbound write traffic (sendMail) is well below limits at FC scale.
- **Webhooks.** Subscription resource validates with a token sent in `validationToken` query param on creation. Notifications POST to `https://{tomo}/api/webhooks/microsoft-graph` with `clientState` set; signature verified via the `clientState` plus optional certificate-based proof. Subscription expiry max 3 days; resubscribe worker renews ahead of expiry.

#### 4.2.2. Google Workspace (Gmail, Calendar, People, Meet, Drive)

- **OAuth client.** Single OAuth 2.0 Web Server client in a Google Cloud project. CASA Tier 2 verification required for production scopes (per §5.5).
- **Auth.** OAuth 2.0 authorization code with PKCE. Refresh tokens long-lived (don't expire as long as user stays active).
- **Scopes:**

| Scope | Used for |
|---|---|
| `openid` | Sign-in |
| `https://www.googleapis.com/auth/userinfo.email` | Identify user |
| `https://www.googleapis.com/auth/userinfo.profile` | Profile metadata |
| `https://www.googleapis.com/auth/gmail.readonly` | Read mail (preferred over `gmail.modify` where possible) |
| `https://www.googleapis.com/auth/gmail.send` | Send approved drafts |
| `https://www.googleapis.com/auth/gmail.modify` | Required if drafts are stored as Gmail drafts before send |
| `https://www.googleapis.com/auth/calendar` | Read/write calendar events |
| `https://www.googleapis.com/auth/contacts.readonly` | Contact import |
| `https://www.googleapis.com/auth/meetings.space.readonly` | Read Meet conference records and transcripts |
| `https://www.googleapis.com/auth/drive.meet.readonly` | Read Meet recordings/transcripts in Drive (narrow scope, preferred over `drive.readonly`) |

- **Endpoints:**

| Endpoint | Purpose |
|---|---|
| `gmail.googleapis.com/gmail/v1/users/me/messages` | List, get |
| `gmail.googleapis.com/gmail/v1/users/me/history` | Incremental sync via History API |
| `gmail.googleapis.com/gmail/v1/users/me/messages/send` | Send draft |
| `gmail.googleapis.com/gmail/v1/users/me/watch` | Pub/Sub watch subscription |
| `calendar.googleapis.com/calendar/v3/calendars/primary/events` | Read/write events |
| `calendar.googleapis.com/calendar/v3/calendars/primary/events/watch` | Push notifications |
| `people.googleapis.com/v1/people/me/connections` | Contacts |
| `meet.googleapis.com/v2/conferenceRecords` | Meet conferences |
| `meet.googleapis.com/v2/conferenceRecords/{name}/transcripts` | Transcripts |
| `meet.googleapis.com/v2/conferenceRecords/{name}/transcripts/{tid}/entries` | Speaker turns |
| `meet.googleapis.com/v2/conferenceRecords/{name}/recordings` | Recordings (V1.5+) |
| `www.googleapis.com/drive/v3/files/{id}` | Fetch Gemini "Take notes for me" Doc when present |

- **Rate limits.** Per-user / per-project. Backoff and retry on `429`/`403 rateLimitExceeded`. Daily caps unlikely to bind at FC scale.
- **Push notifications.** Gmail push via Pub/Sub topic that the TOMO project subscribes to. Calendar push via webhook channels POSTed to `https://{tomo}/api/webhooks/google-calendar` with `X-Goog-Channel-Token` header for verification. Channel expiry up to 30 days; resubscribe worker renews ahead.

#### 4.2.3. Slack

- **App model.** Single Slack App distributed via OAuth. Workspace-level installation by an admin user.
- **Scopes (bot):** `chat:write`, `chat:write.public`, `users:read`, `users:read.email`, `team:read`, `channels:read`, `im:write`, `im:history` (for read-back, V1.5).
- **Endpoints:**

| Endpoint | Purpose |
|---|---|
| `slack.com/api/oauth.v2.access` | OAuth exchange |
| `slack.com/api/chat.postMessage` | Daily brief and notifications |
| `slack.com/api/users.lookupByEmail` | Resolve workspace member to Slack user |
| `slack.com/api/auth.revoke` | Disconnect |

- **No Slack-native operating model** in V1 (Tomo MVP3 §C.13 — Slack V1 is push-only).

#### 4.2.4. Stripe

- **Use.** Subscription billing for `individual` and `team` plans. Stripe Customer Portal for payment method management.
- **No card data handled by TOMO.** Customer Portal is the only payment surface (per §5.3).
- **Endpoints / events:**

| Resource | Purpose |
|---|---|
| `POST /v1/customers` | Create Stripe customer at sign-up |
| `POST /v1/billing_portal/sessions` | Generate portal session URL |
| `customer.subscription.created/updated/deleted` webhook | Sync subscription status to `workspaces.subscription_status` |
| `invoice.payment_failed` webhook | Mark `past_due` and notify owner |

- Webhook endpoint: `https://{tomo}/api/webhooks/stripe`. Signature verified via `Stripe-Signature` header.

#### 4.2.5. Native CRM read — Affinity or Backstop (V1 read-only one-way pull)

V1 ships **at least one** read-only connector for **Affinity or Backstop — whichever engineering delivers first** (§3.4). **Both** may ship in V1 if capacity allows; neither obsoletes the CSV path.

##### Affinity

- **Auth.** API key (bearer token) per workspace. Stored in `oauth_tokens` with `provider='affinity'`, encrypted via Supabase Vault.
- **Endpoints (V1 reads only):**

| Endpoint | Version | Purpose |
|---|---|---|
| `/v2/auth/whoami` | v2 | Validate key |
| `/v2/persons` | v2 | LP contacts |
| `/v2/companies` | v2 | LP organisations (Affinity calls them "companies") |
| `/v2/lists` | v2 | Saved lists |
| `/v2/lists/{id}/list-entries` | v2 | List members |
| `/v2/opportunities` | v2 | Deal records when used |
| `/v1/webhooks` | v1 | Subscribe to person/organization events (v1 only) |
| `/v1/persons/{id}/interactions` | v1 | Historical interactions where v2 unavailable |

- **Webhooks.** `person.updated`, `organization.updated`, `list-entry.created/updated/deleted`. Max 3 webhook subscriptions per Affinity instance — TOMO uses 1 slot.
- **No write endpoints called in V1.** `affinity_field_mappings` schema present in V1 migration (per §6.2.5) but unused; bi-directional sync is V2.
- **Rate limits.** 900 requests per user per minute. Sufficient for FC scale.

##### Backstop

- **Auth.** Per licensed Backstop API contract (API key and/or OAuth). Stored in `oauth_tokens` with `provider='backstop'`, encrypted via Supabase Vault.
- **Endpoints (V1 reads only).** Enumerate read routes that map to `lp_organizations`, `lp_contacts`, interactions, and pipeline fields in the **Backstop integration design doc** (exact paths and versions are vendor-contract-specific).
- **Incremental updates.** Prefer vendor webhooks or change feeds; otherwise polling on a documented interval (must meet AC-3.4.4b in §3.4).
- **No write endpoints called in V1.** Backstop bi-directional / SoR write-back is V1.5+ (§9.1).

#### 4.2.6. LLM provider (Google Gemini via Vertex AI)

> **Migration note:** the mock app uses OpenAI via Vercel AI SDK (`@ai-sdk/openai`). **V1 production switches to Google Gemini via Vertex AI** (`@ai-sdk/google` with the Vertex provider). The Vercel AI SDK abstraction lets the call sites stay essentially unchanged — only the provider initialisation changes. Rationale: TOMO already operates a Google Cloud project for the Google Workspace OAuth client and CASA Tier 2 review (per §1.5, §2.4); using Vertex AI in the same GCP project gives enterprise data governance, zero-retention by default, customer-managed encryption keys, and consolidates vendor footprint. Gemini for Workspace is also the same vendor as the upstream Google Meet AI recap path, which simplifies the meeting lifecycle.

- **Provider.** Google Gemini accessed via **Vertex AI** in TOMO's GCP project (not Google AI Studio). Vercel AI SDK Google provider (`@ai-sdk/google` with `createVertex()` configuration).
- **Region.** `us-central1` primary; `europe-west4` available for V1.5 EU-residency customers.
- **Model selection per use case:**

| Use case | Model | Notes |
|---|---|---|
| Tomo agent orchestration (streaming + tool use) | `gemini-2.5-pro` | Strong tool-use; surface-gated tools per §3.14 |
| Draft composition (re-engagement, follow-up, scheduling) | `gemini-2.5-pro` | Quality bar matters more than latency |
| Meeting recap fallback (Path C — TOMO LLM) | `gemini-2.5-pro` | Long context for full transcript |
| Meeting prep brief generation | `gemini-2.5-pro` | |
| Overnight batch classification — scheduling-intent detection (V1 pattern library + LLM tie-break) | `gemini-2.5-flash` | High-volume, low-cost |
| Overnight batch classification — commitment-language detection (V2; V1 is pattern-only) | `gemini-2.5-flash` | (V2; placeholder for V1) |
| Tier-suggestion (lightweight) | `gemini-2.5-flash` | |
| Embeddings (tone-profile similarity, V1.5 RAG) | `text-embedding-005` (Vertex) | Native to Vertex |

- **Privacy configuration.** Per Vertex AI Generative AI service terms:
  - **Zero retention by default.** Vertex AI does not log prompts/responses to Google logs; data is processed in-memory and discarded.
  - **No training on customer data.** Customer data is not used to improve Google's foundation models (per Vertex AI data governance docs).
  - **Customer-managed encryption keys (CMEK)** configurable on the GCP project; V1 uses Google-managed keys (default), CMEK in V1.5 if any FC customer requests.
  - **Data residency** controlled by region selection (us-central1 primary).
- **Authentication.** Service account in TOMO's GCP project with `roles/aiplatform.user`. Service-account key (or workload-identity federation when running on AWS) stored in AWS Secrets Manager.
- **Endpoints (Vertex AI Generative AI API v1):**

| Endpoint | Purpose |
|---|---|
| `POST {region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent` | One-shot generation |
| `POST .../models/{model}:streamGenerateContent` | Streaming generation (Tomo agent) |
| `POST .../models/{embedding}:embedContent` | Embeddings |

- **Rate limits.** Per-project requests-per-minute and tokens-per-minute caps. Application uses per-workspace rate limiting to stay below project caps; quota raises requested as workspace count grows.
- **Failure modes.** On `429 RESOURCE_EXHAUSTED`: retry with exponential backoff. On `5xx`: retry up to 3 times. Persistent failure surfaces "Tomo is busy" inline error and falls back to non-LLM behaviour where defined (e.g. pattern-library-only scheduling-intent detection).
- **Tone-profile prompts.** Tone calibration writes the few-shot prompt-excerpt to `tone_profiles.prompt_excerpt`; the excerpt is vendor-agnostic plain text and works identically against either provider, so a future provider switch costs only the SDK initialiser change.

**Acceptance criteria specific to provider:**

- AC-4.2.6.1 — Vertex AI calls succeed against the configured GCP project with the service account scoped to `roles/aiplatform.user` only.
- AC-4.2.6.2 — Streaming Tomo agent responses begin token emission within 1.5s P75 against `gemini-2.5-pro`.
- AC-4.2.6.3 — A meeting recap fallback (Path C) for a 30-minute transcript completes within 60s.
- AC-4.2.6.4 — No prompt or response is observed in Google Cloud audit logs beyond the API call envelope (zero-retention verified during pen test).

#### 4.2.7. Email (transactional)

- **Provider.** Postmark (primary) or AWS SES (fallback / EU residency in V1.5).
- **Use.** Daily Brief, invitations, password reset, account notifications, reminder digests.
- **Verification.** `Return-Path`, SPF, DKIM, DMARC configured per the chosen provider's docs. Bounce and complaint webhooks ingested to `email_delivery_log`.
- **Templates.** HTML + text alternative per template; rendered server-side from JSX/MJML.
- **Webhook endpoint.** `https://{tomo}/api/webhooks/email-delivery`. Signature verified via provider-specific signing.

#### 4.2.8. Observability and infrastructure

- **Sentry** — error capture from web client and serverless functions; PII-strip middleware applied client-side.
- **PostHog or Vercel Analytics** — product analytics with PII-stripping; events are workspace-id-scoped.
- **CloudWatch** — AWS infrastructure metrics, queue depth, worker latency.
- **Datadog or Grafana Cloud (TBD)** — composite dashboards (V1.5 if Vercel + CloudWatch insufficient).

#### 4.2.9. Internal API surface

All routes are Next.js Route Handlers (App Router) on Vercel except where noted as background workers. Authentication: every request carries a Firebase ID token in `Authorization: Bearer <token>`; the route handler resolves the user, sets `app.workspace_id` for RLS, then queries.

**Existing routes (mock + V1):**

> **Migration note:** the mock exposes `/api/crm/relationships` for LP CRUD. **V1 production renames this to `/api/lp-contacts`** to align with the canonical schema entity name (`lp_contacts`). The mock's frontend imports referencing `/api/crm/relationships` must be updated as part of V1 production wiring. The legacy path is not retained — there is no V1 customer using it. (Tracked in Appendix H.)

| Route | Method | Purpose |
|---|---|---|
| `/api/version` | GET | Returns `{version, buildId}` for deploy detection |
| `/api/tomo/orchestrate` | POST (streaming) | Unified Tomo agent endpoint with surface-gated tools |
| `/api/tomo/chat` | POST | Legacy chat endpoint (deprecate in V1.5; alias to orchestrate) |
| `/api/tomo/drawer-chat` | POST | Drawer-surface variant (alias to orchestrate with `surface=drawer`) |
| `/api/tomo/filter-relationships` | POST | Tool-call entry for filter_relationships (kept for direct call path) |
| ~~`/api/crm/relationships`~~ → `/api/lp-contacts` | GET, POST, PATCH | LP CRUD, filter-aware list (renamed from mock) |
| `/api/email` | POST | Outbound send via connected provider |
| `/api/onboarding/complete` | POST | Mark onboarding completion |
| `/api/cron/daily-brief` | POST | Vercel Cron / EventBridge trigger for daily brief delivery |

**New routes for V1:**

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/session` | GET | Resolve current Firebase session to TOMO user + workspace |
| `/api/auth/account/delete` | POST | Initiate account-deletion flow |
| `/api/workspaces` | POST, GET | Create / list workspaces |
| `/api/workspaces/{id}` | GET, PATCH | Workspace details |
| `/api/workspaces/{id}/members` | GET, POST | List / invite member |
| `/api/workspaces/{id}/members/{userId}` | PATCH, DELETE | Update / remove member |
| `/api/workspaces/{id}/transfer` | POST | Manual workspace transfer (TOMO-staff-only endpoint, audited) |
| `/api/oauth/{provider}/start` | GET | Initiate per-user OAuth flow (microsoft, google, slack, affinity, backstop) |
| `/api/oauth/{provider}/callback` | GET | OAuth redirect handler |
| `/api/oauth/{provider}/disconnect` | POST | Revoke and remove |
| `/api/integrations/status` | GET | Per-source `crm_sync_status` for the workspace |
| `/api/csv-import` | POST (multipart) | Upload CSV |
| `/api/csv-import/{id}/mapping` | GET, PATCH | Get / confirm column mapping |
| `/api/csv-import/{id}/dedupe-decisions` | GET, POST | Review queue |
| `/api/csv-import/{id}/commit` | POST | Finalise import |
| `/api/lp-contacts/{id}` | GET, PATCH | LP detail |
| `/api/lp-contacts/{id}/notes` | GET, POST | Notes |
| `/api/lp-contacts/{id}/timeline` | GET | Activity timeline |
| `/api/lp-state/{id}` | GET | Per-LP signal state |
| `/api/insights/capital` | GET | Metric 1 |
| `/api/insights/day-1-gap` | GET | Metric 2 with trend |
| `/api/insights/moveability` | GET | Metric 3 |
| `/api/insights/concentration` | GET | Metric 4 |
| `/api/insights/time-recovered` | GET | Metric 5 |
| `/api/insights/execution-health` | GET | Metric 6 a/b/c |
| `/api/insights/lists-intel` | GET | Metric 7 (Direction); Metric 8 Fat Middle **ratio + cohort ids** (Insights **omits gauge** in V1 — BR-3.6.9) |
| `/api/insights/raise-momentum` | GET | Metric 9a sparkline data; Metric **9b** inputs (**Insights UI block** deferred §9.1) |
| `/api/insights/close-list` | GET | Metric 10 **Focus list** (implementation MAY alias path as `focus-list`) |
| `/api/workflows` | GET, POST | List, create workflow |
| `/api/workflows/{id}` | GET, PATCH | Workflow detail |
| `/api/workflows/{id}/steps` | GET, POST, PATCH | Step CRUD |
| `/api/workflows/{id}/run` | POST | Trigger run on a list |
| `/api/workflow-runs/{id}` | GET | Run detail |
| `/api/reminders` | GET | List reminders for current user |
| `/api/reminders/{id}` | PATCH | Snooze / resolve / dismiss |
| `/api/meetings/{id}/prep` | GET | Meeting prep brief |
| `/api/meetings/{id}/recap` | GET | Recap (latest path-priority result) |
| `/api/meetings/{id}/post-meeting` | POST | Submit post-meeting capture form |
| `/api/action-log` | GET | Filter / search action log entries |
| `/api/activity-log` | GET | Filter / search activity log entries |
| `/api/search` | GET | Global search across LP / org / brief / workflow / material / note |
| `/api/notifications/preferences` | GET, PATCH | User preferences for notifications |
| `/api/billing/portal-session` | POST | Stripe Customer Portal URL |
| `/api/webhooks/microsoft-graph` | POST | Inbound webhook from Graph subscriptions |
| `/api/webhooks/google-calendar` | POST | Inbound webhook from Calendar push |
| `/api/webhooks/google-pubsub` | POST | Inbound from Gmail watch (Pub/Sub) |
| `/api/webhooks/affinity` | POST | Inbound from Affinity v1 webhooks |
| `/api/webhooks/backstop` | POST | Inbound from Backstop webhooks when the licensed API exposes them (§4.2.5); omit if polling-only |
| `/api/webhooks/slack` | POST | Slack interactivity (V1.5; not used in V1) |
| `/api/webhooks/stripe` | POST | Stripe events |
| `/api/webhooks/email-delivery` | POST | Postmark / SES delivery events |

**Background workers (not Next.js routes):**

| Worker | Trigger | Purpose |
|---|---|---|
| Signal nightly batch | EventBridge cron 02:00 workspace-local | §3.5 |
| Metrics nightly batch | EventBridge cron 02:30 workspace-local | §3.6 |
| Daily brief delivery | EventBridge cron user-local | §3.8 |
| Email backfill workers | Onboarding event + ongoing | §3.3 |
| Token refresh | EventBridge cron 5-minute | §3.1 |
| Webhook resubscribe | EventBridge cron 12-hour | §3.3 |
| Soft-delete purge | EventBridge cron daily | §6.4 |
| Transcript ingestion | Calendar event end | §3.13 |
| Recap fallback (TOMO LLM) | 10-minute timeout after meeting end | §3.13 |
| Re-engagement hot path | New inbound `lp_interactions` row | §3.5 |

**Common request/response conventions.**

- All requests: `Authorization: Bearer <firebase-id-token>`, `Content-Type: application/json`.
- All responses: JSON with `{data, meta}` envelope; errors: `{error: {code, message, details}}` with stable error codes.
- HTTP status codes used per RFC: `2xx` success, `4xx` client errors, `5xx` server errors.
- Pagination: cursor-based via `?cursor=<opaque>` and `?limit=N` (max 100).
- Idempotency: mutation routes accept optional `Idempotency-Key` header; webhook handlers de-dupe on provider message id.
- Rate limiting: per-user, per-route. Returns `429` with `Retry-After` when limits exceeded.

**Acceptance criteria.**

- AC-4.2.1 — Every external API call is rate-limited and retried with exponential backoff on `429` and `5xx`.
- AC-4.2.2 — Every webhook handler verifies the inbound signature before processing.
- AC-4.2.3 — Every internal route enforces Firebase auth + RLS workspace scoping.
- AC-4.2.4 — Disconnecting a Microsoft Graph integration in Settings revokes the subscription on Microsoft's side within 30 seconds.
- AC-4.2.5 — A Stripe `customer.subscription.deleted` webhook updates `workspaces.subscription_status='canceled'` and pauses ingestion workers within 1 minute.

---

### 4.3. Hardware interfaces

**Description.** V1 has no direct hardware dependencies beyond a standard browser-capable client device (laptop, desktop, tablet, smartphone). Specifically:

- **Camera, microphone:** not used. Meeting transcripts come from MS Teams / Google Meet via API; TOMO does not record audio or video itself.
- **GPS / location:** not used.
- **Biometric sensors:** not used. Sign-in uses Firebase Auth; passkeys are deferred (V1.5).
- **Printers:** not used. PDF export of selected views (Insights, briefs) is V1.5.
- **Storage media:** browser local storage is used only for non-sensitive UI state (pane width, last-seen daily brief date) — never for tokens, never for LP data.

**Acceptance criteria.**

- AC-4.3.1 — A new install requires no native client component and no permission prompt for camera, microphone, or location.

---

### 4.4. Communications interfaces

**Description.** V1 communicates exclusively over HTTPS / TLS. Streaming uses Server-Sent Events (preferred over WebSockets where Vercel AI SDK already abstracts it). Webhook deliveries are signed by the provider and verified by TOMO.

**Protocols.**

- **HTTP/1.1 and HTTP/2 over TLS 1.2+.** TLS 1.3 preferred where the client supports it. Plain HTTP redirects to HTTPS at the edge (Vercel default).
- **Streaming.** Vercel AI SDK uses `text/event-stream` (Server-Sent Events) for Tomo agent streaming. WebSockets are not used in V1.
- **Webhook signature verification.**
  - Microsoft Graph: `clientState` token comparison plus optional certificate-based proof per Microsoft's docs.
  - Google Calendar push: `X-Goog-Channel-Token` and `X-Goog-Resource-State` validation.
  - Google Pub/Sub: JWT signature verification on the message envelope.
  - Affinity: shared-secret HMAC of the request body (per Affinity webhook docs).
  - Backstop: per vendor contract (shared secret, JWT, or mTLS — captured in integration design doc).
  - Stripe: `Stripe-Signature` header HMAC verification with the webhook secret.
  - Slack: `X-Slack-Signature` HMAC verification.
  - Postmark / SES: provider-specific signing.
- **CORS.** API routes restrict CORS to the production domain plus preview deploys. No wildcard origins.
- **CSRF.** State-changing routes that don't already require an `Authorization` header (none in V1) would require a CSRF token; since all routes require Bearer auth, CSRF is not a vector.
- **Email envelope.** SPF / DKIM / DMARC configured for the sending domain. DMARC `p=quarantine` minimum, `p=reject` after 90 days of clean monitoring.

**Network policy.**

- Outbound calls from Vercel functions and AWS workers go to the documented external endpoints listed in §4.2. No other outbound destinations.
- Inbound connections accepted only via Vercel edge (web + API) and AWS API Gateway / Lambda function URLs (workers). All other ports closed.

**Acceptance criteria.**

- AC-4.4.1 — TLS handshake against `https://{tomo}` rejects TLS 1.0 and TLS 1.1.
- AC-4.4.2 — Every inbound webhook with an invalid or missing signature returns `401` and is not processed.
- AC-4.4.3 — A Tomo streaming response continues to render after a network interruption of < 2 seconds (SSE auto-reconnect).

---

## 5. Non-Functional Requirements

This section specifies the non-functional commitments for V1: performance, reliability, security, privacy, compliance, scalability, usability/accessibility, observability, retention, and internationalisation. Every NFR has a target, an implementation approach, and acceptance criteria. The section is consciously MVP-grade — institutional-acceptable, not over-engineered. Per the V1 Final risk register, over-engineering is a real V1 risk; the targets below reflect the *minimum* posture that clears institutional security diligence and gives FC GPs confidence, not the maximum any cloud platform can offer.

---

### 5.1. Performance

**Description.** V1 performance targets are split into three categories: (a) interactive UX (page loads, agent latency, API responses); (b) ingestion and computation (sync, batch jobs); (c) event-driven hot paths (re-engagement, daily brief delivery).

**Targets — interactive UX (per session, P75 unless stated):**

| SLO | Target | Source / rationale |
|---|---|---|
| Page TTFB | ≤ 600 ms | Standard |
| Page LCP (Largest Contentful Paint) | ≤ 2.5 s | Web Vitals |
| Page INP (Interaction to Next Paint) | ≤ 200 ms | Web Vitals |
| Page CLS (Cumulative Layout Shift) | ≤ 0.1 | Web Vitals |
| Insights page load (500 LPs) | ≤ 2 s | §3.6 |
| Relationships list load (500 LPs) | ≤ 1.5 s | §3.10 |
| Lists table filter response | ≤ 600 ms | §3.11 |
| Search latency (P95) | ≤ 400 ms | §3.17 |
| Tomo agent first-token latency | ≤ 1.5 s | Streaming LLM standard |
| Tomo agent response stream rate | ≥ 30 tokens/s P50 | UX read pace |
| API route latency P95 (excluding LLM and ingestion routes) | ≤ 800 ms | Standard |
| API route latency P99 | ≤ 2 s | Standard |
| Draft generation (single LP, full context) | ≤ 8 s end-to-end | §3.9 |
| Daily Brief modal open | ≤ 500 ms after login | §3.8 |

**Targets — ingestion and computation:**

| SLO | Target | Source |
|---|---|---|
| Onboarding Phase A — 90-day full-content sync | ≤ 2 minutes from workspace connect + CRM path complete | §3.3 (first value / Day 1 Gap readiness) |
| Onboarding Phase B — months 4–12 full-content sync | ≤ 30 min background | Email ingestion strategy |
| Onboarding Phase C — months 13–36 metadata sync | ≤ 2 h background | Email ingestion strategy |
| Tone calibration | ≤ 90 s during Phase B | Post–Step 2 background; §3.9 / Settings (not Document B wizard) |
| Day 1 Gap computation (after Phase A complete) | ≤ 30 s | Home / Insights; §3.6 (not Document B wizard) |
| Follow-up draft generation post-meeting | ≤ 30 min after meeting end | Section 7.3 F3 |
| Meeting recap fallback (TOMO LLM) for 30-min transcript | ≤ 60 s | §3.13 |
| Signal nightly batch (500 LPs) | ≤ 5 min | §3.5 |
| Metrics nightly batch (500 LPs) | ≤ 2 min | §3.6 |
| Daily snapshot append | ≤ 30 s | §3.6 |
| Daily Brief assembly + delivery (per workspace) | ≤ 60 s after scheduled trigger | §3.8 |

**Targets — event-driven hot paths:**

| SLO | Target | Source |
|---|---|---|
| Re-engagement event detection (LP inbound after 45+ days) | ≤ 1 h from email arrival to Action Drawer card | Section 8 §8.3 Signal 2 |
| Webhook delivery → row written | ≤ 30 s P95 | Standard |
| Polling fallback cadence (when webhook degraded) | 30 min | Per O-9 |

**Implementation notes.**

- **Critical path budget.** The Insights page combines ten metrics; serve from `daily_pipeline_summary` plus aggregations cached in materialised views (Postgres) where the join cost would otherwise breach 2s. Materialised views refreshed at end of nightly batch.
- **N+1 hygiene.** All list endpoints use `IN`-batched fetches and explicit JSON aggregation. Every endpoint that touches more than one table runs through a query reviewer in PR.
- **LLM latency.** Vertex AI Gemini cold-start is sub-second; first-token latency dominated by prompt size. Drafts trim historical context to last 5 interactions plus tone-profile excerpt to keep prompts under ~6k tokens.
- **Streaming.** Tomo agent uses Server-Sent Events (Vercel AI SDK) — first-token sets the perception of latency.
- **Background work isolation.** The signal batch, metric batch, and ingestion workers run on AWS infrastructure separate from the Vercel-hosted web/API. No batch job competes with interactive request capacity.
- **Queue tolerance.** SQS queue depth alarms at >1,000 deferred tasks per workspace (re-engagement, recap fallback, batch fan-out); ECS autoscale triggers before the alarm.

**Acceptance criteria.**

- AC-5.1.1 — Synthetic monitoring (Pingdom or equivalent) confirms LCP P75 ≤ 2.5s on Today, Relationships, Insights for a representative test workspace.
- AC-5.1.2 — Re-engagement event in a synthetic test (mock inbound after 50 days silence) surfaces an Action Drawer card within 1 hour P95.
- AC-5.1.3 — Signal nightly batch completes within 5 minutes for a 500-LP workspace, observed across 7 consecutive nightly runs.
- AC-5.1.4 — Tomo agent streaming first-token latency P75 ≤ 1.5s observed over 24 hours of production traffic.

---

### 5.2. Reliability and availability

**Description.** V1 targets institutional-acceptable reliability — sufficient for a fundraising team's daily workflow, with documented degradation paths when subsystems fail. V1 does not target five-nines uptime; that's V2+.

**Targets.**

| Target | Value | Notes |
|---|---|---|
| Uptime SLO (web + API) | 99.5% / month | ~3.6 hours downtime/month allowed |
| Uptime SLO (background ingestion) | 99.0% / month | Tolerated as long as catch-up runs successfully |
| RTO (recovery time objective) | ≤ 4 hours | From total Supabase or Vercel outage |
| RPO (recovery point objective) | ≤ 1 hour | Worst-case data loss from failure |
| Database backup retention | Daily snapshot 30 days; PITR 7 days | Supabase Pro default |
| Worker idempotency | All workers idempotent | Required by retry semantics |
| Webhook replay tolerance | Exact-once via provider message id de-dup | Per §6.2.3 unique constraints |
| Sync staleness threshold | Banner after 3 consecutive failed delta polls | §3.3 |
| Multi-AZ posture | Supabase managed multi-AZ; AWS workers in two AZs minimum | V1 region: us-east-1 |
| Disaster recovery exercise cadence | Quarterly tabletop, annual restore drill | SOC 2 evidence |

**Implementation notes.**

- **Stateless workers.** All AWS workers are stateless; scale-up restores capacity without coordination. Failed jobs go to a dead-letter queue inspected daily.
- **Database.** Supabase Pro provides daily snapshot + 7-day PITR. Annual full-restore drill verifies recovery at scale; quarterly tabletop walks the runbook without touching production.
- **Vercel.** Production hosting on Vercel Pro; preview deploys per branch. Vercel handles edge availability and CDN.
- **Worker idempotency.** Every worker reads its target row's current state, computes the change, and applies with optimistic concurrency (`UPDATE ... WHERE updated_at = $known_value`). Failed updates trigger retry.
- **Webhook deduplication.** Inbound webhooks de-dupe on `provider_internet_message_id` (email), `provider_event_id` (calendar), `subscription_id` + delivery id. Duplicates are ignored without error.
- **Degradation paths.**
  - Email/cal sync down → Today + Lists show staleness banner; signals continue to compute against last-known data.
  - LLM provider down → Tomo agent shows "Tomo is busy"; drafts surfaceable from cached pre-generated where applicable; non-blocking for browse/read paths.
  - Slack down → Daily Brief delivers via email + in-app; failed Slack send queued for retry.
  - Stripe webhook delayed → subscription state catches up on next webhook; no immediate impact on access (grace period).
- **Status page.** Public status page (`status.tomo.com` or equivalent) with subsystem-level health, automated from internal observability.

**Acceptance criteria.**

- AC-5.2.1 — Quarterly DR tabletop produces a signed-off runbook update.
- AC-5.2.2 — Annual full restore from PITR completes within 4 hours, verified end-to-end.
- AC-5.2.3 — Inbound webhook duplicate (same `provider_internet_message_id` twice) does not produce a duplicate `lp_interactions` row.
- AC-5.2.4 — A simulated Vertex AI outage (API returning 503 for 5 minutes) surfaces "Tomo is busy" inline and does not break Today, Relationships, Lists, or Insights.

---

### 5.3. Security

**Description.** V1 security posture is sufficient for SOC 2 Type 1 and CASA Tier 2 (per §5.5). Layered controls across encryption, secrets management, authentication, authorisation, input validation, rate limiting, audit logging, and pen-test verification.

**Encryption.**

- **At rest.**
  - Supabase Postgres: AES-256 at rest on managed disks (default).
  - Supabase Storage (S3-backed): SSE-KMS via Supabase-managed key.
  - AWS S3 (HTML body archives, CSV originals): SSE-KMS with TOMO-owned KMS key.
  - Firebase Authentication: Google-managed encryption (default).
  - **Sensitive fields with envelope encryption** via Supabase Vault (KMS-backed): `oauth_tokens.access_token_encrypted`, `oauth_tokens.refresh_token_encrypted`, `slack_workspace_connections.bot_access_token_encrypted`. Plaintext never touches application logs.
- **In transit.** TLS 1.2+ on every external surface (per §4.4). HTTP redirects to HTTPS at the edge.
- **Backups.** Encrypted at rest; backup integrity verified during quarterly restore drill.

**Secrets management.**

- **Production secrets** (database connection strings, third-party API keys, OAuth client secrets, KMS key ids) stored in **AWS Secrets Manager** for AWS workers; in **Vercel encrypted environment variables** for the web/API tier. Rotated per provider guidance (Stripe annual; Slack signing secret on rotation events; Microsoft/Google OAuth client secrets every 12 months).
- **No secrets in the browser.** Every API call to a provider goes through TOMO's API tier or a worker; the browser holds only the Firebase ID token and short-lived signed URLs to S3 where required.
- **No secrets in logs.** Structured logging strips known secret-like keys (token, secret, key, password, bearer). Pre-commit hook scans for accidental secret commits.

**Authentication and session.**

- **Firebase Authentication** for sign-in. Three providers in V1: email + password, Google, Microsoft. MFA via Firebase TOTP enabled for any user with `users.is_tomo_staff=true`; encouraged but not enforced for customer users in V1 (V1.5 will require for `team` plan).
- **Session.** Firebase ID tokens; short-lived (1 hour) with refresh. No TOMO-managed session cookie.
- **OAuth (data sources).** Per-user OAuth grants for Microsoft Graph / Google Workspace / Slack / native CRM read (**Affinity** or **Backstop** when shipped — §3.4). Tokens encrypted at rest. Refreshed before expiry by background worker. Revocable from Settings → Integrations and from upstream provider — both paths trigger TOMO's disconnect handler.

**Authorisation.**

- **Workspace isolation.** Every workspace-scoped table protected by Supabase Row-Level Security with `workspace_id = current_setting('app.workspace_id')::uuid`. The application layer sets the setting on every request after resolving Firebase auth. Cross-workspace reads are impossible at the database layer regardless of API bugs.
- **Workspace membership.** Unlimited active members per workspace in V1 (subject to Stripe plan and acceptable use; no engineered three-seat cap — per §3.1). All members have identical permissions in V1 (per §1.2). Owner is privileged for billing + workspace transfer only.
- **TOMO staff access.** No in-product impersonation in V1 (per §1.2 and Appendix H O-13). Staff data access via internal ops dashboard or admin SQL is logged in `data_access_log` with purpose, tables, and record ids.

**Input validation.**

- **Zod schemas** on every API request body and query param. Rejects on invalid input with `400 Bad Request` and stable error code.
- **No raw SQL from user input.** All Postgres queries via parameterised `pg` client or Supabase client (which handles parameterisation).
- **File uploads** (CSV imports, materials) limited by size (≤ 25 MB CSV, ≤ 100 MB materials) and content-type, scanned with magic-byte verification.

**Rate limiting.**

- Per-user per-route rate limits enforced at the API tier (Redis-backed token bucket, or Vercel's edge rate limiting). Limits scaled to typical workflow patterns (e.g. Tomo agent: 30 messages/min/user; CSV import: 5/hour/workspace).
- LLM call rate limits per workspace to prevent cost runaway (configurable; default 1,000 generations/day/workspace).

**Audit logging.**

- `auth_events` for all sign-in, sign-out, OAuth grant/refresh/revoke, MFA challenges (per §6.2.9).
- `activity_log` for all CRM mutations, workspace member changes, integration connect/disconnect, fund target changes (per §3.15).
- `agent_tool_calls` for every Tomo tool invocation (per §3.14).
- `data_access_log` for every TOMO-staff customer-data read.
- All audit tables are append-only with retention indefinitely (V3 dataset).

**Application security headers.**

- **HSTS:** `max-age=31536000; includeSubDomains; preload`.
- **CSP:** strict policy with allowlisted Vercel Analytics, Sentry, Vertex AI streaming endpoint, Stripe.js, Slack OAuth, Postmark/SES tracking pixels (where used).
- **X-Content-Type-Options:** `nosniff`.
- **X-Frame-Options:** `DENY`.
- **Referrer-Policy:** `strict-origin-when-cross-origin`.
- **Permissions-Policy:** disable camera, microphone, geolocation, payment.
- **CSRF.** Bearer-auth on all mutation routes makes CSRF moot; cookie-based sessions are not used.

**Vulnerability management.**

- **Dependency scanning.** GitHub Dependabot + npm audit weekly; high/critical advisories addressed within 7 days.
- **Container scanning.** AWS ECR image scanning on every push.
- **Static analysis.** Semgrep + ESLint security rules in CI.
- **Penetration test.** External pen test against staging by an accredited firm before first paying customer outside FC. Findings tracked to closure. CASA Tier 2 third-party pen test runs on the same staging build (per §5.5).
- **Vulnerability disclosure policy.** Public `/.well-known/security.txt` and `security@tomo.com` mailbox monitored 24/5.

**Acceptance criteria.**

- AC-5.3.1 — A row inserted into `lp_contacts` with workspace A is invisible to a user in workspace B even when the API attempts the read with a forged `workspace_id`.
- AC-5.3.2 — `oauth_tokens.access_token_encrypted` is unreadable as plaintext via direct Postgres select; decryption only succeeds via the Vault helper with the application service role.
- AC-5.3.3 — A request to `/api/lp-contacts` with no `Authorization` header returns `401`.
- AC-5.3.4 — A CSV upload with disguised executable content (correct extension, wrong magic bytes) is rejected with a clear error.
- AC-5.3.5 — Pen test report shows zero High or Critical findings open at GA.
- AC-5.3.6 — Static analysis CI gate blocks merges with new High or Critical findings.

---

### 5.4. Privacy and data handling

**Description.** TOMO ingests and processes large amounts of personal data (LP contact details, email content, calendar attendees, meeting transcripts). Privacy posture is consequential — the institutional buyer will diligence it. V1 commitments: no training on customer data, zero LLM retention, transparent sub-processor list, deletion on request, OOO and consent handling.

**No-training-on-data commitment.**

- Vertex AI Gemini (V1 LLM provider per §4.2.6) does not use customer prompts/responses to train Google's models. This is contractual under Vertex AI's Generative AI service terms.
- TOMO does not internally train models on customer data in V1. Any V3 model training (per Section 8 §8.10) requires explicit consent and a separate DPA addendum.
- This commitment is published on the public website and in the customer-facing DPA template.

**Zero retention at LLM provider.**

- Vertex AI default behaviour: prompt and response content is processed in-memory and not retained in Google Cloud logs (per Vertex AI data governance).
- Verified during the pen test: synthetic test prompts containing unique strings should not appear in any Google Cloud audit log retrievable by TOMO operators.

**PII inventory.**

- The application maintains a documented PII inventory mapping each personal-data field to:
  - Source (where it came from — CSV, sync, GP entry).
  - Purpose (which V1 capability uses it).
  - Retention rule (per §6.4).
  - Sub-processor exposure (which third parties see it).
- Inventory is part of the SOC 2 evidence pack and the GDPR Article 30 record of processing activities.

**Data subject rights.**

- **Right of access.** A workspace member can export their workspace data via Settings → Account → Export. The export contains JSON of all workspace-scoped tables they have permission to read, plus signed download URLs for material files. Generation runs as a background job; user notified by email when ready (within 24 hours).
- **Right of rectification.** GP-edited fields are mutable through the standard UI; corrections flow naturally.
- **Right of erasure.** Account deletion (per §3.1) initiates a 30-day soft-delete; on confirmation or expiry, hard-delete runs. Append-only audit data preserves event records but scrubs PII (email replaced with hash).
- **Right of portability.** The export fulfils portability; format is documented JSON, easily ingestible by other tools.
- **Right to object.** Any user can disconnect any data-source integration in Settings → Integrations; future ingestion stops; historical data is retained until account deletion or explicit purge request.

**Sub-processor list.**

V1 sub-processors disclosed in the DPA and on a public sub-processor page:

| Sub-processor | Purpose | Data exposed |
|---|---|---|
| Supabase | Database, storage, auth-adjacent | All workspace data |
| Google Cloud (Firebase Auth) | Sign-in | Email, sign-in metadata |
| Google Cloud (Vertex AI) | LLM inference | Prompts and responses (zero retention) |
| Google Cloud (Gmail/Calendar/Meet APIs) | Data source | The user's mail/cal/meet data — already Google-resident |
| Microsoft (Graph API) | Data source | The user's mail/cal/Teams data — already Microsoft-resident |
| Vercel | Hosting | Request/response transit (TLS) |
| AWS | Background workers, storage, secrets | All workspace data |
| Postmark or AWS SES | Transactional email delivery | Recipient email + brief content |
| Slack | Daily brief delivery | Brief content (when Slack channel used) |
| Stripe | Billing | Customer email, billing address |
| OpenAI | (V1 mock only — not used in V1 production) | n/a |
| Sentry | Error monitoring | Stack traces (PII-stripped) |
| PostHog or Vercel Analytics | Product analytics | Anonymised event data, workspace ids |
| Affinity | Optional CRM data source | Affinity-resident data per GP grant |
| Backstop | Optional CRM data source | Backstop-resident data per GP grant (when native read or future write-back is enabled) |

Customer notified 30 days in advance of any sub-processor addition.

**Consent capture.**

- Onboarding screens 1 and 2 include the legal-acceptance affordance for Terms and Privacy Policy. Acceptance recorded in `auth_events`.
- OAuth consent for data sources is granted via the upstream provider's standard consent screen; TOMO never brokers the consent itself.
- Per-user notification preferences are explicit opt-in; daily brief defaults to in-app + email but Slack defaults off.

**OOO handling.**

- Out-of-office replies detected and excluded from meaningful-touch (per §3.3 BR-3.3.4). Detected OOO is not used to train any TOMO model and is not surfaced in signals.

**User-initiated re-sync.**

- Settings → Integrations exposes a "Force re-sync" affordance per data source. Triggers a fresh delta poll plus, optionally, a backfill from the user-selected start date (within the 36-month window).

**Acceptance criteria.**

- AC-5.4.1 — A workspace member triggering Account Export receives a download link by email within 24 hours containing the documented JSON shape.
- AC-5.4.2 — Account deletion confirmed within the 30-day window scrubs PII from `users` while leaving `lp_signal_log` and `tomo_action_log` rows with NULLed user references.
- AC-5.4.3 — The public sub-processor page lists every entity in the table above with descriptions matching the DPA.
- AC-5.4.4 — A pen-test prompt with unique signature does not appear in TOMO's Google Cloud audit logs (zero retention verified).
- AC-5.4.5 — Disconnecting Microsoft Graph stops new ingestion within 30 seconds and surfaces a banner; existing data remains until explicit purge or account deletion.

---

### 5.5. Compliance

**Description.** V1 ships with two attestation commitments — SOC 2 Type 1 and CASA Tier 2 — plus baseline GDPR / CCPA controls. These are non-negotiable per the V1 Final pillar 9. Higher-tier attestations (SOC 2 Type 2, ISO 27001, HIPAA, FedRAMP) are not in V1.

**SOC 2 Type 1.**

- **Trust services criteria covered:** Security, Availability, Confidentiality.
- **Privacy and Processing Integrity** are added in V1.5 / SOC 2 Type 2.
- **Auditor.** External CPA firm (e.g. Vanta-partnered auditor or comparable). Selected before V1 ship.
- **Evidence pack.** Policies (information security, access management, change management, incident response, business continuity, vendor management, data classification, encryption, secure SDLC). Runbooks. Access reviews (quarterly). Change-management records (every PR with security relevance). Incident drill records. Backup-and-restore drill records. Vulnerability scan reports. Pen-test report.
- **Timeline target.** SOC 2 Type 1 attestation report available before first paying customer outside Founding Circle.

**CASA Tier 2.**

- **Required for:** Google OAuth scopes that carry sensitive or restricted classification — `gmail.modify`, `gmail.send`, `meetings.space.readonly`, `drive.meet.readonly`, `calendar`. Without CASA Tier 2 verification, Google rate-limits or revokes access at the OAuth-app level.
- **Process.** Submit OAuth app to Google CASA program; engage an accredited Tier 2 assessor; assessor performs technical review against the CASA Tier 2 controls (a subset of OWASP MASVS / ASVS Level 2, plus Google-specific data-handling controls); remediation; final letter of validation (LOV).
- **Timeline target.** Verification and LOV in hand before V1 GA.
- **Re-verification.** Annual re-attestation required by Google.

**GDPR (EU/UK).**

- Lawful basis for processing: legitimate interests (LP relationship management) + contract performance (delivering the TOMO service) — articulated in the privacy policy.
- DPA template signed by every paying customer before ingestion begins.
- Data Protection Officer designated (V1: external DPO via service; V1.5: in-house when team ≥ 10).
- Data residency: V1 hosts in us-east-1; EU residency available in V1.5 via eu-west-1.
- DPIA (Data Protection Impact Assessment) drafted for the LP-relationship-management processing.
- Subject rights handled per §5.4.

**CCPA / CPRA (California).**

- Privacy notice on the public website.
- "Do Not Sell or Share" link (vacuous given TOMO does not sell data; included for compliance).
- Subject access and deletion handled per §5.4.

**Out of scope for V1.**

- SOC 2 Type 2 — V1.5 (requires 6 months of operating evidence after Type 1).
- ISO 27001 — V2.
- HIPAA — not on roadmap.
- FedRAMP — not on roadmap.
- PCI-DSS — N/A (no card data handled by TOMO; Stripe Customer Portal isolates).

**Mapping of SRS sections to control families** (illustrative; full mapping in the audit prep doc):

| Control family | SRS sections |
|---|---|
| Access management | §3.1, §3.16, §5.3 (auth, authorisation), §6.2.1 |
| Change management | §7.1 (stack), §5.3 (CI gates) |
| Encryption | §5.3, §4.4, §6.2 (oauth_tokens, slack tokens) |
| Audit logging | §3.15, §6.2.9, §3.14 |
| Vendor management | §5.4 (sub-processors), §1.2 (out-of-scope) |
| Backup and restore | §5.2, §6.4 |
| Incident response | §5.2 (degradation paths), §5.8 (alerting) |
| Vulnerability management | §5.3 (dependency scanning, pen test) |

**Acceptance criteria.**

- AC-5.5.1 — SOC 2 Type 1 attestation report from accredited auditor obtained before first GA customer.
- AC-5.5.2 — CASA Tier 2 LOV obtained before V1 GA; documented in the Google OAuth app.
- AC-5.5.3 — DPA template available for customer signature; signed-DPA storage in the contract management tool.
- AC-5.5.4 — Sub-processor page published and DPA-linked.
- AC-5.5.5 — Quarterly access review documented and signed off.

---

### 5.6. Scalability

**Description.** V1 scales for the Founding Circle plus early GA traffic. Capacity targets reflect realistic growth, not aspirational.

**Targets.**

| Dimension | V1 capacity | V1.5 expansion path |
|---|---|---|
| Workspaces | 100 active | 1,000 |
| Users per workspace | Multiple (no artificial cap V1; scale ops as headcount grows) | Billing / plan packaging may impose commercial limits independently |
| LPs per workspace | 500 typical, 2,000 ceiling | Same |
| Ingested email/cal events per workspace per month | ~20,000 | ~50,000 |
| Background job throughput | 50 concurrent ECS tasks | 500 |
| Postgres connections | Supabase Pro pool (60–200) | Supabase Team |
| LLM calls per workspace per day | 1,000 (rate-limited) | Configurable |

**Implementation notes.**

- **Database.** Supabase Pro covers V1 capacity. Known scaling levers: read replicas (V1.5), connection pooling already on PgBouncer, materialised views for hot aggregations.
- **Workers.** AWS ECS Fargate with SQS queues. Autoscale on queue depth. Cold-start tolerance: long-running batch jobs are not latency-sensitive.
- **Vercel.** Edge functions handle geographically-distributed request load; server functions auto-scale.
- **LLM.** Vertex AI per-project quotas raisable via support ticket; V1 starts with default quota and raises as workspace count grows.
- **Bottleneck monitoring.** Per §5.8 dashboards track (a) Postgres connection saturation, (b) SQS queue depth per workload, (c) Vertex AI quota utilisation, (d) Webhook delivery lag.

**Plan beyond V1.**

- V1.5 (~Q4 2026): horizontal Postgres read replicas; per-workload SQS dedicated queues; CDN expansion to two regions.
- V2 (~Q4 2026 to early 2027): per-tenant database sharding option for institutional customers requiring physical isolation; eu-west-1 region.

**Acceptance criteria.**

- AC-5.6.1 — A 100-workspace load test (synthetic; nightly batch + ingestion + interactive traffic) sustains for 24 hours without queue back-pressure or P99 latency breaches.
- AC-5.6.2 — A workspace with 2,000 LPs loads its Insights page within the 2s SLO.
- AC-5.6.3 — Webhook-receive throughput sustains 1,000 messages/minute without queue lag exceeding 5 minutes.

---

### 5.7. Usability and accessibility

**Description.** V1 is responsive web with desktop-first design, mobile-functional. Accessibility baseline WCAG 2.1 Level AA. Usability is treated as a quality bar, not a checklist; the V1 Final risk #4 (drafts not sounding like the GP) is a usability risk addressed in §3.9 + §3.13 plus tone calibration.

**Targets — usability.**

- Onboarding wizard: **eight screens** after auth (Document B / `design/tomo_onboarding_v1.html`); FC first session monitored for completion rate, time-to-Home, and drop-off by step.
- Daily Brief comprehension within 10 seconds of opening (qualitative — Founding Circle review feedback).
- Post-meeting capture under 60 seconds (per V1 Final F8).
- Draft approval rate ≥ 50% target (recalibration nudge below — per §3.6 Metric 6b).
- Tomo agent response satisfaction (qualitative) — tracked via thumbs-up/down in the chat UI.

**Targets — accessibility (WCAG 2.1 AA).**

- All interactive elements keyboard-reachable; visible focus rings.
- ARIA landmarks (main, nav, aside, dialog).
- Form inputs labelled; error messages programmatically associated.
- Colour contrast ≥ 4.5:1 for normal text; ≥ 3:1 for large text and UI elements.
- ARIA live regions for status messages.
- Touch targets ≥ 44×44 px on mobile.
- Respects `prefers-reduced-motion`.
- No information conveyed by colour alone (e.g. G/A/R flags also have a textual label and shape variation).

**Implementation notes.**

- **Component library.** Built on the mock's component set (`src/components/ui/*`), audited for AA compliance during V1 build.
- **Accessibility testing.**
  - Automated: axe-core in CI on every PR; lint blocks on Critical violations.
  - Manual: VoiceOver (Safari) and NVDA (Firefox) testing of the eight primary surfaces before GA.
  - User testing: at least 2 FC GPs invited to do a 30-minute usability walkthrough; findings logged.
- **Internationalisation readiness.** All UI strings extracted to a single locale file (`en-US.json`); even though V1 is English-only, this enables V2 localisation without UI churn.
- **Empty-state quality.** Every empty state explains *what to do next*; empty Today reads "Nothing pressing today — open Lists to plan your week," not "No items."

**Acceptance criteria.**

- AC-5.7.1 — Axe-core CI gate passes with zero Critical or Serious violations.
- AC-5.7.2 — VoiceOver narration of the Lists table reads each LP with name, firm, stage, flag-with-reason, days-since-touch — verified manually pre-GA.
- AC-5.7.3 — Tab key reaches every interactive element on Today, Relationships, Lists, Workflows, Insights, Settings — no keyboard traps.
- AC-5.7.4 — Onboarding completes for a screen-reader user using only keyboard input.

---

### 5.8. Observability

**Description.** Production observability covers errors, performance, business metrics, and security events. V1 is opinionated about a few tools rather than a full LGTM stack — minimum to operate confidently.

**Layers.**

- **Errors.** Sentry. Browser SDK and server-side SDK. PII-stripping middleware before send. Source maps uploaded on every deploy.
- **Product analytics.** PostHog (preferred) or Vercel Analytics. Events tagged with `workspace_id` (so usage cohorts queryable) but PII-stripped from event properties. Event names follow a documented taxonomy (`signal_flag_changed`, `draft_approved`, `daily_brief_opened`, etc.).
- **Infrastructure metrics.** AWS CloudWatch for ECS workers, SQS queues, Lambda functions; Vercel Analytics for web/API; Supabase metrics dashboard for Postgres.
- **Composite dashboards.** A single page (Grafana Cloud or similar) per major workload — sync, signals, metrics, daily brief, agent — showing latency, error rate, throughput, queue depth.
- **Logs.** Structured JSON logs everywhere. Standard fields: `request_id`, `workspace_id`, `user_id`, `route`, `latency_ms`, `status`. Aggregated to CloudWatch Logs (workers) and Vercel Logs (web/API). Retention 30 days.
- **Tracing.** OpenTelemetry instrumentation on critical paths (sync ingest, signal batch, agent orchestrate). Aggregated to Honeycomb or Jaeger.

**Alerts.**

- **Pagerable** (24/5 on-call, paging only for severity 1):
  - Web/API uptime breach (3 consecutive 1-min checks failing).
  - Re-engagement detection failing (queue stalled > 1 hour).
  - Signal nightly batch failed.
  - LLM provider sustained 5xx > 10 minutes.
  - Database CPU > 80% sustained 15 minutes.
- **Email-notification** (severity 2/3):
  - Webhook subscription failing for one workspace > 30 minutes.
  - Daily brief delivery failure rate > 5%.
  - Per-workspace LLM rate limit hit.

**Audit / business observability (per §5.3 + §6.2.9).**

- `auth_events`, `activity_log`, `agent_tool_calls`, `data_access_log` are queryable for support and security investigations.
- Daily-brief delivery success rate computed from `email_delivery_log`.

**On-call rotation.**

- V1 (small team): 24/5 on-call, primary + secondary, week-long rotations.
- V1.5 (post-GA): 24/7 on-call as paying customer count justifies.

**Acceptance criteria.**

- AC-5.8.1 — A simulated 5xx storm on `/api/lp-contacts` triggers a Sentry alert and an on-call page within 5 minutes.
- AC-5.8.2 — Every PR's deploy uploads source maps; Sentry stack traces resolve to source.
- AC-5.8.3 — A daily-brief delivery failure surfaces in the workload dashboard within 5 minutes of occurrence.
- AC-5.8.4 — Audit query "every Tomo `update_crm` tool call by user X in the last 30 days" returns within 1 second from `agent_tool_calls`.

---

### 5.9. Data retention and lifecycle

**Description.** Retention rules are split between (a) the three-tier email model per §6.4, (b) append-only V3 dataset tables that retain forever, (c) workspace-scoped operational data subject to soft-delete + hard-delete on account closure. This subsection consolidates the rules and their lifecycle controls.

**Retention table** (master reference; details in §6.4):

| Data class | Tables | Retention rule |
|---|---|---|
| Hot — full email/transcript bodies | `lp_interactions.body_text`, `lp_meeting_transcripts.transcript_text`, archived HTML in S3 | 12 months from `interacted_at`/`created_at`, then null/purged |
| Warm — metadata only | `lp_interactions` rows where `metadata_only=true` | 13–36 months from `interacted_at`, then row deleted |
| Cold — never ingested | n/a | n/a |
| Append-only V3 dataset | `lp_signal_log`, `lp_stage_transitions`, `tomo_action_log`, `daily_pipeline_summary`, `agent_tool_calls`, `activity_log`, `auth_events`, `data_access_log`, `email_delivery_log`, `outbound_safety_log` | Indefinite while account active; PII NULLed on deletion |
| Operational data (LPs, briefs, workflows, etc.) | All workspace-scoped soft-delete tables | Retained while account active; soft-delete 30-day grace, then hard-delete |
| OAuth tokens | `oauth_tokens`, `slack_workspace_connections` | Revoked on disconnect; row retained for audit, ciphertext zeroised |
| CSV originals | S3 (referenced in `csv_imports.s3_key`) | 90 days from import, then auto-purged |
| Materials | S3 (referenced in `materials.s3_key`) | Lifetime of workspace |
| Backups | Supabase managed | Daily snapshot 30 days; PITR 7 days |

**Lifecycle controls.**

- **Daily retention job.** Runs at 03:00 UTC. Nulls hot bodies past 12 months. Deletes metadata-only rows past 36 months. Deletes soft-deleted rows past 30-day grace. Auto-purges CSV originals past 90 days. Logs every action to `activity_log`.
- **Account closure.** Per §3.1: 30-day soft-delete window; after confirmation or expiry, hard-delete; PII scrubbed from append-only tables.
- **Workspace closure.** Same as account closure but workspace-scoped.
- **Right-to-erasure.** GDPR / CCPA requests handled within statutory deadlines (30 days for GDPR access; 45 days for CCPA deletion). Tracked in support workflow.
- **Backup expiry.** Supabase backups expire per their managed schedule; no manual intervention required.

**Acceptance criteria.**

- AC-5.9.1 — A row in `lp_interactions` 13 months old has `body_text=NULL` and `metadata_only=true` after the daily retention job runs.
- AC-5.9.2 — A row in `lp_interactions` 37 months old does not exist after the daily retention job runs.
- AC-5.9.3 — A soft-deleted `lp_contacts` row is hard-deleted 30 days after `deleted_at`.
- AC-5.9.4 — Account closure scrubs `users.email` (replaced with hash) and leaves `lp_signal_log` rows accessible for V3 dataset purposes (with NULL user reference).

---

### 5.10. Internationalisation and localisation

**Description.** V1 ships in English (US/UK) only. Currency configurable per fund. Date and number formatting per user locale. Timezone per user. The application is i18n-ready (strings extracted to a locale file) so V2 localisation does not require UI changes.

**V1 commitments.**

- **UI language.** English only. Locale strings live in `locales/en-US.json`. The application code never inlines user-facing copy.
- **Currency.** Per `funds.primary_currency` (ISO 4217). Insights renders the fund's currency; user-set raise target uses fund currency by default; per-LP `expected_commitment_currency` defaults to the fund's currency.
- **Date display.** Browser locale via `Intl.DateTimeFormat`. Defaults to en-US for ambiguous locales. Times shown in the user's `user_preferences.timezone`.
- **Number formatting.** `Intl.NumberFormat` with locale-aware decimals and thousand separators.
- **Timezone.** Stored UTC; rendered in user timezone. `user_preferences.timezone` editable in Settings → Profile.

**Out of scope V1.**

- Non-English UI translations.
- Right-to-left language support.
- Alternative calendar systems (Hijri, Buddhist, etc.).

**V2 localisation candidates.**

- French, Spanish, German, Mandarin (priority based on FC + early GA customer geographies).
- Per-language tone-calibration support (current tone calibration is language-agnostic in mechanism but English-tuned in heuristics).

**Acceptance criteria.**

- AC-5.10.1 — Every user-facing string in the app is sourced from `locales/en-US.json`; CI lint blocks merges that introduce inline copy.
- AC-5.10.2 — A workspace with `funds.primary_currency='GBP'` renders Insights with £ symbols and GBP-locale formatting.
- AC-5.10.3 — A user with `timezone='Asia/Singapore'` sees today's meetings in SGT and the daily brief delivers at the SGT-equivalent of `daily_brief_send_at_local`.

---

## 6. Data Requirements

### 6.1. Data model overview

V1 uses a relational model on Supabase Postgres 16. The model is organised into nine entity groups containing **49 tables** in total. Tables marked **(V2-placeholder)** are created empty in the V1 migration so V2 features have schema in place before they ship — this is a deliberate forward-compatibility choice from Section 8 §8.10 ("every V1 capture decision must assume the signal observation will eventually be needed for V3 model training").

| # | Group | Tables | Notes |
|---|---|---|---|
| 1 | Identity and tenancy | `users`, `workspaces`, `workspace_members`, `funds`, `oauth_tokens`, `tone_profiles` | 6 tables |
| 2 | LP domain | `lp_organizations`, `lp_contacts`, `lp_state`, `lp_stage_transitions`, `lp_tags`, `lp_tag_assignments`, `lp_notes` | 7 tables |
| 3 | Interactions | `lp_email_threads`, `lp_interactions`, `lp_calendar_events`, `lp_calendar_event_attendees`, `lp_meeting_transcripts`, `lp_meeting_recaps` | 6 tables |
| 4 | Signals and metrics | `lp_signal_log`, `stage_cadence_benchmarks`, `daily_pipeline_summary`, `tomo_action_log`, `reminders`, `commitments`, `open_loops` | 7 tables |
| 5 | CRM integration | `csv_imports`, `csv_field_mappings`, `csv_dedupe_decisions`, `crm_sync_status`, `affinity_field_mappings` (V2-placeholder for write-back) | 5 tables |
| 6 | Workflows | `workflows`, `workflow_steps`, `workflow_runs`, `workflow_step_runs`, `outbound_safety_log` | 5 tables |
| 7 | Materials and briefs | `materials`, `briefs`, `material_engagement` (V2-placeholder), `lp_document_engagement` (V2-placeholder), `lp_marketing_engagement` (V2-placeholder) | 5 tables |
| 8 | Settings and notifications | `user_preferences`, `notification_channels`, `slack_workspace_connections`, `email_delivery_log` | 4 tables |
| 9 | Audit | `activity_log`, `agent_tool_calls`, `auth_events`, `data_access_log` | 4 tables |

**Cross-cutting design rules.**

1. **Multi-tenancy.** Every table that holds workspace-scoped data carries `workspace_id uuid not null references workspaces(id) on delete cascade` and is protected by Supabase Row-Level Security (RLS). The RLS policy on every workspace-scoped table is identical: `workspace_id = current_setting('app.workspace_id', true)::uuid`. Every API request resolves the user's session, sets `app.workspace_id`, then runs the query. Cross-workspace reads are impossible at the database layer regardless of API bugs.
2. **Append-only tables.** `lp_signal_log`, `lp_stage_transitions`, `tomo_action_log`, `daily_pipeline_summary`, `activity_log`, `agent_tool_calls`, `auth_events`, `data_access_log`, and `email_delivery_log` are append-only. They have no `UPDATE` or `DELETE` triggers permitted; row-level deletes are denied by RLS policy except for hard-delete during account closure (which goes through a documented procedure logged in `auth_events`).
3. **Soft-delete.** Most other tables carry `deleted_at timestamptz null`. RLS filters `deleted_at IS NULL` from default queries; admin queries can opt in to including soft-deleted rows. Account-deletion procedure converts soft-deletes to hard-deletes after the 30-day retention window.
4. **Timestamps.** Every non-append-only table carries `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`. Append-only tables carry only `created_at`. All times stored UTC; rendering in user timezone happens in the application layer.
5. **Surrogate keys.** Every table uses a `uuid` primary key generated by `gen_random_uuid()`. No natural keys (email addresses, etc.) act as primary keys.
6. **Foreign keys and indexes.** Every foreign key has a B-tree index. Composite indexes on `(workspace_id, ...)` cover the common query patterns. Specific indexes are listed per table.
7. **Provenance.** Tables that ingest data from multiple sources (`lp_contacts`, `lp_organizations`, `lp_interactions`) carry a `source` enum (`crm_csv`, `affinity_api`, `email_sync`, `calendar_sync`, `meet_api`, `teams_api`, `tomo_derived`, `tomo_computed`, `gp_edited`) and `source_external_id text` to anchor the record to its origin system.
8. **Audit triggers.** Mutations on `lp_contacts`, `lp_organizations`, `lp_state`, `funds`, `workspaces`, `workspace_members`, and `oauth_tokens` write a row to `activity_log` via a Postgres trigger. The trigger captures `actor_user_id`, `action`, `before_jsonb`, `after_jsonb`.
9. **JSONB usage.** JSONB is used only where the shape is genuinely flexible (e.g. `tomo_action_log.metadata`, `agent_tool_calls.arguments`, `csv_field_mappings.column_map`). Any field that is queried in a WHERE clause is promoted to a typed column.
10. **Currency.** Monetary fields are stored as `numeric(18,2)` plus a `varchar(3)` ISO 4217 currency code. No floating-point money.

### 6.2. Canonical schema

The conventions below apply to every table; only deviations are called out per table.

- **Type shorthand:** `pk` = primary key; `fk` = foreign key; the type column lists Postgres types directly.
- **Standard tenancy:** `workspace_id uuid not null references workspaces(id) on delete cascade` is implied on every table marked "(workspace-scoped)" and not repeated in the column list. RLS policy is identical and not repeated. The corresponding index `(workspace_id, ...)` is also implied where it is the natural lead column.
- **Standard timestamps:** `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()` are present on all non-append-only tables and not listed.
- **Standard soft-delete:** `deleted_at timestamptz null` is present on tables noted "(soft-delete)" and not listed.
- **Append-only marker:** noted in the table description; no `updated_at` or `deleted_at`.
- Indexes listed per table do not repeat the implicit primary-key index.

#### 6.2.1. Identity and tenancy

##### Table: `users`

Tomo profile per Firebase Auth principal. One row per human user. Linked to `firebase_uid` from Firebase Authentication. Workspace-agnostic at this layer — workspace membership is in `workspace_members`. *(Soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `firebase_uid` | text | not null | | unique | Firebase Auth user id |
| `email` | citext | not null | | unique | Primary email; case-insensitive |
| `email_verified` | boolean | not null | `false` | | Mirror of Firebase Auth verified flag |
| `display_name` | text | null | | | |
| `photo_url` | text | null | | | |
| `default_workspace_id` | uuid | null | | fk → `workspaces.id` | Workspace shown on sign-in if member of >1 |
| `is_tomo_staff` | boolean | not null | `false` | | TOMO operators (Geoffrey Surface) |
| `last_sign_in_at` | timestamptz | null | | | Mirror from Firebase |

**Indexes:** `users(firebase_uid)`, `users(email)`, `users(default_workspace_id)`.

##### Table: `workspaces`

The unit of multi-tenancy. One workspace per fundraising team; multiple member users share the workspace without a coded member-count ceiling in V1. *(Soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | Display name (e.g. "Acme Capital") |
| `slug` | text | not null | | unique | URL slug |
| `owner_user_id` | uuid | not null | | fk → `users.id` | The workspace owner; transferred manually in V1 (see §9.1) |
| `plan` | text | not null | `'individual'` | check in (`'individual'`, `'team'`) | Maps to Stripe product |
| `stripe_customer_id` | text | null | | unique | |
| `stripe_subscription_id` | text | null | | unique | |
| `subscription_status` | text | null | | check in (`'trialing'`, `'active'`, `'past_due'`, `'canceled'`, `'paused'`) | |
| `trial_ends_at` | timestamptz | null | | | |
| `primary_timezone` | text | not null | `'UTC'` | | IANA timezone name |
| `primary_currency` | varchar(3) | not null | `'USD'` | | ISO 4217 |
| `daily_brief_send_at_local` | time | not null | `'07:30'` | | Local-time hour for daily brief delivery |
| `region` | text | not null | `'us-east-1'` | | Data residency disclosure value |

**Indexes:** `workspaces(owner_user_id)`, `workspaces(slug)`, `workspaces(stripe_customer_id)`.

##### Table: `workspace_members`

Many-to-many between `users` and `workspaces`. V1 does not enforce a numeric member cap at the database or API layer. All members have identical permissions in V1 (no role tiering). *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | |
| `role` | text | not null | `'member'` | check in (`'owner'`, `'member'`) | V1 has only owner/member; both have identical permissions; `owner` exists for billing and workspace transfer only |
| `invited_by_user_id` | uuid | null | | fk → `users.id` | |
| `invitation_email` | citext | null | | | Set when invite outstanding; cleared on accept |
| `invitation_token` | text | null | | unique | Single-use; expires 7 days |
| `invitation_expires_at` | timestamptz | null | | | |
| `joined_at` | timestamptz | null | | | Set on accept |

**Indexes:** unique `(workspace_id, user_id)` where `deleted_at IS NULL`; `workspace_members(invitation_token)`; `workspace_members(user_id)`.

**Integrity constraints:** Unique active `(workspace_id, user_id)`; no numeric maximum member count enforced in Postgres.

##### Table: `funds`

A specific raise within a workspace. Drives the Insights Capital vs Target progress bar (Metric 1 §9.3) and Concentration Risk alert (Metric 4). *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | E.g. "Fund III" |
| `vintage_year` | int | null | | | |
| `raise_target` | numeric(18,2) | null | | | Single number; new in V1 per §9.4 schema addition 1 |
| `raise_target_currency` | varchar(3) | not null | `'USD'` | | Defaults to workspace primary |
| `target_close_at` | date | null | | | First close date if set |
| `final_close_at` | date | null | | | |
| `concentration_threshold_pct` | numeric(5,2) | not null | `20.00` | | Hardcoded 20% in V1; per-fund configurability deferred to V1.5 |
| `is_default` | boolean | not null | `true` | | Used when LP not explicitly tagged to a fund |

**Indexes:** `funds(workspace_id, is_default)`.

##### Table: `oauth_tokens`

Per-user OAuth tokens for Microsoft Graph, Google Workspace, Slack, and native CRM read credentials (**Affinity** and/or **Backstop** per §3.4 — workspace-scoped secret storage in `oauth_tokens`). Tokens are encrypted at rest via Supabase Vault (envelope encryption, KMS-backed). The application layer never logs the plaintext token. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | The user this token authorises on behalf of |
| `provider` | text | not null | | check in (`'microsoft'`, `'google'`, `'slack'`, `'affinity'`) | |
| `provider_account_email` | citext | not null | | | The actual mailbox / account this OAuth grants access to |
| `provider_external_id` | text | null | | | Microsoft tenant-id + object-id; Google sub claim; Slack team_id |
| `scopes_granted` | text[] | not null | `'{}'` | | Granted scope list (audit trail) |
| `access_token_encrypted` | text | not null | | | Base64 ciphertext (Supabase Vault) |
| `refresh_token_encrypted` | text | null | | | Null for short-lived providers |
| `token_expires_at` | timestamptz | null | | | |
| `last_refresh_at` | timestamptz | null | | | |
| `last_refresh_error` | text | null | | | Most recent refresh failure for status banner |
| `revoked_at` | timestamptz | null | | | Set when user disconnects |

**Indexes:** unique `(workspace_id, user_id, provider, provider_account_email)` where `revoked_at IS NULL` and `deleted_at IS NULL`; `oauth_tokens(token_expires_at)` for the refresh worker.

##### Table: `tone_profiles`

Per-user tone calibration model derived from sent-mail history during onboarding (per Section 7.3 F12 of V1 Final). Used by every draft generation path. Refreshable. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | |
| `version` | int | not null | `1` | | Increment on refresh |
| `samples_analysed_count` | int | not null | `0` | | Number of sent emails the model read |
| `tone_signature_jsonb` | jsonb | not null | `'{}'` | | Greeting style, sign-off, formality, sentence shape, paragraph structure |
| `prompt_excerpt` | text | not null | | | The few-shot text actually injected into draft prompts |
| `last_calibrated_at` | timestamptz | not null | `now()` | | |
| `next_recalibration_due_at` | timestamptz | null | | | 90 days after last calibration |

**Indexes:** unique `(user_id, version)`; `tone_profiles(user_id, version DESC)` for the latest-version lookup.

#### 6.2.2. LP domain

##### Table: `lp_organizations`

LP firm record (e.g. "CPPIB"). One row per firm per workspace. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | |
| `legal_name` | text | null | | | Used for sub doc / commitment paperwork |
| `domain` | text | null | | | Primary email domain (e.g. `cppib.com`); used to match calendar attendees and CC expansion |
| `additional_domains` | text[] | not null | `'{}'` | | E.g. EU vs US domain |
| `firm_type` | text | null | | check in (`'pension'`, `'sovereign_wealth'`, `'endowment'`, `'foundation'`, `'family_office'`, `'fund_of_funds'`, `'asset_manager'`, `'consultant'`, `'other'`) | |
| `region` | text | null | | E.g. `'NA'`, `'EU'`, `'APAC'`, `'MENA'` | |
| `country` | varchar(2) | null | | | ISO 3166-1 alpha-2 |
| `city` | text | null | | | |
| `aum_usd` | numeric(18,2) | null | | | Reported AUM if known |
| `website_url` | text | null | | | |
| `notes` | text | null | | | |
| `source` | text | not null | | check in (`'crm_csv'`, `'affinity_api'`, `'email_sync'`, `'tomo_derived'`, `'gp_edited'`) | |
| `source_external_id` | text | null | | | Upstream CRM id |

**Indexes:** unique `(workspace_id, lower(domain))` where `domain IS NOT NULL`; `lp_organizations(workspace_id, name)`.

##### Table: `lp_contacts`

LP person record. Foreign key to `lp_organizations` (every LP belongs to a firm). Carries every behavioural attribute and GP-confirmed fact that drives signals and metrics. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_organization_id` | uuid | not null | | fk → `lp_organizations.id` | |
| `fund_id` | uuid | null | | fk → `funds.id` | The fund this LP is being raised against |
| `relationship_owner_user_id` | uuid | null | | fk → `users.id` | Workspace member who owns this relationship; missed-reply notifications route here |
| `first_name` | text | null | | | |
| `last_name` | text | null | | | |
| `display_name` | text | not null | | | Convenience render |
| `primary_email` | citext | not null | | | Match key |
| `additional_emails` | citext[] | not null | `'{}'` | | Secondary addresses |
| `linkedin_url` | text | null | | | |
| `phone` | text | null | | | |
| `title` | text | null | | | |
| `seniority` | text | null | | check in (`'analyst'`, `'associate'`, `'principal'`, `'partner'`, `'cio'`, `'ceo'`, `'legal'`, `'other'`) | V1 light role detection |
| `is_decision_maker` | boolean | null | | | Tri-state: null = unknown |
| `is_gatekeeper` | boolean | null | | | |
| **Pipeline state (Section 8 §8.2):** | | | | | |
| `pipeline_stage` | text | not null | `'sourced'` | check in (`'sourced'`, `'first_meeting'`, `'nurturing'`, `'active_diligence'`, `'soft_commit'`, `'committed'`, `'closed_lost'`, `'on_hold'`) | Single canonical taxonomy |
| `tier` | text | null | | check in (`'tier_1'`, `'tier_2'`, `'tier_3'`, `'unset'`) | GP-set priority |
| `investor_type` | text | null | | check in (`'sovereign_pension'`, `'endowment'`, `'foundation'`, `'family_office'`, `'fund_of_funds'`, `'asset_manager'`, `'allocator_consultant'`, `'bank_wealth'`, `'insurance'`, `'other'`) | Allocator / LP **Type** column on Relationships list (v3 UI); advanced filters and CSV mapping |
| **Captured attributes (Section 8 §8.4):** | | | | | |
| `mandate_fit` | text | not null | `'unknown'` | check in (`'confirmed_fit'`, `'potential_fit'`, `'mandate_mismatch'`, `'unknown'`) | Drives the framework's "single most valuable query" |
| `mandate_fit_captured_at` | timestamptz | null | | | When the GP last confirmed |
| `prior_fund_investor` | boolean | not null | `false` | | Re-up cohort flag |
| `prior_fund_identifier` | text | null | | | E.g. "Fund II" |
| `prior_commitment_amount` | numeric(18,2) | null | | | Used in Focus list (Metric 10) metadata |
| `prior_commitment_currency` | varchar(3) | null | | | |
| **Sizing for Section 9 metrics:** | | | | | |
| `expected_commitment_amount` | numeric(18,2) | null | | | New per §9.4 schema addition 1; null = exclude from sum-based metrics |
| `expected_commitment_currency` | varchar(3) | null | | | Defaults to fund's currency |
| `expected_commitment_captured_at` | timestamptz | null | | | |
| **Provenance:** | | | | | |
| `source` | text | not null | | check in (`'crm_csv'`, `'affinity_api'`, `'email_sync'`, `'tomo_derived'`, `'gp_edited'`, `'manual'`) | |
| `source_external_id` | text | null | | | Upstream CRM contact id |
| `csv_import_id` | uuid | null | | fk → `csv_imports.id` | The import that created this row |
| `historical_data_only` | boolean | not null | `false` | | True when LP has only metadata-tier data per §3.3 |

**Indexes:** unique `(workspace_id, lower(primary_email))`; `lp_contacts(workspace_id, lp_organization_id)`; `lp_contacts(workspace_id, pipeline_stage)`; `lp_contacts(workspace_id, mandate_fit)`; `lp_contacts(workspace_id, prior_fund_investor)`; `lp_contacts(workspace_id, relationship_owner_user_id)`; `lp_contacts(workspace_id, fund_id)`; `lp_contacts(workspace_id, investor_type)` partial where `investor_type IS NOT NULL`.

**Audit trigger:** every change is captured to `activity_log`.

##### Table: `lp_state`

Derived per-LP state, recomputed by the nightly batch. One row per `lp_contact_id`. **All values in this table are derived and batch-owned except one GP-authoritative field:** `off_channel_active_until` (set/cleared only via the Relationships LP-record affordance in §3.10 and its API; the nightly batch **reads** it for suppression rules in §3.5 and does not overwrite it). Computed by the signals engine (§3.5) and read by the metrics engine (§3.6). *(Workspace-scoped; soft-delete via cascade only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `lp_contact_id` | uuid | not null | | pk, fk → `lp_contacts.id` | One-to-one |
| **Silence (Signal 1):** | | | | | |
| `last_meaningful_touch_at` | timestamptz | null | | | Most recent interaction satisfying meaningful-touch (Section 8 §8.2) |
| `days_since_meaningful_touch` | int | null | | | floor((now − last_meaningful_touch_at) / 86400) |
| **Pipeline flag (Section 8 §8.7):** | | | | | |
| `pipeline_flag` | text | not null | `'green'` | check in (`'green'`, `'amber'`, `'red'`) | Output of locked algorithm |
| `pipeline_flag_reason` | text | null | | | Plain-English explanation, surfaced on LP card |
| `pipeline_flag_computed_at` | timestamptz | null | | | |
| `off_channel_active_until` | timestamptz | null | | | GP-set via §3.10 *I'm in touch off-channel*; when in the future, silence-class signals and silence-derived Radar cohorts are suppressed per BR-3.5.8–BR-3.5.10. Rolling 30-day window from each set/extend action. |
| **Re-engagement (Signal 2):** | | | | | |
| `re_engagement_flag` | boolean | not null | `false` | | True for 24h after re-engagement detected |
| `re_engagement_detected_at` | timestamptz | null | | | |
| **Reply velocity (Signal 3):** | | | | | |
| `reply_velocity_trend` | text | null | | check in (`'accelerating'`, `'flat'`, `'decelerating'`) | Suppressed when <5 prior exchanges |
| `reply_velocity_latency_hrs_recent` | numeric | null | | | Latest reply latency in hours |
| `reply_velocity_baseline_hrs` | numeric | null | | | Pre-recent average |
| **Reply length (Signal 4):** | | | | | |
| `reply_length_trend` | text | null | | check in (`'accelerating'`, `'flat'`, `'decelerating'`) | Suppressed when <3 prior replies |
| `reply_length_words_recent` | int | null | | | Latest reply word count (post-quote-strip) |
| `reply_length_baseline_words` | int | null | | | |
| `reply_length_drop_pct` | numeric(5,2) | null | | | Negative = drop |
| **Reply initiation (Signal 5):** | | | | | |
| `lp_initiation_count_last_5` | int | not null | `0` | | |
| `lp_initiation_ratio` | numeric(5,4) | not null | `0` | | 0.0 to 1.0 |
| `last_lp_initiated_at` | timestamptz | null | | | |
| **Stage stagnation (Signal 6):** | | | | | |
| `days_in_current_stage` | int | not null | `0` | | |
| `days_in_prior_stage` | int | null | | | Per Section 8 §8.4 — second-most-used filter |
| `prior_stage_name` | text | null | | check in same as `pipeline_stage` plus null | |
| `stage_stagnation_flag` | text | not null | `'green'` | check in (`'green'`, `'amber'`, `'red'`) | |
| **Calendar friction (Signal 7):** | | | | | |
| `calendar_friction_trend` | text | null | | check in (`'improving'`, `'stable'`, `'worsening'`) | |
| `calendar_accept_latency_hrs_recent` | numeric | null | | | |
| `calendar_reschedule_count_last_3` | int | not null | `0` | | |
| **CC expansion (Signal 8):** | | | | | |
| `cc_expansion` | boolean | not null | `false` | | True if new firm contact appeared on threads in last 14 days |
| `cc_expansion_detected_at` | timestamptz | null | | | |
| `cc_expansion_new_contacts` | text[] | not null | `'{}'` | | Email addresses pending GP confirmation |
| **One-way contact (Signal 9):** | | | | | |
| `last_contact_was_one_way` | boolean | not null | `false` | | |
| `last_outbound_no_reply_sent_at` | timestamptz | null | | | The unanswered email |
| **V1 captured / V2 surfaced (Section 8 §8.5):** | | | | | |
| `warm_ghost_flag` | boolean | not null | `false` | | Combined pattern; not displayed in V1 |
| `close_proximity_flag` | boolean | not null | `false` | | Used as silence override in V1; named flag in V2 |
| **Bookkeeping:** | | | | | |
| `last_batch_run_at` | timestamptz | null | | | When the nightly batch last computed this row |

**Indexes:** `lp_state(workspace_id, pipeline_flag)`; `lp_state(workspace_id, re_engagement_flag)` partial where `re_engagement_flag = true`; `lp_state(workspace_id, last_meaningful_touch_at)`; `lp_state(workspace_id, last_contact_was_one_way)` partial where `last_contact_was_one_way = true`; `lp_state(workspace_id, cc_expansion)` partial.

##### Table: `lp_stage_transitions`

Append-only history of every pipeline-stage change per LP. Powers Signal 6 (stage stagnation with prior-stage history). Mandatory per Section 8 §8.2 — cannot be retrofitted. *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `from_stage` | text | null | | check in same enum as `pipeline_stage` | Null on first row (initial stage assignment) |
| `to_stage` | text | not null | | check in same enum | |
| `transitioned_at` | timestamptz | not null | `now()` | | |
| `actor_user_id` | uuid | null | | fk → `users.id` | Null when set by post-meeting capture or system |
| `source` | text | not null | | check in (`'manual'`, `'post_meeting_capture'`, `'tomo_agent'`, `'csv_import'`, `'affinity_pull'`) | |
| `note` | text | null | | | Free-text reason if GP added one |

**Indexes:** `lp_stage_transitions(workspace_id, lp_contact_id, transitioned_at DESC)`.

##### Table: `lp_tags`

Tag dictionary per workspace. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | |
| `slug` | text | not null | | | |
| `color` | text | null | | | Hex |
| `is_system` | boolean | not null | `false` | | True for default tags created at onboarding |

**Indexes:** unique `(workspace_id, lower(name))`.

##### Table: `lp_tag_assignments`

Many-to-many between `lp_contacts` and `lp_tags`. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `lp_tag_id` | uuid | not null | | fk → `lp_tags.id` | |
| `assigned_by_user_id` | uuid | null | | fk → `users.id` | |

**Indexes:** unique `(lp_contact_id, lp_tag_id)`; `lp_tag_assignments(lp_tag_id)`.

##### Table: `lp_notes`

Free-text notes attached to an LP. Distinct from meeting briefs. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `author_user_id` | uuid | not null | | fk → `users.id` | |
| `body` | text | not null | | | |
| `pinned` | boolean | not null | `false` | | Top-of-card display |

**Indexes:** `lp_notes(workspace_id, lp_contact_id, created_at DESC)`.

#### 6.2.3. Interactions

##### Table: `lp_email_threads`

Email thread record. Maintains conversation continuity across replies and CC additions. One row per provider thread id per workspace. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `provider` | text | not null | | check in (`'microsoft'`, `'google'`) | |
| `provider_thread_id` | text | not null | | | Gmail `threadId` / Microsoft `conversationId` |
| `subject` | text | null | | | Most recent subject line |
| `first_message_at` | timestamptz | not null | | | |
| `last_message_at` | timestamptz | not null | | | |
| `participant_emails` | citext[] | not null | `'{}'` | | All known participants |
| `lp_organization_id` | uuid | null | | fk → `lp_organizations.id` | Resolved firm if any participant matches a firm domain |

**Indexes:** unique `(workspace_id, provider, provider_thread_id)`; `lp_email_threads(workspace_id, lp_organization_id, last_message_at DESC)`.

##### Table: `lp_interactions`

Unified row for every email and message exchanged with an LP. Three-tier ingestion (per §3.3 / `tomo_email_ingestion_strategy.md`): rows in the 0–12 month window carry full body text; 13–36 month window carries metadata only (`body_text IS NULL`, `metadata_only = true`); >36 months are not ingested. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | null | | fk → `lp_contacts.id` | Resolved LP if matchable |
| `lp_organization_id` | uuid | null | | fk → `lp_organizations.id` | Resolved firm |
| `lp_email_thread_id` | uuid | null | | fk → `lp_email_threads.id` | |
| `interaction_type` | text | not null | | check in (`'email_inbound'`, `'email_outbound'`, `'meeting_held'`, `'meeting_declined'`, `'meeting_rescheduled'`, `'linkedin_inbound'`, `'manual_log'`) | |
| `direction` | text | not null | | check in (`'inbound'`, `'outbound'`, `'system'`) | |
| `interacted_at` | timestamptz | not null | | | When the message was sent / event occurred |
| `subject` | text | null | | | |
| `body_text` | text | null | | | Stripped of signatures and quote blocks; null in metadata tier |
| `body_html_archived_url` | text | null | | | S3 pointer to original HTML (full content tier only); null otherwise |
| `word_count` | int | null | | | Computed defensively per §8.9 clarification 9 |
| `word_count_confidence` | text | null | | check in (`'high'`, `'low'`, `'suppressed'`) | Per defensive computation rule |
| `attachment_count` | int | not null | `0` | | |
| `is_ooo` | boolean | not null | `false` | | OOO detection |
| `metadata_only` | boolean | not null | `false` | | True for 13–36 month tier |
| **Provider linkage:** | | | | | |
| `provider` | text | not null | | check in (`'microsoft'`, `'google'`, `'manual'`) | |
| `provider_message_id` | text | null | | | Gmail `id` / Microsoft `internetMessageId` |
| `provider_internet_message_id` | text | null | | | RFC `Message-ID` header — universal de-dupe across forwards |
| `from_email` | citext | null | | | |
| `to_emails` | citext[] | not null | `'{}'` | | |
| `cc_emails` | citext[] | not null | `'{}'` | | |
| `bcc_emails` | citext[] | not null | `'{}'` | | Outbound only |
| **Signal-engine inputs:** | | | | | |
| `is_meaningful_touch` | boolean | not null | `false` | | Computed at ingest per §8.2 definition |
| `is_truly_lp_initiated` | boolean | null | | | Strict definition per §8.3 Signal 5 |
| **Bookkeeping:** | | | | | |
| `ingested_at` | timestamptz | not null | `now()` | | |
| `source_user_id` | uuid | null | | fk → `users.id` | The mailbox owner this came from |

**Indexes:** unique `(workspace_id, provider, provider_internet_message_id)` where `provider_internet_message_id IS NOT NULL`; `lp_interactions(workspace_id, lp_contact_id, interacted_at DESC)`; `lp_interactions(workspace_id, lp_email_thread_id)`; `lp_interactions(workspace_id, interaction_type, interacted_at DESC)`; `lp_interactions(workspace_id, is_meaningful_touch, interacted_at DESC)` partial.

##### Table: `lp_calendar_events`

Calendar event record from MS Graph or Google Calendar. Drives Signal 1 (meeting held = meaningful touch), Signal 7 (calendar friction), and meeting prep (§3.13). *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `provider` | text | not null | | check in (`'microsoft'`, `'google'`) | |
| `provider_event_id` | text | not null | | | |
| `provider_calendar_id` | text | not null | | | Owning calendar |
| `lp_contact_id` | uuid | null | | fk → `lp_contacts.id` | Resolved LP if any non-organiser attendee matches |
| `lp_organization_id` | uuid | null | | fk → `lp_organizations.id` | Resolved firm |
| `subject` | text | null | | | |
| `start_at` | timestamptz | not null | | | |
| `end_at` | timestamptz | not null | | | |
| `booked_duration_minutes` | int | not null | | | end_at − start_at |
| `actual_duration_minutes` | int | null | | | From transcript or recap when available; null otherwise (§8.3 Signal 7 caveat) |
| `is_online_meeting` | boolean | not null | `false` | | |
| `online_meeting_provider` | text | null | | check in (`'teams'`, `'meet'`, `'zoom'`, `'webex'`, `'other'`) | |
| `online_meeting_join_url` | text | null | | | |
| `status` | text | not null | | check in (`'scheduled'`, `'confirmed'`, `'tentative'`, `'cancelled'`, `'rescheduled'`, `'completed'`, `'no_show'`) | |
| `invite_sent_at` | timestamptz | null | | | |
| `accepted_at` | timestamptz | null | | | |
| `declined_at` | timestamptz | null | | | |
| `accept_latency_hrs` | numeric | null | | | (accepted_at − invite_sent_at) / 3600 |
| `reschedule_count` | int | not null | `0` | | |
| `organizer_email` | citext | null | | | |
| `is_lp_organized` | boolean | not null | `false` | | LP-initiated meeting |
| `ingested_at` | timestamptz | not null | `now()` | | |
| `source_user_id` | uuid | null | | fk → `users.id` | |

**Indexes:** unique `(workspace_id, provider, provider_event_id)`; `lp_calendar_events(workspace_id, lp_contact_id, start_at DESC)`; `lp_calendar_events(workspace_id, status, start_at DESC)`.

##### Table: `lp_calendar_event_attendees`

Per-attendee row for each calendar event. Captures composition for V1 logging and V2 role detection per Section 8 §8.10. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_calendar_event_id` | uuid | not null | | fk → `lp_calendar_events.id` | |
| `email` | citext | not null | | | |
| `display_name` | text | null | | | |
| `domain` | text | null | | | Computed from email |
| `is_organizer` | boolean | not null | `false` | | |
| `is_required` | boolean | not null | `true` | | Required vs optional |
| `response_status` | text | null | | check in (`'accepted'`, `'declined'`, `'tentative'`, `'no_response'`) | |
| `seniority_inferred` | text | null | | check in (`'analyst'`, `'associate'`, `'principal'`, `'partner'`, `'cio'`, `'ceo'`, `'legal'`, `'other'`) | V1 light role detection from signature parsing — captured, not surfaced |
| `lp_contact_id` | uuid | null | | fk → `lp_contacts.id` | Linked when a known LP |

**Indexes:** unique `(lp_calendar_event_id, email)`; `lp_calendar_event_attendees(domain)`.

##### Table: `lp_meeting_transcripts`

Transcript record fetched from Microsoft Teams (`OnlineMeetingTranscript.Read.All`) or Google Meet (`meetings.space.readonly` + `drive.meet.readonly`). Stored as text plus structured speaker turns. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_calendar_event_id` | uuid | not null | | fk → `lp_calendar_events.id` | |
| `provider` | text | not null | | check in (`'teams'`, `'meet'`) | |
| `provider_transcript_id` | text | not null | | | |
| `language` | varchar(8) | null | | | BCP 47, e.g. `en-US` |
| `transcript_text` | text | not null | | | Concatenated speaker turns |
| `transcript_jsonb` | jsonb | not null | | | Structured: `[{speaker, start_ms, end_ms, text}, ...]` |
| `duration_seconds` | int | null | | | |
| `fetched_at` | timestamptz | not null | `now()` | | |
| `fetched_by_user_id` | uuid | not null | | fk → `users.id` | Whose OAuth token was used |

**Indexes:** unique `(provider, provider_transcript_id)`; `lp_meeting_transcripts(workspace_id, lp_calendar_event_id)`.

##### Table: `lp_meeting_recaps`

AI-generated meeting recap. Two paths per §3.13: (a) ingested from upstream (Microsoft 365 Copilot AI insight via `OnlineMeetingAiInsight.Read.All`, or Gemini for Workspace "Take notes for me" via Google Drive); (b) fallback — TOMO generates against `lp_meeting_transcripts.transcript_text` using its own LLM. Both paths populate the same row shape. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_calendar_event_id` | uuid | not null | | fk → `lp_calendar_events.id` | |
| `lp_meeting_transcript_id` | uuid | null | | fk → `lp_meeting_transcripts.id` | Null when upstream-ingested without transcript |
| `recap_source` | text | not null | | check in (`'ms_copilot'`, `'google_gemini'`, `'tomo_llm'`) | |
| `summary_text` | text | not null | | | |
| `key_points` | text[] | not null | `'{}'` | | Bullet array |
| `action_items_jsonb` | jsonb | not null | `'[]'` | | `[{owner, text, due_at_iso, source_speaker_turn_idx}]` |
| `decisions` | text[] | not null | `'{}'` | | |
| `unanswered_questions` | text[] | not null | `'{}'` | | Drives meeting prep next time |
| `follow_up_items_jsonb` | jsonb | not null | `'[]'` | | Drives the post-meeting capture pre-fill |
| `confidence` | numeric(5,4) | null | | | Model-self-reported when available |
| `generated_at` | timestamptz | not null | `now()` | | |

**Indexes:** unique `(lp_calendar_event_id, recap_source)`; `lp_meeting_recaps(workspace_id, lp_calendar_event_id)`.

#### 6.2.4. Signals and metrics

##### Table: `lp_signal_log`

**Append-only.** Every behavioural signal observation, every flag transition, and every flag-override event. The dataset that matters most for V3 — never overwrite, never truncate, never down-sample (per Section 8 §8.10). *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `signal_type` | text | not null | | check in (`'silence'`, `'re_engagement'`, `'reply_velocity'`, `'reply_length'`, `'reply_initiation'`, `'stage_stagnation'`, `'calendar_friction'`, `'cc_expansion'`, `'one_way_contact'`, `'warm_ghost_capture'`, `'close_proximity_capture'`, `'flag_transition'`, `'override_applied'`, `'off_channel_marked'`) | |
| `signal_value_jsonb` | jsonb | not null | | | Per-signal raw observation (e.g. `{"latency_series_hrs":[18,72,168], "trend":"decelerating", "baseline_avg_hrs":24}`) |
| `flag_before` | text | null | | | For `flag_transition` and `override_applied` |
| `flag_after` | text | null | | | |
| `reason` | text | null | | | Plain-English render |
| `observed_at` | timestamptz | not null | `now()` | | |
| `batch_run_id` | uuid | null | | | Set when emitted by nightly batch; null when emitted by event-driven hot path |
| `is_directional` | boolean | not null | `false` | | True when this observation indicates acceleration / deceleration / LP-init / close-prox event (per §8.7 fat-middle rule) |

**Indexes:** `lp_signal_log(workspace_id, lp_contact_id, observed_at DESC)`; `lp_signal_log(workspace_id, signal_type, observed_at DESC)`; `lp_signal_log(workspace_id, observed_at DESC)`; `lp_signal_log(workspace_id, is_directional, observed_at DESC)` partial where `is_directional = true`; `lp_signal_log(batch_run_id)`.

##### Table: `stage_cadence_benchmarks`

Per Section 8 §8.6. Global defaults per stage; per-workspace override deferred to V2. *(Not workspace-scoped — global table seeded by V1 migration.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `pipeline_stage` | text | not null | | pk; check enum | |
| `amber_threshold_days` | int | null | | | Null where not applicable (e.g. closed_lost) |
| `red_threshold_days` | int | null | | | |
| `notes` | text | null | | | |

**Seed values (V1):** `sourced` (60/90), `first_meeting` (21/35), `nurturing` (14/28), `active_diligence` (10/21), `soft_commit` (21/35), `committed` (21/35), `on_hold` (90/null), `closed_lost` (null/null).

##### Table: `daily_pipeline_summary`

**Append-only.** One row per workspace per day. Per Section 9 §9.4 schema addition 3. Drives Day 1 Gap trend (Metric 2), Pipeline velocity sparkline (9a), Cooling caught (9b). *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `snapshot_date` | date | not null | | | One per workspace per day |
| `day_1_gap_count` | int | not null | | | LPs with active stage + 60+ days silence |
| `day_1_gap_baseline` | int | null | | | Set on first row only (the onboarding snapshot baseline) |
| `pipeline_velocity_avg_days` | numeric | null | | | |
| `total_committed` | numeric(18,2) | not null | `0` | | Sum of expected_commitment for committed-stage |
| `total_soft_commit` | numeric(18,2) | not null | `0` | | |
| `total_active_pipeline` | numeric(18,2) | not null | `0` | | first_meeting through active_diligence |
| `cooling_currently_flagged` | int | not null | `0` | | LPs with pipeline_flag in (amber, red) |
| `moveability_count` | int | not null | `0` | | Count of LPs in Metric 3 cohort |
| `today_tile_drifting_act` | int | null | | | Optional materialisation: partition bucket — `pipeline_flag='red'` (active stages only) |
| `today_tile_stalling_watch` | int | null | | | Optional: `pipeline_flag='amber'` and not in Metric 3 cohort |
| `today_tile_healthy_on_track` | int | null | | | Optional: `pipeline_flag='green'` and not in Metric 3 cohort |
| `today_tile_moveable` | int | null | | | Optional: same as `moveability_count` when materialised for the tile; omit if derived from `moveability_count` column |
| `flag_resolutions_today` | int | not null | `0` | | Cooling caught "resolved" component |
| `currency` | varchar(3) | not null | `'USD'` | | Workspace primary at time of snapshot |
| `snapshot_run_id` | uuid | not null | | | Tie back to the batch run |

**Indexes:** unique `(workspace_id, snapshot_date)`; `daily_pipeline_summary(workspace_id, snapshot_date DESC)`.

##### Table: `tomo_action_log`

**Append-only.** Per Section 9 §9.4 schema addition 2. **Hard V1 dependency** — must be instrumented from day one of V1 ship; the first month of Time Recovered data is unrecoverable if logging starts late. *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | null | | fk → `lp_contacts.id` | Null for actions not tied to a single LP |
| `gp_user_id` | uuid | not null | | fk → `users.id` | |
| `action_type` | text | not null | | check in (`'draft'`, `'scheduling_thread'`, `'open_loop'`, `'missed_reply'`, `'meeting_prep'`, `'tier_correction'`, `'mandate_fit_capture'`, `'post_meeting_note'`, `'workflow_step'`, `'three_touch_send'`) | |
| `outcome` | text | null | | check in (`'pending'`, `'approved_unchanged'`, `'approved_with_edits'`, `'edited_substantially'`, `'dismissed'`, `'resolved'`, `'actioned'`, `'viewed'`, `'snoozed'`, `'expired'`) | Null at generation; set on user action |
| `character_change_pct` | numeric(5,2) | null | | | For draft actions; threshold per O-3 (default 30%) |
| `time_saved_minutes` | int | null | | | Per-action benchmark from O-2 |
| `metadata` | jsonb | not null | `'{}'` | | Action-specific fields |
| `generated_at` | timestamptz | not null | `now()` | | |
| `actioned_at` | timestamptz | null | | | Set when GP acts |
| `source_signal_log_id` | uuid | null | | fk → `lp_signal_log.id` | The signal that triggered this action, if any |

**Indexes:** `tomo_action_log(workspace_id, gp_user_id, generated_at DESC)`; `tomo_action_log(workspace_id, action_type, outcome, generated_at DESC)`; `tomo_action_log(workspace_id, lp_contact_id, generated_at DESC)`; `tomo_action_log(workspace_id, generated_at DESC)`.

##### Table: `reminders`

Unified table for the three reminder classes (open loops, missed replies, commitments) per §3.7 / Section 7.3 N-series. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `assigned_user_id` | uuid | not null | | fk → `users.id` | The relationship_owner; routing target |
| `reminder_type` | text | not null | | check in (`'open_loop'`, `'missed_reply'`, `'commitment'`) | |
| `title` | text | not null | | | |
| `description` | text | null | | | |
| `due_at` | timestamptz | not null | | | |
| `status` | text | not null | `'pending'` | check in (`'pending'`, `'snoozed'`, `'resolved'`, `'dismissed'`, `'auto_resolved'`, `'expired'`) | |
| `snoozed_until` | timestamptz | null | | | |
| `resolved_at` | timestamptz | null | | | |
| `resolution_evidence_jsonb` | jsonb | null | | | E.g. the outbound that resolved an open loop |
| `tier_at_creation` | text | null | | | Captured for missed-reply threshold logic |
| `source_open_loop_id` | uuid | null | | fk → `open_loops.id` | |
| `source_commitment_id` | uuid | null | | fk → `commitments.id` | |
| `source_interaction_id` | uuid | null | | fk → `lp_interactions.id` | The email that should have been replied to |

**Indexes:** `reminders(workspace_id, assigned_user_id, status, due_at)`; `reminders(workspace_id, lp_contact_id, status)`.

##### Table: `commitments`

Commitments extracted from transcripts and emails (per §3.13 / N-series). *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `committed_by` | text | not null | | check in (`'gp'`, `'lp'`) | Who promised it |
| `commitment_text` | text | not null | | | |
| `due_at` | timestamptz | null | | | When the commitment is due, if specified |
| `confidence` | text | not null | | check in (`'high'`, `'medium'`, `'low'`) | Per N-series R3: conservative V1, manual confirm for low |
| `source_type` | text | not null | | check in (`'meeting_recap'`, `'email_inbound'`, `'email_outbound'`, `'manual'`) | |
| `source_recap_id` | uuid | null | | fk → `lp_meeting_recaps.id` | |
| `source_interaction_id` | uuid | null | | fk → `lp_interactions.id` | |
| `confirmed_by_user_id` | uuid | null | | fk → `users.id` | When low-confidence commitments are GP-confirmed |
| `confirmed_at` | timestamptz | null | | | |
| `status` | text | not null | `'open'` | check in (`'open'`, `'fulfilled'`, `'dismissed'`, `'expired'`) | |

**Indexes:** `commitments(workspace_id, lp_contact_id, status, due_at)`.

##### Table: `open_loops`

Detected open loops — outbound GP messages containing a commitment to send/do something for the LP that has not been fulfilled. Per N-series R1: detection via subsequent outbound to same LP within 14 days containing reference to committed item. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `originating_interaction_id` | uuid | not null | | fk → `lp_interactions.id` | The outbound containing the commitment |
| `loop_text` | text | not null | | | Extracted commitment language |
| `confidence` | text | not null | | check in (`'high'`, `'medium'`, `'low'`) | |
| `status` | text | not null | `'open'` | check in (`'open'`, `'fulfilled'`, `'dismissed'`, `'expired'`) | |
| `fulfilled_by_interaction_id` | uuid | null | | fk → `lp_interactions.id` | Subsequent outbound that fulfilled |
| `expires_at` | timestamptz | null | | | |

**Indexes:** `open_loops(workspace_id, lp_contact_id, status)`.

#### 6.2.5. CRM integration

##### Table: `csv_imports`

One row per CSV upload event. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `uploaded_by_user_id` | uuid | not null | | fk → `users.id` | |
| `source_crm` | text | not null | | check in (`'affinity'`, `'backstop'`, `'foliometrics'`, `'hubspot'`, `'salesforce'`, `'sheets'`, `'excel'`, `'generic'`) | |
| `original_filename` | text | not null | | | |
| `s3_key` | text | not null | | | Storage pointer |
| `byte_size` | bigint | not null | | | |
| `row_count_total` | int | null | | | After parse |
| `row_count_imported` | int | null | | | After dedup + accept |
| `row_count_review` | int | null | | | Surfaced for GP review |
| `row_count_skipped` | int | null | | | |
| `column_headers` | text[] | not null | `'{}'` | | As parsed |
| `mapping_id` | uuid | null | | fk → `csv_field_mappings.id` | The mapping policy applied |
| `status` | text | not null | `'received'` | check in (`'received'`, `'parsing'`, `'mapping'`, `'review_required'`, `'importing'`, `'completed'`, `'failed'`) | |
| `error` | text | null | | | If failed |
| `is_initial_import` | boolean | not null | `false` | | True for the onboarding-time import |

**Indexes:** `csv_imports(workspace_id, created_at DESC)`; `csv_imports(workspace_id, status)`.

##### Table: `csv_field_mappings`

Reusable column → field map per source CRM per workspace. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `source_crm` | text | not null | | same enum as above | |
| `name` | text | not null | | | E.g. "Backstop default" |
| `column_map` | jsonb | not null | | | `{csv_column_name: tomo_field_name, ...}` |
| `confidence_jsonb` | jsonb | null | | | Per-column confidence at auto-map time |
| `created_by_user_id` | uuid | not null | | fk → `users.id` | |
| `is_active` | boolean | not null | `true` | | Reapplied automatically on re-import |

**Indexes:** unique `(workspace_id, source_crm, name)`; `csv_field_mappings(workspace_id, source_crm, is_active)`.

##### Table: `csv_dedupe_decisions`

Per-row review decisions surfaced during import phase 2. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `csv_import_id` | uuid | not null | | fk → `csv_imports.id` | |
| `csv_row_jsonb` | jsonb | not null | | | The candidate row |
| `match_lp_contact_id` | uuid | null | | fk → `lp_contacts.id` | Suggested match |
| `match_confidence` | text | not null | | check in (`'exact_email'`, `'name_plus_domain'`, `'fuzzy'`, `'no_match'`) | |
| `decision` | text | null | | check in (`'accept_match'`, `'create_new'`, `'reject'`, `'pending'`) | |
| `decided_by_user_id` | uuid | null | | fk → `users.id` | |
| `decided_at` | timestamptz | null | | | |

**Indexes:** `csv_dedupe_decisions(csv_import_id)`; `csv_dedupe_decisions(workspace_id, decision)`.

##### Table: `crm_sync_status`

Per-workspace, per-source sync health (CSV last upload, native CRM last pull for Affinity / Backstop when connected, MS Graph subscription health, Google Pub/Sub watch health). Drives the sync-staleness banner per §3.3. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `source` | text | not null | | check in (`'csv_affinity'`, `'csv_backstop'`, `'csv_foliometrics'`, `'csv_hubspot'`, `'csv_sheets'`, `'csv_excel'`, `'csv_generic'`, `'affinity_api'`, `'ms_graph_mail'`, `'ms_graph_calendar'`, `'ms_graph_teams'`, `'google_gmail'`, `'google_calendar'`, `'google_meet'`, `'google_drive'`, `'slack'`) | |
| `user_id` | uuid | null | | fk → `users.id` | Per-user where source is per-user (mail/cal/meet) |
| `last_success_at` | timestamptz | null | | | |
| `last_attempt_at` | timestamptz | null | | | |
| `last_error` | text | null | | | |
| `health` | text | not null | `'unknown'` | check in (`'healthy'`, `'degraded'`, `'failing'`, `'disconnected'`, `'unknown'`) | |
| `webhook_subscription_id` | text | null | | | MS Graph subscription id / Google channel id |
| `webhook_expires_at` | timestamptz | null | | | Resubscribe before expiry |
| `metadata` | jsonb | not null | `'{}'` | | |

**Indexes:** unique `(workspace_id, source, user_id)` (allowing null user_id); `crm_sync_status(webhook_expires_at)` for the resubscribe worker.

##### Table: `affinity_field_mappings` (V2-placeholder for write-back)

Maps TOMO fields to Affinity custom-field ids for bi-directional sync. **V1 ships the schema empty** — V1 **reads** via native CRM API **only** (Affinity and/or Backstop — whichever connectors are live; §3.4) and never writes to the SoR. Bi-directional Affinity is V2 (see §1.2 and §9.1). The table exists in the V1 migration to avoid migration churn at V2. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `tomo_field` | text | not null | | check in (`'tomo_signal_flag'`, `'tomo_signal_evidence'`, `'tomo_days_since_meaningful_touch'`, `'tomo_last_meaningful_touch_at'`, `'tomo_tier_correction'`, `'tomo_post_meeting_note'`) | |
| `affinity_field_id` | text | null | | | Set when V2 provisions custom fields |
| `affinity_field_type` | text | null | | check in (`'text'`, `'number'`, `'date'`, `'dropdown'`, `'note'`) | |
| `last_pushed_at` | timestamptz | null | | | |

**Indexes:** unique `(workspace_id, tomo_field)`.

#### 6.2.6. Workflows

##### Table: `workflows`

Workflow definition (locked default, configurable template, saved configuration, or user-created custom workflow). The four V1 Workflows-surface entries seeded at workspace creation: Post-Meeting Execution, F7 Three-Touch Qualification, Themed Outreach, Trip Orchestrator. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | |
| `slug` | text | not null | | | E.g. `pb-three-touch-qualification` |
| `description` | text | null | | | |
| `workflow_kind` | text | not null | `'user_custom'` | check in (`'locked_default'`, `'configurable_template'`, `'saved_configuration'`, `'user_custom'`) | Controls edit affordances on `/workflows` |
| `template_id` | uuid | null | | fk → `workflows.id` | Base template for saved configurations (e.g. Trip Orchestrator → Themed Outreach) |
| `parameters_jsonb` | jsonb | not null | `'{}'` | | Cohort, prompt-template, reply-handler, trip window, saved fund-update config; for `user_custom`: typed primary `action` + `actionBuild` + optional `followUp` leg + optional `list_id` / list link |
| `is_default` | boolean | not null | `false` | | True for the four V1 seed entries |
| `is_active` | boolean | not null | `true` | | |
| `trigger_type` | text | not null | | check in (`'manual'`, `'signal'`, `'event'`, `'scheduled'`) | |
| `trigger_config_jsonb` | jsonb | not null | `'{}'` | | E.g. `{"signal_type":"silence","flag":"red"}` |
| `target_list_filter_jsonb` | jsonb | null | | | Saved filter applied at run time |
| `created_by_user_id` | uuid | not null | | fk → `users.id` | |

**Indexes:** unique `(workspace_id, slug)`; `workflows(workspace_id, is_active)`.

##### Table: `workflow_steps`

Ordered steps within a workflow. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `workflow_id` | uuid | not null | | fk → `workflows.id` | |
| `step_index` | int | not null | | | 0-based |
| `step_type` | text | not null | | check in (`'action_draft'`, `'action_capture'`, `'action_attach'`, `'wait'`, `'gate'`) | |
| `name` | text | not null | | | |
| `config_jsonb` | jsonb | not null | `'{}'` | | Step-type-specific config |
| `wait_duration_hours` | int | null | | | For `wait` |
| `requires_approval` | boolean | not null | `true` | | Human-in-the-loop default |

**Indexes:** unique `(workflow_id, step_index)`.

##### Table: `workflow_runs`

One row per LP per workflow execution. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | Opaque per-LP run id; tagged on outbound for reply attribution |
| `workflow_id` | uuid | not null | | fk → `workflows.id` | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `cohort_launch_id` | uuid | not null | | | Shared across all LP rows from one Launch / trigger batch; run history UI groups on this |
| `list_id` | uuid | null | | fk → lists/pipelines | List context at launch |
| `started_by_user_id` | uuid | null | | fk → `users.id` | Null if signal-triggered |
| `launch_parameters_jsonb` | jsonb | not null | `'{}'` | | Theme, trip destination, etc. frozen at launch |
| `status` | text | not null | `'running'` | check in (`'running'`, `'paused'`, `'completed'`, `'cancelled'`, `'failed'`) | |
| `current_step_index` | int | null | | | |
| `started_at` | timestamptz | not null | `now()` | | |
| `completed_at` | timestamptz | null | | | |
| `outcome` | text | null | | check in (`'warmer_than_expected'`, `'maintaining_non_committal'`, `'genuinely_dormant'`, `'other'`) | F7 outcome classes |

**Indexes:** unique `(workflow_id, lp_contact_id, status)` partial where `status IN ('running','paused')`; `workflow_runs(workspace_id, status)`.

##### Table: `workflow_step_runs`

Per-step execution row. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `workflow_run_id` | uuid | not null | | fk → `workflow_runs.id` | |
| `workflow_step_id` | uuid | not null | | fk → `workflow_steps.id` | |
| `status` | text | not null | `'pending'` | check in (`'pending'`, `'in_progress'`, `'awaiting_approval'`, `'approved'`, `'sent'`, `'replied'`, `'skipped'`, `'failed'`) | `replied` set when inbound matches outbound per §3.12 item 4 |
| `tomo_action_log_id` | uuid | null | | fk → `tomo_action_log.id` | If this step generated an action |
| `started_at` | timestamptz | null | | | |
| `completed_at` | timestamptz | null | | | |
| `output_jsonb` | jsonb | null | | | Draft text; on send: `sent_interaction_id`, `provider_internet_message_id`, `lp_email_thread_id`, `sent_at`; on reply: `replied_at`, `inbound_interaction_id` |

**Indexes:** `workflow_step_runs(workflow_run_id, status)`.

##### Table: `outbound_safety_log`

Outbound deduplication log. Prevents two workflows from sending two emails to the same LP for the same trigger within a configurable window. *(Workspace-scoped, append-only-ish: kept 90 days then pruned.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `trigger_signature` | text | not null | | | Stable hash of trigger context |
| `outbound_at` | timestamptz | not null | `now()` | | |
| `workflow_id` | uuid | null | | fk → `workflows.id` | |
| `tomo_action_log_id` | uuid | null | | fk → `tomo_action_log.id` | |

**Indexes:** unique `(workspace_id, lp_contact_id, trigger_signature, outbound_at)`; `outbound_safety_log(outbound_at)` for pruning.

#### 6.2.7. Materials and briefs

##### Table: `materials`

Decks, fund updates, data rooms. V1 light: catalogue and basic metadata; engagement V2. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `fund_id` | uuid | null | | fk → `funds.id` | |
| `material_type` | text | not null | | check in (`'deck'`, `'update'`, `'data_room'`, `'ddq'`, `'tearsheet'`, `'other'`) | |
| `title` | text | not null | | | |
| `version` | text | null | | | |
| `s3_key` | text | null | | | Internal storage if uploaded |
| `external_url` | text | null | | | DocSend / DealRoom / Drive link |
| `notes` | text | null | | | |
| `uploaded_by_user_id` | uuid | not null | | fk → `users.id` | |

**Indexes:** `materials(workspace_id, fund_id, material_type)`.

##### Table: `briefs`

Meeting prep briefs and post-meeting briefs (the same entity type at different points in the lifecycle). *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `lp_calendar_event_id` | uuid | null | | fk → `lp_calendar_events.id` | The meeting this brief is for / about |
| `brief_phase` | text | not null | | check in (`'prep'`, `'post_meeting'`) | |
| `title` | text | not null | | | |
| `body_text` | text | not null | | | |
| `body_jsonb` | jsonb | not null | `'{}'` | | Structured sections (unanswered_questions, missed_materials, etc.) |
| `generated_by` | text | not null | | check in (`'tomo_llm'`, `'manual'`, `'capture_form'`) | |
| `viewed_at` | timestamptz | null | | | First-view timestamp; drives meeting_prep "viewed" outcome in action log |
| `commitments_extracted_count` | int | not null | `0` | | |
| `tomo_action_log_id` | uuid | null | | fk → `tomo_action_log.id` | |

**Indexes:** `briefs(workspace_id, lp_contact_id, brief_phase, created_at DESC)`; `briefs(workspace_id, lp_calendar_event_id)`.

##### Table: `material_engagement` (V2-placeholder)

Schema present in V1 migration; **populated in V2** (DocSend / DealRoom integration). Per Section 8 §8.10. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `material_id` | uuid | not null | | fk → `materials.id` | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `event_type` | text | not null | | check in (`'open'`, `'page_view'`, `'download'`, `'forward'`, `'return_visit'`) | |
| `event_at` | timestamptz | not null | | | |
| `metadata_jsonb` | jsonb | not null | `'{}'` | | Page index, dwell ms, etc. |

**Indexes:** `material_engagement(workspace_id, lp_contact_id, event_at DESC)` — created in V1 migration, empty until V2.

##### Table: `lp_document_engagement` (V2-placeholder)

Per Section 8 §8.10 V1 capture obligation. Specifically tracks sub-agreement / DDQ document access. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `document_type` | text | not null | | check in (`'sub_agreement'`, `'ddq_response'`, `'side_letter'`, `'other'`) | |
| `event_type` | text | not null | | check in (`'access'`, `'download'`, `'sign'`) | |
| `event_at` | timestamptz | not null | | | |

**Indexes:** `lp_document_engagement(workspace_id, lp_contact_id, event_at DESC)` — V1 migration creates schema; V2 populates.

##### Table: `lp_marketing_engagement` (V2-placeholder)

Per Section 8 §8.10. Mailchimp / HubSpot Marketing engagement events. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `campaign_external_id` | text | null | | | |
| `event_type` | text | not null | | check in (`'open'`, `'click'`, `'forward'`, `'unsubscribe'`) | |
| `event_at` | timestamptz | not null | | | |

**Indexes:** `lp_marketing_engagement(workspace_id, lp_contact_id, event_at DESC)` — V1 migration creates schema; V2 populates.

#### 6.2.8. Settings and notifications

##### Table: `user_preferences`

Per-user preferences. *(Workspace-scoped — preferences are per user *within* a workspace, since a user can be in multiple workspaces.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | |
| `timezone` | text | not null | `'UTC'` | | IANA |
| `daily_brief_enabled` | boolean | not null | `true` | | |
| `daily_brief_send_at_local` | time | not null | `'07:30'` | | Override of workspace default |
| `daily_brief_channels` | text[] | not null | `'{in_app,email}'` | | `in_app`, `email`, `slack` |
| `theme` | text | not null | `'system'` | check in (`'light'`, `'dark'`, `'system'`) | |
| `tomo_chat_default_open` | boolean | not null | `true` | | Today inline chat open on land |
| `pane_width_px` | int | null | | | Persists list/detail split |

**Indexes:** unique `(workspace_id, user_id)`.

##### Table: `notification_channels`

Per-user, per-channel, per-event-class preference matrix. *(Workspace-scoped.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | |
| `event_class` | text | not null | | check in (`'re_engagement_urgent'`, `'missed_reply'`, `'open_loop_due'`, `'commitment_due'`, `'daily_brief'`, `'cooling_caught'`, `'workflow_step_approval_needed'`) | |
| `channel_in_app` | boolean | not null | `true` | | |
| `channel_email` | boolean | not null | `false` | | |
| `channel_slack` | boolean | not null | `false` | | |
| `quiet_hours_start_local` | time | null | | | |
| `quiet_hours_end_local` | time | null | | | |

**Indexes:** unique `(workspace_id, user_id, event_class)`.

##### Table: `slack_workspace_connections`

One row per workspace per connected Slack workspace. Slack OAuth grants the workspace-level `chat:write` scope to a TOMO Slack app installed by an admin user. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `installed_by_user_id` | uuid | not null | | fk → `users.id` | |
| `slack_team_id` | text | not null | | | |
| `slack_team_name` | text | not null | | | |
| `bot_user_id` | text | not null | | | |
| `bot_access_token_encrypted` | text | not null | | | Supabase Vault |
| `app_id` | text | not null | | | |
| `default_channel_id` | text | null | | | |
| `default_channel_name` | text | null | | | |
| `installed_at` | timestamptz | not null | `now()` | | |
| `revoked_at` | timestamptz | null | | | |

**Indexes:** unique `(workspace_id, slack_team_id)`.

##### Table: `email_delivery_log`

**Append-only.** Outbound transactional email log (daily brief, invitations, magic links, password reset). *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `provider` | text | not null | | check in (`'postmark'`, `'ses'`) | |
| `provider_message_id` | text | null | | | |
| `to_email` | citext | not null | | | |
| `template` | text | not null | | check in (`'daily_brief'`, `'invite'`, `'magic_link'`, `'password_reset'`, `'reminder'`, `'other'`) | |
| `subject` | text | not null | | | |
| `sent_at` | timestamptz | not null | `now()` | | |
| `delivery_status` | text | null | | check in (`'queued'`, `'sent'`, `'delivered'`, `'bounced'`, `'failed'`, `'spam_complaint'`) | Updated via webhook |
| `delivery_error` | text | null | | | |
| `metadata_jsonb` | jsonb | not null | `'{}'` | | |

**Indexes:** `email_delivery_log(workspace_id, sent_at DESC)`; `email_delivery_log(provider, provider_message_id)`.

#### 6.2.9. Audit

##### Table: `activity_log`

**Append-only.** Audit-grade activity events per Section 7.3 C12. *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `actor_user_id` | uuid | null | | fk → `users.id` | Null = system actor |
| `action` | text | not null | | check in (`'draft_generated'`, `'draft_approved_unchanged'`, `'draft_approved_with_edits'`, `'draft_edited_substantially'`, `'draft_dismissed'`, `'draft_sent'`, `'signal_flag_changed'`, `'re_engagement_detected'`, `'workflow_step_created'`, `'workflow_step_approved'`, `'workflow_step_sent'`, `'workflow_step_completed'`, `'workflow_step_cancelled'`, `'post_meeting_capture_completed'`, `'post_meeting_capture_skipped'`, `'csv_import_completed'`, `'crm_record_created'`, `'crm_record_updated'`, `'lp_stage_changed'`, `'mandate_fit_changed'`, `'expected_commitment_changed'`, `'integration_connected'`, `'integration_disconnected'`, `'workspace_member_invited'`, `'workspace_member_joined'`, `'workspace_member_removed'`, `'oauth_token_refreshed'`, `'oauth_token_revoked'`, `'fund_target_changed'`) | |
| `target_table` | text | null | | | E.g. `lp_contacts` |
| `target_id` | uuid | null | | | |
| `before_jsonb` | jsonb | null | | | |
| `after_jsonb` | jsonb | null | | | |
| `metadata_jsonb` | jsonb | not null | `'{}'` | | E.g. user agent, IP for auth events |

**Indexes:** `activity_log(workspace_id, created_at DESC)`; `activity_log(workspace_id, action, created_at DESC)`; `activity_log(workspace_id, actor_user_id, created_at DESC)`; `activity_log(target_table, target_id)`.

##### Table: `agent_tool_calls`

**Append-only.** Per-tool-invocation log for the Tomo agent (per §3.14). *(Workspace-scoped, append-only.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | not null | | fk → `users.id` | |
| `surface` | text | not null | | check in (`'home'`, `'workflows'`, `'workflow_creator'`, `'relationships'`, `'lists'`, `'targets'`, `'activity'`, `'materials'`, `'search'`, `'settings'`, `'insights'`, `'drawer'`, `'today'`) | |
| `tool_name` | text | not null | | check in (`'filter_relationships'`, `'update_workflow'`, `'update_crm'`, `'draft_reply'`, `'create_user_workflow'`, `'capture_post_meeting'`, `'compose_meeting_prep'`, `'other'`) | |
| `arguments_jsonb` | jsonb | not null | | | The tool call arguments |
| `result_jsonb` | jsonb | null | | | The tool call result |
| `requires_confirmation` | boolean | not null | `false` | | True for any mutation |
| `confirmation_status` | text | null | | check in (`'pending'`, `'confirmed'`, `'cancelled'`, `'auto_executed'`) | |
| `error` | text | null | | | |
| `latency_ms` | int | null | | | |
| `model` | text | null | | | E.g. `gpt-4o-2024-11-20` |

**Indexes:** `agent_tool_calls(workspace_id, user_id, created_at DESC)`; `agent_tool_calls(workspace_id, tool_name, created_at DESC)`.

##### Table: `auth_events`

**Append-only.** Authentication and authorisation events for SOC 2. *(Not workspace-scoped at insert; workspace_id null for events that pre-date workspace resolution.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `user_id` | uuid | null | | fk → `users.id` | |
| `workspace_id` | uuid | null | | fk → `workspaces.id` | Resolved when known |
| `event_type` | text | not null | | check in (`'sign_in_success'`, `'sign_in_failure'`, `'sign_out'`, `'session_refresh'`, `'password_reset_requested'`, `'password_reset_completed'`, `'mfa_challenged'`, `'mfa_succeeded'`, `'mfa_failed'`, `'oauth_grant'`, `'oauth_refresh'`, `'oauth_revoke'`, `'staff_data_access'`, `'admin_query_executed'`) | |
| `provider` | text | null | | check in (`'firebase_password'`, `'firebase_google'`, `'firebase_microsoft'`, `'firebase_link'`, `'microsoft_graph'`, `'google_workspace'`, `'slack'`, `'system'`) | |
| `ip_address` | inet | null | | | |
| `user_agent` | text | null | | | |
| `metadata_jsonb` | jsonb | not null | `'{}'` | | |

**Indexes:** `auth_events(user_id, created_at DESC)`; `auth_events(workspace_id, created_at DESC)`; `auth_events(event_type, created_at DESC)`.

##### Table: `data_access_log`

**Append-only.** Records reads of customer data by TOMO staff (e.g. via internal ops dashboard or admin Supabase queries). Required for the SOC 2 access-management policy in lieu of the V2 in-product impersonation feature. Populated by application middleware on TOMO-staff sessions and by an audit-only Postgres role used for ad-hoc admin queries. *(Not workspace-scoped at insert; workspace_id resolved when the read targets a specific workspace.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `staff_user_id` | uuid | not null | | fk → `users.id` | The TOMO staff user |
| `workspace_id` | uuid | null | | fk → `workspaces.id` | Workspace whose data was read |
| `access_method` | text | not null | | check in (`'ops_dashboard'`, `'admin_sql'`, `'api_support_tool'`) | |
| `purpose` | text | not null | | | Free-text reason ("Geoff onboarding session", "support ticket #1234") |
| `tables_accessed` | text[] | not null | `'{}'` | | |
| `record_ids_accessed` | uuid[] | not null | `'{}'` | | When known |
| `query_hash` | text | null | | | SHA-256 of normalised SQL when admin_sql |
| `customer_notified` | boolean | not null | `false` | | V1: false by default; V2 will require true |

**Indexes:** `data_access_log(staff_user_id, created_at DESC)`; `data_access_log(workspace_id, created_at DESC)`.

### 6.3. Data dictionary

The data dictionary is the per-field reference for fields that participate in signals or metrics or that have non-obvious semantics. Listed alphabetically by table.field.

| Field | Type / values | Source / derivation | Consumed by |
|---|---|---|---|
| `funds.raise_target` | numeric(18,2), nullable | GP-set at onboarding screen 4 — Your raise (Document B) or Settings → Funds | Metric 1 (Capital vs Target), Metric 4 (Concentration alert) |
| `funds.concentration_threshold_pct` | numeric, default 20.00 | Hardcoded V1; per-fund configurable V1.5 | Metric 4 |
| `lp_calendar_events.actual_duration_minutes` | int, nullable | Transcript when available, else null (do not impute) | Signal 7 (calendar friction); §8.3 caveat |
| `lp_calendar_events.accept_latency_hrs` | numeric | (`accepted_at` − `invite_sent_at`) / 3600 | Signal 7 |
| `lp_calendar_events.reschedule_count` | int | Incremented on each reschedule | Signal 7 |
| `lp_contacts.expected_commitment_amount` | numeric(18,2), nullable | GP-set via post-meeting capture or LP card | Metrics 1, 3, 4, 10 |
| `lp_contacts.mandate_fit` | enum(4) | GP-set via post-meeting capture | Section 8 §8.4; "single most valuable query" |
| `lp_contacts.pipeline_stage` | enum(8) | GP-set; transitions written to `lp_stage_transitions` | Signals 1, 6; Metrics 1, 3, 7, 8, 10 |
| `lp_contacts.prior_fund_investor` | boolean | CSV-tagged at onboarding or GP-edited | Metrics 3, 10; "Re-ups · Fund N" filter |
| `lp_contacts.tier` | enum(4) | GP-set; default unset | Missed-reply threshold logic |
| `lp_interactions.body_text` | text, nullable | Full-content tier only; null in metadata tier | Signal 4 (reply length); §3.13 commitment extraction |
| `lp_interactions.is_meaningful_touch` | boolean | Computed at ingest per §8.2 definition | Signal 1; Metric 8 |
| `lp_interactions.is_truly_lp_initiated` | boolean nullable | Strict definition per §8.3 Signal 5 | Signal 5 |
| `lp_interactions.metadata_only` | boolean | True for 13–36 month tier | Excludes from NLP-required signals |
| `lp_interactions.word_count_confidence` | enum(3) | Per defensive computation rule §8.9 clarification 9 | Signal 4 (suppress when low) |
| `lp_signal_log.is_directional` | boolean | True for acceleration / deceleration / LP-init / close-prox events | §8.7 fat-middle rule (no directional in 30 days → amber) |
| `lp_signal_log.signal_type='flag_transition'` | string | Written on every pipeline_flag change | Metric 9b (cooling caught "resolved" count) |
| `lp_state.days_in_prior_stage` | int nullable | Window function over `lp_stage_transitions` | Section 8 §8.4; "Slow to advance from [stage]" filter |
| `lp_state.last_contact_was_one_way` | boolean | One-way detection per §8.3 Signal 9 | "One-Way" named filter; Day 1 Gap output cohort |
| `lp_state.pipeline_flag` | enum(3) | Output of locked algorithm §8.7 | Lists table G/A/R dot; Metrics 3, 9 |
| `tomo_action_log.character_change_pct` | numeric(5,2) | Levenshtein-derived edit ratio for drafts | Draft approval rate classification (O-3 threshold 30%) |
| `tomo_action_log.outcome` | enum(10) | Set when GP acts on the action | Metric 5 (Time Recovered), Metric 6b (Draft approval rate) |
| `tomo_action_log.time_saved_minutes` | int nullable | Set per O-2 benchmarks on outcome | Metric 5 |
| `daily_pipeline_summary.day_1_gap_baseline` | int nullable | Set on first row only | Metric 2 ("32 reactivated" annotation) |

(Full alphabetical dictionary continues for every workspace-scoped field — to be expanded inline in the next iteration; the entries above cover every field that is signal- or metric-bearing, which is the audit-critical subset.)

### 6.4. Storage tiers and retention rules

| Class | Tables / data | Retention rule | Rationale |
|---|---|---|---|
| **Hot — full content** | `lp_interactions.body_text`, `lp_interactions.body_html_archived_url` (rows where `interacted_at >= now() − interval '12 months'`) | Bodies retained 12 months from `interacted_at`; nightly job nulls `body_text` and removes `body_html_archived_url` artefact at the 12-month boundary | Per `tomo_email_ingestion_strategy.md` cost discipline |
| **Warm — metadata** | `lp_interactions` rows with `metadata_only = true` (13–36 months from `interacted_at`) | Retained until 36 months from `interacted_at`, then row deleted | Per ingestion strategy |
| **Cold — none** | n/a | No ingestion beyond 36 months | Per ingestion strategy |
| **Append-only — V3 dataset** | `lp_signal_log`, `lp_stage_transitions`, `tomo_action_log`, `daily_pipeline_summary`, `agent_tool_calls`, `activity_log`, `auth_events`, `data_access_log`, `email_delivery_log` | Retained indefinitely; no purge job. Aggregates (downsamples) happen in V3 model-training pipeline and write to V3 tables — never overwrite V1 raw rows | Section 8 §8.10 long-term moat |
| **Soft-deleted rows** | All tables with `deleted_at` | Retained 30 days from `deleted_at`, then hard-deleted by daily purge job. Account-deletion procedure also fires hard-delete on confirmation | GDPR right-to-erasure |
| **OAuth tokens** | `oauth_tokens` | Tokens revoked on user disconnect; row retained for audit (revoked_at populated, ciphertext zeroised) | SOC 2 audit |
| **Backups** | Supabase managed PITR | 7-day point-in-time recovery, daily snapshot retained 30 days | RPO 1 hour, RTO 4 hours |
| **CSV originals** | `csv_imports.s3_key` files | Retained 90 days from import; auto-purged | Re-import diagnostic only |
| **Materials** | `materials.s3_key` files | Retained for life of workspace; deleted on workspace hard-delete | Customer asset |

### 6.5. Migration and import strategy

**V1 migration sequence (Supabase migrations, idempotent, ordered):**

1. Extensions: `pgcrypto`, `citext`, `pg_trgm`, `pgvault` (Supabase Vault).
2. Enum-substitute CHECK constraints declared inline per table (Postgres `text` + `CHECK`); enums as text simplifies migrations vs `CREATE TYPE`.
3. Tables created in dependency order: `users` → `workspaces` → `workspace_members` → `funds` → `oauth_tokens` → `tone_profiles` → `lp_organizations` → `lp_contacts` → `lp_state` → `lp_stage_transitions` → `lp_tags` → `lp_tag_assignments` → `lp_notes` → `lp_email_threads` → `lp_interactions` → `lp_calendar_events` → `lp_calendar_event_attendees` → `lp_meeting_transcripts` → `lp_meeting_recaps` → signals/metrics group → CRM group → workflows group → materials/briefs group (incl. V2-placeholders) → settings group → audit group.
4. Indexes created concurrently after tables.
5. RLS policies enabled on every workspace-scoped table.
6. Postgres triggers: `AFTER UPDATE` on `lp_contacts.pipeline_stage` writes a row to `lp_stage_transitions`; `AFTER UPDATE` on audited tables writes to `activity_log`.
7. Seed data: `stage_cadence_benchmarks` rows (eight); four V1 workflow entries seeded per workspace via post-creation trigger.

**Onboarding-time data ingestion (per Document B):**

1. CSV upload → `csv_imports` row → row-by-row parse to `csv_dedupe_decisions`.
2. Auto-mapping → `csv_field_mappings` candidate.
3. GP confirms ambiguous column mappings (onboarding **screen 2** CSV path).
4. On commit: rows written to `lp_organizations` and `lp_contacts` with `source='crm_csv'`.
5. Email sync (90 days full-content) starts; `lp_interactions` rows written.
6. Calendar sync (forward + 12 month back) starts; `lp_calendar_events` rows written.
7. Tone calibration runs against sent mail; `tone_profiles` row written.
8. Day 1 Gap computed; `daily_pipeline_summary` baseline row written with `day_1_gap_baseline` set.

**Ongoing sync:**

- Microsoft Graph subscriptions (`/me/messages` and `/me/events`) per user; Google Pub/Sub watches (Gmail `users.watch`, Calendar push notifications) per user. New events handled within seconds; degrade to 30-minute delta polling on subscription failure (per O-9).
- **Affinity webhook** (when Affinity native read is connected) updates LP records; Affinity v1 webhooks only.
- **Backstop** webhook or polling worker (when Backstop native read is connected) updates LP records per §3.4.
- Slack OAuth handshake stores `slack_workspace_connections`.
- Daily batch job at 02:00 workspace-local: recomputes `lp_state` for every active LP; appends `lp_signal_log` rows; appends `daily_pipeline_summary` row; computes V1 metrics.

---

## 7. System Constraints

### 7.1. Technology stack

The V1 stack is locked. Substitutions require PM and engineering lead approval.

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 16 (App Router) | Already in mock; SSR; route handlers for API; Vercel-native |
| UI runtime | React 19 | Mock baseline; concurrent features |
| Styling | Tailwind CSS 4 | Mock baseline; utility-first; Tailwind v4 Lightning CSS pipeline |
| Component primitives | Heroicons + Sonner + custom + selective shadcn/ui | Mock baseline |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) | Streaming, tool calls, surface-gated tools, mock baseline |
| Type system | TypeScript 5 | Mock baseline |
| Validation | Zod 4 | Mock baseline; runtime + type inference |
| Authentication | Firebase Authentication | Per user direction; Google + Microsoft + email; production-ready |
| Database | Supabase (Postgres 16) | Per user direction; RLS; storage; real-time |
| Hosting (web) | Vercel | Mock baseline; Next.js 16 native |
| Hosting (workers, batch) | AWS (ECS Fargate / Lambda / SQS / EventBridge / S3 / SES) | Per user direction (AWS infra); managed services |
| Identity providers (data sources) | Microsoft Azure App Registration; Google Cloud OAuth Client | Per user direction (Azure + GCP) |
| Email provider (transactional) | Postmark or AWS SES | Standard |
| Slack integration | Slack Web API + OAuth | Standard |
| Billing | Stripe | Mock baseline |
| Observability | Sentry (errors); PostHog or Vercel Analytics (product); CloudWatch (infra) | Standard |
| LLM provider | Google Gemini via Vertex AI (in TOMO's GCP project), accessed through Vercel AI SDK `@ai-sdk/google`. Mock uses OpenAI; V1 production switches to Vertex AI for enterprise data governance and zero-retention by default | Per O-15 |
| Search (V1) | Postgres full-text + trigram | Defer Algolia/Pinecone to V2 |
| QA | Playwright (existing in repo) + Vitest / Jest for units | Mock baseline |

### 7.2. Regulatory and legal

- **SOC 2 Type 1** is a contractual prerequisite for institutional GP customers post-FC.
- **CASA Tier 2** is required by Google for production OAuth scopes that read user mail, calendar, and Drive content (`gmail.modify`, `meetings.space.readonly`, `drive.meet.readonly`).
- **GDPR / CCPA** baseline: DPA template, sub-processor list, deletion-request flow, data residency disclosure (V1 = us-east-1 with eu-west-1 considered for V1.5).
- **Microsoft Graph terms of service** and **Google API services user data policy** apply to all data accessed via those APIs. No selling or transferring user data; no use for advertising; LLM provider must be configured for zero retention.
- **Affinity / Backstop terms of service** apply when the respective native CRM integration is connected; expanded diligence applies when bi-directional / write-back is enabled (V2 / V1.5+).
- **No-training-on-data** is a contractual commitment; the LLM provider configuration shall reflect this.

### 7.3. Budget, timeline, and team

- **Target ship:** see TOMO V1 Final Geoff doc — "2026 Roadmap" with V1 GA after the Founding Circle cohort wave.
- **Sprint cadence:** assumed 2-week sprints with 6-week V1 build window post-SRS lock per the V1 Final doc.
- **Headcount assumption:** small full-stack team (frontend + backend + integrations + design + PM); per V1 Final doc risks #5, multi-user adds 1.5–2 weeks.
- **Cost ceilings:** Supabase Pro + Vercel Pro + AWS managed services + LLM API budget within FC unit-economics envelope (specific numbers in Geoff doc).

### 7.4. Build constraints inherited from the mock app

- The mock uses `localStorage` for session and many state slices. Production V1 must replace these with Firebase Auth session and Supabase persistence. Specific localStorage keys to retire are listed in `APP_SUMMARY_FOR_AI_REVIEW.md` §6.
- Mock data files (`src/lib/mockData.ts`, `src/lib/mock-data.ts`, `src/lib/mockPlaybooks.ts`, `src/lib/mockLpNetwork.ts`, etc.) shall be retained only as fixtures for tests. Production code paths shall not import from them.
- The mock renders `Insights` against an inline `MOCK` constant (`src/app/insights/page.tsx`). Production V1 fetches from API routes backed by `daily_pipeline_summary` and `tomo_action_log`.
- The mock only wires real LLM streaming on `/workflows`. Production V1 wires streaming on every Tomo surface (Today inline, Workflows inline, Action Drawer, dock/sheet on other pages).
- The mock app does not enforce workspace boundaries. Production V1 enforces workspace isolation at the Supabase RLS layer and at every API route.
- Some mock pages (`/lp-network`, `/materials`, parts of `/momentum`) are exploratory or partially implemented. V1 scope confirms which surfaces ship; see §3 and §9.

---

## 8. Use Cases / User Stories

This section enumerates V1 user stories grouped by surface and capability area. The structure extends `docs/EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md` to cover every V1 feature including the Section 8/9 signals and metrics, the meeting transcript and AI-recap lifecycle, and onboarding-time email backfill. Each story carries actor, narrative, and testable acceptance criteria.

The default actor is the **GP** (general partner / fundraiser) unless otherwise noted. **Workspace teammate** stories highlight where multi-user behaviour differs. **TOMO operator** stories cover the Founding Circle support flow (manual in V1 per §3.1).

Stories are numbered `8.{group}.{n}`. Acceptance criteria use the `AC` prefix to align with §3 / §4 / §5 conventions and are independently QA-verifiable.

---

### 8.1. Shell and global behaviour

**Epic:** App chrome, navigation, and cross-cutting Tomo presence.

**Story 8.1.1 — Primary navigation.**
*As a GP, I can move between primary areas using the main navigation (Today, Relationships, Lists, Workflows) and reach Insights, Activity, and Settings from secondary navigation.*

- AC — All primary destinations load without broken routes; the active nav item reflects the current section on every refresh.
- AC — Insights and Settings are reachable from the avatar / overflow menu on desktop and from the bottom-nav overflow on mobile.
- AC — Mobile bottom navigation surfaces five destinations (Today, Relationships, Lists, Workflows, Settings); Insights and Activity surface in an overflow tap.
- AC — Legacy paths from the mock (`/today` → `/home`, `/contacts` → `/relationships`, `/pipeline` → `/lists`, `/workflow` → `/workflows`, `/briefs` → `/materials?tab=briefs`, `/tasks` → `/home`) return HTTP redirects to the canonical V1 routes.

**Story 8.1.2 — Three-pane layout (desktop).**
*As a GP on desktop, I can work in a list-and-detail layout that I can resize, with Tomo accessible everywhere.*

- AC — Resizing the list/detail split persists across sessions via `user_preferences.pane_width_px`.
- AC — Closing or collapsing a panel does not lose unsaved edits in the detail pane; an unsaved-changes prompt surfaces if I navigate away with edits.
- AC — Tomo is reachable on every authenticated surface (inline on Today and Workflows; FAB → dock on others).

**Story 8.1.3 — Mobile responsiveness.**
*As a GP on iPhone or Android, I can do every primary task without horizontal scrolling.*

- AC — Onboarding, Today, Relationships, Lists, Workflows, Insights, Settings render without horizontal scroll at 360px viewport width.
- AC — Touch targets are ≥ 44×44 px throughout.
- AC — Tomo opens as a bottom sheet (70–92vh) above the bottom nav.

**Story 8.1.4 — Deep links.**
*As a GP, I can paste a deep link into a fresh session and land on the right entity.*

- AC — `/relationships/{lp_id}` opens the LP detail directly when the session is authenticated.
- AC — Clicking a link in an email digest with no active session lands on sign-in then redirects to the original URL after auth.

**Story 8.1.5 — Sync staleness banner.**
*As a GP, I can see a banner on Today and Lists if my email or calendar sync is degraded, and I can reconnect from there.*

- AC — Banner surfaces within 5 minutes of three consecutive failed delta polls.
- AC — Banner shows last-success timestamp and a "Reconnect" affordance routing to Settings → Integrations.
- AC — Banner clears within 1 minute of successful resumption.

---

### 8.2. Authentication

**Epic:** Sign-up, sign-in, OAuth grants, password reset, account deletion.

**Story 8.2.1 — Sign-up and workspace creation.**
*As a new GP, I can sign up with email + password, Google, or Microsoft, and land in a freshly created workspace ready for onboarding.*

- AC — Choosing email + password triggers Firebase Auth's email-verification flow before sign-in completes.
- AC — Choosing Google or Microsoft completes via OAuth in a new tab and creates a `users` row plus a `workspaces` row with me as `owner_user_id`.
- AC — On first successful sign-in I land on `/onboarding`.
- AC — Concurrent sign-up attempts with the same email return a clear "account exists — sign in instead" message.

**Story 8.2.2 — Sign-in.**
*As a returning GP, I can sign in with the same provider I signed up with and land on Today.*

- AC — Firebase ID token in `Authorization` header authenticates every API call without a separate session cookie.
- AC — Cross-provider attempts (signed up with Google, attempting email + password with the same email) surface a "use Google to sign in" hint rather than create a duplicate account.

**Story 8.2.3 — Per-user data-source OAuth.**
*As a GP, I can authorise Microsoft Graph or Google Workspace separately from my Firebase sign-in to grant TOMO read/write access to my mailbox, calendar, contacts, and meeting transcripts.*

- AC — The OAuth consent screen lists every scope TOMO requests (per §4.2).
- AC — On grant, an `oauth_tokens` row is created with the token ciphertext and the granted scope array.
- AC — Revoking the grant in Settings → Integrations or upstream at the provider sets `oauth_tokens.revoked_at`, flips `crm_sync_status.health='disconnected'`, and writes an `auth_events` row.

**Story 8.2.4 — Workspace teammate invitation.**
*As the workspace owner, I can invite additional teammates and they can accept and start working immediately.*

- AC — Invitation email arrives within 1 minute and contains a single-use token expiring in 7 days.
- AC — Invites remain issuable regardless of existing member headcount at the workspace (subject to Stripe plan billing, not product "capacity").
- AC — Invitee accepting with a Firebase email different from the invitation address is rejected with a clear mismatch error.

**Story 8.2.5 — Password reset.**
*As a GP using email + password, I can reset my password via the standard Firebase reset flow.*

- AC — Reset email arrives within 1 minute and the link, used within Firebase's expiry window, allows password change.
- AC — Reset success writes a `password_reset_completed` row to `auth_events`.

**Story 8.2.6 — Account deletion.**
*As a GP, I can request deletion of my account from Settings → Profile, with a 30-day grace period.*

- AC — Deletion request marks `users.deleted_at` and surfaces a banner with the 30-day expiry.
- AC — During the grace period, the user can cancel deletion and resume access.
- AC — On confirmation or at expiry, `users.email` is hashed and PII is scrubbed from non-audit tables; `lp_signal_log` and `tomo_action_log` rows are preserved with NULL user references.

---

### 8.3. Onboarding

**Epic:** Eight-screen post-auth onboarding (Document B; `design/tomo_onboarding_v1.html`) through **Take me to the app** and Home. Historical email opt-in, meeting transcripts, and Slack are **Settings / background**, not wizard steps (§3.2).

**Story 8.3.1 — Welcome (screen 1).**
*As a new GP, I see the editorial welcome, time estimate, and identity strip, and I begin setup.*

- AC — Primary CTA **Begin setup** advances to connect; identity strip shows email and auth provider (mock).
- AC — Top chrome shows eight-segment progress and step label `01 / 08 · Welcome`.

**Story 8.3.2 — Connect data (screen 2).**
*As a GP, I connect Google Workspace or Microsoft 365 and satisfy the pipeline requirement via **Confirm import** on a pipeline card (CSV / Excel) or, in production, an Affinity API connection already stored from Settings.*

- AC — **Continue** stays disabled until workspace bundle is connected and (`contactImportUploaded` **or** `affinityConnected` when mirrored from Settings in production).
- AC — **All** pipeline cards (Backstop, Affinity, Foliometrics, HubSpot, generic CSV) use the **same** wizard flow: tap card → inline panel → file picker (auto-opens on first open) → mapping → **Confirm import** → panel closes → **Connected** pill; `crmCsvLabel` records the card. Native CRM API is **not** collected on this screen.
- AC — Tapping the **same** **Connected** card again reopens the panel for **Replace file** without resetting unrelated wizard state.
- AC — **Back** returns to Welcome; fixed bottom bar shows **Back** + **Continue** (only those controls receive clicks; bar backdrop does not block the grid); indexing ticker appears (mock, non-interactive).

**Story 8.3.3 — Fund profile (screen 3).**
*As a GP, I describe my fund so Tomo can calibrate signals and drafts.*

- AC — Fund name required before **Continue**; strategy select and narrative persist on `OnboardingState`.

**Story 8.3.4 — Raise profile (screen 4).**
*As a GP, I describe the active raise.*

- AC — Vehicle and target raise required before **Continue**; other fields optional per Document B.

**Story 8.3.5 — Team (screen 5).**
*As a GP, I see myself and can add raise-team members.*

- AC — Signed-in user appears as admin row; optional additional members persist in `teamMembersExtra`.

**Story 8.3.6 — Voice / tone (screen 6).**
*As a GP, I choose how Tomo captures my writing voice.*

- AC — Three options: sample from sent mail, manual paste, skip; selection persists as `toneCapture`.
- AC — Full tone model execution may still run post-connect per §3.9 — wizard captures **intent** only.

**Story 8.3.7 — First read (screen 7).**
*As a GP, I see mock “notices” that build confidence while indexing runs.*

- AC — Footer primary label **See the preview** advances to screen 8.

**Story 8.3.8 — Briefing preview & Home (screen 8).**
*As a GP, I see a five-number preview and enter the app.*

- AC — **Take me to the app** sets `onboardingComplete` and routes `/home`; secondary “wait for briefing” is informational (mock).
- AC — Screen 8 uses in-content CTAs (no fixed bottom bar).

**Story 8.3.9 — Onboarding resumability.**
*As a GP, I can close my browser and resume.*

- AC — `wizardStep` and fields persist under `tomo-onboarding-v2` (mock) / `users.onboarding_state_jsonb` (production).

**Story 8.3.10 — Settings preferences (parallel to wizard).**
*As a GP, I can configure historical email tiers, meeting transcripts, and Slack outside the wizard.*

- AC — `optInHistoricalEmailIngestion`, `optInMeetingTranscripts`, and Slack / radar flags remain on `OnboardingState` and Settings; not required to finish the eight screens.

**Story 8.3.11 — Email backfill three-tier model.**
*When historical email opt-in applies from Settings and/or FC defaults, TOMO follows the locked three-tier model (§3.3).*

- AC — With historical opt-in active, `lp_interactions` for the most recent 12 months carry `body_text` populated; months 13–36 carry `body_text=NULL` and `metadata_only=true`; nothing beyond 36 months.
- AC — Phase A (90-day full content) completes within 2 minutes; Phase B (4–12 months full content) within 30 minutes; Phase C (13–36 months metadata) within 2 hours.
- AC — A daily retention job nulls `body_text` and removes archived HTML at the 12-month boundary going forward.

**Story 8.3.12 — Day 1 Gap and daily rhythm (post-wizard).**
*First-session gap surfaces and daily-rhythm configuration remain outside the eight-screen flow.*

- AC — Day 1 Gap, duplicate review queues, and daily-brief scheduling follow §3.6 / Home / Settings — not gating **Take me to the app**.

---

### 8.4. Today / Home

**Epic:** Daily landing surface — attention queue, commitments, brief, inline Tomo.

**Story 8.4.1 — Daily Brief auto-open.**
*As a GP loading Today on the first visit of the local day, I see the unified Radar Modal (Daily Brief + On my radar) auto-open.*

- AC — The modal renders within 500ms of page load when it should auto-open.
- AC — A subsequent reload on the same local day does not re-open the modal.
- AC — Modal content follows **Appendix I — Radar Modal IA (v1)** (section headings, narrative header, stamp, collapsible sections, footer). Legacy four-block brief (meetings / urgent / compliance / signals only) is superseded for in-app structure.

**Story 8.4.2 — Attention queue.**
*As a GP, I see "What needs your attention" with today's most pressing items, sorted by priority.*

- AC — Items are sourced from `tomo_action_log` (outcome IS NULL) and `reminders` (status='pending').
- AC — Sort order: re-engagement urgent → red flag → amber flag → tier 1 missed reply → other reminders → drafts awaiting approval.
- AC — Items beyond today collapse into a "Previous (N)" control that's collapsed by default.

**Story 8.4.3 — Coming up.**
*As a GP, I see today's calendar events with LP attendees and commitments due today or tomorrow.*

- AC — Calendar events render with LP context and a meeting-prep link.
- AC — Commitments come from `commitments` rows with `status='open'` and `due_at <= tomorrow`.

**Story 8.4.4 — On my radar.**
*As a GP, I open **On my radar** from Today and get the full daily intelligence brief in the Radar Modal.*

- AC — The Today header greeting is **time-of-day + first name only** (no appended intelligence sentence).
- AC — The **Radar Modal** (Story 8.4.1) surfaces the complete multi-section view per **Appendix I**, including narrative summary and LP-specific observations (e.g. heating / cooling threads).
- AC — Modal rows cite specific LPs and observations sourced from `lp_signal_log` and related LP state where applicable.

**Story 8.4.5 — Inline Tomo on Today.**
*As a GP, I can chat with Tomo on Today, with the agent receiving structured context for what's on the page.*

- AC — Tomo receives `todayContext` (action counts, meeting list, **Radar Modal / brief payload** per §3.8, raise-stands counts) and grounds answers in it.
- AC — Mutations proposed by Tomo require explicit confirm; no auto-apply.
- AC — Tomo's answers do not invent records that aren't in the workspace.

---

### 8.5. Relationships

**Epic:** LP relationship workspace — list, board, detail, inline editing.

**Story 8.5.1 — List view.**
*As a GP, I can scan my LP list with stage, days-since-touch G/A/R, tier, mandate fit, days-in-stage, and expected commitment.*

- AC — Default sort: pipeline_flag (red → amber → green), then `days_since_meaningful_touch DESC`.
- AC — Reply-velocity arrow renders next to the days-since-touch badge.
- AC — "Stuck Nd" badge surfaces when `stage_stagnation_flag` is amber/red.
- AC — Re-up indicator dot shows on `prior_fund_investor=true` LPs.
- AC — List loads within 1.5s for a 500-LP workspace.

**Story 8.5.2 — Board view.**
*As a GP, I can switch to a Kanban board with columns per pipeline stage, dragging LPs between stages.*

- AC — Drag-and-drop writes a `lp_stage_transitions` row immediately.
- AC — `lp_state.days_in_current_stage` recomputes within 5 seconds of the drop.
- AC — Switching back to list view preserves any active filters.

**Story 8.5.3 — LP detail card.**
*As a GP, I see the full LP card with header strip, status, key changes, stage history, sizing, and a per-LP Tomo chat plus activity log.*

- AC — Header strip shows tier badge, prior-fund badge, mandate-fit pill, and seniority.
- AC — Status row shows the G/A/R dot and the plain-English `pipeline_flag_reason`.
- AC — Key changes section surfaces signal callouts ("Reply time has slowed: last 4 days, typical 18 hours").
- AC — Stage row shows current and prior-stage days ("In active diligence 22 days. Spent 47 days in nurturing").
- AC — Per-LP Tomo chat receives that LP as scope context and answers grounded in their record.

**Story 8.5.4 — Inline editing via Tomo (Manual Update Principle).**
*As a GP, I can update an LP field by typing in plain English and confirming Tomo's proposal.*

- AC — Typing "Peter sized at $25M" in the LP-card chat surfaces a confirm dialog with `expected_commitment_amount=25000000`.
- AC — Confirm writes the field and creates an `agent_tool_calls` row plus an `activity_log` row; cancel discards.
- AC — Direct field-edits (chip selectors for stage, tier, mandate fit) write the same way and are auditable.

**Story 8.5.5 — Provenance on hover.**
*As a GP, I can hover any field on the LP card to see where the value came from.*

- AC — Hover surfaces source ("Imported from Backstop CSV · 3 Apr") and any subsequent edits ("GP-edited tier on 14 Apr").

**Story 8.5.6 — Workspace teammate concurrent edit.**
*As a workspace teammate working alongside the GP, I can edit the same LP without conflicting writes.*

- AC — Concurrent edits resolve last-write-wins with the loser's edit logged in `activity_log`.
- AC — A divergence between GP and teammate edits is visible in the LP timeline.

---

### 8.6. Lists and named filters

**Epic:** Audience and list-building surface — saved lists, named filters, workflow seeding.

**Story 8.6.1 — Named filters.**
*As a GP, I can apply any of the V1 named filters from the filter rail.*

- AC — Filters available: Drifting, Quiet — Fat Middle, Re-engaged, One-Way, Stuck in stage, Slow to advance from [stage], Confirmed mandate fit, Re-ups · Fund N, Close proximity detected, the framework's "single most valuable query" (Tier 1 + confirmed fit + drifting + not in diligence).
- AC — Each filter renders the matching LPs within 600ms for a 500-LP workspace.
- AC — The "single most valuable query" is available as a filter and may be **saved by the user**; it is **not** present as a Tomo-seeded default list on first sign-in.

**Story 8.6.2 — Filter combinator.**
*As a GP, I can stack filters with AND logic and add a free-text query on top.*

- AC — Stacking "Drifting" + "Tier 1" returns the intersection.
- AC — A free-text query against name and firm narrows the result further.

**Story 8.6.3 — Saved lists.**
*As a GP, I can save a cohort as a named list for quick re-use — either from structured filters (**live**) or from explicit LP selection with no structured criteria (**manual**).*

- AC — Saved lists persist on the user record and re-render on page load.
- AC — A saved list is selectable as the seed for a workflow run.

**Story 8.6.3b — Manual lists (no structured filter).**
*As a GP, I can maintain a hand-built cohort without structured criteria.*

- AC — Creating a **manual** list stores **only** explicit `lp_contact` membership; structured filter criteria are empty / not applied.
- AC — The Lists index and list detail use **Manual** / **LPs in list** presentation per `design/tomo_lists_v1.html`.

**Story 8.6.4 — Trigger workflow on a list.**
*As a GP, I can trigger a workflow (e.g. F7 Three-Touch) on a filtered cohort.*

- AC — Triggering F7 on a 29-LP Fat Middle cohort creates 29 `workflow_runs` rows.
- AC — LPs already in another active workflow run are skipped with a notice.
- AC — From **list detail**, **Run workflow** opens the link-workflow picker (§3.11 AC-3.11.7); after the GP picks a playbook and continues, **Workflows** opens with that playbook and list context so runs (and dedupe per BR-3.11.2) can proceed in the workflow product surface.

**Story 8.6.5 — Export to CSV.**
*As a GP, I can export a filtered cohort to CSV for sharing or analysis.*

- AC — Export contains LP name, firm, stage, tier, mandate fit, days-since-touch, expected commitment.
- AC — Export honours RLS; no cross-workspace data leaks.
- AC — **Mock repository / early V1:** a **browser-local** CSV of the list cohort may satisfy the column AC before a **server-side**, RLS-enforced export API exists; production remains bound by the RLS AC above.

**Story 8.6.6 — Lists v1 layout and list detail.**
*As a GP, I work in a Lists experience that matches the v1 cohort design.*

- AC — The Lists **index** matches `design/tomo_lists_v1.html` for page chrome (eyebrow, title + aggregate meta, subtitle), flat list grid (no **Tomo defaults** section), row card layout, live/manual pills, counts, and workflow-activity line.
- AC — **New list** and **Import cohort** appear as in the mock but are **disabled placeholders** in V1 (§3.11 AC-3.11.4).
- AC — **List detail** (drawer or equivalent) includes funnel-by-stage **and** the **LP row table** as the primary membership view per the same mock.
- AC — **List detail** includes **drawer actions** and the **link workflow** modal behaviour in §3.11 AC-3.11.6–AC-3.11.7.

---

### 8.7. Workflows

**Epic:** Guided multi-step playbooks — four V1 Workflows-surface entries; F7 Three-Touch as the V1 non-negotiable default-on workflow.

**Story 8.7.1 — Workflow entries at workspace creation.**
*As a new GP, I see the four V1 workflow entries pre-loaded in `/workflows`.*

- AC — Post-Meeting Execution and F7 Three-Touch Qualification appear as locked defaults.
- AC — Themed Outreach and Trip Orchestrator appear as configurable templates.
- AC — Warm Intro Tracker, DDQ Response Engine, Update → Follow-Up, scheduling, and re-engagement do not appear as workflow cards.

**Story 8.7.2 — Accordion workflow operating view.**
*As a GP, I can expand a workflow card inline to monitor its steps, passive run signals, and run history without leaving the Workflows page.*

- AC — Clicking a workflow card expands / collapses that card inline on `/workflows`; the workflow card click does not open the generic detail drawer.
- AC — The expanded body shows a monitor-only banner when the workflow is active (no “review drafts” copy), a process flow, meta strip **without** the Outbound safety line in V1 UI, optional passive monitoring strip (no draft-approval CTAs), and recent run history.
- AC — Expanded cards do **not** show an amber “drafts awaiting approval” bar, **Review drafts →**, or **Awaiting approval** in card header stats.
- AC — Steps render as a **trigger-first** process flow (`trigger` → `action` / `wait` / `outcome` node types); Post-Meeting does not show prep brief as a workflow step.
- AC — **Active** expanded cards do not show **Configure run** as the primary affordance; locked defaults and active Tailored cards are monitor-only on structure.
- AC — **Locked defaults** have no delete control on the card; **Tailored** and **user custom** workflows offer delete with confirm.

**Story 8.7.3 — Edit workflow via Tomo chat.**
*As a GP, I can ask Tomo to adjust configurable workflow steps or run parameters, with confirmation before persistence.*

- AC — Tomo's `update_workflow` tool returns a proposed change; confirm applies it; cancel discards.
- AC — Streaming response begins within 1.5s of submit.
- AC — Structural edit requests against locked defaults return a clear explanation and offer editable content settings instead.

**Story 8.7.4 — F7 Three-Touch on a Fat Middle cohort.**
*As a GP, I can run the F7 sequence (insight → question → respectful close) on quiet relationships and capture an outcome.*

- AC — Each touch surfaces in the Action Drawer awaiting GP approval.
- AC — Touch 2 and Touch 3 prompts can reference prior touch context for the same LP.
- AC — Outcome capture at run completion writes one of: warmer-than-expected / maintaining-non-committal / genuinely-dormant.
- AC — F7 step sends are deduped against `outbound_safety_log` (14-day window).

**Story 8.7.5 — Themed Outreach / Trip Orchestrator templates.**
*As a GP, I can run parameterised outreach workflows without TOMO building separate engines for each use case.*

- AC — Themed Outreach **trigger** is GP launch with list + theme; first process-flow action is **Themed insight outreach**; optional 7-day follow-up to non-responders.
- AC — Trip Orchestrator **trigger** is **send trip emails to list**; destination and date range live in run parameters and email copy (trip detection may suggest a run but is not the trigger node).
- AC — Trip process flow: trip outreach emails → monitor replies and schedule inside trip window → follow-up if no response.
- AC — Trip Orchestrator reply handling invokes the scheduling assistant with the trip window as an availability constraint.
- AC — A saved fund-update configuration appears as a Themed Outreach saved configuration, not a first-class workflow card.

**Story 8.7.6 — Step-level monitor drawer (active workflows).**
*As a GP running active workflows, I can click a process-flow step to see contextual monitoring without draft-approval UI on the Workflows surface.*

- AC — Active workflow step clicks open a monitor drawer with **contextual** panels per §3.12 item 10 (trigger / send / wait / follow-up / outcome) and Close — no approve / edit / send and no “approve in Action Drawer” instructional box.
- AC — Send-step drawers show drafted / sent / replied / skipped (and LP statuses without approved / waiting); wait-step drawers show parameters only.
- AC — In-flight draft approval and send remain in the Action Drawer (§3.9), not the Workflows step drawer.
- AC — Outcome steps may open outcome capture where specified (F7 / outreach completion).

**Story 8.7.10 — Workflow run outcomes view (planned).**
*As a GP, I can review how an entire workflow run performed — funnel, outcome mix, and LP-level results — without drilling step-by-step.*

- AC — Entry from run history (e.g. **View outcomes**) opens a run-scoped outcomes view for that workflow + run id.
- AC — View shows cohort funnel (enrolled → sent → replied → outcome captured) and workflow-specific outcome breakdown (F7 vs outreach templates).
- AC — LP table supports filtering by reply / outcome status; data aggregates from `workflow_runs` / run summary DTOs, not step-monitor mock rows alone.
- AC — Step monitor drawer remains available for operational detail; outcomes view is not a replacement for per-step monitoring.

**Story 8.7.9 — Create wizard for custom workflows.**
*As a GP creating a custom workflow, I walk through Name → Trigger → Action → Draft → Personalise in one dialog and save only when finished.*

- AC — Five tab steps in header; persistence only on **Save & finish** (or **Approve all** from Draft).
- AC — **Trigger** step uses `confirm_workflow_trigger` + `advance_workflow_wizard_step`; no redundant date re-confirmation card.
- AC — **Action** step accepts `.docx` / `.pdf` upload with client text extraction; Tomo action chat receives context + attachment names.
- AC — **Draft** step: editable action description + cohort email; **Personalise** optional with LP master–detail editor.
- AC — Saved workflow persists `actionBuild` and shows under **Built on this list** in saved (inactive) state until **Activate**.
- AC — **Edit action** on a saved custom card re-opens the wizard pre-filled (Primary | Follow-up when follow-up exists); **Save & finish** / **Save workflow with follow-up** updates the same workflow id.
- AC — Optional **Add follow-up** path persists `followUp`; **Activate** enrolls primary + follow-up step runs (Story 8.7.8 / §3.12 AC-3.12.25–26).

**Story 8.7.7 — Workflow run log.**
*As a GP, I can review the run log for any workflow to see step-by-step status per LP.*

- AC — Run log rows source from `workflow_runs` and `workflow_step_runs`.
- AC — Click-through to a step shows the generated draft, send timestamp, skip reason if deduped, and outcome classification.

**Story 8.7.8 — Build custom workflow on selected list.**
*As a GP, I can define a new custom workflow for the list I already selected on `/workflows`, without re-picking the audience.*

- AC — **New workflow** in the list header opens the **five-step** create dialog (`max-w-5xl`); chrome shows the selected list name and workflow name when set.
- AC — Tomo uses `surface=workflow_creator` with `wizardStep` on Trigger and Action steps; persistence waits until **Save & finish** (Story 8.7.9).
- AC — On save, the workflow appears under **Built on this list** in **saved (inactive)** state and the card expands.
- AC — **Activate** in the expanded banner sets the workflow active for runs on that list; there is no toggle to turn an active workflow off — **delete** removes it.
- AC — Custom workflows render **trigger → primary action → optional wait → optional follow-up** (at most one follow-up leg; F7-style multi-touch is post-V1).
- AC — Lists **Run workflow** does not offer custom-workflow creation; it only links existing system or custom workflows (§3.11 AC-3.11.7).

---

### 8.8. Insights

**Epic:** GP scoreboard — capital, gap, moveability, time recovered, execution health, lists intel, raise momentum, close list.

**Story 8.8.1 — Capital vs Target hero.**
*As a GP, I see my raise progress as a four-segment bar showing committed, soft commit, pipeline, and gap.*

- AC — Bar renders sums computed from `lp_contacts.expected_commitment_amount` grouped by `pipeline_stage`.
- AC — When a workspace has no `funds.raise_target` set, the hero shows a "set raise target" prompt instead.
- AC — Refresh on stage transition or commitment-amount change.

**Story 8.8.2 — Day 1 Gap with closing trend.**
*As a GP, I see the count of LPs in the gap and a 30-day sparkline showing the trend.*

- AC — Sparkline renders from `daily_pipeline_summary.day_1_gap_count` over the last 30 days.
- AC — "Down N from M at onboarding" annotation reads from `day_1_gap_baseline`.
- AC — Click-through opens Relationships filtered to the same N LPs.

**Story 8.8.3 — Moveability count.**
*As a GP, I see a single number for LPs moveable now, with a re-up / active-diligence breakdown.*

- AC — Count matches the cohort that scores into Metric 10's **Focus list** (same Moveable predicate).
- AC — Dollar annotation sums `expected_commitment_amount` over the cohort.

**Story 8.8.4 — Concentration risk alert.**
*As a GP, I see a banner when one LP exceeds 20% of remaining target, with a click-through to that LP.*

- AC — Banner hidden when no LP exceeds the threshold.
- AC — Click-through opens Relationships filtered to the named LP.

**Story 8.8.5 — Time Recovered.**
*As a GP, I see hours saved this week and cumulative since connection.*

- AC — Computation uses `tomo_action_log` outcomes × per-action benchmarks (8/12/10/15 minutes per O-2).
- AC — A "How is this calculated?" link opens a help drawer with the methodology.
- AC — In the first 24 hours after onboarding (no log rows yet), the metric reads "Just getting started — first signals overnight".

**Story 8.8.6 — Execution Health row.**
*As a GP, I see follow-up compliance, draft approval rate, and scheduling efficiency in a three-cell row.*

- AC — Follow-up compliance shows current and pre-TOMO baseline.
- AC — Draft approval rate trends rolling 30d vs 60d; below 50% triggers a recalibration nudge.
- AC — Scheduling efficiency shows current and pre-TOMO baseline.

**Story 8.8.7 — Momentum (Direction + velocity + Focus list).**
*As a GP, I see relationships with clear direction, pipeline velocity, and the ranked Focus list — without a standalone Fat Middle gauge on Insights.*

- AC — Direction count plus the mandate-fit qualifier subset render together in **Momentum**.
- AC — Pipeline velocity sparkline renders weekly samples from `daily_pipeline_summary.pipeline_velocity_avg_days`.
- AC — **Fat Middle** is not rendered as a gauge on Insights V1; the **Quiet — Fat Middle** named filter + Three-Touch CTA on Relationships / Lists satisfies the cohort action path.
- AC — **Focus list** shows up to **10** ranked Moveable LPs per Metric 10 / BR-3.6.10.

**Story 8.8.8 — Raise Momentum (Metric 9a + 9b data).**
*As a GP, I see pipeline velocity with an 8-week sparkline; Metric 9b continues to compute for analytics even when the Cooling-caught **Insights block** is deferred.*

- AC — Sparkline samples weekly from `daily_pipeline_summary.pipeline_velocity_avg_days`.
- AC — Cooling-caught "resolved" count for Metric **9b** still uses `lp_signal_log` `flag_transition` rows in the batch — **UI deferral only** (§9.1).

**Story 8.8.9 — Focus list (Metric 10).**
*As a GP, I see a ranked list of up to **10** moveable LPs with badges, evidence, and dollar metadata — ordered by the §9.3 Metric 10 score, not a literal 60-day close guarantee.*

- AC — Ranking uses Section 9 §9.3 Metric 10 formula (cap/shrink per BR-3.6.10).
- AC — Each row is decomposable on hover into its score components.
- AC — Click-through opens the LP detail.

---

### 8.9. Activity

**Epic:** Audit-grade event log filtered by fund, type, date, actor.

**Story 8.9.1 — Activity timeline.**
*As a GP, I can browse the activity timeline filtered by date, action type, and actor.*

- AC — Filters cover: type (draft sent / signal flag changed / re-engagement detected / etc.), actor user, date range, and (when applicable) fund.
- AC — Each row renders time, actor, action, target, before/after when applicable.

**Story 8.9.2 — Click-through to entity.**
*As a GP, I can click any activity row to jump to the affected entity.*

- AC — A `lp_stage_changed` row click-through opens the LP card with the timeline anchored to the change.
- AC — A `draft_sent` row click-through opens the email thread with the sent message highlighted.

---

### 8.10. Settings

**Epic:** Account-level configuration across Profile, Funds, Integrations, Messaging, Notifications, Billing, Team.

#### Profile

**Story 8.10.1 — Profile preferences.**
*As a GP, I can set my display name, photo, timezone, and language.*

- AC — Timezone change re-renders date/time displays across the app.
- AC — Language is fixed to English (US/UK) in V1; selector disabled with V2 hint.

#### Funds

**Story 8.10.2 — Fund details.**
*As a GP, I can edit my fund's raise target, currency, target close date, and concentration threshold (read-only V1, V1.5 editable).*

- AC — Raise-target edit triggers Insights Metric 1 recompute.
- AC — Concentration threshold field is shown read-only at 20% in V1.

#### Integrations

**Story 8.10.3 — Per-source health.**
*As a GP, I can see the health of each connected integration with last-success and reconnect affordance.*

- AC — Status banner per provider sources from `crm_sync_status.health` and `last_success_at`.
- AC — Granted scope list visible for audit.

**Story 8.10.4 — Disconnect.**
*As a GP, I can disconnect any integration and TOMO stops ingesting from it.*

- AC — Disconnect calls upstream revoke when supported, sets `oauth_tokens.revoked_at`, flips `crm_sync_status.health='disconnected'`.
- AC — A "Reconnect to resume sync" banner surfaces on Today within 30s.

#### Messaging (Slack)

**Story 8.10.5 — Slack OAuth installation.**
*As the workspace owner, I can install the TOMO Slack app via OAuth and pick a default channel.*

- AC — OAuth handshake creates a `slack_workspace_connections` row with bot-token ciphertext.
- AC — Default channel selector loads available channels via `users:read`/`channels:read`.

#### Notifications

**Story 8.10.6 — Per-channel preferences.**
*As a GP, I can choose which notifications go to in-app, email, or Slack, and set quiet hours.*

- AC — Per-event-class matrix renders per `notification_channels` rows.
- AC — Quiet hours suppress non-urgent notifications between configured local times.

#### Billing

**Story 8.10.7 — Stripe Customer Portal.**
*As the workspace owner, I can manage my subscription via the Stripe portal (no in-app card entry).*

- AC — "Manage billing" creates a Stripe Customer Portal session and redirects me there.
- AC — Card details are never collected by TOMO.

#### Team

**Story 8.10.8 — Member list and invites.**
*As the workspace owner, I can invite, view, and remove workspace members.*

- AC — Invite returns a 7-day token; revoke surfaces as an option until accepted.
- AC — Multiple concurrent or successive invites behave consistently (no coded member-count ceiling blocking additional invites).

**Story 8.10.9 — Workspace transfer (manual in V1).**
*As the workspace owner, I can request workspace transfer to another member via support.*

- AC — UI shows "Contact support to transfer workspace" with a templated email; no in-product transfer.
- AC — TOMO operator running the manual transfer logs the action in `data_access_log` plus `auth_events`.

---

### 8.11. Search

**Epic:** Global search across LPs, organisations, briefs, workflows, materials, notes.

**Story 8.11.1 — Cmd/Ctrl+K opens global search.**
*As a GP, I can press Cmd+K (or Ctrl+K) and search across my workspace from anywhere.*

- AC — Shortcut works on every authenticated surface.
- AC — Results group by entity type with entity-specific click-through.
- AC — Latency P95 ≤ 400ms for a 500-LP workspace.

**Story 8.11.2 — Fuzzy match.**
*As a GP, I can mistype a name and still find the LP.*

- AC — pg_trgm trigram fallback matches "CPPI" to "CPPIB".

---

### 8.12. Meeting lifecycle

**Epic:** Prep brief, transcript ingestion, AI recap with fallback, post-meeting capture, follow-up draft.

**Story 8.12.1 — Meeting prep brief.**
*As a GP, I can open a prep brief 30 minutes ahead of a scheduled meeting that summarises unanswered questions, missed materials, relationship context, and a suggested focus.*

- AC — Brief generation triggered 30 minutes pre-meeting; persists to `briefs` with `brief_phase='prep'`.
- AC — Surfaces in the Action Drawer as `action_type='meeting_prep'` and writes a `tomo_action_log` outcome `viewed` on first open.

**Story 8.12.2 — Teams transcript ingestion.**
*As a GP using Microsoft Teams, I see the transcript ingested within 5 minutes of meeting end.*

- AC — Polls `GET /me/onlineMeetings/{id}/transcripts` until available; writes `lp_meeting_transcripts`.
- AC — Requires `OnlineMeetingTranscript.Read.All` scope; missing scope produces a clear "transcript unavailable for this meeting" surface, not a hard failure.

**Story 8.12.3 — Google Meet transcript ingestion.**
*As a GP using Google Meet, I see the transcript ingested within 10 minutes of meeting end (Drive sync delay tolerance).*

- AC — Reads conference record via `meet.googleapis.com/v2`; resolves linked transcript Doc via `drive.meet.readonly`; writes `lp_meeting_transcripts`.
- AC — Requires both `meetings.space.readonly` and `drive.meet.readonly` scopes.

**Story 8.12.4 — AI recap path priority (Copilot → Gemini → TOMO LLM).**
*As a GP, I see an AI recap of every transcripted meeting, regardless of whether my tenant has Microsoft 365 Copilot or Gemini for Workspace.*

- AC — When `OnlineMeetingAiInsight.Read.All` granted and Copilot licence present: `recap_source='ms_copilot'` populated.
- AC — When Gemini for Workspace "Take notes for me" doc present in Drive: `recap_source='google_gemini'` populated.
- AC — Otherwise TOMO's Vertex Gemini fallback runs against the raw transcript: `recap_source='tomo_llm'` populated within 60 seconds for a 30-minute transcript.
- AC — Recap row contains summary, key points, action items, decisions, and unanswered questions.

**Story 8.12.5 — Post-meeting capture form.**
*As a GP, I can complete a ~10-field post-meeting capture in under 60 seconds, with most fields pre-filled from the recap.*

- AC — Form surfaces once per meeting (no nag) within minutes of meeting end.
- AC — Fields: meeting outcome, mandate fit, pipeline-stage advance, expected sizing, commitments, open loops, free notes.
- AC — Submitting writes `briefs` with `brief_phase='post_meeting'`, updates `lp_contacts.mandate_fit`, `pipeline_stage`, `expected_commitment_amount` per confirmed mutations, creates `commitments` and `open_loops`.
- AC — Skipping writes `tomo_action_log.outcome='dismissed'` and surfaces a follow-up draft anyway within 30 minutes.

**Story 8.12.6 — Follow-up draft.**
*As a GP, I see a follow-up draft in the Action Drawer within 30 minutes of meeting end.*

- AC — Draft uses recap, captured commitments, and tone profile.
- AC — Quality bar: approval with fewer than five substantive edits in typical case.

---

### 8.13. Daily Brief delivery

**Epic:** Daily Brief delivered in-app, via email, and via Slack at the user's chosen time.

**Story 8.13.1 — Email delivery.**
*As a GP with email enabled, I receive a Daily Brief email at 07:30 local time.*

- AC — Email arrives within ±5 minutes of scheduled time.
- AC — Email uses the **same section taxonomy** as the in-app Radar Modal (**Appendix I** headings); row counts per section may be truncated for email readability.
- AC — Email writes a row to `email_delivery_log` with `template='daily_brief'`.

**Story 8.13.2 — Slack delivery.**
*As a GP with Slack connected and enabled, I receive a Daily Brief Slack message at 07:30 local time.*

- AC — Single `chat.postMessage` to my DM (or workspace default channel) with section blocks.
- AC — Threading optional for detail (V1.5 — single message in V1).
- AC — Slack delivery is in addition to email when both are enabled (no de-duplication).

**Story 8.13.3 — Skipped delivery on empty day.**
*As a GP, on a day with truly nothing pressing, I see a brief that says so rather than empty bullets.*

- AC — "Quiet day — open Lists to plan ahead" rendering instead of empty bulleted lists.

---

### 8.14. Reminders

**Epic:** Open loops, missed replies, commitments — tier-aware and owner-routed.

**Story 8.14.1 — Open loop detection.**
*As a GP, I see TOMO catch outbound commitments I made and remind me when they're outstanding.*

- AC — Outbound containing "I'll send the deck Monday" creates an `open_loops` row with high confidence.
- AC — Unfulfilled at 7 days surfaces an Action Drawer card.

**Story 8.14.2 — Missed reply (tier-aware).**
*As a GP, I see TOMO catch missed replies on a tier-aware threshold.*

- AC — Tier 1 LP unanswered at 48 business hours triggers a missed-reply reminder.
- AC — Tier 2/3/unset LP unanswered at 5 calendar days triggers a missed-reply reminder.
- AC — Routed to the LP's `relationship_owner_user_id`.

**Story 8.14.3 — Commitment from meeting recap.**
*As a GP, I see commitments extracted from meeting recaps surface as reminders with optional due dates.*

- AC — High-confidence commitments auto-create `commitments` rows; medium/low surface in post-meeting capture for confirmation.
- AC — Reminder fires 1 day before `due_at` when present.

**Story 8.14.4 — Snooze.**
*As a GP, I can snooze any reminder to 1 hour, 4 hours, tomorrow, next Monday, or a custom time.*

- AC — Snoozed reminder re-surfaces at `snoozed_until`.

**Story 8.14.5 — Manual resolve.**
*As a GP, I can mark a reminder resolved with optional notes.*

- AC — `resolved_at` and `resolution_evidence_jsonb` set; reminder removed from attention queue.

---

### 8.15. Tomo agent (cross-cutting)

**Epic:** Surface-gated, streamed, audited, confirmation-gated.

**Story 8.15.1 — Surface-gated tools.**
*As a GP, the agent only offers tool calls appropriate to the page I'm on.*

- AC — `update_workflow` is callable only on Workflows; calling it from Relationships returns 403 even if the model emits it.
- AC — `create_user_workflow` is callable only on `workflow_creator`; calling it from Workflows inline chat or Lists returns 403 even if the model emits it.

**Story 8.15.2 — Confirmation gate.**
*As a GP, every mutation Tomo proposes requires my explicit confirm.*

- AC — Mutation tool returns a "proposed change" payload; UI renders confirm/cancel; the mutation applies only on confirm.

**Story 8.15.3 — Audit trail.**
*As a workspace owner, I can see every Tomo tool call in the audit log within 1 second of completion.*

- AC — `agent_tool_calls` row contains arguments, result, latency, model, surface, confirmation status.

**Story 8.15.4 — Streaming with reconnection.**
*As a GP, a momentary network interruption mid-stream does not lose my response.*

- AC — SSE auto-reconnects within 2 seconds; partial response preserved.

---

### 8.16. Action Drawer (cross-cutting)

**Epic:** The single surface for every TOMO-generated draft, capture, scheduling thread, and reminder card.

**Story 8.16.1 — Card types and prioritisation.**
*As a GP, I see drawer cards prioritised by urgency.*

- AC — Sort: re-engagement urgent → red flag → amber flag → tier 1 missed reply → other reminders → drafts.
- AC — Cards collapse to a confirmation line after action is taken.

**Story 8.16.2 — Draft approval flow.**
*As a GP, I can approve, edit, dismiss, or snooze a draft.*

- AC — Approve sends via the user's connected mailbox; writes `email_delivery_log`; updates `tomo_action_log.outcome` to `approved_unchanged` or `approved_with_edits` based on character-change percentage (30% threshold).
- AC — Edit substantially (≥30% change) classifies as `edited_substantially` and does not count as approval for Metric 6b.
- AC — Dismiss sets `outcome='dismissed'`; the draft is not sent.

**Story 8.16.3 — Owner routing.**
*As a workspace member, I see only my own cards by default with an opt-in "Show team" toggle.*

- AC — Cards inherit `assigned_user_id` from the underlying reminder or LP `relationship_owner_user_id`.
- AC — "Show team" surfaces cards assigned to other members.

**Story 8.16.4 — Scheduling response with calendar context.**
*As a GP, I see proposed times in a scheduling-response draft pulled from my actual calendar availability.*

- AC — Times pulled from the connected calendar, respecting working hours.
- AC — Approve creates the calendar invite via the connected provider on confirm.

---

### 8.17. TOMO operator (Founding Circle support)

**Epic:** Manual operator support without an in-product impersonation feature in V1.

**Story 8.17.1 — Onboarding pairing.**
*As a TOMO operator, I can pair 1:1 with a Founding Circle GP for the 45-minute onboarding via Zoom screen-share, with the GP driving the UI.*

- AC — No special TOMO product feature is required for screen-share; the GP shares their screen and drives.
- AC — Any internal-tool or admin-SQL queries the operator runs against the GP's workspace are logged in `data_access_log` with purpose, tables, record ids.

**Story 8.17.2 — Day 14 / 30 / 60 review.**
*As a TOMO operator, I can review Insights and signal context with a customer GP on a follow-up call.*

- AC — Review uses the GP's own session (screen-share), not impersonation.
- AC — Any operator-side spot-check against the customer's data is logged in `data_access_log`.

**Story 8.17.3 — Workspace transfer.**
*As a TOMO operator running a manual workspace transfer on customer request, I can update the owner via an internal admin endpoint with audit trail.*

- AC — Endpoint requires TOMO-staff session and ticket reference; updates `workspaces.owner_user_id` and adds the new owner to `workspace_members`.
- AC — Action logged in `data_access_log` and `auth_events`.

---

### 8.18. Multi-user workspace

**Epic:** Multiple workspace members with identical permissions; per-user data-source OAuth.

**Story 8.18.1 — Per-user OAuth grants.**
*As a workspace teammate, I authorise my own Microsoft / Google account for my own mail and calendar; my data is filtered to me where the source is per-user.*

- AC — Each member has their own `oauth_tokens` rows.
- AC — `lp_interactions.source_user_id` carries the mailbox owner; ingestion respects per-user grants.

**Story 8.18.2 — Shared workspace data.**
*As a workspace teammate, I see the same LPs, signals, metrics, workflows, and action log as my colleagues.*

- AC — Workspace-level data (LPs, briefs, signals, metrics, workflows) is shared.
- AC — Cards and reminders are per-assignee; "Show team" toggle reveals others'.

**Story 8.18.3 — Concurrent edit resolution.**
*As a workspace teammate, my concurrent LP edits resolve cleanly without losing my colleague's changes silently.*

- AC — Last-write-wins with the loser's edit logged in `activity_log`.
- AC — UI surfaces a divergence indicator on the LP card when recent concurrent edits occurred.

---

**End of Section 8.**

---

## 9. Out of Scope / Future Roadmap

### 9.1. Out of V1 scope (deferred to V1.5)

The following items are explicitly deferred to V1.5 (a stabilisation release) and are not part of V1 ship:

- HubSpot bi-directional API integration (CSV path is V1; API is V1.5).
- Backstop **bi-directional** API integration (CSV path and **read-only** licensed API pull are V1 when Backstop wins native connector sequencing — §3.4; **write-back** requires Backstop's licensed tier and is V1.5+ on demand).
- Foliometrics integration beyond CSV (no API exists; never on roadmap unless S&P Global opens one).
- Salesforce read API integration (V1.5+).
- Scheduled email-attachment ingestion of CRM CSVs (Pattern B in Document A) — manual GP re-upload only in V1.
- Quarterly CRM export generators (Backstop, Foliometrics, HubSpot) — V1.5.
- Full conflict resolution UI in the CSV pipeline (Phase 3 full) — V1 ships text-only review surface.
- Per-fund tenant separation beyond logical isolation.
- LP concentration risk threshold per-fund configurability — V1 hardcodes 20%.
- Per-IR breakdown of execution health metrics.
- Algolia or Pinecone-backed search.
- Localisation beyond English (US/UK).
- Mobile native applications.
- Fund Update as a first-class workflow with structured content blocks, jurisdictional distribution rules, and engagement analytics. V1 ships fund-update behaviour only as a saved Themed Outreach configuration.
- Full DDQ RAG over a structured DDQ knowledge base. V1 ships only the Action Drawer DDQ response flow backed by a GP-curated prior DDQ store.
- **Insights — Cooling caught hero surface** (Metric 9b narrative block). Metric **9b** continues to compute from `lp_signal_log` `flag_transition` rows in V1; only the **Insights UI surface** is deferred to V1.5 (see §3.6 rendering notes).

### 9.2. Permanent non-goals (not on any roadmap)

- TOMO is not a CRM replacement. The compliance system of record stays in Affinity / Backstop / Foliometrics / HubSpot.
- TOMO does not auto-send emails. Every outbound is human-in-the-loop.
- TOMO does not auto-mutate CRM records. Tomo agent proposals require user confirmation.
- TOMO does not provide investment, legal, or financial advice.
- TOMO does not implement bot detection bypass, scraping of third-party LP data, or any access pattern that circumvents source-system terms of service.
- TOMO does not collect or compile facial-recognition or biometric data.

### 9.3. V1.5 candidate features (post-FC, pre-GA)

- HubSpot API integration (bi-directional) — pattern matches Affinity.
- Scheduled email-attachment CSV ingestion.
- Full Phase 3 conflict resolution UI.
- LP concentration risk threshold configurable per fund.
- Quarterly CRM export generators.
- Tomo streaming on all surfaces (V1 ships streaming on at minimum Today, Workflows, Action Drawer; remaining surfaces may be staged).
- Optional eu-west-1 region for EU-data-residency customers.
- Fund Update promoted to a first-class workflow once FC usage validates the required content-block editor, distribution controls, and analytics.
- Per-workflow outbound dedup windows and richer outreach engagement analytics.

V2 (Q4 2026) and V3 (2027) capability matrix is in Appendix C.

---

## 10. Appendices

### A. Glossary

Extends §1.3. Alphabetical.

| Term | Definition |
|---|---|
| **Action Drawer** | Right-hand panel (or modal on mobile) where TOMO surfaces drafts, captures, and approvals for GP review. §3.9. |
| **Activity log** | Audit-grade event log per §3.15 / §6.2.9. |
| **Append-only** | Discipline rule applied to `lp_signal_log`, `lp_stage_transitions`, `tomo_action_log`, `daily_pipeline_summary`, `agent_tool_calls`, `activity_log`, `auth_events`, `data_access_log`, `email_delivery_log`, `outbound_safety_log`. Never overwritten, never truncated. Required for V3 dataset integrity. |
| **Affinity** | A relationship-intelligence CRM used by some FC GPs. V1 ships **read-only** native API pull when Affinity wins connector sequencing (or alongside Backstop when both ship); bi-directional sync is V2. |
| **Backstop** | A compliance / portfolio-monitoring CRM used by 3 FC GPs. V1 ships CSV import for all; **read-only** native API pull when Backstop wins connector sequencing (or alongside Affinity when both ship); bi-directional API is V1.5+. |
| **Backfill** | The historical email and calendar ingestion run at onboarding. Three-tier: 0–12 months full content, 13–36 months metadata, beyond 36 months no ingestion. |
| **CASA** | Cloud Application Security Assessment. Google's third-party security review programme for OAuth apps that access sensitive scopes. CASA Tier 2 is the V1 commitment. |
| **Concentration risk** | Insights Metric 4. Triggered when one LP's expected commitment exceeds 20% of remaining target. |
| **Cooling off** | Radar Modal **directional** deceleration section (negative momentum). Not the same as Today **Stalling — watch**. |
| **Day 1 Gap** | Count of LPs whose CRM lists them as active but for whom TOMO finds no meaningful touch in 60+ days. Insights Metric 2; revealed after initial sync (not a Document B onboarding step — §3.2). |
| **Daily Brief** | Per-day summary delivered in-app (Radar Modal), email, and Slack. §3.8; section taxonomy **Appendix I**. |
| **Radar Modal** | Unified modal on Today: **Daily Brief** framing (eyebrow, narrative, stamp) + **On my radar** content with collapsible sections per **Appendix I**. Design reference: `design/tomo_radar_modal_v1.html`. |
| **Delta sync** | Incremental ingestion via Microsoft Graph delta links and Google History API / push notifications. |
| **Drifting** | Named filter on Lists for LPs in amber/red flag with silence reason. |
| **F7** | Three-Touch Qualification — V1 NON-NEGOTIABLE default-on workflow per V1 Final Decision #2. |
| **Fat Middle** | Cohort of warm-stage LPs with no directional signal in 30+ days. Insights Metric 8 (ratio) still computes in V1; **Insights does not ship a Fat Middle gauge** — use the **Quiet — Fat Middle** named filter on Relationships / Lists (§3.11) with the Three-Touch CTA. |
| **Focus list** | Insights Metric 10 — up to **10** Moveable LPs ranked by the §9.3 score (not a literal time-to-close model). |
| **Foliometrics** | A CRM used by 2 FC GPs. V1 ships CSV import only; no API exists. |
| **Founding Circle (FC)** | First 12 GP cohort using TOMO V1. |
| **Gone quiet** | Radar Modal section (formerly *Quiet beyond cadence*): LPs past meaningful-touch cadence for their stage. |
| **Geoffrey Surface** | The TOMO operator role for FC onboarding and Day 14/30/60 reviews. Manual operational support in V1 (no impersonation feature). |
| **GP** | General Partner. Primary user. |
| **HubSpot** | A CRM used by some FC GPs. V1 ships CSV import only; API integration deferred to V1.5. |
| **LP** | Limited Partner. Investor or prospective investor. |
| **Manual Update Principle** | GP edits CRM fields by talking to Tomo in plain language; Tomo proposes the change; GP confirms before persistence. From Tomo MVP3. |
| **Meaningful Touch** | The unit of measurement for "have we recently connected with this LP." Defined in Section 8 §8.2. |
| **Moveability count** | Insights Metric 3. Single number for LPs **moveable** now (Metric 3 cohort). |
| **Moveable** | An LP in the Metric 3 / `MOVEABLE(lp)` cohort (warm stages, not red, warming predicate per BR-3.5.12, within touch SLA). Today bucket label **Moveable**. |
| **Momentum** | Insights §3.6 **Section 2** — Direction, pipeline velocity / sparkline, Focus list. |
| **Off-channel suppression** | GP-marked `off_channel_active_until` on `lp_state` that blocks silence-class signal writes and silence-only Radar inclusions for the window; directional signals still fire. §3.5 BR-3.5.8–BR-3.5.10; LP affordance §3.10. |
| **OAuth (data sources)** | Per-user grants for Microsoft Graph / Google Workspace / Slack / native CRM read (Affinity or Backstop per §3.4), separate from Firebase auth. |
| **OOO** | Out of office. Detected and excluded from meaningful-touch. |
| **One-Way** | Named filter on Lists for LPs whose last contact was a GP-initiated email with no reply. |
| **Pipeline flag** | G/A/R state per LP from Section 8 §8.7 algorithm. **`red` is overloaded** — negative drift vs re-engagement urgent; consumers SHALL use `pipeline_flag_reason` and recent `lp_signal_log` context (BR-3.5.11). |
| **Pipeline stage** | Eight canonical LP stages from Section 8 §8.2. |
| **Re-engagement** | Signal 2 — event-driven detection when an LP inbound arrives after 45+ days of silence. |
| **RLS** | Row-Level Security. Postgres feature enforcing per-row access policies; used for workspace isolation. |
| **SOC 2 Type 1** | Service Organization Control attestation; V1 commitment. |
| **Stage stagnation** | Signal 6 — LP stuck in current pipeline stage longer than typical, with prior-stage history. |
| **Stalling — watch** | Today **Where the raise stands** bucket: amber `pipeline_flag`, not Moveable. Not the same phrase as Radar **Cooling off**. |
| **Sub-processor** | Third party that processes customer data on TOMO's behalf (Supabase, Firebase, Vercel, AWS, Vertex AI, Postmark/SES, Slack, Stripe, Sentry, PostHog, Affinity, Backstop). |
| **Three-Touch** | F7. Three-step sequence (insight → question → respectful close) for qualifying quiet LPs. |
| **Tier (LP tier)** | GP-set priority on the LP record. T1 / T2 / T3 / unset. Drives missed-reply threshold among other things. |
| **Tomo agent** | The in-app AI agent. Streamed via Vercel AI SDK, surface-gated tools, confirmation gate on mutations. §3.14. |
| **Tone profile** | Per-user model derived from sent-mail history during onboarding. Used by every draft generation path. |
| **TOMO operator** | Internal staff user (Geoffrey Surface). |
| **V1.5 / V2 / V3** | Roadmap milestones. V1.5 = stabilisation; V2 = integration layer (Q4 2026); V3 = intelligence layer (2027). |
| **Vertex AI** | Google Cloud's enterprise inference platform. V1 LLM provider via `@ai-sdk/google`. |
| **Webhook** | Inbound HTTP delivery from a third party (Microsoft Graph subscription, Google Pub/Sub, Affinity, Backstop, Slack, Stripe, Postmark / SES). All signature-verified. |
| **Workspace** | Multi-tenant unit. Multiple members; identical permissions among members in V1. |

#### A.1 Term disambiguation (daily surfaces)

| Term | What it means | Where it appears |
|------|----------------|-------------------|
| **Cooling off** | LPs trending **negative** on directional signals (last 30d) | Radar Modal — **Cooling off** (Appendix I) |
| **Stalling — watch** | Amber `pipeline_flag`, **not** Moveable | Today **Where the raise stands** |
| **Gone quiet** | Past meaningful-touch cadence / silence threshold | Radar Modal (renamed from *Quiet beyond cadence*) |
| **Moveable** | Passes Metric 3 / `MOVEABLE(lp)` | Today bucket; Insights Metric 3; Focus list cohort |
| **Drifting — act** | `pipeline_flag='red'` (includes re-engagement urgent) | Today bucket |
| **Focus list** | Top **10** Moveable LPs by Metric 10 score | Insights **Momentum** only (not shown on Today) |
| **Direction** | Aggregate warming vs cooling | Insights Metric 7; Radar **Heating up** / **Cooling off** |
| **Momentum** | Insights section 2 label — trajectory + Focus list | Insights page |

### B. Reference documents

- `Tomo_V1_Final Geoff 270426.docx` — V1 scope, non-negotiables, V1 pillars, V1/V2/V3 capability matrix, risks, requirements inventory (sections A–O).
- `Section_8_Signals_V1_Final.md` — normative for the signals engine.
- `Section_9_Metrics_V1.md` — normative for the metrics engine and Insights page.
- `Document_A_CRM_Integration_Reference.md` — normative for CRM integration.
- `Document_B_Onboarding_Flow_Specification.md` — normative for the onboarding flow.
- `tomo_email_ingestion_strategy.md` — three-tier ingestion model.
- `Tomo_MVP3.docx` — historical reference; carries SOC 2 / CASA framing and agent-orchestration tool inventory; superseded for everything else by V1 Final.
- `APP_SUMMARY_FOR_AI_REVIEW.md` — mock-app reference.
- `docs/EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md` — user-story template, extended in §8.
- `docs/DAILY_SURFACES_OFF_CHANNEL_IMPLEMENTATION_PLAN_2026-05-19.md` — engineering sequencing for Today / Radar / Insights / Relationships URL filters and off-channel suppression.
- `docs/WORKFLOWS_SURFACE_IMPLEMENTATION_PLAN_2026-05-17.md` — implementation plan for the Workflows accordion surface, step-level drawers, and supporting mock-data contract.
- `design/tomo_radar_modal_v1.html` — normative visual / IA reference for the Radar Modal (Today).
- `design/tomo_drawer_meetingprep_light_v3.html` — normative visual reference for the **Coming up** meeting prep drawer on Today (§3.9 item 10).
- `design/tomo_lists_v1.html` — normative visual / IA reference for the **Lists** index and list-detail drawer (including LP row table, live vs manual semantics, **drawer actions**, **link workflow** modal, disabled top-row and secondary CTAs in V1) — §3.11, §8.6.

### C. V2 / V3 capability matrix and forward-compatibility notes

Lifted and condensed from Section 8 §8.10 and the V1 Final Geoff doc Section 7.2. This appendix enumerates what's deferred and the V1 capture obligations that prevent V2/V3 retrofit cost.

#### V2 — Integration layer (target Q4 2026)

V2 unlocks signals that require integrations not built in V1, plus surfaces V1-captured combined patterns once 90+ days of operational data validates them.

| V2 capability | V1 capture obligation already met |
|---|---|
| **Document engagement (DocSend / DealRoom)** — opens, page dwell, return visits | `material_engagement` schema present in V1 migration (V2-placeholder, §6.2.7) |
| **Sub-agreement / DDQ document access** — fires close_proximity | `lp_document_engagement` schema present in V1 migration (V2-placeholder, §6.2.7) |
| **Newsletter engagement (Mailchimp / HubSpot Marketing)** — opens, clicks, forwards | `lp_marketing_engagement` schema present in V1 migration (V2-placeholder, §6.2.7) |
| **Meeting composition shift** — CIO / legal counsel attendance fires close_proximity | `lp_calendar_event_attendees.seniority_inferred` already captured V1 (light role detection from signature parsing) |
| **warm_ghost_flag named display** — surfaces as named flag on LP card; triggers Three-Touch Sequence prompt | `lp_state.warm_ghost_flag` already computed and persisted in V1 |
| **close_proximity_flag named display** — surfaces as named flag on LP card | `lp_state.close_proximity_flag` already computed and persisted in V1 (used as silence override in V1) |
| **CC expansion as first-class display element** — moves from behind-the-scenes attribute prompt to named filter | `lp_state.cc_expansion` already populated; UI affordance is V2 |
| **IR aggregate dashboard (three-view)** | Per Framework v4.1 Section 7. Ships when 90 days of operational data make aggregate metrics trustworthy |
| **Affinity bi-directional sync** — TOMO writes signals/flags/tier corrections back to Affinity custom fields | `affinity_field_mappings` schema present in V1 migration (V2-placeholder, §6.2.5) |
| **HubSpot bi-directional API** — pattern matches Affinity | OAuth client provisioning in V1.5; full sync V2 |
| **Salesforce read-only API** | Deferred until customer demand |
| **Per-IR breakdown of execution health metrics** | Becomes useful when team ≥ 4; V1 covers single-GP and 2–3 person teams |
| **Pipeline coverage ratio, raise trajectory, conversion rates by stage** | Need 30+ closes of operational history; V2/V3 |
| **Anonymised cohort benchmarking** | Requires accumulated data across customers; V2+ |
| **Per-fund concentration threshold configurability** | V1.5+ |
| **In-product TOMO-staff support-impersonation** (request, approve, time-bound, audit, revoke) | `data_access_log` schema present in V1 (audit-only path); product feature V2 |
| **Automated workspace transfer** | Manual support flow in V1; automated V2 |
| **Scheduled email-attachment CSV ingestion** (Pattern B per Document A) | V1.5 |
| **Full Phase 3 conflict resolution UI** for CSV pipeline | V1 ships text-only review; full UI V1.5 |
| **CRM export generators** (Backstop, Foliometrics, HubSpot) | V1.5 |
| **EU data residency** (eu-west-1) | V1.5 if customer demand |
| **Localisation beyond English** | V2 — strings extracted to locale file in V1 (`locales/en-US.json`) so no UI churn |
| **Multi-party conversational scheduling** | Post-MVP |

#### V3 — Intelligence layer (target 2027)

V3 unlocks signals that require empirical validation against real close outcomes (30–40 verified closes minimum) plus the language-aware NLP layer.

| V3 capability | V1 capture obligation already met |
|---|---|
| **Question type (NLP)** — exploratory vs structural classification; shift to structural fires close_proximity | Full email body retained 12 months in `lp_interactions.body_text`; classifier can run retroactively against the dataset |
| **Commitment language (NLP)** — conditional vs active; active language fires highest-priority flag | Same body retention; meeting recap text retained per §6.4 |
| **Objection recurrence** — recurring objections without logged resolution | Meeting notes and email bodies retained in queryable form |
| **Composite momentum score** — single number on LP card derived empirically from close data; weights validated against actual outcomes | Every signal observation written to `lp_signal_log` from V1 day one — append-only V3 dataset (§6.4) |
| **Data-validated stage cadence per workspace** | `stage_cadence_benchmarks` is global in V1; per-workspace override schema is the V2 step before V3 calibration |
| **"This signal fired N days before close" claims** | Append-only signal log preserves the raw observation timeline |

#### Permanent non-goals (not on any roadmap)

- TOMO is not a CRM replacement. Compliance system of record stays in Affinity / Backstop / Foliometrics / HubSpot.
- TOMO does not auto-send emails. Every outbound is human-in-the-loop.
- TOMO does not auto-mutate CRM records. Tomo agent proposals always require user confirmation.
- TOMO does not provide investment, legal, or financial advice.
- TOMO does not implement bot-detection bypass, scraping of third-party LP data, or any access pattern that circumvents source-system terms of service.
- TOMO does not collect facial-recognition or biometric data.
- TOMO does not offer dedicated Momentum / Briefs surfaces (deprecated from MVP2; replaced by Insights and the meeting lifecycle).
- TOMO does not implement Cmd+K omnibar in V1 (header search is the V1 pattern; Cmd+K is the global-search shortcut on top, but no command-palette behaviour beyond search).
- TOMO does not run a meeting bot or transcript-first meeting capture; transcripts come from MS Teams / Google Meet APIs.

### D. Text-only ERD

Every workspace-scoped table carries `workspace_id → workspaces.id`; this is omitted below to reduce noise. Soft-delete and timestamps are also omitted. Append-only tables are marked `[A]`. V2-placeholder tables marked `[V2]`.

```
IDENTITY & TENANCY
==================
users (id pk, firebase_uid, email, default_workspace_id → workspaces.id, is_tomo_staff)
workspaces (id pk, owner_user_id → users.id, plan, primary_timezone, primary_currency, region)
workspace_members (id pk, user_id → users.id, role, invited_by_user_id → users.id, invitation_token)
funds (id pk, raise_target, raise_target_currency, concentration_threshold_pct)
oauth_tokens (id pk, user_id → users.id, provider, provider_account_email, scopes_granted,
              access_token_encrypted, refresh_token_encrypted)
tone_profiles (id pk, user_id → users.id, version, tone_signature_jsonb, prompt_excerpt)

LP DOMAIN
=========
lp_organizations (id pk, name, domain, firm_type, region, source, source_external_id)
lp_contacts (id pk, lp_organization_id → lp_organizations.id, fund_id → funds.id,
             relationship_owner_user_id → users.id, primary_email,
             pipeline_stage, tier, mandate_fit, prior_fund_investor, prior_fund_identifier,
             prior_commitment_amount, expected_commitment_amount,
             expected_commitment_currency, source, source_external_id, csv_import_id → csv_imports.id,
             historical_data_only)
lp_state (lp_contact_id pk → lp_contacts.id, last_meaningful_touch_at, days_since_meaningful_touch,
          pipeline_flag, pipeline_flag_reason, re_engagement_flag, re_engagement_detected_at,
          reply_velocity_trend, reply_length_trend, lp_initiation_count_last_5,
          lp_initiation_ratio, days_in_current_stage, days_in_prior_stage, prior_stage_name,
          stage_stagnation_flag, calendar_friction_trend, calendar_accept_latency_hrs_recent,
          calendar_reschedule_count_last_3, cc_expansion, cc_expansion_new_contacts,
          last_contact_was_one_way, last_outbound_no_reply_sent_at,
          warm_ghost_flag, close_proximity_flag, last_batch_run_at)
lp_stage_transitions [A] (id pk, lp_contact_id → lp_contacts.id, from_stage, to_stage,
                          transitioned_at, actor_user_id → users.id, source)
lp_tags (id pk, name, slug, is_system)
lp_tag_assignments (id pk, lp_contact_id → lp_contacts.id, lp_tag_id → lp_tags.id,
                    assigned_by_user_id → users.id)
lp_notes (id pk, lp_contact_id → lp_contacts.id, author_user_id → users.id, body, pinned)

INTERACTIONS
============
lp_email_threads (id pk, provider, provider_thread_id, subject, first_message_at,
                  last_message_at, participant_emails, lp_organization_id → lp_organizations.id)
lp_interactions (id pk, lp_contact_id → lp_contacts.id, lp_organization_id → lp_organizations.id,
                 lp_email_thread_id → lp_email_threads.id, interaction_type, direction,
                 interacted_at, body_text, body_html_archived_url, word_count,
                 word_count_confidence, attachment_count, is_ooo, metadata_only,
                 provider, provider_message_id, provider_internet_message_id,
                 from_email, to_emails, cc_emails, bcc_emails,
                 is_meaningful_touch, is_truly_lp_initiated, source_user_id → users.id)
lp_calendar_events (id pk, provider, provider_event_id, lp_contact_id → lp_contacts.id,
                    lp_organization_id → lp_organizations.id, subject, start_at, end_at,
                    booked_duration_minutes, actual_duration_minutes,
                    is_online_meeting, online_meeting_provider, online_meeting_join_url,
                    status, invite_sent_at, accepted_at, declined_at, accept_latency_hrs,
                    reschedule_count, organizer_email, is_lp_organized,
                    source_user_id → users.id)
lp_calendar_event_attendees (id pk, lp_calendar_event_id → lp_calendar_events.id, email,
                             domain, is_organizer, response_status, seniority_inferred,
                             lp_contact_id → lp_contacts.id)
lp_meeting_transcripts (id pk, lp_calendar_event_id → lp_calendar_events.id, provider,
                        provider_transcript_id, transcript_text, transcript_jsonb,
                        duration_seconds, fetched_by_user_id → users.id)
lp_meeting_recaps (id pk, lp_calendar_event_id → lp_calendar_events.id,
                   lp_meeting_transcript_id → lp_meeting_transcripts.id, recap_source,
                   summary_text, key_points, action_items_jsonb, decisions,
                   unanswered_questions, follow_up_items_jsonb, confidence)

SIGNALS & METRICS
=================
lp_signal_log [A] (id pk, lp_contact_id → lp_contacts.id, signal_type, signal_value_jsonb,
                   flag_before, flag_after, reason, observed_at, batch_run_id, is_directional)
stage_cadence_benchmarks (pipeline_stage pk, amber_threshold_days, red_threshold_days)  -- not workspace-scoped
daily_pipeline_summary [A] (id pk, snapshot_date, day_1_gap_count, day_1_gap_baseline,
                            pipeline_velocity_avg_days, total_committed, total_soft_commit,
                            total_active_pipeline, cooling_currently_flagged,
                            moveability_count,
                            today_tile_drifting_act, today_tile_stalling_watch,
                            today_tile_healthy_on_track, today_tile_moveable,
                            flag_resolutions_today, currency, snapshot_run_id)
tomo_action_log [A] (id pk, lp_contact_id → lp_contacts.id, gp_user_id → users.id,
                     action_type, outcome, character_change_pct, time_saved_minutes,
                     metadata, generated_at, actioned_at, source_signal_log_id → lp_signal_log.id)
reminders (id pk, lp_contact_id → lp_contacts.id, assigned_user_id → users.id,
           reminder_type, due_at, status, snoozed_until, source_open_loop_id → open_loops.id,
           source_commitment_id → commitments.id, source_interaction_id → lp_interactions.id)
commitments (id pk, lp_contact_id → lp_contacts.id, committed_by, due_at, confidence,
             source_type, source_recap_id → lp_meeting_recaps.id,
             source_interaction_id → lp_interactions.id,
             confirmed_by_user_id → users.id, status)
open_loops (id pk, lp_contact_id → lp_contacts.id,
            originating_interaction_id → lp_interactions.id, loop_text, confidence, status,
            fulfilled_by_interaction_id → lp_interactions.id)

CRM INTEGRATION
===============
csv_imports (id pk, uploaded_by_user_id → users.id, source_crm, original_filename, s3_key,
             row_count_total, row_count_imported, mapping_id → csv_field_mappings.id, status,
             is_initial_import)
csv_field_mappings (id pk, source_crm, name, column_map, created_by_user_id → users.id, is_active)
csv_dedupe_decisions (id pk, csv_import_id → csv_imports.id, csv_row_jsonb,
                      match_lp_contact_id → lp_contacts.id, match_confidence, decision,
                      decided_by_user_id → users.id)
crm_sync_status (id pk, source, user_id → users.id, last_success_at, last_attempt_at,
                 last_error, health, webhook_subscription_id, webhook_expires_at)
affinity_field_mappings [V2] (id pk, tomo_field, affinity_field_id, affinity_field_type,
                              last_pushed_at)

WORKFLOWS
=========
workflows (id pk, name, slug, is_default, is_active, trigger_type, trigger_config_jsonb,
           target_list_filter_jsonb, created_by_user_id → users.id)
workflow_steps (id pk, workflow_id → workflows.id, step_index, step_type, name, config_jsonb,
                wait_duration_hours, requires_approval)
workflow_runs (id pk, workflow_id → workflows.id, lp_contact_id → lp_contacts.id,
               started_by_user_id → users.id, status, current_step_index, started_at,
               completed_at, outcome)
workflow_step_runs (id pk, workflow_run_id → workflow_runs.id,
                    workflow_step_id → workflow_steps.id, status,
                    tomo_action_log_id → tomo_action_log.id, started_at, completed_at, output_jsonb)
outbound_safety_log [A] (id pk, lp_contact_id → lp_contacts.id, trigger_signature, outbound_at,
                         workflow_id → workflows.id, tomo_action_log_id → tomo_action_log.id)

MATERIALS & BRIEFS
==================
materials (id pk, fund_id → funds.id, material_type, title, version, s3_key, external_url,
           uploaded_by_user_id → users.id)
briefs (id pk, lp_contact_id → lp_contacts.id, lp_calendar_event_id → lp_calendar_events.id,
        brief_phase, title, body_text, body_jsonb, generated_by, viewed_at,
        commitments_extracted_count, tomo_action_log_id → tomo_action_log.id)
material_engagement [V2] (id pk, material_id → materials.id, lp_contact_id → lp_contacts.id,
                          event_type, event_at, metadata_jsonb)
lp_document_engagement [V2] (id pk, lp_contact_id → lp_contacts.id, document_type,
                             event_type, event_at)
lp_marketing_engagement [V2] (id pk, lp_contact_id → lp_contacts.id, campaign_external_id,
                              event_type, event_at)

SETTINGS & NOTIFICATIONS
========================
user_preferences (id pk, user_id → users.id, timezone, daily_brief_enabled,
                  daily_brief_send_at_local, daily_brief_channels, theme,
                  tomo_chat_default_open, pane_width_px)
notification_channels (id pk, user_id → users.id, event_class, channel_in_app,
                       channel_email, channel_slack, quiet_hours_start_local, quiet_hours_end_local)
slack_workspace_connections (id pk, installed_by_user_id → users.id, slack_team_id,
                             slack_team_name, bot_user_id, bot_access_token_encrypted,
                             default_channel_id)
email_delivery_log [A] (id pk, provider, provider_message_id, to_email, template, subject,
                        sent_at, delivery_status, metadata_jsonb)

AUDIT
=====
activity_log [A] (id pk, actor_user_id → users.id, action, target_table, target_id,
                  before_jsonb, after_jsonb, metadata_jsonb)
agent_tool_calls [A] (id pk, user_id → users.id, surface, tool_name, arguments_jsonb,
                      result_jsonb, requires_confirmation, confirmation_status, error,
                      latency_ms, model)
auth_events [A] (id pk, user_id → users.id, workspace_id → workspaces.id, event_type, provider,
                 ip_address, user_agent, metadata_jsonb)  -- workspace_id nullable
data_access_log [A] (id pk, staff_user_id → users.id, workspace_id → workspaces.id,
                     access_method, purpose, tables_accessed, record_ids_accessed,
                     query_hash, customer_notified)  -- workspace_id nullable
```

**Key cardinality summary:**

- workspaces 1 ── N workspace_members
- workspaces 1 ── N funds, lp_organizations, lp_contacts, …
- lp_organizations 1 ── N lp_contacts
- lp_contacts 1 ── 1 lp_state
- lp_contacts 1 ── N lp_stage_transitions, lp_interactions, lp_signal_log, …
- lp_calendar_events 1 ── 0..1 lp_meeting_transcripts ── 0..1 lp_meeting_recaps
- workflow 1 ── N workflow_steps, workflow_runs
- workflow_runs 1 ── N workflow_step_runs

**RLS rule applied to every workspace-scoped table:** `workspace_id = current_setting('app.workspace_id', true)::uuid`

### E. API surface map

Cross-references §4.2 for full detail. This appendix is the at-a-glance index.

**External APIs TOMO calls (per §4.2.1–4.2.8):**

| Provider | Auth | Primary endpoints | Webhook target |
|---|---|---|---|
| Microsoft Graph (Outlook, Calendar, Teams, Drive) | Per-user OAuth via Firebase + Azure App Registration | `/me/messages`, `/me/events`, `/me/onlineMeetings/*`, `/subscriptions` | `/api/webhooks/microsoft-graph` |
| Google Workspace (Gmail, Calendar, People, Meet, Drive) | Per-user OAuth via Firebase + GCP OAuth Client | `gmail.googleapis.com/v1`, `calendar.googleapis.com/v3`, `meet.googleapis.com/v2`, `people.googleapis.com/v1`, `drive.googleapis.com/v3` | `/api/webhooks/google-pubsub`, `/api/webhooks/google-calendar` |
| Slack | Workspace OAuth (bot token) | `slack.com/api/chat.postMessage`, `oauth.v2.access`, `users.lookupByEmail` | (None in V1; V1.5 for interactivity) |
| Stripe | Server-side API key | `/v1/customers`, `/v1/billing_portal/sessions` | `/api/webhooks/stripe` |
| Affinity (read-only V1, if shipped) | Per-workspace API key | `/v2/persons`, `/v2/companies`, `/v2/lists`, `/v1/webhooks` | `/api/webhooks/affinity` |
| Backstop (read-only V1, if shipped) | Per workspace — vendor auth | Per licensed read API (see §4.2.5) | `/api/webhooks/backstop` (if webhooks; else polling only) |
| Vertex AI Gemini | GCP service account `roles/aiplatform.user` | `{region}-aiplatform.googleapis.com/v1/.../models/{model}:generateContent`, `:streamGenerateContent`, `:embedContent` | (None) |
| Postmark / AWS SES | Provider API key | Provider-specific send endpoints | `/api/webhooks/email-delivery` |
| Sentry, PostHog | Provider keys | SDK ingestion | (None inbound) |

**Internal API routes (per §4.2.9):**

- Auth & account: `/api/auth/session`, `/api/auth/account/delete`
- Workspaces: `/api/workspaces`, `/api/workspaces/{id}`, `/api/workspaces/{id}/members`, `/api/workspaces/{id}/members/{userId}`, `/api/workspaces/{id}/transfer`
- OAuth: `/api/oauth/{provider}/start`, `/api/oauth/{provider}/callback`, `/api/oauth/{provider}/disconnect`
- Integrations: `/api/integrations/status`
- CSV: `/api/csv-import`, `/api/csv-import/{id}/mapping`, `/api/csv-import/{id}/dedupe-decisions`, `/api/csv-import/{id}/commit`
- LP: `/api/lp-contacts`, `/api/lp-contacts/{id}`, `/api/lp-contacts/{id}/notes`, `/api/lp-contacts/{id}/timeline`, `/api/lp-state/{id}`
- Insights: `/api/insights/{capital,day-1-gap,moveability,concentration,time-recovered,execution-health,lists-intel,raise-momentum,close-list}` (`close-list` = Metric 10 **Focus list**; `lists-intel` / `raise-momentum` payloads align with §3.6 **Momentum** section composition)
- Workflows: `/api/workflows`, `/api/workflows/{id}`, `/api/workflows/{id}/steps`, `/api/workflows/{id}/run`, `/api/workflow-runs/{id}`
- Reminders: `/api/reminders`, `/api/reminders/{id}`
- Meetings: `/api/meetings/{id}/prep`, `/api/meetings/{id}/recap`, `/api/meetings/{id}/post-meeting`
- Logs: `/api/action-log`, `/api/activity-log`
- Search: `/api/search`
- Notifications: `/api/notifications/preferences`
- Billing: `/api/billing/portal-session`
- Tomo: `/api/tomo/orchestrate` (streaming; the unified entrypoint), plus aliases `/api/tomo/chat`, `/api/tomo/drawer-chat`, `/api/tomo/filter-relationships`
- Cron: `/api/cron/daily-brief` (EventBridge / Vercel Cron trigger)
- Version: `/api/version`
- Webhooks: `/api/webhooks/{microsoft-graph,google-calendar,google-pubsub,affinity,backstop,stripe,email-delivery}`

**Background workers (not Next.js routes):**

- Signal nightly batch (cron 02:00 workspace-local)
- Metrics nightly batch (cron 02:30 workspace-local)
- Daily Brief delivery (cron user-local)
- Email backfill workers (onboarding event + ongoing)
- Token refresh (cron 5-minute)
- Webhook resubscribe (cron 12-hour)
- Soft-delete purge (cron daily 03:00 UTC)
- Transcript ingestion (event: calendar event end)
- Recap fallback TOMO LLM (timer: 10-minute after meeting end)
- Re-engagement hot path (event: new inbound `lp_interactions` row)

**Common request/response conventions (per §4.2.9):**

- `Authorization: Bearer <firebase-id-token>` on every authenticated request.
- `{data, meta}` success envelope; `{error: {code, message, details}}` on failure.
- Cursor-based pagination via `?cursor=` and `?limit=` (max 100).
- `Idempotency-Key` header accepted on mutation routes.
- TLS 1.2+; HTTP redirects to HTTPS at the edge.

**Migration note (per O-14):** the mock's `/api/crm/relationships` is renamed to `/api/lp-contacts` in V1. No legacy path retained.

### F. Stage threshold matrix and signal computation pseudocode

Lifted from Section 8 §8.3 / §8.6 / §8.7 / §8.9 — concise engineering reference. For full rationale and edge cases, see the source document.

#### F.1. Stage threshold matrix (§8.6)

| Stage | Amber (days) | Red (days) |
|---|---|---|
| sourced | 60 | 90 |
| first_meeting | 21 | 35 |
| nurturing | 14 | 28 |
| active_diligence | 10 | 21 |
| soft_commit | 21 | 35 |
| committed | 21 | 35 |
| closed_lost | n/a | n/a |
| on_hold | 90 | n/a |

Seeded into `stage_cadence_benchmarks` at V1 migration. Per-workspace override deferred to V2.

#### F.2. Foundational definitions (§8.2)

**Meaningful Touch.** An interaction satisfying *at least one* of:

- Inbound LP email containing 20+ words
- Any LP-initiated email or LinkedIn message of any length
- A meeting that took place as scheduled (not declined, not rescheduled by LP)
- An LP reply containing a direct question (regardless of word count)

Excluded explicitly:
- LP reply <20 words with no question
- Out-of-office reply
- Calendar accept / decline / reschedule with no message
- Newsletter open or campaign click
- GP-initiated email with no LP reply

**Direction of communication (for Signal 5).**

```
gp_initiated:  last meaningful exchange = outbound from GP team member, no LP reply within 7 days
lp_initiated:  LP sent unprompted message, no preceding GP outbound to this LP within 14 days
two_way:       both GP and LP contributed substantive content within last 14 days
```

#### F.3. Signal computation pseudocode (§8.3)

**Signal 1 — Silence.**

```
last_touch = most recent lp_interactions row WHERE is_meaningful_touch = true
days_since = floor((now - last_touch.interacted_at) / 86400)
amber, red = stage_cadence_benchmarks[lp_contacts.pipeline_stage]
if days_since > red:    flag = red
elif days_since > amber: flag = amber
else:                    flag = green
if positive_directional_signal in last 14 days:
  flag = green  // override (close-proximity principle)
write lp_signal_log; update lp_state.days_since_meaningful_touch, last_meaningful_touch_at
```

**Signal 2 — Re-engagement after silence.** Event-driven; *not* nightly.

```
on each new inbound lp_interactions row WHERE is_meaningful_touch = true:
  last_outbound = most recent outbound from any GP team member to this LP
  days_since_last_gp_outbound = floor((this.interacted_at - last_outbound.interacted_at) / 86400)
  if days_since_last_gp_outbound >= 45:
    lp_state.re_engagement_flag = true
    lp_state.re_engagement_detected_at = now
    write lp_signal_log signal_type='re_engagement'
    force pipeline_flag = red+URGENT for 24 hours
    generate urgent draft → Action Drawer
    notify relationship_owner_user_id
```

Latency target ≤ 1 hour from inbox arrival. Webhook-driven; 30-min polling fallback.

**Signal 3 — Reply velocity.**

```
suppress if LP has fewer than 5 prior exchanges
last_3 = last 3 LP replies that responded to a GP outbound (exclude LP-initiated; no latency)
latency_series = [oldest, middle, newest]  // hours
baseline_avg = avg latency for all replies older than the 3
trend = "decelerating" if monotonically increasing
        "accelerating" if monotonically decreasing
        "flat" otherwise
current_vs_baseline = "above" if newest > baseline*1.3
                      "below" if newest < baseline*0.7
                      "near"  otherwise
```

**Signal 4 — Reply length.**

```
suppress if LP has fewer than 3 prior replies
last_3 = last 3 LP replies (any kind, including <20-word)
for each: word_count = words in body (signatures + quotes stripped)
  if word_count_confidence = 'low':  // per §8.9 clarification 9
    skip this observation
trend = "decelerating" if word_count_series monotonically declining
        "accelerating" if monotonically increasing
        "flat" otherwise
trend_delta_pct = (newest - oldest) / oldest * 100
```

Flag-firing only when paired with another cooling signal (silence past amber, declining velocity, zero LP-initiation).

**Signal 5 — Reply initiation.**

```
last_5 = last 5 lp_interactions excluding OOOs and automated emails
for each: truly_lp_initiated =
  direction = 'inbound' AND no preceding GP outbound to this LP within 14 days
lp_initiated_count = count truly_lp_initiated
lp_initiation_ratio = lp_initiated_count / 5
last_lp_initiated_at = most recent timestamp where truly_lp_initiated
```

Strict definition (loose version produces false negatives — every "thanks" reply incorrectly counts).

**Signal 6 — Stage stagnation.**

```
T = most recent lp_stage_transitions row for this LP
days_in_current_stage = floor((now - T.transitioned_at) / 86400)
prior = lp_stage_transitions row immediately before T
if prior:
  days_in_prior_stage = floor((T.transitioned_at - prior.transitioned_at) / 86400)
  prior_stage_name = prior.to_stage
amber, red = stage_cadence_benchmarks[lp_contacts.pipeline_stage]
if days_in_current_stage > red:    stage_flag = red
elif days_in_current_stage > amber: stage_flag = amber
else:                               stage_flag = green
```

Prior-stage days drive the "Slow to advance from [stage]" filter — informational, doesn't fire a flag alone.

**Signal 7 — Calendar friction.**

```
require >= 3 meetings with this LP firm
last_3 = last 3 lp_calendar_events
accept_latency_avg = avg of (accepted_at - invite_sent_at) for last_3
prior_avg = avg accept_latency for all earlier
reschedule_count = count where reschedule_count > 0
duration_ratio = last.actual_duration_minutes / last.booked_duration_minutes
                 (use booked when actual unavailable)
trend = "worsening" if accept_latency_avg > prior_avg * 1.5
                    OR reschedule_count >= 2
                    OR duration_ratio < 0.6
        else "stable" or "improving"
```

**Signal 8 — CC expansion.**

```
for each lp_organizations.domain (incl. additional_domains):
  threads_14d = lp_email_threads WHERE last_message_at >= now - 14 days
                AND any participant_emails matches firm domain
  current_set = unique emails on firm domain across threads_14d
  baseline_set = unique emails from firm seen in earlier threads
  new_contacts = current_set - baseline_set
  if new_contacts non-empty:
    lp_state.cc_expansion = true
    lp_state.cc_expansion_new_contacts = list
    queue Action Drawer profile-update prompt
```

**Signal 9 — One-way contact.**

```
last = most recent lp_interactions of any type for this LP
if last.interaction_type = 'email_outbound'
   AND no email_inbound from this LP within 14 days after last.interacted_at:
  lp_state.last_contact_was_one_way = true
  lp_state.last_outbound_no_reply_sent_at = last.interacted_at
else:
  lp_state.last_contact_was_one_way = false
```

14-day window catches genuine non-response, not normal reply latency.

**Combined captures (V1 capture, V2 surface) (§8.5).**

```
warm_ghost_flag = (lp_initiation_ratio = 0 over last 5)
                  AND (reply_length_trend = 'decelerating')
                  AND (no questions in last 3 LP replies — V1: pattern '?' detection)

close_proximity_flag = cc_expansion in last 14 days
                       OR (V2) sub_agreement_document_accessed last 14 days
                       OR (V2) cio_or_legal_attendee at last meeting
```

#### F.4. Pipeline flag computation (§8.7) — locked algorithm

Evaluated in order; first match wins.

```
RED — evaluated first
  IF re_engagement_flag = true (set in last 24h, not yet cleared):
    flag = red; reason = "LP reached out after silence"
  ELIF days_since_meaningful_touch > red_threshold(stage)
       AND (reply_velocity_trend = 'decelerating'
            OR calendar_friction_trend = 'worsening'
            OR (reply_length_trend = 'decelerating' AND length_drop > 50%)
            OR lp_initiation_ratio = 0):
    flag = red; reason = "Silent and cooling"
  ELIF stage IN (soft_commit, committed)
       AND days_since_meaningful_touch > 30:
    flag = red; reason = "Soft commit gone silent"

AMBER — evaluated second
  ELIF days_since_meaningful_touch > amber_threshold(stage):
    flag = amber; reason = "Silence threshold breached"
  ELIF count_active_cooling_signals >= 2:
    # cooling = reply_velocity decelerating
    #         OR lp_initiation_ratio = 0
    #         OR calendar_friction worsening
    #         OR reply_length decelerating with >50% drop
    flag = amber; reason = "Multiple cooling signals"
  ELIF stage_stagnation_flag = red:
    flag = amber; reason = "Stuck in stage"
  ELIF stage IN warm_stages
       AND no directional signal in lp_signal_log in last 30 days:
    flag = amber; reason = "Fat middle: no movement either way"

GREEN — default
  ELSE: flag = green

OVERRIDE — applied last
  IF any positive directional signal in last 14 days:
    # positive = reply_velocity accelerating
    #          OR lp_initiation_ratio > 0.4
    #          OR cc_expansion = true
    #          OR active scheduling thread in progress
    flag = green; reason = "Active engagement detected"
```

Every transition writes `lp_signal_log signal_type='flag_transition'` with `{from_flag, to_flag, reason}` — required for Metric 9b cooling-caught "resolved" count.

#### F.5. Engineering clarifications (§8.9 — abridged)

1. Stage capture mechanism: `sourced` default at LP creation; transitions write `lp_stage_transitions`. Mandatory; cannot be retrofitted.
2. Re-engagement webhook latency ≤ 1 hour SLO; 30-min polling fallback if Graph subscription delivery exceeds.
3. "Truly LP-initiated" = strict (no preceding GP outbound within 14 days); loose version produces false negatives.
4. V1 stage thresholds per F.1 above; recalibrate per-client after FC Month 1.
5. `reply_velocity_trend` suppressed below 5 prior exchanges; `reply_length_trend` suppressed below 3.
6. `mandate_fit` captured as one-click chip in post-meeting capture; default `unknown`; updateable via AI input chat.
7. `prior_fund_investor` captured at onboarding CSV import (column or post-import tagging); each prior fund needs identifier.
8. Directional signal = acceleration / deceleration / LP-initiated event / close-proximity event. Flat or stable trends do NOT count.
9. Reply length word count: confidence flag suppresses observation when extracted body is >3x estimated reply length (clearly contaminated by quoted content).

### G. Metric computation pseudocode

Lifted from Section 9 §9.3 — concise engineering reference. Each metric per Section 9 has rationale, refresh cadence, and engineering notes; this appendix carries the computation only.

#### Metric 1 — Capital vs target progress bar

```
total_committed   = SUM(lp_contacts.expected_commitment_amount) WHERE pipeline_stage = 'committed'
total_soft        = SUM(...) WHERE pipeline_stage = 'soft_commit'
total_pipeline    = SUM(...) WHERE pipeline_stage IN ('first_meeting','nurturing','active_diligence')
target_gap        = funds.raise_target - total_committed - total_soft

bar_segments = {
  committed:  total_committed / raise_target,
  soft:       total_soft      / raise_target,
  pipeline:   total_pipeline  / raise_target,  // capped if total > target
  gap:        remaining
}
```

Refresh: nightly + on stage transition + on `expected_commitment_amount` change.

#### Metric 2 — Day 1 Gap, closing

```
current_gap_count = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting','nurturing','active_diligence','soft_commit')
  AND lp_state.days_since_meaningful_touch > 60

trend_30d = SELECT day_1_gap_count, snapshot_date
            FROM daily_pipeline_summary
            WHERE snapshot_date >= now - 30 days
            ORDER BY snapshot_date

baseline = (first row's day_1_gap_baseline, captured at onboarding)
reactivated = baseline - current_gap_count
```

Refresh: nightly. Click-through filters Relationships to the same N LPs.

#### Metric 3 — Moveability count

```
moveability_count = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting','nurturing','active_diligence','soft_commit')
  AND lp_state.pipeline_flag IN ('green','amber')   -- explicitly NOT red
  AND EXISTS (lp_signal_log row satisfying the warming predicate per BR-3.5.12)
  AND lp_state.days_since_meaningful_touch <= amber_threshold(pipeline_stage)

reup_count             = same with AND prior_fund_investor = true
active_diligence_count = same with AND pipeline_stage = 'active_diligence'

moveability_value = SUM(expected_commitment_amount) over the cohort
```

Refresh: nightly.

#### Today tile — Where the raise stands (partition)

Section 9 supplement; four buckets are mutually exclusive over `ACTIVE` LPs.

```
ACTIVE = lp_contacts WHERE pipeline_stage NOT IN (terminal_stages)
# V1 default terminal set: pass, closed_lost, committed (excludes won-but-done from “work left”); mock CRM may use Closed + Pass only.

# MOVEABLE(lp) = same predicate as moveability_count (Metric 3 above)

today_tile_drifting_act       = COUNT lp IN ACTIVE WHERE pipeline_flag = 'red'
today_tile_moveable           = COUNT lp IN ACTIVE WHERE MOVEABLE(lp)
today_tile_stalling_watch     = COUNT lp IN ACTIVE WHERE pipeline_flag = 'amber' AND NOT MOVEABLE(lp)
today_tile_healthy_on_track   = COUNT lp IN ACTIVE WHERE pipeline_flag = 'green' AND NOT MOVEABLE(lp)
```

Optional materialisation: `daily_pipeline_summary.today_tile_*` columns. Refresh: nightly with metrics batch or compute on Today read.

**Hover hints (Today UI copy — normative, concise):**

| Bucket | Hint |
|--------|------|
| **Section heading** | Active LPs in four buckets that don't overlap. Counts reflect your live pipeline; click a row to filter Relationships. |
| **Moveable** | In active meeting stages, not red-flagged, warming in the last 30 days, and within stage touch SLA — same rules as Insights moveability. |
| **Healthy — on track** | Green pipeline health and not moveable — on cadence; no urgent warming signal right now. |
| **Stalling — watch** | Amber pipeline health but not moveable — engagement is stalling; worth a nudge before it turns red. |
| **Drifting — act** | Red pipeline health among active LPs — treat as urgent re-engagement. |

#### Metric 4 — LP concentration risk

```
remaining_target = funds.raise_target - SUM(expected_commitment_amount) WHERE pipeline_stage = 'committed'

for each lp WHERE pipeline_stage IN ('soft_commit','active_diligence','committed'):
  exposure_pct = lp.expected_commitment_amount / remaining_target
  if exposure_pct > 0.20:
    trigger_alert(lp, exposure_pct)

# only the largest concentration triggers the banner; others appear in drill-in
```

Refresh: nightly + on `expected_commitment_amount` change.

#### Metric 5 — Time Recovered

Per-action benchmarks (V1 starting; recalibrate after FC Month 1 per O-2):

| Action | Minutes saved |
|---|---|
| Draft approved (any edit level) | 8 |
| Scheduling thread resolved | 12 |
| Follow-up caught (open loop / missed reply) | 10 |
| Meeting prep brief generated and viewed | 15 |

```
weekly_time_saved_minutes =
    (drafts_approved_count × 8) +
    (scheduling_threads_count × 12) +
    (followups_caught_count × 10) +
    (meeting_prep_views_count × 15)

weekly_time_saved_hours = weekly_time_saved_minutes / 60
```

Source rows from `tomo_action_log` with appropriate `action_type` and `outcome`. Refresh: rolling 7d / 30d / cumulative; nightly.

#### Metric 6a — Follow-up compliance rate

```
for each meeting in (lp_calendar_events with LP attendees, last N days, status='completed'):
  meeting_followed_up = EXISTS (
    lp_interactions row with direction='outbound' to any LP attendee
    WHERE interacted_at BETWEEN meeting.end_at AND meeting.end_at + 24h
  )

compliance_rate = COUNT(followed_up) / COUNT(meetings)
```

Pre-TOMO baseline computed once at onboarding against 90-day pre-onboarding history; stored on workspace; never recomputed. Refresh: nightly.

#### Metric 6b — Draft approval rate

Edit-level threshold (per O-3): `<30%` = light edit (counts as approval); `>=30%` = substantial edit.

```
approval_rate_30d =
  COUNT(action_type='draft' AND outcome IN ('approved_unchanged','approved_with_edits')) /
  COUNT(action_type='draft' AND outcome IN ('approved_unchanged','approved_with_edits',
                                             'edited_substantially','dismissed'))

if approval_rate_30d < 0.50:
  trigger_recalibration_nudge()  // inline tone-recalibration prompt
```

Source: `tomo_action_log`. Refresh: rolling 30d / 60d; nightly.

#### Metric 6c — Scheduling efficiency

```
for each scheduling thread (inbound with detected scheduling intent, last 30 days):
  resolution_days = (calendar_event.created_at - inbound_email.interacted_at) / 86400

avg_efficiency_days = AVG(resolution_days)
```

Scheduling-intent detection in V1 is pattern-library based ("can we meet", "schedule a call", etc.) with optional lightweight LLM tie-break where confidence is low. Metric 6c depends on the scheduling assistant logging detected intent, proposal generation, accepted slot, and calendar-event creation timestamps.
Pre-TOMO baseline computed once at onboarding. Refresh: nightly.

#### Metric 7 — Direction with mandate-fit qualifier

```
total_active = COUNT(lp_contacts) WHERE pipeline_stage NOT IN ('closed_lost')
with_direction = COUNT(...) WHERE
  pipeline_stage NOT IN ('closed_lost')
  AND EXISTS (lp_signal_log row of any directional type in last 30 days)

mandate_fit_subset = COUNT(...) WHERE
  same as with_direction
  AND mandate_fit = 'confirmed_fit'
  AND pipeline_stage IN ('first_meeting','nurturing','active_diligence','soft_commit')
```

Refresh: nightly.

#### Metric 8 — Fat Middle ratio

```
warm_stage_lps = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting','nurturing','active_diligence','soft_commit')

three_plus_touches = COUNT(lp_contacts) WHERE
  pipeline_stage IN warm_stages
  AND COUNT(lp_interactions WHERE is_meaningful_touch AND last 6 months) >= 3

fat_middle_ratio = three_plus_touches / warm_stage_lps

fat_middle_cohort = warm_stage_lps WHERE three-plus-touches condition fails
```

Gauge zones (V1): 0–30 / 30–60 / 60–100 still define **severity bands for the numeric ratio** and API payloads. **Insights V1 does not render a Fat Middle gauge** (BR-3.6.9); the **Quiet — Fat Middle** named filter on Relationships / Lists carries the Three-Touch Qualification CTA. Refresh: nightly.

#### Metric 9a — Pipeline velocity

```
for each active lp:
  velocities[lp] = AVG(days between consecutive meaningful touches in last 90 days)

pipeline_velocity_avg = AVG(velocities)

# Weekly snapshot stored to drive sparkline:
INSERT INTO daily_pipeline_summary
  (snapshot_date, pipeline_velocity_avg_days, ...)
VALUES (today, pipeline_velocity_avg, ...);

sparkline = SELECT pipeline_velocity_avg_days, snapshot_date
            FROM daily_pipeline_summary
            WHERE snapshot_date >= now - 8 weeks
            AND DOW(snapshot_date) = 1  -- weekly samples
```

If a workspace has been on TOMO < 8 weeks, sparkline is shorter — display only the snapshots that exist. Connection-date baseline = first weekly snapshot stored.

#### Metric 9b — Cooling caught

```
currently_flagged = COUNT(lp_contacts) WHERE pipeline_flag IN ('amber','red')

resolved_30d = COUNT(lp_signal_log WHERE
                      signal_type = 'flag_transition'
                      AND metadata.from_flag IN ('amber','red')
                      AND metadata.to_flag = 'green'
                      AND observed_at >= now - 30 days)

total_cooling_caught_30d = COUNT(unique LPs that were flagged amber/red at any point in last 30 days)
```

Refresh: nightly.

#### Metric 10 — Focus list (ranked Moveable LPs)

Top **10** of the Moveability cohort (**or fewer** when the cohort is smaller than 10), ranked by close-probability score. **Presentation name:** *Focus list* — not a literal 60-day time-to-close prediction; the score is a composite ranking per below.

```
score(lp) = stage_weight + intent_weight + signal_weight - silence_penalty

stage_weight:
  soft_commit:       40
  active_diligence:  30
  nurturing:    20
  first_meeting:     10
  sourced:            5

intent_weight (additive):
  prior_fund_investor = true:        +20
  mandate_fit = 'confirmed_fit':     +15

signal_weight:
  any warming directional signal in last 30 days:  +10
  any cooling signal in last 30 days:              -10

silence_penalty:
  if days_since_meaningful_touch > amber_threshold(stage):  -15

return top 10 by score with full LP context (empty-state copy per BR-3.6.10 when cohort empty)
```

Refresh: nightly. Score is decomposable into components — every row hover shows the decomposition. Recalibration after 30+ closes is V3 territory.

#### Schema dependencies (per §9.4)

V1 metrics depend on three schema additions beyond Section 8:

1. `funds.raise_target`, `funds.raise_target_currency`; `lp_contacts.expected_commitment_amount`, `expected_commitment_currency`, `expected_commitment_captured_at`, `prior_commitment_amount`, `prior_commitment_currency`. Drives Metrics 1, 3, 4, 10.
2. `tomo_action_log` table (append-only). Drives Metrics 5, 6b. **Hard V1 dependency** — must be instrumented from day one of V1 ship.
3. `daily_pipeline_summary` table (append-only). Drives Metrics 2 trend, 9a sparkline, 9b resolved count.

All three are present in §6.2.

### H. Open issues and decisions to lock

| ID | Issue | Owner | Default if undecided |
|---|---|---|---|
| O-1 | ~~Affinity bi-directional sync in V1.~~ **DECIDED:** V1 ships **read-only** one-way native CRM pull for **Affinity or Backstop — whichever connector ships first** (second CRM uses CSV until its connector lands; both may ship in V1 if capacity allows — §3.4). **Bi-directional** / SoR write-back: Affinity deferred to V2; Backstop deferred to V1.5+. | PM + Eng lead | Closed. |
| O-2 | Per-action time-saved benchmarks (drafts 8m / scheduling 12m / follow-ups 10m / meeting prep 15m) — confirm or recalibrate after FC Month 1. | PM | Adopt as starting values; recalibrate Month 1. |
| O-3 | Draft edit-level threshold: 30% character change. Confirm. | PM | Adopt 30%. |
| O-4 | Microsoft 365 Copilot AI insight beta scope (`OnlineMeetingAiInsight.Read.All`) availability for FC tenants. | Eng lead | Fall back to transcript + TOMO LLM summarisation when scope or licence unavailable. |
| O-5 | Google Meet AI notes (Gemini for Workspace add-on) availability for FC tenants. | Eng lead | Same fallback as O-4. |
| O-6 | Daily Brief default delivery time per workspace timezone. | PM | 7:30am local, configurable. |
| O-7 | Slack daily-brief format (canvas vs message + thread). | PM + Design | Single message with **Appendix I** section blocks; thread for detail. |
| O-8 | Email and calendar webhook architecture: Microsoft Graph subscriptions vs delta polling fallback when webhook unhealthy. | Eng lead | Webhooks primary, 30-minute delta polling fallback per integration. |
| O-9 | Re-engagement webhook latency SLO: ≤ 1 hour confirmed. If MS Graph subscription delivery exceeds, supplemental polling job at 30-minute cadence. | Eng lead | Adopt SLO; provision polling fallback. |
| O-10 | ~~Workspace transfer on owner departure (e.g. GP leaves the firm).~~ **DECIDED:** Manual support flow in V1; automated transfer in V2. | PM + Legal | Closed. |
| O-13 | ~~In-product support-impersonation flow for TOMO staff.~~ **DECIDED:** No impersonation feature in V1. Manual operator support only, with all TOMO-staff data access logged per SOC 2 access-management policy. Specced product feature deferred to V2. | PM + Security | Closed. |
| O-14 | **API path rename** from mock's `/api/crm/relationships` to V1 canonical `/api/lp-contacts`. Frontend imports in the mock's components and hooks must be updated as part of V1 production wiring. No legacy path retained. | Eng lead | Tracked. |
| O-15 | **LLM provider switch** from mock's OpenAI (`@ai-sdk/openai`) to V1 Google Gemini via Vertex AI (`@ai-sdk/google` with Vertex provider) for all surfaces — agent orchestration, draft composition, recap generation, batch classification, scheduling-intent detection. Tone-profile prompt stays vendor-agnostic. Vertex AI in TOMO's GCP project for enterprise data governance and zero retention. | Eng lead + Security | Tracked. |
| O-11 | Sub-processor list for SOC 2 (Supabase, Firebase, Vercel, AWS, OpenAI, Postmark/SES, Stripe, Slack, Sentry, PostHog). Confirm inventory and DPAs. | Legal | Lock before SOC 2 audit kickoff. |
| O-12 | Data residency disclosure: us-east-1 primary; EU customers in V1.5. | PM | Disclose in DPA. |

---

### I. Radar Modal IA (v1)

Normative interaction architecture for the unified **Daily Brief + On my radar** modal on Today (`§3.8`). **Design reference:** `design/tomo_radar_modal_v1.html` in the `tomo_crm` repository.

#### I.1 Purpose

- Replace the legacy four-theme brief (meetings / urgent / compliance / signals only) with one modal that surfaces **operational** and **relationship intelligence** in a single scan.
- Align in-app, email, and Slack section **headings** (rows inside sections may be truncated out-of-app).

#### I.2 Header and footer

| Element | Requirement |
|--------|--------------|
| Eyebrow | **Daily Brief · {localized date}** |
| Title | **On my radar** |
| Narrative | One short paragraph summarizing cross-section themes (computed). |
| Stamp | Mono / secondary line(s): e.g. computation time, lookback window (e.g. 90-day), total items surfaced. |
| Close | Control labeled **Esc** or equivalent; Escape key dismisses when focus permits. |
| Footer stamp | Plain-language reminder of channels (e.g. email + Slack delivery times). |
| **Brief settings** | Navigates to notification / daily-brief delivery preferences (`user_preferences`). |
| **Done** | Dismisses modal; records `last_daily_brief_seen_local_date` per **BR-3.8.1**. |

#### I.3 Section taxonomy (order and defaults)

| § | Section title | Default UI state | Direction pill (optional) | Sub-labels (Commitments only) |
|---|----------------|------------------|---------------------------|--------------------------------|
| 1 | **Commitments** | Expanded | — | **Your commitments** · **Their commitments** · **Coming due** |
| 2 | **Heating up** | Expanded | **Positive direction** | — |
| 3 | **Cooling off** | **Collapsed** | **Negative direction** | — |
| 4 | **Gone quiet** | **Collapsed** | — | — |
| 5 | **Next 7 days at a glance** | Expanded | — | — |

Sections **1** (**Commitments**) consolidates the former **Returning to you**, **Your commitments approaching**, and **Outstanding from your LPs** sections as **three sibling sub-rails** under one collapsible parent (same primary sources; engineering may render as one section with three grouped lists). Section **4** renames the former **Quiet beyond cadence** heading to **Gone quiet** (plain-language GP label); computation unchanged (**meaningful-touch cadence vs silence**, §8). **Heating up**, **Cooling off**, and **Next 7 days** behaviour is unchanged aside from renumbering.

Sections with **zero** rows: render the section with prescribed empty-state copy **or** omit the section — engineering chooses one strategy per build, documented in release notes; QA verifies consistency.

#### I.4 Row model (per item)

| Element | Requirement |
|--------|--------------|
| Tier rail | Visual emphasis when **Tier 1** LP (normative tier from `lp_contacts`). |
| Labels | **Firm / LP** · **Person** (person optional for role-based rows). |
| Tags | JetBrains-style uppercase chips: tier (`Tier 1` / `Tier 2`), urgency, warmth/cooling, SLA / silence — as relevant. |
| Evidence | Plain-language narrative with quantitative cues where available. |
| Aside | Short temporal context (e.g. snoozed date, days quiet, due date). |
| CTAs | Optional; see **I.5**. Rows without CTAs are valid (intel-only). |

#### I.5 CTA dictionary

| Label | Intent | Typical routing |
|-------|--------|-----------------|
| **Bring to Today** | Resurface snoozed or deferred work into today's attention queue | `tomo_action_log` / `reminders` resolution per §3.7 |
| **Draft now** | Open commitment or fulfilment draft | Action Drawer (`§3.9`), `commitments` |
| **Draft a nudge** | Start outbound for LP delay | Action Drawer draft |

Exact routing is implementation-defined but must land in **Action Drawer** or equivalent approved surface — no auto-send (**§1.2**).

#### I.6 Badge count (entry point)

The **On my radar** control badge displays **`badgeCount`**: the number of **navigable / actionable** rows across sections **1–5** for the current local day (rows with a `link` or CTA that opens a drawer, approval, or draft flow). **Intel-only** rows (no navigation target) may be excluded unless product toggles **include_intel_rows_in_badge** — default **exclude**. Document the chosen rule in release configuration.

#### I.7 Data sources (informative)

| Section | Primary sources (V1 target) |
|---------|-----------------------------|
| Commitments — Your commitments | `commitments`; extracted promises / open loops from outbound; Today-queue approvals/blocked (`tomo_action_log`) |
| Commitments — Their commitments | Inbound obligations; SLA vs stated turnaround |
| Commitments — Coming due | `commitments.due_at` within window; `reminders` snooze expiry; **Returning-to-you** queue items surfaced as **Coming due** or sibling rail per engineering layout |
| Heating up / Cooling off | `lp_signal_log`; reply velocity; pipeline signals; **respect `off_channel_active_until` for silence-only Cooling rows** (BR-3.5.8) |
| Gone quiet | Meaningful-touch cadence vs silence (**§8**); **respect `off_channel_active_until`** (BR-3.5.8) |
| Next 7 days | Calendar + commitments window |

Snooze-heavy logic depends on reminder infrastructure (**§3.7**, **Story 8.14.4**).

---

**End of TOMO V1 SRS Draft v0.1.**

All ten sections and nine appendices (A–I) are populated. The document is the formal handoff from the `tomo_crm` mock to V1 production build.

**Next steps for the team:**

1. **PM + Eng lead review** — open issues in Appendix H need confirmation before SRS lock. O-2, O-3, O-4, O-5, O-6, O-7, O-8, O-9 remain open; O-1, O-10, O-13, O-14, O-15 closed by direction in this draft cycle.
2. **Convert to .docx** — once content reviewed, export this Markdown to .docx via Pandoc with the corporate template for the formal handoff artefact.
3. **Decompose into engineering tickets** — every BR-x.y.z business rule and AC-x.y.z acceptance criterion is a verifiable unit; user stories §8 map naturally to a backlog.
4. **SOC 2 audit prep** — start mapping Appendix H O-11 sub-processor inventory and the §5.3 / §5.5 control families to evidence collection before audit kickoff.
5. **CASA Tier 2 submission** — engage assessor; OAuth app submission to Google CASA programme; allow 6–10 week lead time.
