# TOMO V1 — Onboarding Flow Specification

**Audience:** PM, frontend and backend engineering.  
**Purpose:** Sequenced specification of the V1 onboarding flow for the **mock app and production handoff**, aligned with `design/tomo_onboarding_v1.html`.  
**Status:** **Eight screens** after `/auth`. UX reference: `design/tomo_onboarding_v1.html`. Normative behaviour and mock persistence: `OnboardingState` + `ONBOARDING_STATE_STORAGE_KEY` in `src/lib/types.ts` (client key `tomo-onboarding-v2`; legacy `tomo-onboarding` is **not** read).

**Out of wizard (background / Settings — may return to onboarding later):** SRS **three-tier historical email** opt-in, **meeting transcripts** opt-in, and **Slack** (+ *What’s on my Radar* push). Those flags remain on `OnboardingState` for Settings and production defaults; they are not shown in this wizard.

---

## Strategic frame

Onboarding introduces Tomo as the **capital formation operating system**: connect workspace + pipeline data, capture fund and raise context, team, and tone, then surface a **first-read** narrative and **briefing preview** before Home. Primary navigation is **Back** + **Continue** in a **fixed bottom bar** (screens 2–7). Screen 1 uses an in-content **Begin setup** CTA. Top chrome: wordmark, **eight-segment** progress, and step label (`01 / 08 · Welcome` … `08 / 08 · Briefing preview`). From screen 2 onward, a small **indexing ticker** (mock copy) appears in the lower corner.

---

## Screen 1 — Welcome

- Kicker: *Welcome to Tomo*  
- Headline and body per design HTML (operating system framing; background read expectation; ~12 minutes).  
- Primary CTA: **Begin setup**  
- **Identity strip:** display name (session `displayName`, else derived from email) · email · *signed in via* Google / Microsoft 365 / Email.  
- **Back:** none. **Continue:** Begin setup → screen 2.

---

## Screen 2 — Connect data (Step 1 · Connect)

- Workspace: **Google Workspace** or **Microsoft 365** — one mock **Connect** each; **required** so that email, calendar, and contacts are authorised together in production (SRS §4.2).  
- **Pipeline (at least one required):**
  - **Backstop**, **HubSpot**, **Foliometrics** — V1 is **CSV / Excel upload only** (same mapping + confirm import flow as generic CSV).  
  - **Affinity** — API connect (list ID + token; mock).  
  - **CSV upload** — generic spreadsheet path.  
- **Continue** disabled until workspace is connected **and** (Affinity connected **or** CSV import confirmed).  
- **Back** → screen 1.  
- Ticker visible from this screen onward (mock percentages).

---

## Screen 3 — Your fund (Step 2 · Your fund)

- Fields: fund or firm name (required), strategy (select), AUM, strategy narrative.  
- **Continue** disabled until fund name non-empty.  
- **Back** → screen 2.

---

## Screen 4 — Your raise (Step 3 · Your raise)

- Fields: vehicle / vintage, target raise, soft-circled, target close, diligence count, targeting count, forward aspirations.  
- **Continue** disabled until vehicle and target raise non-empty.  
- **Back** → screen 3.

---

## Screen 5 — Your team (Step 4 · Your team)

- Lists signed-in user as **You · Admin**; optional additional rows (name, email, role, notes).  
- **Continue** always enabled.  
- **Back** → screen 4.

---

## Screen 6 — Your voice (Step 5 · Your voice)

- Tone capture options: sample from sent email (recommended), paste manually, skip.  
- **Continue** always enabled.  
- **Back** → screen 5.

---

## Screen 7 — A first read (Step 6 · A first read)

- Mock “notices” cards (partial inbox read, engagement, tone summary).  
- Primary footer CTA label: **See the preview** → screen 8.  
- **Back** → screen 6.

---

## Screen 8 — First-Read Briefing preview (Step 7 · Preview)

- Five-number preview grid + disclaimer + “what’s coming” list (per design HTML).  
- Primary CTA: **Take me to the app** → `/home`; sets `onboardingComplete` on session and `completed` on onboarding state.  
- Secondary: **I’ll wait for the full briefing** (informational; mock).  
- **Back** → screen 7.  
- **No fixed bottom bar** on this screen — actions are in content (matches HTML).

---

## Cross-step dependencies (summary)

| Screen | Depends on |
|--------|------------|
| 1 | Auth session |
| 2 | Auth; workspace + pipeline satisfied as above |
| 3–7 | Prior steps (linear) |
| 8 | Step 7 reached |

---

## Mock vs production notes

- Persistence: `ONBOARDING_STATE_STORAGE_KEY` (`tomo-onboarding-v2`), shape `OnboardingState` in `src/lib/types.ts` (`wizardStep` 1–8, fund/raise/team/tone fields, `crmCsvLabel`, workspace + CRM flags, etc.).  
- **No migration** from legacy `tomo-onboarding`.  
- Implementation: `src/components/onboarding/onboarding-wizard.tsx`, route `src/app/onboarding/page.tsx`.

---

## Open questions (engineering)

1. Server-backed `users.onboarding_state_jsonb` mirroring the expanded `OnboardingState`.  
2. When three-tier email and Slack return to product surface (Settings-only vs optional wizard steps).  
3. Real connector rollout order for Backstop / HubSpot beyond CSV.
