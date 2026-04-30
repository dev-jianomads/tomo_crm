# TOMO V1 — Onboarding Flow Specification

**Audience:** PM, frontend and backend engineering.
**Purpose:** Sequenced specification of the V1 onboarding flow, screen by screen.
**Status:** Source document for SRS — drop sections into the SRS as appropriate.

---

## Strategic frame

The onboarding flow is the most important sequence of screens TOMO ships. It does three things simultaneously:

1. **It demonstrates TOMO's positioning** — operational AI layer, not CRM replacement, with the GP confirming AI-generated decisions rather than configuring a system from scratch.
2. **It delivers immediate operational value** — by the end of onboarding, the GP has acted on real LPs from their actual pipeline, with real drafts approved through TOMO and sent through their own email account.
3. **It produces the demo material** — screen 6 (the Day 1 Gap reveal) is the screen that goes into the Founding Circle pitch deck and the marketing site. It is the moment that converts skepticism to belief.

Total time target: 17–22 minutes for a focused GP. If onboarding exceeds 30 minutes for any FC member during their first session, the flow has failed regardless of how polished the rest is.

The flow assumes the GP is a Backstop user (the hardest case in the FC cohort). Affinity and HubSpot users will hit the API path in screen 2; everything else is identical. Foliometrics users follow the same flow as Backstop.

---

## The eight-screen arc

Screens flow linearly. There is no "skip onboarding" path. The only escape is closing the browser, which preserves state — the GP can resume from their last completed screen.

### Screen 1 — Welcome (90 seconds)

**What the GP sees:**
- Single full-screen page with one primary action.
- Newsreader serif greeting: *"Welcome, Geoffrey."* (Personalised from the magic link.)
- Body paragraph: *"You're a Founding Member of TOMO. Over the next 20 minutes, we'll connect TOMO to your existing systems and surface the first signals from your pipeline. You'll see real intelligence on your real LPs by the end of this session. Nothing is sent or surfaced anywhere outside this screen until you tell it to."*
- Single primary navy button: *"Let's start."*
- No secondary actions, no skip option, no "explore first" path.

**What the GP does:** clicks the button. That's it.

**What happens behind the scenes:** nothing yet. The screen exists to set the contract.

**Engineering notes:**
- Magic link is delivered to the GP's email after Founding Circle agreement signature. Link contains an authenticated session token tied to their email address.
- The GP's name personalisation comes from the FC agreement record. If unavailable, fall back to *"Welcome to TOMO."*

**V1 vs V1.5:** identical in both.

---

### Screen 2 — Connect your systems (3 minutes)

**What the GP sees:**
Three connection tiles on a single page, equally weighted. Each has system logo, one-line description, and connect button.

**Tile 1 — Email and calendar (required):**
- Description: *"We'll watch for new LP communications and meetings going forward, and we'll read the last 12 months of your history to establish baselines."*
- Button: *"Connect Gmail"* or *"Connect Outlook"* (browser-detected default).

**Tile 2 — Your CRM (required):**
- Description: *"This is where your existing LP base lives. We'll import your relationships once and keep TOMO in sync from this point forward."*
- Button (Backstop GP): *"Upload CSV from Backstop"* with a small *"Other CRM"* link below for variants.
- Button (Affinity GP): *"Connect Affinity"* (API key flow).
- Button (HubSpot GP, if applicable): *"Connect HubSpot"* (OAuth flow).

**Tile 3 — Meeting notes (optional):**
- Description: *"If you use Granola, Otter, or similar, we can ingest meeting transcripts to enrich LP context."*
- Button: *"Connect Granola"* or *"Skip for now."*

**Continue button** at the bottom of the page is enabled the moment email and CRM are both connected — even if syncs haven't completed.

**What the GP does:**
- Connects email via OAuth (Google or Microsoft). Two clicks.
- For Backstop GPs: opens Backstop in another tab, runs the standard "Contact Export" report (60–90 seconds), drags the resulting CSV into the drop zone. A small *"Show me how"* link opens a 30-second loom video showing the Backstop menu navigation if needed.
- For Affinity GPs: pastes API key from Affinity Settings → Manage Apps. Single click.
- Meeting notes: most GPs skip in V1.

**What happens behind the scenes:**
- Email OAuth triggers a background sync. Last 90 days full-content sync starts immediately. 12-month full-content backfill and 36-month metadata backfill run progressively in the background.
- Calendar sync runs alongside email sync.
- CSV upload triggers schema detection — TOMO reads column headers, samples values, attempts auto-mapping against its known dictionary.
- Affinity API key triggers initial pull of Persons, Organizations, Lists, Interactions. **For Affinity GPs only:** TOMO also creates six custom fields on the GP's Affinity workspace (`tomo_signal_flag`, `tomo_signal_evidence`, `tomo_days_since_meaningful_touch`, `tomo_last_meaningful_touch_at`, `tomo_tier_correction`, `tomo_post_meeting_note`) so push-back can write to them. If the GP's Affinity license restricts custom field creation, surface a one-time setup screen with explicit instructions before proceeding. See Document A — Affinity section — for full bi-directional scope.
- Tone calibration model starts running on the GP's sent-mail history during this screen and continues through screens 3–5. Must complete before screen 6.

**Engineering notes:**
- Email sync provider: per V1 SRS, recommend Nylas (or equivalent) for Gmail and Microsoft 365 unification.
- Permissions surfaced clearly during OAuth: read messages, read calendar, send drafts on behalf of (drafts only, never auto-send).
- For Backstop GPs, the loom video is hosted externally — it should not block the flow. If the video fails to load, GPs can still complete the upload step.
- Continue button enables on a soft check (email connected + CSV uploaded), not a hard check (email synced + CSV parsed). The remaining work happens during screens 3–5.

**V1 ships:** all three tiles. Affinity, HubSpot, and Backstop CSV paths.
**V1.5 adds:** Foliometrics-specific schema dictionary (covered by generic CSV in V1), additional meeting-note providers beyond Granola.

---

### Screen 3 — Field mapping (3–4 minutes)

**What the GP sees:**
- Page heading: *"We mapped your CSV columns. 4 need a quick check."* (Number is dynamic.)
- Three-column table: *Your Backstop column* / *Maps to TOMO field* / *Sample values from your data*.
- Most rows are pre-filled with green checkmarks (high-confidence auto-maps) and collapsed.
- 4–6 rows are expanded with amber question marks (ambiguous mappings) requiring GP confirmation.
- Each ambiguous row shows TOMO's best guess plus an explanation.
  - Example: *"Your column 'Investor_Type_Code' contains values like 'PEN, EFO, SOV, FOF'. These look like investor type codes (Pension, Family Office, Sovereign, FoF). Map to investor_type and translate values automatically."*
  - Buttons per row: *"Looks right"* / *"Adjust"*.
- Bottom of page: primary navy button *"Continue with this mapping."* Small link *"Review all mappings"* expands the green-checkmark rows.
- No skip option — the GP must address each amber row.

**What the GP does:** clicks *"Looks right"* 4–6 times. For one or two genuinely tricky columns (e.g. a custom field called "Notes_From_2023_Roadshow"), uses *"Adjust"* to either pick a different mapping or *"Skip this column"*. Total time: 60–120 seconds.

**What happens behind the scenes:**
- Every mapping decision is recorded as policy in the database, keyed to (GP, source CRM, column name).
- On future imports from the same Backstop instance, mappings auto-apply without re-asking.
- Mapping policy informs the eventual quarterly Backstop export — TOMO knows how to translate values back.
- LLM-assisted classification ran during the previous screen's loading time; results are cached.

**Engineering notes:**
- Schema dictionary covers 30–40 commonly-mapped column names per source CRM. Build this from actual FC member CSVs during onboarding, not speculatively.
- Auto-map confidence threshold should be tuned conservatively. Better to surface 6 amber rows than to silently miss-map a critical field.
- LLM classification calls during this screen consume API tokens — budget accordingly. Each ambiguous column requires roughly one LLM call to classify the value pattern.
- Audit log: every mapping decision is captured with timestamp, user ID, and the original column header. Required for V1.5 conflict resolution.

**V1 ships:** all functionality described above.
**V1.5 adds:** GP-editable schema dictionary (the GP can teach TOMO new column-name patterns for their specific CRM customisation).

---

### Screen 4 — Pipeline import in progress (2–3 minutes)

**What the GP sees:**
- Single full-width progress narrative at the top of the screen with milestones appearing in sequence.
- Not a generic spinner. Each milestone is specific:
  - *"Reading your Backstop export..."*
  - *"Found 247 LP records across 198 organisations."*
  - *"Cross-checking against your email history..."*
  - *"Identifying duplicates and merges..."*
  - *"Detected 12 potential duplicates — we'll review these in a moment."*
  - *"Calculating last meaningful contact for each LP..."*
  - *"Computing baseline reply velocities..."*
  - *"Identifying relationships your CRM shows active with no recent meaningful contact..."*
- Each milestone gets a teal checkmark as it completes.
- Below the narrative: *"This usually takes 90 seconds. Coffee break is fine."*
- No primary action — the screen auto-advances to screen 5 when complete.

**What the GP does:** waits. The narrative is the action.

**What happens behind the scenes:**
- Real work, mapped to real milestones (not animated):
  1. Parse CSV using the mapping policy from screen 3.
  2. Run dedup against email-derived contact graph.
  3. Compute days_since_meaningful_touch for every imported LP.
  4. Classify which LPs have email evidence vs which are CRM-only entries.
  5. Pre-compute the Day 1 Gap number (LPs whose CRM stage is active but who have no meaningful touch in 60+ days).
  6. Pre-generate re-engagement drafts for the top 20 Day 1 Gap LPs (using the calibrated tone model, which must have completed by now).
- Email sync continues in the background. The 90-day full-content sync should complete during this screen; if it hasn't, screen 5 waits.

**Engineering notes:**
- Each milestone in the narrative corresponds to a real backend completion event. Frontend subscribes to a websocket or SSE stream and updates as events arrive.
- If a step takes unexpectedly long (e.g. CSV is 5,000+ rows), continue showing the current milestone with a "still working..." indicator rather than fake progress.
- Failure handling: if any step fails, the screen shows a clear error with a *"Try again"* button and a *"Contact us"* link. Do not advance to screen 5 with incomplete data — the Day 1 Gap moment depends on having clean state.
- Hard cap: 5 minutes. Beyond that, surface an "we'll email you when this completes" escape hatch.

**V1 ships:** all functionality described above.
**V1.5 adds:** richer narrative for larger imports (additional milestones for thousand-plus-row CSVs).

---

### Screen 5 — Duplicate review queue (2–3 minutes)

**What the GP sees:**
- Page heading: *"We found 12 records that may be duplicates. Quick review — should take 90 seconds."*
- One pair shown at a time, side-by-side:
  - **CSV record:** Sarah Chen · Verbena Point LP · sarah.chen@verbena.com
  - **Existing TOMO record:** Sarah J. Chen · Verbena Capital · schen@verbenacap.com
- Three buttons per pair: *"Yes, merge"* / *"No, keep separate"* / *"Skip for now"*.
- Progress indicator: *"Reviewing 1 of 12."*
- After all pairs are reviewed, screen auto-advances to screen 6.

**What the GP does:** clicks through 12 pairs, typically in 60–90 seconds. Most decisions are obvious (different emails but clearly same person). For the 2–3 ambiguous cases, *"Skip for now"* is the safe default.

**What happens behind the scenes:**
- Every merge decision rewrites the lp_contact graph and re-runs the touch-history calculation for the merged entity.
- Skip decisions are logged. These LPs surface later in the Activity feed for the GP to revisit when they have context.
- Every decision becomes precedent: future similar pairs (same firm name pattern, same email domain pattern) get higher confidence auto-resolution.

**Engineering notes:**
- Dedup priority ladder is documented in CRM Integration Reference (Document A, Phase 2 of generic CSV pipeline).
- If the GP's CSV has zero ambiguous duplicates, this screen is skipped entirely.
- If the GP's CSV has 50+ ambiguous duplicates (unusually messy data), batch the review into pages of 20 with a *"continue review later"* option — but this is unlikely for typical FC members.

**V1 ships:** functionality described above.
**V1.5 adds:** smarter dedup using email domain pattern matching across firms, reducing ambiguous count.

---

### Screen 6 — The Day 1 Gap reveal (5–7 minutes — the climax)

**This is the screen the entire onboarding has been building toward.** Get this right and the GP becomes a believer. The screen design and copy must be defensible against scrutiny — every number and claim must trace to a specific email or calendar fact.

**What the GP sees:**
- Single full-screen layout, no sidebar, no nav.
- Newsreader serif headline: *"Geoffrey, here's what your CRM doesn't show you."*
- Single-sentence summary in body text: *"Your Backstop shows 247 active LP relationships. 73 of them haven't had a meaningful two-way exchange in 60+ days. 31 of those are Tier 1."* (Numbers dynamic from the GP's actual data.)
- Single-column list of those 73 LPs, prioritised by tier and stage. Each row shows:
  - LP name (Newsreader serif — the second earned serif moment of the onboarding)
  - Firm and stated status from CRM: *"PAAMCO Prisma · Active diligence per Backstop"*
  - TOMO-computed truth in plain English: *"No meaningful contact in 67 days. Last email: short reply, no question, no follow-up on Mar 14."*
  - Action chip: *"Draft re-engagement"* or *"Review history"*
- Above the list: *"These are not lost yet. They're recoverable. We've drafted a re-engagement message for each one in your voice. Approve any that feel right, edit those that don't, ignore those that aren't worth chasing."*
- At the bottom of the screen, a primary navy button: *"Continue to setup."* Available immediately — the GP doesn't have to engage with every LP.

**What the GP does:** scrolls the list. Recognises names. Sees the pattern that their CRM shows 247 active relationships but a third are functionally dormant. Clicks *"Draft re-engagement"* on 1–5 LPs. For each click, a side drawer opens showing TOMO's draft. GP reads, edits, approves and sends — or hits "skip for now".

**What happens behind the scenes:**
- Every "Approve and send" sends a real email through the GP's connected Gmail/Outlook account.
- Every action becomes feedback that calibrates TOMO's draft tone for that specific LP.
- The cooling-LP review captures tier_corrections and mandate_fit confirmations against real names — *"Should we keep PAAMCO Prisma at Tier 1, or is this actually a Tier 2 relationship?"*

**Engineering notes — critical:**
- This screen must not render until two conditions are met: (a) 90-day full-content email sync is complete, and (b) tone calibration model has finished training on the GP's sent mail.
- If either condition is unmet, screen 5 holds until they complete. Better to add 60 seconds to onboarding than to render Day 1 Gap with incomplete data.
- The *"meaningful contact"* definition must match V1 SRS Section 8.2 exactly — same field for same field, same exclusions, same threshold logic.
- Every claim on every LP row must trace to a specific email or calendar fact. If the GP clicks *"Why?"* on any row, TOMO must surface the specific evidence.
- Recovery from false positives: each row has a small *"We're missing context"* link. Clicking it reveals: *"We're seeing this from your email and calendar. If you've had calls or in-person meetings we couldn't see, mark this LP as 'recently spoken' and we'll suppress."* This gives a graceful recovery without breaking the screen.

**Failure modes to engineer against:**
1. **Wrong numbers.** If the GP knows they had a 30-min call with an LP three weeks ago that wasn't captured, the screen shatters credibility. Mitigation: the *"recently spoken"* override.
2. **Bad drafts.** First time the GP reads a draft and thinks *"I would never write that,"* trust collapses. Mitigation: tone calibration must be validated against held-out emails before the screen renders. If calibration confidence is low, defer drafts to on-demand generation: replace the action chip with *"Click to draft"* and generate the draft when the GP clicks.
3. **Empty state.** If the GP's CSV is small or their pipeline is genuinely well-managed, the Day 1 Gap may be small (fewer than 10 LPs). Mitigation: dynamic copy. *"You have 12 LPs your CRM shows as active where TOMO can't find a meaningful exchange in 60+ days. Smaller than typical for a fund at your stage — your pipeline is in good shape. Here's the list anyway."*
4. **Zero LPs in the gap.** Edge case for an exceptionally well-managed pipeline. Mitigation: show a different but still valuable insight: *"Your pipeline looks healthy. Here are the 5 LPs with the most directional momentum in the last 14 days — start your day with them."*

**V1 ships:** full screen as specified, including recovery mitigations.
**V1.5 adds:** richer historical view per LP (full email thread, attached docs), inline tier correction without leaving the screen.

---

### Screen 7 — Set up your daily rhythm (2 minutes)

**What the GP sees:**
- Three-question screen, single page.
- Question 1: *"What time do you want your morning brief?"* Default 7am, GP can adjust to any hour. Time zone auto-detected.
- Question 2: *"How do you prefer to be notified about urgent inbound from LPs?"* Three radio options: *"In-app only"* / *"Email digest"* / *"Mobile push"*.
- Question 3: *"Who else on your team should have access to TOMO?"* Optional. Free-form email list. Skip is fine.
- Primary navy button: *"Continue."*

**What the GP does:** picks options, clicks continue. 60–90 seconds.

**What happens behind the scenes:**
- Setting morning brief schedule activates the nightly batch for this user.
- Notification preferences set up the appropriate channels (in-app push, transactional email, or mobile push token registration).
- Team additions trigger separate magic-link invitations to the additional users. Each invitee gets the same onboarding flow when they sign in.

**Engineering notes:**
- Nightly batch needs to know each user's preferred brief time and time zone — both fields on lp_contacts user record.
- Mobile push only relevant if iOS/Android apps ship in V1. If not, remove that option from the UI.
- Team invitations should include the inviting GP's name and a short context line: *"Geoffrey at [Firm] invited you to TOMO. They're using it to manage their LP relationships."*

**V1 ships:** functionality described.
**V1.5 adds:** more granular notification preferences (e.g. *"only urgent re-engagements, not regular cooling alerts"*).

---

### Screen 8 — Your first morning (60 seconds)

**What the GP sees:**
- Preview of the Today screen as it will appear tomorrow morning at 7am.
- Real LP names, real action cards, the real intelligence line.
- Heading: *"Tomorrow at 7am, this is what you'll see."*
- Below the preview: *"Until then, you can keep working in TOMO. The action cards above are ready now. The morning brief tomorrow will incorporate any new email overnight."*
- Single primary navy button: *"Take me to Today."*

**What the GP does:** clicks the button. Lands on the Today screen. Onboarding is over.

**What happens behind the scenes:**
- User flag flipped from "onboarding" to "active."
- Today screen becomes their permanent home page on next login.
- Email and calendar continue syncing in the background. Tomorrow morning's brief generation runs at the configured time.

**Engineering notes:**
- The "preview" of tomorrow's Today screen is generated using current state. It's not literally tomorrow's brief — it's today's, presented as the GP's first-morning experience. If the GP signs in tomorrow at 7am, they see a refreshed brief.
- The onboarding completion event is logged for analytics — track time spent per screen, drop-off points, and completion rate.

**V1 ships:** functionality described.
**V1.5 adds:** richer first-morning preview with a sample meeting prep brief.

---

## Cross-screen dependencies

| Screen | Depends on |
|---|---|
| 1 — Welcome | Magic link delivery |
| 2 — Connect systems | Auth provider integrations (Google, Microsoft, CRM-specific) |
| 3 — Field mapping | CSV parser, schema dictionary, LLM classification API |
| 4 — Pipeline import | CSV parser, dedup engine, signal computation engine, tone calibration model training |
| 5 — Duplicate review | Dedup engine output from screen 4 |
| 6 — Day 1 Gap | All of the above PLUS 90-day email sync complete PLUS tone calibration model ready |
| 7 — Daily rhythm | User preferences schema, notification channels |
| 8 — First morning | Today screen render with current state |

**Critical dependency:** screen 6 cannot render until tone calibration is complete and 90-day email sync is complete. If either is delayed beyond screen 5, screen 5 holds with a *"Just a moment, almost ready..."* indicator. This dependency must be engineered defensively.

---

## What's deliberately not in V1 onboarding

A few things considered and cut for V1 — documented here so engineers don't add them speculatively.

- **Tier curation in onboarding.** Cut because it adds 10+ minutes and is better done lazily as the GP encounters each LP for the first time in the daily flow. TOMO uses imported tier from CRM as a starting point; tier confirmation happens contextually as actions arise.
- **Re-up cohort identification screen.** Cut because Backstop typically tracks prior investments natively, so this can be inferred from the imported data without an explicit screen.
- **Workflow configuration screen.** Cut because all V1 workflows should be on by default. The GP doesn't need to choose; they need to see the value first and decide later if any feel wrong.
- **Team training video or product tour.** Cut because the actions through onboarding *are* the tour. By minute 22, the GP has used the LP card, the action drawer, and the chat input.

---

## Total V1 build estimate

Onboarding flow as a coherent experience: roughly 5–7 weeks of frontend and backend work, plus the dependent CRM and signal infrastructure (specified separately). Most of the engineering complexity is in screen 4 (the import engine), screen 6 (the Day 1 Gap rendering with all its mitigations), and the tone calibration model that powers screen 6's drafts.

If engineering capacity is constrained, the highest-priority screens are 1, 2, 4, 6, 8. Screens 3, 5, and 7 can ship in simplified V1 form and gain polish in V1.5.

---

## Open questions for engineering to resolve

1. **Tone calibration model architecture** — is this a fine-tuned LLM, a prompt-engineered base model, or something else? Recommendation: prompt-engineered base model in V1 (faster to build, easier to debug). Fine-tuning is V2.

2. **Day 1 Gap empty-state copy** — needs design and copy review for the edge case of <10 LPs in the gap or zero LPs in the gap. Both states need their own treatment.

3. **Recovery from "wrong numbers"** — the *"We're missing context"* link on screen 6 needs a clear UX. How does the GP indicate they had a call we couldn't see? Free-text? Date picker? Recommendation: free-text with date, parsed by LLM into a synthetic touchpoint event.

4. **Magic link expiry** — how long do FC magic links remain valid? Recommendation: 14 days. Long enough for FC members to onboard at their own pace; short enough to feel exclusive.

5. **What happens if a GP's CRM CSV is empty or fails to parse?** — recovery path needed. Recommendation: surface a clear error, link to support, allow them to retry. Do not advance to screen 4 with no data.

---

## What this document does not cover

- CRM-specific integration details — see Document A (CRM Integration Reference).
- Email and calendar sync specification — covered in V1 SRS Section 8 and Pillar 8 of the working doc.
- Signal computation — covered in V1 SRS Section 8.
- Today screen, LP card, Action Drawer specifications — covered separately.
- Workflow definitions — covered separately.

If a question arises during build that this document doesn't answer, default to the strategic frame above (operational layer, GP confirms AI decisions, climax is screen 6) and ping the PM before adding scope.
