# Tomo: Suggested relationships from unknown inbound email

**Audience:** Product, design, and fundraising stakeholders  
**Spec reference:** TOMO V1 SRS §3.3a (DRAFT v0.17, June 2026)  
**Last updated:** 4 June 2026

---

## What problem this solves

Tomo learns from your email and calendar, but only for people already in your relationship book. When someone new emails you — a family office, allocator, consultant, etc. — Tomo ingests the message but cannot score the relationship, surface signals, or suggest follow-ups until that person exists as a contact.

**Suggested relationships** closes that gap: Tomo flags inbound mail from unknown senders who look investor-relevant, explains why in plain language, and lets you add or link them in one step. After you confirm, Tomo retroactively ties recent email to that contact and runs the same signal and reminder logic as for everyone else.

---

## What Tomo does (plain English)

1. **Watches inbound email** from senders not already matched to a contact (with simple pre-filters for out-of-office, newsletters, and known vendor domains).
2. **Decides** whether the sender looks like a real fundraising / investor relationship (rules + AI), not a vendor pitch or newsletter.
3. **Suggests** only when confidence is worth your time — split into **likely** (strong) and **maybe** (weaker).
4. **Never adds anyone to the CRM automatically.** You always review and confirm.

**Precision over volume:** Tomo prefers missing a weak lead to flooding you with false suggestions.

---

## What you see as a GP

| Kind of suggestion | Where it appears | How many |
|---|---|---|
| **Likely** — clear investor / fundraising intent | **Today** → Other Tasks (interrupt cards) | Up to **3 per day** per user; extra likely items wait in the queue |
| **Maybe** — possible investor, thinner evidence | **Settings → Suggested contacts** (review queue + badge) | No Today interrupt by default |

Each card shows name, firm, email, a short **reason**, and actions:

- **Add relationship** — opens a pre-filled “new contact” form; on save, Tomo links recent mail from that address.
- **Link to existing** — attach the email to someone already in the book (e.g. new person at a firm you already track).
- **Ignore** — dismiss this suggestion; the same sender can appear again on a new substantive email.
- **Not an investor** — dismiss and **do not suggest this sender again for 30 days**.

You can also add contacts manually from **Relationships → New Contact**; Tomo runs the same email link-back when you save.

---

## What happens after you confirm

When you **add** or **link** a contact, Tomo:

- Links matching inbound (and related) messages from roughly the **last 90 days** (and a short forward window) to that person.
- Refreshes relationship signals where those messages count as meaningful touch (e.g. re-engagement after silence).
- Picks up attachments and reminders on linked mail the same way it does for established contacts.

You do not need to re-import email or wait for the next nightly batch for the basics to kick in.

---

## Important product rules (V1)

- **Inbound only** in V1 (not outbound-only threads).
- **No auto-create** — every new contact requires your explicit confirm (or CRM import).
- **Known firm, new person** — if the company domain is already in the book but the sender is new, Tomo can still suggest adding *this person* at that firm.
- **Existing email match** — if the sender already matches a contact email, Tomo does not suggest a duplicate.
- **Fatigue controls** — cap of 3 likely suggestions on Today per day; overflow and all “maybe” items live in Settings.
- **Not in V1:** LinkedIn / enrichment, learning from your dismissals, multi-message thread graphs, automatic CRM import from suggestions alone.

---

## Example (likely)

> **Possible new investor relationship**  
> Sarah Lee · Northbridge Family Office · sarah.lee@northbridgefo.com  
> *Reason:* Sender represents a family office and asked for the fund deck and performance materials.

---

## How this fits the wider product

- Suggestions sit under Today **Other Tasks** (alongside intros and ad-hoc items), not as a separate workflow step.
- The same **RelationshipDraft** form is used from Today, Settings queue, and **New Contact** on Relationships.
- Workspaces with few contacts see messaging in **Day 1 Gap** encouraging you to confirm suggestions so signals can light up.
- **Warm intro** flows in the Action Drawer may reuse the same classifier but stay a separate product path.

For full engineering rules (data model, SLAs, acceptance tests), see **SRS §3.3a**.

---

## Appendix A — Classification labels (for QA & engineering)

Tomo assigns each unknown inbound one of:

| Label | User-facing suggestion? |
|---|---|
| `likely_investor_relationship` | Yes — interrupt or queue per gates above |
| `maybe_investor_relationship` | Yes — queue only (default) |
| `not_investor_related` | No |
| `existing_relationship` | No (already in book) |
| `vendor_or_service_provider` | No |
| `internal_or_irrelevant` | No |

Classifier output also includes **confidence** (0–100), **reason**, **evidence** bullets, and prefill fields (name, firm, domain, relationship type hint).

**Default:** prefer “not investor” / vendor over a weak “maybe” when evidence is thin.

---

## Appendix B — Golden test emails (expected classification)

**1. Strong LP lead** → `likely_investor_relationship`  
Sarah Lee @ Northbridge Family Office asks for fund deck, performance, DDQ; mentions allocation.

**2. Weak / conference follow-up** → `maybe_investor_relationship`  
Daniel Kim @ Oakridge Partners met at conference; wants to learn more — little firm detail.

**3. Investment consultant** → `likely_investor_relationship`  
Priya Shah requests strategy overview, AUM, returns for institutional clients.

**4. Vendor demo** → `vendor_or_service_provider` (no card)  
Mark Evans pitches fund administration software demo.

**5. Newsletter / webinar** → `internal_or_irrelevant` (no card)  
Events team webinar invite.

**6. Existing CRM contact** → `existing_relationship` (no suggestion)  
Emma Wilson @ domain already on file sends updated DDQ.

**7. Known firm, new sender** → `likely` with firm prefilled  
Inbound from person@blueharborcapital.com when only the **organization** domain exists — suggest **new contact at that firm**.

---

## Appendix C — Classifier contract (engineering)

**Pre-LLM:** CRM match ladder (exact email → fuzzy name+firm → org domain only → classify). Skip OOO, blocklisted domains, open duplicate suggestion, suppressed sender.

**LLM:** `gemini-2.5-flash`, JSON only. Keyword boosters (investor type, fundraising intent, meeting/intro) and negative keywords (vendor, newsletter, etc.) per prior brief revision — negatives **soften** score, do not hard-reject (DDQ/tax/legal can still be investor-relevant).

**Suggested JSON shape:**

```json
{
  "classification": "likely_investor_relationship",
  "confidence": 87,
  "person_name": "Sarah Lee",
  "email": "sarah.lee@northbridgefo.com",
  "firm_name": "Northbridge Family Office",
  "domain": "northbridgefo.com",
  "relationship_type": "Family Office",
  "suggested_action": "suggest_new_relationship",
  "reason": "Sender appears to represent a family office and requested the fund deck and performance materials.",
  "evidence": ["Signature: Investment Director", "Firm includes Family Office", "Requests deck and performance"]
}
```

**System prompt (summary):** You are Tomo for hedge fund fundraising. Review inbound from a possibly unknown sender. Suggest a new relationship only with clear fundraising / investor / diligence / allocation evidence. If CRM context shows a match, use `existing_relationship`. Prefer precision over recall. Return JSON only with fields above.

**Keyword boosters (non-exhaustive):** LP, investor, allocator, family office, fund of funds, pension, endowment, OCIO, investment consultant, wealth platform; fund deck, DDQ, due diligence, allocation, commitment, data room; intro call, warm intro, investor meeting, roadshow.

**Negative soft signals (do not auto-reject):** software demo, fund admin, audit, tax vendor, recruitment, newsletter, webinar, PR, generic invoice — real LPs may mention DDQ, tax, or legal in diligence.

**User prompt inputs:** `crm_match_status`, `crm_matches`, from/to/cc, subject, body; instruction to return JSON only and not suggest when CRM already matches.

---

**End of brief.**
