/**
 * Appearance / theme preference (V1 SRS §3.16 — Profile).
 * Persisted via usePersistentState as JSON (same shape as other localStorage prefs).
 */

export const APPEARANCE_STORAGE_KEY = "tomo-appearance-preference";

export type AppearancePreference = "system" | "light" | "dark";

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveDark(preference: AppearancePreference): boolean {
  if (typeof window === "undefined") return false;
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply resolved light/dark to the document root (Tailwind `dark` variant + native `color-scheme`). */
export function applyAppearanceToDocument(preference: AppearancePreference): void {
  if (typeof document === "undefined") return;
  const dark = resolveDark(preference);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Inline blocking script for root layout — must stay aligned with `resolveDark` and JSON storage from `usePersistentState`.
 */
export function themeBlockingScript(): string {
  const key = JSON.stringify(APPEARANCE_STORAGE_KEY);
  return `(function(){try{var k=${key};var raw=localStorage.getItem(k);var pref="system";if(raw){try{pref=JSON.parse(raw);}catch(e){}}var dark=pref==="dark"||(pref!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;
}
