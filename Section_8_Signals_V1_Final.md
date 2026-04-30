# 8. Signals — what TOMO V1 surfaces, why, and how

This section is the canonical specification for the V1 signals layer. It is signals-only by design. Metrics that consume these signals (the Insights page) and reminders that depend on them (open loops, missed replies, commitments) are specified separately in the Production Spec. Use this document to lock the V1 signals scope before SRS.

## 8.0 Conclusion first — what V1 must capture and surface

V1 surfaces nine signals to the GP. Each one passes a three-test bar before earning its place: a GP must intuitively understand it, the system must capture it cleanly from email and calendar metadata alone, and it must predict direction of travel in a way the GP can act on.

A note on two signals that are related but distinct: **days since last meaningful touch** (Signal 1) measures how long since the last genuine two-way connection — it requires both parties to have contributed. **One-way contact** (Signal 9) measures whether the most recent interaction was a GP email that received no reply. A GP can be within their silence threshold but still be talking into a void. Both signals are needed to give a complete picture of a relationship's health.

The eight surfaced signals:

1. **Days since last meaningful touch** — counted against a stage-appropriate threshold.
2. **Re-engagement after silence** — LP reaches out after 45+ days of GP silence.
3. **Reply velocity trend** — is the LP replying faster or slower than they used to.
4. **Reply length trend** — are the LP's replies getting longer or shorter than they used to.
5. **Reply initiation** — is the LP ever reaching out first, or always responding when prompted.
6. **Stage stagnation** — is the LP stuck in the current stage longer than typical.
7. **Calendar friction** — are meetings getting harder to schedule, more rescheduled, shorter.
8. **CC expansion** — are new people from the LP's firm appearing on threads.
9. **One-way contact** — was the most recent interaction a GP-initiated email with no LP reply.

Two further signals are captured but not surfaced in V1. These are higher-order combined patterns — warm-ghost flag and close-proximity flag — that need 90+ days of operational data before we surface them as named flags. Capturing the components now means V2 turns the named flags on without engineering rework.

In addition to the eight signals, V1 captures three qualitative attributes that don't compute from email metadata but make the signals queryable in the way experienced fundraisers actually work. These are not behavioural signals — they are GP-confirmed facts captured once and updated as conditions change. Without them, the framework's named "single most valuable query" cannot be answered:

- **Mandate fit** — confirmed_fit / potential_fit / mandate_mismatch / unknown. Captured via the post-meeting prompt after the GP has had a substantive conversation about whether the LP's mandate matches the fund's strategy.
- **Prior fund investor** — yes/no plus prior fund identifier. Captured at LP onboarding when the GP imports their existing LP base. Re-up LPs are the highest-probability closes in any new raise and need to be filterable from day one.
- **Days in prior stage** — derived automatically from the stage transition history. An LP who was in *first_meeting* for 8 weeks before moving to *second_meeting* yesterday looks healthy on current-stage time alone but their prior-stage history is part of how senior fundraisers read the relationship.

What V1 explicitly does not include: any NLP-derived signal (question type, commitment language, objection recurrence), any composite momentum score, any document-engagement signal that requires DocSend or DealRoom integration. These are explicitly V3 (NLP) or V2 (integrations).

The discipline rule, applied to every signal in this list: if it cannot be explained to a GP in one sentence and traced to a specific email or calendar fact, it does not appear in V1. Vague signals damage credibility more than the absence of signals.

## 8.1 Why this set, and not more

Signals are the most strategically loaded layer in TOMO. They are where positioning and credibility live. A signal that fires incorrectly — flagging an LP as cooling when they aren't — costs more trust than the upside of catching it correctly. A signal that cannot be explained when a GP asks "why is TOMO saying this" reads as opaque AI and undermines the product's promise of evidence-driven judgment.

The eight surfaced signals were chosen because they each pass three tests:

**Test 1 — Would a GP intuitively understand this?** Every signal here is something senior IR professionals already pay attention to instinctively. They don't track these patterns at scale today because they can't, but if asked "what makes you think this LP is cooling," they'd cite exactly these things: response speed slowing, replies getting shorter, no longer reaching out unprompted, scheduling friction, calendar slips. TOMO surfaces what experienced GPs already track in their heads, scaled across 100+ relationships.

**Test 2 — Can we capture this cleanly from email and calendar metadata?** Every signal in V1 derives from data we already have via the email and calendar sync. No DocSend integration. No NLP. No machine learning. No composite scoring. This matters because every additional dependency is a credibility risk and a build risk. V1 ships on observable behaviour and deterministic computation only.

**Test 3 — Does this predict direction of travel in a way the GP can act on?** A signal that fires but doesn't lead to an action is a metric, not a signal. Every signal in V1 either fires a draft (re-engagement, missed reply), changes a flag (silence, cooling combinations), or modifies the pipeline view (stage stagnation, CC expansion). A GP looking at any signal can ask "what should I do about this" and get a specific answer.

Signals that were considered and excluded:

- Email open rates and link clicks. Excluded because Apple Mail Privacy Protection inflates open rates by ~50%; the signal is too unreliable.
- Sentiment analysis of LP replies. Excluded because NLP-based sentiment is not defensible; brief polite replies and warm replies look identical to a sentiment classifier.
- Composite momentum scores. Excluded because a theoretically-weighted score that GPs can argue with is a liability. We capture the components in V1 so a data-validated score becomes possible in V3.

## 8.2 Foundational definitions — locked before anything else compiles

Three definitions are upstream of every signal in V1. Engineering and design must agree on these before signal computation can begin.

### Meaningful Touch

The unit of measurement for "have we meaningfully connected with this LP recently." Used in days_since_meaningful_touch, in the Day 1 Gap number, and in the silence threshold matrix.

A meaningful touch is an interaction satisfying *at least one* of:

- An inbound email from the LP containing 20 or more words
- Any LP-initiated email or LinkedIn message of any length
- A meeting that took place as scheduled (not declined, not rescheduled by the LP)
- An LP reply containing a direct question (regardless of word count)

Explicitly *not* a meaningful touch:

- LP reply under 20 words with no question ("Thanks, noted." / "Great, speak soon.")
- Out-of-office reply (detect via subject and body patterns; flag is_ooo=true; exclude)
- Calendar accept, decline, or reschedule with no message
- Newsletter open or campaign click event
- GP-initiated email that has not received an LP reply

This definition is locked. It cannot drift between signals — every signal that references "since last touch" or "in last N exchanges" uses this exact definition.

### Pipeline stage — the single taxonomy

V1 collapses the previously separated *pipeline stage* and *stated intent* taxonomies into one. GPs maintain one field per LP. Engineering captures one field per LP. All thresholds attach to stage.

The eight stages, lifted from the Signals Framework v4 (Section 4.6) and adopted as canonical:

- **sourced** — LP identified. No contact made yet, or one-way intro with no response.
- **first_meeting** — at least one substantive two-way conversation has occurred. LP has not declined.
- **second_meeting** — second substantive meeting has occurred.
- **active_diligence** — LP actively reviewing materials, asking substantive questions, or has requested DDQ / data room access.
- **soft_commit** — LP has verbally indicated intent to invest. No legal documents signed.
- **committed** — subscription agreement received or legally binding commitment made.
- **closed_lost** — LP has explicitly declined, or inactive past terminal threshold with no response to re-engagement.
- **on_hold** — LP has indicated interest but cannot commit this cycle (mandate constraints, board approval pending).

Every stage change writes a row to `lp_stage_transitions` with timestamp. This table is mandatory and cannot be retrofitted — stage_stagnation depends on it.

The decision to collapse *stated intent* into stage was made deliberately. The two taxonomies overlapped (both contained "soft_commit" and "committed"), and asking GPs to maintain both was operational overhead without a corresponding precision benefit. In practice, an LP's pipeline stage is a sufficient proxy for their stated intent. Where the two would have diverged — an LP in *first_meeting* who told you they're "monitor" only — is handled by the GP setting stage manually rather than auto-promoted by the system.

### Direction of communication

For the reply_initiation signal, every interaction is classified:

- **gp_initiated** — last meaningful exchange was an outbound from a GP team member with no LP reply within 7 days.
- **lp_initiated** — LP sent an unprompted message with no preceding GP outbound to that LP within 14 days.
- **two_way** — both GP and LP have contributed substantive content within the last 14 days.

The 14-day window for "preceding GP outbound" is intentional. Shorter windows produce false negatives — GP sends a quick "thanks for the meeting" two weeks ago, LP replies today, the system would call that LP-initiated. Longer windows over-suppress genuinely LP-initiated outreach. 14 days is the practitioner's intuition for "long enough that this counts as the LP reaching back out."

## 8.3 The eight surfaced signals — what each is, what it fires, where it appears

Each of the eight is documented below with: what it detects, why it earned its place, how it's captured, what action it fires, and where it appears in the UI. This is the implementation reference for engineering.

### Signal 1 — Days since last meaningful touch (silence)

**What it detects:** an LP has gone silent relative to what's normal for their stage in the pipeline. The foundation signal of the G/A/R flag system.

**Why surfaced:** every GP tracks "when did I last hear from this LP, properly." This is the most-used filter in the practitioner workflow per the Framework's Appendix research. Without this signal, the entire pipeline view loses its temporal dimension.

**Capture (nightly batch):**

```
Find the most recent lp_interaction satisfying the meaningful_touch definition
days_since_meaningful_touch = floor((now - that_timestamp) / 86400)

Look up amber_threshold and red_threshold from the stage threshold matrix (§8.6)

if days_since_meaningful_touch > red_threshold:    flag = red
elif days_since_meaningful_touch > amber_threshold: flag = amber
else: flag = green

If positive_directional_signal in last 14 days (see Override below):
  override flag to green regardless

Write to lp_signal_log
```

**Override (the close-proximity principle):** if any of the following has happened in the last 14 days, silence does not flag, even past threshold — reply_velocity = accelerating, OR LP has initiated contact, OR new senior person from LP firm CC'd, OR an active scheduling thread is in progress. The override prevents flagging an LP cooling when they're actually moving forward in a different way.

**Action fired:** at amber, the Action Drawer surfaces a re-engagement draft. At red, the Action Drawer surfaces an urgent prompt with stronger framing.

**Where it appears in the UI:**
- Pipeline list — G/A/R flag dot on every LP
- LP Card — *"No meaningful contact in 38 days. Threshold: 21 days for active diligence stage."*
- Today screen — top of "What needs your attention" when a Tier 1 LP crosses red
- Pipeline filter — drives the "Drifting" named filter

### Signal 2 — Re-engagement after silence

**What it detects:** an LP who has been silent for 45+ days has just sent an inbound message. The institutional fundraising equivalent of an inbound demo request — the highest-conversion signal class.

**Why surfaced:** this is the single most defensible TOMO claim in a sales conversation. *"TOMO catches LPs reaching back out within 1-2 hours of their email landing, with a draft reply ready in your voice. Without TOMO, that email sits in your inbox for a day, the LP feels neglected, and the window closes."* Sales research consistently shows close rates improve dramatically when high-intent inbound signals get fast responses.

**Capture (event-driven webhook, NOT nightly batch):**

```
On every new inbound lp_interaction:
  Find most recent outbound from any GP team member to this LP
  days_since_last_gp_outbound = floor((this_email_timestamp - last_gp_outbound_timestamp) / 86400)

  if days_since_last_gp_outbound >= 45:
    Set lp_state.re_engagement_flag = true
    Set lp_state.re_engagement_detected_at = now

    Trigger Action Drawer urgent card with same-day draft reply
    Override pipeline_flag to red regardless of other signals
    Send notification to LP relationship_owner

Clear flag when GP responds to LP and logs the response
```

**Action fired:** same-day urgent draft in the Action Drawer within 1-2 hours of the LP's email landing. Pipeline flag forced to red+urgent for 24 hours.

**Where it appears in the UI:**
- Pipeline list — red flag with "URGENT" tag
- LP Card — *"LP reached out after 67 days of silence. Draft reply ready in Action Drawer."*
- Today screen — top item in "What needs your attention"
- Pipeline filter — drives the "Re-engaged" named filter

**Critical engineering note:** this signal cannot be batched. Latency matters — if the webhook delivery is slower than 1 hour, the speed advantage of the signal is lost. See §8.9 clarification 2.

### Signal 3 — Reply velocity trend

**What it detects:** is the LP replying faster, slower, or about the same as they used to. *"Frank used to reply in 4 hours. Last three replies took 2 days, 3 days, 5 days."*

**Why surfaced:** this is one of the most intuitive signals in the entire framework. Every GP already pays attention to "how fast is this LP getting back to me." Surfacing it at scale across the whole pipeline is exactly the kind of pattern recognition GPs cannot do manually but want to know.

**Capture (nightly batch):**

```
Find last 3 LP replies that responded to a GP outbound
(exclude LP-initiated emails — those have no meaningful latency)

For each, compute reply_latency_hrs

latency_series_hrs = [oldest, middle, newest]
baseline_avg_hrs = average of all reply latencies for this LP older than the last 3

trend = "decelerating" if latency_series is monotonically increasing
        "accelerating" if monotonically decreasing
        "flat" otherwise

current_vs_baseline = "above" if latest > baseline_avg * 1.3
                      "below" if latest < baseline_avg * 0.7
                      "near" otherwise

Suppress signal entirely if LP has fewer than 5 prior exchanges
(latency is noise below this threshold)
```

**Action fired:** decelerating trend contributes to flag computation as a cooling signal. Accelerating trend triggers the silence override (above) — a fast-replying LP is not silent even if recent days_since_meaningful_touch is high. Standalone display on LP card.

**Where it appears in the UI:**
- LP Card — *"Reply time has slowed: last reply 4 days, typical for Peter is 18 hours."*
- Pipeline list — small velocity arrow icon next to the days-since-touch badge (up = accelerating, down = decelerating)
- Daily Brief intelligence line when a Tier 1 LP shows acceleration — *"Frank Ieraci's reply time halved this week — CPPIB is accelerating."*

### Signal 4 — Reply length trend

**What it detects:** are the LP's replies getting shorter, staying the same length, or getting longer. *"Sarah used to write three-paragraph replies. The last three have been two-line acknowledgments."*

**Why surfaced:** length of reply is one of the clearest declining-engagement patterns in B2B communication. A senior IR person reading a thread instinctively notices this. Surfacing it at scale is high-value, and capturing it requires only a word count on email body — no NLP.

**Capture (nightly batch):**

```
Find last 3 LP replies (any kind, including <20-word replies for this signal)
For each, compute word_count from email body
(strip signatures, quote-blocks, OOO boilerplate)

word_count_series = [oldest, middle, newest]

trend = "decelerating" if word_count_series monotonically declining
        "accelerating" if monotonically increasing
        "flat" otherwise

trend_delta_pct = (newest - oldest) / oldest * 100

Suppress if LP has fewer than 3 prior replies
```

**Action fired:** decelerating trend with material drop (newest < 0.5x earliest) contributes to flag computation as a cooling signal. Standalone display on LP card.

**A note on noise:** reply length alone can mislead. Sometimes LPs write short replies because the conversation has reached a natural endpoint, not because they're disengaging. To handle this, reply_length surfaces *as part of the LP card narrative* but does not fire a flag on its own — it requires pairing with another cooling signal (silence past amber, declining velocity, zero LP-initiation) to contribute to a flag state. Captured and displayed; flag-firing only in combination.

**Where it appears in the UI:**
- LP Card — *"Reply length has dropped sharply: last three replies averaged 31 words; prior baseline was 187."*
- Pipeline list — implicit (contributes to flag color but no separate badge)

### Signal 5 — Reply initiation

**What it detects:** does the LP ever reach out first, or are you always the one prompting. *"Looking at the last 5 exchanges, Peter initiated 3 of them — he's actively engaged. Sarah initiated 0 of the last 5 — she's not."*

**Why surfaced:** the clearest behavioural marker distinguishing real interest from polite maintenance. Reply initiation is what separates an LP who's genuinely engaged from a warm ghost. Captured purely from email metadata — no NLP, no integration.

**Capture (nightly batch):**

```
For each LP, find last 5 lp_interactions (excluding OOOs and automated emails)

For each interaction, determine truly_lp_initiated:
  interaction.direction == 'inbound'
  AND no preceding GP outbound to this LP within 14 days

lp_initiated_count = count where truly_lp_initiated == true
lp_initiation_ratio = lp_initiated_count / 5
last_lp_initiated_at = most recent timestamp where truly_lp_initiated == true
```

**Action fired:** ratio = 0.0 over 5+ exchanges contributes to amber flag (combined cooling rule). Ratio > 0.4 contributes to the silence override (LP is engaged enough to override threshold-based flagging).

**Where it appears in the UI:**
- LP Card — *"Peter has initiated 3 of the last 5 exchanges. This relationship is actively held."* (or, in cooling case: *"Sarah hasn't initiated contact in your last 5 exchanges. Last LP-initiated email was 73 days ago."*)
- Pipeline list — implicit (contributes to flag)
- Component input to the warm_ghost combined flag (captured but not surfaced — see §8.5)

**Critical definition:** "truly LP-initiated" must use the strict version (LP sends with no preceding GP outbound to this LP within 14 days). The loose version (any inbound counts as initiation) produces false negatives — every "thanks" reply incorrectly counts as initiation, defeating the whole point.

### Signal 6 — Stage stagnation (with prior-stage history)

**What it detects:** has the LP been at their current pipeline stage longer than typical for that stage, *and* how long did they spend in the prior stage before getting here. *"You're 22 days into active diligence with PAAMCO. Typical at this stage is 5-10 days. They spent 47 days in second_meeting before moving here."*

**Why surfaced:** stage stagnation is a *different problem* from going silent. An LP can be communicating regularly but stuck — making no forward progress through the funnel. Surfacing this lets the GP distinguish "this LP is dormant" from "this LP is engaged but not advancing." Different problems, different actions.

The prior-stage history matters because Framework v4.1 Appendix A3 ranks "pipeline stage + days in prior stage" as the **second-most-used filter** practitioners apply weekly. The framework's actual practitioner query is *"stuck between deck sent and met for 30+ days"* — a query about *days in prior stage*, not current stage. An LP who just transitioned yesterday looks healthy by current-stage time alone, but if they spent two months getting there, that's part of the story. Without surfacing the prior stage, we're showing only half of what experienced fundraisers actually look at.

**Capture (nightly batch):**

```
Stage cadence benchmarks (V1 starting values, recalibrate after Founding Circle Month 1):
  sourced:           amber 60 days, red 90 days
  first_meeting:     amber 21 days, red 35 days
  second_meeting:    amber 14 days, red 28 days
  active_diligence:  amber 10 days, red 21 days
  soft_commit:       amber 21 days, red 35 days

For each LP:
  Find most recent lp_stage_transition (call this T)
  days_in_current_stage = floor((now - T.transitioned_at) / 86400)

  Find prior_stage_transition (the row immediately before T)
  if prior_stage_transition exists:
    days_in_prior_stage = floor((T.transitioned_at - prior_stage_transition.transitioned_at) / 86400)
    prior_stage_name = prior_stage_transition.to_stage
  else:
    days_in_prior_stage = null
    prior_stage_name = null

  if days_in_current_stage > red_threshold:    stage_flag = red
  elif days_in_current_stage > amber_threshold: stage_flag = amber
  else:                                         stage_flag = green
```

**Action fired:** current-stage stagnation contributes to amber flag. Prior-stage history is informational — it doesn't fire a flag on its own but enriches the LP card narrative and makes the framework's "stuck between X and Y" query answerable.

**Where it appears in the UI:**
- Pipeline filter — "Stuck in stage" named filter (driven by current-stage stagnation)
- Pipeline filter — "Slow to advance from [prior stage]" named filter (driven by days_in_prior_stage > stage benchmark for that prior stage)
- LP Card — current and prior stage shown together: *"In active diligence 22 days (typical: 10-21). Spent 47 days in second_meeting before that."*
- Pipeline list — small JetBrains Mono badge "stuck 22d" when LP exceeds amber threshold on current stage

**Engineering note:** `lp_stage_transitions` already captures `transitioned_at` and `to_stage`. `days_in_prior_stage` is a window function over that table. No schema change required — only a query addition.

### Signal 7 — Calendar friction

**What it detects:** scheduling getting harder over time. Accept latencies climbing. Reschedules accumulating. Meeting durations shorter than booked.

**Why surfaced:** GPs intuitively know "the last two meetings got rescheduled, and the third got cut from 45 minutes to 20." This is a real cooling pattern. Captured directly from calendar metadata with one mild caveat (actual meeting duration requires either Granola integration or honest fallback to booked duration in V1).

**Capture (nightly batch):**

```
For each LP with at least 3 calendar interactions:
  Find last 3 meetings (calendar events with LP firm domain attendees)

  accept_latency_hrs = average of (accepted_at - invite_sent_at) for last 3
  prior_accept_latency_avg_hrs = average for all prior meetings

  reschedule_count_last_3_meetings = count of meetings where rescheduled = true

  duration_ratio = last_meeting_actual_duration / last_meeting_booked_duration
  (if actual duration unavailable, use booked — partial signal beats no signal)

  friction_trend = "worsening" if any of:
    accept_latency > prior_avg * 1.5
    OR reschedules >= 2
    OR duration_ratio < 0.6
  else: "stable" or "improving"
```

**Action fired:** worsening trend contributes to amber flag (combined cooling rule). LP card display.

**Where it appears in the UI:**
- LP Card — *"Last 3 meetings: average accept time 4 days (was 18 hours). 2 reschedules."*
- Pipeline list — implicit (contributes to flag)

### Signal 8 — CC expansion

**What it detects:** new people from the LP's firm appearing on email threads. *"Their CIO just got CC'd. That's significant."*

**Why surfaced:** this is the clearest *positive* signal in the framework — internal LP movement toward commitment. New senior people on threads predicts close proximity. GPs intuitively know this matters; surfacing it at scale is high-value because individual GP team members may not notice if the new person was added to a thread their colleague handles.

**Capture (nightly batch):**

```
For each LP firm:
  Find email threads from last 14 days where LP firm domain is on TO or CC
  Extract all unique email addresses on the LP firm's domain across these threads
  Compare to baseline (all email addresses from this firm seen in prior threads, ever)

  new_contacts_last_14d = set difference

  If non-empty:
    lp_state.cc_expansion = true
    lp_state.new_contacts = list of new email addresses
```

**Action fired:** triggers a prompt to update the LP profile (per the Manual Update Principle in the design guide, GPs don't edit fields directly — they confirm via the AI input). Contributes to the close-proximity override (silence flag suppressed if CC expansion has occurred in last 14 days).

**Where it appears in the UI:**
- LP Card — *"New contact detected: jordan.reyes@paamco-prisma.com appeared on threads in the last 5 days. Add to LP profile?"*
- Pipeline filter — "Close proximity detected" (driven by CC expansion in V1; will incorporate document engagement and meeting composition in V2)
- Component input to the close_proximity combined flag (captured but not surfaced — see §8.5)

### Signal 9 — One-way contact

**What it detects:** the most recent interaction with this LP was a GP-initiated email that received no reply. The GP thinks they are staying in touch. They are not. They are sending into a void.

**Why surfaced:** this is a different diagnostic from silence decay, and the distinction matters in practice. An LP can be within their silence threshold — showing green — while every recent interaction has been one-way. Days since last meaningful touch does not catch this, because a meaningful touch requires a two-way exchange by definition. An LP whose last five interactions are all unanswered GP emails is quietly failing but nothing in the silence signal surfaces it, because the silence clock only starts ticking from the last meaningful touch — which may be months ago and already past threshold, or may be recent if a meeting occurred. One-way contact is the signal that makes the GP's intuitive question "have I just been talking at this LP" answerable.

This signal was explicitly promised in the First 14 Days document as a named pipeline query: *"Everyone where the last contact was one-way."* It is the simplest fat middle diagnostic in the system — more immediately legible to a first-time user than the G/A/R flag because it requires no interpretation.

**Capture (nightly batch):**

```
For each LP:
  Find the most recent lp_interaction of any type

  If that interaction is:
    interaction_type = email_outbound (GP-initiated)
    AND no email_inbound from this LP within 14 days after it

  Then:
    lp_state.last_contact_was_one_way = true
  Else:
    lp_state.last_contact_was_one_way = false

Note: the 14-day window is intentional. A GP who sent an email
yesterday and hasn't heard back yet should not be flagged one-way.
The window catches genuine non-response, not normal reply latency.
```

**Relationship to days_since_meaningful_touch:** these are complementary, not overlapping. Silence decay measures how long since the last two-way connection. One-way contact measures the direction of the most recent interaction regardless of timing. An LP can be:

- Within silence threshold AND last contact was one-way → green flag but one-way filter catches them
- Past silence threshold AND last contact was two-way → amber/red flag, one-way filter does not catch them
- Past silence threshold AND last contact was one-way → both signals fire

The GP needs both to understand the full picture of a relationship.

**Action fired:** no flag change on its own. Contributes as one input to the combined cooling rule (amber flag, multiple cooling signals). Primary value is as a named pipeline filter — a GP who sees 14 of their 40 active LPs in the one-way filter understands the problem immediately and without explanation.

**Where it appears in the UI:**
- Pipeline filter — **"One-Way"** named filter: *"Last contact was from us with no reply. These LPs haven't responded to your most recent outreach."*
- LP Card — *"Last contact was one-way: your email on 14 Mar has not received a reply (12 days)."*
- Pipeline list — implicit (contributes to cooling combination but no separate badge — the named filter is the primary surface)
- Day 1 Gap output — one-way LPs surfaced as a named cohort alongside stale-contact LPs, since they represent a distinct failure mode

**Engineering note:** `last_contact_was_one_way` is a boolean field on `lp_state`. One additional step in the nightly batch job after interaction metrics are computed. No ML, no NLP, no additional schema tables required. The 14-day window is a configurable constant.

## 8.4 Captured attributes — fields that make signals queryable

In addition to the eight behavioural signals computed from email and calendar metadata, V1 captures three GP-confirmed attributes that don't compute themselves but make the signals usable in the way experienced fundraisers actually work. These are not behavioural signals — they are facts the GP confirms once and updates as conditions change. Without them, the framework's named "single most valuable query" is unanswerable, the highest-probability close cohort cannot be filtered, and the practitioner's second-most-used filter is missing context.

Including these attributes is the difference between a working product and a product that runs the queries senior fundraisers actually run on Monday mornings.

### Mandate fit

**What it is:** the GP's confirmed assessment of whether this LP's investment mandate matches the fund's strategy. Four values: `confirmed_fit` / `potential_fit` / `mandate_mismatch` / `unknown`. Default is `unknown` until the GP has had a substantive conversation about strategy alignment.

**Why captured:** Framework v4.1 Appendix A3 names *the single most valuable query in the system*: **"Tier 1 LPs + confirmed mandate fit + no meaningful contact in 14+ days + not in active diligence or later."** This is described as *"the list that turns into closed commitments if acted on, and missed closes if not. Unanswerable in any existing CRM."* Without mandate_fit captured as a first-class field, this query cannot be answered. It is the demo moment that proves TOMO is genuinely different from a CRM.

There's a deeper reason this matters. An LP can be Tier 1, replying actively, in active_diligence stage — and still be a waste of GP time if their mandate doesn't fit. Without mandate_fit, the GP has no way to filter their pipeline to "the LPs who are actually addressable for this fund." The signal layer surfaces *who is moving*; mandate fit qualifies *who is worth moving toward*.

**Capture mechanism:** the post-meeting capture prompt in the Action Drawer (per Non-Negotiable F8) surfaces mandate_fit as a one-click chip selection after the GP logs a meeting where strategy was discussed. The GP picks one of the four values; the field updates on `lp_contacts.mandate_fit`. No form. No separate CRM entry task.

**Where it appears in the UI:**
- Pipeline filter — "Confirmed mandate fit" as a saved-list filter chip on the Relationships page
- LP Card — Mandate row in the context strip: *"Mandate fit: confirmed · captured 12 Mar after Q1 strategy call"*
- Pipeline filter combined — drives the framework's named query: "Tier 1 + confirmed mandate fit + drifting + not in diligence"
- Daily Brief — when an LP with confirmed mandate fit crosses an amber silence threshold, that combination earns higher priority than a generic amber

### Prior fund investor

**What it is:** boolean flag plus prior fund identifier indicating whether this LP invested in any of the GP's prior funds. Captured at LP onboarding when the GP imports their existing LP base.

**Why captured:** Framework v4.1 Appendix A2 is unambiguous: *"Prior-cycle LPs are the highest-probability closes in any new raise. An LP who invested in your last fund already passed due diligence. Re-up conversations are shorter, warmer, and more likely to convert. They should be worked first in any raise."* Appendix A4 names a top-10 natural-language query: *"All existing investors from Fund II not yet contacted about Fund III."*

This is the cohort that converts fastest in any new raise. Without flagging them as prior_fund_investor, they sit in the same undifferentiated pipeline as cold prospects, and the GP loses the highest-leverage early-raise filter. Building the V1 pipeline view without this flag would mean every Founding Circle GP has to maintain a separate spreadsheet for re-ups — which is the exact CRM-hygiene problem TOMO exists to solve.

**Capture mechanism:** during onboarding CSV import, the GP tags LPs who invested in prior funds. After onboarding, captured via the post-meeting prompt or directly in the LP profile when a new LP is added.

**Where it appears in the UI:**
- Pipeline filter — "Re-ups · Fund II" as a named saved list (and similar filter chips per prior fund)
- LP Card — small attribute badge in the header strip next to tier: *"Prior: Fund II"*
- Pipeline list — small re-up indicator dot on LP cards (subtle, not flag-coloured)
- Day 1 Gap output — re-up LPs with no recent meaningful touch are surfaced as a separate cohort within the gap number, since their priority is materially higher than non-re-up LPs

### Days in prior stage (derived)

**What it is:** automatically computed from the stage transition history. For each LP, the time spent in the *previous* pipeline stage before the current one.

**Why captured:** described in detail under Signal 6 (stage_stagnation) above. Framework v4.1 Appendix A3 ranks "pipeline stage + days in prior stage" as the second-most-used filter practitioners apply weekly. The framework's named query *"stuck between deck sent and met for 30+ days"* is a query about *days in prior stage*, not current stage.

**Capture mechanism:** purely derived. `lp_stage_transitions` table already captures `transitioned_at` and `to_stage`. Engineering note: this is a window function over that table — no schema change required.

**Where it appears in the UI:** see Signal 6 (stage_stagnation) §8.3.

## 8.5 Two combined signals — captured in V1, surfaced in V2

These are higher-order combined patterns. Their components (silence, reply length, reply initiation, CC expansion) are all surfaced individually in V1 — but the *combined named flag* is held until 90+ days of operational data validates that the pattern reliably predicts outcomes.

Capturing these patterns in V1 is not just V2 forward-compatibility. It is a strategic dataset investment, and arguably TOMO's most important long-term moat. Per Framework v4.1 Section 1: *"After 18 months and 30-40 verified closes, TOMO has a proprietary dataset of which behavioral signals preceded commitments at what lead time. No competitor is building this. It is TOMO's long-term moat."*

The framework's tertiary V1 goal (Section 2) is explicit: *"V1 captures behavioral data in Supabase from day one, including signals not yet surfaced. After 30-40 closes, that dataset reveals which signals fired first, at what threshold, and how many days before close. That is the empirical foundation for a data-validated momentum score in V3."*

This means: every component captured in V1 — even those not displayed yet — is dataset for the eventual data-validated momentum score in V3, and dataset for the "this signal fired 47 days before close" claims that no competitor in the category can make. Affinity and Backstop's analytics will only ever be as good as their clients' CRM hygiene. TOMO's analytics improve as behavioral data accumulates regardless of IR team behavior. The V1 capture choices below are the foundation of that compounding advantage.

### warm_ghost_flag

Combination of: zero LP-initiated in last 5 exchanges + reply length declining trend + no questions in last 3 LP replies. Writes to `lp_state.warm_ghost_flag`. V1 use: contributes one weight to flag-cooling combination. V2 use: surfaces as a named flag on the LP card; triggers the Three-Touch Sequence prompt.

### close_proximity_flag

Combination of: CC expansion in last 14 days + (V2) sub agreement document accessed in last 14 days + (V2) CIO or legal counsel attendee at last meeting. Writes to `lp_state.close_proximity_flag`. V1 use: silence override (LP shows green even if past silence threshold). V2 use: surfaces as a named "Close-proximity" flag on LP card.

## 8.6 Stage threshold matrix — single source of truth

Used by Signal 1 (silence). Captured at LP creation by setting the pipeline stage. Engineering captures one field; GPs maintain one field.

| Stage | Amber threshold | Red threshold |
|---|---|---|
| sourced | 60 days | 90 days |
| first_meeting | 21 days | 35 days |
| second_meeting | 14 days | 28 days |
| active_diligence | 10 days | 21 days |
| soft_commit | 21 days | 35 days |
| committed | 21 days | 35 days |
| closed_lost | not applicable | not applicable |
| on_hold | 90 days | not applicable — LP told you to expect silence |

These are TOMO global defaults, stored in `stage_cadence_benchmarks` table. Per-client override is supported in V2 once 90 days of operational data justifies recalibration.

## 8.7 Pipeline flag computation — locked algorithm

The pipeline flag is the primary product surface. Single algorithm, evaluated in order, first match wins.

```
RED — evaluated first

  IF re_engagement_flag = true (set in last 24h, not yet cleared):
    flag = red
    reason = "LP reached out after silence"

  ELIF days_since_meaningful_touch > red_threshold(stage)
       AND (reply_velocity_trend = "decelerating"
            OR calendar_friction_trend = "worsening"
            OR (reply_length_trend = "decelerating" AND length_drop > 50%)
            OR reply_initiation_ratio = 0):
    flag = red
    reason = "Silent and cooling"

  ELIF stage IN (soft_commit, committed)
       AND days_since_meaningful_touch > 30:
    flag = red
    reason = "Soft commit gone silent"

AMBER — evaluated second

  ELIF days_since_meaningful_touch > amber_threshold(stage):
    flag = amber
    reason = "Silence threshold breached"

  ELIF count_of_active_cooling_signals >= 2:
    # cooling signals = reply_velocity_trend == "decelerating"
    #                   OR reply_initiation_ratio == 0
    #                   OR calendar_friction_trend == "worsening"
    #                   OR reply_length_trend == "decelerating" with > 50% drop
    flag = amber
    reason = "Multiple cooling signals"

  ELIF stage_stagnation_flag = red:
    flag = amber
    reason = "Stuck in stage"

  ELIF stage IN warm_stages
       AND no directional signal of any direction in lp_signal_log in last 30 days:
    # "directional signal" = a signal observation indicating
    #   acceleration OR deceleration OR LP-initiated event OR
    #   close-proximity event (CC expansion, etc.)
    # Explicitly NOT a directional signal:
    #   - flat / stable trend observations
    #   - daily silence_decay green-state checkpoints
    #   - any nightly observation that did not change state
    flag = amber
    reason = "Fat middle: no movement either way"

GREEN — default state

  ELSE: flag = green

OVERRIDE — applied last
  IF any positive directional signal in last 14 days:
    # positive signals = reply_velocity_trend == "accelerating"
    #                    OR reply_initiation_ratio > 0.4
    #                    OR cc_expansion = true
    #                    OR active scheduling thread in progress
    flag = green
    reason = "Active engagement detected"
```

The override at the end is the close-proximity principle generalised. Any positive directional signal in the last 14 days suppresses cooling/silence flags. This is what stops TOMO from flagging an LP cooling when they're actually moving forward in a different way.

## 8.8 UI surfaces summary

Quick reference for engineering on where each V1 signal renders.

| Signal | Pipeline list | LP Card | Action Drawer | Daily Brief | Pipeline filter |
|---|---|---|---|---|---|
| 1. silence | G/A/R flag | "No meaningful contact in N days" | Re-engagement draft at amber/red | Top items in "needs attention" | "Drifting" |
| 2. re_engagement | red+URGENT override | "Reached out after N days of silence" | Same-day urgent draft | Top items in "needs attention" | "Re-engaged" |
| 3. reply_velocity | velocity arrow icon | "Reply time has slowed: last X, typical Y" | (combined contributor) | Intelligence line on Today | – |
| 4. reply_length | (contributes to flag) | "Replies dropped from X to Y words" | (combined contributor) | – | – |
| 5. reply_initiation | (contributes to flag) | "Has initiated N of last 5 exchanges" | (combined contributor) | – | – |
| 6. stage_stagnation | "stuck Nd" badge | "In stage X for N days. Spent M in prior stage." | – | – | "Stuck in stage" / "Slow to advance from [stage]" |
| 7. calendar_friction | (contributes to flag) | "Last 3 meetings: details" | – | – | – |
| 8. cc_expansion | (drives override) | "New contact detected: name@firm" | Update profile prompt | – | "Close proximity" |
| 9. one_way_contact | (contributes to cooling) | "Last contact was one-way: your email on [date] has not received a reply ([N] days)." | – | – | "One-Way" |
| warm_ghost (capture) | – | – | – | – | – |
| close_proximity (capture) | (silence override) | – | – | – | – |

Captured attributes (not behavioural signals — GP-confirmed facts that make signals queryable):

| Attribute | Pipeline list | LP Card | Action Drawer | Daily Brief | Pipeline filter |
|---|---|---|---|---|---|
| mandate_fit | – | "Mandate fit: confirmed · captured 12 Mar" | Post-meeting capture chip | Higher priority weighting on confirmed-fit LPs | "Confirmed mandate fit" + combined query "T1 + confirmed fit + drifting" |
| prior_fund_investor | small re-up indicator | "Prior: Fund II" badge in header | – | Day 1 Gap surfaces re-ups separately | "Re-ups · Fund II" saved list |
| days_in_prior_stage | – | derived in stage_stagnation row | – | – | "Slow to advance from [stage]" |

## 8.9 Engineering clarifications to resolve before SRS lock

Eight items that need confirmation before signal implementation begins. Recommended answers given for each.

**1. Pipeline stage capture mechanism.** Confirm stage is captured at LP creation (with `sourced` as default) and updateable via post-meeting capture (the F8 prompt). When stage changes, a row writes to `lp_stage_transitions` with timestamp — this table is mandatory and cannot be retrofitted.

**2. Re-engagement webhook latency.** Confirm Nylas (or chosen sync provider) webhook delivery SLA is under 1 hour. If not, scope a supplemental polling job specifically for re-engagement detection — runs every 30 minutes against `last_inbound` timestamps where `last_outbound > 45 days ago`.

**3. "Truly LP-initiated" definition.** Confirm strict version: LP sends with no preceding GP outbound to this LP within 14 days. The loose version (any inbound counts) produces false negatives on warm-ghost detection.

**4. Stage threshold values.** Confirm V1 starting values per §8.6 table. Document in help article so GPs can sense-check; recalibrate per-client after Founding Circle Month 1 once operational data is available.

**5. Reply velocity baseline suppression.** Confirm `reply_velocity_trend` is suppressed (not written to lp_signal_log) until the LP has ≥ 5 prior exchanges, and `reply_length_trend` is suppressed until ≥ 3 prior replies. Below these thresholds, the trends are noise rather than signal.

**6. mandate_fit capture flow.** Confirm mandate_fit is surfaced as a one-click chip selection in the post-meeting capture prompt (per F8), not as a separate CRM form. Default to `unknown`; updateable via the AI input chat per the Manual Update Principle. The "Confirmed mandate fit + Tier 1 + drifting" combined filter must be a saved-list option on the Relationships page from day one — this is the framework's named "single most valuable query" and its V1 absence would be material.

**7. prior_fund_investor capture at onboarding.** Confirm onboarding CSV import flow includes a column or post-import tagging step for prior-fund LPs. Each prior fund needs an identifier (Fund I, Fund II, etc.) so the saved-list filter can be fund-specific. Re-up LPs with no recent meaningful touch must be surfaceable as a separate cohort within the Day 1 Gap output, not lumped with cold prospects.

**8. "No directional signal in 30 days" definition for fat middle.** Confirm: a *directional* signal is one indicating acceleration, deceleration, LP-initiated event, or close-proximity event. Flat or stable trend observations and nightly silence_decay green-state checkpoints do NOT count as directional signals. Without this clarification, the fat_middle rule never fires (every LP with at least 5 prior exchanges has a flat-trend observation in the last 30 days, which would suppress the rule).

**9. Reply length word count — defensive computation required.** Email body stripping for reply length (Signal 4) is harder to implement reliably than it appears. Signatures are not standardised. Quote-blocks from different mail clients are formatted differently. A reply that is 31 words in reality may compute as 247 words if the previous thread was fully quoted back into the body. Implement a confidence flag on the word count computation: if the extracted reply body is more than 3x the estimated reply length based on the email's position in the thread (i.e. it is clearly contaminated by quoted content), suppress the word count observation for that exchange rather than computing on dirty data. A suppressed observation is preferable to a misleading one. Document this rule explicitly in the engineering implementation so the suppression behaviour is traceable when debugging signal accuracy.

---

## Note on scope

This section is signals-only by design. The following downstream consumers of the signals layer are specified separately in the Production Spec:

- **Metrics** (M1-M9) that consume signals to produce the Insights page — follow-up compliance, draft approval rate, scheduling efficiency, time recovered, Day 1 Gap, Moveability count, Prioritised Close List.
- **Reminders** (R1-R3) that fire alongside signals — open loops, missed replies, commitments.
- **Computation infrastructure** (nightly batch sequence, event-driven handlers, refresh cadences) — specified at engineering implementation level in Appendix D.

If a question arises about a metric or reminder while implementing this signals layer, refer to the Production Spec rather than extending this section.

---

## 8.10 V2 and V3 trajectory — what's coming, and what V1 captures must support

This subsection is intentionally short. It exists for two reasons. Ken needs to know which V1 capture decisions are forward-compatible with V2 and V3 — without that view, V1 architectural choices may paint us into a corner. And when a Founding Circle GP asks "what comes after V1," there needs to be a clear answer that holds up.

The principle: V2 and V3 do not introduce new behavioural categories. They unlock signals that either require an integration we have not yet built (V2), or require empirical validation against real close outcomes (V3). Every V2 and V3 signal below has a V1 capture obligation noted alongside it.

**V2 — Integration layer. Target Q4 2026.** Unlocked when V1 has approximately 90 days of operational data and the named integrations are in scope.

- **Document engagement** — DocSend or DealRoom integration. Captures opens, page dwell, return visits, specific pages viewed. Multiple opens within 48 hours fires an internal-sharing flag. Sub agreement access within 14 days contributes to close_proximity. V1 capture obligation: schema for `lp_document_engagement` table created in V1 migration even though it is not populated until V2.

- **Meeting composition shift** — light role detection on email signatures and calendar attendees. CIO or legal counsel joining a meeting fires close_proximity and prompts an IC-specific meeting prep brief. V1 capture obligation: meeting attendee email addresses logged with full domain context so role detection is possible retroactively.

- **Newsletter engagement** — Mailchimp or HubSpot integration. Captures opens, clicks, forwards on LP-targeted newsletter sends. Three or more opens by an LP who has not replied to direct outreach in 60+ days fires a partial silence-clock reset. V1 capture obligation: `lp_marketing_engagement` table schema defined in V1 migration. Empty until V2.

- **warm_ghost named flag (display)** — the combined pattern captured in V1 (zero LP-initiated + declining length + no questions in last 3) surfaces as a named flag on the LP card and triggers the Three-Touch Sequence prompt. Held until 90 days of V1 data validates the pattern reliably predicts outcomes.

- **close_proximity named flag (display)** — same logic. The V1-captured flag (currently used as silence override) surfaces as a named flag on the LP card.

- **CC expansion (display)** — the V1-captured signal moves from "behind the scenes" attribute prompt to a first-class display element on the LP card and a named filter.

- **IR aggregate dashboard** — three-view dashboard for the GP per Framework v4.1 Section 7. Ships when 90 days of operational data makes aggregate metrics trustworthy.

**V3 — Intelligence layer. Target 2027.** Unlocked when 30-40 verified closes provide the empirical foundation for data-validated weights.

- **Question type (NLP)** — classifies LP questions as exploratory (strategy, thesis, team) versus structural (terms, lock-up, DDQ, minimums). A shift from exploratory to structural fires close_proximity and prompts a terms prep brief. V1 capture obligation: full email body retained in `lp_interactions` so the classifier can run retroactively against the dataset.

- **Commitment language (NLP)** — classifies LP language as conditional ("would consider," "interesting") versus active ("planning to commit," "want to get to IC"). Language shift to active fires highest-priority flag with immediate action prompt. Same V1 capture obligation as above.

- **Objection recurrence** — tracks recurring objections across notes and emails without logged resolution. Surfaces as flag prompting GP to address the objection in next outreach. V1 capture obligation: meeting notes and email bodies retained in queryable form.

- **Composite momentum score** — single number on LP card derived empirically from close data. Weights validated against actual outcomes from 30-40 verified closes — not theoretically assigned. Always shown with plain-English explanation of the signals driving it. Never on pipeline list (only on LP card) to prevent over-reliance on a single number for pipeline-level decisions. V1 capture obligation: every signal observation written to `lp_signal_log` so the dataset accumulates from day one.

The shape of the trajectory is deliberate. V1 ships nine observable behavioural signals from email and calendar metadata. V2 expands the data sources (document, calendar composition, marketing) and turns on the V1-captured combined patterns once data validates them. V3 adds the language layer and the data-validated composite score that no competitor can claim because no competitor is building the dataset.

The single biggest forward-compatibility risk to flag for Ken: every V1 capture decision must assume the signal observation will eventually be needed for V3 model training. This means `lp_signal_log` must retain full raw observations, not just current-state aggregates. A signal observation that gets overwritten nightly is dataset that doesn't exist at V3 unlock time. **Append-only, never overwrite, never truncate.**

---

End of Section 8.
