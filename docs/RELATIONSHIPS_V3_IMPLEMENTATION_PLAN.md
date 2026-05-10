# Relationships — v3 design alignment & implementation plan

**Normative references**

| Surface | Design file (`design/`) |
|--------|-------------------------|
| List | `tomo_relationships_list_v3.html` |
| Cards | `tomo_relationships_cards_v3.html` |
| Kanban | `tomo_relationships_kanban_v3.html` |
| LP detail drawer | `tomo_relationships_lp_drawer_v2.html` |

**SRS:** `TOMO_V1_SRS_DRAFT_2026-05-10.md` §3.10 (updated to cite these mocks and LP drawer IA), §6.2 `lp_contacts` including `investor_type`.

---

## Locked product decisions

1. **Authoritative UI:** v3 Relationships HTML mocks win over older SRS bullets; SRS was amended to match.
2. **Create list:** Control stays **disabled until at least one filter** is active (structured, advanced, or Tomo-applied).
3. **Group by:** Applies to **List** and **Cards** only. **Kanban always columns by pipeline stage** — Group is ignored when the Kanban view is active.
4. **Fund context:** With a **specific fund** selected, the Relationships cohort is scoped to **`lp_contacts.fund_id`**. With workspace **All**, the **list/kanban cohort is the union** across funds (no fund filter); **New Contact / CSV / drawer “fund raised against”** still resolve a **single effective fund** (`resolveEffectiveFundId` → first fund in workspace order) until multi-fund creation UX exists.
5. **Migration:** **Breaking migration is acceptable** — canonical pipeline stages, `investor_type`, fund scoping, and persisted filter keys may reset without backward compatibility for legacy mock stage enums.
6. **Detail UX:** **Right-hand drawer** per `tomo_relationships_lp_drawer_v2.html`, not a separate full-page detail column (desktop); sheet on small screens.

---

## Schema / data (SRS alignment)

- **`lp_contacts.investor_type`** — Allocator category for **Type** column and advanced filters (enum in SRS §6.2).
- **`lp_contacts.fund_id`** — Already in SRS; Relationships list/query filters by active fund.
- **Active investments** column — **Derived projection** (tags such as prior fund / fund vintages); no new column beyond existing `prior_fund_*`, `pipeline_stage`, and workspace `funds`.
- **Breaking migration:** Mock `STAGE_OPTIONS` now uses eight canonical **labels** (SRS-aligned): Sourced, First meeting, Nurturing, Active diligence, Soft commit, Committed, On hold, Closed lost. Persisted keys bumped for list sort/columns (`…-v3`).

---

## Phased implementation

### Phase 0 — Preconditions

- [x] Map each v3 **quick filter** chip to §3.11 named-filter predicates (or mark demo-only).
- [x] Define **`activeFundId === "all"`** behaviour for Relationships: **union cohort** for list/counts/Kanban; **primary fund** only for actions that require one fund ID (see `relationships/page.tsx` + `relationshipFundScope.ts`).

### Phase 1 — Shell & tokens

- [x] Align page chrome with v3: eyebrow, action cluster (Reset demo, New Contact, Upload CSV, Advanced filters + badge), warm canvas/card tokens.
- [x] **Filter panel:** chips row → quick filters → Tomo line (`RelationshipsFilterChat` refactor or wrapper).
- [x] **Control bar:** “X of Y LPs”, Tomo interpretation line, **Create list** (disabled until filters), **Group**, view tabs.

### Phase 2 — Fund-scoped data (mock)

- [x] Filter `relationships` (or provider output) by **`fund_id` ↔ activeFundId** from `useFunds()` (`filterRelationshipsByFund` / `resolveEffectiveFundId` in `src/lib/relationshipFundScope.ts`; Relationships page + header fund selector).
- [x] Surface **current raise** / fund label in Kanban control bar copy (`{n} LPs · current raise · {fund}`) and Kanban board **`aria-label`** (`RelationshipsKanbanBoard` `fundRaiseLabel`).

### Phase 3 — Canonical stages & migration

- [x] Swap mock stages to canonical eight-stage set; migrate seeds + generator in `src/lib/mockData.ts` (`STAGE_OPTIONS`, `STAGE_COLORS`, `stageLabelOnColorClasses`, preserved rows r1–r9).
- [x] Kanban columns fixed order, hex colours, and header typography aligned to **`tomo_relationships_kanban_v3.html`** (`RelationshipsKanbanBoard` reads `STAGE_COLORS` / `stageLabelOnColorClasses`).
- [x] Terminal-stage confirm on drag to **Closed lost** or **On hold** (`handleKanbanMoveToStage`); other stages apply immediately (CRM override + toast).
- [x] Downstream enums/heuristics updated: `relationshipFilters`, `parseFilterPrompt`, `relationshipQuickFilters`, `mockPlaybooks`, `pipelines`, `relationshipsCsv`, `buildManualRelationship`, `new-contact-modal`, `todayRaiseStands`, `radarModalDeriveFromToday`, pipeline funnel bar styling (`Committed` dark column).

### Phase 4 — List view

- [x] v3 **columns** in `src/app/relationships/page.tsx`: LP (name + firm), Tier, Type (`investor_type`), Geography (`lp_location` · `investment_remit`), Active investments (derived from `last_fund_history` via helpers), Mandate fit (pill labels), Signal (`MomentumChip`), Ticket, Last touch, Loops, Next move, Owner, Flag (`derivePipelineFlagMock`). Helpers: `formatRelationshipGeography`, `formatActiveInvestmentsLabel`, `mandateFitTableLabel` in `mockData.ts`.
- [x] **Group** headers with **counts** when Group ≠ none (stage order follows `STAGE_OPTIONS`). **Commitment / ticket range lines under stage headers** — not implemented (optional enhancement).
- [x] Default sort: **`pipelineFlag`** (red → amber → green), tie-break **`daysSinceLastMeaningfulContact`** desc when sorting by Flag. Persisted sort keys `tomo-relationships-sort-column-v3` / `…-direction-v3`.
- [x] Column visibility defaults: **Owner** and **Flag** start hidden (toggle via column picker); widths persist under `tomo-relationships-column-widths-v3` / `…-visibility-v3`.

### Phase 5 — Cards view

- [x] LP cards match **`tomo_relationships_cards_v3.html`** layout (signal dot, tier chip, prior-LP hint, signal pill, last/next touch block, ticket + mandate-fit pill, loops) in `RelationshipCard` on the Relationships page. **Group** parity with list (section headers + counts).

### Phase 6 — Kanban (remainder)

Kanban **column chrome and stages** shipped with Phase 3. Remaining polish:

- [ ] Optional **column meta** (e.g. commitment range subtitle lines under headers per HTML) — not yet in React Kanban.
- [x] **Group by** ignored in Kanban view (product rule; control hidden).
- [x] **DnD → stage** persists via relationship overrides (mock); production → `lp_stage_transitions` later.

### Phase 7 — LP drawer (`tomo_relationships_lp_drawer_v2.html`)

- [x] Drawer panel **`max-w-[760px]`**, `hideChromeHeader`, **`listContextDrawerLayout`** — scrollable Section 1 (`ContextDrawer`).
- [x] Custom header in **`RelationshipDrawerV2`**: Newsreader title, firm row, tier badge, optional prior-LP mark, close control (Esc still closes via `ContextDrawer`).
- [x] **Signal evidence** (`buildSignalEvidence` in `relationshipDrawerMocks.ts`) — pipeline-flag narrative; enriched provenance from **`GET /api/lp-contacts?id=`** when available.
- [x] **Snapshot** — paragraph + “Computed” tag + attribution (demo synthesis unchanged).
- [x] **Pipeline state** — stage, derived pipeline flag pill (`derivePipelineFlagMock`), tier, days in stage / prior stage (mock), owner.
- [x] **Pipeline data** — mandate fit pill, typical check as commitment surrogate, prior fund / active investment tags, **fund raised against** (`activeFundLabel`), geography.
- [x] **Open loops** — deterministic rows from CRM (`buildMockOpenLoopRows`).
- [x] **Update with Tomo** — **`RelationshipDrawerTomoRow`** between Section 1 and activity (`hideSection2`); styling aligned to mock tokens.
- [x] **Show full record** — collapsible CRM (**`RelationshipCrmForm`**); separate collapsible **Behavioural signals** grid (nine derived rows).
- [x] **Activity log** — **`DrawerSection3ActivityLog`** `variant="relationships"` (marker column grid); **`activityLogVariant`** prop on **`ContextDrawer`**.

### Phase 8 — Filters & advanced modal

- [x] **Advanced filters** — existing numeric ranges + full enum parity; added **`fundId`** workspace cohort (`StructuredFilterCriteria.fundId`) with **`Workspace cohort`** dropdown (`workspaceFunds` prop). **`removeCriteriaTag`** / chips support **`fundId`**.
- [x] **LLM parse** (`parseFilterPrompt`) — schema includes optional **`fundId`**.
- [x] Tomo compressed panel (**`RelationshipsFilterChat`**) unchanged by design.

### Phase 9 — Production wiring (mock-first)

- [x] **`GET /api/lp-contacts`** — list + optional **`fundId`** query; **`GET /api/lp-contacts?id=`** single contact. Payload: **`LpContactRecord`** (`lp_state`, **`provenance`** for hover/title hints). **`Cache-Control`** on responses (short private cache — demo AC-3.10.1 posture).
- [ ] Replace mock generator with **`/api/lp-contacts` → Postgres** `lp_state`, live provenance, and cited AC-3.10.1 latency targets in production.

---

## Risks

- **Horizontal density:** v3 list + eight-column Kanban stress smaller breakpoints — plan responsive truncation / horizontal scroll early.
- **Drawer scope:** Drawer v2 is **larger** than current ContextDrawer content — risk of scroll fatigue; keep “Show full record” collapsed by default as in design.
- **Fund “all”:** Document that **list** shows all funds while **defaults for creation** still use the resolved primary fund — avoids empty lists when seed data spans funds unevenly.

---

## Open questions (remaining)

- Whether **row actions** in list (⋮) match existing pipeline shortcuts or wait for v2 spec.

**Resolved:** **`activeFundId === "all"`** — union cohort for browse; primary fund for single-fund affordances.
