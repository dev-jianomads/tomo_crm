# UAT Scope Clarification

**Status:** Binding for Tomo-FE + Tomo-BE UAT  
**Date:** 2026-08-10  
**Applies to:** UAT builds of Tomo-FE and Tomo-BE  
**Does not change:** Mock (`tomo_crm`) role as design / IA guide

---

## 1. Purpose

The SRS and UI were derived from a **mock / guide** app. Some acceptance criteria treat **disabled “Coming soon” CTAs** and **visual parity with the mock** as V1-correct.

That is the wrong bar for UAT.

This clarification defines the UAT exit standard so engineering and QA stop treating mock stubs as done.

---

## 2. UAT definition (binding)

> **UAT means: every visible action succeeds against Tomo-BE.**

More precisely:

1. If a control is **shown** to the user in UAT (button, menu item, link, drawer action, form submit), it must:
   - perform its intended operation against **Tomo-BE** (or a documented live integration), and
   - leave durable state the user can verify (refresh / re-login still shows the result), or
   - show a clear, recoverable error when the operation fails.
2. **Disabled / “Coming soon” / aria-disabled placeholders are UAT failures** when they sit on an in-scope surface — not acceptable “parity with mock.”
3. If a flow is **not ready**, do **not** show the CTA. Hide it (or remove it from the UAT build). Do not ship theatre CTAs.
4. **Mock visual parity is not a UAT pass criterion.** Design HTML / mock screens remain a guide for layout and IA only.
5. **Demo / fixture paths are not UAT.** Primary UAT journeys must not depend on `mockData`, `resetToMock`, or local-only persistence when Tomo-BE owns that data.

---

## 3. Relationship to the SRS

| Source | Role in UAT |
|---|---|
| Mock app (`tomo_crm`) | Design / IA reference only |
| Design HTML | Layout / structure guide only |
| SRS product behaviour (create list, amend, delete, run workflow, etc.) | Still required when the surface is in UAT scope |
| SRS clauses that **require disabled placeholders** for mock parity (e.g. AC-3.11.4, AC-3.11.6 and equivalent story ACs) | **Suspended for UAT** — replaced by §2 of this clarification |

**Rule:** Where this clarification conflicts with a mock-parity / disabled-placeholder AC, **this clarification wins for UAT**.

Product intent remains: those flows should work. The mock chose disabled buttons as a temporary stand-in; UAT must not.

---

## 4. CTA policy

| Situation | Required UAT behaviour |
|---|---|
| BE endpoint exists; FE CTA disabled | **Bug** — wire FE to BE |
| Neither FE flow nor BE support exists | **Hide CTA** until implemented; track as open work |
| CTA visible | Must succeed end-to-end against Tomo-BE |
| Temporary disable (validation, permissions, loading) | Allowed only when the control **will work** once the blocking condition clears (empty form, RBAC, in-flight request) |

Allowed disables are **state guards**, not **missing features**.

---

## 5. Known examples (non-exhaustive)

These are illustrative; QA should apply §2 everywhere.

### Lists

| Visible control | UAT expectation |
|---|---|
| **New list** | Creates a list via Tomo-BE (`POST /api/crm/lists` or equivalent); list appears after refresh |
| **Import cohort** | Completes import against BE, **or** CTA is hidden until ready |
| **Amend list** | Persists membership / criteria to BE |
| **Delete list** | Deletes via BE, **or** CTA is hidden until ready |
| **Ask Tomo about this cohort** | Works against BE/assistant path, **or** CTA is hidden until ready |
| **Run workflow** | Links / launches against BE-backed workflow APIs |

### Cross-cutting

- No primary nav destination may land on a stub page that cannot complete its core job.
- Settings / integrations CTAs that imply a connection must actually connect (or be hidden).
- “Reset demo” / mock-restore controls must not appear in UAT.

---

## 6. Unmatched inbound email → suggested relationships (binding)

**Observed in UAT (Today → What needs your attention):** cards such as `DDQ_RESPONSE` with title **“an LP - an LP”** and a **Draft** CTA. These appear when mail was ingested but **no resolved relationship** exists (or the LP label is missing). Drafting a DDQ reply against a nameless / unresolved sender is not a useful GP action.

**Product intent (SRS §3.3a — Contact resolution and suggested relationships):**

When an inbound email does **not** match any `lp_contacts` / known relationship after the match ladder:

1. Classify the unknown sender (rules + LLM; precision-first — not every unmatched email).
2. Persist a **contact suggestion** with suggested fields (`prefill_jsonb`: name, email, firm, domain, type hints, reason, evidence).
3. Surface to the GP with working CTAs:
   - **Add relationship** → RelationshipDraft prefilled → confirm creates the contact and runs **contact resolution backfill**
   - **Link to existing**
   - **Ignore**
   - **Not an investor** (suppress)
4. Likely suggestions may appear on Today (interrupt-capped); maybe / overflow go to **Settings → Suggested contacts**.

**UAT requirement:**

| Case | Required UAT behaviour |
|---|---|
| Inbound mail, **no** relationship match, classifier says investor-like | Today / Suggested contacts shows a **relationship suggestion** with prefilled fields and working **Add relationship** / **Link** / **Ignore** / **Not an investor** against Tomo-BE |
| Same case, classifier says not investor / vendor / internal | **No** Today interrupt; no fake action card for that sender |
| Action card that needs an LP (e.g. `DDQ_RESPONSE`) but `lp_contact_id` is null / unresolved | **Must not** surface as a normal Draft card titled “an LP - an LP”. Either resolve via §3.3a first, or withhold / reclassify the card until a relationship exists |
| User confirms **Add relationship** | Contact persists in BE; historical matching interactions link; subsequent Today cards use the real name/firm |

**Evidence this is currently broken (not “optional polish”):**

- SRS §3.3a / Story 8.3.14 make suggested relationships **normative** for CRM-thin and unmatched-inbound cases.
- Tomo-BE has **no** `contact_suggestions` model / classifier pipeline in the UAT codebase checked for this clarification.
- Today action mapping falls back to the literal string **`an LP`** when firm/contact names are missing (`todayActions` mapper) — which is what produces cards like **“an LP - an LP”**.

**Rule:** Unmatched mail must not become orphan action theatre. Either suggest add/link relationship (working CTAs), or do not show LP-dependent action cards for that sender.

This clause is **in UAT scope**. It is not deferred polish.

---

## 7. UAT pass / fail gate

**Pass only if all of the following hold for in-scope surfaces:**

- [ ] No in-scope primary CTA is permanently disabled or titled “Coming soon.”
- [ ] Spot journeys succeed against live Tomo-BE (create/amend list, relationships CRUD where shown, workflow run where shown, Today actions that claim to mutate state).
- [ ] After browser refresh, mutated state is still present (proves BE persistence, not local mock).
- [ ] Unimplemented flows are absent from the UI, not shown as disabled placeholders.
- [ ] Unmatched inbound investor-like mail produces a **working** suggested-relationship path (§6), not nameless `DDQ_RESPONSE` / Draft cards.

**Fail if:** any visible CTA is a mock-era stub, FE ignores an existing BE capability, or unresolved mail is shown only as orphan “an LP” action cards.

---

## 8. Engineering instruction (one line)

> UAT is not “matches mock.” UAT is “every visible action succeeds against Tomo-BE.” Treat mock-derived disabled CTAs **and** missing §3.3a suggested-relationship flows as **open work or bugs**, not compliance.

---

## 9. Open follow-ups

Track separately from this clarification (to be filled as found):

- Full inventory of disabled / “Coming soon” CTAs in Tomo-FE vs existing Tomo-BE endpoints.
- Implement / wire §3.3a end-to-end: classify → `contact_suggestions` → Today / Settings queue → RelationshipDraft → backfill; stop emitting LP-dependent Today cards without a resolved contact (or without a suggestion CTA first).
