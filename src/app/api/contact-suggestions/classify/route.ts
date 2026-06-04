/**
 * POST /api/contact-suggestions/classify
 *
 * Mock §3.3a classifier — pre-filter, golden fixtures, rules + optional LLM.
 * Client runs CRM match ladder before calling; passes crmMatchConfidence when known.
 */

import { z } from "zod";
import {
  classifyInboundEmail,
  type ClassifyInboundResult,
} from "@/lib/contact-suggestion-classifier";

const crmMatchConfidenceSchema = z.enum([
  "exact_email",
  "name_plus_firm",
  "domain_only",
  "no_match",
]);

const requestSchema = z.object({
  from: z.string().min(1),
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
  isOoo: z.boolean().optional(),
  crmMatchConfidence: crmMatchConfidenceSchema.optional(),
  existingContactName: z.string().optional(),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${field}: ${issue.message}`;
    })
    .join("; ");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: formatValidationError(parsed.error),
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result: ClassifyInboundResult = await classifyInboundEmail(parsed.data);

  return Response.json(result);
}
