/**
 * Relationship filter schema and logic.
 * StructuredFilterCriteria supports Phase 1 (heuristic) and Phase 3 (LLM API).
 * Validated with Zod before applying.
 */

import { z } from "zod";
import type { Relationship } from "./mockData";
import {
  BAND_OPTIONS,
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
} from "./mockData";

// ── Zod schemas for enum values ─────────────────────────────────────────────

const bandSchema = z.enum([...BAND_OPTIONS, "All"]);
const stageSchema = z.enum([...STAGE_OPTIONS]);
const momentumSchema = z.enum([...MOMENTUM_DIRECTION_OPTIONS]);
const tierSchema = z.enum([...TIER_OPTIONS]);
const ownerSchema = z.enum([...RELATIONSHIP_OWNER_OPTIONS]);
const investorTypeSchema = z.enum([...INVESTOR_TYPE_OPTIONS]);
const strategyFitSchema = z.enum([...STRATEGY_FIT_OPTIONS]);
const strategyTypeSchema = z.enum([...STRATEGY_TYPE_OPTIONS]);
const lpLocationSchema = z.enum([...LP_LOCATION_OPTIONS]);
const investmentRemitSchema = z.enum([...INVESTMENT_REMIT_OPTIONS]);
const checkSizeSchema = z.enum([...TYPICAL_CHECK_SIZE_OPTIONS]);
const fundPrefSchema = z.enum([...FUND_SIZE_PREFERENCE_OPTIONS]);
const sourceSchema = z.enum([...SOURCE_OPTIONS]);
const lastFundSchema = z.enum([...LAST_FUND_HISTORY_OPTIONS]);
const decisionTimelineSchema = z.enum([...DECISION_TIMELINE_OPTIONS]);
const fiscalYearSchema = z.enum([...FISCAL_YEAR_END_OPTIONS]);
const consultantSchema = z.enum([...CONSULTANT_DEPENDENT_OPTIONS]);
const esgSchema = z.enum([...ESG_REQUIRED_OPTIONS]);

const rangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

// ── StructuredFilterCriteria schema (Zod) ───────────────────────────────────

export const relationshipFilterSchema = z
  .object({
    // Tier 1 — Prioritisation
    daysSinceLastMeaningfulContact: rangeSchema.optional(),
    stage: z.union([stageSchema, z.array(stageSchema), z.literal("All")]).optional(),
    momentumDirection: z.union([momentumSchema, z.array(momentumSchema), z.literal("All")]).optional(),
    tier: z.union([tierSchema, z.array(tierSchema), z.literal("All")]).optional(),
    relationshipOwner: z.union([ownerSchema, z.array(ownerSchema), z.literal("All")]).optional(),

    // Tier 2 — Targeting
    investorType: z.union([investorTypeSchema, z.array(investorTypeSchema), z.literal("All")]).optional(),
    strategyFit: z.union([strategyFitSchema, z.array(strategyFitSchema), z.literal("All")]).optional(),
    strategyType: z.union([strategyTypeSchema, z.array(strategyTypeSchema), z.literal("All")]).optional(),
    lpLocation: z.union([lpLocationSchema, z.array(lpLocationSchema), z.literal("All")]).optional(),
    investmentRemit: z.union([investmentRemitSchema, z.array(investmentRemitSchema), z.literal("All")]).optional(),
    typicalCheckSize: z.union([checkSizeSchema, z.array(checkSizeSchema), z.literal("All")]).optional(),
    fundSizePreference: z.union([fundPrefSchema, z.array(fundPrefSchema), z.literal("All")]).optional(),

    // Tier 3 — Sequencing
    source: z.union([sourceSchema, z.array(sourceSchema), z.literal("All")]).optional(),
    sourceDetail: z.string().optional(),
    lastFundHistory: z.union([lastFundSchema, z.array(lastFundSchema), z.literal("All")]).optional(),
    decisionTimeline: z.union([decisionTimelineSchema, z.array(decisionTimelineSchema), z.literal("All")]).optional(),
    fiscalYearEnd: z.union([fiscalYearSchema, z.array(fiscalYearSchema), z.literal("All")]).optional(),
    consultantDependent: z.union([consultantSchema, z.array(consultantSchema), z.literal("All")]).optional(),
    consultantName: z.string().optional(),
    esgRequired: z.union([esgSchema, z.array(esgSchema), z.literal("All")]).optional(),

    // Common
    band: z.union([bandSchema, z.array(bandSchema), z.literal("All")]).optional(),
    openLoops: z.union([rangeSchema, z.literal("all")]).optional(),
    query: z.string().optional(),
  })
  .strict();

export type StructuredFilterCriteria = z.infer<typeof relationshipFilterSchema>;

// ── Filter application ─────────────────────────────────────────────────────

function matchesEnum<T extends string>(
  value: T,
  filter: T | T[] | "All" | undefined
): boolean {
  if (filter === undefined || filter === "All") return true;
  const values = Array.isArray(filter) ? filter : [filter];
  return values.includes(value);
}

function matchesRange(
  value: number,
  range: { min?: number; max?: number } | "all" | undefined
): boolean {
  if (range === undefined || range === "all") return true;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
}

function matchesSubstring(value: string | undefined, search: string | undefined): boolean {
  if (!search?.trim()) return true;
  if (!value) return false;
  return value.toLowerCase().includes(search.toLowerCase());
}

export function applyFilters(
  relationships: Relationship[],
  criteria: StructuredFilterCriteria
): Relationship[] {
  return relationships.filter((rel) => {
    if (criteria.query?.trim()) {
      const q = criteria.query.trim().toLowerCase();
      const matchesQuery =
        rel.name.toLowerCase().includes(q) || rel.firm.toLowerCase().includes(q);
      if (!matchesQuery) return false;
    }

    if (!matchesEnum(rel.band, criteria.band)) return false;
    if (!matchesEnum(rel.stage, criteria.stage)) return false;
    if (!matchesEnum(rel.momentumDirection, criteria.momentumDirection)) return false;
    if (!matchesEnum(rel.tier, criteria.tier)) return false;
    if (!matchesEnum(rel.relationshipOwner, criteria.relationshipOwner)) return false;

    if (!matchesEnum(rel.investorType, criteria.investorType)) return false;
    if (!matchesEnum(rel.strategyFit, criteria.strategyFit)) return false;
    if (!matchesEnum(rel.strategyType, criteria.strategyType)) return false;
    if (!matchesEnum(rel.lpLocation, criteria.lpLocation)) return false;
    if (!matchesEnum(rel.investmentRemit, criteria.investmentRemit)) return false;
    if (!matchesEnum(rel.typicalCheckSize, criteria.typicalCheckSize)) return false;
    if (!matchesEnum(rel.fundSizePreference, criteria.fundSizePreference)) return false;

    if (!matchesEnum(rel.source, criteria.source)) return false;
    if (!matchesSubstring(rel.sourceDetail, criteria.sourceDetail)) return false;
    if (!matchesEnum(rel.lastFundHistory, criteria.lastFundHistory)) return false;
    if (!matchesEnum(rel.decisionTimeline, criteria.decisionTimeline)) return false;
    if (!matchesEnum(rel.fiscalYearEnd, criteria.fiscalYearEnd)) return false;
    if (!matchesEnum(rel.consultantDependent, criteria.consultantDependent)) return false;
    if (!matchesSubstring(rel.consultantName, criteria.consultantName)) return false;
    if (!matchesEnum(rel.esgRequired, criteria.esgRequired)) return false;

    if (!matchesRange(rel.daysSinceLastMeaningfulContact, criteria.daysSinceLastMeaningfulContact))
      return false;
    if (!matchesRange(rel.openLoops, criteria.openLoops)) return false;

    return true;
  });
}

// ── Heuristic parser (Phase 1) ─────────────────────────────────────────────

export function parseFilterPromptHeuristic(text: string): Partial<StructuredFilterCriteria> {
  const t = text.trim().toLowerCase();
  const criteria: Partial<StructuredFilterCriteria> = {};

  // Band
  if (/\b(cooling|cool)\b/.test(t)) criteria.band = "Cooling";
  else if (/\b(heating|heat(?:ing)?\s*up)\b/.test(t)) criteria.band = "Heating Up";
  else if (/\b(stalled|stall)\b/.test(t)) criteria.band = "Stalled";
  else if (/\b(active[- ]?stable|stable|active)\b/.test(t)) criteria.band = "Active-Stable";

  // Momentum direction
  if (/\b(high\s+momentum|momentum\s+up|heating\s+up)\b/.test(t))
    criteria.momentumDirection = "Heating up";
  else if (/\b(low\s+momentum|momentum\s+down|cooling)\b/.test(t))
    criteria.momentumDirection = "Cooling";
  else if (/\b(flat|steady|stable\s+momentum)\b/.test(t))
    criteria.momentumDirection = "Stable";
  else if (/\b(up|rising)\b/.test(t) && !criteria.momentumDirection)
    criteria.momentumDirection = "Heating up";
  else if (/\b(down|falling)\b/.test(t) && !criteria.momentumDirection)
    criteria.momentumDirection = "Cooling";

  // Tier
  if (/\b(tier\s*1|t1)\b/.test(t)) criteria.tier = "Tier 1";
  else if (/\b(tier\s*2|t2)\b/.test(t)) criteria.tier = "Tier 2";
  else if (/\b(tier\s*3|t3)\b/.test(t)) criteria.tier = "Tier 3";

  // Stage
  if (/\b(first\s+contact|initial)\b/.test(t)) criteria.stage = "First contact";
  else if (/\b(deck\s+sent|sent\s+deck)\b/.test(t)) criteria.stage = "Deck sent";
  else if (/\b(second\s+meeting|nurturing)\b/.test(t)) criteria.stage = "Nurturing";
  else if (/\b(met|meeting)\b/.test(t)) criteria.stage = "Met";
  else if (/\b(active\s+diligence|diligence)\b/.test(t)) criteria.stage = "Active diligence";
  else if (/\b(dd|due\s+diligence)\b/.test(t)) criteria.stage = "DD";
  else if (/\b(soft\s+circle)\b/.test(t)) criteria.stage = "Soft circle";
  else if (/\b(closed)\b/.test(t)) criteria.stage = "Closed";
  else if (/\b(passed)\b/.test(t)) criteria.stage = "Pass";

  // Days since contact
  const daysMatch = t.match(/(?:no\s+)?(?:contact|touch|conversation)\s+(?:in|for)\s+(\d+)\s+days?/i);
  if (daysMatch) criteria.daysSinceLastMeaningfulContact = { min: parseInt(daysMatch[1], 10) };
  const lastDaysMatch = t.match(/(?:contacted|touch(?:ed)?)\s+(?:in\s+)?(?:last\s+)?(\d+)\s+days?/i);
  if (lastDaysMatch) criteria.daysSinceLastMeaningfulContact = { max: parseInt(lastDaysMatch[1], 10) };

  // Open loops
  if (/\b(open\s+loops?|with\s+loops?|has\s+loops?|loops?\s+open)\b/.test(t))
    criteria.openLoops = { min: 1 };

  // Investor type
  if (/\bfamily\s+office\b/.test(t)) criteria.investorType = "Family office";
  else if (/\bendowment\b/.test(t)) criteria.investorType = "Endowment";
  else if (/\bpension\b/.test(t)) criteria.investorType = "Pension fund";
  else if (/\bsovereign\b/.test(t)) criteria.investorType = "Sovereign wealth fund";
  else if (/\bfund[- ]?of[- ]?funds?\b/.test(t)) criteria.investorType = "Fund-of-funds";
  else if (/\buhnw\b/.test(t)) criteria.investorType = "UHNW";
  else if (/\binsurance\b/.test(t)) criteria.investorType = "Insurance";
  else if (/\bfoundation\b/.test(t)) criteria.investorType = "Foundation";

  // Location
  if (/\b(north\s+america|us|usa|america)\b/.test(t)) criteria.lpLocation = "North America";
  else if (/\b(emea|europe)\b/.test(t)) criteria.lpLocation = "EMEA";
  else if (/\b(apac|asia)\b/.test(t)) criteria.lpLocation = "APAC";

  // Free-text query (name/firm search) — remaining words that look like a search
  const stopWords = /^(all|the|and|for|with|show|me|tier|t1|t2|t3|cooling|heating|stalled|stable|active|contact|touch|days|open|loops)$/;
  const words = t.split(/\s+/).filter((w) => w.length > 2 && !stopWords.test(w));
  if (words.length > 0) {
    criteria.query = words.join(" ");
  }

  return criteria;
}

/** Validate and merge heuristic output. Returns validated criteria or null on failure. */
export function validateAndMergeFilters(
  current: StructuredFilterCriteria,
  updates: Partial<StructuredFilterCriteria>
): StructuredFilterCriteria | null {
  const merged = { ...current, ...updates };
  const result = relationshipFilterSchema.safeParse(merged);
  if (result.success) return result.data;
  return null;
}

export const EMPTY_CRITERIA: StructuredFilterCriteria = {};

const ENUM_LIKE_KEYS = new Set<keyof StructuredFilterCriteria>([
  "stage",
  "momentumDirection",
  "tier",
  "relationshipOwner",
  "investorType",
  "strategyFit",
  "strategyType",
  "lpLocation",
  "investmentRemit",
  "typicalCheckSize",
  "fundSizePreference",
  "source",
  "lastFundHistory",
  "decisionTimeline",
  "fiscalYearEnd",
  "consultantDependent",
  "esgRequired",
  "band",
]);

/** Deep equality for saved filter state vs chip definitions (single enums vs one-tuple arrays). */
export function criteriaEqual(a: StructuredFilterCriteria, b: StructuredFilterCriteria): boolean {
  const normalizeVal = (key: keyof StructuredFilterCriteria, v: unknown): unknown => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return [...v].map(String).sort();
    if (typeof v === "string" && ENUM_LIKE_KEYS.has(key)) return [v].map(String).sort();
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as { min?: number; max?: number };
      if ("min" in o || "max" in o) {
        return { min: o.min ?? null, max: o.max ?? null };
      }
    }
    return v;
  };

  const normalize = (c: StructuredFilterCriteria): Record<string, unknown> => {
    const keys = Object.keys(c).sort() as (keyof StructuredFilterCriteria)[];
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const v = c[k];
      if (v === undefined) continue;
      if (v === "All") {
        out[k as string] = "All";
        continue;
      }
      out[k as string] = normalizeVal(k, v);
    }
    return out;
  };
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/** Human-readable summary of active filters for display next to the count */
export function formatFilterSummary(criteria: StructuredFilterCriteria): string {
  const parts: string[] = [];

  if (criteria.query?.trim()) {
    parts.push(`"${criteria.query}"`);
  }
  if (criteria.tier && criteria.tier !== "All") {
    const t = Array.isArray(criteria.tier) ? criteria.tier.join(", ") : criteria.tier;
    parts.push(t);
  }
  if (criteria.band && criteria.band !== "All") {
    const b = Array.isArray(criteria.band) ? criteria.band.join(", ") : criteria.band;
    parts.push(b);
  }
  if (criteria.momentumDirection && criteria.momentumDirection !== "All") {
    const m = Array.isArray(criteria.momentumDirection)
      ? criteria.momentumDirection.join(", ")
      : criteria.momentumDirection;
    parts.push(m);
  }
  if (criteria.investorType && criteria.investorType !== "All") {
    const i = Array.isArray(criteria.investorType) ? criteria.investorType.join(", ") : criteria.investorType;
    parts.push(i);
  }
  if (criteria.lpLocation && criteria.lpLocation !== "All") {
    const l = Array.isArray(criteria.lpLocation) ? criteria.lpLocation.join(", ") : criteria.lpLocation;
    parts.push(`in ${l}`);
  }
  const days = criteria.daysSinceLastMeaningfulContact;
  if (days) {
    if (days.min != null) parts.push(`no contact in ${days.min}+ days`);
    else if (days.max != null) parts.push(`contacted in last ${days.max} days`);
  }
  const loops = criteria.openLoops;
  if (loops && loops !== "all") {
    if (loops.min != null) parts.push("with open loops");
  }
  if (criteria.stage && criteria.stage !== "All") {
    const s = Array.isArray(criteria.stage) ? criteria.stage.join(", ") : criteria.stage;
    parts.push(s);
  }

  if (parts.length === 0) return "";
  return `Tomo: ${parts.join(" • ")}`;
}

/** Removable tags for active filters (Phase 2 — persistent filter chips vs action prompts). */
export type FilterCriteriaTag = { id: string; label: string };

export function criteriaToFilterTags(criteria: StructuredFilterCriteria): FilterCriteriaTag[] {
  const tags: FilterCriteriaTag[] = [];

  if (criteria.query?.trim()) {
    tags.push({ id: "query", label: `"${criteria.query.trim()}"` });
  }
  if (criteria.tier && criteria.tier !== "All") {
    const t = Array.isArray(criteria.tier) ? criteria.tier.join(", ") : criteria.tier;
    tags.push({ id: "tier", label: t });
  }
  if (criteria.band && criteria.band !== "All") {
    const b = Array.isArray(criteria.band) ? criteria.band.join(", ") : criteria.band;
    tags.push({ id: "band", label: b });
  }
  if (criteria.momentumDirection && criteria.momentumDirection !== "All") {
    const m = Array.isArray(criteria.momentumDirection)
      ? criteria.momentumDirection.join(", ")
      : criteria.momentumDirection;
    tags.push({ id: "momentumDirection", label: m });
  }
  if (criteria.investorType && criteria.investorType !== "All") {
    const i = Array.isArray(criteria.investorType) ? criteria.investorType.join(", ") : criteria.investorType;
    tags.push({ id: "investorType", label: i });
  }
  if (criteria.lpLocation && criteria.lpLocation !== "All") {
    const l = Array.isArray(criteria.lpLocation) ? criteria.lpLocation.join(", ") : criteria.lpLocation;
    tags.push({ id: "lpLocation", label: `in ${l}` });
  }
  const days = criteria.daysSinceLastMeaningfulContact;
  if (days) {
    if (days.min != null) tags.push({ id: "daysSinceLastMeaningfulContact", label: `No contact ${days.min}+ days` });
    else if (days.max != null) tags.push({ id: "daysSinceLastMeaningfulContact", label: `Contact ≤ ${days.max}d` });
  }
  const loops = criteria.openLoops;
  if (loops && loops !== "all" && loops.min != null) {
    tags.push({ id: "openLoops", label: "Open loops" });
  }
  if (criteria.stage && criteria.stage !== "All") {
    const s = Array.isArray(criteria.stage) ? criteria.stage.join(", ") : criteria.stage;
    tags.push({ id: "stage", label: s });
  }

  return tags;
}

/** Drop one filter dimension; returns validated criteria. */
export function removeCriteriaTag(criteria: StructuredFilterCriteria, tagId: string): StructuredFilterCriteria {
  const next: StructuredFilterCriteria = { ...criteria };
  switch (tagId) {
    case "query":
      delete next.query;
      break;
    case "tier":
      delete next.tier;
      break;
    case "band":
      delete next.band;
      break;
    case "momentumDirection":
      delete next.momentumDirection;
      break;
    case "investorType":
      delete next.investorType;
      break;
    case "lpLocation":
      delete next.lpLocation;
      break;
    case "daysSinceLastMeaningfulContact":
      delete next.daysSinceLastMeaningfulContact;
      break;
    case "openLoops":
      delete next.openLoops;
      break;
    case "stage":
      delete next.stage;
      break;
    default:
      break;
  }
  const parsed = relationshipFilterSchema.safeParse(next);
  return parsed.success ? parsed.data : {};
}
