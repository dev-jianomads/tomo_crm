import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";

/** Clickable filter shortcuts — criteria must match NL/parse output shapes for `criteriaEqual`. */
export type RelationshipFilterSuggestion = {
  id: string;
  label: string;
  criteria: StructuredFilterCriteria;
};

export const RELATIONSHIP_FILTER_SUGGESTIONS: RelationshipFilterSuggestion[] = [
  {
    id: "cooling",
    label: "cooling relationships",
    criteria: { band: "Cooling" },
  },
  {
    id: "tier1",
    label: "Tier 1 LPs",
    criteria: { tier: "Tier 1" },
  },
  {
    id: "no-contact-14",
    label: "no contact in 14 days",
    criteria: { daysSinceLastMeaningfulContact: { min: 14 } },
  },
  {
    id: "fo-na",
    label: "family offices in North America",
    criteria: { investorType: "Family office", lpLocation: "North America" },
  },
  {
    id: "heating",
    label: "heating up",
    criteria: { band: "Heating Up" },
  },
  {
    id: "show-all",
    label: "show all",
    criteria: {},
  },
];
