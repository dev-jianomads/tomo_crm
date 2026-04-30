# TOMO V1 — Software Requirements Specification (SRS)

**Document status:** DRAFT v0.1 — for engineering and PM review.
**Audience:** Frontend, backend, infra, security engineering; product management; QA.
**Authoring source:** Tomo V1 Final (Geoff 27.04.26), Section 8 (Signals V1 Final), Section 9 (Metrics V1), Document A (CRM Integration Reference), Document B (Onboarding Flow Specification), Tomo Email Ingestion Strategy, Tomo MVP3, mock repository (`tomo_crm`).
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
   3.4. CRM integration (CSV + Affinity bi-directional)
   3.5. Signals engine
   3.6. Metrics engine and Insights page
   3.7. Reminders engine
   3.8. Today / Daily Brief
   3.9. Action Drawer and draft approvals
   3.10. Relationships / LP record
   3.11. Pipeline (Lists) and named filters
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
   8.6. Pipeline / Lists
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

- A multi-tenant web application supporting up to three users per fundraising workspace, with identical permissions for all members of a workspace (no role tiering in V1).
- Direct integrations with Microsoft Graph (Outlook mail, Outlook calendar, Microsoft 365 contacts, Teams meetings and transcripts) and Google Workspace (Gmail, Google Calendar, Google Contacts / People API, Google Meet transcripts and recordings via the Meet REST API and Drive). No third-party unification provider (e.g. Nylas) is used; integrations are built directly against vendor APIs.
- Firebase Authentication for sign-up and sign-in to the TOMO app; Microsoft and Google as upstream OAuth identity providers for the user's mail, calendar, and meeting data sources.
- A CRM ingestion pipeline supporting CSV import from any source (Affinity, Backstop, Foliometrics, HubSpot, Excel, Google Sheets, generic) with column auto-mapping, deduplication, and conflict resolution. Affinity bi-directional API sync is conditionally in scope (TBD — see §3.4 and Appendix H).
- A nine-signal behavioural engine (per Section 8) that fires nightly batch and event-driven signal observations against email and calendar metadata and writes to an append-only signal log.
- A ten-metric Insights page (per Section 9) computed nightly with selected event-driven recomputation.
- A reminders engine covering open loops, missed replies, and commitments.
- The Today screen, Action Drawer with draft approvals, Relationships page, Pipeline / Lists, Workflows (with five default playbooks plus the F7 Three-Touch Qualification sequence), Insights, Activity, Search, and Settings.
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
- Telegram messaging-native operating model (V2+).
- Multi-party autonomous scheduling and bot-driven calendar negotiation (post-MVP).
- Role-based access control beyond a flat workspace-member model (V2).
- HubSpot, Salesforce, and Backstop bi-directional API integrations (V1.5+).
- Per-fund tenant separation beyond logical isolation (always logical isolation in V1; physical separation only on request V2+).

### 1.3. Definitions, acronyms, and abbreviations

| Term | Definition |
|---|---|
| **GP** | General Partner. The primary user of TOMO. The "fundraiser" in fundraising-team terminology. |
| **LP** | Limited Partner. The investor or prospective investor whose relationship the GP manages. |
| **IR** | Investor Relations. The discipline of managing LP relationships across the lifecycle of a fund. |
| **Founding Circle (FC)** | The first 12 GP cohort using TOMO V1 in a structured high-touch onboarding programme. |
| **Workspace** | The unit of multi-tenancy in TOMO. Up to three users share data, integrations, and signal state within a workspace. Equivalent to a "team" in SaaS terminology. |
| **Fund** | A specific raise within a workspace (e.g. "Fund III"). A workspace may contain multiple funds. |
| **Meaningful Touch** | A two-way LP interaction satisfying the formal definition in §3.5.1 (lifted from Section 8 §8.2). The unit of measurement for "have we recently connected with this LP." |
| **Pipeline stage** | One of the eight canonical LP stages (`sourced`, `first_meeting`, `second_meeting`, `active_diligence`, `soft_commit`, `committed`, `closed_lost`, `on_hold`) per Section 8 §8.2. |
| **Pipeline flag** | The G/A/R (Green / Amber / Red) state computed per LP per the locked algorithm in Section 8 §8.7. |
| **Signal** | A behavioural observation computed from email and calendar metadata that contributes to flag state, fires an action, or appears as a named filter. Nine signals in V1. |
| **Metric** | An aggregate number rendered on the Insights page. Ten metrics in V1. |
| **Reminder** | An item the GP must act on (open loop, missed reply, commitment). Distinct from a signal. |
| **Action Drawer** | The right-hand panel where TOMO surfaces drafts, captures, and approvals for GP review. |
| **Day 1 Gap** | The count of LPs the GP's CRM lists as active but for whom TOMO finds no meaningful touch in 60+ days. The climax of onboarding (see §3.2). |
| **Tomo** | The product name and the in-app AI agent. The agent appears as inline chat (Today, Workflows) or as a floating dock / mobile sheet (other surfaces). |
| **Tone calibration** | The per-user model TOMO trains on the user's sent-mail history during onboarding to make drafts sound like the user. |
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

V1 ships eight surfaces (Today, Relationships, Pipeline, Workflows, Insights, Activity, Search, Settings), one onboarding flow, one Action Drawer, one Daily Brief, and one Tomo agent across all surfaces. The agent operates with surface-gated tools and human-in-the-loop on every outbound action — no automatic sending, no automatic CRM mutation.

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

TOMO V1 is a new, standalone product. It is not a module of an existing system. It does not replace the GP's CRM; it sits alongside it. The GP's authoritative records of LP commitments, legal documents, and compliance audit trails remain in their existing CRM (Affinity, Backstop, Foliometrics, HubSpot, etc.). TOMO is the operational AI layer.

**System context (text-only diagram):**

```
                       ┌──────────────────────────┐
                       │      GP (1–3 users        │
                       │      per workspace)       │
                       └────────────┬──────────────┘
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
        │ Graph     │ │ Workspace │ │  - Affinity (R/W)*    │
        │ (Outlook, │ │ (Gmail,   │ │  - HubSpot (read CSV) │
        │ Calendar, │ │ Calendar, │ │  - Backstop (CSV)     │
        │ Contacts, │ │ Contacts, │ │  - Foliometrics (CSV) │
        │ Teams,    │ │ Meet,     │ │  - Sheets / Excel     │
        │ Drive)    │ │ Drive)    │ │  - Generic CSV        │
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

        * Affinity bi-directional sync is V1 conditional — see §3.4
```

External actors and systems that TOMO V1 interacts with are listed in §4.2 with the specific endpoints and authentication patterns.

### 2.2. Product functions (high-level)

V1 delivers twelve product capability areas. Each is a top-level grouping of functional requirements in §3 and a top-level grouping of user stories in §8.

1. **Authentication and account management** — Firebase Auth (email + Google + Microsoft); per-user OAuth for data-source connections; workspace creation; team invites (up to 3); plan billing via Stripe.
2. **Onboarding** — eight-screen flow (welcome → connect systems → field mapping → review imports → tone calibration → Day 1 Gap reveal → daily rhythm setup → workspace ready). Time target 17–22 minutes per user.
3. **Email and calendar sync** — direct MS Graph and Google Workspace integrations; three-tier ingestion (0–12mo full / 13–36mo metadata / >36mo none); webhook-driven incremental sync; OOO detection.
4. **CRM integration** — generic CSV pipeline with auto-mapping, deduplication, and conflict resolution; Affinity bi-directional API sync (conditional in V1).
5. **Signals engine** — nine surfaced signals plus three captured attributes; nightly batch and event-driven computation; append-only signal log; pipeline flag computation.
6. **Metrics engine** — ten Insights-page metrics; daily snapshot table; per-metric refresh cadences.
7. **Reminders engine** — open loops, missed replies, commitments; tier-aware thresholds; Action Drawer routing.
8. **Today / Daily Brief** — daily-rhythm landing surface with attention queue, commitments, brief, and inline Tomo chat. Daily Brief delivered also via email and Slack push at user-selected time.
9. **Action Drawer and approvals** — drafts, post-meeting capture, scheduling threads, follow-up reminders, meeting prep briefs; human-in-the-loop on every outbound.
10. **Relationships, Pipeline, and Workflows** — LP record (full Section 8 §8.4 schema), pipeline list with named filters, workflow editor with default playbooks plus F7 Three-Touch.
11. **Meeting lifecycle** — prep brief, transcript ingestion (Teams + Meet) with AI recap fallback, post-meeting capture (~10 fields, <60 seconds), follow-up draft.
12. **Tomo agent orchestration** — surface-gated tool calls; CRM updates, draft replies, filter relationships, workflow editing, post-meeting capture. All mutations require user confirmation.

### 2.3. User classes and characteristics

V1 has three classes of human user and one class of system user.

**U1 — General Partner (GP) primary:**
The fundraiser. Reads email and calendar regularly. Uses TOMO daily. The user class on which all UX decisions are optimised. Typical profile: 5–25 years' experience in IR or fund management; comfortable with consumer SaaS but not technical; manages 50–500 LP relationships; often on the road and using mobile responsive web for triage.

**U2 — Workspace teammate (other GP, IR associate, EA):**
Up to two additional users in a workspace, sharing identical permissions with the primary GP in V1 (no role tiering). Same OAuth-per-user pattern: each user authorises their own Microsoft / Google account for their own mail/calendar; data is filtered to that user's view where the source system is per-user. Workspace-level data (LPs, signals, metrics, workflows, action log) is shared.

**U3 — Onboarding specialist (Geoffrey Surface):**
A TOMO operator (initially Geoffrey, later customer success) who pairs 1:1 with each Founding Circle GP for a 45-minute onboarding session, plus Day 14, Day 30, and Day 60 reviews. This user accesses the GP's workspace via support-impersonation flow (auditable, time-limited, revocable). Out of scope for V1 GA; in scope for FC.

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
- HTTPS / REST against Affinity API v1 (webhooks) and v2 (most reads/writes) when Affinity bi-directional is in scope.
- HTTPS / REST against Slack Web API (`chat.postMessage` and OAuth) for daily brief delivery.
- HTTPS against Stripe API for billing.
- SMTP / API against Postmark or AWS SES for transactional email.

### 2.5. Assumptions and dependencies

**Assumptions:**

1. The GP has an active Microsoft 365 or Google Workspace account and has administrator approval (or self-approval, for owner-administrator GPs) to grant the OAuth scopes listed in §4.2.
2. The GP can produce a CSV export from their existing CRM during onboarding. This is universally true for the five FC source CRMs.
3. AI-generated meeting recaps from Microsoft 365 Copilot or Gemini for Workspace are licence-gated upstream; when not available, V1 falls back to ingesting the raw transcript and running TOMO's own LLM summarisation. See §3.13.
4. Affinity license tiers granting API access (Scale, Advanced, Enterprise) cover the FC Affinity user. Lower-tier Affinity users would fall back to CSV path.
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
| Affinity API | v1 + v2 (Scale tier or above) | Conditional — required only for Affinity bi-directional in V1 |

**Internal dependencies:**

- The mock app (`tomo_crm`) provides UI scaffolding for most surfaces. V1 production reuses the mock's component library, layout, and routing where appropriate. The Insights page mock implements a partial slice (execution health, pipeline intel, fat middle); V1 must extend to all ten metrics per Section 9.
- Section 8 (Signals V1 Final) and Section 9 (Metrics V1) are normative. Where this SRS condenses them, the source documents remain authoritative for rationale and forward-compatibility notes.
- Document A (CRM Integration Reference) and Document B (Onboarding Flow Specification) are normative for §3.4 and §3.2 respectively.

---

## 3. System Features / Functional Requirements

[STAGED — full draft to be added in stage 2. Section structure shown in TOC. Each subsection follows the pattern: Description / Inputs / Processing / Outputs / Business rules / Acceptance criteria.]

### 3.1. Authentication and account management

[TODO: §3.1 — Firebase Auth providers, magic links for FC, workspace creation, team invites (max 3), per-user OAuth for MS Graph and Google Workspace, session lifecycle, sign-out, password reset, account deletion.]

### 3.2. Onboarding flow

[TODO: §3.2 — eight screens per Document B. Welcome → Connect → Field mapping → Import review → Tone calibration → Day 1 Gap reveal → Daily rhythm → Workspace ready. Includes blocking vs non-blocking work, partial-state resumability, time-target acceptance.]

### 3.3. Email and calendar sync

[TODO: §3.3 — three-tier ingestion (0–12mo full / 13–36mo metadata / >36mo none) per ingestion strategy. MS Graph webhook subscription patterns. Google Pub/Sub watch patterns. OOO detection. Thread linking. Attachment metadata. Re-engagement event-driven hot path with sub-1-hour SLO.]

### 3.4. CRM integration (CSV + Affinity bi-directional)

[TODO: §3.4 — generic CSV pipeline (5 phases: column mapping, dedup, conflict resolution, ongoing sync, provenance). Per-CRM schema dictionaries (Affinity, Backstop, Foliometrics, HubSpot, Excel/Sheets). Affinity bi-directional sync as conditional V1 scope (TBD — Open Issue O-1). Custom field provisioning. Conflict resolution with last-write-wins and GP override.]

### 3.5. Signals engine

[TODO: §3.5 — locked from Section 8. Foundational definitions (Meaningful Touch, Pipeline stage, Direction). Nine surfaced signals (silence, re-engagement, reply velocity, reply length, reply initiation, stage stagnation, calendar friction, CC expansion, one-way contact). Three captured attributes (mandate fit, prior fund investor, days in prior stage). Two combined signals captured but not surfaced (warm_ghost, close_proximity). Stage threshold matrix. Pipeline flag computation algorithm. Append-only signal log.]

### 3.6. Metrics engine and Insights page

[TODO: §3.6 — locked from Section 9. Ten metrics (capital vs target, Day 1 Gap, moveability count, concentration alert, time recovered, follow-up compliance, draft approval rate, scheduling efficiency, direction with mandate qualifier, fat middle ratio, pipeline velocity + sparkline, cooling caught, 60-day close list). Three new schema items (expected_commitment_amount, tomo_action_log, daily_pipeline_summary). Per-metric refresh cadences.]

### 3.7. Reminders engine

[TODO: §3.7 — open loops (commitment language detection), missed replies (tier-aware: T1 = 48 business hours, T2/T3/unset = 5 days, owner-routed), commitments (transcript and email scan). Snooze. Action Drawer routing. Mark-resolved.]

### 3.8. Today / Daily Brief

[TODO: §3.8 — Today page sections (greeting, Tomo inline chat, what needs your attention, coming up, on my radar, daily brief modal). Daily Brief auto-open on first daily login (local-day-based). Brief content blocks (today's meetings, urgent/approval-needed, follow-up compliance, key signal change). Email and Slack push delivery at user-selected time.]

### 3.9. Action Drawer and draft approvals

[TODO: §3.9 — drafts (re-engagement, follow-up, scheduling), capture prompts (post-meeting, mandate fit), success states, owner routing, tone calibration usage. Approval flow with edit-level classification (<30% = light edit; ≥30% = substantial edit).]

### 3.10. Relationships / LP record

[TODO: §3.10 — full LP card (header strip, mandate fit, tier, prior fund badge, signals row, evidence line, narrative). Three views: list, board, detail. Inline editing via Tomo chat (Manual Update Principle). LP timeline with email, calendar, signal, action events.]

### 3.11. Pipeline (Lists) and named filters

[TODO: §3.11 — list page with stage swimlanes, named filters (Drifting, Quiet — Fat Middle, Re-engaged, One-Way, Stuck in stage, Slow to advance from [stage], Confirmed mandate fit, Re-ups · Fund N, Close proximity detected). Saved lists. Filter combinator.]

### 3.12. Workflows (playbooks)

[TODO: §3.12 — five default playbooks (Warm Intro Tracker, Post-Meeting Execution, Update → Follow-Up, DDQ Response Engine, F7 Three-Touch Qualification). Custom workflow creation from templates. Outbound deduplication. Workflow editor (visual flow + Tomo chat editing). Workflow run log.]

### 3.13. Meeting lifecycle (prep, transcripts, post-meeting capture)

[TODO: §3.13 — prep brief (unanswered questions, missed/promised materials, relationship context, suggested focus, recent docs). Transcript ingestion via MS Graph (Teams `OnlineMeetingTranscript.Read.All`) and Google Meet (`meetings.space.readonly` + `drive.meet.readonly`). AI recap ingestion path with licence-gated upstream and TOMO LLM fallback. Post-meeting capture (~10 fields, <60 seconds, single prompt). Follow-up draft <30 minutes after meeting end.]

### 3.14. Tomo agent orchestration

[TODO: §3.14 — surface-gated tools (filter_relationships, update_workflow, update_crm, draft_reply, create_user_workflow). Streaming via Vercel AI SDK. Audit trail per tool call. Confirmation gate on every mutation.]

### 3.15. Activity log

[TODO: §3.15 — event coverage (draft generated/approved/sent/edited, signal flag raised/changed, re-engagement detected, sequence step lifecycle, post-meeting capture). Filters by fund, type, date. Audit-grade retention.]

### 3.16. Settings (profile, funds, integrations, notifications, billing, team)

[TODO: §3.16 — sub-pages: profile, funds, integrations (status + reconnect), messaging (Slack), notifications (per-channel preferences), billing (Stripe portal), team (invite up to 3, identical permissions).]

### 3.17. Search

[TODO: §3.17 — global search across LPs, meetings, tasks, materials. Full-text on Postgres (V1) with optional Postgres trigram extension; Algolia / Pinecone deferred to V2.]

### 3.18. Notifications (Email, Slack)

[TODO: §3.18 — daily brief delivery, re-engagement urgent push, missed-reply push (per tier), open-loop reminder push. Per-channel preferences in Settings. Slack OAuth and `chat.postMessage` patterns. Email transactional via Postmark or SES.]

---

## 4. External Interface Requirements

[STAGED — full draft to be added in stage 2.]

### 4.1. User interfaces (UX expectations)

[TODO — desktop 3-pane layout (nav rail + list + detail) and mobile stacked layout per APP_SUMMARY. Tomo dock panel (520px desktop) and bottom sheet (mobile). Resizable panels. Empty states. Loading states. Error states. Accessibility baseline (WCAG 2.1 AA).]

### 4.2. Software / API interfaces

[TODO — full table of every external endpoint TOMO calls and every endpoint TOMO exposes. Microsoft Graph scopes and endpoints. Google Workspace scopes and endpoints. Stripe webhooks. Slack incoming webhooks. Affinity v1/v2 endpoints. Internal API routes (`/api/tomo/*`, `/api/crm/*`, `/api/email/*`, `/api/onboarding/*`, `/api/cron/*`, `/api/version`, plus the new V1 routes).]

### 4.3. Hardware interfaces

[TODO — none beyond browser hardware. Mobile camera/microphone not used in V1.]

### 4.4. Communications interfaces

[TODO — HTTPS only. TLS 1.2+. WebSocket for streaming Tomo agent. Webhooks (Microsoft Graph subscriptions, Google Pub/Sub, Affinity, Slack, Stripe). Inbound webhook signature verification.]

---

## 5. Non-Functional Requirements

[STAGED — full draft to be added in stage 2. Consolidated below; details to follow.]

### 5.1. Performance

Headline V1 SLOs (consolidated from source documents and standard practice):

| SLO | Target | Source |
|---|---|---|
| Onboarding to first value (Day 1 Gap visible) | ≤ 2 minutes from CSV upload + email connect | Document B Screen 6 / Tomo email ingestion strategy |
| 12-month full-content email backfill | ≤ 30 minutes background | Email ingestion strategy |
| 13–36 month metadata backfill | ≤ 2 hours background | Email ingestion strategy |
| Re-engagement event detection (LP inbound after 45+ days silence) | ≤ 1 hour from email arrival to Action Drawer card | Section 8 §8.3 Signal 2 |
| Follow-up draft availability post-meeting | ≤ 30 minutes after meeting end | Section 7.3 Geoff V1 / F3 |
| Page TTFB (P75) | ≤ 600 ms | Standard |
| Page LCP (P75) | ≤ 2.5 s | Web Vitals |
| Tomo agent first-token latency (P75) | ≤ 1.5 s | Standard for streaming LLM |
| Insights page load with 500 LPs | ≤ 2 s | Standard |
| API route latency (P95) | ≤ 800 ms | Standard |

[TODO — flesh out remaining performance budget, signal batch run window, metric snapshot run window, queue depth tolerances.]

### 5.2. Reliability and availability

[TODO — uptime SLO 99.5% V1 (institutional-acceptable; not 99.99%). RTO 4h, RPO 1h. Daily Postgres backups + PITR 7 days. Background worker idempotency. Webhook replay tolerance. Sync staleness banner.]

### 5.3. Security

[TODO — encryption at rest (Supabase default + Firebase + S3 SSE-KMS); encryption in transit (TLS 1.2+ everywhere); secrets management (AWS Secrets Manager / Vercel encrypted env vars; no secrets in browser); per-user OAuth tokens encrypted at rest with envelope encryption; row-level security in Supabase; rate limiting on public routes; CSRF tokens; input validation via Zod; audit logging (auth, integrations, CRM mutations, agent tool calls); pen test pre-GA.]

### 5.4. Privacy and data handling

[TODO — no-training-on-data commitment; LLM provider (OpenAI via Vercel AI SDK) configured with zero-retention; PII inventory; subject access request flow; deletion flow (account deletion → 30-day soft delete → hard delete); consent capture during onboarding; OOO detection; user-initiated re-sync.]

### 5.5. Compliance

V1 ships with two compliance commitments:

- **SOC 2 Type 1** — completed before first paying customer outside FC. Controls covering security, availability, confidentiality. Evidence: policies, runbooks, access reviews, change management, incident response, encryption controls. External auditor.
- **CASA Tier 2** — Google's Cloud Application Security Assessment Tier 2 (third-party penetration test against the OWASP MASVS / ASVS Level 2 controls). Required for Google OAuth scopes that carry sensitive or restricted classification (`gmail.modify`, `meetings.space.readonly`, `drive.meet.readonly`).

GDPR and CCPA are also in scope at MVP-baseline (DPA template, sub-processor list, data residency disclosure, deletion request flow). Full HIPAA / FedRAMP not in scope V1.

[TODO — controls inventory, evidence list, audit timeline, mapping of SRS sections to control families.]

### 5.6. Scalability

[TODO — V1 target 100 workspaces × 3 users × 500 LPs = 150,000 LP records and ~2M email/calendar events ingested per month. Supabase Pro covers this comfortably. Worker scaling via SQS queue depth + ECS autoscaling. Plan upgrade path to Supabase Team / dedicated cluster at 1,000 workspaces.]

### 5.7. Usability and accessibility

[TODO — WCAG 2.1 AA baseline (keyboard navigation, focus rings, semantic landmarks, alt text, colour contrast); responsive design at the 768px breakpoint; touch target sizing 44×44 minimum; no critical interaction below this size; reader testing with VoiceOver and NVDA pre-GA.]

### 5.8. Observability

[TODO — structured logging (request id, workspace id, user id); error tracking (Sentry); product analytics (PostHog or Vercel Analytics with PII-stripping); metric dashboards (background worker queue depth, sync lag, signal batch duration, daily brief success rate); alerting on SLO breach.]

### 5.9. Data retention and lifecycle

[TODO — three-tier email retention per ingestion strategy. Signal log append-only forever (V3 dataset). Action log append-only forever. Daily pipeline summary retained 24 months minimum. Workspace deletion → 30-day soft delete → hard delete with audit-log preservation per SOC 2 obligations.]

### 5.10. Internationalisation and localisation

[TODO — V1 ships in English (US/UK) only. Currency configurable per fund (ISO 4217). Date display per user locale. Timezone per user. Multi-language UI deferred V2.]

---

## 6. Data Requirements

[STAGED — full canonical schema (every table, every field) to be added in stage 3. Outline only here.]

### 6.1. Data model overview

V1 uses a relational model on Supabase Postgres 16 with the following entity groups:

1. **Identity and tenancy** — `users`, `workspaces`, `workspace_members`, `funds`, `auth_providers`, `oauth_tokens`.
2. **LP domain** — `lp_organizations`, `lp_contacts`, `lp_state`, `lp_stage_transitions`, `lp_tags`, `lp_notes`.
3. **Interactions** — `lp_interactions` (email, calendar, message), `lp_calendar_events`, `lp_meeting_transcripts`, `lp_meeting_recaps`, `lp_email_threads`.
4. **Signals and metrics** — `lp_signal_log` (append-only), `stage_cadence_benchmarks`, `daily_pipeline_summary`, `tomo_action_log` (append-only), `pipeline_flag_history` (or via signal log entries with `flag_transition`).
5. **CRM integration** — `csv_imports`, `csv_field_mappings`, `csv_dedupe_decisions`, `affinity_field_mappings`, `crm_sync_status`.
6. **Workflows and reminders** — `workflows`, `workflow_steps`, `workflow_runs`, `workflow_step_runs`, `reminders`, `commitments`, `open_loops`.
7. **Materials** — `materials`, `material_engagement` (V2-shaped, V1 light), `briefs` (meeting prep + post-meeting).
8. **Settings and notifications** — `user_preferences`, `notification_channels`, `slack_workspace_connections`, `email_delivery_log`.
9. **Audit** — `activity_log`, `agent_tool_calls`, `auth_events`.

### 6.2. Canonical schema

[TODO — full table-by-table specification with PK, FKs, indexes, RLS policies, default values, nullability. This is the largest single section of the SRS.]

### 6.3. Data dictionary

[TODO — alphabetical glossary of every non-trivial field, with allowed values, derivation, and references to the signal/metric that consumes it.]

### 6.4. Storage tiers and retention rules

[TODO — three-tier email retention; signal log append-only; action log append-only; daily snapshot table append-only; soft-delete vs hard-delete rules; backup / PITR / DR posture.]

### 6.5. Migration and import strategy

[TODO — initial migration scripts (Supabase migrations); CSV import pipeline phases; Affinity initial sync sequence; ongoing webhook and Pub/Sub patterns.]

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
| LLM provider | OpenAI via Vercel AI SDK with zero-retention configuration | Standard |
| Search (V1) | Postgres full-text + trigram | Defer Algolia/Pinecone to V2 |
| QA | Playwright (existing in repo) + Vitest / Jest for units | Mock baseline |

### 7.2. Regulatory and legal

- **SOC 2 Type 1** is a contractual prerequisite for institutional GP customers post-FC.
- **CASA Tier 2** is required by Google for production OAuth scopes that read user mail, calendar, and Drive content (`gmail.modify`, `meetings.space.readonly`, `drive.meet.readonly`).
- **GDPR / CCPA** baseline: DPA template, sub-processor list, deletion-request flow, data residency disclosure (V1 = us-east-1 with eu-west-1 considered for V1.5).
- **Microsoft Graph terms of service** and **Google API services user data policy** apply to all data accessed via those APIs. No selling or transferring user data; no use for advertising; LLM provider must be configured for zero retention.
- **Affinity terms of service** apply when Affinity bi-directional sync is enabled.
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

[STAGED — full set of stories to be added in stage 4. Structure follows `EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md` per surface, extended to cover all V1 capability areas including:

- Authentication flows (sign-up, sign-in, magic link for FC, OAuth re-auth, account deletion)
- Onboarding (eight-screen flow with resumability and partial-state handling)
- Email and calendar sync (initial backfill, ongoing incremental, OOO handling, sync-staleness UI)
- CSV CRM import (mapping, dedupe, conflict review, ongoing re-import, provenance display)
- Affinity bi-directional sync (conditional)
- Signals on the LP card and pipeline list
- Insights page (every metric with click-through behaviour)
- Workflows (default playbooks, custom from template, F7 Three-Touch)
- Meeting prep brief, transcript ingestion (Teams + Meet), AI recap fallback, post-meeting capture, follow-up draft
- Daily Brief delivery (in-app, email, Slack)
- Reminders (open loops, missed replies, commitments) with snooze
- Settings sub-pages (profile, funds, integrations, messaging, notifications, billing, team)
- Search
- Tomo agent across surfaces
- Activity log review
- Multi-user workspace (invite, accept, simultaneous use)

Each story shall include: actor, narrative, acceptance criteria (testable outcomes), traceability to source docs.]

---

## 9. Out of Scope / Future Roadmap

### 9.1. Out of V1 scope (deferred to V1.5)

The following items are explicitly deferred to V1.5 (a stabilisation release) and are not part of V1 ship:

- HubSpot bi-directional API integration (CSV path is V1; API is V1.5).
- Backstop bi-directional API integration (CSV path is V1; API requires Backstop's licensed API tier and is V1.5+ on demand).
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

V2 (Q4 2026) and V3 (2027) capability matrix is in Appendix C.

---

## 10. Appendices

[STAGED — full appendix content to be added in stage 5.]

### A. Glossary

[TODO — extended glossary beyond §1.3.]

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
- `docs/Tomo MVP (April 24, 2026).md` — V1 narrative source.

### C. V2 / V3 capability matrix and forward-compatibility notes

[TODO — full V2/V3 matrix extracted from Geoff V1 doc Section 7.2 and Section 8 §8.10.]

### D. Text-only ERD

[TODO — entity-relationship listing of every table and the FKs that connect them.]

### E. API surface map

[TODO — every internal route exposed by V1 and every external endpoint TOMO calls.]

### F. Stage threshold matrix and signal computation pseudocode

[TODO — lifted verbatim from Section 8 §8.6 and §8.7 for engineering reference.]

### G. Metric computation pseudocode

[TODO — lifted verbatim from Section 9 §9.3 for engineering reference.]

### H. Open issues and decisions to lock

| ID | Issue | Owner | Default if undecided |
|---|---|---|---|
| O-1 | Affinity bi-directional sync in V1: ship full or defer to V1.5? | PM + Eng lead | Default: defer to V1.5; ship one-way pull-only in V1. |
| O-2 | Per-action time-saved benchmarks (drafts 8m / scheduling 12m / follow-ups 10m / meeting prep 15m) — confirm or recalibrate after FC Month 1. | PM | Adopt as starting values; recalibrate Month 1. |
| O-3 | Draft edit-level threshold: 30% character change. Confirm. | PM | Adopt 30%. |
| O-4 | Microsoft 365 Copilot AI insight beta scope (`OnlineMeetingAiInsight.Read.All`) availability for FC tenants. | Eng lead | Fall back to transcript + TOMO LLM summarisation when scope or licence unavailable. |
| O-5 | Google Meet AI notes (Gemini for Workspace add-on) availability for FC tenants. | Eng lead | Same fallback as O-4. |
| O-6 | Daily Brief default delivery time per workspace timezone. | PM | 7:30am local, configurable. |
| O-7 | Slack daily-brief format (canvas vs message + thread). | PM + Design | Single message with section blocks; thread for detail. |
| O-8 | Email and calendar webhook architecture: Microsoft Graph subscriptions vs delta polling fallback when webhook unhealthy. | Eng lead | Webhooks primary, 30-minute delta polling fallback per integration. |
| O-9 | Re-engagement webhook latency SLO: ≤ 1 hour confirmed. If MS Graph subscription delivery exceeds, supplemental polling job at 30-minute cadence. | Eng lead | Adopt SLO; provision polling fallback. |
| O-10 | Workspace transfer on owner departure (e.g. GP leaves the firm). | PM + Legal | Defer to V1.5; manual support flow in V1. |
| O-11 | Sub-processor list for SOC 2 (Supabase, Firebase, Vercel, AWS, OpenAI, Postmark/SES, Stripe, Slack, Sentry, PostHog). Confirm inventory and DPAs. | Legal | Lock before SOC 2 audit kickoff. |
| O-12 | Data residency disclosure: us-east-1 primary; EU customers in V1.5. | PM | Disclose in DPA. |

---

**End of TOMO V1 SRS Draft v0.1 — Stage 1.**
*Stage 2 (next): full Section 3 (Functional Requirements) and Section 4 (External Interfaces).*
*Stage 3: full Section 5 (Non-Functional) and Section 6 (Data Model — every table, every field).*
*Stage 4: Section 8 (User Stories) — extension of the surface template across all V1 capability areas.*
*Stage 5: Appendices C, D, E, F, G.*
