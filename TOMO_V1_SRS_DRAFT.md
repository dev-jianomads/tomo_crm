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
- A CRM ingestion pipeline supporting CSV import from any source (Affinity, Backstop, Foliometrics, HubSpot, Excel, Google Sheets, generic) with column auto-mapping, deduplication, and conflict resolution. Affinity API integration in V1 is **read-only one-way pull** for the Affinity FC member; bi-directional Affinity sync is deferred to V2.
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
- Affinity bi-directional API sync (deferred to V2; V1 ships read-only one-way pull only).
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

### 3.4. CRM integration (CSV + Affinity read-only pull)

[TODO: §3.4 — generic CSV pipeline (5 phases: column mapping, dedup, conflict resolution, ongoing sync, provenance). Per-CRM schema dictionaries (Affinity, Backstop, Foliometrics, HubSpot, Excel/Sheets). Affinity API integration scope in V1 = read-only one-way pull (Persons, Organizations, Lists, Interactions; webhook-driven incremental updates). Affinity push-back / bi-directional sync deferred to V2.]

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

The unit of multi-tenancy. One workspace per fundraising team; up to three users per workspace in V1. *(Soft-delete.)*

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

Many-to-many between `users` and `workspaces`. V1 enforces a hard cap of 3 active members per workspace via a Postgres `BEFORE INSERT` trigger and an application-layer check. All members have identical permissions in V1 (no role tiering). *(Workspace-scoped, soft-delete.)*

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

**Trigger:** `BEFORE INSERT` aborts when active count for `workspace_id` ≥ 3.

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

Per-user OAuth tokens for Microsoft Graph, Google Workspace, Slack, and (V2) Affinity. Tokens are encrypted at rest via Supabase Vault (envelope encryption, KMS-backed). The application layer never logs the plaintext token. *(Workspace-scoped, soft-delete.)*

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
| `pipeline_stage` | text | not null | `'sourced'` | check in (`'sourced'`, `'first_meeting'`, `'second_meeting'`, `'active_diligence'`, `'soft_commit'`, `'committed'`, `'closed_lost'`, `'on_hold'`) | Single canonical taxonomy |
| `tier` | text | null | | check in (`'tier_1'`, `'tier_2'`, `'tier_3'`, `'unset'`) | GP-set priority |
| **Captured attributes (Section 8 §8.4):** | | | | | |
| `mandate_fit` | text | not null | `'unknown'` | check in (`'confirmed_fit'`, `'potential_fit'`, `'mandate_mismatch'`, `'unknown'`) | Drives the framework's "single most valuable query" |
| `mandate_fit_captured_at` | timestamptz | null | | | When the GP last confirmed |
| `prior_fund_investor` | boolean | not null | `false` | | Re-up cohort flag |
| `prior_fund_identifier` | text | null | | | E.g. "Fund II" |
| `prior_commitment_amount` | numeric(18,2) | null | | | Used in 60-Day Close List metadata |
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

**Indexes:** unique `(workspace_id, lower(primary_email))`; `lp_contacts(workspace_id, lp_organization_id)`; `lp_contacts(workspace_id, pipeline_stage)`; `lp_contacts(workspace_id, mandate_fit)`; `lp_contacts(workspace_id, prior_fund_investor)`; `lp_contacts(workspace_id, relationship_owner_user_id)`; `lp_contacts(workspace_id, fund_id)`.

**Audit trigger:** every change is captured to `activity_log`.

##### Table: `lp_state`

Derived per-LP state, recomputed by the nightly batch. One row per `lp_contact_id`. **All values in this table are derived; never edited directly by humans.** Computed by the signals engine (§3.5) and read by the metrics engine (§3.6). *(Workspace-scoped; soft-delete via cascade only.)*

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
| `signal_type` | text | not null | | check in (`'silence'`, `'re_engagement'`, `'reply_velocity'`, `'reply_length'`, `'reply_initiation'`, `'stage_stagnation'`, `'calendar_friction'`, `'cc_expansion'`, `'one_way_contact'`, `'warm_ghost_capture'`, `'close_proximity_capture'`, `'flag_transition'`, `'override_applied'`) | |
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

**Seed values (V1):** `sourced` (60/90), `first_meeting` (21/35), `second_meeting` (14/28), `active_diligence` (10/21), `soft_commit` (21/35), `committed` (21/35), `on_hold` (90/null), `closed_lost` (null/null).

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
| `moveability_count` | int | not null | `0` | | |
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

Per-workspace, per-source sync health (CSV last upload, Affinity last pull, MS Graph subscription health, Google Pub/Sub watch health). Drives the sync-staleness banner per §3.3. *(Workspace-scoped.)*

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

Maps TOMO fields to Affinity custom-field ids for bi-directional sync. **V1 ships the schema empty** — V1 only reads from Affinity. Bi-directional Affinity is V2 (see §1.2 and §9.1). The table exists in the V1 migration to avoid migration churn at V2. *(Workspace-scoped.)*

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

Workflow definition (default playbook or custom). The five default workflows seeded at workspace creation: Warm Intro Tracker, Post-Meeting Execution, Update → Follow-Up, DDQ Response Engine, F7 Three-Touch Qualification. *(Workspace-scoped, soft-delete.)*

| Column | Type | Null | Default | References | Notes |
|---|---|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `name` | text | not null | | | |
| `slug` | text | not null | | | E.g. `pb-three-touch-qualification` |
| `description` | text | null | | | |
| `is_default` | boolean | not null | `false` | | True for the five seed playbooks |
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
| `id` | uuid | not null | `gen_random_uuid()` | pk | |
| `workflow_id` | uuid | not null | | fk → `workflows.id` | |
| `lp_contact_id` | uuid | not null | | fk → `lp_contacts.id` | |
| `started_by_user_id` | uuid | null | | fk → `users.id` | Null if signal-triggered |
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
| `status` | text | not null | `'pending'` | check in (`'pending'`, `'in_progress'`, `'awaiting_approval'`, `'approved'`, `'sent'`, `'skipped'`, `'failed'`) | |
| `tomo_action_log_id` | uuid | null | | fk → `tomo_action_log.id` | If this step generated an action |
| `started_at` | timestamptz | null | | | |
| `completed_at` | timestamptz | null | | | |
| `output_jsonb` | jsonb | null | | | E.g. draft text generated |

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
| `surface` | text | not null | | check in (`'home'`, `'workflows'`, `'relationships'`, `'pipeline'`, `'targets'`, `'activity'`, `'materials'`, `'search'`, `'settings'`, `'insights'`, `'drawer'`, `'today'`) | |
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
| `funds.raise_target` | numeric(18,2), nullable | GP-set at onboarding screen 7 (Document B) or Settings → Funds | Metric 1 (Capital vs Target), Metric 4 (Concentration alert) |
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
| `lp_state.pipeline_flag` | enum(3) | Output of locked algorithm §8.7 | Pipeline list G/A/R dot; Metrics 3, 9 |
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
6. Postgres triggers: `BEFORE INSERT` on `workspace_members` (3-member cap); `AFTER UPDATE` on `lp_contacts.pipeline_stage` writes a row to `lp_stage_transitions`; `AFTER UPDATE` on audited tables writes to `activity_log`.
7. Seed data: `stage_cadence_benchmarks` rows (eight); five default workflows seeded per workspace via post-creation trigger.

**Onboarding-time data ingestion (per Document B):**

1. CSV upload → `csv_imports` row → row-by-row parse to `csv_dedupe_decisions`.
2. Auto-mapping → `csv_field_mappings` candidate.
3. GP confirms ambiguous rows (Screen 3).
4. On commit: rows written to `lp_organizations` and `lp_contacts` with `source='crm_csv'`.
5. Email sync (90 days full-content) starts; `lp_interactions` rows written.
6. Calendar sync (forward + 12 month back) starts; `lp_calendar_events` rows written.
7. Tone calibration runs against sent mail; `tone_profiles` row written.
8. Day 1 Gap computed; `daily_pipeline_summary` baseline row written with `day_1_gap_baseline` set.

**Ongoing sync:**

- Microsoft Graph subscriptions (`/me/messages` and `/me/events`) per user; Google Pub/Sub watches (Gmail `users.watch`, Calendar push notifications) per user. New events handled within seconds; degrade to 30-minute delta polling on subscription failure (per O-9).
- Affinity webhook (when Affinity user) updates LP records; v1 webhook only.
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
| O-1 | ~~Affinity bi-directional sync in V1.~~ **DECIDED:** V1 ships read-only one-way pull from Affinity; bi-directional deferred to V2. | PM + Eng lead | Closed. |
| O-2 | Per-action time-saved benchmarks (drafts 8m / scheduling 12m / follow-ups 10m / meeting prep 15m) — confirm or recalibrate after FC Month 1. | PM | Adopt as starting values; recalibrate Month 1. |
| O-3 | Draft edit-level threshold: 30% character change. Confirm. | PM | Adopt 30%. |
| O-4 | Microsoft 365 Copilot AI insight beta scope (`OnlineMeetingAiInsight.Read.All`) availability for FC tenants. | Eng lead | Fall back to transcript + TOMO LLM summarisation when scope or licence unavailable. |
| O-5 | Google Meet AI notes (Gemini for Workspace add-on) availability for FC tenants. | Eng lead | Same fallback as O-4. |
| O-6 | Daily Brief default delivery time per workspace timezone. | PM | 7:30am local, configurable. |
| O-7 | Slack daily-brief format (canvas vs message + thread). | PM + Design | Single message with section blocks; thread for detail. |
| O-8 | Email and calendar webhook architecture: Microsoft Graph subscriptions vs delta polling fallback when webhook unhealthy. | Eng lead | Webhooks primary, 30-minute delta polling fallback per integration. |
| O-9 | Re-engagement webhook latency SLO: ≤ 1 hour confirmed. If MS Graph subscription delivery exceeds, supplemental polling job at 30-minute cadence. | Eng lead | Adopt SLO; provision polling fallback. |
| O-10 | ~~Workspace transfer on owner departure (e.g. GP leaves the firm).~~ **DECIDED:** Manual support flow in V1; automated transfer in V2. | PM + Legal | Closed. |
| O-13 | ~~In-product support-impersonation flow for TOMO staff.~~ **DECIDED:** No impersonation feature in V1. Manual operator support only, with all TOMO-staff data access logged per SOC 2 access-management policy. Specced product feature deferred to V2. | PM + Security | Closed. |
| O-11 | Sub-processor list for SOC 2 (Supabase, Firebase, Vercel, AWS, OpenAI, Postmark/SES, Stripe, Slack, Sentry, PostHog). Confirm inventory and DPAs. | Legal | Lock before SOC 2 audit kickoff. |
| O-12 | Data residency disclosure: us-east-1 primary; EU customers in V1.5. | PM | Disclose in DPA. |

---

**End of TOMO V1 SRS Draft v0.1 — Stage 1.**
*Stage 2 (next): full Section 3 (Functional Requirements) and Section 4 (External Interfaces).*
*Stage 3: full Section 5 (Non-Functional) and Section 6 (Data Model — every table, every field).*
*Stage 4: Section 8 (User Stories) — extension of the surface template across all V1 capability areas.*
*Stage 5: Appendices C, D, E, F, G.*
