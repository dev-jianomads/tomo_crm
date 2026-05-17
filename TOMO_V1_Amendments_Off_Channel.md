# TOMO V1 — Amendments for Off-Channel Signal Suppression

**Document purpose.** Companion to the daily-surfaces amendments document. Specifies the off-channel suppression rule for the signals engine — the only signals-side change recommended for V1.

**Why this matters.** TOMO's signals are built on email and calendar evidence. The silence-related signals (Signal 1 Silence, Signal 6 Stage stagnation, Signal 9 One-way contact) plus the cadence checks feeding the Radar Modal's *Gone quiet* and *Cooling off* sections all read absence-of-evidence as evidence-of-drift. When a GP is working an LP off-channel (phone calls, conference coffees, WhatsApp), TOMO has no way to know — and will surface those LPs as drifting / cooling / quiet anyway.

Without this rule, on day one of FC use a GP will see LPs they're actively calling flagged red, surfaced in *Cooling off*, and listed under *Gone quiet*. Trust in the signal engine collapses immediately. This is the most consequential signals-engine omission in V1.

**Engineering footprint.** One new field on `lp_state`, one new affordance on the LP record, three new BRs in §3.5, three new ACs. Roughly half a day of engineering work plus a small UI element in Relationships. The rule is mechanically simple — every silence-related signal checks a timestamp before firing.

---

## Part 1 — What the rule does, in plain English

Two halves: the user-facing affordance and the engine-side suppression.

**User-facing affordance.** On any LP record in Relationships, the GP can tap a chip labelled **"I'm in touch off-channel"**. This sets a 30-day suppression window on that LP. While the window is active, the LP record shows a small marker ("Off-channel until 14 Jun") and the chip toggles to "Update or extend." The GP can extend at any time, ending the window early if needed.

**Engine-side suppression.** During the nightly batch, the signals engine reads `lp_state.off_channel_active_until`. For every silence-related signal (Signals 1, 6, 9 and the cadence check for the Radar Modal *Gone quiet* section), if the timestamp is in the future, that signal does not fire and no `lp_signal_log` row is written for that signal type for that LP.

Directional signals — reply velocity, reply length, reply initiation, calendar friction — are *not* suppressed, because they're built on evidence of activity rather than absence. If the off-channel LP also happens to be active on email, the directional signals still fire normally.

**What is suppressed**:
- Signal 1 (Silence)
- Signal 6 (Stage stagnation)
- Signal 9 (One-way contact)
- The cadence check feeding the Radar Modal *Gone quiet* section
- Inclusion in the *Cooling off* section if the only basis would be a silence-derived state

**What is not suppressed**:
- Re-engagement (Signal 2) — an LP responding *is* meaningful evidence, even if the GP has been calling them.
- Reply velocity / length / initiation (Signals 3, 4, 5) — measure activity, not absence.
- Calendar friction (Signal 7) — measures behaviour around scheduled meetings.
- CC expansion (Signal 8) — structural change in the relationship.
- Stage transitions — explicit GP action, not derived from silence.

**Why 30 days.** Long enough to cover a normal phone-and-coffee cadence without constant re-marking. Short enough that if the GP forgets the LP entirely, signals come back online and surface them. Configurable in future if FC feedback suggests otherwise; hardcoded at 30 in V1.

---

## Part 2 — SRS amendments

Each change below is grouped by SRS section. Targeted enough that Ken can apply them as additions rather than restructures.

### §6.2 — Schema addition

**Change 1.** Add one field to `lp_state`:

> | Field | Type | Nullable | Default | Constraint | Notes |
> |---|---|---|---|---|---|
> | `off_channel_active_until` | timestamptz | null | | | Set by GP via "I'm in touch off-channel" affordance on LP record (§3.10). When in the future, silence-related signals (Signals 1, 6, 9 and the *Gone quiet* cadence check) skip this LP per BR-3.5.8. Configurable extension; rolling 30-day window per GP action. Audit trail in `lp_signal_log` with `signal_type='off_channel_marked'`.

Add corresponding `signal_type` enum value to the `lp_signal_log` `signal_type` check constraint (currently at line 2820): append `'off_channel_marked'` to the existing list.

### §3.5 — Signals engine

**Change 2.** Add three BRs after the existing BR-3.5.7:

> BR-3.5.8 — **Off-channel suppression.** Signals 1 (Silence), 6 (Stage stagnation), 9 (One-way contact), and the meaningful-touch cadence check feeding the Radar Modal *Gone quiet* section SHALL check `lp_state.off_channel_active_until` before firing. If the timestamp is in the future relative to the nightly batch run, no `lp_signal_log` row of those signal types is written for that LP on that run. The directional signals (3, 4, 5, 7, 8) and the re-engagement signal (2) are *not* suppressed.
>
> BR-3.5.9 — **Suppression window length.** When the GP marks an LP via the *"I'm in touch off-channel"* affordance on the LP record (§3.10), TOMO writes `lp_state.off_channel_active_until = now() + interval '30 days'`. The GP can extend (resets the 30-day window from the moment of extension) or clear (sets `off_channel_active_until = null`) at any time. Every set, extend, or clear writes an `lp_signal_log` row with `signal_type='off_channel_marked'` and metadata `{action, prior_until, new_until, gp_user_id}`.
>
> BR-3.5.10 — **Pipeline flag interaction.** When `off_channel_active_until` is in the future, the pipeline_flag computation in Section 8 §8.7 SHALL exclude silence-derived red and amber states for that LP. Positive-direction overrides (warming signals forcing green) and re-engagement events (forcing red+URGENT) remain in effect. The resulting `pipeline_flag_reason` includes `'off_channel_suppressed'` when suppression has prevented an otherwise-firing silence-derived state.

**Change 3.** Add corresponding ACs after the existing AC-3.5.7:

> AC-3.5.8 — An LP with `off_channel_active_until` set 10 days in the future and 70 days since last meaningful touch SHALL NOT have Signal 1 (Silence) or Signal 6 (Stage stagnation) rows written for the nightly batch; the LP SHALL NOT appear in the Radar Modal *Gone quiet* section.
>
> AC-3.5.9 — An LP with `off_channel_active_until` set 10 days in the future whose pipeline_flag would have been red purely from silence states SHALL be assigned `pipeline_flag='green'` (or `'amber'` if directional cooling signals fire independently) with `pipeline_flag_reason` including `'off_channel_suppressed'`.
>
> AC-3.5.10 — An LP with `off_channel_active_until` set 10 days in the future that subsequently sends inbound email after 60 days of GP-side silence SHALL still trigger Signal 2 (Re-engagement) — off-channel suppression does NOT block re-engagement.

### §3.10 — Relationships (LP record affordance)

**Change 4.** Add to the LP record spec:

> Each LP record SHALL surface an *"I'm in touch off-channel"* chip in the LP context drawer header area. When `lp_state.off_channel_active_until` is null or in the past, the chip reads *"I'm in touch off-channel"*; tapping it sets the suppression window 30 days forward and the chip transitions to the active state described below. When `off_channel_active_until` is in the future, the chip reads *"Off-channel until {date} — extend"* with the date rendered in workspace-local format; tapping it resets the 30-day window from the moment of tap. A secondary affordance ("Clear") on the active-state chip sets `off_channel_active_until` to null. All transitions write `lp_signal_log` per BR-3.5.9.

Add corresponding AC:

> AC-3.10.X — Tapping the *"I'm in touch off-channel"* chip on an LP whose `off_channel_active_until` is null sets the field to a timestamp 30 days forward, writes a `lp_signal_log` row with `signal_type='off_channel_marked'` and `metadata.action='set'`, and updates the chip label to *"Off-channel until {date} — extend"*.

### §3.8 — Today / Daily Brief (Radar Modal cross-reference)

**Change 5.** Add a sentence to the *Gone quiet* / *Cooling off* description in Appendix I.7 or wherever the section data sources are documented:

> The *Gone quiet* and silence-derived inclusions in *Cooling off* SHALL respect `lp_state.off_channel_active_until` per §3.5 BR-3.5.8. LPs with an active off-channel window appear in neither section regardless of meaningful-touch cadence.

### Glossary

**Change 6.** Add to glossary:

> **Off-channel suppression** — A GP-set marker on an LP record indicating the GP is in contact with that LP through channels TOMO can't see (phone, in-person, messaging apps). For 30 days from the moment the marker is set or extended, silence-related signals (Silence, Stage stagnation, One-way contact, and *Gone quiet* / *Cooling off* inclusion) do not fire for that LP. Directional signals (reply velocity, reply length, etc.) and re-engagement still fire normally. Affordance on the LP record in Relationships.

---

## Part 3 — Open implementation questions

These are decisions Ken and engineering need to make during build but don't change the spec:

1. **Should TOMO ever proactively suggest the GP mark an LP as off-channel?** If TOMO detects re-engagement on an LP whose pre-re-engagement silence would have fired Signal 1, that's evidence the GP was probably in contact off-channel. TOMO could prompt: *"Frank Ieraci just replied after 70 days. Were you in touch with him off-channel? Marking him will reduce false alarms going forward."* This is a V1.5 idea, not V1, but worth flagging so the suggestion mechanism can build on the same underlying field.

2. **Should the 30-day window be GP-configurable per workspace or globally?** V1 default is hardcoded at 30. If FC feedback suggests 45 or 60, V1.5 adds a workspace setting. Schema is forward-compatible (the duration is computed at set-time, not stored as a config).

3. **Should the off-channel marker show in the Radar Modal as a status pill on rows where it's relevant?** E.g. an LP in the *Heating up* section who's also marked off-channel — should the row show that marker? Probably yes, for context, but the spec doesn't require it. Design call.

4. **Bulk action — can the GP mark multiple LPs as off-channel from a Relationships filter?** Useful for "I had a dinner with 6 LPs from the family-office circle and need to mark them all." Easy to add later via Relationships bulk-edit; not required for V1.

---

## Part 4 — Estimated time for Ken to apply these changes

- Change 1 (schema field + enum addition): ~15 minutes.
- Change 2-3 (§3.5 BRs and ACs): ~30 minutes.
- Change 4 (§3.10 LP record affordance): ~20 minutes.
- Change 5 (cross-reference in §3.8 / Appendix I): ~10 minutes.
- Change 6 (glossary): ~5 minutes.

**Total: roughly 1.5 hours of focused SRS work.**

Engineering work (separate from SRS): one schema migration, one BR addition to the signals batch logic, one Relationships UI component for the chip. Roughly half a day of engineering plus QA.

The amendment merges cleanly with the daily-surfaces document. Bundling them into the same SRS revision cycle is preferred because the *Gone quiet* and *Cooling off* renames in that document make this suppression rule more visible and more urgent in production.

---

**End of off-channel amendments document.**
