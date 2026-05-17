# TOMO V1 — Amendments to Today, Radar Modal, and Insights

**Document purpose.** Briefing document for Ken (and reference for the design team) covering a coordinated set of changes to three surfaces — the Today card "Where the raise stands," the Radar Modal "On my radar," and the Insights page. The changes are mostly consolidation and re-labelling, not new functionality.

**Companion to the in-progress SRS revision.** This document does not cover the Briefings dangling reference, the off-channel signal suppression rule, the new onboarding schema fields, or the CRM reconcile flow. Those remain open from the earlier audit and should land in the same SRS revision cycle, but they're tracked separately. See "Outstanding from earlier audit" at the end.

---

## Part 1 — How the signals and surfaces work today (plain English)

This section is reference material for anyone reading the SRS without the schema background. It explains every named concept in the daily-use surfaces, what it computes, and why it's useful for a GP.

### The three foundational concepts

**Health dot.** Every active LP carries a traffic light — green, amber, or red — recomputed each night. The dot summarises the relationship state in one glance. Green = relationship looks fine. Amber = something has slipped, usually silence creeping past comfortable cadence or a stage running longer than typical. Red = a serious threshold has been crossed, either negatively (long silence past the red line, stage stagnation beyond benchmark) or positively (the LP just re-engaged after extended quiet — a re-engagement event briefly forces the dot to red so the GP sees it immediately).

The dot is the single most important piece of derived information in the system. Almost every metric uses it.

**Moveable.** A stricter test than the health dot. To pass, four things must be true at once: the LP is in the middle of the pipeline (first meeting, nurturing, diligence, or soft commit), their dot is green or amber (red is explicitly excluded), there's evidence of warming in the last 30 days (faster replies, longer replies, them initiating contact, easy meeting acceptance), and the conversation hasn't gone too quiet. Pass all four and they're moveable. Fail one and they aren't.

Why useful: it answers the only operational question that matters on Monday morning — "who can I actually push forward this week?"

**Active.** Anyone still in the working book — pipeline stage not yet `pass`, `closed_lost`, or `committed`. Already-won LPs are excluded so they don't pad the working counts. This is the cohort all the daily-use surfaces sum over.

### Today card — "Where the raise stands"

Four counts over your active LPs, summing to your total active book. Sits on the daily landing surface under "Coming up."

**Drifting — act.** LPs whose dot is red. Something has crossed a serious threshold and needs attention today. Includes both genuinely drifting LPs and re-engaging ones (because red catches both states) — in both cases the response window is short.

**Cooling — watch.** Amber LPs who are *not* moveable. Health is slipping but no warming evidence yet. Watch them; don't intervene yet.

**Genuinely moveable.** LPs who pass the four-part moveable test. The ones you can advance this week.

**Healthy — on track.** Green LPs who are *not* moveable. Fine but inert. No action needed.

Why useful: the card is the five-second orientation — "how is my raise looking right now" before deciding where to dig.

### Radar Modal — "On my radar"

Auto-opens once per day on first load of Today, and the same content delivers via email and Slack at the configured time. Currently seven sections.

**Returning to you.** Items resurfacing from snooze or deferral. "You parked this — it's back."

**Your commitments approaching.** Things *you* promised — drafts to send, intros to make, decks to share. Pulled from outbound email patterns and meeting recap action items.

**Outstanding from your LPs.** Things they owe you — questions you asked that they haven't answered, materials they said they'd send.

**Heating up.** LPs whose signals point positive in the last 30 days — reply velocity rising, replies getting longer, them initiating contact.

**Cooling off.** Mirror image — LPs whose signals point negative.

**Quiet beyond cadence.** LPs you haven't had a meaningful touch with past the threshold for their stage. Silence as evidence.

**Next 7 days at a glance.** Calendar + commitments looking forward — meetings this week, things coming due.

Why useful: the Modal is for *understanding what changed* — narrative content explaining the numbers, with evidence-rich rows and optional CTAs into drafts and Action Drawer items.

### Insights page

Where the numbers live in full. Currently organised as two halves.

**Top half — Where your raise stands.** *Capital vs Target* (committed dollars against target). *Day 1 Gap* (count of LPs flagged at onboarding, with 30-day sparkline showing progress). *Moveability count* (same as the Today card's Genuinely moveable, with breakdown by re-ups and active diligence). *Concentration alert* (fires if one LP exceeds 20% of remaining target).

**Bottom half — What TOMO has done.** *Time Recovered* (hours saved via drafts, scheduling, follow-ups, meeting prep). *Execution Health* (three habit scores against pre-TOMO baselines). *Lists Intelligence* (Direction summary + mandate qualifier, plus the Fat Middle gauge with Three-Touch CTA). *Raise Momentum* (pipeline velocity + sparkline; Cooling caught — LPs pulled back from red — with trace line). *60-Day Close List* (top 7 LPs from the Moveable cohort, ranked by close-probability score).

Why useful: Insights answers "how am I doing, in numbers" — for weekly review, not daily glance.

### Where the surfaces overlap (and what each one's job actually is)

The same LP can appear in multiple places. The risk is that GPs see the same numbers in three surfaces and start to doubt which is canonical. The clarification is to be explicit about the *job* each surface does:

- **Today card** answers "How's the raise?" (counts, glance).
- **Radar Modal** answers "What changed?" (narrative, evidence, action).
- **Insights** answers "How am I doing?" (review, trajectory, focus list).

A moveable LP shows up as a count on Today, as a name in Heating up on the Radar Modal, as part of the Moveability number on Insights, and possibly on the 60-Day Close List. Each surface re-renders the same underlying fact through a different lens. That's the design, not a bug — but the labels and surfaces need to be clean enough that GPs don't get lost in the overlap.

---

## Part 2 — What needs to change and why

Three categories of issue with the current SRS and mock, in order of impact.

### Issue 1 — Vocabulary collisions and product-speak labels

**"Cooling" is used three times.** "Cooling off" (Radar Modal section), "Cooling — watch" (Today bucket), and "Cooling caught" (Insights metric) all use the same root word for related-but-distinct things. A GP can't keep them straight in conversation.

**"Quiet beyond cadence"** (Radar Modal section) is product documentation language. No GP would describe an LP that way. The plain-English version is "gone quiet."

**"Genuinely moveable"** (Today card, Insights) is defensive — the "genuinely" qualifier hints at an alternative that doesn't exist. The cleaner label is "Moveable."

**"60-Day Close List"** promises a time-to-close prediction the formula doesn't compute. The ranking is a composite of stage weight, intent weight, signal weight, and silence penalty — none of which is a time-to-close model. The label is aspirational rather than accurate.

### Issue 2 — The Radar Modal has too many sections

Seven sections is a lot for a daily-glance surface. Three of them — *Returning to you*, *Your commitments approaching*, and *Outstanding from your LPs* — are conceptually one category (things in flight between you and an LP). Consolidating them under a single "Commitments" header with three sub-labels preserves the resolution while reducing the cognitive load of the section count.

The other consolidation question — merging Heating up and Cooling off into a single "Direction" section — was considered and rejected. They read better as separate sections because they're emotionally different content (warming = good news, cooling = bad news) and GPs scan them differently. Keep them apart.

### Issue 3 — The Insights bottom half mixes three different things

The current "What TOMO has done" section title applies to half the content but not the other half. Time Recovered and Execution Health are genuinely about TOMO's actions. But Lists Intelligence (Direction + Fat Middle) and Raise Momentum (pipeline velocity + cooling caught) are about *the LPs' behaviour*, not TOMO's actions. The section title is wrong for half of what it contains.

There are really three concepts blurred together:

1. *What TOMO has done* — Time Recovered, Execution Health. Internal/receipts.
2. *Momentum* — Direction, pipeline velocity, focus list. External/LP behaviour and priority.
3. *Lists* like Fat Middle that are conceptually filter cohorts, not metrics per se.

Pulling these apart gives Insights a cleaner three-section structure and surfaces the directional content (the *Momentum* concept) properly.

### Issue 4 — Some V1 surfaces add weight without earning it

**Fat Middle gauge.** Conceptually a TOMO IP signature, but as a gauge it adds visual weight to Insights without giving GPs much they can't get from Cooling — watch on the Today card or Quiet beyond cadence in the Modal. The Three-Touch CTA next to it is the actually-useful part. Better as a named filter in Relationships than a gauge on Insights.

**Cooling caught surface (Saves).** A feel-good metric — "LPs pulled back from red" — useful for V1.5 storytelling and FC marketing, less useful for daily operations. Data capture is automatic (every flag transition is logged) so the metric can always be computed later. Surface defers.

**60-Day Close List cap of 7.** Arbitrary number. The discipline of a small focus list is real, but 7 is mildly tight and the label "60-Day" is misleading (the formula doesn't compute time-to-close). Better as "Focus list — top 10" with the list shrinking to match the moveable cohort when it's smaller than 10.

### Issue 5 — Click-through behaviour from Today card buckets isn't specified

Section §3.8 specifies a single "Insights →" CTA on the Where-the-raise-stands card but doesn't say what happens when a GP taps an individual bucket count. AC-3.6.7's Day 1 Gap click-through to Relationships is the precedent — same pattern should apply here. Currently silent in the SRS, which means engineering will guess.

---

## Part 3 — New structure and labelling

This is the proposed end state across all three surfaces, with click-through behaviour specified.

### Today card — "Where the raise stands"

Four buckets, three labels unchanged from current SRS, one rename.

| Bucket | Definition | Click goes to |
|---|---|---|
| Drifting — act | Active LPs with red dot | Relationships filtered to red active LPs |
| Stalling — watch | Active LPs with amber dot, not moveable | Relationships filtered to amber active LPs minus moveable |
| Moveable | Active LPs passing the four-part moveable test | Relationships filtered to the moveable predicate |
| Healthy — on track | Active LPs with green dot, not moveable | Relationships filtered to green active LPs minus moveable |

**Below the four buckets**, a one-line teaser to the Focus list:

> *Focus list — top 10 to prioritise this week →*

Click goes to Relationships filtered to those 10 LPs, sorted by close-probability score, with rank visible as a numbered prefix (1, 2, 3...) in the LP name column.

The headline "Insights →" CTA at the top of the card stays unchanged.

**Changes from current SRS:**
- "Cooling — watch" renamed to **"Stalling — watch"** (eliminates the cooling collision with the Modal).
- "Genuinely moveable" renamed to **"Moveable"** (drops the defensive "genuinely").
- Click-through behaviour for each bucket now specified (was silent).
- New one-line Focus list teaser below the buckets.

### Radar Modal — "On my radar"

Five sections instead of seven. Three current sections consolidate into one "Commitments" header with three sub-labels preserved.

| Section | Default state | Sub-labels (if any) | Content |
|---|---|---|---|
| 1. Commitments | Expanded | Your commitments / Their commitments / Coming due | Things in flight between you and LPs — what you promised, what they promised, what's due this week |
| 2. Heating up | Expanded | — | LPs with directional warming signals in last 30 days |
| 3. Cooling off | Collapsed | — | LPs with directional cooling signals in last 30 days |
| 4. Gone quiet | Collapsed | — | LPs past silence threshold for their stage |
| 5. Next 7 days at a glance | Expanded | — | Calendar + commitments lookahead |

**Changes from current SRS:**
- Sections *Returning to you*, *Your commitments approaching*, and *Outstanding from your LPs* consolidate into **"Commitments"** with three sub-labels.
- *Quiet beyond cadence* renamed to **"Gone quiet"** (plain English).
- *Heating up* and *Cooling off* unchanged.
- *Next 7 days at a glance* unchanged.
- Section count: 7 → 5.

### Insights page

Three sections instead of two halves. The middle section ("Momentum") splits out the LP-behaviour content that was muddling the bottom half.

**Section 1 — Where your raise stands** *(snapshot)*

- Capital vs Target hero bar
- Day 1 Gap (with 30-day sparkline)
- Moveable count (with re-up and active diligence breakdown)
- Concentration alert (optional banner)

**Section 2 — Momentum** *(LP behaviour and priority)*

- Direction summary + mandate-fit qualifier
- Pipeline velocity + 8-week sparkline
- Focus list — top 10 (was 60-Day Close List)

**Section 3 — What TOMO has done** *(receipts)*

- Time Recovered (hours saved, rolling 7d / 30d / cumulative)
- Execution Health (three habit scores: follow-up compliance, draft approval, scheduling efficiency)

**Changes from current SRS:**
- Two-half structure becomes three sections.
- *Lists Intelligence* and *Raise Momentum* dissolved; their contents redistributed (Direction → Momentum, pipeline velocity → Momentum, Fat Middle → Relationships filter, Cooling caught → V1.5).
- *60-Day Close List* renamed to **"Focus list"**, cap raised from 7 to 10 with shrink-to-cohort rule, moved into Momentum.
- *Fat Middle gauge* removed from Insights; reappears as a **named filter in Relationships**.
- *Cooling caught* surface deferred to **V1.5** (data capture continues — only the rendered surface defers).

### Click-through behaviour summary

A consolidated view of every click-through from Today and Insights into Relationships, for engineering reference:

| Surface | Click target | Relationships filter |
|---|---|---|
| Today — Drifting — act | bucket count | `pipeline_flag = 'red' AND active` |
| Today — Stalling — watch | bucket count | `pipeline_flag = 'amber' AND NOT moveable AND active` |
| Today — Moveable | bucket count | Moveable predicate |
| Today — Healthy — on track | bucket count | `pipeline_flag = 'green' AND NOT moveable AND active` |
| Today — Focus list teaser | one-line CTA | Top 10 of moveable cohort by close score, sorted by rank |
| Today — Insights → | headline link | `/insights` (Insights page wholesale) |
| Insights — Day 1 Gap | count | Existing AC-3.6.7 — Relationships filtered to gap cohort |
| Insights — Moveable count | count | Same as Today — Moveable |
| Insights — Focus list | row click | LP detail in Relationships |

The four Today filters need to exist as named filters or URL-addressable states in Relationships, alongside the (still-to-be-spec'd) CRM-out-of-sync filter. Worth flagging: Relationships needs a coherent filter-architecture pass, not ad-hoc one-off filters per source.

---

## Part 4 — Specific SRS amendments for Ken

Each change below is grouped by SRS section. Targeted enough that Ken can make most of them as find-and-replace operations.

### §3.8 — Today / Daily Brief

**Change 1.** In line 824 prose and BR-3.8.5 / AC-3.8.6, rename the four bucket labels:

| Current label | New label |
|---|---|
| Drifting — act | Drifting — act *(unchanged)* |
| Cooling — watch | **Stalling — watch** |
| Genuinely moveable | **Moveable** |
| Healthy — on track | Healthy — on track *(unchanged)* |

**Change 2.** Add a new AC to §3.8 specifying click-through behaviour from each bucket. Drop-in language:

> AC-3.8.8 — Each of the four bucket counts on the *Where the raise stands* card is independently tappable. Tapping a count opens Relationships pre-filtered to the corresponding cohort: *Drifting — act* → red active LPs; *Stalling — watch* → amber active LPs minus the moveable cohort; *Moveable* → the full moveable predicate; *Healthy — on track* → green active LPs minus the moveable cohort. Each filter must be a named or URL-addressable state in Relationships.

**Change 3.** Add a Focus list teaser to the Today card. Drop-in language for the §3.8 prose:

> Below the four bucket counts, a single-line teaser surfaces the **Focus list** — the top 10 LPs from the moveable cohort ranked by close-probability score (per §3.6 Metric 10). Tapping the teaser opens Relationships filtered to those 10 LPs, sorted by rank, with the close-probability rank visible as a numbered prefix in the LP name column.

**Change 4.** Add a corresponding AC:

> AC-3.8.9 — The Focus list teaser on Today shows the count and label of the top 10 moveable LPs (or fewer if the moveable cohort is smaller than 10). Tapping the teaser navigates to Relationships filtered to that cohort, sorted by close-probability score descending, with rank visible per LP.

### §3.6 — Metrics engine and Insights page

**Change 5.** Restructure the *Insights page rendering* prose (currently lines 717-720) from two halves to three sections:

> **Insights page rendering** *(replacement prose)*
>
> - **Section 1 — Where your raise stands.** Capital vs Target hero bar; Day 1 Gap two-up left with 30-day sparkline; Moveable count two-up right with re-up and active-diligence breakdown; optional Concentration alert banner above the two-up.
> - **Section 2 — Momentum.** Direction summary with mandate-fit qualifier (Metric 7); Pipeline velocity with 8-week sparkline (Metric 9a); Focus list — top 10 ranked by close-probability score (Metric 10, renamed from 60-Day Close List).
> - **Section 3 — What TOMO has done.** Time Recovered hero block (Metric 5); Execution Health three-cell row (Metrics 6a / 6b / 6c).
>
> *(Lists Intelligence two-block and Raise Momentum two-block from the prior structure dissolve into Section 2; Fat Middle gauge moves to Relationships as a named filter — see §3.10 amendment; Cooling caught defers to V1.5 per §9.1.)*

**Change 6.** Rename Metric 10 throughout §3.6, Section 9, and user stories. Find-and-replace:

| Current | New |
|---|---|
| 60-Day Close List | Focus list |
| 60-Day Close | Focus |
| Top 7 of the Moveability cohort | Top 10 of the Moveable cohort (or fewer if cohort is smaller than 10) |

**Change 7.** Add a BR to §3.6 covering the Focus list cap and shrink rule:

> BR-3.6.10 — The Focus list (Metric 10) is capped at 10 LPs and shrinks to match the moveable cohort when the cohort is smaller than 10. When the moveable cohort is empty, the Focus list renders an empty state ("No LPs are in the moveable cohort yet — check back as signals develop") rather than zero items.

**Change 8.** Remove the Fat Middle gauge from §3.6 rendering prose. Add a corresponding addition to §3.10 (Relationships):

> Add to §3.10 — Named filters available on Relationships include: *Fat Middle* (warm-stage LPs with no directional signal in the last 30 days, per former §3.6 Lists Intelligence definition). The Three-Touch Qualification CTA on this filter remains the same.

**Change 9.** Add Cooling caught to §9.1 (deferred to V1.5):

> Add to §9.1 deferred list — *Cooling caught surface (formerly Insights Raise Momentum block).* The metric data is captured automatically via `lp_signal_log` flag-transition rows; the rendered surface defers to V1.5. The data dependency remains in V1 so the V1.5 surface can backfill.

### Appendix I — Radar Modal IA (v1)

**Change 10.** Rewrite section I.3 *Section taxonomy (order and defaults)* from seven sections to five:

> **I.3 Section taxonomy (order and defaults)**
>
> | § | Section title | Default UI state | Direction pill (optional) | Sub-labels |
> |---|---|---|---|---|
> | 1 | **Commitments** | Expanded | — | Your commitments / Their commitments / Coming due |
> | 2 | **Heating up** | Expanded | **Positive direction** | — |
> | 3 | **Cooling off** | **Collapsed** | **Negative direction** | — |
> | 4 | **Gone quiet** | **Collapsed** | — | — |
> | 5 | **Next 7 days at a glance** | Expanded | — | — |
>
> Sections with **zero** rows: render with prescribed empty-state copy **or** omit the section — engineering chooses one strategy per build, documented in release notes; QA verifies consistency.

**Change 11.** Update I.7 *Data sources (informative)* to reflect the consolidated structure:

> | Section | Primary sources (V1 target) |
> |---|---|
> | Commitments — Your commitments | `commitments`; extracted promises / open loops from outbound |
> | Commitments — Their commitments | Inbound obligations; SLA vs stated turnaround |
> | Commitments — Coming due | `commitments.due_at` within window; `reminders` snooze expiry |
> | Heating up / Cooling off | `lp_signal_log`; reply velocity; pipeline signals |
> | Gone quiet | Meaningful-touch cadence vs silence (§8) |
> | Next 7 days | Calendar + commitments window |

**Change 12.** Update the §3.8 prose references and user stories 8.4.1, 8.4.4 to use the new section names. Find-and-replace:

| Current term | New term |
|---|---|
| Quiet beyond cadence | Gone quiet |
| Returning to you | *(removed — now Commitments sub-label)* |
| Your commitments approaching | *(removed — now Commitments sub-label)* |
| Outstanding from your LPs | *(removed — now Commitments sub-label)* |

The narrative paragraph at the Modal header should reference "five sections" not "seven sections" if any current draft prose enumerates the count.

### Glossary (§4309 onwards)

**Change 13.** Add the disambiguation table:

> **Term disambiguation** — some terms in TOMO use related vocabulary; the table below clarifies which is which.
>
> | Term | What it means | Where it appears |
> |---|---|---|
> | Cooling off | LPs trending negative this week (directional signal) | Radar Modal section |
> | Stalling — watch | Amber LPs without warming signals | Today card bucket |
> | Gone quiet | LPs past silence threshold for their stage | Radar Modal section |
> | Moveable | LPs passing the four-part test for being advanceable now | Today card bucket + Insights metric |
> | Drifting — act | LPs whose dot is red (includes drift and re-engagement) | Today card bucket |
> | Focus list | Top 10 moveable LPs ranked by close probability | Insights metric + Today teaser |
> | Direction | Heating up vs cooling off in aggregate | Radar Modal + Insights metric |
> | Momentum | The trajectory of the raise as a whole | Insights section name |

### Estimated time for Ken to make these changes

- Changes 1-2 (Today card relabel + bucket click ACs): ~30 minutes.
- Changes 3-4 (Focus list teaser + AC): ~20 minutes.
- Changes 5-9 (Insights restructure + Focus list rename + Fat Middle move + Cooling caught defer): ~2 hours.
- Changes 10-12 (Radar Modal consolidation): ~2 hours.
- Change 13 (glossary disambiguation): ~30 minutes.

**Total: roughly half a day to a full day of focused work.**

The Radar Modal mock (`design/tomo_radar_modal_v1.html`) will need a v2 pass from design to reflect the five-section structure with Commitments sub-rails. That's not Ken's work but it's a downstream dependency.

---

## Outstanding from earlier audit (not covered in this document)

These remain open and should land in the same SRS revision cycle, but they're separate concerns:

1. **Briefings dangling reference.** §3.2 line 444 references "§3.6 / Briefings" but no Briefings subsection exists. Either spec the First-Read Briefing as a small subsection in §3.6 (recommended) or reframe screen 8 to not promise a full briefing later.
2. **Off-channel signal suppression rule (BR-3.5.X / BR-3.5.Y).** Signals §3.5 has no mechanism for GP-marked off-channel activity. Becomes more urgent with the Radar Modal architecture because "Cooling off" and "Gone quiet" sections will false-positive every LP the GP is calling. One new field on `lp_state` (`off_channel_active_until`) plus one BR.
3. **New onboarding schema fields.** Fund/raise/team fields captured in `users.onboarding_state_jsonb` but not promoted to first-class columns on `funds` and `workspace_members`. Need: `funds.strategy_type`, `funds.aum_total`, `funds.distinctive_description`, `funds.target_close_date`, `funds.aspirations_jsonb`, `workspace_members.role`.
4. **CRM reconcile flow.** Not in the SRS at all. Decide: V1 or V1.5? If V1, needs spec for the post-onboarding banner + per-LP comparison surface + CRM-out-of-sync filter chip on Relationships.
5. **Relationships filter architecture.** This document's click-through ACs assume the four Today bucket filters exist as named/URL-addressable states. Worth a coherent filter-architecture pass on Relationships rather than building one-off filters per source.

---

**End of amendments document.**
