# Privacy Policy

**Last updated:** July 2026

**Entity:** Tomo Solutions Inc., a Delaware corporation (“Tomo Solutions”, “we”, “us”, or “our”)

**Product:** TOMO — AI for fundraising (“TOMO”, “Tomo”, or “the Service”)

**Contact:** support@tomosolutions.ai

This Privacy Policy explains how we collect, use, disclose, retain, and protect personal information in connection with the Service and our websites (including tomosolutions.ai). It should be read together with our [Terms & Conditions](https://tomosolutions.ai/terms).

If you use TOMO on behalf of a fund, firm, or other organisation, that organisation is typically the **controller** (or “business”) of investor and pipeline personal data it instructs us to process, and Tomo Solutions acts as a **processor** (or “service provider”) for that Customer Content. Tomo Solutions is the controller of account, billing, website, and marketing data we collect directly about users and prospects.

---

## 1. Scope

This Policy covers:

- visitors to our public websites;
- users of the TOMO application (general partners, IR teammates, and other workspace members); and
- personal data contained in Customer Content that customers sync or upload (for example, limited partner / allocator contact details and correspondence).

It does **not** cover third-party websites or services you connect (Microsoft, Google, CRM vendors, Slack, Stripe, etc.), which have their own policies.

---

## 2. Personal data we collect

### 2.1 Account and workspace data

- Name, work email, authentication identifiers, and password hashes (if email/password sign-in is used).
- Sign-in metadata from identity providers (for example Google or Microsoft) when you choose SSO-style sign-in.
- Organisation / fund / workspace names, roles, preferences, notification settings, and timezone.
- Team membership (who is invited to a workspace).

### 2.2 Connected mailbox, calendar, and meeting data

If you authorise integrations, we process data from those providers as needed to operate the Service, which may include:

- email metadata (participants, timestamps, subject lines, folders/labels as exposed by the API);
- email body content for messages in scope of your historical and ongoing sync settings;
- extracted text from certain attachments (for example PDF/DOCX) where the feature is enabled — we do **not** require storing original attachment binaries for core V1 processing;
- calendar events (titles, times, attendees, locations, conferencing links);
- meeting transcripts and/or AI meeting recaps when you enable transcript features and your provider makes them available; and
- contacts from connected directories where you grant that scope.

You control which providers you connect and can disconnect them in Settings (where available).

### 2.3 CRM / pipeline and fundraising records

Data you import (CSV/Excel or similar) or sync via supported CRM connectors, which may include:

- organisation and contact names, titles, emails, phones, geography;
- pipeline stages, ticket sizes, mandate notes, owners, and related IR fields;
- interaction history and notes you store in TOMO; and
- materials you upload for drafting or workflow context.

### 2.4 Product-generated data

- Drafts, summaries, classifications, signal outputs, reminders, daily briefs, workflow configuration, and action logs.
- Tone-calibration / personalisation artefacts derived from your writing samples so drafts can match your voice (see Section 5).
- Approvals, edits, skips, and related audit events for outbound actions.

### 2.5 Usage, device, and diagnostics

- Log data such as IP address, browser/user agent, device type, approximate location derived from IP, pages/features used, and timestamps.
- Cookies and similar technologies for session continuity, security, and analytics (see Section 11).
- Error and performance telemetry (configured to minimise unnecessary personal data).

### 2.6 Billing

- Billing name, email, organisation details, plan, invoices, and limited payment metadata from our payment processor.
- We do **not** store full payment card numbers; card data is handled by our payment processor (for example Stripe).

### 2.7 Communications with us

- Emails, intro requests, support tickets, and call/meeting notes when you contact us.
- Marketing preferences if you subscribe to updates.

### 2.8 Data we do not intentionally seek

We do not require special-category data (for example health data) to use TOMO. Please do not upload such data unless necessary and lawful. If it appears incidentally in mailbox content, it is processed only as part of providing the Service under your instructions.

---

## 3. How we use personal data

We use personal data to:

- provide, operate, secure, and support the Service;
- authenticate users and manage workspaces;
- sync and index connected data sources you enable;
- compute relationship signals, reminders, metrics, and briefings;
- generate drafts and other AI outputs for **your review and approval**;
- send service notifications (in-app, email, and optional Slack);
- personalise drafting tone for your user/workspace;
- prevent abuse, debug issues, and maintain availability;
- process payments and prevent fraud;
- comply with law and enforce our Terms; and
- communicate product updates or marketing where permitted (you may opt out of non-essential marketing).

**Human-in-the-loop:** outbound investor or external email is not sent without an explicit user approval action in the product (unless a future feature expressly discloses a different control model and you enable it).

---

## 4. Legal bases (GDPR / UK GDPR and similar laws)

Where these laws apply, we rely on:

| Purpose | Typical legal basis |
|---|---|
| Providing the Service to a customer organisation | Performance of a contract; and/or legitimate interests of the customer as controller for investor-relationship management |
| Our processing of Customer Content as processor | Documented customer instructions + DPA; customer’s lawful basis |
| Account security, fraud prevention, service integrity | Legitimate interests; legal obligation where applicable |
| Optional marketing emails | Consent or soft opt-in where permitted; legitimate interests with opt-out where permitted |
| Optional product analytics cookies (non-essential) | Consent where required |
| Compliance with legal process | Legal obligation |

---

## 5. Artificial intelligence, training, and model providers

### 5.1 How AI is used

We use AI systems (currently including Google Cloud Vertex AI / Gemini for production inference, subject to change with notice via our sub-processor disclosures) to:

- draft messages and summaries;
- classify or prioritise items;
- support contact suggestions and workflow drafting; and
- generate other in-product assistance.

Prompts may include relevant Customer Content (for example recent correspondence excerpts, CRM fields, or transcript snippets) needed for the task.

### 5.2 No training on customer data for shared models

**We do not use Customer Content to train foundation models or to improve generalised models that serve other customers.**

Any future programme that would use Customer Content for shared model training would require **explicit consent** and an updated DPA or addendum before it begins.

### 5.3 Tone calibration (personalisation for you only)

To make drafts sound like you, we may build **per-user or per-workspace personalisation artefacts** (for example style profiles) from your sent messages and related writing samples. These artefacts:

- exist to provide the Service **to you**;
- are **not** used to train foundation models for other customers; and
- are deleted or de-identified when your account/workspace is deleted according to our retention rules.

### 5.4 Zero retention at the LLM provider (where available)

We configure supported LLM providers for **zero data retention** of prompts and responses (process in-memory / no training use under the provider’s enterprise terms), subject to the provider’s then-current documentation and our contractual terms with them. Operational API metadata (for example request IDs, token counts) may still be logged by providers or by us for reliability and billing.

### 5.5 Important clarification about storage

AI inference may be ephemeral at the model provider, but **TOMO itself stores Customer Content as needed to operate the product** — including email bodies, metadata, drafts, transcripts, signals, and audit logs — under the retention rules in Section 8. Claims that content is “never stored” apply only to certain provider-side inference settings, **not** to TOMO’s application database and related storage.

---

## 6. When we share personal data

We do not sell personal information for money. We do not “sell” or “share” personal information for cross-context behavioural advertising as those terms are defined under the CCPA/CPRA, and we do not use Customer Content for advertising networks.

We disclose personal data only as follows:

### 6.1 Sub-processors / service providers

Vendors that process data on our instructions to run the Service. Current categories and representative providers:

| Sub-processor / category | Purpose | Typical data |
|---|---|---|
| Supabase | Database, file storage, related backend | Workspace and product data |
| Vercel | Application hosting / edge delivery | Request data in transit |
| Amazon Web Services (AWS) | Workers, queues, object storage, secrets, transactional email (if used) | Workspace and operational data |
| Google Cloud — Firebase Authentication | Sign-in | Account identifiers, auth metadata |
| Google Cloud — Vertex AI | LLM inference | Prompts/responses (zero retention where configured) |
| Google (Workspace APIs) | Mail/calendar/meet sync when you connect Google | Data already in your Google account, plus tokens we store |
| Microsoft (Graph API) | Mail/calendar/Teams sync when you connect Microsoft | Data already in your Microsoft account, plus tokens we store |
| Stripe | Billing | Customer billing details |
| Postmark and/or AWS SES | Transactional product email | Recipient email + message content |
| Slack | Optional daily brief / notifications | Content you enable to send to Slack |
| Sentry (or similar) | Error monitoring | Stack traces; configured to limit PII |
| PostHog, Vercel Analytics, or similar | Product analytics | Pseudonymous usage events, workspace IDs |
| Affinity / Backstop (optional) | CRM connectors you enable | Data per your grant with that CRM |

We maintain a current sub-processor list for customers and aim to provide **at least 30 days’ notice** before adding a new sub-processor that processes Customer Content, except for urgent security replacements.

### 6.2 Integrations you enable

When you connect a third party, data flows according to the permissions you grant that party.

### 6.3 Workspace teammates and authorised users

Members of your workspace can access shared Customer Content according to product permissions.

### 6.4 Professional advisors and corporate transactions

Advisors under confidentiality obligations; or parties to a merger, acquisition, financing, or sale of assets, subject to appropriate protections.

### 6.5 Legal and safety

Where required by law, regulation, legal process, or to protect rights, safety, and security of Tomo Solutions, our users, or others.

### 6.6 Staff support access

In early customer programmes, authorised Tomo Solutions personnel may access workspace data as needed for onboarding and support, under internal access controls and logging. In-product “login as customer” impersonation is not a standard V1 feature; support is typically provided with your participation (for example screen share) plus limited backend operational access when necessary.

---

## 7. International transfers and data location

### 7.1 Primary hosting (current)

**V1 production systems are hosted primarily in the United States** (for example AWS `us-east-1` and related US-region services). Personal data you submit will generally be processed and stored in the United States.

### 7.2 EU / UK customers

We implement GDPR/UK GDPR controls (DPA, SCCs or equivalent transfer tools where required, security measures, and data-subject request handling). **Dedicated EU data residency is not guaranteed in V1** and is planned as a later option (for example EU-region hosting). Do not rely on marketing shorthand such as “EU & UK data residency” unless confirmed in your order form or DPA.

### 7.3 Transfer safeguards

Where we transfer personal data from the EEA, UK, or Switzerland to the US or other countries, we use appropriate safeguards such as the European Commission’s Standard Contractual Clauses (and UK addenda where applicable), plus supplementary measures as needed.

---

## 8. Retention

We retain personal data only as long as needed for the purposes described in this Policy, including security, dispute resolution, and legal compliance. Representative product rules (which may be refined in your DPA):

| Data class | Typical retention |
|---|---|
| Full email / transcript body text and extracted attachment text | About **12 months** from the interaction date, then bodies are nulled or purged while metadata may remain |
| Email/interaction metadata (without full body) | Up to about **36 months**, then deleted |
| Drafts, CRM/pipeline records, briefs, workflows, materials | While the workspace remains active; deleted on workspace/account closure after any grace period |
| Append-only operational logs (signals, action log, delivery/safety logs, auth events) | Retained while the account is active for product integrity and audit; personal identifiers may be scrubbed on erasure requests |
| OAuth tokens | Revoked on disconnect; ciphertext zeroised; residual audit row may remain |
| CSV import originals | About **90 days**, then auto-purged |
| Account after deletion request | Soft-delete grace period (about **30 days**), then hard deletion / scrubbing |
| Backups | Per provider backup schedules (rolling windows), then expire |
| Billing records | As required for tax and accounting |

When you disconnect an integration, **new** ingestion stops; data already stored remains until deletion rules or an explicit purge/erasure request applies.

---

## 9. Security

We apply administrative, technical, and organisational measures appropriate to the sensitivity of fundraising and LP relationship data, including:

- encryption **in transit** (TLS) and **at rest** for datastores and sensitive secrets;
- envelope encryption / vaulting for OAuth tokens and similar secrets;
- access controls, authentication, and audit logging;
- network and application security monitoring; and
- vendor diligence for material sub-processors.

**Clarification:** “Encryption in transit and at rest” is not the same as classical end-to-end encryption where only you hold decryption keys. We (and subprocessors under our instruction) must be able to decrypt and process data to provide AI drafting, search, signals, and sync.

No method of transmission or storage is 100% secure. You are responsible for securing your devices, upstream email/CRM accounts, and workspace invitations.

We pursue institutional compliance attestations (for example SOC 2 Type 1 and Google CASA Tier 2 for relevant OAuth scopes) according to our roadmap. Availability of a particular report on a given date is confirmed in diligence materials, not assumed from this Policy alone.

---

## 10. Your rights and choices

### 10.1 Product controls

Depending on features available to you, you may:

- access and update profile and workspace settings;
- connect or disconnect integrations;
- control notification channels (including Slack opt-in);
- export workspace data (where the export feature is enabled); and
- approve, edit, or reject AI drafts before sending.

### 10.2 Privacy rights (GDPR, UK GDPR, CCPA/CPRA, and similar)

Subject to verification and legal exceptions, you may have the right to:

- **access** personal data;
- **correct** inaccurate data;
- **delete** personal data;
- **port** data in a usable format;
- **restrict** or **object** to certain processing;
- **withdraw consent** where processing is consent-based; and
- for California residents: know, delete, correct, and opt out of sale/sharing (we do not sell/share as defined above), and not be discriminated against for exercising rights.

**How to submit a request:** email support@tomosolutions.ai with the subject line “Privacy Request”.

- If you are an **end user** of a customer workspace, we may redirect you to your organisation (the controller) for Customer Content requests, or act on their instructions.
- We aim to respond within statutory timelines (for example, about 30 days under GDPR for many requests; CCPA timelines as applicable).

### 10.3 “Do Not Sell or Share”

We do not sell personal information or share it for cross-context behavioural advertising. If that changes, we will update this Policy and provide required opt-out mechanisms.

### 10.4 Marketing opt-out

You can unsubscribe from marketing emails via the link in those emails or by contacting us. Service/transactional messages are not marketing and may still be sent.

---

## 11. Cookies and similar technologies

We use cookies and similar technologies to:

- keep you signed in and secure sessions;
- remember preferences; and
- understand product and website usage (analytics).

Where required, we request consent for non-essential cookies. You can control cookies through browser settings; some features may not work if essential cookies are blocked.

---

## 12. Children’s privacy

The Service is for business users and is not directed to children. We do not knowingly collect personal data from anyone under 16 (or higher age required in your jurisdiction). If you believe a minor’s data was provided, contact us and we will delete it.

---

## 13. Automated decision-making

TOMO uses automated processing to score, classify, and prioritise relationship signals and to generate drafts. These outputs are assistive. Material outbound actions require human approval. We do not use Customer Content for solely automated decisions that produce legal or similarly significant effects about individuals without human involvement, within the meaning of GDPR Article 22, as part of the core Service.

---

## 14. Changes to this Policy

We may update this Policy from time to time. The “Last updated” date will change when we do. Material changes will be communicated by email or in-product notice where appropriate. Continued use after the effective date means you acknowledge the updated Policy, except where law requires a different consent mechanism.

---

## 15. Contact and complaints

**Tomo Solutions Inc.**  
Email: support@tomosolutions.ai  
Website: https://tomosolutions.ai

For GDPR/UK GDPR matters you may also contact your organisation’s administrator if your data was provided through a customer workspace. You may have the right to lodge a complaint with a supervisory authority in your place of residence or work (for example an EU/EEA DPA or the UK ICO).

If we designate an external Data Protection Officer or EU/UK representative, contact details will be published here or in your DPA when appointed.

---

## 16. Region-specific notices

### 16.1 California (CCPA/CPRA)

Categories of personal information we collect track Sections 2 and 6 (identifiers, commercial information, internet activity, professional information, and inferences used to personalise the Service). We collect this information for the business purposes in Section 3. We disclose personal information to service providers as described in Section 6. We do not sell personal information or share it for cross-context behavioural advertising. California residents may exercise rights via support@tomosolutions.ai. We will verify requests as required by law. Authorised agents may submit requests with proof of authorisation.

### 16.2 EEA / UK

Additional detail on lawful bases, transfers, retention, and processor/controller roles appears above. Customers requiring a signed DPA should contact support@tomosolutions.ai before enabling mailbox or CRM ingestion.
