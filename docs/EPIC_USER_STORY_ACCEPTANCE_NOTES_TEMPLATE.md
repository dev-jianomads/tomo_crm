# TOMO CRM — Epics by page (with acceptance criteria)

One **epic per main surface** (usually a route). Each **user story** includes **acceptance criteria (AC)** so engineering knows what a **fully functional** app must deliver. The current repo is still a **partly functional Next.js mock**; these AC describe the **target product behavior**, not the limits of today’s stubs.

**Optional depth:** phased delivery, integrations, and security specifics may live in other `docs/` files.

**How to read AC:** treat each bullet as a **testable outcome** (user-visible or API-backed as appropriate).

---

## Shell & global behavior

**Epic:** App chrome and cross-cutting assistant  

1. **Story:** As a user, I can move between primary areas using the main navigation (Today, Relationships, Lists, Workflows) and open Insights and Settings from the secondary nav.  
   **Acceptance criteria**
   - All primary destinations load without broken routes; active nav state reflects the current section.
   - Insights and Settings are reachable from the agreed secondary nav on desktop and mobile.
   - Mobile layout preserves the same destinations (e.g. bottom nav or equivalent) without trapping the user on a single screen.

2. **Story:** As a user, I can work in a consistent layout with list/detail panels and access **Tomo** (floating assistant / inline chat depending on the page).  
   **Acceptance criteria**
   - List + detail pattern is stable across supported viewports; resizing or closing panels does not lose unsaved work without warning where edits exist.
   - Tomo is available where the product specifies (global assistant vs page-inline); sending a message returns a response or a clear error state (no silent failure).
   - Assistant context is scoped appropriately to the current page or selected record when that is a product requirement.

3. **Story:** As a user, I can rely on **legacy URLs** redirecting to the current routes (e.g. old “Today” or “Contacts” paths) where the product still supports those links.  
   **Acceptance criteria**
   - Documented legacy paths return HTTP redirects (or client redirects where required) to the canonical route.
   - Bookmarks and shared links using legacy paths land on the correct screen with equivalent meaning (no 404 for supported aliases).
   - Query parameters that carry meaning (e.g. open a specific entity) are preserved or mapped when feasible.

---

## Today (`/home`)

**Epic:** Daily command center  

1. **Story:** As a user, I can see **actions**, **commitments**, and **brief / radar** style blocks that summarize what needs attention.  
   **Acceptance criteria**
   - Data shown is **workspace-scoped** (and fund-scoped if applicable) and reflects server state, not only static demo JSON.
   - Items appear in sensible groupings (e.g. due today, overdue, upcoming) when those concepts exist in the domain.
   - Empty states explain that there is nothing to show and how to add work (or link to the right surface).

2. **Story:** As a user, I can open an item in a **drawer** to review context, amend details, attach documents, or schedule (where the UI exposes those actions).  
   **Acceptance criteria**
   - Opening/closing the drawer preserves list selection and scroll position unless the user navigates away.
   - Edits persist to the backend and appear after refresh; optimistic UI errors roll back or show a recoverable message.
   - Attachments and scheduling actions enforce permissions; unauthorized users see a clear denial, not a broken control.

3. **Story:** As a user, I can use **inline Tomo** with Today-specific context so the assistant reflects what is on the page.  
   **Acceptance criteria**
   - The assistant receives structured context (e.g. current actions, commitments, brief blocks) consistent with what the user sees.
   - Answers do not invent records that are not in the user’s workspace; if data is missing, Tomo says so or asks a clarifying question.
   - Tool or action proposals that mutate CRM data require confirmation where product rules require human-in-the-loop.

4. **Story:** As a user, I can jump to related areas (e.g. materials / prep) when the UI links there.  
   **Acceptance criteria**
   - Links navigate to the correct route and, when applicable, open the related entity or filter.
   - Deep links work when pasted in a fresh session (subject to auth), not only when clicked inside an existing session.

5. **Story:** As a user, I can open a **“Previous”** area under “What needs your attention” to review **older queue items and deferred work** without crowding the primary “today” list.  
   **Acceptance criteria**
   - The main column shows **only today’s** attention queue (per product rules, e.g. cap + “today” scope); prior calendar days and items marked **“Do later”** do not displace that list by default.
   - A single compact control (e.g. **Previous (N)**) appears when there is at least one such item; the control is **collapsed by default** so “today” reads first.
   - Expanding the control lists items **grouped by day** (e.g. yesterday vs earlier) and, when applicable, a **deferred** group for “Do later” from the current day; rows open the same **drawer** and actions as the main attention list.
   - Approving, dismissing, or otherwise resolving an item **removes it** from the appropriate list (and from counts) in line with the rest of Today behavior.
   - Inline **Tomo** (or the orchestrator) receives **enough context** to acknowledge the backlog (e.g. count and grouped summary) so answers stay consistent with what is on the page.

---

## Relationships (`/relationships`)

**Epic:** CRM relationship workspace  

1. **Story:** As a user, I can browse relationships in **table** or **board** views and sort or scan key fields (stage, momentum, tier, etc.).  
   **Acceptance criteria**
   - Table and board views read from the same underlying dataset; switching views does not drop filters without user action.
   - Sorting and column display match user expectations for the chosen column (stable sort, correct type ordering).
   - Large lists paginate or virtualize so the page remains usable at production data sizes.

2. **Story:** As a user, I can **filter** relationships (including natural-language style filtering where wired to Tomo).  
   **Acceptance criteria**
   - Structured filters combine correctly (AND/OR as designed) and match the filter summary string shown in the UI.
   - NL or assistant-driven filters update the same filter model as manual controls (no “split brain” between Tomo and UI).
   - Clearing filters restores the full authorized dataset for the workspace.

3. **Story:** As a user, I can **add** a contact and **edit** CRM-style fields on a relationship record.  
   **Acceptance criteria**
   - Validation errors are field-level and blocking saves until resolved (or explicit “save draft” if product supports it).
   - Created records appear in list views without a full page reload; duplicates follow product rules (warn, block, or merge flow).
   - Field-level permissions are enforced server-side, not only hidden in the UI.

4. **Story:** As a user, I can open a **detail drawer** for snapshot, activity-style context, documents, and Tomo assistance for that relationship.  
   **Acceptance criteria**
   - Snapshot and activity reflect audit-backed or integration-backed events with timestamps and actors where required.
   - Document attach/list is permissioned; downloads respect auth.
   - Tomo uses the selected relationship id so answers and proposed actions target the correct record.

---

## Lists (`/pipeline`)

**Epic:** Saved lists / pipelines of relationships  

1. **Story:** As a user, I can see **lists** for the active fund context and open a list to inspect membership and metadata.  
   **Acceptance criteria**
   - List membership matches server-defined rules (static, filter-based, or hybrid) and updates when underlying relationships change.
   - Fund (or workspace) switch updates visible lists and membership counts without stale cache confusing the user.
   - Unauthorized lists are not visible; shared lists respect role rules.

2. **Story:** As a user, I can **amend** list configuration where the product provides that flow (criteria, membership, or metadata).  
   **Acceptance criteria**
   - Amendments persist and are reflected in list membership or metadata after save.
   - Conflicting edits (two users) surface a clear resolution path (refresh, merge, or last-write-wins per product spec).
   - Destructive changes (e.g. removing many members) require confirmation when volume exceeds a defined threshold.

3. **Story:** As a user, I can use **seed or demo data** only in non-production environments when the product allows it (optional for prod).  
   **Acceptance criteria**
   - Production tenants never see “reset demo” or destructive demo actions unless explicitly gated and permissioned.
   - If demo reset exists in lower environments, it is idempotent and logged.

---

## Workflows (`/workflows`)

**Epic:** Playbooks and process templates  

1. **Story:** As a user, I can browse **suggested playbooks** and **Tomo default** workflow templates.  
   **Acceptance criteria**
   - Templates are versioned or immutable per release rules; users see names, descriptions, and applicability (fund, stage, etc.) as designed.
   - Enabling/disabling a template (if allowed) affects **new** runs only unless product says otherwise.

2. **Story:** As a user, I can open a workflow to see **steps**, attachments, and activity-style detail in a drawer.  
   **Acceptance criteria**
   - Step order and status match persisted workflow runs; completed steps cannot be “uncompleted” without an audit trail if forbidden.
   - Attachments and comments are tied to the workflow instance and visible to authorized roles only.

3. **Story:** As a user, I can start or adjust **custom / creator** workflows where the product supports it (including chat-assisted creation).  
   **Acceptance criteria**
   - Created workflows validate required fields (trigger, owner, steps) before activation.
   - Assistant-created definitions are reviewed and confirmed by the user before persisting side effects (per product policy).
   - Invalid graphs (cycles, unreachable steps) are blocked with actionable errors.

4. **Story:** As a user, I can associate workflows with **lists** or relationships as the product requires.  
   **Acceptance criteria**
   - Associations are stored and visible from both the workflow and the relationship/list surface where cross-links are promised.
   - Removing an association follows product rules (orphan runs, cancel, or block).

---

## Insights (`/insights`)

**Epic:** Portfolio / funnel analytics  

1. **Story:** As a user, I can view **dashboard-style metrics** and charts that summarize pipeline health for my workspace (and fund context if applicable).  
   **Acceptance criteria**
   - Metrics are computed from authoritative CRM data with documented definitions (e.g. what “active” means).
   - Date ranges and filters apply consistently across all widgets on the page.
   - Users without entitlement to Insights see a clear upsell or hide per product; no partial leakage of restricted data.

---

## Settings (`/settings`, nested routes)

**Epic:** Profile, fund context, connections, subscription, and team administration  

The main app nav still lands on **Settings** at `/settings` (redirects to **`/settings/profile`**). All other areas use **nested routes** and a **Settings-only sidebar** so the primary rail (Today, Relationships, etc.) stays unchanged.

**Routes (current IA):**

| Path | Purpose |
|------|---------|
| `/settings` | Redirect to profile |
| `/settings/profile` | Name, email, preferences |
| `/settings/funds` | Active fund + fund list |
| `/settings/integrations` | Calendar, contacts, email, Affinity, Sheets (connect, status, **disconnect** w/ confirm) |
| `/settings/messaging` | Slack, Telegram (connect/status; **disconnect** w/ confirm when linked) |
| `/settings/notifications` | Daily brief, **Channels** (email / Slack / Telegram connection status and disconnect), related prefs |
| `/settings/billing` | Plan comparison, manage seats entry, advanced placeholders |
| `/settings/billing/manage` | Subscription summary, payment method, invoices, cancel flow |
| `/settings/team` | Seat usage, invites, member list |
| `/settings/team/roles` | Role vs capability matrix (admin vs member, etc.) |

### Subscription & team pages (billing surfaces)

These four nested routes are the **subscription and workspace-admin** cluster. They stay under `/settings` (sidebar group **Subscription & team**) and cross-link to each other so users can move from **plan choice → subscription management → seats → roles** without hunting the sidebar.

| Path | What this page owns (production) |
|------|----------------------------------|
| **`/settings/billing`** | Compare Individual vs Team (and future tiers); show current plan / trial badges; entry to **Manage seats** (e.g. Stripe Customer Portal or in-app seat SKUs); links to **Manage subscription**, **Team & seats**, and **Roles & permissions**; optional “coming soon” tiles (approvals, CRM sync rules, consent) stay clearly non-blocking. |
| **`/settings/billing/manage`** | Authoritative subscription summary (plan, renewal, trial, seat counts vs billing); **Change plan** back to billing compare; **Payment method** and **Invoices** from the billing provider; **Cancel** (or downgrade) with confirmation and effective-date messaging; **Manage team seats** deep link when seat count is purchased in-app or via portal. |
| **`/settings/team`** | Purchased vs assigned seats; **invite** and pending vs active members; link to adjust purchased seats via subscription management; link to **Roles & permissions** for capability clarity. |
| **`/settings/team/roles`** | Documented **Owner / Admin / Member** (and future roles) vs capabilities; assignment UX for admins; link back to **Team & seats**. |

**Implementation note:** The repo currently ships **UI mocks** for this cluster (placeholder pricing, mock invoices, local-only invite rows). Acceptance criteria below describe **target production** behavior; replace mocks with provider + database-backed state without changing the canonical routes above.

**Stripe (or equivalent) return URLs:** Success and cancel URLs from Checkout, and return URL from Customer Portal, should land on agreed Settings routes—e.g. **`/settings/billing/manage`** after payment or portal session, and **`/settings/billing`** for plan comparison when the user cancels checkout—so deep links and bookmarks stay valid.

1. **Story:** As a user, I can move between Settings sections using the **in-app Settings sidebar** without leaving the Settings layout.  
   **Acceptance criteria**
   - Every path in the table above loads without 404; the sidebar highlights the **current** section.
   - Deep links (e.g. bookmark `/settings/billing/manage`) open the correct section when the user is authenticated.
   - Mobile and desktop both expose the same Settings destinations (list + detail pattern preserved).
   - Cross-links among **`/settings/billing`**, **`/settings/billing/manage`**, **`/settings/team`**, and **`/settings/team/roles`** resolve correctly and match the sidebar entries (no orphan CTAs).

2. **Story:** As a user, I can review and adjust **profile** and **preferences** shown in Settings.  
   **Acceptance criteria**
   - Profile changes persist and appear on next login on another device.
   - Email or identity changes that require verification follow a secure flow (confirmation link or re-auth).

3. **Story:** As a user, I can manage **fund** selection / context where the app is fund-scoped.  
   **Acceptance criteria**
   - Fund choice applies across all fund-scoped pages in the same session; switching fund refreshes dependent data.
   - Users only see funds they belong to; admin-only fund setup is gated by role.

4. **Story:** As a user, I can connect, view status of, and disconnect **integrations** and **messaging channel** links (e.g. mail, calendar, CRM sources, Slack, Telegram) from **Settings**, per product scope. The same connection may surface in more than one Settings area (e.g. **Integrations**, **Messaging**, **Notifications**); status and availability of **Disconnect** must stay **consistent** for a given connection.  
   **Acceptance criteria**
   - OAuth or API flows complete with success/failure surfaced; tokens are stored server-side with rotation/revocation handling.
   - Connection health (sync errors, last sync time) is accurate enough to trust for operations.
   - **Disconnect** is offered only when the integration or channel is **connected**; it is not a silent action— the user must **confirm** (e.g. modal or equivalent) with a **clear title**, **short explanation of impact** (e.g. sync or delivery stops, can reconnect later), **Cancel**, and a **primary destructive CTA** whose label names the action (e.g. “Disconnect Slack”).
   - After disconnect, the UI shows **not connected** (or the correct next state) everywhere that connection appears; any dependent toggles (e.g. notification routing) disable or show dependency messaging as designed.
   - Disconnect removes access and **revokes or invalidates credentials server-side**; scheduled jobs, webhooks, and digests for that connection **stop** once disconnect completes.

   **Implementation note (repo / mock):** The UI pattern is implemented with `IntegrationRow` and `DisconnectIntegrationDialog` in `src/components/settings/settings-widgets.tsx` (confirm dialog, Cancel + destructive CTA, **link-slash** affordance on disconnect). **Integrations** — Calendar, Contacts, Email, **Affinity CRM**, **Google Sheets**. **Messaging** — Slack, Telegram. **Notifications** — **Channels** (Email, Slack, Telegram) with copy that state is shared with Integrations / Messaging. In the mock, connection state uses **`tomo-onboarding-v2`** (`ONBOARDING_STATE_STORAGE_KEY`); production should use a **single** server-backed source of truth and real token revocation with the same user-visible contract.

5. **Story:** As a subscriber, I can review **plans**, **trial**, and **seat-oriented** actions on **Billing & Plan** (`/settings/billing`).  
   **Acceptance criteria**
   - Current plan, trial state, and renewal (or cancellation) dates reflect the billing provider or database of record.
   - “Select plan” / upgrade flows complete in the provider (e.g. Checkout) and return to an agreed Settings URL (see **Subscription & team pages**) with clear success or failure.
   - Seat quantity changes for Team plans update entitlements for the workspace after webhooks or authoritative polling.
   - **Manage seats** (or equivalent) opens the correct provider or in-app flow and returns without losing workspace context.
   - Users without permission to change billing see this page as read-only or are redirected per product rules (Members must not silently see inactive checkout buttons that fail server-side).

6. **Story:** As a subscriber (or billing admin), I can **manage subscription** details on **Manage subscription** (`/settings/billing/manage`): payment method, invoices, plan change entry, and cancellation.  
   **Acceptance criteria**
   - Payment method updates go through a secure provider flow; the UI never stores raw card data.
   - Invoice history lists real charges with links or identifiers from the provider; empty and error states are explicit.
   - Cancel / downgrade shows effective date, retention rules, and seat or data impact; accidental cancel is mitigated (e.g. confirm step).
   - Payment failures and grace periods surface in this area (or linked provider surfaces) and via email per billing rules.
   - **Change plan** and **Manage team seats** entry points align with live subscription state (no stale seat counts after portal or webhook updates).

7. **Story:** As a team workspace admin, I can **invite**, **review**, and **remove** members and see **seat usage** on **Team & seats** (`/settings/team`).  
   **Acceptance criteria**
   - Invites are permissioned; only roles allowed to invite can send or revoke invites.
   - Pending vs active members are distinguishable; removing a user frees or reallocates a seat per product rules.
   - Seat counts match billing; over-capacity or payment issues surface clearly.
   - Purchased vs assigned seat summary matches **`/settings/billing/manage`** (single source of truth after sync).

8. **Story:** As a workspace admin, I can understand and assign **roles** on **Roles & permissions** (`/settings/team/roles`) (e.g. Owner, Admin, Member) against documented **capabilities**.  
   **Acceptance criteria**
   - The capability matrix (or equivalent) matches enforcement **server-side**; UI-only checks are insufficient for production.
   - Users without a permission see a clear denial for gated actions (not silent failure).
   - Role changes are audited when the domain requires compliance or handoffs.
   - Role assignment UI is consistent with the member list on **`/settings/team`** (same users, no conflicting labels).

---

## Activity (`/activity`)

**Epic:** Event timeline  

1. **Story:** As a user, I can browse a filterable **activity** feed of CRM- and product-relevant events.  
   **Acceptance criteria**
   - Events are scoped to the user’s workspace (and role); private data never appears to unauthorized viewers.
   - Filters (type, actor, date, entity) narrow results correctly and perform adequately on large histories.
   - Each event links to the underlying record when applicable.

---

## Materials (`/materials`)

**Epic:** Decks and collateral  

1. **Story:** As a user, I can browse a **materials** list with filters and open a **detail** view for an item.  
   **Acceptance criteria**
   - List data is workspace-scoped; filters match metadata fields consistently.
   - Detail view shows the latest version or active version per document model; version history is available if promised.

2. **Story:** As a user, I can use this area as the **briefs / materials** hub, including canonical URLs and redirects from legacy brief routes.  
   **Acceptance criteria**
   - Legacy `/briefs` (or equivalent) redirects preserve intent (e.g. correct tab or entity).
   - Permissions for confidential materials are enforced on list, detail, and download.

---

## LP Network (`/lp-network`, `/lp-network/mandate`)

**Epic:** LP introduction and mandate exploration  

1. **Story:** As a user, I can review **qualified LPs** and introduction **status** per fund.  
   **Acceptance criteria**
   - Status and qualification rules are computed from CRM or workflow data, not only from browser-local demo state in production.
   - Fund switch updates the LP list and counts consistently.

2. **Story:** As a user, I can open **introduction detail** and advance or record status transitions the product supports.  
   **Acceptance criteria**
   - Valid state transitions only; invalid transitions show why they are blocked.
   - Changes are audited (who, when, from → to) when the domain requires compliance or handoffs.

3. **Story:** As a user, I can open the **mandate** sub-area and view mandate-oriented content.  
   **Acceptance criteria**
   - Mandate data respects fund and role permissions.
   - Deep links to a specific mandate load correctly for authorized users.

---

## Search (`/search`)

**Epic:** Global search surface  

1. **Story:** As a user, I can search across authorized **relationships** (and other entity types the product promises) from the search experience.  
   **Acceptance criteria**
   - Results respect tenant and role boundaries; no cross-workspace leakage.
   - Query returns ranked results within an acceptable latency budget; empty results explain limits (e.g. min characters).
   - Selecting a result navigates to the canonical record screen.

---

## Auth (`/auth`)

**Epic:** Sign-in and session  

1. **Story:** As a user, I can sign in with the **supported identity providers** and complete **plan / workspace** selection required before using the app.  
   **Acceptance criteria**
   - Sessions are server-validated; expired sessions redirect to auth without data corruption.
   - Sign-out invalidates the session on server and clears client tokens/cookies per security baseline.
   - Brute-force and credential-stuffing mitigations exist at the edge or auth provider as required.

---

## Onboarding (`/onboarding`)

**Epic:** First-run setup  

1. **Story:** As a new user, I can complete the **eight-screen** onboarding (`design/tomo_onboarding_v1.html` / Document B) and resume later without losing required progress.  
   **Acceptance criteria**
   - Progress persists (`tomo-onboarding-v2` in mock; server-side in production); `wizardStep` resumes the flow after refresh.
   - Required vs optional steps match Document B (workspace + pipeline required on screen 2; fund/raise required fields on screens 3–4).
   - Skipped optional items (e.g. extra team rows) can be completed later from Settings or equivalent.

2. **Story:** I can control **historical mail scope** (SRS three-tier) and related ingestion from **Settings** (not in the eight-screen wizard in the current mock).  
   **Acceptance criteria**
   - `optInHistoricalEmailIngestion` (and meeting transcripts / Slack) remain on `OnboardingState` for Settings; changing them updates mock state and, in production, OAuth/policy.
   - Wizard copy does not imply a mail-history choice on a dedicated onboarding step until product re-introduces it.
   - Mock reference: `src/components/onboarding/onboarding-wizard.tsx`, `src/lib/types.ts`.

---

## Relationship intelligence (email-derived) — *platform / not mock-specific*

**Epic:** Relationship profile, activity/timeline, tone-of-voice, and other fields computed from **synced** mail (and related signals).

1. **Story:** When I opt into historical mail, TOMO can asynchronously compute stored derived values (e.g. relationship summary, statuses, tone-of-voice model, activity-style views). I always see a clear processing state and placeholders where a value is not ready yet, not false precision.  
   **Acceptance criteria**
   - Surfaces that display email-derived data (e.g. activity log, relationship snapshot and summary, tone-dependent copy) have defined skeleton, empty, or “still calculating” states until the backend marks the relevant slice ready (per field or per relationship, as designed).
   - If tone of voice (or an equivalent user writing profile) is not yet calculated, draft and similar features use a documented generic style and inline copy the user can understand (e.g. tone still calibrating), not a silent generic voice passed off as personalized.
   - The system persists enough metadata (e.g. last successful recompute, model version) to reason about staleness; degraded or stale states follow the same visibility rules as sync (no silent old numbers presented as current).
   - The initial 6-month (or consented) backfill is allowed to be long-running; the product may show stepwise or progress for major milestones without blocking app entry, aligned with the rest of onboarding and day-1 expectations.

2. **Story:** As new mail is ingested after setup, the same derived values update on an agreed cadence so Today, Relationships, and drafts stay aligned with reality.  
   **Acceptance criteria**
   - **Incremental recompute:** when new mail (or deletions) lands through the normal sync path, the pipeline queues updates to affected relationships and tone/profile data (workers, queues, or equivalent—not only when the user refreshes the page).
   - **Scheduled recompute:** a daily (or more frequent, if the product requires) batch recalculates aggregates, reconciles any missed or failed event-driven work, and refreshes cheaper global summaries; this is the safety net, not the only update mechanism.
   - **Time-sensitive** signals (e.g. re-engagement) may use faster paths than the daily job where C.3 / product rules require same-day surfacing; the spec does not mandate a real-time stream for every field.
   - Operational clarity: on-call and monitors can distinguish event-driven failures from schedule lag; user-visible sync or processing state reflects prolonged failure or stale data (see also **C.1** and **C.3** in `docs/Tomo MVP (April 24, 2026).md`).

---

## How to extend this doc

When you add a route or epic: write **1–5 stories**, each with **3–6 acceptance criteria** that are **testable** and describe **production** behavior (auth, persistence, permissions, scale, error handling). Keep page-level grouping so PM and dev share the same map from UI → obligations.
