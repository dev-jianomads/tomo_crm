/**
 * Shared filter parsing logic for relationship filters.
 * Used by /api/tomo/filter-relationships and the orchestrator filter_relationships tool.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  parseFilterPromptHeuristic,
  validateAndMergeFilters,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";

const rangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

const llmFilterSchema = z.object({
  daysSinceLastMeaningfulContact: rangeSchema.nullable(),
  stage: z
    .array(z.enum([
      "First contact", "Deck sent", "Met", "Active diligence",
      "DD", "Soft circle", "Closed", "Pass",
    ]))
    .nullable(),
  momentumDirection: z.array(z.enum(["Heating up", "Stable", "Cooling"])).nullable(),
  tier: z.array(z.enum(["Tier 1", "Tier 2", "Tier 3"])).nullable(),
  relationshipOwner: z
    .array(z.enum(["You", "IR Person", "Placement Agent", "Unassigned"]))
    .nullable(),
  investorType: z
    .array(z.enum([
      "Family office", "Endowment", "Pension fund", "Sovereign wealth fund",
      "Fund-of-funds", "UHNW", "Insurance", "Foundation",
    ]))
    .nullable(),
  strategyFit: z
    .array(z.enum(["Active mandate", "Fully allocated", "No mandate", "Unknown"]))
    .nullable(),
  strategyType: z
    .array(z.enum(["Global macro", "Long/short equity", "Multi-strat", "Credit", "Quant", "Other"]))
    .nullable(),
  lpLocation: z
    .array(z.enum(["North America", "EMEA", "APAC", "LATAM", "Other"]))
    .nullable(),
  investmentRemit: z
    .array(z.enum(["Global", "US only", "Europe only", "Asia only", "Emerging markets", "Other"]))
    .nullable(),
  typicalCheckSize: z
    .array(z.enum(["<$5M", "$5–25M", "$25–50M", "$50–100M", "$100M+", "Unknown"]))
    .nullable(),
  fundSizePreference: z
    .array(z.enum(["No cap", "≤5% of fund", "≤10% of fund", "Unknown"]))
    .nullable(),
  source: z
    .array(z.enum(["Direct", "Placement agent", "Conference", "Warm intro", "Other"]))
    .nullable(),
  sourceDetail: z.string().nullable(),
  lastFundHistory: z
    .array(z.enum([
      "New prospect", "Invested Fund I", "Invested Fund II",
      "Re-upped", "Passed", "Unknown",
    ]))
    .nullable(),
  decisionTimeline: z
    .array(z.enum(["Q1", "Q2", "Q3", "Q4", "Ad hoc", "Unknown"]))
    .nullable(),
  fiscalYearEnd: z
    .array(z.enum(["Jan", "Mar", "Jun", "Sep", "Dec", "Unknown"]))
    .nullable(),
  consultantDependent: z
    .array(z.enum(["Direct", "Consultant-dependent", "Unknown"]))
    .nullable(),
  consultantName: z.string().nullable(),
  esgRequired: z.array(z.enum(["Yes", "No", "Unknown"])).nullable(),
  band: z
    .array(z.enum(["Heating Up", "Active-Stable", "Cooling", "Stalled"]))
    .nullable(),
  openLoops: rangeSchema.nullable(),
  query: z.string().nullable(),
});

const SYSTEM_PROMPT = `You parse natural language filter requests for an LP (investor) relationship CRM.
Return a JSON object with filter fields. Each enum field is an array — use arrays even for single values.
Set irrelevant fields to null. Valid values are strict — use exactly the enum values provided in the schema.

Examples:
- "show Tier 1 LPs with no contact in 14 days" → { tier: ["Tier 1"], daysSinceLastMeaningfulContact: { min: 14 } }
- "Tier 1 or Tier 2" → { tier: ["Tier 1", "Tier 2"] }
- "cooling relationships" → { momentumDirection: ["Cooling"] } or { band: ["Cooling"] }
- "family offices or endowments in North America" → { investorType: ["Family office", "Endowment"], lpLocation: ["North America"] }
- "family offices in North America or EMEA" → { investorType: ["Family office"], lpLocation: ["North America", "EMEA"] }
- "LPs with open loops" → { openLoops: { min: 1 } }
- "clear" or "show all" → return empty object {}
- "Northwind" or "Morgan" → { query: "Northwind" } (name/firm search)

For days: "no contact in X days" → { min: X }; "contacted in last X days" → { max: X }
When the user says "or" between values of the same field, include all values in the array.`;

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length > 0) stripped[k] = v;
    } else if (typeof v === "object") {
      const inner = Object.fromEntries(
        Object.entries(v as Record<string, unknown>).filter(
          ([, iv]) => iv !== null && iv !== undefined
        )
      );
      if (Object.keys(inner).length > 0) stripped[k] = inner;
    } else {
      stripped[k] = v;
    }
  }
  return stripped;
}

export type ParseFilterResult = {
  filters: StructuredFilterCriteria;
  fallback?: boolean;
};

export async function parseFilterPrompt(
  text: string,
  currentFilters: Partial<StructuredFilterCriteria> = {}
): Promise<ParseFilterResult | { filters: null; error: string }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { filters: currentFilters as StructuredFilterCriteria };
  }
  if (/\b(clear|reset|show\s+all)\b/i.test(trimmed)) {
    return { filters: {} };
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: llmFilterSchema,
        system: SYSTEM_PROMPT,
        prompt: `Parse this filter request: "${trimmed}"`,
      });

      const updates = stripNulls(object as Record<string, unknown>) as Partial<StructuredFilterCriteria>;
      const validated = validateAndMergeFilters(
        currentFilters as StructuredFilterCriteria,
        updates
      );
      if (validated) {
        return { filters: validated };
      }
    } catch (err) {
      console.error("[parseFilterPrompt] LLM failed, using heuristic fallback", err);
    }
  }

  const heuristicUpdates = parseFilterPromptHeuristic(trimmed);
  const validated = validateAndMergeFilters(
    currentFilters as StructuredFilterCriteria,
    heuristicUpdates
  );
  if (validated) {
    return { filters: validated, fallback: true };
  }

  return { filters: null, error: "Failed to parse filter" };
}
