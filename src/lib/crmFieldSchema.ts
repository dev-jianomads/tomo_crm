/**
 * CRM field schema for update_crm tool — field mappings, value normalization,
 * and prompt reference so users can update any CRM field without value issues.
 */

import {
  STAGE_OPTIONS,
  MOMENTUM_DIRECTION_OPTIONS,
  TIER_OPTIONS,
  RELATIONSHIP_OWNER_OPTIONS,
  INVESTOR_TYPE_OPTIONS,
  STRATEGY_FIT_OPTIONS,
  STRATEGY_TYPE_OPTIONS,
  LP_LOCATION_OPTIONS,
  INVESTMENT_REMIT_OPTIONS,
  TYPICAL_CHECK_SIZE_OPTIONS,
  FUND_SIZE_PREFERENCE_OPTIONS,
  SOURCE_OPTIONS,
  LAST_FUND_HISTORY_OPTIONS,
  DECISION_TIMELINE_OPTIONS,
  FISCAL_YEAR_END_OPTIONS,
  CONSULTANT_DEPENDENT_OPTIONS,
  ESG_REQUIRED_OPTIONS,
  BAND_OPTIONS,
  CONTACT_SENIORITY_OPTIONS,
} from "./mockData";

/** Map AI field names (user-friendly) to Relationship keys */
export const FIELD_TO_REL_KEY: Record<string, string> = {
  tier: "tier",
  stage: "stage",
  band: "band",
  owner: "relationshipOwner",
  momentum: "momentumDirection",
  nextMove: "nextMove",
  openLoops: "openLoops",
  investorType: "investorType",
  strategyFit: "strategyFit",
  strategyType: "strategyType",
  location: "lpLocation",
  lpLocation: "lpLocation",
  investmentRemit: "investmentRemit",
  typicalCheckSize: "typicalCheckSize",
  fundSizePreference: "fundSizePreference",
  source: "source",
  lastFundHistory: "lastFundHistory",
  decisionTimeline: "decisionTimeline",
  fiscalYearEnd: "fiscalYearEnd",
  consultantDependent: "consultantDependent",
  esgRequired: "esgRequired",
  relationshipOwner: "relationshipOwner",
  momentumDirection: "momentumDirection",
  sourceDetail: "sourceDetail",
  lastFundCheckSize: "lastFundCheckSize",
  consultantName: "consultantName",
  lastMeetingDate: "lastMeetingDate",
  contactSeniority: "contactSeniority",
};

/** Enum fields: case-insensitive match to canonical option */
function matchEnum<T extends string>(value: string, options: readonly T[]): T | null {
  const v = value.trim();
  const found = options.find((o) => o.toLowerCase() === v.toLowerCase());
  return found ?? null;
}

/** Normalize a field value for storage. Returns string or number. */
export function normalizeFieldValue(relKey: string, value: string): string | number {
  const v = value.trim();

  // Numeric fields
  if (relKey === "openLoops" || relKey === "daysSinceLastMeaningfulContact") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  }

  // Tier: allow "3" -> "Tier 3", "1" -> "Tier 1", etc.
  if (relKey === "tier") {
    const match = matchEnum(v, TIER_OPTIONS);
    if (match) return match;
    const n = v.replace(/^tier\s*/i, "").trim();
    if (/^[1-3]$/.test(n)) return `Tier ${n}`;
    return v;
  }

  // Enum fields: case-insensitive match to canonical
  const enumMap: Record<string, readonly string[]> = {
    stage: STAGE_OPTIONS,
    band: BAND_OPTIONS,
    momentumDirection: MOMENTUM_DIRECTION_OPTIONS,
    relationshipOwner: RELATIONSHIP_OWNER_OPTIONS,
    investorType: INVESTOR_TYPE_OPTIONS,
    strategyFit: STRATEGY_FIT_OPTIONS,
    strategyType: STRATEGY_TYPE_OPTIONS,
    lpLocation: LP_LOCATION_OPTIONS,
    investmentRemit: INVESTMENT_REMIT_OPTIONS,
    typicalCheckSize: TYPICAL_CHECK_SIZE_OPTIONS,
    fundSizePreference: FUND_SIZE_PREFERENCE_OPTIONS,
    source: SOURCE_OPTIONS,
    lastFundHistory: LAST_FUND_HISTORY_OPTIONS,
    decisionTimeline: DECISION_TIMELINE_OPTIONS,
    fiscalYearEnd: FISCAL_YEAR_END_OPTIONS,
    consultantDependent: CONSULTANT_DEPENDENT_OPTIONS,
    esgRequired: ESG_REQUIRED_OPTIONS,
    contactSeniority: CONTACT_SENIORITY_OPTIONS,
    lastFundCheckSize: TYPICAL_CHECK_SIZE_OPTIONS,
  };

  const options = enumMap[relKey];
  if (options) {
    const match = matchEnum(v, options);
    if (match) return match;
  }

  // Free-text fields: pass through
  return v;
}

/** Prompt reference for AI: updatable fields and valid values */
export const CRM_UPDATE_FIELD_REFERENCE = `
Updatable CRM fields (use exact field names; values must match options where applicable):
- tier: "Tier 1" | "Tier 2" | "Tier 3" (or "1", "2", "3")
- stage: ${STAGE_OPTIONS.join(" | ")}
- band: ${BAND_OPTIONS.join(" | ")}
- momentum / momentumDirection: ${MOMENTUM_DIRECTION_OPTIONS.join(" | ")}
- owner / relationshipOwner: ${RELATIONSHIP_OWNER_OPTIONS.join(" | ")}
- investorType: ${INVESTOR_TYPE_OPTIONS.join(" | ")}
- strategyFit: ${STRATEGY_FIT_OPTIONS.join(" | ")}
- strategyType: ${STRATEGY_TYPE_OPTIONS.join(" | ")}
- lpLocation / location: ${LP_LOCATION_OPTIONS.join(" | ")}
- investmentRemit: ${INVESTMENT_REMIT_OPTIONS.join(" | ")}
- typicalCheckSize: ${TYPICAL_CHECK_SIZE_OPTIONS.join(" | ")}
- fundSizePreference: ${FUND_SIZE_PREFERENCE_OPTIONS.join(" | ")}
- source: ${SOURCE_OPTIONS.join(" | ")}
- lastFundHistory: ${LAST_FUND_HISTORY_OPTIONS.join(" | ")}
- decisionTimeline: ${DECISION_TIMELINE_OPTIONS.join(" | ")}
- fiscalYearEnd: ${FISCAL_YEAR_END_OPTIONS.join(" | ")}
- consultantDependent: ${CONSULTANT_DEPENDENT_OPTIONS.join(" | ")}
- esgRequired: ${ESG_REQUIRED_OPTIONS.join(" | ")}
- contactSeniority: ${CONTACT_SENIORITY_OPTIONS.join(" | ")}
- nextMove: free text
- openLoops: number (e.g. "0", "1", "2")
- sourceDetail, consultantName, lastMeetingDate: free text
`.trim();
