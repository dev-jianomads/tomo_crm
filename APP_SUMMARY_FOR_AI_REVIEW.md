# Tomo CRM — App Summary for AI Review & Enhancement

> **Purpose:** Share this document with an AI for code review and potential enhancement suggestions.  
> **Note:** Momentum sections have been removed from the app.

---

## 1. Overview

**Tomo** is a minimal, Notion-like AI execution workspace for investor relations (IR) and hedge fund LP management. It helps users prioritize daily work, manage LP relationships, run playbook workflows, and stay on top of commitments and materials.

**App type:** Responsive web app (desktop-first, mobile support)  
**Deployment:** Vercel (GitHub auto-deploy)

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| Icons | Heroicons |
| Notifications | Sonner |
| Validation | Zod 4 |

---

## 3. Screens & Pages

| Route | Purpose |
|-------|---------|
| `/` | Root redirect: unauthenticated → `/auth`; onboarding incomplete → `/onboarding`; else → `/home` |
| `/auth` | Sign-in/sign-up (merged), plan selection (Individual/Team), forgot-password modal, OAuth buttons (Google, Microsoft) |
| `/onboarding` | 8-step setup: Calendar → Contacts → Email → Messaging (Slack/Telegram) → Affinity/Sheets → Contact import → Fund strategy → Workspace ready |
| `/home` | **Today view:** greeting, Tomo chat, suggested workflows, "What needs your attention" (actions), "Coming up" (commitments), Daily Brief modal |
| `/today` | Redirects to `/home` |
| `/relationships` | LP/relationship list with search, detail view (snapshot, status, open emails, key changes) |
| `/workflows` | Playbook list, visual process flow, AI chat to edit workflows (add/remove/reorder steps) |
| `/targets` | Target lists with filters (region, interest, stage, tier), create lists, saved lists |
| `/activity` | Activity log with fund/type/date filters |
| `/materials` | Materials (decks, updates, data rooms) with engagement and impact filters |
| `/briefs` | Redirects to `/materials?tab=briefs` |
| `/tasks` | Redirects to `/activity` |
| `/search` | Search contacts, meetings, tasks |
| `/settings` | Profile, Funds, Integrations, Messaging, Notifications, Billing & Plan |

---

## 4. Main Features

### Auth & Onboarding
- Mock auth via `localStorage` (planned: Firebase)
- Plan selection (Individual/Team)
- 8-step onboarding with optional integrations
- Session redirects based on `onboardingComplete`

### Layout
- **Desktop:** 3-pane layout — nav rail (left), list (middle), detail (right)
- Resizable list/detail split (persisted in `localStorage`)
- **Mobile:** Bottom nav, stacked layout, FAB for Tomo chat
- Fund selector (currently hidden in header)

### TOMO AI Assistant
- Persistent chat on desktop; bottom sheet on mobile
- Context-aware suggestion chips per section
- Mock responses on most pages; real streaming only on Workflows page
- Inline chat on Home; FAB on other pages (except Workflows)

### Workflows
- 4 playbooks: Warm Intro Tracker, Post-Meeting Execution, Update → Follow-Up, DDQ Response Engine
- Visual process flow (steps)
- AI chat to edit workflows via `update_workflow` tool
- Target lists linked to playbooks
- Uses `/api/tomo/chat` with streaming

### Tomo Agent Access by Screen

| Screen | Tomo access | Notes |
|--------|-------------|-------|
| `/auth` | None | Pre-login; no Tomo |
| `/onboarding` | None | Setup flow; no Tomo |
| `/home` | **Inline chat** | Tomo chat embedded in main content (always visible) |
| `/workflows` | **Inline chat** | Tomo chat in detail panel when a workflow is selected; real streaming API |
| `/relationships` | **FAB → dock/sheet** | Floating action button (bottom-right) opens Tomo; desktop = dock panel, mobile = bottom sheet |
| `/targets` | **FAB → dock/sheet** | Same as above |
| `/activity` | **FAB → dock/sheet** | Same as above |
| `/materials` | **FAB → dock/sheet** | Same as above |
| `/search` | **FAB → dock/sheet** | Same as above |
| `/settings` | **FAB → dock/sheet** | Same as above |

**Summary:** Tomo is available on all authenticated screens. On Home and Workflows it is inline (no FAB). On Relationships, Targets, Activity, Materials, Search, and Settings, the user taps the FAB to open Tomo (dock on desktop, bottom sheet on mobile).

### Mobile Responsiveness

| Aspect | Implementation |
|--------|----------------|
| **Breakpoint** | 767px (`max-width`) — matches Tailwind `md`; below = mobile |
| **Detection** | `useIsMobile()` hook using `window.matchMedia("(max-width: 767px)")` |
| **Navigation** | Desktop: left nav rail (icons only). Mobile: fixed bottom nav bar (5 items: Today, Relationships, Workflows, Activity, Settings) |
| **Layout** | Desktop: 3-pane (nav + list + detail), resizable. Mobile: stacked vertically (list above detail), single column |
| **Tomo access** | Desktop: dock panel (520px). Mobile: bottom sheet (70–92vh), FAB at `bottom-16 right-4` above nav |
| **Content padding** | Mobile: `px-4 pb-20 pt-4` (extra bottom for nav clearance) |
| **Responsive grids** | Home: `sm:grid-cols-2`, `lg:grid-cols-3`. Materials: `sm:grid-cols-2 lg:grid-cols-4`. Settings: `md:grid-cols-2`. Onboarding: `md:grid-cols-2` |
| **Modals** | Daily Brief: `sm:items-center`, `sm:p-5` for larger viewports |
| **Workflow process flow** | Step cards: `w-[160px] sm:w-[190px]`, `w-[140px] sm:w-[170px]` |
| **Auth/Onboarding** | `max-w-5xl` / `max-w-4xl`, `px-4`, `md:py-16` / `md:py-8` |

**Gaps / considerations:**
- Targets and Materials not in mobile bottom nav (only 5 slots: Today, Relationships, Workflows, Activity, Settings); accessible via direct URL only
- Resizable panels and column drag handle are desktop-only
- Tomo dock is fixed 520px on desktop; `max-w-[90vw]` used for smaller viewports
- No explicit touch/gesture handling (e.g. swipe to dismiss sheet)
- No `viewport` meta or `touch-action` tuning in globals

### Domain Concepts
- **Relationships:** LP-focused with bands (Heating Up, Active-Stable, Cooling, Stalled)
- **Actions:** Approval, in-progress, blocked
- **Materials:** Decks, updates, data rooms with engagement and impact
- **Commitments:** Meeting-related promises with time windows
- **Target lists:** Filtered LP lists for workflows

---

## 5. Removed: Momentum Sections

Per product decisions, **momentum sections have been removed** from the app. Some momentum-related data attributes may still exist in the data model (e.g., for relationships and materials) but there is no dedicated momentum page or prominent momentum-focused UI sections.

---

## 6. Data Models & API

### Core Types (`src/lib/types.ts`, `mockData.ts`, `mock-data.ts`)

- **Contact** — name, role, org, lastInteraction, relationshipHealth, tags, followUps, timeline
- **Relationship** — band, openLoops, nextMove, velocity
- **ActionItem** — status, trigger, evidence, type, draft, suggestedUpdates
- **Material** — engagement, followUpSignal
- **Brief** — meetingTitle, lp, status, openLoops, agenda, commitments
- **Commitment** — title, datetime, lp, briefId, window
- **TargetList** — name, filters, members
- **WorkflowDefinition** — title, trigger, steps (action/wait)
- **TomoMessage** — id, from, text, timestamp

### API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/tomo/chat` | Workflow AI chat with `update_workflow` tool (streaming) |
| `GET /api/version` | Returns `version` and `buildId` for deploy detection |

### Storage (localStorage)

- **Auth:** `tomo-session`
- **Onboarding:** `tomo-onboarding`
- **UI:** `tomo-pane-width`, `tomo-workflows-split-height`, `tomo-playbook-target-overrides`
- **Target lists:** `tomo-target-lists`

---

## 7. Planned Backend

- Supabase for contacts, briefs, tasks, integrations
- Firebase Auth
- Stripe for billing
- Real integrations: Affinity, Google Sheets, Slack, Telegram, Calendar, Email

---

## 8. File Structure

```
src/
├── app/
│   ├── page.tsx              # Root redirect
│   ├── layout.tsx            # Root layout, providers
│   ├── auth/page.tsx
│   ├── onboarding/page.tsx
│   ├── home/page.tsx         # Today view
│   ├── today/page.tsx        # Redirect to /home
│   ├── relationships/page.tsx
│   ├── workflows/page.tsx
│   ├── targets/page.tsx
│   ├── activity/page.tsx
│   ├── materials/page.tsx
│   ├── briefs/page.tsx       # Redirect
│   ├── tasks/page.tsx        # Redirect
│   ├── search/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── tomo/chat/route.ts
│       └── version/route.ts
├── components/
│   ├── app-shell.tsx         # Main layout, nav, Tomo dock
│   ├── tomo-assistant.tsx
│   ├── tomo-chat-context.tsx
│   ├── tomo-chatbox-inline.tsx
│   ├── tomo-ai-badge.tsx
│   ├── workflow-process-flow.tsx
│   ├── fund-provider.tsx
│   ├── version-check.tsx
│   └── ui/sonner.tsx
└── lib/
    ├── types.ts
    ├── auth.ts
    ├── storage.ts
    ├── mockData.ts           # IR domain mock data
    ├── mock-data.ts          # Contacts, briefs, tasks
    ├── mockPlaybooks.ts
    ├── workflow-templates.ts
    ├── targets.ts
    └── integrations.ts
```

---

## 9. Suggested Enhancement Areas (for AI review)

1. **Auth & data:** Replace mock auth and mock data with Firebase + Supabase
2. **Tomo AI:** Use real streaming for all Tomo chat surfaces, not only Workflows
3. **API coverage:** Add routes for contacts, briefs, tasks, integrations
4. **Search:** Add global search (e.g. Cmd+K) and full-text search
5. **Materials:** Implement `/materials?tab=briefs` and brief detail view
6. **Notifications:** Implement notification routing and channel preferences
7. **Error handling:** Add error boundaries and optional Sentry
8. **Analytics:** Add Vercel Analytics or similar
9. **Tests:** Add unit and integration tests
10. **Docs:** Expand docs and add API documentation

---

## 10. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.
