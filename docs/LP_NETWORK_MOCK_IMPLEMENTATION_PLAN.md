# LP Network — Mock App Implementation Plan

Prototype the **Month 3 end state** inside the existing TOMO CRM mock (Next.js `AppShell`, `mockData` patterns, `usePersistentState`, Sonner). The real **microsite + form** (e.g. network.hellotomo.ai + Typeform/Airtable) is developed separately; this slice assumes mandate data has already been captured elsewhere.

**Principle:** LP network data is **logically separate** from GP CRM `Relationship[]` — separate types, separate mock module, no merging into the fundraising pipeline model.

---

## Goal

- **GP side:** “Qualified LP Introductions” — anonymized mandate cards, **Request introduction**, statuses that evolve through a **double opt-in** story (mocked).
- **Optional LP side:** a thin **“My mandate”** stub (read + local “edit”) to show the other half of the product in one demo — only if you want both narratives in-app.

---

## Phase 1 — Mock data model (new file, no CRM coupling)

Add e.g. `src/lib/mockLpNetwork.ts` containing:

1. **`NetworkLpMandate`** — internal record for demo: stable `id`, anonymized **display label** for GP UI (e.g. “Allocator — North America — multi-strat”), **strategy tags**, **check size band**, **deployment status**, **manager stage preference**, **hard constraints** (short string), **fit tier** (High / Medium / Low), optional **why intro is worth their time** (truncate in cards).  
   - Avoid real names on GP-visible rows unless you intentionally demo a “PII breach” mode.

2. **`IntroductionThread`** (or split request + events) — per mandate × fund (or workspace):  
   - `status`: e.g. `eligible` → `gp_requested` → `lp_pending` → `lp_approved` → `connected` (map to product copy: Pending / Meeting booked / etc.).  
   - `fundId` so filtering works when the fund selector is enabled.

3. **Seed arrays** — 6–12 mandates; 3–5 with high fit + actively deploying so “X LPs match” is credible.

Export pure data + helpers, e.g. `getQualifiedMandatesForFund(fundId)`.

---

## Phase 2 — Route and information architecture

- **Primary GP route:** `/lp-network` (or `/network/introductions` if namespacing reads better).
- **Optional second route:** `/lp-network/mandate` — fake “logged in as LP” mandate view (`?demo=1` is enough).

Use the same **`AppShell`** pattern as `pipeline/page.tsx`: `listContent` = scrollable qualified list; `detailContent` = selected card + intro status timeline / copy.

---

## Phase 3 — UI building blocks

1. **Page header** — Title **Qualified LP Introductions**, one-line trust copy (curated, double opt-in), dynamic **“TOMO has identified N LPs…”** from filtered mock data.

2. **`QualifiedLpCard`** — Only pre–opt-in fields: strategy tags, check size, deployment, stage preference; **no** name, email, or firm (unless deliberate demo mode).

3. **Detail column** — Expanded rationale, constraints snippet, CTA **Request introduction**, optional **Not now** / dismiss.

4. **State strip** — After request: **LP notified** → **Awaiting LP** → **LP approved** → **Introduction sent** (from persisted status).

5. **Optional LP mandate page** — Summary of mandate question buckets (collapsed sections), **Edit** → modal or inline form; submit = toast + `usePersistentState` on a single demo mandate object.

---

## Phase 4 — Interactive mock (local persistence)

Mirror `usePipelines` / `usePersistentState`:

- Key e.g. `tomo-lp-intro-state` — map `{ [mandateId]: { status, updatedAt } }` merged with seed defaults on first load.
- **Request introduction** → `gp_requested`, toast; optionally auto-advance or a **Dev: simulate LP approves** control for one-click demos.

No backend required for a credible walkthrough.

---

## Phase 5 — Navigation and Tomo shell

1. Extend `Section` in `app-shell.tsx` with e.g. `lp_network`.

2. **Desktop:** add an item in the **bottom rail group** (with Activity / Settings), e.g. `UserPlusIcon` / `ArrowsRightLeftIcon`, label **LP Network** or **Intro**.

3. **Mobile:** bottom bar is already crowded (~6 items). Options:  
   - **A)** Seventh compact item (crowded),  
   - **B)** Link from **Settings** (“LP Network (demo)”),  
   - **C)** CTA from **Pipeline** / **Today** only.

4. **Tomo chips** — If `section === "lp_network"`, add e.g. *“Who fits our fundraise?”*, *“Summarize intro status”* (keep `surface: "general"` unless tools are added later).

5. **FAB / dock** — If this page should match Today/Pipeline (inline Tomo), add `lp_network` to the FAB exception list in `app-shell.tsx`; otherwise keep the floating assistant.

---

## Phase 6 — Polish and demo script

- Empty state when no high-fit / active mandates for selected fund.  
- **Fund selector:** when unhidden, filter mandates by `fundId`.  
- Short note in this file or a header comment in `mockLpNetwork.ts`: **prototype-only**, **not** part of MVP `Relationship` schema.

---

## Suggested build order

| Order | Task |
|-------|------|
| 1 | Types + seed data + helpers |
| 2 | `/lp-network` page + `AppShell` wiring |
| 3 | Cards + detail + CTA + toasts |
| 4 | `usePersistentState` for intro statuses |
| 5 | Nav + `Section` + chips |
| 6 | (Optional) `/lp-network/mandate` stub |
| 7 | Copy pass + empty / edge states |

---

## Out of scope for this mock slice

- Real magic-link auth, Airtable/sync, transactional email, LP notification delivery.  
- Orchestrator tools that mutate intro state server-side.  
- RLS-backed database tables (replace mock module + persistence when backend exists).

---

## Related

- GP CRM model: `src/lib/mockData.ts` (`Relationship` — separate from LP network).  
- Persistence pattern: `src/lib/pipelines.ts`, `src/lib/storage` / `usePersistentState`.  
- Product context: execution plan (TOMO LP Network, Month 3 — LP dashboard + GP introductions panel + double opt-in).

*Added for mock prototyping; revise when production schema and APIs are defined.*
