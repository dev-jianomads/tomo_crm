/**
 * Quick filter chips for Relationships — labels match `design/tomo_relationships_*_v3.html`.
 * Each entry maps to `StructuredFilterCriteria`; see `srsNote` for SRS §3.11 alignment (mock data uses surrogates where production will use `lp_state` / mandate_fit enums).
 */

import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";

export type RelationshipQuickFilter = {
  id: string;
  label: string;
  criteria: StructuredFilterCriteria;
  /** SRS §3.11 named filter or derivation note for QA / backend parity */
  srsNote?: string;
};

export const RELATIONSHIP_QUICK_FILTERS: RelationshipQuickFilter[] = [
  {
    id: "drifting",
    label: "Drifting",
    criteria: { band: "Cooling" },
    srsNote: "§3.11 Drifting — production: pipeline_flag IN (amber,red) + silence in reason; mock: Cooling band surrogate.",
  },
  {
    id: "tier1",
    label: "Tier 1 LPs",
    criteria: { tier: "Tier 1" },
    srsNote: "Tier filter (composable with other chips via replace semantics when applying a single chip).",
  },
  {
    id: "reups-not-contacted",
    label: "Re-ups not yet contacted",
    criteria: {
      lastFundHistory: ["Invested Fund I", "Invested Fund II", "Re-upped"],
      daysSinceLastMeaningfulContact: { min: 14 },
    },
    srsNote: "§3.11 Re-ups · Fund N — mock uses lastFundHistory + days surrogate until prior_fund_identifier wiring.",
  },
  {
    id: "confirmed-mandate",
    label: "Confirmed mandate fit",
    criteria: { strategyFit: "Active mandate" },
    srsNote: "§3.11 Confirmed mandate fit — production: mandate_fit=confirmed_fit; mock: Active mandate as surrogate.",
  },
  {
    id: "heating",
    label: "Heating up",
    criteria: { momentumDirection: "Heating up" },
    srsNote: "Directional warmth / signal lane surrogate.",
  },
  {
    id: "quiet-fat-middle",
    label: "Quiet — Fat Middle",
    criteria: { momentumDirection: "Stable", tier: "Tier 2", band: "Active-Stable" },
    srsNote: "§3.11 Quiet — Fat Middle — production: warm stages + no directional signal 30d; mock: coarse surrogate.",
  },
  {
    id: "stuck-stage",
    label: "Stuck in stage",
    criteria: {
      stage: ["Nurturing", "Active diligence", "DD"],
      daysSinceLastMeaningfulContact: { min: 28 },
    },
    srsNote: "§3.11 Stuck in stage — production: stage_stagnation_flag; mock: mid-funnel stages + long silence surrogate.",
  },
];
