# Tomo MVP Brief: Suggest New LP Relationships from Unknown Inbound Emails

## Objective

Build a simple MVP feature where Tomo reviews inbound fundraising emails and suggests a new CRM relationship when the sender appears to be a potential LP, investor, allocator, consultant, family office, fund of funds, institutional investor, wealth platform, or other investor-related contact.

This feature is for hedge fund fundraising teams.

The MVP should be simple, explainable, and easy to extend later.

---

## Core User Story

As a hedge fund fundraiser, when I receive an inbound email from someone not already in my CRM, Tomo should detect whether the sender looks like a relevant investor relationship and suggest that I add them to the CRM.

Example:

> Tomo found a possible new LP relationship: Sarah Lee at Northbridge Family Office. Reason: sender requested the fund deck and performance materials.

The user can then choose:

```text
Add relationship
Link to existing
Ignore
Not an investor
```

For MVP, only the suggestion UI is required. Actual CRM write-back can be stubbed or mocked.

---

## MVP Scope

### Include

1. Process inbound emails only.
2. Check whether the sender already matches an existing CRM contact or company.
3. If no CRM match is found, classify the sender/email as either:
   - likely investor relationship
   - maybe investor relationship
   - not investor-related
4. Show a suggestion only for likely or maybe investor relationships.
5. Provide a short reason explaining why Tomo suggested it.
6. Allow the user to dismiss or accept the suggestion.

### Exclude for MVP

Do not build these yet:

```text
Automatic CRM creation
Advanced entity resolution
External enrichment
Company database lookup
LinkedIn lookup
Complex scoring model
Learning from user feedback
Multi-email thread analysis
Full relationship graph
Capital introduction workflow
Placement agent workflow
```

These can be added later.

---

## Simple Detection Logic

For MVP, use a lightweight rule + LLM classification approach.

### Step 1: CRM Match

Before using AI classification, check whether the sender already exists.

Match against:

```text
sender email address
sender email domain
known contact email
known company domain
known company name
```

If sender already matches an existing CRM contact or company:

```text
Do not suggest a new relationship.
```

Instead, optionally classify as:

```text
Existing relationship
```

---

### Step 2: Only Classify Unknown Senders

Only run the new relationship classifier when:

```text
sender_email not found in CRM
AND sender_domain not found in CRM
```

This keeps costs and noise low.

---

### Step 3: Use Simple Investor Keywords

Use these keywords as signal boosters, not hard rules.

#### Investor / LP Type Keywords

```text
LP
limited partner
investor
allocator
capital allocator
family office
single family office
multi-family office
investment office
fund of funds
fund-of-funds
pension fund
endowment
foundation
sovereign wealth fund
insurance company
OCIO
outsourced CIO
investment consultant
asset consultant
private bank
wealth management
wealth platform
RIA
registered investment adviser
institutional investor
asset owner
gatekeeper
```

#### Fundraising Intent Keywords

```text
fund deck
pitch deck
teaser
one pager
factsheet
performance
track record
returns
AUM
strategy overview
fund overview
offering memorandum
PPM
subscription documents
data room
DDQ
due diligence
investment committee
allocation
commitment
ticket size
minimum investment
capacity
fund terms
liquidity terms
redemption terms
management fee
performance fee
side letter
subscription
```

#### Meeting / Introduction Keywords

```text
intro call
introduction
warm intro
meet the team
schedule a call
availability next week
investor meeting
LP meeting
roadshow
capital introduction
cap intro
conference follow up
manager research
manager selection
```

---

## Negative Keywords

These reduce false positives.

```text
software demo
CRM
data provider
fund admin
administrator
audit
tax
legal services
compliance service
recruitment
headhunter
office lease
IT support
cybersecurity
newsletter
webinar invitation
sponsorship
media inquiry
PR agency
vendor
invoice
payment reminder
bank details
```

Important: negative keywords should not automatically reject an email. For example, a real LP may ask for legal documents or tax information during due diligence. Use context.

---

## MVP Classification Categories

The classifier should return one of:

```text
likely_investor_relationship
maybe_investor_relationship
not_investor_related
existing_relationship
vendor_or_service_provider
internal_or_irrelevant
```

Only create a suggestion for:

```text
likely_investor_relationship
maybe_investor_relationship
```

---

## Suggested JSON Output

The AI classifier should return JSON only.

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
  "evidence": [
    "Email signature says Investment Director",
    "Firm name includes Family Office",
    "Email asks for fund deck and performance"
  ]
}
```

For a non-investor:

```json
{
  "classification": "vendor_or_service_provider",
  "confidence": 91,
  "person_name": "Mike Brown",
  "email": "mike@crmtools.com",
  "firm_name": "CRM Tools",
  "domain": "crmtools.com",
  "relationship_type": "Vendor / Service Provider",
  "suggested_action": "ignore",
  "reason": "Sender is offering a software demo and does not appear to be an LP or investor relationship.",
  "evidence": [
    "Email mentions CRM software demo",
    "No fundraising or investor due diligence intent detected"
  ]
}
```

---

## MVP System Prompt

Use this as the first version.

```text
You are Tomo, an AI assistant for hedge fund fundraising teams.

Your task is to review an inbound email from a sender who may or may not already exist in the CRM.

Decide whether the email suggests a potential new LP, investor, allocator, consultant, family office, fund of funds, institutional investor, private bank, wealth platform, endowment, foundation, pension fund, sovereign wealth fund, OCIO, investment consultant, or other investor-related relationship.

Only suggest a new relationship if there is evidence that the sender or their firm is relevant to fundraising, investor relations, fund evaluation, due diligence, allocation, or investor introductions.

Do not suggest a new relationship just because the sender is unknown.

Avoid suggesting vendors, software salespeople, recruiters, lawyers, auditors, administrators, PR firms, media, newsletters, spam, payment reminders, or generic service providers unless the context clearly shows investor relevance.

If the sender already matches an existing CRM contact or company, classify as existing_relationship and do not suggest a new relationship.

Prefer precision over recall. It is better to miss a weak lead than to create noisy CRM suggestions.

Return JSON only with this structure:

{
  "classification": "likely_investor_relationship | maybe_investor_relationship | not_investor_related | existing_relationship | vendor_or_service_provider | internal_or_irrelevant",
  "confidence": 0,
  "person_name": "",
  "email": "",
  "firm_name": "",
  "domain": "",
  "relationship_type": "",
  "suggested_action": "suggest_new_relationship | suggest_review | link_to_existing | ignore",
  "reason": "",
  "evidence": []
}
```

---

## User Prompt Template

```text
Review this inbound email and decide whether Tomo should suggest adding a new LP / investor relationship to the CRM.

Existing CRM match status:
{{crm_match_status}}

Existing CRM matches:
{{crm_matches}}

Email:
From: {{from}}
To: {{to}}
Cc: {{cc}}
Subject: {{subject}}
Body:
{{body}}

Remember:
- If the sender already matches the CRM, do not suggest a new relationship.
- If unknown but investor-relevant, suggest a new relationship.
- If vendor, newsletter, spam, or irrelevant, ignore.
- Return JSON only.
```

---

## Simple UI Copy

### Suggestion card title

```text
Possible new investor relationship
```

### Suggestion card body

```text
Tomo found a possible new LP relationship from this email.
```

### Example rendered card

```text
Possible new investor relationship

Sarah Lee
Northbridge Family Office
sarah.lee@northbridgefo.com

Reason:
Sender appears to represent a family office and requested the fund deck and performance materials.

Confidence: 87%

Actions:
[Add relationship] [Link to existing] [Ignore] [Not an investor]
```

---

## Mock Sample Emails for Testing

### 1. Strong LP lead

```text
From: Sarah Lee <sarah.lee@northbridgefo.com>
Subject: Intro and fund materials

Hi James,

It was good speaking earlier. Could you please send through your fund deck, latest monthly performance, and DDQ?

We are reviewing long/short equity managers for a possible allocation later this year.

Best,
Sarah Lee
Investment Director
Northbridge Family Office
```

Expected:

```text
likely_investor_relationship
suggest_new_relationship
```

---

### 2. Maybe investor lead

```text
From: Daniel Kim <daniel.kim@oakridgepartners.com>
Subject: Follow up from conference

Hi Alex,

We met briefly at iConnections last week. I would be interested in learning more about your strategy when you have time.

Regards,
Daniel
Oakridge Partners
```

Expected:

```text
maybe_investor_relationship
suggest_review
```

Reason: possible investor context, but not enough firm detail.

---

### 3. Investment consultant

```text
From: Priya Shah <priya.shah@globalconsultants.com>
Subject: Manager research request

Hi Tom,

Our manager research team is currently reviewing global macro managers for several institutional clients.

Could you send your strategy overview, AUM, monthly returns, and liquidity terms?

Regards,
Priya Shah
Senior Investment Consultant
Global Consultants
```

Expected:

```text
likely_investor_relationship
suggest_new_relationship
```

Relationship type:

```text
Investment Consultant
```

---

### 4. Vendor, should ignore

```text
From: Mark Evans <mark@fundadminpro.com>
Subject: Fund administration solution

Hi,

We help hedge funds reduce back-office costs with our fund administration platform.

Would you be open to a 20-minute demo next week?

Regards,
Mark
```

Expected:

```text
vendor_or_service_provider
ignore
```

---

### 5. Newsletter, should ignore

```text
From: Events Team <events@alternativesweekly.com>
Subject: Join our hedge fund webinar

Join us for a webinar on the future of liquid alternatives.

Register now.
```

Expected:

```text
internal_or_irrelevant
ignore
```

---

### 6. Existing CRM relationship

```text
From: Emma Wilson <emma.wilson@blueharborcapital.com>
Subject: Updated DDQ

Hi,

Please find attached our updated DDQ comments.

Regards,
Emma
```

CRM match:

```text
blueharborcapital.com already exists in CRM
```

Expected:

```text
existing_relationship
link_to_existing
```

---

## Suggested MVP Implementation Logic

```text
for each inbound_email:
  sender_email = extract sender email
  sender_domain = extract domain

  crm_match = findCRMMatch(sender_email, sender_domain)

  if crm_match is strong:
    return no new relationship suggestion

  ai_result = classifyEmailForInvestorRelationship(email, crm_match)

  if ai_result.classification in ["likely_investor_relationship", "maybe_investor_relationship"]:
    create suggestion card
  else:
    do not show suggestion
```

---

## Suggested TypeScript Types

```ts
type InvestorRelationshipClassification =
  | "likely_investor_relationship"
  | "maybe_investor_relationship"
  | "not_investor_related"
  | "existing_relationship"
  | "vendor_or_service_provider"
  | "internal_or_irrelevant";

type SuggestedAction =
  | "suggest_new_relationship"
  | "suggest_review"
  | "link_to_existing"
  | "ignore";

type RelationshipSuggestion = {
  classification: InvestorRelationshipClassification;
  confidence: number;
  person_name: string;
  email: string;
  firm_name: string;
  domain: string;
  relationship_type: string;
  suggested_action: SuggestedAction;
  reason: string;
  evidence: string[];
};
```

---

## Recommended MVP Flow

Build only:

```text
unknown inbound email
→ CRM email/domain match
→ LLM classification
→ suggestion card
→ user action buttons
```

That is enough to demonstrate the Tomo value proposition:

> Tomo reads your LP correspondence and helps keep your fundraising CRM clean and complete.

---

## Later Enhancements

After MVP, consider adding:

1. CRM write-back
2. User feedback learning
3. Better entity resolution
4. External firm/domain enrichment
5. Relationship graph detection
6. Thread-level analysis
7. Capital introduction workflow
8. Placement agent / consultant-specific handling
9. Confidence calibration from accepted/rejected suggestions
10. Separate workflows for direct LPs, consultants, gatekeepers, and service providers
