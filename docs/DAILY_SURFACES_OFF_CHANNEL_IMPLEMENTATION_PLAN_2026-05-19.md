# Daily Surfaces, Insights, Radar Modal & Off-Channel — Implementation Plan — 2026-05-19

## Purpose

This plan ties together **UI/query work** (Today, Radar Modal, Insights, Relationships navigation) with the **one substantive signals-engine change** for V1: **off-channel suppression**. Normative requirements live in `TOMO_V1_SRS_DRAFT_2026-05-22.md` after the amendment pass; this document is the engineering sequencing note for the `tomo_crm` app and backend workers.

Source amendments (product / SRS briefing):

- `TOMO_V1_Amendments_Daily_Surfaces (1).md` — relabels, Radar consolidation (7→5 sections), Insights three-section layout, Focus list (Metric 10) cap 7→10, Fat Middle gauge removed from Insights (filter only), Cooling caught surface deferred to V1.5 with data capture retained.
- `TOMO_V1_Amendments_Off_Channel.md` — `lp_state.off_channel_active_until`, LP-record chip, nightly suppression of silence-derived signals and Radar *Gone quiet* / silence-derived *Cooling off* inclusion, pipeline-flag interaction, `lp_signal_log` audit rows (`signal_type='off_channel_marked'`).

## Principles

1. **Daily-surfaces amendments do not change signal math** — only labels, section grouping, LIMIT/cap, Insights layout, and navigation into Relationships. Signal definitions, `lp_signal_log` append-only discipline, and Metric 10 **ranking formula** stay as in Section 8 / Section 9.
2. **Off-channel is the only new signal-batch rule** — a timestamp gate before emitting silence-class observations and before silence-driven Radar cohorts / pipeline-flag outcomes.
3. **Relationships filter architecture is the main coupling risk** — Today bucket taps require **named or URL-addressable** filter state; avoid one-off query strings per surface.

## Phase A — Spec & schema (production path)

**Implemented in repo (demo + production artefacts):**

- **A1 / A2:** `db/migrations/20260517140000_off_channel_suppression.sql` — `lp_state.off_channel_active_until` + `lp_signal_log` check constraint including `off_channel_marked`.
- **A3:** `PATCH /api/lp-contacts/[id]/off-channel` — `src/app/api/lp-contacts/[id]/off-channel/route.ts`; demo persistence `src/lib/offChannelStore.ts`; `GET /api/lp-contacts` merges `off_channel_active_until` into `LpStatePayload` (`src/lib/lpContactApi.ts`).
- **A4 / A5 / A6:** `src/lib/signals/offChannelRules.ts` (+ `src/lib/signals/index.ts`) — pure helpers for nightly worker (`shouldSkipSilenceClassSignalWrite`, `shouldOmitFromGoneQuietCohort`, `applyOffChannelToPipelineFlag`). Wire these into the batch job when it lands; **Signal 2** remains ungated by construction (do not pass `re_engagement` through silence-class skip).

| Step | Deliverable |
|------|-------------|
| A1 | Migration: add `lp_state.off_channel_active_until timestamptz null` with comment that GP sets it via API; nightly batch **reads** and must not clear it except via GP mutation endpoint. |
| A2 | Extend `lp_signal_log.signal_type` check constraint with `'off_channel_marked'`. |
| A3 | API: `PATCH /api/lp-contacts/:id/off-channel` (or field on generic PATCH) — set / extend (+30d from `now()`), clear; append `lp_signal_log` row with `signal_value_jsonb` `{action, prior_until, new_until, gp_user_id}` (align with SRS; use **`signal_value_jsonb`**, not a separate `metadata` column). |
| A4 | Nightly batch: before writing Signal 1, 6, 9 rows and before populating *Gone quiet* / silence-only *Cooling off* rows, if `off_channel_active_until > batch_as_of` then **skip** those writes for that LP/night. |
| A5 | Pipeline flag step (§3.5 item 13 / Section 8 §8.7): when off-channel active, exclude silence-derived amber/red; keep positive overrides and re-engagement urgent red; add `off_channel_suppressed` to `pipeline_flag_reason` when applicable. |
| A6 | Event-driven Signal 2 unchanged — off-channel does **not** block re-engagement. |

## Phase B — Mock / demo app (`tomo_crm` Next slice)

Until Postgres + batch ship, mirror behaviour in mock data and derivations so UX matches SRS ACs.

| Area | Files / notes |
|------|----------------|
| Today — Where the raise stands | `src/components/where-raise-stands-card.tsx`, `src/lib/todayRaiseStands.ts`, `src/components/ui/hover-hint.tsx` — labels (*Stalling — watch*, *Moveable*); bucket + heading hover hints (≤300ms); optional local `off_channel_active_until` on relationship overrides. |
| Today — click-throughs | `src/app/home/page.tsx` — link each bucket to `/relationships` with stable query params; implement deserialisation on Relationships page. **No Focus list block on Today** (Insights Momentum only). |
| Radar Modal | `src/lib/radarModalTypes.ts` (new section ids), `src/lib/radarModalSeed.ts`, `src/lib/radarModalDeriveFromToday.ts`, `src/components/radar-modal.tsx` if layout for Commitments sub-rails — consolidate three sections under **Commitments**; rename *Quiet beyond cadence* → **Gone quiet**; filter quiet/cooling-silence cohorts by off-channel when present. |
| Insights | `src/app/insights/page.tsx` — three sections (*Where your raise stands*, *Momentum*, *What TOMO has done*); remove Fat Middle **gauge** (keep Three-Touch path via Relationships / workflow); hide **Cooling caught** hero; rename Close List → **Focus list**, cap 10. |
| Relationships | `src/lib/relationshipFilters.ts` (extend criteria for pipeline_flag + moveable + focus list ids), `src/lib/relationshipQuickFilters.ts`, `src/app/relationships/page.tsx` — URL sync; **Fat Middle** named filter already approximated — tighten copy to SRS. |
| LP drawer | `src/components/relationship-drawer-v2.tsx` — off-channel chip row; persist via client state or `relationshipOverrides` until API exists. |
| LP cohort API | `src/lib/lpContactApi.ts`, `src/app/api/lp-contacts/route.ts` — add `off_channel_active_until` to `LpStatePayload` when wired. |
| QA | `tests/radar-modal.spec.ts` — update section headings; add Playwright cases for Today bucket links and off-channel chip if stable `data-testid`s exist. |

## Phase C — Design artefacts

- `design/tomo_radar_modal_v1.html` — v2 pass for five-section layout and Commitments sub-labels (*Your commitments* / *Their commitments* / *Coming due*). Tracked as design dependency; not blocking SRS lock.

## Testing matrix (minimum)

| Scenario | Expect |
|----------|--------|
| Off-channel inactive, long silence | Signal 1 / Gone quiet / amber-red silence paths behave as today. |
| Off-channel active | No new silence/stagnation/one-way `lp_signal_log` rows for that LP that night; LP omitted from Gone quiet; silence-only cooling list omissions; directional signals still written. |
| Re-engagement while off-channel | Signal 2 still fires; urgent red still possible. |
| Today bucket tap | Relationships opens with correct cohort; counts match tile. |
| Where the raise stands hover hints | Heading + each bucket label shows SRS Section 9 hint within ~300ms. |

## Dependencies & ordering

1. URL filter contract + `StructuredFilterCriteria` extensions (**before** or **with** Today links).
2. Radar section type refactor (**before** email/Slack template work) — templates consume same section enum.
3. Off-channel schema/API (**before** trusting suppression in production Radar/Insights).

## References

- `TOMO_V1_SRS_DRAFT_2026-05-22.md` — §3.5 (signals), §3.6 (metrics/Insights), §3.8 (Today), §3.10 (LP record), §3.11 (named filters), §6.2 (`lp_state`, `lp_signal_log`), Section 9 (Metric 10 / Today partition / hover hints), Appendix I (Radar IA), Appendix A (glossary / disambiguation).
- `TOMO_V1_Amendments_Daily_Surfaces (1).md`, `TOMO_V1_Amendments_Off_Channel.md`.
