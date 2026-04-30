# Email & Calendar Ingestion Strategy (Tomo MVP)

## Recommendation

Three-tier ingestion with progressive sync at onboarding so the GP gets a working product within minutes while deeper backfill runs in the background.

### Tier 1 — Full Content (0–12 months)
- Full email body + metadata
- Stored as **hot store**
- Powers:
  - V1 signal computation
  - Draft generation
  - LP thread context
- Forward-compatible with NLP (V3)

### Tier 2 — Metadata Only (13–36 months)
- Includes:
  - Sender / recipient
  - Timestamp
  - Subject
  - Word count
  - Thread ID
  - Direction
  - Attachment count
- No body text
- ~95% smaller storage footprint
- Enables:
  - Re-up detection
  - Historical relationship scoring
  - Day 1 Gap denominator

### Tier 3 — No Data (>36 months)
- No ingestion
- Users rely on email client if needed

---

## Key Outcomes

- **Cost discipline** → body storage capped at 12 months  
- **Signal credibility** → all V1 signals use full content  
- **Demo parity** → multi-year ingestion comparable to competitors  
- **Fast onboarding** → Day 1 Gap within ~2 minutes  

---

## Surfacing Logic

### Active vs Dormant LPs

- **≤ 12 months since meaningful touch**
  - Shown in active pipeline

- **12+ months**
  - Only shown if:
    - `prior_fund_investor = true` (re-up cohort)
    - `re_engagement_flag = true`

- Otherwise:
  - Moved to **Dormant bucket**
  - Counted but not surfaced

---

## Changes to Existing Spec

Replace:
> "Sync covers at least 90 days of history on initial connection"

With:
> Three-tier ingestion model

---

# SRS Specification

## Section: Email & Calendar Ingestion

### Initial Sync

System shall ingest:

#### 1. Full Content Tier (0–12 months)
- Full body
- Headers
- Attachments metadata
- Thread IDs
- Direction (inbound/outbound)

Stored in:
- `lp_interactions` (with body)

---

#### 2. Metadata Tier (13–36 months)
- Sender
- Recipients (TO/CC)
- Timestamp
- Subject
- Word count
- Thread ID
- Direction
- Attachment count

Stored as:
- `body_text = null`
- `metadata_only = true`

---

#### 3. No ingestion >36 months

---

## Onboarding Sync Sequence

System executes:

1. **CRM import**
   - Populates:
     - `lp_contacts`
     - `lp_organizations`

2. **Most recent 90 days (full content)**
   - Completes within 2 minutes

3. **Day 1 Gap computation**
   - Blocks onboarding screen until complete

4. **Months 4–12 (full content)**
   - Background
   - Completes within 30 minutes

5. **Months 13–36 (metadata only)**
   - Background
   - Completes within 2 hours

---

## Ongoing Sync

- Uses webhook subscription (e.g. Nylas)
- New events:
  - Always stored as full content
- Retention rules:
  - Only apply to initial historical ingestion

---

## Surfacing Rules

### Default UI

- `days_since_meaningful_touch <= 180`
  → Active pipeline

- `181–365`
  → Only via "Dormant" filter

- `>365`
  → Only if:
  - `prior_fund_investor = true`
  - `re_engagement_flag = true`
  - Explicit search

---

### Metadata-only LPs

- Flag:
  - `historical_data_only = true`

- Draft generation:
  - Use cautious tone (no full context)

---

## Storage & Cost Engineering

- Full content:
  - Stored in Supabase
  - Indexed for full-text search

- Metadata-only:
  - ~5% storage footprint

---

## Signal Constraints

- NLP signals:
  - **NOT allowed on metadata-only tier**
  - Reserved for V3

---

## Acceptance Criteria

- GP with 1,000 emails/month:
  - Day 1 Gap visible within 2 minutes

- GP with 500 contacts:
  - Re-up cohort identified within 2 hours

- Storage rules enforced:
  - No full-body emails >12 months
  - No emails at all >36 months
