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
- **Breaking migration:** Replace mock `STAGE_OPTIONS` with eight canonical stages (`sourced`, `first_meeting`, … `closed_lost`, `on_hold`). Bump persisted localStorage keys for filters/views if needed.

---

## Phased implementation

### Phase 0 — Preconditions

- [ ] Map each v3 **quick filter** chip to §3.11 named-filter predicates (or mark demo-only).
- [ ] Define **`activeFundId === "all"`** behaviour for Relationships (recommended: treat as primary fund for counts until multi-fund UX exists).

### Phase 1 — Shell & tokens

- [ ] Align page chrome with v3: eyebrow, action cluster (Reset demo, New Contact, Upload CSV, Advanced filters + badge), warm canvas/card tokens.
- [ ] **Filter panel:** chips row → quick filters → Tomo line (`RelationshipsFilterChat` refactor or wrapper).
- [ ] **Control bar:** “X of Y LPs”, Tomo interpretation line, **Create list** (disabled until filters), **Group**, view tabs.

### Phase 2 — Fund-scoped data (mock)

- [ ] Filter `relationships` (or provider output) by **`fund_id` ↔ activeFundId** from `useFunds()`.
- [ ] Surface **current raise** / fund label in Kanban control bar copy using active fund metadata.

### Phase 3 — Canonical stages & migration

- [ ] Swap mock stages to SRS enums; migrate seed data in `mockData`.
- [ ] Update Kanban column definitions, colours, and labels to match **`tomo_relationships_kanban_v3.html`**.
- [ ] Drag/drop + terminal-stage confirm aligned to `closed_lost` / `on_hold`.

### Phase 4 — List view

- [ ] Implement v3 **columns** (including **Type** / `investor_type`, geography, active-investment tags).
- [ ] **Stage group rows** with counts and optional commitment ranges when Group includes stage.
- [ ] Default sort: **pipeline_flag** then **days_since_meaningful_touch** (mock pipeline_flag until signals API exists).

### Phase 5 — Cards view

- [ ] LP cards per **`tomo_relationships_cards_v3.html`**; honour **Group** (list parity).

### Phase 6 — Kanban

- [ ] Layout/meta (range lines, column chrome); **ignore Group by**.
- [ ] Confirm DnD writes stage (mock override → later `lp_stage_transitions`).

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
