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
import { STAGE_OPTIONS } from "@/lib/mockData";

const rangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

const stageEnum = STAGE_OPTIONS as unknown as readonly [string, ...string[]];

const llmFilterSchema = z.object({
  daysSinceLastMeaningfulContact: rangeSchema.nullable(),
  stage: z.array(z.enum(stageEnum)).nullable(),
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
  fundId: z.string().nullable(),
});

const llmWrappedSchema = z.object({
  filterFields: llmFilterSchema,
  parseCompleteness: z.enum(["full", "partial"]),
  missedIntent: z.string().nullable(),
});

const SYSTEM_PROMPT = `You parse natural language filter requests for an LP (investor) relationship CRM.

Return:
1) filterFields — same shape as before. Each enum field is an array; use arrays even for single values. Set irrelevant fields to null. Valid enum values are strict.

2) parseCompleteness — "full" if everything the user asked for is represented in filterFields. "partial" if they asked for something you cannot map to these fields, or only part of a multi-part request is mappable.

3) missedIntent — when parseCompleteness is "partial", a short user-facing note (one sentence) on what could not be mapped. When "full", use null.

query is a free-text substring against name, firm, OR geography display text (city / country / region). Do not invent a city enum. A city or country name is a complete mapping — parseCompleteness must be "full" and missedIntent null.

lpLocation is the region enum only: North America, EMEA, APAC, LATAM, Other. Map Europe → EMEA and US / USA → North America. Known region names go to lpLocation, not query. City and country strings go to query.

Examples for filterFields:
- "show Tier 1 LPs with no contact in 14 days" → tier: ["Tier 1"], daysSinceLastMeaningfulContact: { min: 14, max: null }
- "Tier 1 or Tier 2" → tier: ["Tier 1", "Tier 2"]
- "cooling relationships" → band: ["Cooling"] or momentumDirection: ["Cooling"]
- "family offices or endowments in North America" → investorType: ["Family office", "Endowment"], lpLocation: ["North America"]
- "family offices in North America" → investorType: ["Family office"], lpLocation: ["North America"] (region enum, not query)
- "LPs with open loops" → openLoops: { min: 1, max: null }
- "clear" or "show all" → all filter fields null (empty result after stripping)
- "Northwind" → query: "Northwind"
- "brisbane" → query: "brisbane" (full, not partial)
- "LPs in Australia" → query: "Australia"

For days: "no contact in X days" → daysSinceLastMeaningfulContact min: X; "contacted in last X days" → max: X.
When the user says "or" between values of the same field, include all values in the array.

If they ask for a concept that has no corresponding field (e.g. a custom segment name you cannot infer), set parseCompleteness to "partial" and explain in missedIntent. City, country, and geography keywords are not missed intent — they belong in query.`;

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

export type ParseFilterOutcome = "success" | "partial" | "failure";

export type ParseFilterOk = {
  filters: StructuredFilterCriteria;
  outcome: ParseFilterOutcome;
  /** User-facing detail for partial matches or heuristic path */
  message?: string;
  /** True when heuristics were used instead of or after LLM failure */
  fallback?: boolean;
};

export type ParseFilterError = { filters: null; error: string };

export async function parseFilterPrompt(
  text: string,
  currentFilters: Partial<StructuredFilterCriteria> = {}
): Promise<ParseFilterOk | ParseFilterError> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { filters: currentFilters as StructuredFilterCriteria, outcome: "success" };
  }
  if (/\b(clear|reset|show\s+all)\b/i.test(trimmed)) {
    return { filters: {}, outcome: "success" };
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: llmWrappedSchema,
        system: SYSTEM_PROMPT,
        prompt: `Parse this filter request: "${trimmed}"`,
      });

      const updates = stripNulls(object.filterFields as Record<string, unknown>) as Partial<StructuredFilterCriteria>;
      if (Object.keys(updates).length > 0) {
        const validated = validateAndMergeFilters(
          currentFilters as StructuredFilterCriteria,
          updates
        );
        if (validated) {
          const partialFromLlm = object.parseCompleteness === "partial";
          const missed = object.missedIntent?.trim();
          if (partialFromLlm) {
            return {
              filters: validated,
              outcome: "partial",
              message:
                missed ||
                "Some of your request could not be mapped to available filters — review active filters.",
            };
          }
          return { filters: validated, outcome: "success" };
        }
      }
      // No fields from LLM — try heuristics below
    } catch (err) {
      console.error("[parseFilterPrompt] LLM failed, using heuristic fallback", err);
    }
  } else {
    console.warn("[parseFilterPrompt] OPENAI_API_KEY not set, using heuristic only");
  }

  const heuristicUpdates = parseFilterPromptHeuristic(trimmed);
  const validated = validateAndMergeFilters(
    currentFilters as StructuredFilterCriteria,
    heuristicUpdates
  );
  if (validated) {
    const hasKeys = Object.keys(validated).length > 0;
    if (!hasKeys) {
      return { filters: null, error: "Could not interpret that as a filter" };
    }
    return {
      filters: validated,
      outcome: "partial",
      fallback: true,
      message: "Matched using quick rules — review active filters.",
    };
  }

  return { filters: null, error: "Failed to parse filter" };
}
