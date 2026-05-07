# TOMO V1 — CRM Integration Reference

**Audience:** PM and engineering. Reference document, not narrative.
**Purpose:** Specify how V1 handles each CRM source for the Founding Circle cohort, with build effort, dependencies, **V1 / V1.5 / V2** sequencing (Backstop write-back is **V2**), and **customer adoption** (parallel mode before SoR mutation — see dedicated section).
**Status:** Source document for SRS — drop sections into the SRS as appropriate.

---

## Founding Circle CRM landscape

Twelve Founding Circle members across five CRM sources. Integration effort is not evenly distributed.

| CRM source | FC count | V1 integration | Build effort | V1.5 / future |
|---|---|---|---|---|
| Affinity | 1 | API (REST v2) — bi-directional sync | 2.5–3 weeks | – |
| Backstop | 3 | **V1 (MVP):** CSV import at onboarding + GP-initiated re-upload. | Reuses generic CSV pipeline | **V1.5 (candidate):** licensed API **pull** only (automated, same semantics as CSV). **V2:** scheduled **write-back** + post-update reporting. |
| Foliometrics | 2 | CSV import at onboarding + manual quarterly re-import | Reuses generic CSV pipeline | Deferred — no public API exists |
| HubSpot | uncertain (within "Others" bucket of 6) | API (REST) | 1.5 weeks | Same as Affinity pattern |
| Google Sheets / Excel / generic | remainder of 6 | CSV import at onboarding + GP-initiated re-import | Reuses generic CSV pipeline | None — manual workflow |

**MVP note:** **Mode A** default ingest is **CSV** for all CRMs including Affinity. **Affinity:** API **read** + webhooks remain **optional in Mode A** for clients who want automation without SoR writes. **Backstop:** **CSV for V1 (MVP)** unless and until licensed API **pull** ships (V1.5) — still **Mode A** if write-back is off.

V1 build totals roughly 5–6 weeks of engineering for the import pipeline plus 2.5–3 weeks for the Affinity API integration (bi-directional). The HubSpot integration can be deferred to V1.5 if engineering capacity is constrained — the HubSpot users in the Others bucket can use the CSV path in the interim.

---

## Strategic positioning — why this scope, not more

This is the single most important framing for engineering. Without it, the team will over-engineer the CSV reconciliation and under-prioritise the user-facing experience.

**TOMO V1 is not positioned as a CRM replacement.** It is positioned as the operational AI layer that sits *alongside* the GP's existing CRM. Backstop, Foliometrics, Affinity, etc. remain the system of record for compliance, audit trail, and regulatory documentation. TOMO is what the GP opens in the morning to figure out what to do.

This positioning has direct engineering implications:

- We do not need to maintain bi-directional real-time sync with most CRMs. CRM is read-mostly at onboarding, with periodic re-sync going forward. **Affinity is the V1 technology exception** — we build **full bi-directional API capability** for the showcase path (read + webhooks + write-back to custom fields). **Commercially and operationally**, many clients will still **start in parallel mode** (SoR writes disabled) per *Customer adoption path* above; only after diligence do they enable write-back (sandbox first where possible, then production).
- We do not need to support every field in every CRM schema. We support the fields that drive TOMO's signal layer plus the fields the GP needs to make sense of an LP record.
- We do not need to handle compliance-grade audit trails of every change. The CRM does that. TOMO maintains its own activity log for TOMO-driven changes.
- Conflict resolution between TOMO and CRM does not need to be automatic. GP-mediated resolution via the AI input chat is sufficient and arguably more correct.

If during build a question arises that begins "for proper CRM parity we'd also need to..." — the answer is almost certainly that we don't need to in V1.

---

## Customer adoption path — parallel mode before SoR mutation

In practice, most institutions will **not** allow TOMO (or any vendor) to **mutate** their CRM **system of record** on day one. Legal, COO / COO-delegated ops, and IT diligence routinely require **running TOMO in parallel** first: ingesting **snapshots** into TOMO (**default: manual CSV export / upload**), full product value (Today, signals, drafts, captures) in TOMO, **while the CRM receives no writes from TOMO** until the client explicitly promotes to **B** or **C**.

**Product implication — workspace-level SoR modes (conceptual):**

| Mode | CRM reads (into TOMO) | CRM writes (from TOMO) | Typical duration |
|---|---|---|---|
| **A — Parallel (shadow)** | **Default:** **manual CSV snapshot** (export from SoR → upload into TOMO; re-upload on cadence). **Affinity exception:** **optional** API-based ingest when an API key is available — initial pull + webhooks for incremental read (**automated pull** / live read path is optional, not required for Mode A). **Backstop (post-MVP):** optional licensed API **pull** (V1.5) is still Mode A if **only** reads are automated — same snapshot semantics as CSV. | **Off.** No write-back to SoR; no CRM mutation from TOMO (including custom-field provisioning on production SoR if policy defers that until B/C). TOMO is the operational layer only. | Weeks to months; client-defined. |
| **B — Sandbox write-back** | On (same ingest choices as A, typically already proven) | On, but credentials + base URL target **vendor sandbox / UAT / test workspace** only. Same code paths as production write-back; different tenant. | Until COO / Ops signs off on audit samples and reports. |
| **C — Production write-back** | On | On against **live** SoR. Requires explicit admin toggle + client sign-off + **post-update reporting** (*Post-update reporting — write-back runs* in this document). | Steady state. |

If the client’s system of record has **no** suitable API for automated write-back (including licensed API not in procurement scope), **discuss with the client** how write-back—or an agreed substitute such as file-based handoff, manual SoR updates, or remaining in parallel mode—**would work** before committing to Mode **B** / **C** scope and timelines.

**Consistency rule:** **Mode A** = parallel run with **no SoR writes from TOMO.** The **default** snapshot mechanism is **manual CSV** for all CRMs. **Affinity** may additionally use **API read + webhooks** (optional automation) while staying in Mode A. **B** and **C** are unchanged: **B** = validate writes in sandbox; **C** = writes to production SoR. Typical path: **A** (CSV, plus optional Affinity API read) → **B** → **C**.

**Planning changes vs a “flip write-back on immediately” roadmap:**

- **Engineering:** Implement write-back as **feature-flagged and environment-aware from the first merge** (mode A/B/C per workspace, not a separate fork). Parallel mode must be a **first-class config**, not “we simply don’t call the API.”
- **Onboarding / PS:** Default contract and runbooks should assume **Mode A** until the client requests promotion; **Mode B** when the vendor offers a sandbox; **Mode C** only after written acknowledgment (who owns errant writes, reconciliation cadence, rollback).
- **Affinity (showcase):** Full **bi-directional capability** can still ship in V1, but **many clients (including risk-averse FC members)** should be expected to stay in **Mode A** for a qualification period, then **B** if Affinity provides a non-prod workspace, then **C**.
- **Backstop:** **Mode A** is **CSV snapshot** in MVP; **V1.5** optional API **pull-only** is still **Mode A** (automated snapshot, no write-back). **V2 write-back** uses **B → C promotion** as part of definition of done, not as an afterthought.
- **Interim without any write-back:** GP uses TOMO for execution; to refresh SoR they continue **manual** export/import or copy-paste. Optional: TOMO-generated **CSV aligned to CRM import templates** (already planned for Backstop) supports parallel mode without API writes.

**Minimum bar before Mode C (recommendation for PM / Legal to lock):** documented reconciliation report reviewed on at least one full cycle in **B** (or confirmed waivable if vendor has no sandbox — then extended **A** + manual validation only), named internal approver (e.g. COO / Head of IR), and incident / disable path (turn off write-back without uninstalling TOMO).

---

## Integration spec by CRM source

### Affinity

**Integration mode:** REST API, bearer auth, **bi-directional sync capability in V1** (read + webhooks + write-back). The Affinity FC member is the showcase cohort for the deepest integration. **Rollout is customer-gated:** **Mode A** for Affinity is usually the same **manual CSV snapshot** as other CRMs; **optionally**, the GP connects an API key so TOMO can do **automated read** (initial pull + webhooks) while remaining in Mode A. **Write-back** (custom fields, notes, list entries) runs only in **Mode B or C** — never in A. See *Customer adoption path — parallel mode before SoR mutation*.

**Parallel mode / Mode A (Affinity):** **Either** CSV import only **or** API key + read path + webhooks **on** (optional automation); in both cases all **write** endpoints **disabled** in TOMO. TOMO-derived fields exist only inside TOMO until B/C. GP may use CSV round-trip to Affinity regardless of whether API read is on.

**API documentation:** `developer.affinity.co` (v2) and `api-docs.affinity.co` (v1). v2 is preferred for read endpoints. Webhooks specifically still require v1. Field-update endpoints exist on both; v2's field-update endpoint is preferred where available.

**Authentication:** API key generated by GP from Affinity Settings → Manage Apps. Bearer token in HTTP header. We pass the key with every request. V2 supports IP allowlisting if any GP requires it.

**Rate limits:** 900 requests per user per minute (per-minute cap). Monthly cap depends on Affinity plan tier — Scale, Advanced, and Enterprise tiers all have API access; lower tiers do not. For a typical FC GP with 100–300 LPs, daily bi-directional sync consumes well under 5% of monthly allowance even with frequent push-back writes. Not a binding constraint.

**Endpoints we use:**

*Read (initial pull and webhook-driven updates):*
- Persons (GET) — LP contacts
- Organizations (GET) — LP firms
- Lists and List Entries (GET) — saved lists from the GP's Affinity workspace
- Opportunities (GET) — deal records if the GP uses them
- Interactions (GET) — historical email and meeting metadata
- Webhooks (subscribe to person and organization events) — for incremental sync

*Write (TOMO push-back to Affinity):*
- Field Values (POST, PUT) — write TOMO-derived values to Affinity custom fields
- Notes (POST) — write post-meeting summaries from TOMO's capture flow back to Affinity as notes
- List Entries (PUT) — update tier and status fields on the GP's relevant Affinity lists

**TOMO fields written back to Affinity (V1 scope):**
- `tomo_signal_flag` — current G/A/R flag value (custom field on Affinity persons)
- `tomo_signal_evidence` — one-sentence behavioural read in plain English (custom field, text)
- `tomo_days_since_meaningful_touch` — numeric (custom field)
- `tomo_last_meaningful_touch_at` — date (custom field)
- `tomo_tier_correction` — when the GP changes tier in TOMO via the AI input chat, the corrected tier writes back (custom field, dropdown)
- `tomo_post_meeting_note` — when the GP completes the post-meeting capture flow in TOMO, the structured note writes back to Affinity as a Note record on the LP

**Custom field provisioning:** **Mode B/C (or manual GP setup in A):** During rollout, TOMO creates the six custom fields above on the GP's Affinity workspace via API **when write-back is permitted** (or, if the GP's Affinity license restricts custom field creation, surfaces a one-time setup step where the GP creates them manually with TOMO's guidance). If **Mode A** treats **any** API mutation of Affinity (including field creation) as out-of-scope, **defer API provisioning** until B/C and rely on CSV import + manual field setup per Document B screens 3–4.

**Webhook constraint:** Affinity allows max 3 webhook subscriptions per Affinity instance. We use one of those slots. If the GP has another tool consuming webhooks, this is a coordination point.

**Smart fields (read-only):** Affinity's Smart Fields (relationship strength score, last interaction, etc.) cannot be modified via API — they're computed by Affinity. We can read them but not write them. Useful for enriching TOMO's view of the LP; not affected by our push-back logic.

**Conflict handling — TOMO and Affinity disagree:**
- Affinity is authoritative for fields the GP edits manually in Affinity (firm name, address, phone, formal title, organisation membership, list membership).
- TOMO is authoritative for the six TOMO-prefixed fields above.
- For overlap fields (tier, stage, mandate fit) where the GP could edit either system: **last-write-wins by timestamp**, with the AI input chat surfacing any divergence at the LP card level. Example: *"Affinity shows Peter as Tier 2; TOMO has him as Tier 1 since your March 14 update. Keep TOMO's value, accept Affinity's, or reconcile?"*

**Build sequence:**
1. OAuth-style API key entry flow in onboarding (GP pastes key from Affinity into TOMO) — **optional in Mode A** when the GP uses **CSV snapshot only**; **required** for API read + webhooks path.
2. Workspace **SoR integration mode** (parallel / sandbox write-back / production write-back) — **parallel must be default** for conservative rollouts; writes blocked unless mode permits.
3. Custom field provisioning (create the six TOMO fields on Affinity) — may be **deferred** until client exits parallel mode if fields are considered “writes” to production; alternative: provision in a **sandbox** Affinity instance first (client-dependent).
4. Initial pull of Persons, Organizations, Lists, Interactions (single batch, paginated)
5. Webhook subscription registration (v1 endpoint)
6. Webhook handler for incoming Affinity-side events
7. Push-back service for TOMO-derived field values (signal observations, behavioural flags, tier corrections)
8. Notes push-back from TOMO post-meeting capture
9. Conflict-detection layer for overlap fields with timestamp-based resolution

**Path split:** *CSV-only Mode A* — skip steps **1** and **4–6**; use the generic CSV pipeline for all snapshots. *API read in Mode A* — run **1** and **4–6** for automated pull + webhooks; **7–8** remain off until **B/C**. *Write-back (B/C)* — enable **7–8** per workspace mode.

**V1 ships:** items 1–9. **Mode A** may use **CSV only** (no API) or **API read + webhooks** when the client opts in. **Write path** (7–8) **honours workspace mode** — in Mode A, writes are suppressed and optionally surfaced as *“Preview only — SoR not updated”* in UI. When write-back is enabled (B/C), the GP can edit a tier in TOMO and see it reflected in Affinity within seconds; can update a firm name in Affinity and see it reflected in TOMO on the next webhook event (if API read is on).

**V1.5 adds:** richer write-back patterns (e.g. write TOMO's pipeline state changes as Affinity Opportunity stage transitions), if the Affinity GP demonstrates demand. None planned at V1.

**Sales note for engineering context:** the Affinity GP is the showcase customer in the FC and the deepest integration we ship in V1. Time-to-value in **Mode A** is immediate from **CSV upload**; optional API read reduces manual re-export friction. *"TOMO’s intelligence in Affinity fields"* is a **Mode C** story after the client is comfortable — still differentiated versus competitors who only ingest one-way, without forcing every prospect to accept SoR writes on day one.

---

### Backstop

Backstop remains the **system of record** for compliance, audit trail, and regulatory documentation. TOMO is the operational layer: day-to-day work, signals, and drafts happen in TOMO; Backstop must eventually reflect **verified** outcomes so the CRM audit trail stays complete. There is **no CRM migration** narrative — coexistence only.

#### Roadmap (sequenced)

| Phase | Scope | Notes |
|---|---|---|
| **V1 (MVP)** | **CSV upload** for CRM snapshot into TOMO. | Valid for GPs whose data lives in **Backstop** (export → upload) or who supply an **Affinity** (or other) export via the same generic CSV pipeline. MVP does not require Backstop API licensing. |
| **V1.5 (candidate)** | **Licensed Backstop REST API — automated pull only.** | Fetches the same conceptual payload as a CSV export and runs it through the **generic CSV pipeline** (column mapping, dedupe, conflict policy, provenance). The only difference vs MVP is **automation** (scheduled job replaces manual export/upload). Optional: scheduled **email-attachment** CSV (Pattern B) remains a separate, file-based automation path that does not require the API tier. |
| **V2** | **Licensed Backstop REST API — scheduled write-back** from TOMO to Backstop **plus post-update reporting.** | TOMO continues to hold operational truth for day-to-day work; write-back pushes **GP-confirmed / TOMO-verified** artefacts on a schedule (see below). **Not in V1 / V1.5.** **Rollout:** *Customer adoption path* applies — **Mode A** through MVP and API pull; **Mode B** (sandbox write-back) before **Mode C** (production). |

**Why API is gated:** Backstop’s REST API is a **licensed** capability (not assumed in base subscription), uses **signed-request authentication**, and is **tenant-specific** (schema and custom fields vary by GP). Procurement and sandbox access precede any API build.

#### V1 (MVP) — CSV path

**Onboarding:** GP runs the standard Backstop contact / LP export (or uses an Affinity export if that is how the GP gets data into TOMO in MVP). Backstop CSV exports are configurable — target **30–40 commonly mapped column names** in the schema dictionary.

**Ongoing sync — Pattern A (manual):** GP exports on their cadence and re-uploads to TOMO; generic pipeline Phases 1–4 apply.

**Ongoing sync — Pattern B (semi-automated, V1.5):** Backstop emails a scheduled export to a TOMO-monitored address; ingestion is still **file-based**, not API write-back.

**Export back to Backstop without API (interim):** TOMO can generate a CSV in Backstop-expected shape for **manual** re-import (quarterly or on demand). This does not replace V2 write-back for firms that want continuous audit alignment.

#### V1.5 (candidate) — automated pull via Backstop API

- **Behavioural contract:** the API ingest job produces the **same internal representation** as if the GP had uploaded today’s export: **one pass through the generic CSV pipeline** (including saved mapping policy per workspace).
- **Idempotency:** pulls are snapshot-style; engine matches rows to existing `lp_*` entities using the same ladder as CSV (email → firm + name → fuzzy).
- **No write-back in this phase** — read-only from Backstop’s perspective.

#### V2 — operational model in TOMO + scheduled write-back

**Authoritative copy for daily work:** Updates the GP makes in TOMO (tier, stage, capture fields, notes summaries, etc.) live in TOMO first. **Write-back** is a **scheduled** job that translates queued, **eligible** changes into Backstop API calls (exact entity types — Activities, Notes, Contact fields, custom fields — are **TBD per tenant mapping** and must be locked before build).

**Eligibility gate:** Only outcomes that are **explicitly confirmed** in TOMO (e.g. approved capture, approved CRM-update proposal, or policy-defined “safe” append-only records) enter the write-back queue. No silent bulk overwrite of Backstop.

**Failure handling:** Failed API rows stay in a retryable dead-letter queue with reason codes; they **must** appear in **post-update (write-back) reporting** (see *Post-update reporting — write-back runs*). Ingest failures appear in **post-ingest reporting** (Mode A).

#### Conflict resolution — do we need a dedicated UI?

**On import (Backstop → TOMO, CSV or API pull):** Same as today’s generic pipeline — **not a separate “Backstop conflict UX”.** Use Phase 1–3: factual fields default **CRM wins**, TOMO-derived metrics stay in TOMO, ambiguous fields (tier, stage, mandate fit) go through **GP review** (V1 text-first; full Phase 3 UI per existing V1.5 plan).

**On write-back (TOMO → Backstop, V2):** Prefer designs that **avoid merge UIs** for the first shipping version:

1. **Append-first writes** — Create Backstop **Activities / Notes / Interactions** (or equivalent) for “what happened in TOMO” instead of fighting over scalar contact fields that Ops may edit in Backstop. Conflicts on **append** are rare; failures are operational (permissions, validation), not semantic merges.
2. **Scalar field updates** — If product requires updating Backstop fields, use a **narrow allow-list** of fields with **last-writer policy documented** (e.g. “TOMO may only write custom fields X/Y/Z”) and **do not** implement bi-directional field-level sync in V2 v1.
3. **True bi-directional merge UI** (same field editable in both systems with automatic reconciliation) — **out of scope** for Backstop V2 write-back v1; revisit only if the roadmap explicitly adds **two-way authoritative-source rules** (see Affinity-style conflict layer).

If write-back retries exhaust, the GP resolves via **report + in-app queue** (“fix mapping / re-approve / skip”), not a spreadsheet-style three-way merge.

#### Post-ingest reporting — Mode A (CRM → TOMO, required)

Every time TOMO **imports** from an external CRM into the workspace **without mutating the SoR** (**Mode A** — manual **CSV** upload, **Pattern B** email-delivered CSV, **Affinity API read** / webhook-driven refresh, **Backstop API pull** in V1.5, HubSpot read when shipped), the run must finish with an **ingest report** (same *operational report* pattern as write-back: provable, reviewable by IR / Ops).

**Triggers (each trigger = one reportable run, or one batched run per policy — TBD):**

- CSV: **GP upload** completes; **scheduled email attachment** ingestion completes (V1.5).
- **Affinity:** **initial API pull** completes; **scheduled delta** job completes; optional **webhook micro-batch** window closes (if batched — TBD).
- **Backstop:** **API pull** job completes (V1.5).

**Minimum payload (every ingest run):**

- **Run id** + **timestamps** (UTC + workspace local), **workspace**, **ingest channel** (`csv_upload`, `email_attachment_csv`, `affinity_api`, `backstop_api_pull`, …), **`source_crm`**, **Mode A** explicit (SoR **not** written by TOMO).
- **Source fingerprint (non-PII):** e.g. filename + file size + hash **or** “Affinity pull · pages N–M” / job cursor — enough to answer *“which export was this?”*
- **Mapping:** `csv_field_mappings` version id or hash applied; count of **new ambiguous columns** requiring GP review (if any).
- **Counts:** input **rows or API entities** processed; **created** / **updated** / **unchanged** (if detectable) / **skipped** (policy); **rejected** (parse/validation); **pending dedupe review**; **pending conflict / ambiguous field review** (Phase 3 queue).
- **Per-failure or per-reject row (bounded list):** row index or external id, **reason code** (e.g. `invalid_email`, `mapping_missing_required`, `dedupe_ambiguous`), **correlation id**; do not attach full row CSV to email by default.

**Strongly recommended (tickets if not v1):**

- **In-app Import / pull history** (mirror **Run history** for write-back); **download** CSV/JSON of summary + failure rows.
- **Email / Slack** (policy TBD): at minimum **on hard failure** or **zero rows when prior run had N** (possible export misconfiguration); optional digest on every successful scheduled pull.
- **Retention / alerting:** same family as write-back reporting (**confirm with Legal**); banner in **Settings → Integrations** when last ingest failed or is stale.

**Coverage:** Applies to **all Mode A** CRM paths (Backstop snapshot, Affinity CSV or API read, Foliometrics CSV, HubSpot CSV / read API, generic CSV).

---

#### Post-update reporting — write-back runs (required for any SoR mutation path)

Whenever TOMO **mutates** an external CRM (**Mode B or C** — Affinity write-back, **Backstop V2** write-back, HubSpot when shipped), each **write-back job** produces an **operational report** consumable by IR / Ops. **Ingest reporting** (Mode A) is specified in **Post-ingest reporting** above; write-back reporting is **separate** and **non-negotiable** whenever the SoR is updated from TOMO.

**Minimum payload (every run):**

- **Run id** (unique) + **run timestamp** (UTC + workspace local), **workspace** identity, **SoR vendor** (e.g. `backstop`, `affinity`), **mode** (sandbox vs production), **job version / mapping version** (tenant config hash or semver — TBD).
- **Counts:** attempted, succeeded, skipped (ineligible / suppressed by policy), failed (hard error after retries), retried-and-recovered (if tracked).
- **Per-failure row:** LP / TOMO entity id, **external SoR id** when known, **operation type** (e.g. `create_note`, `update_custom_field`), **HTTP or vendor error code**, **sanitized error message**, **correlation id** for support, **payload pointer** (internal log ref — not full PII dump in email).

**Strongly recommended (lock in tickets if not V1 of reporting):**

- **Per-success summary (sample or full):** for audit, at least **external ids** returned by the SoR for created/updated objects (where API returns them); optional cap “first N rows + total count”.
- **Delivery:** in-app **Run history** list + **download** (CSV/JSON) + optional **email to configured Ops distro** on **failure > 0** or on **every run** (policy per workspace — TBD).
- **Retention:** append-only **run metadata** in TOMO storage for **≥** customer’s expected audit window (e.g. 90d minimum for FC — **confirm with Legal**); full row-level detail retention TBD.
- **Alerting:** notify workspace admins when **failure rate** or **consecutive failures** exceed threshold (TBD); surface banner in **Settings → Integrations**.

**Deferred / optional:**

- **Reconciliation snapshot:** “N activities created since last run” vs **pull** baseline — useful **v2** of reporting, not required for first ship.
- **Side-by-side** “what we sent” vs “what SoR returned” — debug view for support only; not required in customer email.

This report family is the COO / Ops control surface for **audited SoR updates** without querying TOMO’s DB ad hoc.

**Coverage note:** The requirements above apply to **any** SoR write-back (**Affinity** Mode B/C, **Backstop** V2, HubSpot when shipped). Do not ship production push-back without equivalent **per-run** reporting.

#### Build sequence (updated)

1. **V1:** CSV import + Backstop dictionary; manual re-upload; Pattern B when V1.5 email ingestion ships; **post-ingest reporting** for every CSV ingest run.
2. **V1.5:** Optional Backstop API **pull** connector + job scheduler; still generic pipeline semantics; **post-ingest reporting** per pull. Pattern B email ingestion and Backstop CSV **export generator** for manual round-trip remain parallel tracks.
3. **V2:** Backstop API **write-back** service, credential + mapping store, outbound queue, retries, **post-update (write-back) reporting**, and **explicit Mode B → Mode C promotion** (sandbox credentials, report sign-off checklist, then production credentials — see *Customer adoption path*). Workspace must support **Mode A** indefinitely (pull-only, no write-back).

#### Change control — CRM integration scope

Any **business rule (BR)**, **acceptance criterion (AC)**, or **schema** change agreed after review of this document (including Backstop) must be **tracked as engineering tickets** and reflected in the SRS / migrations when that artefact is normative. Doc-only edits are not sufficient for shippable scope.

**Sales positioning for engineering context:** Backstop FC members are **TOMO-as-operational-layer** customers. Backstop stays the compliance system of record; TOMO does not replicate Backstop’s full product surface.

---

### Foliometrics

**Integration mode:** CSV import at onboarding + manual quarterly re-import. **No API integration ever** (or until S&P Global, which now owns Foliometrics, exposes one — not on any visible roadmap).

**Why no API:** Foliometrics has no public API, no developer documentation, no GitHub presence, no third-party CRM-unifier offering it as an integration source. Founded 2012, runs on MS SQL backend, acquired by With Intelligence in June 2025, now part of S&P Global. Their marketing only mentions "integrations with fund administrators" via "automated data feeds" — fund admin pipes in performance data, this is not a CRM-side API. Even if S&P decides to invest in opening up Foliometrics' platform, that's a 2027+ item.

**CSV onboarding flow:** GP exports contact list from Foliometrics — every CRM at this tier supports CSV export. The generic CSV pipeline handles import.

**Ongoing sync:** entirely GP-initiated. They re-export from Foliometrics periodically (recommend quarterly) and re-upload to TOMO. No automation possible without Foliometrics-side API.

**No export back to Foliometrics in V1.** If a Foliometrics GP needs their TOMO data reflected in Foliometrics, they manually transcribe. This is acceptable because Foliometrics is being deprecated as their daily tool — TOMO is the operational layer.

**Build sequence:**
1. V1: CSV import via the generic pipeline. Schema dictionary for Foliometrics field names where known. (Schema is less customisable than Backstop, so column names are more predictable.)
2. V1.5+: nothing planned. If S&P Global eventually opens an API, revisit.

**Sales positioning for engineering context:** the two Foliometrics FC members are the strongest candidates for *"TOMO becomes the daily layer, Foliometrics becomes the file cabinet"* framing. They are likely the most frustrated with their current CRM and the most willing to embrace TOMO as primary. If we get this onboarding right, these are the customers who quietly stop opening Foliometrics within 60 days.

---

### HubSpot

**Integration mode:** REST API, similar pattern to Affinity.

**Why included even if uncertain in FC:** HubSpot is one of the most common CRMs in tech-adjacent allocator world. The engineering investment in HubSpot integration compounds across future customers far beyond the FC. Worth building if any FC member is on HubSpot; otherwise can be deferred to V1.5.

**API documentation:** `developers.hubspot.com`. Mature, well-documented, OAuth and bearer-token auth. No "specially licensed" gating like Backstop.

**Endpoints we use:** Contacts, Companies, Deals, Notes, Email Activity, Custom Objects (if the GP has configured CRM extensions).

**Build effort:** 1.5 weeks. Engineering pattern is essentially identical to Affinity — initial pull, webhook subscription, push-back endpoint.

**V1 vs V1.5 decision:** if no FC member uses HubSpot, defer to V1.5. If any does, build in V1 alongside Affinity (the patterns are similar enough that the marginal cost is small — call it 1 week additional after Affinity is built).

**Write-back rollout:** When HubSpot write-back exists, apply the same **parallel → sandbox → production** SoR modes as Affinity / Backstop.

---

### Google Sheets, Excel, generic CSV

**Integration mode:** CSV import at onboarding + GP-initiated re-import. **No live sync with any spreadsheet.**

**Why no live sync:** Google Sheets API exists but spreadsheet schemas are arbitrary and per-GP. A GP renaming a column or restructuring a sheet would silently break the sync. Excel has the same problem plus Microsoft Graph complexity. The cost of supporting reliable bi-directional sync against a free-form spreadsheet exceeds the value for V1.

**CSV onboarding flow:** identical to Backstop and Foliometrics. The generic CSV pipeline handles whatever the GP uploads, with smart auto-mapping for column headers.

**Ongoing sync:** GP-initiated. They re-upload when they want their TOMO state refreshed against their spreadsheet.

---

## Generic CSV pipeline — used by Backstop, Foliometrics, Sheets, Excel, generic

The same engine handles all CSV imports. Per-CRM differences are in the schema dictionary, not in the pipeline itself.

**Five phases of the import:**

1. **Column mapping.** Auto-map headers against TOMO's known field names using fuzzy matching. Surface ambiguous mappings (typically 4–6 per Backstop export, fewer for simpler sources) for GP confirmation. LLM-assisted classification for ambiguous values. Save mapping as policy for re-import.

2. **Deduplication and entity matching.** Match CSV rows against existing TOMO contacts using the priority ladder: exact email > name + firm domain > name + fuzzy firm match (flag for review). Surface ambiguous matches in a small review queue for GP resolution.

3. **Field-level conflict resolution.** Per-field policy table determines which side wins on conflicts: factual fields (firm, address, phone) → CRM wins, TOMO-derived fields (signals, behavioural attributes) → TOMO wins, ambiguous fields (tier, stage, mandate fit) → GP decides via review UI.

4. **Ongoing sync.** Phases 1–3 re-run on every subsequent import, with mapping policy from initial import applied automatically. Volumes are much smaller (typically 5–20 changed records).

5. **Provenance display.** Every field write includes source metadata (CRM-imported / GP-edited / TOMO-derived / TOMO-computed). LP card surfaces provenance on hover.

**V1 ships:** Phases 1, 2, basic version of 3 (text-only conflict review, not the full UI), light version of 5 (basic source provenance only).

**V1.5 adds:** full Phase 3 conflict resolution UI, scheduled email-attachment ingestion (Phase 4 automation), full Phase 5 with divergence detection and inline display.

**V1 build effort for the generic pipeline:** 5 weeks of engineering. Reuses across all CSV-source GPs (5 of 12 in the FC plus most future customers).

---

## Summary build estimate

| Build component | V1 effort | V1.5 effort | V2 effort (Backstop track) |
|---|---|---|---|
| Generic CSV pipeline (Phases 1, 2, basic 3, light 5) | 5 weeks | – | – |
| Affinity API integration (bi-directional, including push-back) | 2.5–3 weeks | – | – |
| HubSpot API integration | 1.5 weeks | (defer if no FC user) | – |
| Schedule email-attachment ingestion | – | 1 week | – |
| Full conflict resolution UI (Phase 3) | – | 2 weeks | – |
| Quarterly CRM export generators (Backstop, Foliometrics, HubSpot) | – | 3 weeks | – |
| Backstop REST API — **automated pull** (maps to generic CSV pipeline) | – | ~2–3 weeks (estimate; after API licensed) | – |
| Backstop REST API — **scheduled write-back** + **post-update (write-back) reporting** | – | – | ~3–4 weeks (estimate; after pull path + mapping locked) |
| Workspace **SoR integration modes** (parallel / sandbox / production write-back) + admin promotion UX | 0.5–1 week | – | (shared; required before trusting Mode C) |
| **Post-ingest run reporting** (Mode A — after each CSV ingest + each API **pull** into TOMO) | ~0.5 week | (extends pull jobs) | – |

V1 total: roughly 8.5–9.5 weeks of CRM-related engineering work, against a 6-week V1 sprint. If engineering capacity is constrained, defer HubSpot to V1.5 (the HubSpot FC users, if any, can use the CSV path) — that brings V1 CRM work to roughly 7–8 weeks. The bi-directional Affinity scope is the irreducible commitment to the showcase customer; do not cut this to fit the sprint window.

**Backstop sequencing:** MVP is **CSV only**. **Do not** schedule write-back build until **V2**; optional **V1.5** is **pull-only** automation.

---

## Engineering traceability

Any **BR**, **AC**, or **database schema** change locked after PM/engineering review of CRM integration scope must have a **ticket** (implementation + QA). This document can summarize decisions; the ticket backlog remains the execution source of truth.

---

## Open questions for engineering to resolve

1. **CSV schema dictionary** — which 30–40 column names per CRM source are we explicitly auto-mapping? Recommend building this from the actual CSVs of the first 2–3 FC members during onboarding rather than speculating in advance.

2. **Reconciliation conflict UI in V1** — full conflict review UI is V1.5. For V1, what's the minimum viable "show me what's different" surface? Recommend: a simple list view in the Today screen titled *"Records updated from CSV — review changes"* with each row showing the diff. Not editable inline; GP can click into the LP card to manually correct if needed.

3. **Re-import policy persistence** — when a GP re-uploads a CSV, do we apply the previous mapping automatically, or re-confirm? Recommend: apply automatically, but show the GP a confirmation banner *"Using the same mapping as last time. Adjust"*.

4. **HubSpot priority decision** — confirm whether any FC member uses HubSpot. Build decision depends on this answer.

5. **Affinity custom field provisioning UX** — when a GP connects Affinity, TOMO needs to create six custom fields on their workspace. Most Affinity license tiers allow this via API. For tiers that restrict custom field creation, what's the GP-facing UX? Recommendation: detect the restriction at API key validation time, surface a one-time setup screen with explicit field-name + type instructions, validate completion before proceeding to the import. Do not silently fail when custom fields can't be written.

6. **Backstop V2 write-back — entity mapping** — which Backstop objects and fields are in scope for first write-back (Activities vs Notes vs Contact custom properties)? Lock per-tenant mapping template before V2 build.

7. **Parallel-mode minimum duration and sign-off** — is a fixed calendar minimum (e.g. 30 / 60 / 90 days) required before Mode C, or only client-driven? Who signs (COO vs CISO vs vendor management)? Template acknowledgement for DPA / order form?

8. **CRM run reporting — policy** — confirm delivery channels (in-app only vs email vs Slack), retention window for **ingest** vs **write-back** run metadata, alert thresholds, and whether **every successful ingest/pull** notifies or **failures / anomalies only** (ingest and write-back may differ).

---

## What this document does not cover

- Onboarding flow specification — see Document B (Onboarding Flow Specification).
- Email and calendar sync specification — covered in V1 SRS Section 8 (signals layer) and Pillar 8 of the working doc.
- Signal computation — covered in V1 SRS Section 8.
- Workflow definitions — covered separately.

If a question about CRM integration arises during build that this document doesn't answer, default to the strategic positioning above (TOMO is the operational layer, not CRM replacement) and ping the PM before adding scope.
