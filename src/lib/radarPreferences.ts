/**
 * Phase 7 — persisted Radar Modal UX (auto-open + Appendix I row source).
 */

export const RADAR_SECTION_SOURCE_STORAGE_KEY = "tomo-radar-section-source-v1";
export const RADAR_AUTO_OPEN_STORAGE_KEY = "tomo-radar-auto-open-v1";
/** Last local calendar day (YYYY-MM-DD) we auto-opened the Radar Modal */
export const RADAR_LAST_AUTO_OPEN_DATE_KEY = "tomo-radar-daily-auto-opened-v1";

/** demo = seed only; derived = CRM + Today derivation; env = follow NEXT_PUBLIC_TOMO_RADAR_DERIVED */
export type RadarSectionSourcePreference = "env" | "demo" | "derived";

export type RadarAutoOpenPreference = {
  /** When true, open Radar Modal once per local day on first Today visit (SRS §3.8). */
  enabled: boolean;
};

export function resolveRadarPayloadOptions(pref: RadarSectionSourcePreference): {
  useDemoRadarSections: boolean;
  useDerivedRadarSections: boolean;
} {
  const envDerived =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_TOMO_RADAR_DERIVED === "1";
  if (pref === "demo") return { useDemoRadarSections: true, useDerivedRadarSections: false };
  if (pref === "derived") return { useDemoRadarSections: false, useDerivedRadarSections: true };
  return envDerived
    ? { useDemoRadarSections: false, useDerivedRadarSections: true }
    : { useDemoRadarSections: true, useDerivedRadarSections: false };
}
