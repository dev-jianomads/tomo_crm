/**
 * POST /api/tomo/filter-relationships
 * Parses natural language filter prompt and returns structured filter criteria.
 * Uses LLM for intent parsing; validates output with Zod before returning.
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

/**
 * Schema for LLM output — uses .nullable() instead of .optional()
 * because Zod v4 + OpenAI structured outputs requires all properties
 * in the JSON schema `required` array. Null values are stripped after parsing.
 */
const llmFilterSchema = z.object({
  daysSinceLastMeaningfulContact: rangeSchema.nullable(),
  stage: z
    .enum([
      "First contact",
      "Deck sent",
      "Met",
      "Active diligence",
      "DD",
      "Soft circle",
      "Closed",
      "Pass",
      "All",
    ])
    .nullable(),
  momentumDirection: z.enum(["Heating up", "Stable", "Cooling", "All"]).nullable(),
  tier: z.enum(["Tier 1", "Tier 2", "Tier 3", "All"]).nullable(),
  relationshipOwner: z
    .enum(["You", "IR Person", "Placement Agent", "Unassigned", "All"])
    .nullable(),
  investorType: z
    .enum([
      "Family office",
      "Endowment",
      "Pension fund",
      "Sovereign wealth fund",
      "Fund-of-funds",
      "UHNW",
      "Insurance",
      "Foundation",
      "All",
    ])
    .nullable(),
  strategyFit: z
    .enum(["Active mandate", "Fully allocated", "No mandate", "Unknown", "All"])
    .nullable(),
  strategyType: z
    .enum(["Global macro", "Long/short equity", "Multi-strat", "Credit", "Quant", "Other", "All"])
    .nullable(),
  lpLocation: z
    .enum(["North America", "EMEA", "APAC", "LATAM", "Other", "All"])
    .nullable(),
  investmentRemit: z
    .enum(["Global", "US only", "Europe only", "Asia only", "Emerging markets", "Other", "All"])
    .nullable(),
  typicalCheckSize: z
    .enum(["<$5M", "$5–25M", "$25–50M", "$50–100M", "$100M+", "Unknown", "All"])
    .nullable(),
  fundSizePreference: z
    .enum(["No cap", "≤5% of fund", "≤10% of fund", "Unknown", "All"])
    .nullable(),
  source: z
    .enum(["Direct", "Placement agent", "Conference", "Warm intro", "Other", "All"])
    .nullable(),
  sourceDetail: z.string().nullable(),
  lastFundHistory: z
    .enum([
      "New prospect",
      "Invested Fund I",
      "Invested Fund II",
      "Re-upped",
      "Passed",
      "Unknown",
      "All",
    ])
    .nullable(),
  decisionTimeline: z
    .enum(["Q1", "Q2", "Q3", "Q4", "Ad hoc", "Unknown", "All"])
    .nullable(),
  fiscalYearEnd: z
    .enum(["Jan", "Mar", "Jun", "Sep", "Dec", "Unknown", "All"])
    .nullable(),
  consultantDependent: z
    .enum(["Direct", "Consultant-dependent", "Unknown", "All"])
    .nullable(),
  consultantName: z.string().nullable(),
  esgRequired: z.enum(["Yes", "No", "Unknown", "All"]).nullable(),
  band: z
    .enum(["Heating Up", "Active-Stable", "Cooling", "Stalled", "All"])
    .nullable(),
  openLoops: rangeSchema.nullable(),
  query: z.string().nullable(),
});

const SYSTEM_PROMPT = `You parse natural language filter requests for an LP (investor) relationship CRM.
Return a JSON object with filter fields. Set relevant fields to the appropriate value. Set irrelevant fields to null.
Valid values are strict — use exactly the enum values provided in the schema.

Examples:
- "show Tier 1 LPs with no contact in 14 days" → { tier: "Tier 1", daysSinceLastMeaningfulContact: { min: 14 } }
- "cooling relationships" → { momentumDirection: "Cooling" } or { band: "Cooling" }
- "family offices in North America" → { investorType: "Family office", lpLocation: "North America" }
- "LPs with open loops" → { openLoops: { min: 1 } }
- "clear" or "show all" → return empty object {}
- "Northwind" or "Morgan" → { query: "Northwind" } (name/firm search)

For days: "no contact in X days" → { min: X }; "contacted in last X days" → { max: X }`;

function tryHeuristicFallback(
  text: string,
  currentFilters: Partial<StructuredFilterCriteria>
): StructuredFilterCriteria | null {
  const updates = parseFilterPromptHeuristic(text);
  return validateAndMergeFilters(currentFilters, updates);
}

export async function POST(req: Request) {
  let body: { prompt?: string; currentFilters?: Partial<StructuredFilterCriteria> };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid request body", filters: null },
      { status: 400 }
    );
  }

  const { prompt, currentFilters = {} } = body;
  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (!text) {
    return Response.json({ filters: currentFilters });
  }
  if (/\b(clear|reset|show\s+all)\b/i.test(text)) {
    return Response.json({ filters: {} });
  }

  // Try LLM when API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: llmFilterSchema,
        system: SYSTEM_PROMPT,
        prompt: `Parse this filter request: "${text}"`,
      });

      const stripped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(object)) {
        if (v === null || v === undefined) continue;
        if (typeof v === "object" && !Array.isArray(v)) {
          const inner = Object.fromEntries(
            Object.entries(v as Record<string, unknown>).filter(([, iv]) => iv !== null && iv !== undefined)
          );
          if (Object.keys(inner).length > 0) stripped[k] = inner;
        } else {
          stripped[k] = v;
        }
      }
      const updates = stripped as Partial<StructuredFilterCriteria>;
      const validated = validateAndMergeFilters(currentFilters, updates);
      if (validated) {
        return Response.json({ filters: validated });
      }
    } catch (err) {
      console.error("[filter-relationships] LLM failed, using heuristic fallback", err);
    }
  } else {
    console.warn("[filter-relationships] OPENAI_API_KEY not set, using heuristic only");
  }

  // Heuristic fallback: works for "show Tier 1", "cooling relationships", etc.
  const heuristicResult = tryHeuristicFallback(text, currentFilters);
  if (heuristicResult) {
    return Response.json({ filters: heuristicResult, fallback: true });
  }

  return Response.json(
    { error: "Failed to parse filter", filters: null },
    { status: 500 }
  );
}
