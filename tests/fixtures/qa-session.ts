import type { Page } from "@playwright/test";

/** Matches `useRequireSession` mock seed used across QA specs */
export const QA_SESSION_SEED = {
  email: "qa@example.com",
  onboardingComplete: true,
};

export async function applyQaSession(page: Page): Promise<void> {
  await page.addInitScript((session: typeof QA_SESSION_SEED) => {
    window.localStorage.setItem("tomo-session", JSON.stringify(session));
    window.localStorage.setItem("tomo-radar-auto-open-v1", JSON.stringify({ enabled: false }));
  }, QA_SESSION_SEED);
}
