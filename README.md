Tomo — minimal, Notion-like AI execution workspace (Next.js + Tailwind).

## What’s here
- Auth UI: merged sign-in/sign-up with plan selector, social buttons, forgot-password modal (prefills email).
- Onboarding: calendar → contacts → email (optional) → messaging (Slack/Telegram) → notification routing → workspace ready.
- Main app: 3-pane desktop/tablet layout (nav rail, context list, detail + persistent TOMO assistant). Mobile uses bottom nav + FAB opening a TOMO chat bottom sheet.
- Screens: Home, Contacts, Briefs, Tasks, Search, Settings (Billing/Plan, Integrations, Messaging, Notifications).
- Mock data + mock TOMO assistant responses; layout split sizes and chat history persist in `localStorage`.

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Notes
- All data/auth are mocked for now; real wiring can replace the storage helpers in `src/lib`.
- Styles follow a calm Notion-like system (single blue accent: #2563EB).
- TOMO assistant stays open on desktop; mobile opens via the FAB bottom sheet.
- Legacy note from initial repo: “Test 2nd commit to github then auto deploy to vercel”.
