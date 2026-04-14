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
   - Manual prospect entry (`Add prospect`) + enrichment + prospect tagging/default next move.
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
| R6 | Relationships | Chat-only updates, no manual record forms | L | High | Replacing direct-edit pathways | V1 | Later V1 |
| R7 | Relationships | Manual `Add prospect` + enrichment + `Prospect` tag | L | Medium | Provider integration + partial data | V1 | Later V1 |
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

