# LP Network — SME handover pack

**Purpose:** Give a subject-matter expert everything needed to iterate on TOMO’s GP↔LP matching feature. The mock in this repo is **hidden from V1 nav** but fully walkable at `/lp-network`. Production rollout is planned as a **post-V1 / V3** capability (`docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md`).

**North star:** Enable **effective matching** between GPs and LPs who are both on the TOMO platform — curated, **double opt-in**, **anonymised until consent**, separate from the GP’s existing fundraising CRM pipeline.

---

## 1. What exists in the repo today (mock)

### 1.1 Routes & nav

| Route | Audience | Status |
|---|---|---|
| `/lp-network` | GP workspace | Built — list + detail in `AppShell` |
| `/lp-network/mandate?demo=1` | Allocator (LP) | Built — single demo mandate + intro inbox |

**Nav:** LP Network is **not** in the desktop rail (`src/components/app-shell.tsx` lines 107–113). `section="lp_network"` is still supported (Tomo chips, fund selector, FAB). V1 test asserts no “LP Network” link on Lists (`tests/v1-phase1.spec.ts`).

### 1.2 File map

```
src/
  app/lp-network/
    page.tsx                    # GP introductions page
    mandate/page.tsx            # LP mandate route shell
    mandate/lp-mandate-client.tsx
  components/lp-network/
    qualified-lp-card.tsx       # GP list tile (no PII)
    lp-introduction-detail.tsx  # GP detail + CTAs + demo controls
    lp-intro-status-strip.tsx   # Status timeline UI
  lib/
    mockLpNetwork.ts            # ~50 seeded mandates, qualification helpers
    lpNetworkIntroState.ts      # Intro workflow types + localStorage keys
docs/
  LP_NETWORK_MOCK_IMPLEMENTATION_PLAN.md   # Original build plan (mostly done)
```

### 1.3 Data model (mock only)

**`NetworkLpMandate`** (`mockLpNetwork.ts`) — one row = one allocator who completed a mandate form:

| Field | GP-visible? | Notes |
|---|---|---|
| `displayLabel` | Yes | Anonymised, e.g. “Allocator — North America — multi-strat” |
| `strategyTags` | Yes | From fixed pool (HF, PE, VC, etc.) |
| `checkSizeBand` | Yes | `$1–5M` … `$100M+` |
| `deploymentStatus` | Yes | Actively / Selectively / Paused / Re-up only |
| `geographyLabel` | Yes | NA, EMEA, APAC, Global, LATAM |
| `managerStagePreference` | Yes | Emerging / Established / Large / All |
| `hardConstraints` | Yes | Free text snippet |
| `introWorthTime` | Yes | “What makes an intro worth your time?” |
| `fitScore` | Yes (GP) | High / Medium / Low — **TOMO curator field** |
| `eligibleFundIds` | Internal | Empty = all workspace funds |

**No PII on GP surface:** no name, email, firm, or institution until post opt-in (product rule; not yet modelled in mock).

**Qualification rule (mock):**

```ts
fitScore === "High" && deploymentStatus === "Actively deploying" && fundMatchesMandate(fundId)
```

SME should replace this with real matching logic (fund strategy, cheque size, geography, mandate fit, deployment pace, exclusions, etc.).

### 1.4 Introduction workflow (mock)

**Status machine** (`IntroductionStatus`):

```
eligible → gp_requested → lp_pending → lp_approved → connected
```

| Status | GP copy | LP portal copy |
|---|---|---|
| `eligible` | Eligible | Eligible |
| `gp_requested` | LP notified | Pending |
| `lp_pending` | Awaiting LP | Review |
| `lp_approved` | LP approved | Meeting booked |
| `connected` | Intro sent | Closed |

**Persistence:** browser `localStorage` only:

- `tomo-lp-intro-state` — map `{ "fundId::mandateId": { status, updatedAt } }`
- `tomo-lp-dismissed` — per-fund mandate IDs hidden via “Not now”
- `tomo-lp-demo-mandate` — LP-side mandate edits for `DEMO_LP_MANDATE_ID` (`lp-net-001`)
- `tomo-lp-intro-auto-advance` — demo flag (2s auto-step to `lp_pending`)

**GP actions:** Request introduction, Not now, demo simulate/reset/jump status.  
**LP actions:** Edit mandate (local), Approve intro, Pass (clears thread).

### 1.5 UX flows already prototyped

**GP (`/lp-network`):**

1. Header fund selector filters mandates for active fund.
2. Toggle “Qualified only” (high fit + actively deploying).
3. Scroll anonymised cards → select → detail pane.
4. Request introduction → toast; optional auto-advance to Awaiting LP.
5. Link to LP mandate preview for end-to-end demo.

**LP (`/lp-network/mandate?demo=1`):**

1. View mandate in accordion sections (strategy, sizing, constraints).
2. Edit mandate modal (same question buckets as form).
3. “Introductions to you” — live rows from shared `tomo-lp-intro-state` when GP requested intro for `lp-net-001`.
4. Static example rows for narrative when no live thread.

**Empty states:** all dismissed, qualified filter empty, no mandates for fund.

### 1.6 Shell integration

- Tomo chips: *“Who fits our fundraise?”*, *“Summarize intro status”*, *“Explain double opt-in”*
- Fund selector in header when `section === "lp_network"`
- FAB retained (Tomo not inline on this page)
- **Deliberately separate** from `Relationship[]` in `mockData.ts` — no merge into GP pipeline

### 1.7 How to run the demo (5 min)

1. `npm run dev` → `/lp-network`
2. Set **Fund** in header; confirm qualified count line.
3. Select mandate → **Request introduction** (optionally enable auto-advance).
4. Open **Preview LP mandate view** → **Approve intro** (or Pass).
5. Return to GP view → status strip shows LP approved.
6. Reset via “Reset intro thread” or clear localStorage keys.

---

## 2. Product principles to preserve (non-negotiables for SME to refine)

1. **Double opt-in** — GP requests; LP explicitly approves before any identity exchange.
2. **Anonymised discovery** — GPs see fit signals only until LP consents.
3. **Curated, not a marketplace** — TOMO qualifies matches; not open browsing of all platform users.
4. **Separate domain from CRM** — LP Network mandates ≠ `lp_contacts` in the raise pipeline. A successful intro may *later* create a CRM contact — that’s a downstream integration decision.
5. **Fund-scoped on GP side** — matching runs per fund the GP is raising (strategy, target size, stage).
6. **Audit trail** — every status transition needs who/when/from→to for compliance and handoffs.

---

## 3. What the SME must define (spec gaps)

These are the decisions your colleague should own before engineering locks schema/APIs.

### 3.1 Matching engine

| Question | Mock today | SME to decide |
|---|---|---|
| What inputs define a “qualified” LP for a fund? | High fit + actively deploying | Full rule matrix: strategy overlap, cheque band vs fund target, geography, manager stage, deployment pace, hard exclusions |
| Who sets `fitScore`? | Seeded random | TOMO curator? Automated score? Hybrid with human review? |
| GP-side fund profile | Uses existing `funds` from app | What fund fields are required for matching? (strategy tags, target raise, min cheque, geography, stage) |
| Re-ranking | List order = seed order | Sort by fit score, deployment urgency, network tier, recency of mandate update? |
| Suppression | “Not now” per mandate | Cool-off period? Permanent hide? Fund-level vs workspace-level? |

### 3.2 Mandate capture (LP supply)

| Question | Mock today | SME to decide |
|---|---|---|
| Capture channel | Assumed external form | `network.hellotomo.ai` + Typeform/Airtable? In-app onboarding for allocators? |
| Question set | 8 fields in mock | Final mandate form buckets, required vs optional, refresh cadence |
| Identity | Single demo LP row | Auth model: magic link, SSO, invite-only? |
| Multi-mandate | One mandate per LP org | Family office with multiple sleeves? |

### 3.3 Introduction workflow (production)

| Question | Mock today | SME to decide |
|---|---|---|
| Valid transitions | Any demo jump allowed | Strict state machine + blocked transitions + error copy |
| Notifications | Toast only | Email to LP on `gp_requested`? In-app? Slack for GP team? |
| After `lp_approved` | Label “Intro sent” | Who sends the actual intro email? TOMO template? GP drafts? Calendar hold? |
| After `connected` | Terminal in mock | Create `lp_contact` in CRM? Link to existing relationship if email domain matches? |
| Pass / decline | Clears thread | Does LP “Pass” notify GP? Cool-off before re-request? |
| SLA / expiry | None | Auto-expire pending requests after N days? |

### 3.4 Privacy & compliance

- What exactly is revealed at each status (pre-opt-in vs post-opt-in field list).
- Data retention for passed/declined intros.
- Whether LP can see GP firm name before approving (mock shows fund name on LP side).
- Cross-workspace isolation (GP A never sees GP B’s intro activity).

### 3.5 IA & GTM

- When to unhide nav (L5 in product plan: “Dedicated locked nav item + evidence text”).
- Entry points: Today card? Insights? Pipeline CTA? Settings link during beta?
- Pricing / entitlement: all Founding Circle GPs? Per-intro fee? LP-paid?

---

## 4. Suggested production architecture

### 4.1 Logical separation

```
GP CRM (existing)              LP Network (new domain)
─────────────────              ───────────────────────
lp_contacts                    lp_mandates (allocator profiles)
lp_organizations               introduction_threads
pipeline_stage                 introduction_events (audit)
mandate_fit (GP-confirmed)     match_scores (TOMO-computed)
```

**Do not** fold mandates into `lp_contacts` until post-intro conversion is explicitly designed.

### 4.2 Suggested tables (draft — SME validates)

**`lp_mandates`**

- `id`, `allocator_user_id` (nullable until auth), `organization_label_internal` (TOMO-only)
- Mandate fields mirroring mock (`strategy_tags`, `check_size_band`, `deployment_status`, …)
- `curator_fit_tier`, `visibility` (active / paused / withdrawn)
- `created_at`, `updated_at`, `mandate_version`

**`fund_matching_profiles`** (or extend `funds`)

- Strategy tags, target raise, cheque expectations, geography, stage — whatever matching needs

**`introduction_threads`**

- `id`, `mandate_id`, `fund_id`, `gp_workspace_id`, `requested_by_user_id`
- `status` (enum matching mock + any new states)
- `created_at`, `updated_at`, `expires_at`

**`introduction_events`** (append-only)

- `thread_id`, `from_status`, `to_status`, `actor_type` (gp / lp / system), `actor_id`, `metadata`, `created_at`

**`match_scores`** (optional, nightly)

- `mandate_id`, `fund_id`, `score`, `explanation_json`, `computed_at`

### 4.3 Services

| Service | Responsibility |
|---|---|
| **Mandate ingest** | Webhook from form → validate → upsert `lp_mandates` |
| **Match batch** | Nightly (or on mandate/fund change) → compute qualified sets per fund |
| **Intro orchestrator** | Valid transitions, notifications, audit events |
| **Reveal service** | Post-`lp_approved`, expose agreed PII fields to GP |
| **CRM bridge** (V2) | Optional: create/link `lp_contact` on `connected` |

### 4.4 Surfaces to build beyond mock

1. **Allocator onboarding** — mandate form + magic-link auth (may live off CRM app).
2. **GP match inbox** — production `/lp-network` wired to API, remove demo controls.
3. **Notification layer** — LP email on request; GP email on approve/decline.
4. **Admin/curator tools** — fit tier, mandate approval, blocklist (internal).
5. **Metrics** — intros requested / approved / connected per fund (future Insights tile?).
6. **Tomo tools** — `surface: "lp_network"` with real data access (summarise matches, explain why qualified).

---

## 5. Recommended phased delivery

| Phase | Outcome | Builds on mock |
|---|---|---|
| **P0 — Spec lock** | SME fills §3 decisions; mandate form final; state machine diagram | This doc + mock walkthrough |
| **P1 — Supply** | Real mandate capture + LP auth + mandate CRUD API | Replace `mockLpNetwork.ts` seed |
| **P2 — Match** | Fund profile + matching job + qualified list API | Replace `isQualifiedMandate()` |
| **P3 — Intro MVP** | Thread API + notifications + audit; GP + LP UIs on real data | Replace `lpNetworkIntroState.ts` localStorage |
| **P4 — Reveal + CRM bridge** | Post-approval identity exchange; optional CRM contact create | New — not in mock |
| **P5 — GTM** | Nav unlock (L5), entry points, entitlement, help copy | `app-shell.tsx` rail item |

---

## 6. What to change first in the codebase (engineering hints)

When moving from mock → production, touch in this order:

1. **`mockLpNetwork.ts`** → API client + types generated from schema.
2. **`lpNetworkIntroState.ts`** → server mutations + optimistic UI; keep types.
3. **`page.tsx` / `lp-mandate-client.tsx`** → remove demo controls behind `NODE_ENV === 'development'` or delete.
4. **`app-shell.tsx`** → add nav item when feature-flagged (`lp_network_enabled`).
5. **Tests** — Playwright for happy path: request → LP approve → GP sees status; RLS tests for cross-tenant isolation.

Keep components (`QualifiedLpCard`, `LpIntroductionDetail`, `LpIntroStatusStrip`) — they’re production-shaped UI.

---

## 7. One-shot vibe-coding prompt (copy for colleague)

Use this in Cursor / Claude / etc. after cloning the repo and reading this handover doc.

```
You are the product SME + lead builder for TOMO LP Network — a curated GP↔LP matching feature on an existing Next.js CRM mock.

CONTEXT (already built, hidden from nav):
- GP page: /lp-network — anonymised mandate cards, fund filter, qualified toggle, intro request flow
- LP page: /lp-network/mandate?demo=1 — mandate view/edit, intro approve/pass inbox
- Mock data: src/lib/mockLpNetwork.ts (~50 mandates), intro state in localStorage via src/lib/lpNetworkIntroState.ts
- UI components: src/components/lp-network/*
- Shell: AppShell section "lp_network" — Tomo chips, fund selector, FAB
- Principle: DOUBLE OPT-IN, NO PII on GP cards until LP approves, SEPARATE from GP CRM Relationship model

YOUR JOB:
1. Read docs/LP_NETWORK_HANDOVER.md and walk /lp-network + /lp-network/mandate?demo=1 locally.
2. Produce a PRODUCT SPEC (markdown) that locks:
   - Mandate form fields (LP supply) and fund matching profile fields (GP demand)
   - Qualification/matching rules (replace mock isQualifiedMandate)
   - Introduction state machine (valid transitions, notifications, expiry, pass behaviour)
   - Reveal rules: what PII appears at each stage
   - IA: when/how GP discovers LP Network (nav, Today, Insights)
3. Iterate the MOCK UI in this repo to reflect your spec BEFORE any backend:
   - Update copy, fields, filters, ranking, empty states
   - Add any missing screens (e.g. fund matching profile editor in Settings)
   - Remove or gate demo-only controls cleanly
   - Keep anonymisation rules strict on GP list/detail
4. Draft Supabase-style schema + API outline from your spec (tables in handover §4.2 as starting point).
5. List open questions for PM/engineering sign-off.

CONSTRAINTS:
- Do not merge LP mandates into lp_contacts / pipeline_stage without an explicit "connected → CRM" story.
- Match existing TOMO visual language (AppShell, PageListHeader, accent tokens, tomo-input classes).
- Prefer extending existing files over greenfield rewrites.
- npm run dev to verify; keep routes at /lp-network unless IA doc says otherwise.

Deliverables in one PR or doc folder:
- docs/LP_NETWORK_PRODUCT_SPEC.md (your locked spec)
- Updated mock UI matching spec
- docs/LP_NETWORK_API_SCHEMA_DRAFT.md

Start by summarising what the current mock does well vs what's wrong for production, then propose your matching rules in plain English with 3 example GP funds and which LPs qualify.
```

---

## 8. Related references in repo

| Doc | Relevance |
|---|---|
| `docs/LP_NETWORK_MOCK_IMPLEMENTATION_PLAN.md` | Original build plan; Phases 1–6 largely complete |
| `docs/EPIC_USER_STORY_ACCEPTANCE_NOTES_TEMPLATE.md` § LP Network | Acceptance criteria template for production stories |
| `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md` | L5 nav item; V3 matching rollout note |
| `docs/Tomo MVP (April 24, 2026).md` | LP Network flagged as prototype route |
| `src/lib/mockData.ts` | GP CRM model — **do not couple** |

---

## 9. Open questions for PM (Ken)

1. **Timeline:** P1–P3 in one quarter or staged after V1 Insights ships?
2. **Allocator acquisition:** Invite-only network at launch vs open mandate form?
3. **Revenue model:** Does matching affect subscription tier?
4. **CRM conversion:** Auto-create contact on `connected`, or manual “Add to pipeline” CTA?
5. **Curator ops:** Who reviews mandates and sets fit tier at launch volume?

---

*Handover pack v1 — July 2026. Update when SME spec is locked.*
