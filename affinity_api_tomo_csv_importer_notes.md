# Affinity CRM — CSV Export, TOMO Importer, and API Notes

**Status:** Implementation notes for product and engineering. Where this document differs from the normative spec, **`TOMO_V1_SRS_DRAFT_2026-05-25.md`** wins — especially **§3.4** (CRM integration), **§3.2** (onboarding), **§4.2.5** (Affinity API), and **Appendix H O-1**.

**Handoff scope:** Affinity **CSV import** (V1). The bundled mock CSVs (§E) exist only to test upload, mapping, dedupe, and validation. §C–D summarise the separate **read-only API** path for context; API work uses HTTP/JSON mocks, not additional CSV fixtures.

## Purpose

This note explains:

1. How GPs export data from **Affinity** manually to CSV.
2. How **TOMO** should implement the **Affinity CSV importer** (V1, always available).
3. (Reference) How the **Affinity native read-only API connector** fits V1 when shipped — out of scope for the bundled CSV test files.

TOMO is the **operational AI layer** for fundraising GPs. Affinity remains the **system of record** for compliance and audit on day 1. TOMO does not replace Affinity in V1.

### Developer handoff package

Ship this document together with the four mock CSV files below (repo root). They are the primary fixtures for Affinity CSV importer work in V1.

| File (repo root) | Rows | Use in tests |
|---|---|---|
| [`affinity_people_saved_view_mock.csv`](affinity_people_saved_view_mock.csv) | 10 | People / saved-view export → `lp_contacts` (+ org columns for linking) |
| [`affinity_organizations_saved_view_mock.csv`](affinity_organizations_saved_view_mock.csv) | 10 | Organization saved-view export → `lp_organizations` |
| [`affinity_opportunities_saved_view_mock.csv`](affinity_opportunities_saved_view_mock.csv) | 10 | Pipeline / opportunity list export → stage, org, contact on `lp_*` |
| [`affinity_messy_export_mock.csv`](affinity_messy_export_mock.csv) | 10 | Non-standard headers, missing Row ID, bad emails/amounts/dates |

All four files share one fictional dataset (matching emails, domains, and Affinity Row ID prefixes `aff_pr_*`, `aff_org_*`, `aff_opp_*`) so imports can be tested independently or in sequence (dedupe / linking across uploads).

**Suggested test order:**

1. `affinity_people_saved_view_mock.csv` — happy-path mapping and Affinity Row ID → `source_external_id`.
2. `affinity_organizations_saved_view_mock.csv` — org import + primary contact columns.
3. `affinity_opportunities_saved_view_mock.csv` — flat row → org + contact + pipeline stage.
4. `affinity_messy_export_mock.csv` — fuzzy headers, validation errors, optional Row ID.
5. Re-upload file (1) or (2) — saved `csv_field_mappings` and delta behaviour (§3.4 Phase 4).

---

## SRS alignment summary

| Capability | Version (per SRS) |
|---|---|
| Affinity CSV upload + fuzzy column mapping | **V1** (always) |
| Saved mapping on re-import; dedupe review queue | **V1** (§3.4 Phases 2–4) |
| Affinity **read-only** API pull + webhooks | **V1** if Affinity wins native connector sequencing vs Backstop (both may ship in V1) |
| Full field-level conflict-resolution UI | **V1.5** |
| Scheduled CSV re-ingest from email attachments | **V1.5** |
| Backstop bi-directional write-back | **V1.5+** |
| Affinity bi-directional SoR write-back + custom fields on Affinity | **V2** (O-1) |

**Onboarding (§3.2):** Screen 2 pipeline cards labelled Affinity (and all others) use **CSV / Excel upload only**. Native Affinity API key capture is **Settings → Integrations**, not the eight-screen wizard (unless a future wizard API step is added).

**API licence:** Affinity native read requires **Scale, Advanced, or Enterprise** (API access). Lower tiers use CSV.

**Sequencing:** V1 ships **at least one** read-only native CRM connector — **Affinity or Backstop, whichever engineering delivers first**. The other CRM stays on CSV until its connector lands.

---

## A. How users export CSV data from Affinity

Affinity's normal manual export flow is based on a **list view** or **saved view**.

```text
Affinity List / Saved View
        ↓
Export this view as CSV
        ↓
User receives/downloads CSV
        ↓
User uploads CSV into TOMO (onboarding screen 2 or Settings → Integrations)
```

Affinity's Help Center says users should first make sure the saved view includes the appropriate columns, then click **Export** and choose **Export view as CSV**. Affinity then sends an email/download notification with the CSV file.

Reference:
- [How to export data from Affinity](https://support.affinity.co/s/article/How-to-export-data-from-your-Affinity-lists)

### Export is view-dependent

The exported CSV is not a universal Affinity schema. It depends on:

1. Which list the user exports from.
2. Which saved view they use.
3. Which columns are included in that view.
4. Which filters/sorts are applied to that view.
5. The user's permissions and workspace settings.

Two GPs exporting from Affinity may produce CSVs with very different column headers. TOMO's Affinity dictionary and fuzzy matcher (Levenshtein + token-set ratio per §3.4) must handle this.

### Export is generally one list/object type at a time

| Affinity export source | Primary row semantics | TOMO target (fundraising model) |
|---|---|---|
| People list / saved view | Person / contact row | `lp_contacts` (+ link to `lp_organizations` when org columns present) |
| Organization list / saved view | Company / org row | `lp_organizations` |
| Opportunity / pipeline list / saved view | List-entry or opportunity-shaped row | Map **pipeline stage**, **tier**, list membership, and related org/contact columns onto `lp_contacts` / `lp_organizations` — not a separate generic “deals” product surface in V1 |

A CSV exported from an Opportunity or pipeline list may still contain related organization or person columns. Treat the **primary row** according to the list type, then create or link related `lp_*` records where columns allow.

### Affinity Row ID

Affinity's CSV export may include an **Affinity Row ID** column (used when re-importing into Affinity).

For TOMO, store it when present as **`source_external_id`** on the ingested record, with:

- `source = 'crm_csv'` on `lp_contacts` / `lp_organizations` (and related tables as applicable)
- `csv_imports.source_crm = 'affinity'`
- `crm_sync_status.source = 'csv_affinity'` for sync health

Do **not** require Affinity Row ID:

- not every export includes it;
- users may rename or drop columns;
- some uploads are hand-prepared spreadsheets.

Import-run metadata (filename, uploader, timestamp) belongs on **`csv_imports`**, not ad-hoc per-row `source_*` fields.

Reference:
- [How to import by Affinity Row ID](https://support.affinity.co/s/article/How-to-import-by-Affinity-Row-ID)

### Manual export caveats

- The CSV reflects the selected saved view only.
- Include desired columns before exporting.
- Some enriched third-party fields (e.g. Crunchbase) may be excluded from CSV even if visible in Affinity.
- Enterprise/admin settings may restrict export access.
- **Notes** export is a separate workflow — do not treat it like People / Organizations / pipeline list imports.

Reference:
- [How to export data from Affinity](https://support.affinity.co/s/article/How-to-export-data-from-your-Affinity-lists)

---

## B. TOMO Affinity CSV importer (V1)

The CSV path supports GPs who **do not** have Affinity API access (lower licence tiers) or who prefer export/upload. It is the **universal baseline** and matches onboarding screen 2 for the Affinity-labelled card (`crmCsvLabel='affinity'`).

SRS defines **five phases** (§3.4). The flow below maps to them.

### Phase 1 — Upload and column mapping

**Entry points:** onboarding screen 2 (all pipeline cards); re-upload via **Settings → Integrations** or Today review queue.

**Upload validations (recommended):**

- UTF-8-compatible CSV (Excel upload supported in wizard mock).
- Header row present.
- Duplicate headers renamed internally or rejected with a clear error.
- Empty rows ignored.
- Preview first 10–50 rows before commit.
- User can cancel before writing `lp_*` rows.

**Column mapping (Phase 1):**

1. Parse headers.
2. Auto-map via fuzzy match against TOMO's dictionary for `source_crm = 'affinity'` (and generic fallback).
3. Surface ambiguous mappings (typically a handful per export) for GP confirmation.
4. Persist policy to **`csv_field_mappings`** per workspace; tag `source_crm = 'affinity'`.

Example mapping UI:

```text
CSV Column                TOMO field (lp_* / import target)
------------------------------------------------
Full Name                 lp_contacts.display_name
Organization Name         lp_organizations.name
Primary Email             lp_contacts.primary_email
Stage                     lp_contacts.pipeline_stage
Tier                      lp_contacts.tier
Affinity Row ID           source_external_id (on commit)
```

**Features:**

- Auto-suggest mappings; GP can override, ignore columns, or map to custom destinations where supported.
- Flag missing required mappings.
- Row preview after mapping.

**Header detection hints** (non-exhaustive; fuzzy match must handle variants):

| Detected headers | Likely import shape |
|---|---|
| `Full Name`, `First Name`, `Last Name`, `Email`, `Job Title` | People → `lp_contacts` |
| `Organization Name`, `Company Name`, `Domain`, `Website`, `Industry` | Organizations → `lp_organizations` |
| `Opportunity Name`, `Stage`, `Status`, `Amount`, pipeline custom columns | Pipeline / list row → stage, tier, org, contact columns on `lp_*` |

| Uploaded column variant | Typical TOMO target |
|---|---|
| `Company`, `Organization`, `Organisation`, `Account` | `lp_organizations.name` |
| `Website`, `Domain`, `Company Domain` | `lp_organizations.domain` |
| `Contact`, `Person`, `Primary Contact`, `Full Name` | `lp_contacts` name fields |
| `Email`, `Primary Email`, `Contact Email` | `lp_contacts.primary_email` |
| `Stage`, `Status`, `Deal Stage`, `Opportunity Stage` | `lp_contacts.pipeline_stage` |
| `Tier`, `Priority`, `Segment` | `lp_contacts.tier` (where applicable) |

Reference (CSV hygiene):
- [Cleaning up your data before importing into Affinity](https://support.affinity.co/s/article/Cleaning-up-your-data-before-importing-into-Affinity)

### Phase 2 — Deduplication

Match incoming rows to existing records (§3.4 Phase 2):

| Entity | Priority ladder |
|---|---|
| `lp_contacts` | Exact `primary_email` → `name + lp_organizations.domain` → fuzzy name + firm |
| `lp_organizations` | Domain first → normalized company name |

Ambiguous matches go to **`csv_dedupe_decisions`** with `decision = 'pending'` for GP review. **Do not auto-merge** (AC-3.4.5).

Flat opportunity-style rows should still resolve org + contact links using the same ladder when email or domain is present.

### Phase 3 — Field-level conflict resolution (V1 light)

Per-field policy on re-import or overlapping sources:

| Field class | V1 policy |
|---|---|
| Factual (firm, address, phone) | CRM / CSV source wins |
| TOMO-derived (signals, behavioural attributes) | TOMO wins |
| Ambiguous (tier, stage, mandate fit) | GP decides via review UI |

V1 ships **text-only** review; richer Phase 3 UI is **V1.5**.

### Phase 4 — Ongoing CSV sync

- Re-upload applies saved **`csv_field_mappings`** automatically (banner: “Using same mapping as last time” — BR-3.4.1).
- Typical delta: 5–20 changed records; surface only those (AC-3.4.2).
- V1: GP-initiated re-upload only (no scheduled email-attachment ingest until V1.5).

### Phase 5 — Provenance

On commit:

- Write `lp_organizations` / `lp_contacts` with `source = 'crm_csv'` and `source_external_id` when Affinity Row ID (or other stable external id) is mapped.
- Log `csv_import_completed` and per-record create/update in **`activity_log`**.
- Update **`crm_sync_status`** for `csv_affinity`.
- LP card shows provenance on hover, e.g. “Imported from Affinity CSV · 3 Apr · GP-edited tier on 14 Apr” (AC-3.4.6).

### SRS business rules to implement (CSV)

| Rule | Requirement |
|---|---|
| BR-3.4.4 | **`prior_fund_investor`** and **`prior_fund_identifier`** — map from CSV column if present, else post-import tagging step. Required for re-up cohort filterability. |
| BR-3.4.5 | **`expected_commitment_amount`** — **do not** auto-import from CSV; capture via post-meeting flow or LP card chat. |
| BR-3.4.2 | TOMO is not a CRM replacement; do not enforce Affinity field-format parity. |

### Relational import from flat CSV

Example pipeline / opportunity-shaped row:

```text
Opportunity Name: Series A - ExampleCo
Organization Name: ExampleCo
Primary Contact: Sarah Lee
Primary Contact Email: sarah@exampleco.com
Stage: Due Diligence
```

Suggested TOMO result:

```text
lp_organizations: ExampleCo
lp_contacts: Sarah Lee <sarah@exampleco.com> (linked to org)
lp_contacts.pipeline_stage: Due Diligence (from Stage column)
```

Do not assume a separate V1 “deals” entity unless product explicitly adds one; fundraising pipeline state lives on **`lp_contacts`** (and org-level fields where appropriate).

---

## C. TOMO Affinity native API connector (V1 read-only, when shipped)

When Affinity is the **first** (or co-shipped) native CRM connector, TOMO performs a **read-only, one-way pull** — not a one-shot “import wizard” like CSV.

### Auth and UX

1. GP pastes Affinity API key (bearer) in **Settings → Integrations**.
2. Validate with `GET /v2/auth/whoami`.
3. Store in **`oauth_tokens`** (`provider = 'affinity'`), encrypted (Supabase Vault).
4. Onboarding wizard remains **CSV-only** for the Affinity card unless a future API step is added.

### Initial pull (entity endpoints)

Paginated reads (v2 unless noted):

| Affinity endpoint | Maps to |
|---|---|
| `/v2/persons` | `lp_contacts` |
| `/v2/companies` | `lp_organizations` |
| `/v2/lists`, `/v2/lists/{id}/list-entries` | List membership / pipeline fields on `lp_*` |
| `/v2/opportunities` | Pipeline-related fields where GP uses opportunities |
| `/v1/persons/{id}/interactions` | `lp_interactions`, `lp_email_threads` where v2 unavailable |

Persist with `source = 'affinity_api'` and `source_external_id` set. Target: full pipeline populated within **~5 minutes** at FC scale (AC-3.4.3).

### Incremental sync (webhooks)

- Use **1** of Affinity's **3** webhook subscription slots.
- Subscribe (v1): `person.updated`, `organization.updated`; also handle `list-entry.created/updated/deleted` per §4.2.5.
- Inbound: `POST /api/webhooks/affinity` (HMAC verification).
- Apply updates with last-write-wins; target **≤ 60 seconds** from delivery (AC-3.4.4).

### List / field discovery (pipeline-specific data)

Affinity is field-driven. List-specific and opportunity fields often require list-entry calls with explicit `fieldIds` / `fieldTypes`.

```text
1. GET /v2/lists
2. Identify relevant fundraising / LP pipeline lists (GP config or heuristics)
3. GET /v2/lists/{listId}/fields (or equivalent metadata)
4. GET /v2/lists/{listId}/list-entries?fieldIds=...
5. Map field values onto lp_contacts / lp_organizations / pipeline columns
```

This complements — does not replace — direct **Persons** / **Organizations** / **Interactions** pulls.

References:
- [The Basics](https://developer.affinity.co/pages/data-model/the-basics)
- [Working with Field Data](https://developer.affinity.co/pages/data-model/working-with-field-data)

### Smart fields and custom fields (V1)

- **Smart fields:** read-only in Affinity; TOMO may store values in `lp_contacts.notes` or JSONB for context — not surfaced as first-class TOMO fields in V1.
- **TOMO custom fields on Affinity** (`tomo_signal_flag`, etc.): **not provisioned in V1** (write-back is V2).
- **`affinity_field_mappings`:** schema ships in V1 migration **empty**; used when bi-directional sync lands in V2.

### API vs CSV

| Method | Best for | V1 behaviour |
|---|---|---|
| CSV upload | All tiers; onboarding; one-off exports | Five-phase pipeline; `source = 'crm_csv'` |
| Native API | Scale+ tiers; continuous freshness | Read-only sync + webhooks; `source = 'affinity_api'`; **no SoR writes** |

Rate limit (documented by Affinity): ~900 requests/user/minute — sufficient for Founding Circle scale.

---

## D. Affinity API data model (reference)

| Affinity concept | Spreadsheet analogy |
|---|---|
| List | Sheet |
| List Entry | Row |
| Field | Column |
| Field Value | Cell |

Useful when implementing the read-only API connector (§C); not required for CSV import tests.

---

## E. Mock CSV fixtures (bundled with this handoff)

Four fixtures at the **repository root** (same directory as this file). Use for unit tests, integration tests, and manual upload QA against §3.4 **only**.

### `affinity_people_saved_view_mock.csv`

**Shape:** Affinity People list / saved-view export (10 rows).

**Headers (actual):** `Affinity Row ID`, `Full Name`, `First Name`, `Last Name`, `Primary Email`, `Additional Emails`, `Phone`, `Job Title`, `Organization Name`, `Organization Domain`, `Location`, `LinkedIn URL`, `Owner`, `Status`, `Tags`, `Source`, `Relationship Strength`, `Total Interactions`, `Last Interaction Date`, `Last Contacted`, `Next Step`, `Notes`.

**Maps to:** `lp_contacts` (+ link to `lp_organizations` via org name / domain).

**Notable rows:** `aff_pr_0004` (James O'Connor — apostrophe in name); `aff_pr_0006` (notes mention API + CSV); multiple `Additional Emails`.

**Importer focus:** fuzzy map `Primary Email` → `primary_email`; `Status` is Affinity CRM status (not necessarily TOMO `pipeline_stage` — stage may come from opportunities file).

---

### `affinity_organizations_saved_view_mock.csv`

**Shape:** Affinity Organization list export (10 rows).

**Headers (actual):** `Affinity Row ID`, `Organization Name`, `Organization Domain`, `Website`, `Industry`, `Company Type`, `Location`, `Employee Count`, `LinkedIn URL`, `Owner`, `Status`, `Tags`, `Source`, `Relationship Strength`, `Total Interactions`, `Last Interaction Date`, `Last Contacted`, `Primary Contact`, `Primary Contact Email`, `Open Opportunities`, `Latest Opportunity Name`, `Latest Opportunity Stage`, `Notes`.

**Maps to:** `lp_organizations`.

**Notable rows:** `aff_org_0005` / `aff_org_0008` — zero open opportunities, empty latest opportunity fields; primary contact columns for cross-linking to people file.

---

### `affinity_opportunities_saved_view_mock.csv`

**Shape:** Affinity Opportunity / pipeline list export (10 rows).

**Headers (actual):** `Affinity Row ID`, `Opportunity Name`, `Opportunity Stage`, `Status`, `Amount`, `Currency`, `Expected Close Date`, `Probability`, `Owner`, `Organization Name`, `Organization Domain`, `Primary Contact`, `Primary Contact Email`, `Source`, `Tags`, `Last Contacted`, `Next Step`, `Next Step Due Date`, `Relationship Strength`, `Total Interactions`, `Created Date`, `Closed Date`, `Lost Reason`, `Notes`.

**Maps to:** pipeline fields on `lp_contacts` / org linkage — not a separate V1 “deals” entity (§B).

**Notable rows:** `aff_opp_0010` — Closed Lost with `Lost Reason` and `Closed Date`; stages such as `Demo Scheduled`, `Discovery`, `Negotiation` (Affinity labels — map to TOMO `pipeline_stage` via dictionary, not 1:1 enum names).

**SRS note:** `Amount` is vendor-style deal size in the fixture; do **not** auto-map to `expected_commitment_amount` (BR-3.4.5) unless the GP explicitly maps it.

---

### `affinity_messy_export_mock.csv`

**Shape:** Deliberately irregular single-list export (10 rows). Same fictional orgs/contacts as the clean files where IDs align (`aff_mix_*`).

**Headers (actual):** `Affinity Row ID`, `Company`, `Organisation`, `Website / Domain`, `Contact`, `Email`, `Phone`, `Deal`, `Stage`, `Deal Value`, `Owner(s)`, `Last touched`, `Next step`, `Tags`, `Notes`.

**Exercises:**

| Row | Scenario |
|---|---|
| `aff_mix_0002` | Multiple emails and owners (`;`) |
| `aff_mix_0003` | **Missing** Affinity Row ID |
| `aff_mix_0004` | `Organisation` vs `Company`; https domain |
| `aff_mix_0005` | No deal name or amount (nurture-only) |
| `aff_mix_0006` | Multiple emails; mixed date format |
| `aff_mix_0008` | Invalid email; text amount (`twenty two thousand`) |
| `aff_mix_0009` | `$30,000.00` currency formatting |

**Importer focus:** fuzzy header variants (`Deal Value` vs `Amount`, `Company` vs `Organization Name`); validation and dedupe without silent merge.

---

### Shared dataset (cross-file)

| Organization | Domain | Example person | People ID | Org ID | Opp ID |
|---|---|---|---|---|---|
| Northstar Ventures | northstarventures.com | Sarah Chen | aff_pr_0001 | aff_org_0001 | aff_opp_0001 |
| Harbour Capital | harbourcapital.co | Michael Tan | aff_pr_0002 | aff_org_0002 | aff_opp_0002 |
| Kernel Ventures | kernelventures.sg | Ravi Menon | aff_pr_0008 | aff_org_0008 | aff_opp_0010 (Closed Lost) |

Use this table to verify dedupe and linking when uploading people, then orgs, then opportunities (or messy only).

---

### Coverage checklist (map tests to files)

| # | Scenario | Primary file(s) |
|---|---|---|
| 1 | Type / shape detection from headers | All four; especially messy |
| 2 | Fuzzy column mapping + ambiguous columns | Messy; people |
| 3 | `csv_field_mappings` reuse on re-upload | People or organizations (upload twice) |
| 4 | Dedupe → `csv_dedupe_decisions` (no auto-merge) | People (duplicate email across uploads) |
| 5 | Flat row → org + contact + stage | Opportunities; messy |
| 6 | Affinity Row ID → `source_external_id` | People, orgs, opps; messy row without ID |
| 7 | Provenance on LP card | Any clean import (`source = crm_csv`) |
| 8 | `prior_fund_investor` / Tier (SRS BR-3.4.4) | Not in current fixtures — add columns to a future Affinity CSV revision if needed |

**Fixture limitation:** Stages in the opportunity file use Affinity-style labels (`Discovery`, `Demo Scheduled`, etc.). Importer tests should verify **mapping**, not assume 1:1 match to TOMO `pipeline_stage` enums until a dictionary maps them.

**Optional fixture extension** (same four files, extra columns):

```text
Tier, Pipeline Stage, prior_fund_investor, prior_fund_identifier
```

Example SRS-aligned values: `tier_1`, `active_diligence`, `true`, `Fund II`.

---

## F. Schema cross-reference (SRS §6)

| Concept | TOMO storage |
|---|---|
| Import run | `csv_imports` (`source_crm = 'affinity'`) |
| Saved column map | `csv_field_mappings` (`source_crm = 'affinity'`) |
| Dedupe queue | `csv_dedupe_decisions` |
| Sync health | `crm_sync_status` (`csv_affinity` or `affinity_api`) |
| Record provenance | `lp_contacts.source`, `lp_contacts.source_external_id` (same on `lp_organizations`, etc.) |
| API credentials | `oauth_tokens` (`provider = 'affinity'`) |
| Future write-back maps | `affinity_field_mappings` (V2 placeholder, empty in V1) |

---

## Practical recommendation (CSV import)

1. Implement §B against **`TOMO_V1_SRS_DRAFT_2026-05-25.md` §3.4** (AC-3.4.1–AC-3.4.6).
2. **Test uploads** with the four `affinity_*_mock.csv` files in §E only.
3. Treat onboarding screen 2 and Settings → Integrations as entry points (§3.2).
4. Build the read-only API connector (§C) separately when scheduled — not part of this CSV handoff.
