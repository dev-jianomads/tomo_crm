/**
 * POST /api/tomo/generate-workflow-cohort-draft
 *
 * Generates a cohort email template for the workflow create wizard Draft step.
 * Pass `draftKind: "follow_up"` and `primaryTemplate` for contextual follow-up legs.
 */

import { z } from "zod";
import { generateWorkflowCohortDraft } from "@/lib/workflow-cohort-draft";

const primaryTemplateSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  trigger: z.string().optional(),
  actionDescription: z.string().optional(),
});

const requestSchema = z.object({
  workflowName: z.string().min(1),
  listName: z.string().min(1),
  instruction: z.string().min(1),
  contextText: z.string().optional().default(""),
  trigger: z.string().optional(),
  attachmentNames: z.array(z.string()).optional(),
  draftKind: z.enum(["primary", "follow_up"]).optional().default("primary"),
  primaryTemplate: primaryTemplateSchema.optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { draft, usedLlm } = await generateWorkflowCohortDraft(parsed.data);

  return Response.json({ ...draft, usedLlm });
}
