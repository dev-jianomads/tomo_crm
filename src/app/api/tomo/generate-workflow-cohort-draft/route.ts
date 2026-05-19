/**
 * POST /api/tomo/generate-workflow-cohort-draft
 *
 * Generates a cohort email template for the workflow create wizard Draft step.
 */

import { z } from "zod";
import { generateWorkflowCohortDraft } from "@/lib/workflow-cohort-draft";

const requestSchema = z.object({
  workflowName: z.string().min(1),
  listName: z.string().min(1),
  instruction: z.string().min(1),
  contextText: z.string().optional().default(""),
  trigger: z.string().optional(),
  attachmentNames: z.array(z.string()).optional(),
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
