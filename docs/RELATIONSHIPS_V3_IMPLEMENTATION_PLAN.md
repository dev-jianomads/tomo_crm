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
4. **Fund context:** Relationships cohort is scoped to the **active fund** (`lp_contacts.fund_id`). **Mock:** wire explicitly to `useFunds()` / `activeFundId` (and exclude “all” from LP queries or define behaviour when “all funds” is selected — default implementation: resolve to first fund or filter client-side until product defines multi-fund browse).
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
- [x] Define **`activeFundId === "all"`** behaviour for Relationships (recommended: treat as primary fund for counts until multi-fund UX exists).

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

- [ ] Drawer width, header (Newsreader-style title, subtitle row, tier/prior marks).
- [ ] **Signal evidence** block (`pipeline_flag_reason`).
- [ ] **Snapshot** (existing snapshot section, copy/styling alignment).
- [ ] **Pipeline state** grid (stage, pipeline flag, tier, days in stage/prior, owner).
- [ ] **Pipeline data** (mandate fit + captions, expected commitment, prior fund, active investments line).
- [ ] **Open loops & commitments** list (reuse commitments/open-loops mock sources).
- [ ] **Update with Tomo** row (align with `RelationshipDrawerTomoRow`).
- [ ] **Show full record** expand: collapsibles for Identity, Firm details (**fund being raised against** bound to active fund), **Behavioural signals** grid (nine signals), CRM long tail.
- [ ] **Activity log** styling (markers, typography) per v2.
- [ ] Integrate with existing `ContextDrawer` API — slide-over from right, scrim optional per design.

### Phase 8 — Filters & advanced modal

- [ ] Advanced modal field parity with v3 HTML (numeric ranges, pipeline, investor_type, geography, prior fund, owner, fund raised against).
- [ ] Tomo filter hint **V1 · Filter** behaviour unchanged.

### Phase 9 — Production wiring (post-mock)

- [ ] `/api/lp-contacts`, real `lp_state`, provenance-on-hover, **AC-3.10.1** performance.

---

## Risks

- **Horizontal density:** v3 list + eight-column Kanban stress smaller breakpoints — plan responsive truncation / horizontal scroll early.
- **Drawer scope:** Drawer v2 is **larger** than current ContextDrawer content — risk of scroll fatigue; keep “Show full record” collapsed by default as in design.
- **Fund “all”:** Until multi-fund UX is specified, implicit defaults can confuse counts — document chosen behaviour in Phase 0.

---

## Open questions (remaining)

- Exact **`activeFundId === "all"`** rule for Relationships (primary fund vs union vs disabled page).
- Whether **row actions** in list (⋮) match existing pipeline shortcuts or wait for v2 spec.
