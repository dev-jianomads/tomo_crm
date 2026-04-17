/**
 * POST /api/tomo/filter-relationships
 * Parses natural language filter prompt and returns structured filter criteria.
 */

import { parseFilterPrompt } from "@/lib/parseFilterPrompt";
import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";

export async function POST(req: Request) {
  let body: { prompt?: string; currentFilters?: Partial<StructuredFilterCriteria> };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { outcome: "failure" as const, filters: null, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { prompt, currentFilters = {} } = body;
  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (!text) {
    return Response.json({
      outcome: "success" as const,
      filters: currentFilters as StructuredFilterCriteria,
    });
  }

  const result = await parseFilterPrompt(text, currentFilters);

  if ("error" in result && result.filters === null) {
    return Response.json(
      {
        outcome: "failure" as const,
        filters: null,
        error: result.error,
      },
      { status: 422 }
    );
  }

  const ok = result as import("@/lib/parseFilterPrompt").ParseFilterOk;
  return Response.json({
    outcome: ok.outcome,
    filters: ok.filters,
    message: ok.message,
    fallback: ok.fallback,
  });
}
