# Phase 0 Fix Automation (Cursor + Playwright)

This project now includes an automated check suite for Phase 0 stabilization fixes.

## What it does
- Opens the app in a real browser.
- Seeds a local test session (mock auth) so protected routes load.
- Steps through key pages and verifies expected Phase 0 outcomes.
- Fails when regressions are present (intentionally red until fixes are implemented).

## Commands
- Install browser runtime once:
  - `npm run qa:v0:install`
- Run checks (browser window visible by default):
  - `npm run qa:v0`
- Run checks headless (no window, faster for quick passes):
  - `npm run qa:v0:headless`
- Debug mode:
  - `npm run qa:v0:debug`

## Current coverage
- Today page header subtitle removal check.
- Relationships subtitle removal + `Momentum` -> `Signal` naming checks.
- Relationships drawer attribution check (`User` should not appear).
- Relationships chip persistence check after click.
- Workflows header copy check (`View lists →`, subtitle removed).

## File locations
- Playwright config: `playwright.config.ts`
- Test suite: `tests/v0-fixes.spec.ts`

## Notes
- The suite is designed as a release gate for Phase 0; failures indicate remaining work.
- Screenshots/videos are captured automatically on failure by Playwright.
