import type { InvestorType, RelationshipTier } from "@/lib/mockData";
import {
  defaultStep2,
  type ManualContactStep1,
  type ManualContactStep2,
} from "@/lib/buildManualRelationship";
import type { ContactSuggestionPrefill } from "@/lib/contact-suggestions";

/** SRS RelationshipDraft prefill (§3.3a `prefill_jsonb` shape). */
export type RelationshipDraftPrefill = ContactSuggestionPrefill;

export function defaultStep1(): ManualContactStep1 {
  return {
    name: "",
    firm: "",
    primaryEmail: "",
    tier: "Tier 2",
    stage: "Sourced",
    relationshipOwner: "You",
  };
}

export function step1FromPrefill(prefill?: RelationshipDraftPrefill | null): ManualContactStep1 {
  const base = defaultStep1();
  if (!prefill) return base;
  return {
    name: prefill.person_name?.trim() || base.name,
    firm: prefill.firm_name?.trim() || base.firm,
    primaryEmail: prefill.email?.trim() || base.primaryEmail,
    tier: base.tier,
    stage: "Sourced",
    relationshipOwner: base.relationshipOwner,
  };
}

export function step2FromPrefill(prefill?: RelationshipDraftPrefill | null): ManualContactStep2 {
  const base = defaultStep2();
  if (!prefill) return base;
  const investorType = mapRelationshipTypeToInvestorType(prefill.relationship_type);
  const consultantDependent = mapRelationshipTypeToConsultantDependent(prefill.relationship_type);
  return {
    ...base,
    investorType,
    consultantDependent,
    source: prefill.source_hint === "inbound_email" ? "Direct" : base.source,
    daysSinceLastMeaningfulContact: 0,
    momentumDirection: "Heating up",
    nextMove: prefill.suggested_next_move?.trim() || "Review inbound and set next step",
  };
}

/** Maps classifier `relationship_type` to `lp_contacts.investor_type` (allocator category only). */
export function mapRelationshipTypeToInvestorType(relationshipType?: string): InvestorType {
  const t = (relationshipType ?? "").toLowerCase();
  if (t.includes("family office")) return "Family office";
  if (t.includes("pension")) return "Pension fund";
  if (t.includes("sovereign")) return "Sovereign wealth fund";
  if (t.includes("fund-of-funds") || t.includes("fund of funds")) return "Fund-of-funds";
  if (t.includes("endowment")) return "Endowment";
  if (t.includes("foundation")) return "Foundation";
  if (t.includes("insurance")) return "Insurance";
  if (t.includes("uhnw") || t.includes("wealth")) return "UHNW";
  // Investment consultants are a firm type, not "Endowment"; leave investor_type as default.
  return "Family office";
}

/**
 * `consultantDependent` means the LP relies on an external advisor — not that the contact IS a consultant.
 * Only set when the classifier label explicitly describes advisor-dependent allocators.
 */
function mapRelationshipTypeToConsultantDependent(
  relationshipType?: string
): ManualContactStep2["consultantDependent"] {
  const t = (relationshipType ?? "").toLowerCase();
  if (t.includes("consultant-dependent") || t.includes("consultant dependent")) {
    return "Consultant-dependent";
  }
  return "Unknown";
}

export function isStep1Valid(step1: ManualContactStep1): boolean {
  return (
    step1.name.trim().length > 0 &&
    step1.firm.trim().length > 0 &&
    step1.primaryEmail.trim().includes("@")
  );
}
