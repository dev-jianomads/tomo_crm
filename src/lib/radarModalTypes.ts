/**
 * Contract types for the unified Radar Modal (Daily Brief + On my radar).
 * Normative spec: TOMO_V1_SRS — Appendix I — Radar Modal IA (v1).
 * Visual reference: design/tomo_radar_modal_v1.html
 */

import type { DailyBriefLink } from "@/lib/dailyBriefFromToday";

/** Section identifiers — order matches Appendix I.3 (five top-level sections; Commitments uses sub-rails). */
export type RadarSectionId = "commitments" | "heating_up" | "cooling_off" | "gone_quiet" | "next_7_days";

/** Heating / Cooling sections use optional direction labels in the UI */
export type RadarSectionDirection = "positive" | "negative";

/**
 * Navigation targets for row CTAs and tappable rows.
 * Extends drawer links used elsewhere on Today with LP-scoped routes for later phases.
 */
export type RadarNavigateLink =
  | DailyBriefLink
  | { kind: "relationship"; id: string }
  | { kind: "meeting_prep"; id: string };

/** CTA kinds aligned with Appendix I.5 */
export type RadarItemCtaKind = "bring_to_today" | "draft_now" | "draft_nudge";

export type RadarItemCta = {
  kind: RadarItemCtaKind;
  /** Surface label, e.g. "Bring to Today", "Draft now" */
  label: string;
  /** Primary opens teal-bordered actions; subtle uses muted outline */
  variant?: "primary" | "subtle";
  /** When set, clicking runs the same navigation as Today drawer routing */
  link?: RadarNavigateLink;
};

/** Tier emphasis for the vertical rail (Tier 1 — teal accent in design v1) */
export type RadarItemTier = 1 | 2 | null;

export type RadarItemTagTone = "teal" | "amber" | "red" | "neutral" | "warm" | "cool";

export type RadarItemTag =
  | { kind: "tier"; tier: 1 | 2 }
  | { kind: "custom"; label: string; tone: RadarItemTagTone };

/**
 * One evidence row inside a modal section.
 * `evidencePlain` is plain text for builders and notifications; UI may enrich formatting.
 */
export type RadarItem = {
  /** Stable key for lists / React */
  id: string;
  tier: RadarItemTier;
  /** Firm or LP list line, e.g. "CPPIB" */
  lpLabel: string;
  /** Contact or role line, e.g. "Frank Ieraci" */
  personLabel?: string;
  tags: RadarItemTag[];
  evidencePlain: string;
  /** Right column — e.g. "Snoozed Tue", "11d quiet" */
  asideLines?: string[];
  ctas?: RadarItemCta[];
  /** Row-level navigation when the whole row is tappable (optional) */
  link?: RadarNavigateLink;
};

/** Nested rail under **Commitments** (Returning / Yours / Theirs). */
export type RadarSubsection = {
  id: string;
  title: string;
  items: RadarItem[];
  countSummary: string;
  emptyMessage?: string;
};

export type RadarModalSection = {
  id: RadarSectionId;
  /** Section heading — must match Appendix I.3 titles for shipped product */
  title: string;
  /** Secondary summary, e.g. "3 items · snoozes expired today" */
  countSummary: string;
  defaultCollapsed: boolean;
  direction?: RadarSectionDirection;
  items: RadarItem[];
  /** When `items` is empty and the Commitments block uses nested rails */
  subsections?: RadarSubsection[];
  /** When items.length === 0 and section is shown */
  emptyMessage?: string;
};

/**
 * Payload assembled by `buildRadarModalPayload` (later phase) for the modal + orchestrator context.
 */
export type RadarModalPayload = {
  eyebrowLabel: string;
  title: string;
  narrativeSummaryPlain: string;
  stampLines: string[];
  sections: RadarModalSection[];
  footerDeliveryPlain: string;
  /**
   * Shown on the Today entry-point badge — navigable/actionable rows only by default
   * (see Appendix I.6).
   */
  badgeCount: number;
};
