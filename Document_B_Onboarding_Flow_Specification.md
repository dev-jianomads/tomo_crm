# TOMO V1 — Onboarding Flow Specification

**Audience:** PM, frontend and backend engineering.  
**Purpose:** Sequenced specification of the V1 onboarding flow for the **mock app and production handoff**, screen by screen.  
**Status:** Aligned with `tomo_crm` mock onboarding (six steps after `/auth`). Full production build adds server-backed OAuth, CRM pipelines, and signal computation per `TOMO_V1_SRS_DRAFT.md`.

**Normative detail for email ingestion tiers, MS Graph / Google scopes, and meeting transcripts:** V1 SRS §3.2 (onboarding), §3.3 (email & calendar sync), §3.13 (meeting lifecycle).

---

## Strategic frame

Onboarding introduces TOMO as the **operational AI layer** next to the GP’s CRM: connect one work identity, optionally deepen historical access, load CRM relationships, and open the product. It does **not** (in this spec) include pipeline import progress narratives, duplicate review queues, Day 1 Gap reveal, daily rhythm configuration, or first-morning preview — those remain **product milestones beyond this wizard** and are specified in the SRS and pillar docs where relevant.

Linear flow: **six steps**, `Next` / `Back`, progress persisted in the client mock as `tomo-onboarding` (`OnboardingState` in `src/lib/types.ts`). **Next** is gated on step 2 until the workspace bundle connects. On step 4, **Next** is always available for the **CSV / Excel** path (import is optional — skip with **Next**); **Next** stays disabled on the **Affinity (API)** path until the mock reports connected.

---

## The six-screen arc

### Step 1 — Welcome (~90 seconds)

**What the GP sees**

- Personalised greeting: *"Welcome, {FirstName}."* First name is derived from the signed-in email local-part when no FC display name is available; fallback: *"Welcome to TOMO."*
- Body paragraph (Founding Member framing): you will connect systems and pull in CRM relationships; nothing is sent or surfaced outside this flow until the user acts later in product.
- Primary action: **Next** (mock; Document B classic *"Let's start"* is equivalent).

**What happens behind the scenes**

- Sets expectations only; no integrations yet.

---

### Step 2 — Connect workspace (required)

**What the GP sees**

- Single decision: **Google Workspace** or **Microsoft 365**.
- One **Connect** action per provider. Copy explains that **email, calendar, and contacts** are authorised together in **one OAuth consent** in production (V1 SRS §3.2).
- **Next** is disabled until a successful (mock) bundle connect.

**What happens behind the scenes (production)**

- Delegated OAuth to Google Workspace or Microsoft Graph with the combined scopes for mail, calendar, and contacts. Tokens stored per user (`oauth_tokens`); **Firebase app sign-in** remains separate from this data-source grant.

---

### Step 3 — Data access (optional)

Two **independent** opt-ins (checkboxes):

1. **Historical email ingestion (SRS three-tier)**  
   When checked, TOMO may ingest roughly **months 0–12** with **full content**, and **months 13–36** as **metadata-only** (no bodies). Nothing beyond 36 months. When unchecked, the mock represents a lighter / forward-focused posture until changed in Settings.  
   *See V1 SRS §3.3 for the locked production model and worker phases.*

2. **Meeting transcripts, notes, and actions**  
   - For **Microsoft 365**: Teams transcripts and related meeting content (SRS §3.13).  
   - For **Google Workspace**: Google Meet transcripts and linked notes where available.  
   Disabled in the UI until Step 2 is complete so the copy matches the chosen provider.

**Next** is always available (both options may remain off).

---

### Step 4 — CRM data (CSV optional; Affinity required when selected)

**What the GP sees**

- Choose one path:
  - **Upload CRM export (CSV / Excel)** — file drop, then **field mapping** table (`ContactImportFieldMapping`: your column → TOMO field, sample values). **Confirm import** saves mapping and row estimate (mock `uploadContactsSeed`). **Next** does not require a confirmed import — the GP may skip file upload and proceed.
  - **Connect Affinity (API)** — list ID + API key; mock `connectAffinity`. No column-mapping UI (schema mapping is server-side in production).

**What the GP does**

- Either skip CSV with **Next**, confirm a CSV import, or connect Affinity. **Next** is disabled on the Affinity path until the mock reports connected.

**What happens behind the scenes (production)**

- CSV: parse, policy storage for column mappings, queue sync (SRS / Document A) when the user confirms import; skipped CSV implies no onboarding import job until CRM data is added in Settings or a later flow.  
- Affinity: validate token, read-only pull per V1 SRS.

---

### Step 5 — Slack (optional)

**What the GP sees**

- Optional Slack install (mock link).
- Checkbox: push **"What's on my Radar"** updates to Slack when connected.
- **Next** without connecting Slack is allowed.

---

### Step 6 — Completion

**What the GP sees**

- Short confirmation summary (workspace provider, opt-ins, CRM path, Slack / radar flags).
- Primary CTA: **Go to Home** (`/home` in mock). Session flag `onboardingComplete` set.

**What this screen is not**

- No animated pipeline import milestones, duplicate merge queue, Day 1 Gap list, morning-brief schedule, or first-morning Today preview — defer to SRS and later UX iterations.

---

## Cross-step dependencies (summary)

| Step | Depends on |
|------|------------|
| 1 | Auth session |
| 2 | Auth; OAuth provider configuration |
| 3 | Step 2 for meaningful meeting-transcript copy |
| 4 | Step 2 recommended (signals use mail/calendar + CRM) |
| 5 | Optional |
| 6 | Step 2 satisfied; step 4 completed (CSV may have been skipped; Affinity path requires connect) |

---

## What this document deliberately omits (V1 elsewhere)

- **Pipeline import progress UI**, **duplicate review**, **Day 1 Gap reveal**, **daily rhythm / notifications setup**, **first-morning Today preview** — removed from this onboarding spec; track under SRS §3.2 product narrative and Home / Today specs.
- CRM vendor specifics beyond CSV + Affinity entry — **Document A** (CRM Integration Reference).
- Exact Graph / Gmail scope strings — **SRS §4.2** and §3.13.

---

## Mock vs production notes

- Mock state: `defaultOnboardingState` and `OnboardingState` in `src/lib/types.ts` (`workspaceBundleConnected`, `optInHistoricalEmailIngestion`, `optInMeetingTranscripts`, `crmImportMethod`, `slackWhatsOnRadarPush`, etc.).
- Legacy `emailHistoryScope` (`six_months` / `future_only`) has been **removed** from the type; onboarding migrates `six_months` to `optInHistoricalEmailIngestion === true` once when loading old localStorage.

---

## Open questions (engineering)

1. Whether Step 3 historical ingestion should default **on** for FC GPs to match SRS expectations.
2. Exact Slack payload for **What's on my Radar** (mirror of in-app radar view).
3. FC display name source for Step 1 when server user profile exists (replace email heuristic).
