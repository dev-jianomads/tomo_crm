/**
 * POST /api/tomo/filter-relationships
 * Parses natural language filter prompt and returns structured filter criteria.
 * Uses LLM for intent parsing; validates output with Zod before returning.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  relationshipFilterSchema,
  validateAndMergeFilters,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";

const rangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

/** Schema for LLM output — all optional, valid enum values */
const llmFilterSchema = z.object({
  daysSinceLastMeaningfulContact: rangeSchema.optional(),
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
    .optional(),
  momentumDirection: z.enum(["Heating up", "Stable", "Cooling", "All"]).optional(),
  tier: z.enum(["Tier 1", "Tier 2", "Tier 3", "All"]).optional(),
  relationshipOwner: z
    .enum(["You", "IR Person", "Placement Agent", "Unassigned", "All"])
    .optional(),
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
    .optional(),
  strategyFit: z
    .enum(["Active mandate", "Fully allocated", "No mandate", "Unknown", "All"])
    .optional(),
  strategyType: z
    .enum(["Global macro", "Long/short equity", "Multi-strat", "Credit", "Quant", "Other", "All"])
    .optional(),
  lpLocation: z
    .enum(["North America", "EMEA", "APAC", "LATAM", "Other", "All"])
    .optional(),
  investmentRemit: z
    .enum(["Global", "US only", "Europe only", "Asia only", "Emerging markets", "Other", "All"])
    .optional(),
  typicalCheckSize: z
    .enum(["<$5M", "$5–25M", "$25–50M", "$50–100M", "$100M+", "Unknown", "All"])
    .optional(),
  fundSizePreference: z
    .enum(["No cap", "≤5% of fund", "≤10% of fund", "Unknown", "All"])
    .optional(),
  source: z
    .enum(["Direct", "Placement agent", "Conference", "Warm intro", "Other", "All"])
    .optional(),
  sourceDetail: z.string().optional(),
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
    .optional(),
  decisionTimeline: z
    .enum(["Q1", "Q2", "Q3", "Q4", "Ad hoc", "Unknown", "All"])
    .optional(),
  fiscalYearEnd: z
    .enum(["Jan", "Mar", "Jun", "Sep", "Dec", "Unknown", "All"])
    .optional(),
  consultantDependent: z
    .enum(["Direct", "Consultant-dependent", "Unknown", "All"])
    .optional(),
  consultantName: z.string().optional(),
  esgRequired: z.enum(["Yes", "No", "Unknown", "All"]).optional(),
  band: z
    .enum(["Heating Up", "Active-Stable", "Cooling", "Stalled", "All"])
    .optional(),
  openLoops: z.union([rangeSchema, z.literal("all")]).optional(),
  query: z.string().optional(),
});

const SYSTEM_PROMPT = `You parse natural language filter requests for an LP (investor) relationship CRM.
Return a JSON object with ONLY the filter fields the user is asking for. Use "All" or omit the field if no filter applies.
Valid values are strict — use exactly the enum values provided in the schema.

Examples:
- "show Tier 1 LPs with no contact in 14 days" → { tier: "Tier 1", daysSinceLastMeaningfulContact: { min: 14 } }
- "cooling relationships" → { momentumDirection: "Cooling" } or { band: "Cooling" }
- "family offices in North America" → { investorType: "Family office", lpLocation: "North America" }
- "LPs with open loops" → { openLoops: { min: 1 } }
- "clear" or "show all" → return empty object {}
- "Northwind" or "Morgan" → { query: "Northwind" } (name/firm search)

For days: "no contact in X days" → { min: X }; "contacted in last X days" → { max: X }`;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[filter-relationships] OPENAI_API_KEY is not set");
      return Response.json(
        { error: "OpenAI API key not configured. Set OPENAI_API_KEY in your environment.", filters: null },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { prompt, currentFilters = {} } = body as {
      prompt?: string;
      currentFilters?: Partial<StructuredFilterCriteria>;
    };

    const text = typeof prompt === "string" ? prompt.trim() : "";
    if (!text) {
      return Response.json({ filters: currentFilters });
    }

    if (/\b(clear|reset|show\s+all)\b/i.test(text)) {
      return Response.json({ filters: {} });
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: llmFilterSchema,
      system: SYSTEM_PROMPT,
      prompt: `Parse this filter request: "${text}"`,
    });

    const updates = Object.fromEntries(
      Object.entries(object).filter(([, v]) => v !== undefined && v !== null)
    ) as Partial<StructuredFilterCriteria>;
    const validated = validateAndMergeFilters(currentFilters, updates);
    if (validated) {
      return Response.json({ filters: validated });
    }

    return Response.json({ filters: currentFilters });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError = /api[_-]?key|401|unauthorized/i.test(message);
    console.error("[filter-relationships]", err);

    return Response.json(
      {
        error: "Failed to parse filter",
        detail: process.env.NODE_ENV === "development" || isAuthError ? message : undefined,
        filters: null,
      },
      { status: 500 }
    );
  }
}
