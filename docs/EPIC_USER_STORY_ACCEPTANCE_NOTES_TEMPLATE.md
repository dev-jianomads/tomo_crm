# TOMO CRM Product Backlog (Epic / Story / AC / Notes)

This version is completed for the current app state and your stated roadmap:

- Existing UI scaffolding: onboarding, settings, auth, CRM pages, pipeline/workflows/tasks.
- Integrations currently mostly mocked in client flows.
- Target model: company workspace + users, role-based access (`admin`, `user`), shared company CRM plus user-private contacts.

## Practical Rule

- Epic = big area
- User story = user need
- Acceptance criteria = business/test detail
- Notes / technical considerations = implementation guidance

## Completed Planning Table

| Epic | User story | Acceptance criteria | Notes / technical considerations |
|------|------------|---------------------|----------------------------------|
| Workspace + identity model | As a company admin, I want to create and manage a workspace so my team can collaborate in one CRM environment | - [ ] Admin can create workspace and invite users by email<br>- [ ] User can accept invite and join correct workspace<br>- [ ] Users cannot access records outside their workspace | Add core tables: `workspaces`, `workspace_memberships`, `roles`; enforce `workspace_id` on all shared CRM entities; support invite lifecycle (pending, accepted, expired, revoked). |
| Authentication and session security | As a user, I want secure sign-in so my account and data are protected | - [ ] Support Google and Microsoft login (plus email/password optional)<br>- [ ] Sessions expire and refresh safely<br>- [ ] Sign-out revokes access immediately | Current auth is local session scaffolding; move to server-validated auth tokens; add password reset/MFA policy, brute-force protections, and secure cookie/session handling. |
| Roles and permissions (RBAC) | As an admin, I want role-based controls so users have appropriate access | - [ ] `admin` can manage members, billing, integrations, and workspace settings<br>- [ ] `user` can use CRM but cannot manage admin-only areas<br>- [ ] A dedicated internal `it_ops_support` role can access user-private data only for support under strict controls | Enforce authorization at API/data layer (not UI only); define permission matrix by resource + action; add role audit trail (who changed role/when); `it_ops_support` access must be SOC2-controlled (justification, session logging, time-bounded access). |
| Shared CRM + personal contacts separation | As a user, I want personal contacts visible to me only while still accessing shared company CRM | - [ ] Shared contacts are visible to all workspace members per role rules<br>- [ ] Personal contacts, mail, and calendar are never visible to company admins<br>- [ ] Only owner (and approved `it_ops_support`) can access personal data<br>- [ ] User can promote a personal contact into shared CRM with explicit action | Add ownership model (`scope: workspace|personal`, `owner_user_id`); prevent accidental cross-scope exposure in search/filter/export; include merge flow for duplicates across personal and shared records. |
| Onboarding and workspace setup | As a new user, I want guided onboarding so I can connect tools and start quickly | - [ ] Onboarding persists progress across sessions<br>- [ ] User can skip optional steps and finish setup<br>- [ ] Connected statuses appear in settings and onboarding completion state | Existing 8-step onboarding is a strong base; move persistence from local storage to DB; add workspace-level defaults (timezone, business hours, data retention, default notification policy). |
| Google integration suite | As a user, I want Gmail, Google Calendar, and Google Contacts integrated so TOMO can assist with daily workflow | - [ ] User can connect Google account once and grant required scopes<br>- [ ] Calendar/events and contacts sync run successfully with visible status<br>- [ ] MVP is read-only sync (no write-back to Google)<br>- [ ] User can use Tomo chat to push relevant personal-contact updates into shared CRM | Use unified OAuth flow + token refresh storage server-side; add incremental sync cursors and webhook/subscription handling; limit scopes to least privilege and provide consent copy. |
| Microsoft integration suite | As a user, I want Outlook Mail, Calendar, and Contacts integrated so TOMO works with Microsoft 365 | - [ ] User can connect Microsoft account and grant Graph scopes<br>- [ ] Mail/calendar/contacts sync works with clear status/errors<br>- [ ] MVP is read-only sync (no write-back to Microsoft)<br>- [ ] Reconnect flow handles expired/revoked consent | Mirror Google architecture using Microsoft Graph; add provider abstraction for sync jobs; handle tenant admin consent scenarios for enterprise Microsoft orgs. |
| Slack integration | As a user, I want Slack connection so I can receive recaps and interact with TOMO in workspace tools | - [ ] Admin/user can install app to Slack workspace with OAuth<br>- [ ] Recaps and notifications are delivered to expected channel/DM<br>- [ ] Incoming Slack actions/commands are authenticated and processed | Replace placeholder install URL with OAuth + callback routes; verify Slack signatures for events; define channel routing policy per workspace and user preference. |
| Affinity integration | As an operations user, I want to sync Affinity people/companies so TOMO starts with existing CRM data | - [ ] Workspace admin sees guided setup steps that require their Affinity admin to create an API key and provide List ID<br>- [ ] App validates credentials immediately (test call) before marking connected<br>- [ ] Initial import and incremental sync run with dedupe and mapping rules<br>- [ ] Sync failures are logged with actionable retry states | Easy + secure setup: provide in-app checklist and copyable instructions for Affinity admin; accept key once via secure form, encrypt at rest, never show full key again (mask last 4), and allow key rotation/revoke; least-privilege guidance; CRM remains source of truth for company-wide contacts/relationships after import; external data mapped/merged without overriding protected CRM fields unintentionally. |
| Google Sheets integration | As a user, I want to export/sync CRM to Google Sheets for flexible reporting | - [ ] User can authenticate and create/select sheet destination<br>- [ ] Export produces correct schema and row counts<br>- [ ] Sync mode (export-only or bidirectional) is clearly defined | Decide write strategy: append vs overwrite; track `external_sheet_id`; add job history and guard against schema drift in edited sheets. |
| Billing and subscription (Stripe) | As an admin, I want to manage plan, seats, and payment so workspace billing is reliable | - [ ] Workspace-level billing is supported in v1 (single payer per workspace)<br>- [ ] Team plans support seat management and proration<br>- [ ] Webhooks keep subscription status accurate in app | Existing settings page has Stripe placeholders; implement checkout + portal + webhook handlers; map workspace to `stripe_customer_id` and `subscription_id`; gate paid features by entitlement flags; fund/sub-team billing marked for v2. |
| Settings and preferences | As a user, I want profile, notification, and integration settings so I can control my experience | - [ ] User can update profile and notification routing per channel<br>- [ ] Admin can manage workspace-wide settings separately from personal settings<br>- [ ] Settings changes persist and are audited for critical fields | Split settings domains: personal vs workspace; add notification policy resolution (workspace default + user override); support timezone, locale, digest timing, and quiet hours. |
| Audit, compliance, and enterprise security | As an enterprise buyer, I want controls and logs so adoption meets security/compliance standards | - [ ] Critical actions (role change, export, integration connect/disconnect, billing changes) are audited<br>- [ ] Data export and deletion workflows are available<br>- [ ] Access controls are testable and documented | Add `audit_logs` with actor, action, target, timestamp, metadata; plan GDPR/CCPA flows; define data retention and backup policy; prepare for SOC2 controls evidence. |
| Reliability and operations | As an internal operator, I want observability and safe background jobs so integrations stay healthy | - [ ] Sync jobs are queued, retryable, and idempotent<br>- [ ] Failures surface in dashboard/alerts<br>- [ ] APIs expose health and rate-limit protections | Add job queue + dead-letter strategy; telemetry (logs, metrics, traces); define SLOs for sync freshness and API latency; add circuit breakers for third-party outages. |

## Additional Enterprise Items You Are Likely Missing

- **SSO and enterprise provisioning (v2):** SAML/OIDC SSO, SCIM user provisioning/deprovisioning.
- **MFA and conditional access:** required MFA policies, device/location risk controls.
- **Granular data access model:** field-level restrictions and export controls for sensitive data.
- **Approval workflows:** admin approval for high-risk automations and bulk updates.
- **Data governance:** retention windows, legal hold, backup/restore, disaster recovery targets.
- **Observability and support tooling:** admin diagnostics page, sync job monitor, customer support impersonation with strict audit.
- **Contract/billing ops:** invoices, tax handling, failed payment grace periods, dunning.
- **Performance and scale:** pagination/indexing strategy for large CRM datasets and search relevance tuning.

## Affinity Setup (Easy + Secure)

1. Workspace admin clicks `Connect Affinity` and sees a short wizard with:
   - what is needed: `Affinity List ID` + `Affinity API key`
   - who must do it: customer `Affinity admin`
   - copyable one-minute instructions for key creation.
2. Admin pastes key once; backend performs immediate validation call.
3. On success, store encrypted secret server-side, show only masked fingerprint (`••••1234`), and set health status.
4. Provide `Rotate key` and `Disconnect` actions; both are audited.
5. If validation fails, show actionable error (`invalid key`, `insufficient permissions`, `wrong list id`) without exposing sensitive values.

## Recommended Next Slice (Implementation Order)

1. Workspace/user/role data model + RBAC enforcement.
2. Auth hardening and tenant-scoped API guards.
3. Google + Microsoft core OAuth and token lifecycle.
4. Shared vs personal contacts model and UI separation.
5. Stripe billing with entitlement checks.
6. Audit logging + job orchestration for integrations.

## Confirmed v1 Decisions

1. Company admins cannot access user-private contacts, mail, or calendar.
2. Internal `it_ops_support` can access private data only under SOC2 controls and full auditability.
3. Personal Google/Microsoft integrations are read-only in MVP (no write-back).
4. Users can use Tomo chat to move relevant personal-contact updates into company CRM.
5. Company CRM is source of truth for shared contacts/relationships.
6. No SSO/SCIM in v1 (plan for v2).
7. Billing is workspace-level in v1; fund/sub-team billing is v2.
