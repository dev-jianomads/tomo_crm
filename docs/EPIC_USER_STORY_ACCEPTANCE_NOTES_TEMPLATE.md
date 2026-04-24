# TOMO CRM Product Backlog (Epic / Story / AC / Notes)

Use this table for **epic → user story → acceptance criteria → engineering notes**. Keep **Notes** honest about what the **current Next.js mock** in `tomo_crm` does versus what **MVP3 ship** requires.

**Authoritative product + mock inventory:** `docs/Tomo MVP (April 24, 2026).md`  
**Delivery phasing (Phase 0 / Initial V1 / …):** `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md`

## Practical rules

- **Epic** = big area  
- **User story** = user need  
- **Acceptance criteria** = business / test detail  
- **Notes / technical considerations** = implementation guidance (point to routes, APIs, and known stubs)

## Repository snapshot (aligns with latest code)

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Vercel AI SDK, Zod 4, Sonner (see MVP doc Appendix A).

**Primary shell navigation** (`src/components/app-shell.tsx`): **Today** → `/home`, **Relationships** → `/relationships`, **Lists** → `/pipeline`, **Workflows** → `/workflows`; **secondary:** **Insights** → `/insights`, **Settings** → `/settings`. Desktop + mobile bottom bar use the same six items.

**Implemented but not on the main rail:** **Activity** (`/activity`), **Materials** (`/materials`), **LP Network** (`/lp-network`, `/lp-network/mandate` — fund selector in header on LP Network only), standalone **`/search`**.

**Legacy redirects (examples):** `/targets` → `/pipeline`; `/today` → `/home`; `/tasks` → `/home` (client redirect); `/contacts` → `/relationships`; `/workflow` → `/workflows`; `/briefs` → `/materials?tab=briefs`.

**Tomo AI:** `POST /api/tomo/orchestrate` (streaming; tools and `context.surface` vary). Related: `POST /api/tomo/filter-relationships`, `GET /api/version`, demo/cron paths under `src/app/api/cron/` and `src/app/api/email/daily-brief/`. **Today** uses **inline** chat wired to the same orchestrator with optional `todayContext` (actions, commitments, daily brief blocks). **Shell Tomo** (FAB → dock/sheet on many routes) also calls `/api/tomo/orchestrate` with `surface: "general"`. Many **tool apply** paths are still **stub / partial** vs a production DB.

**Auth / session:** mock session + onboarding flags (e.g. `src/lib/auth.ts`, local persistence) — **not** production OAuth or tenant isolation.

**Integrations / billing:** Settings and onboarding show **Google, Microsoft, Affinity, Sheets, Slack, Stripe**, etc.; most flows are **UI and local flags**, not live OAuth or webhooks.

## Planning table

| Epic | User story | Acceptance criteria | Notes / technical considerations |
|------|------------|---------------------|----------------------------------|
| MVP3 IA + routes | As a user, I want a coherent primary navigation so I can move between execution surfaces without dead ends | - [ ] Primary nav matches agreed MVP3 set (Today, Relationships, Lists, Workflows, Settings; Insights per roadmap)<br>- [ ] Legacy URLs redirect correctly<br>- [ ] Activity / materials / search access matches product decision (in nav vs linked) | **In repo:** six-item rail + bottom nav in `app-shell.tsx`. **Gap (MVP3):** Activity not in primary nav; header search and global fund selector still product gaps per MVP doc §3. |
| Tomo orchestration | As a user, I want Tomo to act with the right tools on each surface so assistance is safe and relevant | - [ ] Tool allow-lists match surface (e.g. workflow vs drawer vs general)<br>- [ ] CRM/workflow updates persist with audit for material actions<br>- [ ] `filter_relationships` / NL filters stay in sync with Relationships UI | **In repo:** `src/app/api/tomo/orchestrate/route.ts`; tools include `filter_relationships`, `update_workflow`, `update_crm`, `draft_reply`, `create_user_workflow` (where enabled). **Gap:** persistence and RBAC per MVP doc §3.3. See MVP Appendix B and `docs/WORKFLOW_CREATOR_ORCHESTRATOR_PLAN.md`. |
| Trust + demo polish (Phase 0–1) | As a GP, I want consistent terminology and reliable Today/Relationships behavior so demos are credible | - [ ] Relationships filter vs action chips behave correctly (no full chip reset)<br>- [ ] Attribution uses agreed standard (`GP` / `TOMO`, not generic “User”)<br>- [ ] Signal (not legacy “Momentum”) naming + evidence copy<br>- [ ] Incomplete Today cards carry forward (no bogus midnight reset) | **Tracked in:** `PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md` Phase 0–1. Coordinate with pipeline **Lists** labeling in nav (`Lists` at `/pipeline`). |
| Workspace + identity model | As a company admin, I want to create and manage a workspace so my team can collaborate in one CRM environment | - [ ] Admin can create workspace and invite users by email<br>- [ ] User can accept invite and join correct workspace<br>- [ ] Users cannot access records outside their workspace | Add core tables: `workspaces`, `workspace_memberships`, `roles`; enforce `workspace_id` on all shared CRM entities; support invite lifecycle (pending, accepted, expired, revoked). **Mock today:** no durable multi-tenant backend. |
| Authentication and session security | As a user, I want secure sign-in so my account and data are protected | - [ ] Support Google and Microsoft login (plus email/password optional)<br>- [ ] Sessions expire and refresh safely<br>- [ ] Sign-out revokes access immediately | **In repo:** `/auth` UI with OAuth buttons and plan selection; session via `src/lib/auth.ts` patterns. **Gap:** move to server-validated tokens; no secrets in browser for production. |
| Roles and permissions (RBAC) | As an admin, I want role-based controls so users have appropriate access | - [ ] Admin / partner / analyst (or packaged role set) enforced for Team workspaces<br>- [ ] `user`-class role can use CRM but cannot manage admin-only areas where restricted<br>- [ ] A dedicated internal `it_ops_support` role can access user-private data only for support under strict controls | **MVP3 ship intent** names roles such as **Admin, Partner, Analyst** (see `Tomo MVP` §3.4). **In repo:** plan choice UI; **no** enforced server RBAC. Enforce at API; permission matrix; audit role changes. |
| Shared CRM + personal contacts separation | As a user, I want personal contacts visible to me only while still accessing shared company CRM | - [ ] Shared contacts are visible to all workspace members per role rules<br>- [ ] Personal contacts, mail, and calendar are never visible to company admins<br>- [ ] Only owner (and approved `it_ops_support`) can access personal data<br>- [ ] User can promote a personal contact into shared CRM with explicit action | Ownership model (`scope: workspace|personal`, `owner_user_id`); harden search/filter/export; merge flows for duplicates. **Not** fully implemented in mock data layer. |
| Onboarding and workspace setup | As a new user, I want guided onboarding so I can connect tools and start quickly | - [ ] Onboarding persists progress across sessions<br>- [ ] User can skip optional steps and finish setup<br>- [ ] Connected statuses appear in settings and onboarding completion state | **In repo:** eight-step flow `src/app/onboarding/page.tsx` (`totalSteps = 8`). **Gap:** persist server-side; CSV-first import + mapping + dedupe per MVP doc Appendix C.2. |
| Google integration suite | As a user, I want Gmail, Google Calendar, and Google Contacts integrated so TOMO can assist with daily workflow | - [ ] User can connect Google account once and grant required scopes<br>- [ ] Calendar/events and contacts sync run successfully with visible status<br>- [ ] MVP is read-only sync (no write-back to Google)<br>- [ ] User can use Tomo chat to push relevant personal-contact updates into shared CRM | **In repo:** stub connect flows. Production: OAuth, server token storage, webhooks/polling, least-privilege scopes. |
| Microsoft integration suite | As a user, I want Outlook Mail, Calendar, and Contacts integrated so TOMO works with Microsoft 365 | - [ ] User can connect Microsoft account and grant Graph scopes<br>- [ ] Mail/calendar/contacts sync works with clear status/errors<br>- [ ] MVP is read-only sync (no write-back to Microsoft)<br>- [ ] Reconnect flow handles expired/revoked consent | Mirror Google via Microsoft Graph; provider abstraction; tenant admin consent for enterprises. **Stubs in UI today.** |
| Slack integration | As a user, I want Slack connection so I can receive recaps and interact with TOMO in workspace tools | - [ ] Admin/user can install app to Slack workspace with OAuth<br>- [ ] Recaps and notifications are delivered to expected channel/DM<br>- [ ] Incoming Slack actions/commands are authenticated and processed | **MVP3:** narrow Slack V1 (e.g. daily brief scope), not a full messaging OS — see MVP doc §3–4. **Product plan:** test/send + webhook flows in later phases (`PRODUCT_DECISIONS` Phase 2). |
| Affinity integration | As an operations user, I want to sync Affinity people/companies so TOMO starts with existing CRM data | - [ ] Workspace admin sees guided setup steps that require their Affinity admin to create an API key and provide List ID<br>- [ ] App validates credentials immediately (test call) before marking connected<br>- [ ] Initial import and incremental sync run with dedupe and mapping rules<br>- [ ] Sync failures are logged with actionable retry states | Checklist UI + secure secret handling (encrypt, mask, rotate). **In repo:** settings/onboarding placeholders only until backend exists. |
| Google Sheets integration | As a user, I want to export/sync CRM to Google Sheets for flexible reporting | - [ ] User can authenticate and create/select sheet destination<br>- [ ] Export produces correct schema and row counts<br>- [ ] Sync mode (export-only or bidirectional) is clearly defined | Track `external_sheet_id`, job history, schema drift from manual edits. |
| Billing and subscription (Stripe) | As an admin, I want to manage plan, seats, and payment so workspace billing is reliable | - [ ] Workspace-level billing is supported in v1 (single payer per workspace)<br>- [ ] Team plans support seat management and proration<br>- [ ] Webhooks keep subscription status accurate in app | **In repo:** Stripe placeholders in settings. **Gap:** Checkout, Portal, webhooks, `stripe_customer_id` on workspace, entitlement gating. |
| Settings and preferences | As a user, I want profile, notification, and integration settings so I can control my experience | - [ ] User can update profile and notification routing per channel<br>- [ ] Admin can manage workspace-wide settings separately from personal settings<br>- [ ] Settings changes persist and are audited for critical fields | **In repo:** `src/app/settings/page.tsx` — profile, funds, integrations, notifications, billing; **five-section / connection-health** evolution per `PRODUCT_DECISIONS` Phase 2. |
| Activity, materials, and insights | As a user, I want traceability and optional analytics so I can see what changed and how we are trending | - [ ] Activity feed matches material CRM and Tomo events with filters/export where promised<br>- [ ] Insights, if in nav, is clearly “beta” or production per roadmap<br>- [ ] Materials/briefs behavior matches IA (e.g. `/materials?tab=briefs`) | **In repo:** Activity at `/activity` (filterable mock); Insights demo at `/insights` (Singapore-style mock metrics) — **not** all locked as MVP3 core per MVP doc §2–3. **Materials** prototype at `/materials`. |
| Audit, compliance, and enterprise security | As an enterprise buyer, I want controls and logs so adoption meets security/compliance standards | - [ ] Critical actions (role change, export, integration connect/disconnect, billing changes) are audited<br>- [ ] Data export and deletion workflows are available<br>- [ ] Access controls are testable and documented | Add `audit_logs` (actor, action, target, time, metadata); GDPR/CCPA; retention; evidence for SOC2. |
| Reliability and operations | As an internal operator, I want observability and safe background jobs so integrations stay healthy | - [ ] Sync jobs are queued, retryable, and idempotent<br>- [ ] Failures surface in dashboard/alerts<br>- [ ] APIs expose health and rate-limit protections | Queue + DLQ; logs/metrics/traces; SLOs for sync/API; circuit breakers. **Partial:** e.g. `GET /api/version` for build id. |

## Additional enterprise items you are likely missing

- **SSO and enterprise provisioning (v2):** SAML/OIDC SSO, SCIM user provisioning/deprovisioning.  
- **MFA and conditional access:** required MFA policies, device/location risk controls.  
- **Granular data access model:** field-level restrictions and export controls for sensitive data.  
- **Approval workflows:** admin approval for high-risk automations and bulk updates.  
- **Data governance:** retention windows, legal hold, backup/restore, disaster recovery targets.  
- **Observability and support tooling:** admin diagnostics, sync job monitor, customer support impersonation with strict audit.  
- **Contract/billing ops:** invoices, tax handling, failed payment grace periods, dunning.  
- **Performance and scale:** pagination/indexing for large CRM datasets and search relevance tuning.

## Affinity setup (easy + secure)

1. Workspace admin clicks `Connect Affinity` and sees a short wizard with: what is needed (`Affinity List ID` + `Affinity API key`), who must do it (customer **Affinity admin**), and copyable short instructions.  
2. Admin pastes key once; backend performs immediate validation call.  
3. On success, store encrypted secret server-side, show only masked fingerprint (`••••1234`), and set health status.  
4. Provide `Rotate key` and `Disconnect`; both audited.  
5. If validation fails, show actionable error (`invalid key`, `insufficient permissions`, `wrong list id`) without exposing sensitive values.

## Recommended next slice (implementation order)

1. **Phase 0** stabilization: chip behavior, attribution, Signal naming, Today carry-forward, verification gates — per `docs/PRODUCT_DECISIONS_V1_PHASED_IMPLEMENTATION_PLAN.md`.  
2. **Phase 1** safety + demo-critical: workflow guardrails (dedupe, overlap, suppression), Today drawer/append behavior, required workflow diagram labels, Lists naming alignment.  
3. **Durable model:** workspace, membership, server auth, tenant-scoped APIs.  
4. **OAuth + token lifecycle** for Google and Microsoft (read paths first).  
5. **Shared vs personal** data model and UI enforcement.  
6. **Stripe** billing + entitlements.  
7. **Audit** + **job orchestration** for integration sync.  

(Adjust order with PM/EM against MVP3 date and packaging.)

## Confirmed v1 / MVP3 decisions (summary — confirm in `Tomo MVP`)

1. Company admins **cannot** access user-private contacts, mail, or calendar.  
2. Internal `it_ops_support` can access private data only under SOC2-style controls and full audit.  
3. Personal Google/Microsoft integrations are read-only in MVP (no write-back) unless product revises.  
4. Users can use Tomo to move relevant personal-contact updates into company CRM (human-in-the-loop).  
5. Company CRM is source of truth for shared contacts/relationships.  
6. **No** SSO/SCIM in v1 baseline (plan for v2) per MVP doc.  
7. **Billing** workspace-level in v1; fund/sub-team billing later.  
8. **Telegram** / broad messaging OS-style Slack **out** of MVP3 baseline; **Slack V1** scoped (e.g. daily brief) per MVP doc.
