# TOMO Product Decisions - V1 Phased Implementation Plan

## Objective
Translate the locked product decisions into a delivery-ready V1 implementation plan, with clear phasing, dependency order, and risk-aware sequencing.

## Scope Definition
- **Phase 0** in this plan means stabilization fixes for current-state behavioral/spec regressions.
- **Initial V1 wave** means the first feature tranche aimed at demo safety + core trust behaviors after stabilization.
- **V1 full** means items expected for founding cohort V1 (including post-demo completion work).
- **V2/V3** are explicitly deferred unless called out as a V1 stub.

## V1 Phased Plan

## Phase 0 - Stabilization Fixes (Bug/Regression Pass)
Goal: remove known current-state behavior defects before broader V1 feature delivery.

1. **Behavioral regressions and spec mismatches**
   - Fix chip disappearance behavior on Relationships (filter/action chips should not all vanish).
   - Fix attribution standard where flows still show `User` instead of `GP`/`TOMO`.
   - Remove score-like terminology mismatches (`Momentum` -> `Signal` + evidence text standard).
   - Remove conflicting instructional/header copy explicitly marked for removal.
   - Fix carry-forward behavior for incomplete Today cards (no midnight reset).

2. **Verification gates for Phase 0**
   - Snapshot/UI checks for renamed labels and removed copy.
   - Targeted interaction tests for chip persistence and overdue carry-forward behavior.
   - Cross-surface attribution consistency checks in drawers and logs.

## Phase 1 - Safety + Demo-Critical (Initial V1 Wave)
Goal: lock high-risk behavior and demo-critical trust features first.

1. **Workflow safety guardrails**
   - Implement runtime LP deduplication, overlap warning, suppression log, suppression reason display.
   - Add required trigger labels (`EVENT`, `THRESHOLD`, `SCHEDULED`) to all workflow process diagrams.

2. **Today page core UX correction**
   - Action drawer chip split behavior:
     - execution chips run silently + inline confirmation;
     - draft chips append in `Drafted by TOMO` blocks without resetting prior content.
   - Meeting prep additions: signal line, overdue commitment flags, LP-specific contextual chips, relationship deep link.
   - Incomplete card persistence and age handling (no midnight reset, overdue sort + badge).

3. **Spec compliance and naming alignment**
   - Rename `Momentum` to `Signal` with evidence text behavior.
   - Rename `Pipeline` to `Lists` in nav/header/primary CTAs where this blocks demo script coherence.
   - Remove high-noise subtitles where explicitly required for demo polish.

4. **Verification gates for Phase 1**
   - Regression tests for outbound suppression and overlap handling.
   - Interaction tests for drawer append-only behavior.
   - UI screenshot pass for signal terminology and renamed list terminology.

## Phase 2 - V1 Core Build-Out (Initial V1 Wave)
Goal: complete core usability, compliance, and key architecture changes needed for V1 credibility.

1. **Today + Relationships structural changes**
   - Daily Brief modal retirement + `On My Radar` replacement.
   - Chat panel collapse behavior on Today and Relationships.
     - **Delivered (Today inline Tomo):** Accordion-style expand/collapse (default collapsed single-line prompt); expanded panel uses persisted top/bottom split with resize handle. See **Appendix — Today inline Tomo UI delta** for copy and interaction diffs aligned with **T2**.
   - Relationships chip split (filter vs action) with persistent active filter tags.
   - Relationships LP drawer restructure (3 sections) + activity extension + history links.

2. **Workflows usability and compliance**
   - Clickable process boxes with inline config edit + draft preview from real LP sample.
   - Per-workflow activity log (5 entries max, required fields).
   - Workflow catalog updates: renames, adds, removals, lock labels, one-line tile descriptions.
   - Keep workflow chat panel scoped to workflow-modification only.

3. **Lists + Activity + Settings V1 baseline**
   - Lists page two-panel layout and inline workflow linking.
   - Activity page chronological feed + event coverage + filtering + CSV export.
   - Settings five-section IA with connection health, tone calibration rerun, threshold controls, notifications, team/access.
   - Slack webhook notifications + test/send flows.

4. **Verification gates for Phase 2**
   - End-to-end activity attribution (`GP` vs `TOMO`) consistency checks across Today/Relationships/Activity.
   - Integration tests for link workflow inline state and list context panel.
   - Notification test matrix (Slack/email schedule edge cases + timezone handling).

## Phase 3 - V1 Completion (Not Initial Wave)
Goal: finish remaining V1 commitments and stubs after initial wave stabilization.

1. **Insights**
   - Add Insights nav item and implement Sections 1-2 with baseline comparisons.
   - Add Section 3 and Section 4 V1 stubs with honest placeholders and nightly timestamp.
   - Add below-50% draft approval tone calibration nudge.
   - Add `Log a close` action as source for future capital-influenced population.
   - Add Section 5 (`60-Day Close List`) + one-page PDF export (founding cohort V1).

2. **Today enhancements**
   - Tone profile injection hard-check in draft generation path.
   - Email deep links in every drafted block.
   - Attachment prompt gating before follow-up draft completion.
   - Snooze/reminder queue (GP-set + TOMO-detected commitment reminders).

3. **Relationships V1 additions**
   - **Shipped (demo):** Relationships header — **Reset demo** restores CRM mock base data (reload from `/api/crm/relationships` or generated fallback), clears **manual contacts** (local persistence `tomo-relationships-manual-v1`), and clears **field overrides** (`tomo-relationship-overrides-v1`). **New contact** opens a two-step modal: step 1 required fields (name, firm, tier, stage, relationship owner); step 2 optional remaining CRM fields with defaults; Confirm appends the row and opens the drawer.
   - **Later V1:** Enrichment (e.g. Clearbit / Apollo) after save, prospect tagging, default next move automation.
   - V1 NL filtering (structured SQL over existing fields) with one clarifying question behavior.

4. **Verification gates for Phase 3**
   - Baseline computation correctness checks against onboarding history sample set.
   - PDF export snapshot tests for close-list quality and formatting.
   - Prospect enrichment partial-data fallback tests.

## Deferred Roadmap (Outside V1)
- V2: reasoning over relationship content (email-body semantic reasoning), browser extension capture, advanced custom kanban/list mechanics if not required for cohort.
- V3: close attribution maturity (`capital influenced` fully populated), LP matching network production rollout, broader workflow effectiveness analytics maturity.

---

## Consolidated Change Table (With Release Phase + Delivery Bucket)

Legend:
- **Difficulty:** S (0.5-1d), M (1-3d), L (3-7d), XL (1-2+ weeks)
- **Break Risk:** Low / Medium / High
- **Delivery Bucket:** `Phase 0`, `Initial V1`, `Later V1`, or `Deferred`

| ID | Area | Required change summary | Difficulty | Break Risk | Main implementation risk | Release (V1/V2/V3) | Delivery Bucket |
|---|---|---|---|---|---|---|---|
| T1 | Today | Strip subtitle + AI panel description; title only | S | Low | UI-only copy/layout cleanup | V1 | Phase 0 |
| T2 | Today | Collapse AI chat to single-line input; expand on click; update prompts | M | Medium | Fold/viewport regressions | V1 | Initial V1 |
| T3 | Today | Retire Daily Brief modal; add `On My Radar` with badge/content | L | Medium | Entry-point replacement and state continuity | V1 | Initial V1 |
| T4 | Today | External 7am brief send + in-app confirmation | L | Medium | Scheduler/timezone reliability | V1 | Later V1 |
| T5 | Today | Cards persist and age; overdue sort + nav badge | M | Medium | Existing reset assumptions | V1 | Phase 0 |
| T6 | Today | Drawer chip split; append-only draft blocks; no mode switch | L | High | Core interaction model rewrite | V1 | Initial V1 |
| T7 | Today | Tone injection, email deep link, attachment prompt | M | Medium | Prompt pipeline + outbound coupling | V1 | Later V1 |
| T8 | Today | Meeting prep signal line/flags/deep link/contextual chips | M | Medium | Context generation consistency | V1 | Initial V1 |
| T9 | Today | Activity attribution consistency (`GP` vs `TOMO`) | M | Low | Shared mapping standard rollout | V1 | Phase 0 |
| T10 (A1) | Today | Snooze/reminder system (GP + TOMO initiated) | L | Medium | Reminder queue and detection logic | V1 | Later V1 |
| R1 | Relationships | Remove subtitle; collapse panel by default | M | Low | Responsive layout changes | V1 | Initial V1 |
| R2 | Relationships | Split filter/action chips; fix disappear behavior | M | Medium | Shared chip state brittleness | V1 | Phase 0 |
| R3 | Relationships | NL query -> SQL (structured fields) + clarifying question | L | High | Query safety and reliability | V1 | Later V1 |
| R4 | Relationships | `Momentum` -> `Signal`, evidence text | M | Low | Data contract and copy alignment | V1 | Phase 0 |
| R5 | Relationships | LP drawer restructure (3 sections) + 5-log + link | L | Medium | Drawer architecture churn | V1 | Initial V1 |
| R6 | Relationships | Chat-only updates for **existing** records; no broad manual edit forms | L | High | Replacing direct-edit pathways | V1 | Later V1 |
| R7 | Relationships | Manual **New contact** (two-step modal); **Reset demo** on Relationships; enrichment + `Prospect` tag deferred | M → L | Medium | Enrichment provider integration + partial data (future) | V1 | Initial V1 (UI + demo reset); Later V1 (enrichment) |
| R8 | Relationships | Custom list/kanban organization + activation extensions | XL | High | Data model and UX complexity | V2 | Deferred |
| L1 | Lists | Rename `Pipeline` -> `Lists` everywhere | L | Medium | Cross-app naming misses | V1 | Initial V1 |
| L2 | Lists | Remove chat/filter panel, subtitle, header links | M | Low | Page simplification refactor | V1 | Initial V1 |
| L3 | Lists | Two-panel layout + LP names grouped by stage | L | Medium | Composite fetch/state complexity | V1 | Initial V1 |
| L4 | Lists | Inline workflow linking on tile, no navigation | M | Medium | Modal-to-tile sync errors | V1 | Initial V1 |
| L5 | LP Network | Dedicated locked nav item + evidence text | M | Low | Nav/routing/copy alignment | V1 | Initial V1 |
| W1 | Workflows | Trigger type labels in process diagrams | M | Low | Visual metadata plumbing | V1 | Initial V1 |
| W2 | Workflows | Clickable flow boxes -> inline edit + draft preview | L | High | Graph-edit interaction complexity | V1 | Initial V1 |
| W3 | Workflows | Dedupe + overlap warning + suppression log + override | XL | High | Outbound comms safety-critical logic | V1 | Initial V1 |
| W4 | Workflows | Catalog rename/restructure/additions incl Day 7 additions | L | Medium | Migration/backward compatibility | V1 | Initial V1 |
| W5 | Workflows | Activity log per workflow | M | Medium | Event coverage completeness | V1 | Initial V1 |
| W6 | Workflows | Effectiveness metrics strip stub with thresholds | M | Low | Correct gating placeholders | V1 | Later V1 |
| W7 | Workflows | Keep scoped workflow-modification chat below flow | M | Medium | Preventing generic chat drift | V1 | Initial V1 |
| I1 | Insights | New nav + Sections 1-2 | L | Medium | Baseline dependency and data freshness | V1 | Later V1 |
| I2 | Insights | Onboarding baseline computation from 90-day history | L | High | One-time historical computation quality | V1 | Later V1 |
| I3 | Insights | Sections 3-4 stubs + nightly timestamp | M | Low | Placeholder correctness | V1 | Later V1 |
| I4 (A5) | Insights | Section 5 60-day close list + PDF export | L | Medium | Ranking explainability/export quality | V1 | Later V1 |
| I5 | Core LP | `Log a close` action on LP record | M | Medium | New write path validation | V1 | Later V1 |
| A1 | Activity | Chronological feed + attribution + all event types | L | Medium | Event normalization coverage | V1 | Initial V1 |
| A2 | Activity | Filters + LP drawer links + CSV export | M | Low | Query/export plumbing | V1 | Initial V1 |
| S1 | Settings | Five-section IA and settings structure | L | Medium | Consolidation regressions | V1 | Initial V1 |
| S2 (A3) | Settings | Slack webhook + toggles + test + email timing + WA stub | L | Medium | Notification reliability | V1 | Initial V1 |
| C1 (A4) | Collateral | First 14 Days doc update (`pipeline` -> `list`) | S | Low | Content alignment only | V1 | Later V1 |

---

## Appendix — Today inline Tomo UI delta (delivered)

Tracks **UI copy and interaction** updates shipped for the Today page inline **TOMO AI** block (`/home`). These align with consolidated row **T2** (collapse/expand chat) and Phase 2 “chat panel collapse on Today,” and do not replace T3 (`On My Radar`) or other Today backlog items.

### Diff summary

```diff
  Inline TOMO AI (expanded)
- Subtitle block under title:
-   "Today's snapshot only — attention, meetings & Daily Brief"
-   "Not your full inbox or CRM · {fund}"
+ (no subtitle lines; title "TOMO AI" only)

- Section label above chips: "Quick prompts"
+ (label removed; chips unchanged)

- Input placeholder: "Ask about what's on Today…"
+ Input placeholder: "Ask Tomo about what's on Today…"

  Collapsed accordion trigger (unchanged intent)
  "Ask Tomo about what's on Today…"

+ After the first user/assistant turn, suggestion chips hide to give the
+ thread more vertical room (hide-suggestions-when-active).

+ "Expand view" opens a large overlay (~92dvh) with the same conversation
+ (single chat mount — inline panel shows a docked placeholder until return).
+ Close: overlay button, Escape, backdrop click, or "Return to inline chat".
+ Collapsing the accordion closes the overlay.
```

### Table row touchpoint

| ID | Relation to this appendix |
|----|---------------------------|
| **T2** | Collapse to single-line + expand on click; **plus** expanded-view overlay for long threads without duplicating chat state. |
| **T1** | Prior “strip subtitle / description” intent extended here by removing the **inline Tomo** subtitle lines under **TOMO AI** (shell/dock copy unchanged unless separately updated). |

---

## Appendix — Daily Brief engagement, OMR, and scheduled send (steps C + D)

This documents **implementation** of the phased plan: **C** (Still in To-Do + engagement signals) and **D** (scheduled Daily Brief delivery + notification prefs UI), on top of **A/B** (builders + OMR without duplicating follow-ups / meetings).

### C — Still in To-Do & engagement

| Piece | Behavior |
|-------|----------|
| **Storage** | `localStorage` key `tomo-today-action-engagement-v1` — `surfacedAt` / `engagedAt` per action id (per browser). Replace with server-side user store when CRM auth + DB land. |
| **Surfaced** | On Today, the top six **What needs your attention** ids are merged into `surfacedAt` the first time they appear. |
| **Engaged** | Opening an **action** row (drawer) records `engagedAt` for that id; it drops out of Still in To-Do. |
| **OMR block** | `buildStillInTodoBlock` lists up to five actions that were surfaced but never engaged; empty state explains the rule. |
| **Settings** | **Notifications → Clear engagement memory** calls `resetTodayEngagement()` for demo resets. |

### D — Scheduled Daily Brief (Loops) + prefs UI

| Piece | Behavior |
|-------|----------|
| **Cron** | `vercel.json` runs `GET /api/cron/daily-brief` on a UTC schedule (default `0 12 * * *` — adjust for your audience). |
| **Auth** | Route requires `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` in Vercel; Vercel Cron injects this header). |
| **Payload** | Same four-section HTML as manual send: `sendDailyBriefToEmail` → `LOOPS_SEND_TO` (or `DAILY_BRIEF_TEST_TO`). |
| **Settings** | **Notifications** includes **Daily Brief (email)** — toggles and preferred local hour are **client-persisted** (`tomo-daily-digest-prefs-v1`) for product direction until server-side prefs + multi-user routing exist. Actual send time follows **`vercel.json` UTC** until cron reads user timezone from DB. |
| **Slack** | Checkbox stub; Slack delivery is a later integration (same snapshot JSON as email). |

### Operational checklist (Vercel)

1. `LOOPS_API_KEY`, `LOOPS_SEND_TO`, `CRON_SECRET` (match Vercel Cron integration).
2. Redeploy after changing `vercel.json` schedule.
3. Confirm cron execution under **Vercel → Cron Jobs** / logs.

### Should A–D ship in one release?

No — **C + D** shipped after **A + B** to keep review small. Further work: persist engagement + digest prefs per user server-side; Slack transactional send; timezone-aware cron per tenant.

---

## Appendix — Contact research (LinkedIn deep links & Google Programmable Search)

**Today “Coming up”** can surface **stored LinkedIn profile URLs** (mock or from CRM enrichment) so GPs can open a profile in a new tab before a call. Treat the URL as a normal field on the contact/commitment record (`linkedInUrl` in mock data).

**Is Google Custom Search (Programmable Search Engine + JSON API) a good production approach?**

- **Primary recommendation:** Persist **canonical LinkedIn URLs** from enrichment providers, inbound email signatures, or manual verification. Deep links are predictable, cheap at scale, and avoid search ambiguity (common names, wrong person).
- **Google Programmable Search** is a **reasonable supplement**, not a replacement for stored URLs: use it for an optional **“Search the web”** or **“Find profile”** action that opens constrained search results (e.g. `site:linkedin.com` + name + firm) or powers a small side panel. Plan for **API quotas/cost**, **key management**, and **rate limits**; results quality varies and LinkedIn’s own rules/robots apply to what Google indexes.
- **Not ideal as the only identity path:** building “resolve this person to LinkedIn” purely via Custom Search in real time adds latency, cost, and failure modes; pair with enrichment or user confirmation for production CRM trust.

**V1 direction:** ship **explicit LinkedIn links** when known; defer automated Google-backed resolution until product requirements justify the integration overhead.

