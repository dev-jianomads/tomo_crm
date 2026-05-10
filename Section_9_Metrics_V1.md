# 9. Metrics — what the V1 Insights page shows, how each number is computed, what data is required

This section is the canonical specification for the V1 metrics layer. It complements Section 8 (signals) and is the source-of-truth document for the V1 Insights page (specified visually in `tomo_insights_v2_dark.html`). Use this document to lock the metrics scope before SRS.

The metrics specified here are the surface — the numbers a GP sees. Section 8 specifies the signals — the per-LP behavioural observations these metrics aggregate over. Reminders (open loops, missed replies, commitments) are specified separately in the Production Spec and are not in scope for this document.

## 9.0 Conclusion first — what V1 surfaces and what schema is required

The V1 Insights page surfaces ten metrics across two halves. The top half answers *"where does my raise stand"* and consumes raise-state data. The bottom half answers *"what has TOMO done for my raise"* and consumes signal-derived aggregates plus internal action logs.

**Top half — Where your raise stands:**

1. Capital vs target progress bar (committed / soft commit / pipeline / target gap)
2. Day 1 Gap — closing (trended over 30 days)
3. Moveability count — single number
4. LP concentration risk alert (conditional, fires only when triggered)

**Bottom half — What TOMO has done since connection:**

5. Time Recovered (hero metric of the bottom half)
6. Execution Health: follow-up compliance, draft approval rate, scheduling efficiency
7. Pipeline Intelligence: relationships with clear direction (with mandate-fit qualifier)
8. Pipeline Intelligence: Fat Middle ratio
9. Raise Momentum: pipeline velocity (with sparkline) and cooling caught
10. 60-Day Close List

V1 does not include: Capital Influenced metric (stubbed in V1, populates after closes are logged), per-IR breakdown of Execution Health metrics (single-GP view in V1), pipeline coverage ratio, raise trajectory projection, conversion rates by stage. These are V2 features. Per-IR breakdown is V2 because Founding Circle GPs are largely solo IR or 2-3 person teams; the breakdown becomes valuable when 4+ users share a workspace.

To deliver the V1 metrics, three schema additions are required beyond what Section 8 specifies:

- `expected_commitment_amount` per LP (drives capital progress, Moveability annotation, concentration alert, close list dollar values)
- `tomo_action_log` table (drives Time Recovered, Draft approval rate)
- `daily_pipeline_summary` table for historical snapshots (drives Day 1 Gap trend, Pipeline velocity sparkline, Cooling caught "resolved" count)

These three additions are the irreducible engineering scope for the V1 Insights page. They are detailed in §9.4. Without them, four prominent metrics on the page either cannot be computed or lose their trended/aggregated value.

## 9.1 Why this set of ten, and not more

The Insights page has a single job: justify the GP's continued use of TOMO at the Day 14 review and every renewal moment after. Every metric on the page must pass three tests before earning its place:

**Test 1 — Does it answer a question the GP would otherwise ask?** Pipeline coverage ratio, raise trajectory projection, conversion rates by stage are all interesting analytics, but a GP in week 2 of TOMO use isn't asking those questions yet. They're asking "where is my raise" and "is this thing working." The metrics on this page answer those two questions specifically.

**Test 2 — Is the calculation defensible?** Every number must trace to specific email, calendar, action, or pipeline events. No composite scores, no theoretical weightings, no AI confidence intervals. If a GP asks *"how did you get this number,"* the answer must be one sentence about exactly what was counted.

**Test 3 — Is the input data actually being captured?** Several metrics that look reasonable on paper turn out to require data we aren't capturing. For each metric below, §9.3 traces inputs to sources. Where data is missing, §9.4 specifies the schema additions needed.

A note on what's deliberately not in V1: per-workflow effectiveness metrics, conversion rates by stage, raise trajectory, anonymised cohort benchmarking, GP/IR three-view dashboard. Each of these requires either 30+ closes of historical data (V3 territory) or sustained operational density (V2 after 90+ days of data). Including them in V1 would force premature definitions that we'd rewrite later.

## 9.2 Foundational definitions used by metrics

Three definitions are upstream of every metric and must be locked before computation begins. Two are inherited from Section 8; one is new.

### Inherited from Section 8

**Meaningful Touch** (Section 8 §8.2) — the unit of measurement for "have we meaningfully connected with this LP recently." Used by Day 1 Gap, Moveability, Pipeline velocity, Fat Middle ratio. Locked.

**Pipeline stage** (Section 8 §8.2) — the eight-stage taxonomy from sourced through closed_lost / on_hold. Used by Capital progress, Day 1 Gap, Moveability, Close List. Locked.

### New for Section 9

**Expected commitment amount** — the GP's confirmed estimate of how much capital this LP is sized to commit. Single numeric field per LP, optional, in fund currency. Captured via the post-meeting capture flow when sizing has been discussed; editable any time on the LP card.

Used by: Capital vs target progress bar (sums by stage), Moveability annotation ("$44M of pipeline value"), LP concentration risk alert (the trigger calculation), Close List dollar values per row.

This is **not** a behavioural signal computed from email — it is a GP-confirmed fact, similar in nature to mandate_fit and prior_fund_investor in Section 8 §8.4. The discipline rule applies: the GP enters this once when they have visibility on it, and updates it as conditions change. TOMO does not estimate or infer expected commitment amounts.

Default behaviour when expected_commitment_amount is null: the LP is excluded from sum-based metrics (capital progress, Moveability dollar annotation) but included in count-based metrics (Day 1 Gap, Moveability count). The Close List shows "—" in the dollar column rather than imputing a value.

## 9.3 The ten metrics — what each is, what it shows, where it appears

Each of the ten is documented below with the same structure: what it shows the GP, why it earned its place, inputs and their sources, computation pseudocode, refresh cadence, where it appears in the UI.

### Metric 1 — Capital vs target progress bar

**What it shows the GP:** the headline view of the raise. Total committed plus soft committed plus active pipeline plus target gap, against the fund target. Shown as a four-segment horizontal bar with dollar values per segment.

**Why surfaced:** Signal Framework v4.1 Section 7 names this *"the most important V1 GP metric."* Every Founding Circle GP is in active raise mode and the answer to *"how am I doing on the raise"* is the question that justifies opening TOMO each morning. Without this metric, the Insights page has no headline.

**Inputs and sources:**

| Input | Source |
|---|---|
| Raise target (single number) | New field on `funds` table, captured at onboarding |
| Committed sum | Sum of `lp_contacts.expected_commitment_amount` WHERE `pipeline_stage = 'committed'` |
| Soft commit sum | Sum of `lp_contacts.expected_commitment_amount` WHERE `pipeline_stage = 'soft_commit'` |
| Active pipeline sum | Sum of `lp_contacts.expected_commitment_amount` WHERE `pipeline_stage IN (first_meeting, nurturing, active_diligence)` |
| Target gap | `raise_target − (committed_sum + soft_commit_sum)` |

**Computation:**

```
total_committed = SUM(expected_commitment_amount) WHERE pipeline_stage = 'committed'
total_soft = SUM(expected_commitment_amount) WHERE pipeline_stage = 'soft_commit'
total_pipeline = SUM(expected_commitment_amount) WHERE pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence')

target_gap = raise_target - total_committed - total_soft

bar_segments = {
  committed:   total_committed / raise_target,
  soft:        total_soft / raise_target,
  pipeline:    total_pipeline / raise_target,  // capped at remaining bar space if >100%
  gap:         remaining
}
```

**Refresh cadence:** point-in-time, recomputed nightly batch + on every pipeline_stage transition event.

**Where it appears:** Insights page, top of Part 1 (Where your raise stands), as the visual hero of the upper half.

**Engineering note:** when total_committed + total_soft + total_pipeline exceeds raise_target (some GPs over-fundraise and close pro-rata), bar segments cap at 100% and the dollar legend shows actual sums. The bar visually clips; the numbers tell the truth.

### Metric 2 — Day 1 Gap, closing

**What it shows the GP:** the count of LPs the GP's CRM showed as active at onboarding for whom TOMO could not find a meaningful touch in 60+ days, AND how that number has changed over the past 30 days. Specifically: *"41 LPs · down 32 from 73 at onboarding."*

**Why surfaced:** the Day 1 Gap is a non-negotiable per the Non-Negotiables doc F1. It is the climax moment of onboarding (Document B Screen 6) and it earns a permanent home in Insights because the GP needs to see *"the gap is closing"* over time. Without persistence, the GP loses sight of one of the clearest proofs that TOMO is working.

**Inputs and sources:**

| Input | Source |
|---|---|
| Active pipeline LPs | `lp_contacts` WHERE `pipeline_stage IN (first_meeting, nurturing, active_diligence, soft_commit)` |
| Days since meaningful touch | `lp_state.days_since_meaningful_touch` (Section 8 Signal 1) |
| Historical snapshots for trend line | NEW: `daily_pipeline_summary.day_1_gap_count` |

**Computation:**

```
current_gap_count = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence', 'soft_commit')
  AND days_since_meaningful_touch > 60

# Trend line: query daily snapshots from daily_pipeline_summary
trend_30d = SELECT day_1_gap_count, snapshot_date
            FROM daily_pipeline_summary
            WHERE snapshot_date >= now - 30 days
            ORDER BY snapshot_date
```

**Refresh cadence:** point-in-time count recomputed nightly; trend line built from 30 days of daily snapshots.

**Where it appears:** Insights page, top half, two-up row left side. Sparkline shows the closing trend. Click-through to filtered Relationships view of the 41 LPs.

**Engineering note:** the "73 at onboarding" baseline is captured once during the Day 1 Gap computation at onboarding (per Document B Screen 6) and stored as the `day_1_gap_baseline` on the GP's account record. The "32 reactivated" count is `baseline − current_count`.

### Metric 3 — Moveability count

**What it shows the GP:** a single number representing how many LPs are genuinely moveable right now. The Day 14 review headline. *"23 LPs genuinely moveable right now"* with a small breakdown: *"7 re-ups · 16 active diligence."*

**Why surfaced:** First 14 Days PDF names this as the Day 14 promise: *"One number: how many LPs are genuinely moveable right now?"* This is the metric the GP shows their team in the Monday meeting. It deserves to be a single defensible number, not a list (the list is Metric 10 below).

**Inputs and sources:**

| Input | Source |
|---|---|
| Pipeline stage | `lp_contacts.pipeline_stage` |
| Pipeline flag | `lp_state.pipeline_flag` (Section 8 §8.7) |
| Directional signal in last 30d | `lp_signal_log` WHERE `signal_type IN (warming directional signals)` AND `created_at >= now - 30d` |
| Days since meaningful touch | `lp_state.days_since_meaningful_touch` |
| Stage amber threshold | Section 8 §8.6 stage threshold matrix |
| Prior-fund flag (for breakdown) | `lp_contacts.prior_fund_investor` (Section 8 §8.4) |
| Expected commitment (for $44M annotation) | `lp_contacts.expected_commitment_amount` (NEW per §9.2) |

**Computation:**

```
moveability_count = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence', 'soft_commit')
  AND lp_state.pipeline_flag IN ('green', 'amber')  -- explicitly NOT red
  AND EXISTS (lp_signal_log entry of any directional warming type in last 30 days)
  AND lp_state.days_since_meaningful_touch <= amber_threshold(pipeline_stage)

# Breakdown
reup_count = same with AND prior_fund_investor = true
active_diligence_count = same with AND pipeline_stage = 'active_diligence'

# Dollar annotation
moveability_value = SUM(expected_commitment_amount) over the moveability_count cohort
```

**Refresh cadence:** point-in-time, recomputed nightly.

**Where it appears:** Insights page, top half, two-up row right side. Anchors the Close List below (Metric 10 lists the same 23 LPs with their next moves).

### Today page — “Where the raise stands” summary tile

**What it shows:** four **mutually exclusive** counts over LPs still in the **live raise funnel**. **V1 cohort:** all `lp_contacts` whose `pipeline_stage` is **not** terminal — use the same terminal set as the Insights moveability denominator policy: exclude stages that mean “no longer pursuing” (e.g. `pass`, `closed_lost`); **exclude** `committed` from this tile so counts reflect *work left to do* (optional product flag may include committed in V1.5). The mock CRM uses terminal labels **`Closed`** and **`Pass`** only.

**Why:** Scannable raise pulse on Today; **Insights →** links to the full Insights page.

**Computation (partition — evaluate in this order):**

```
ACTIVE = lp_contacts WHERE pipeline_stage NOT IN (terminal_stages)
# Production default: exclude pass, closed_lost, committed (work left). Mock CRM: exclude Closed, Pass only.

MOVEABLE(lp) = same predicate as Metric 3 (this section §Metric 3)

today_tile_drifting_act       = COUNT lp IN ACTIVE WHERE pipeline_flag = 'red'
today_tile_genuinely_moveable = COUNT lp IN ACTIVE WHERE MOVEABLE(lp)
today_tile_cooling_watch      = COUNT lp IN ACTIVE WHERE pipeline_flag = 'amber' AND NOT MOVEABLE(lp)
today_tile_healthy_on_track   = COUNT lp IN ACTIVE WHERE pipeline_flag = 'green' AND NOT MOVEABLE(lp)
```

**Refresh cadence:** On read for Today, or nightly into `daily_pipeline_summary.today_tile_*` (optional, §6 SRS) with the metrics batch.

**Where it appears:** Today (`/home`) under **Coming up**; agent `todayContext.raiseStands` stays in sync.

### Metric 4 — LP concentration risk alert

**What it shows the GP:** a triggered amber banner that surfaces only when a single LP's expected commitment exceeds 20% of remaining target. *"CPPIB is sized at $50M — 46% of remaining target. Reduces optionality if they pull or scale back."*

**Why surfaced:** Signal Framework v4.1 Section 7 specifies LP concentration risk as a V1 alert. Concentration is a specific kind of raise risk — single-LP dependency that hides during a strong fundraise but becomes catastrophic if that LP pulls late. Senior fundraisers track this manually; TOMO surfaces it automatically.

**Inputs and sources:**

| Input | Source |
|---|---|
| Per-LP expected commitment | `lp_contacts.expected_commitment_amount` (NEW per §9.2) |
| Per-LP pipeline stage | `lp_contacts.pipeline_stage` |
| Raise target | `funds.raise_target` (NEW) |
| Currently committed | Sum of `expected_commitment_amount` WHERE `pipeline_stage = 'committed'` |

**Computation:**

```
remaining_target = raise_target - SUM(expected_commitment_amount) WHERE pipeline_stage = 'committed'

# Find LPs with potential outsized exposure
FOR each lp WHERE pipeline_stage IN ('soft_commit', 'active_diligence', 'committed'):
  exposure_pct = lp.expected_commitment_amount / remaining_target
  IF exposure_pct > 0.20:
    trigger_alert(lp, exposure_pct)

# Only the largest single concentration triggers the banner; others appear in drill-in
```

**Refresh cadence:** point-in-time, recomputed nightly + on every expected_commitment_amount change event.

**Where it appears:** Insights page, top half, conditional banner above the two-up row. Hidden when no LP exceeds the 20% threshold. Click-through ("Review") opens Relationships page filtered to that LP for V1; richer drill-in deferred to V1.5.

**Engineering note:** the 20% threshold is configurable per fund. Default 20% works for most strategies; some GPs running concentrated mandates may want higher. Surface as a per-fund setting in V1.5; hardcode at 20% in V1.

### Metric 5 — Time Recovered

**What it shows the GP:** estimated hours saved per week from TOMO-handled actions, with a breakdown by category. *"9.2 hours this week · ~28 hours total"* with chips showing *"4.2hr drafts · 2.8hr scheduling · 1.4hr follow-ups caught · 0.8hr meeting prep."*

**Why surfaced:** First 14 Days PDF names this as a Day 7 promise: *"Estimated one hour recovered daily with scheduling, follow-ups and meeting prep handled in the background."* The "YOU GAIN" section explicitly promises *"5-10 hours back each week."* This is a contractual promise in the Founding Circle agreement and the metric that justifies subscription renewal more than any other number on the page.

**Inputs and sources:**

| Input | Source |
|---|---|
| Drafts approved (any edit level) | NEW: `tomo_action_log` WHERE `action_type='draft'` AND `outcome IN ('approved_unchanged', 'approved_with_edits')` |
| Scheduling threads resolved | NEW: `tomo_action_log` WHERE `action_type='scheduling_thread'` AND `outcome='resolved'` |
| Follow-ups caught (open loops, missed replies actioned) | NEW: `tomo_action_log` WHERE `action_type IN ('open_loop', 'missed_reply')` AND `outcome='actioned'` |
| Meeting prep briefs generated and viewed | NEW: `tomo_action_log` WHERE `action_type='meeting_prep'` AND `outcome='viewed'` |

**Per-action time benchmarks (V1 starting values):**

| Action | Minutes saved per action |
|---|---|
| Draft approved (any edit level) | 8 |
| Scheduling thread resolved | 12 |
| Follow-up caught (open loop, missed reply) | 10 |
| Meeting prep brief generated and viewed | 15 |

**Computation:**

```
weekly_time_saved_minutes =
    (drafts_approved_count × 8) +
    (scheduling_threads_count × 12) +
    (followups_caught_count × 10) +
    (meeting_prep_views_count × 15)

# Display in hours (decimal)
weekly_time_saved_hours = weekly_time_saved_minutes / 60
```

**Refresh cadence:** rolling 7 days for the headline number, rolling 30 days for trend, recomputed nightly. Cumulative total accumulates from connection date.

**Where it appears:** Insights page, bottom half, hero block of Part 2 (What TOMO has done). The count-up animation fires once on this metric per the design guide's single-entrance-animation rule.

**Critical engineering note:** this metric depends entirely on the `tomo_action_log` table being instrumented from the first day of V1 ship. If we don't log actions from day one, we have no historical data to compute against. **This is a hard V1 dependency.** See §9.4.

**Methodology disclosure:** the per-action time benchmarks are estimates, not measured. The Insights page must include a small "How is this calculated?" link below the metric that opens a help article documenting the methodology in plain language. Without this transparency the number reads as marketing fluff. With it, it reads as honest estimation. The benchmarks should be recalibrated after Founding Circle Month 1 based on user feedback.

### Metric 6 — Execution Health row (three sub-metrics)

The bottom half includes a tighter three-column row of established Execution Health metrics. Each is a V1 metric in its own right but they're grouped visually because they're the supporting evidence for the Time Recovered hero above them.

#### 6a — Follow-up compliance rate

**What it shows the GP:** percentage of LP meetings followed by an outbound within 24 hours, since TOMO connection. With pre-TOMO baseline. *"87% — was 34% before."*

**Why surfaced:** the most directly testable claim TOMO makes — "we don't let follow-ups slip." The before/after comparison is what makes this a believable proof point rather than an abstract metric. Per the working doc I-series I1, locked.

**Inputs and sources:**

| Input | Source |
|---|---|
| LP meetings (calendar events with LP attendees) | Calendar sync via Nylas/equivalent |
| Outbound emails to LP attendees | Email sync via Nylas/equivalent |
| LP attendee identification | Match calendar attendee email domain to `lp_organizations.domain` |
| Pre-TOMO baseline | Same calculation against 90-day pre-onboarding email + calendar history |

**Computation:**

```
FOR each meeting in (calendar events with LP attendees, last N days):
  meeting_followed_up = EXISTS (
    outbound email to any LP attendee
    WHERE email.timestamp BETWEEN meeting.end AND meeting.end + 24h
  )

compliance_rate = COUNT(meeting_followed_up = true) / COUNT(meetings)

# Pre-TOMO baseline runs once at onboarding against 90-day history
```

**Refresh cadence:** nightly batch. Pre-TOMO baseline computed once at onboarding, stored, never recomputed.

**Where it appears:** Insights page, bottom half, Execution Health row, leftmost cell.

**Engineering note:** "meeting" requires the event actually took place — not declined, not deleted. We need a calendar event status check via Nylas. If the meeting was rescheduled and rebooked, the new instance counts.

#### 6b — Draft approval rate

**What it shows the GP:** percentage of TOMO-generated drafts approved (sent unchanged or with light edits) over the trailing 30 days. *"79% — voice holding."* If this drops below 50%, an inline nudge appears: *"Your draft approval rate has dropped — would you like to recalibrate TOMO's tone against your recent sent mail?"*

**Why surfaced:** a quality control signal as much as a metric. The headline number tells the GP TOMO is doing useful work; the falling number tells them tone calibration needs refreshing. Per the working doc I-series I2.

**Inputs and sources:**

| Input | Source |
|---|---|
| Drafts generated | NEW: `tomo_action_log` WHERE `action_type='draft'` |
| Approval outcome | NEW: `tomo_action_log.outcome` ENUM ('approved_unchanged', 'approved_with_edits', 'edited_substantially', 'dismissed') |
| Edit-level threshold | <30% character change classifies as 'approved_with_edits'; ≥30% classifies as 'edited_substantially' |

**Computation:**

```
approval_rate_30d = COUNT(action_type='draft' AND outcome IN ('approved_unchanged', 'approved_with_edits')) /
                    COUNT(action_type='draft' AND outcome IN ('approved_unchanged', 'approved_with_edits', 'edited_substantially', 'dismissed'))

IF approval_rate_30d < 0.50:
  trigger_recalibration_nudge()
```

**Refresh cadence:** rolling 30 days for current rate; rolling 60 days for trend comparison. Nightly batch.

**Where it appears:** Insights page, bottom half, Execution Health row, middle cell. Recalibration nudge fires inline when threshold breached.

**Engineering note:** the 30% character-change threshold is a recommendation, needs Ken confirmation. Below the threshold counts as approval; at or above counts as substantial edit. Without consistent classification, this metric drifts.

#### 6c — Scheduling efficiency

**What it shows the GP:** average days from inbound LP scheduling request to confirmed calendar event. *"1.2 days — was 4.1d before."*

**Why surfaced:** a direct, testable improvement metric. Scheduling friction is one of the most visible operational pains in IR — a GP who used to take a week to find time can now schedule in a day. Per the working doc I-series I3.

**Inputs and sources:**

| Input | Source |
|---|---|
| Inbound LP scheduling intent | Detected via pattern library on inbound emails (V1) — patterns like "can we meet", "schedule a call", "do you have time"; LLM classification deferred to V2 |
| Confirmed calendar event | Calendar event creation event with LP attendee |
| Pre-TOMO baseline | Same calculation against 90-day pre-onboarding history |

**Computation:**

```
FOR each scheduling thread (inbound with detected scheduling intent, last 30 days):
  resolution_days = (calendar_event_created_at - inbound_email_timestamp) / 86400

avg_efficiency_days = AVG(resolution_days)

# Pre-TOMO baseline runs once at onboarding
```

**Refresh cadence:** nightly batch. Pre-TOMO baseline computed once at onboarding, stored.

**Where it appears:** Insights page, bottom half, Execution Health row, rightmost cell.

**Engineering note:** scheduling intent detection accuracy depends on the pattern library. Expect false positives initially. Calibrate after Founding Circle Month 1. Recommend logging classification confidence so we can triage edge cases.

### Metric 7 — Relationships with clear direction (with mandate-fit qualifier)

**What it shows the GP:** count and percentage of active LPs with any directional signal in the last 30 days. *"112 of 150 with clear direction (75%)"* with a teal qualifier line: *"Of those 112, 47 have confirmed mandate fit and warm-stage placement — most likely to convert if worked first."*

**Why surfaced:** answers the question "where does the pipeline have momentum." The qualifier line is the critical addition — without it, 112 is just a count; with it, the GP gets a directly actionable cohort that maps to Section 8 §8.4's "single most valuable query."

**Inputs and sources:**

| Input | Source |
|---|---|
| Active LPs | `lp_contacts.pipeline_stage NOT IN ('closed_lost')` |
| Directional signal in last 30d | `lp_signal_log` WHERE signal indicates acceleration, deceleration, LP-initiated event, or close-proximity event (per Section 8 §8.7 fat middle definition) |
| Mandate fit | `lp_contacts.mandate_fit = 'confirmed_fit'` (Section 8 §8.4) |
| Warm-stage placement | `pipeline_stage IN (first_meeting, nurturing, active_diligence, soft_commit)` |

**Computation:**

```
total_active = COUNT(lp_contacts) WHERE pipeline_stage NOT IN ('closed_lost')
with_direction = COUNT(lp_contacts) WHERE
  pipeline_stage NOT IN ('closed_lost')
  AND EXISTS (lp_signal_log entry of any directional type in last 30 days)

# Mandate-fit qualifier
mandate_fit_subset = COUNT WHERE
  same as with_direction
  AND mandate_fit = 'confirmed_fit'
  AND pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence', 'soft_commit')
```

**Refresh cadence:** nightly batch.

**Where it appears:** Insights page, bottom half, Pipeline Intelligence section, first block. Click-through opens Relationships page filtered to either the with-direction cohort or the mandate-fit subset.

### Metric 8 — Fat Middle ratio

**What it shows the GP:** percentage of warm-stage LPs with 3+ meaningful touches in last 6 months. Rendered as a number plus a compact gauge with red/amber/green zones (0-30 / 30-60 / 60+). Below the gauge: a CTA chip *"Run Three-Touch Qualification on 29 LPs."*

**Why surfaced:** the Fat Middle is the framework's signature diagnostic — the cohort of LPs warm enough to be active but with no confirming behaviour. Industry norm <20%; target >60%. Surfacing the ratio plus the action to fix it (Three-Touch Qualification) is what makes this a working product loop, not just a metric. Per the working doc I-series I6.

**Inputs and sources:**

| Input | Source |
|---|---|
| Warm-stage LPs | `lp_contacts.pipeline_stage IN (first_meeting, nurturing, active_diligence, soft_commit)` |
| Meaningful touches in last 6 months | `lp_interactions` filtered by Meaningful Touch definition (Section 8 §8.2) |

**Computation:**

```
warm_stage_lps = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence', 'soft_commit')

three_plus_touches = COUNT(lp_contacts) WHERE
  pipeline_stage IN ('first_meeting', 'nurturing', 'active_diligence', 'soft_commit')
  AND COUNT(lp_interactions matching Meaningful Touch in last 6 months) >= 3

fat_middle_ratio = three_plus_touches / warm_stage_lps

# Cohort to action
fat_middle_cohort = warm_stage_lps WHERE 3-plus-touches condition fails
```

**Refresh cadence:** nightly batch. 6-month lookback requires at least 6 months of email history — supported by the 12-month ingestion tier per the email ingestion strategy decision.

**Where it appears:** Insights page, bottom half, Pipeline Intelligence section, second block (gauge form). The CTA chip below the gauge links to the Three-Touch Qualification workflow with the cohort pre-loaded.

**Engineering note:** the gauge zones are hardcoded at 0-30 / 30-60 / 60-100. The "industry norm <20%" annotation is text only — not a separately-computed value. Future versions could pull industry benchmarking from anonymised TOMO cohort data, but that is V3 (per V3 capability matrix).

### Metric 9 — Raise Momentum (pipeline velocity + cooling caught)

Two sub-metrics in the Raise Momentum section. They share visual treatment and engineering structure.

#### 9a — Pipeline velocity

**What it shows the GP:** average days between meaningful touches across all active LPs, with an 8-week sparkline showing trend. *"9.4 days · ↓ 5.4 from 14.8d at connection."*

**Why surfaced:** answers *"is my pipeline accelerating or slowing."* The sparkline is the only chart on the page and earns its place because trend matters here in a way it doesn't elsewhere — point-in-time velocity is meaningless without context.

**Inputs and sources:**

| Input | Source |
|---|---|
| Active LPs | `lp_contacts.pipeline_stage NOT IN ('closed_lost')` |
| Days between meaningful touches per LP | Computed from `lp_interactions` filtered by Meaningful Touch |
| Historical weekly snapshots | NEW: `daily_pipeline_summary.pipeline_velocity_avg_days` (sampled weekly) |
| Connection-date baseline | NEW: stored at onboarding completion |

**Computation:**

```
FOR each active LP:
  velocities[lp] = AVG(days between consecutive meaningful touches in last 90 days)

pipeline_velocity_avg = AVG(velocities)

# Weekly snapshot for sparkline
INSERT into daily_pipeline_summary (snapshot_date, pipeline_velocity_avg_days, ...)
   VALUES (today, pipeline_velocity_avg, ...)

# Sparkline data
sparkline = SELECT pipeline_velocity_avg_days, snapshot_date
            FROM daily_pipeline_summary
            WHERE snapshot_date >= now - 8 weeks
            AND DAYOFWEEK(snapshot_date) = 1  -- weekly samples
```

**Refresh cadence:** nightly batch for current value. Weekly snapshot stored to drive sparkline.

**Where it appears:** Insights page, bottom half, Raise Momentum section, first block. Sparkline on the right side of the block.

**Engineering note:** the sparkline samples weekly for 8 weeks. If a GP has been on TOMO less than 8 weeks, the sparkline is shorter — display only the snapshots that exist, do not extrapolate. The "from 14.8d at connection" annotation is the first weekly snapshot stored.

#### 9b — Cooling relationships caught

**What it shows the GP:** count of LPs flagged as cooling by TOMO, plus how many were resolved. *"14 cooling caught · 9 currently flagged · 5 resolved."* A small trace line below: *"3 stuck between deck-sent and met > 35d · 2 slowing within active diligence."*

**Why surfaced:** demonstrates TOMO's signal layer is working — these are the relationships the GP would have lost without TOMO catching them. The trace line surfaces the prior-stage stagnation pattern (Section 8 §8.3 Signal 6 with prior-stage history) and the in-stage cooling pattern, giving the GP texture on what kind of cooling is happening.

**Inputs and sources:**

| Input | Source |
|---|---|
| Currently flagged amber/red | `lp_state.pipeline_flag IN ('amber', 'red')` |
| Resolved in last 30d | NEW: `pipeline_flag_history` table OR `lp_signal_log` entries with `signal_type='flag_transition'` and from amber/red → green |
| Prior-stage stagnation trace | `lp_state.prior_stage_days` (Section 8 §8.3 Signal 6 update) |
| In-stage cooling trace | `lp_state.pipeline_flag_reason` plus `current_stage` |

**Computation:**

```
currently_flagged = COUNT(lp_contacts) WHERE
  pipeline_flag IN ('amber', 'red')

resolved_30d = COUNT(flag transitions from amber/red → green in last 30 days)

total_cooling_caught_30d = COUNT(unique LPs that were flagged amber/red at any point in last 30 days)
```

**Refresh cadence:** nightly batch.

**Where it appears:** Insights page, bottom half, Raise Momentum section, second block. Trace line below the count.

**Engineering note:** computing "resolved" requires logging every pipeline_flag transition, not just point-in-time state. Without this, the resolved count is uncomputable. See §9.4 schema gap 3.

### Metric 10 — 60-Day Close List

**What it shows the GP:** the top 7 of the Moveability cohort (Metric 3), ranked by probability of close. Each row shows: rank, LP name, badges (Re-up cohort, Mandate confirmed), firm and stage with days-in-stage, evidence line in italic teal, and dollar metadata (expected commitment + prior-fund history).

**Why surfaced:** First 14 Days Day 14 promise: *"Prioritised close list for the next 60 days. Specific names, specific next moves."* This is the Day 14 review's working list — the GP scrolls down the list each Monday morning and decides who to focus on this week.

**Inputs and sources:**

| Input | Source |
|---|---|
| Moveability cohort | Same as Metric 3 |
| Stage | `lp_contacts.pipeline_stage` |
| Days in current stage | Section 8 §8.3 Signal 6 |
| Mandate fit | `lp_contacts.mandate_fit` (Section 8 §8.4) |
| Prior-fund flag and prior commit amount | `lp_contacts.prior_fund_investor` and `lp_contacts.prior_commitment_amount` |
| Evidence line | Latest signal observation in `lp_signal_log` with plain-English rendering |
| Expected commitment | `lp_contacts.expected_commitment_amount` (NEW) |

**Ranking formula (M9 from production spec):**

```
score(lp) = stage_weight + intent_weight + signal_weight - silence_penalty

stage_weight:
  soft_commit:       40
  active_diligence:  30
  nurturing:    20
  first_meeting:     10
  sourced:            5

intent_weight:  // collapsed into stage post-§8.4 — kept for explicit re-up boost
  prior_fund_investor = true:  +20
  mandate_fit = 'confirmed':   +15

signal_weight:
  any warming directional signal in last 30d:  +10
  any cooling signal in last 30d:              -10

silence_penalty:
  IF days_since_meaningful_touch > amber_threshold(stage):
    -15

# Top 7 by score returned with full LP context
```

**Refresh cadence:** nightly batch. Ranking can re-sort as signals arrive, but the displayed list refreshes nightly.

**Where it appears:** Insights page, bottom half, anchored at the bottom as the Day 14 working list. The count above ("23 LPs ranked by probability of close") matches Metric 3's count exactly.

**Engineering note:** the score formula is locked for V1 with the values above. Recalibration after 30+ closes is V3 territory (the data-validated momentum score). Until then, the formula must be transparent — every score is decomposable into its components. If a GP asks "why is Charlotte ranked 3rd not 1st," the answer is the score breakdown.

## 9.4 Required schema additions for V1 metrics

Three new schema items are required beyond what Section 8 specifies. Without these, four prominent metrics on the Insights page either cannot be computed or lose their trended/aggregated value.

### Schema addition 1 — `expected_commitment_amount` and supporting fields

**New fields on `lp_contacts`:**

| Field | Type | Notes |
|---|---|---|
| `expected_commitment_amount` | numeric | Optional. GP-confirmed sizing estimate, nullable until captured. |
| `expected_commitment_currency` | varchar(3) | ISO currency code. Default to fund's base currency. |
| `expected_commitment_captured_at` | timestamp | When the GP last confirmed/updated this value. |
| `prior_commitment_amount` | numeric | For prior_fund_investor=true LPs, their commitment in the prior fund. |

**New field on `funds`:**

| Field | Type | Notes |
|---|---|---|
| `raise_target` | numeric | Single number, captured at onboarding. Editable by GP at any time. |
| `raise_target_currency` | varchar(3) | ISO currency code. Defaults to fund's base currency. |

**Capture mechanism:** the GP enters expected_commitment_amount via the post-meeting capture flow when sizing has been discussed, OR directly on the LP card via the AI input chat ("Peter sized at $25M"). raise_target is captured during onboarding screen 7 as an additional question, OR via the onboarding flow's account setup.

**Affected metrics:** Capital vs target progress bar, Moveability $44M annotation, LP concentration risk alert, Close List dollar values.

### Schema addition 2 — `tomo_action_log` table

**New table `tomo_action_log`:**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `lp_id` | foreign key to lp_contacts | The LP this action relates to |
| `gp_user_id` | foreign key | The GP user who took or received the action |
| `action_type` | enum | One of: 'draft', 'scheduling_thread', 'open_loop', 'missed_reply', 'meeting_prep', 'tier_correction', 'mandate_fit_capture', 'post_meeting_note' |
| `outcome` | enum | One of: 'approved_unchanged', 'approved_with_edits', 'edited_substantially', 'dismissed', 'resolved', 'actioned', 'viewed', 'snoozed' |
| `character_change_pct` | float | For draft actions only — measures edit level for outcome classification |
| `created_at` | timestamp | When the action was generated by TOMO |
| `actioned_at` | timestamp | When the GP acted on it |
| `metadata` | jsonb | Action-specific extras (draft length, scheduling thread duration, etc.) |

**Logging rule:** every action TOMO surfaces to the GP writes a row at generation time; outcome and actioned_at are updated when the GP acts. **This must be append-only — never overwrite, never truncate.** Action log is V3 dataset for empirical time-saved calibration.

**Affected metrics:** Time Recovered (the entire metric), Draft approval rate.

**Critical V1 dependency:** action logging must be instrumented from day one of V1 ship. If logging is added after launch, the first month of Time Recovered data is unrecoverable.

### Schema addition 3 — `daily_pipeline_summary` table

**New table `daily_pipeline_summary`:**

| Field | Type | Notes |
|---|---|---|
| `gp_account_id` | foreign key | Per-GP-account snapshot |
| `snapshot_date` | date | One row per GP account per day |
| `day_1_gap_count` | int | Count of LPs with active stage + 60+ days silence |
| `pipeline_velocity_avg_days` | float | Average days between meaningful touches across active LPs |
| `total_committed` | numeric | Sum of expected_commitment for committed-stage LPs |
| `total_soft_commit` | numeric | Sum for soft_commit-stage LPs |
| `total_active_pipeline` | numeric | Sum for active stages (first_meeting through active_diligence) |
| `cooling_currently_flagged` | int | Count of LPs with pipeline_flag in (amber, red) |
| `moveability_count` | int | Count of LPs in Moveability cohort |

**Capture mechanism:** the nightly batch job appends one row per GP account per day after computing all V1 metrics.

**Affected metrics:** Day 1 Gap "closing" trendline, Pipeline velocity sparkline, Cooling caught "resolved" count (when joined with pipeline_flag_history below).

### Schema addition 3a — Pipeline flag history (lighter-weight alternative)

To compute "cooling resolved" count without a dedicated history table, write every pipeline_flag transition to `lp_signal_log` with a special `signal_type='flag_transition'` and metadata `{from_flag, to_flag}`. This avoids a new table and keeps the audit trail in one place.

**Affected metric:** Cooling caught "resolved" count.

## 9.5 UI surfaces summary

Quick reference for engineering on where each V1 metric renders and what it depends on.

| Metric | Surface (location on Insights page) | Schema dependencies |
|---|---|---|
| 1. Capital vs target | Top half, hero block | expected_commitment_amount, raise_target |
| 2. Day 1 Gap (closing) | Top half, two-up left | daily_pipeline_summary, day_1_gap_baseline at onboarding |
| 3. Moveability count | Top half, two-up right | Section 8 inputs + expected_commitment_amount for $ annotation |
| 4. Concentration alert | Top half, conditional banner | expected_commitment_amount, raise_target |
| 5. Time Recovered | Bottom half, hero block | tomo_action_log (entire dependency) |
| 6a. Follow-up compliance | Bottom half, exec row left | Calendar + email sync, 90-day baseline at onboarding |
| 6b. Draft approval rate | Bottom half, exec row middle | tomo_action_log |
| 6c. Scheduling efficiency | Bottom half, exec row right | Email + calendar sync, 90-day baseline at onboarding |
| 7. Direction with mandate qualifier | Bottom half, PI block 1 | lp_signal_log + mandate_fit |
| 8. Fat Middle ratio | Bottom half, PI block 2 with gauge | lp_interactions with Meaningful Touch |
| 9a. Pipeline velocity + sparkline | Bottom half, RM block 1 | daily_pipeline_summary weekly snapshots |
| 9b. Cooling caught | Bottom half, RM block 2 | lp_signal_log with flag_transition entries |
| 10. 60-Day Close List | Bottom half, anchor block | Section 8 §8.3 + §8.4 + expected_commitment_amount |

## 9.6 Engineering clarifications to resolve before SRS lock

Eight items that need confirmation before metrics implementation begins. Recommended answers given for each.

**1. expected_commitment_amount capture flow.** Confirm: optional field surfaced via the post-meeting capture chip flow when sizing has been discussed AND editable any time on the LP card via the AI input chat. Recommendation: include "expected sizing" as an optional capture chip in the F8 post-meeting flow, defaulting to null; updateable any time in plain language ("Peter sized at $25M"). Captured value writes to `lp_contacts.expected_commitment_amount` and stamps `expected_commitment_captured_at`.

**2. raise_target capture mechanism.** Confirm: captured at onboarding as part of the fund setup, editable any time by GP. Recommendation: add to onboarding screen 7 (set up daily rhythm) or earlier in screen 2's CRM setup. Without it, the entire top half of Insights is non-functional.

**3. tomo_action_log instrumentation timing.** Confirm: action logging is in scope from V1 launch day, not added later. **This is non-negotiable** — the first month of Time Recovered data is unrecoverable if logging starts late. All V1 actions in the Action Drawer, scheduling threads, follow-up reminders, and meeting prep must write to the log.

**4. Per-action time benchmarks.** Confirm V1 starting values: drafts 8 min, scheduling 12 min, follow-ups 10 min, meeting prep 15 min. Document in help article (linked from the Time Recovered metric) so GPs can sense-check methodology. Recalibrate per-cohort after Founding Circle Month 1 based on user feedback.

**5. Draft edit-level threshold.** Confirm 30% character-change threshold for classifying drafts as 'approved_with_edits' vs 'edited_substantially'. Below 30% counts as approval; at or above counts as substantial edit. Without consistent classification, draft approval rate drifts.

**6. Pre-TOMO baseline computation timing.** Confirm: follow-up compliance, scheduling efficiency, and pipeline velocity baselines are computed once at onboarding completion against the 90-day pre-onboarding email + calendar history. Stored on the GP's account record. Never recomputed.

**7. Pipeline_flag transition logging mechanism.** Confirm: every pipeline_flag transition (amber → green, red → amber, etc.) writes a row to `lp_signal_log` with `signal_type='flag_transition'` and metadata `{from_flag, to_flag, reason}`. Required for the Cooling caught "resolved" metric.

**8. Daily snapshot job sequence.** Confirm: `daily_pipeline_summary` is appended in the nightly batch AFTER all V1 signals and metrics have been computed (so the snapshot reflects current state). Snapshot timestamp is the batch run timestamp, in the GP's primary timezone. Append-only — never overwrite.

## Note on scope

This section is metrics-only by design. The following layers are specified separately:

- **Signals** (Section 8) — per-LP behavioural observations that feed Metrics 7-10.
- **Reminders** (Production Spec Appendix D) — open loops, missed replies, commitments. These fire alongside metrics but are surfaced on the Today screen, not the Insights page.
- **Onboarding flow** (Document B from CRM/onboarding handoff) — Document B Screen 6 shows the Day 1 Gap moment; Insights page Metric 2 is the persistent home.

If a question about a metric arises during build that this document doesn't answer, default to the strategic frame above (each metric must answer a GP question, be defensible, and trace to captured data) and ping the PM before adding scope.

---

End of Section 9.
