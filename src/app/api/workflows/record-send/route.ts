import { NextResponse } from "next/server";
import { z } from "zod";
import { applyOutboundWorkflowTag, taggedOutboundInteraction } from "@/lib/workflow-runs";
import type { WorkflowStepRunRecord } from "@/lib/workflow-runs";

const recordSendSchema = z.object({
  workflowRunId: z.string().uuid(),
  workflowStepRunId: z.string().uuid(),
  stepRun: z.custom<WorkflowStepRunRecord>(),
  interaction: z.object({
    id: z.string().min(1),
    lpContactId: z.string().min(1),
    lpEmailThreadId: z.string().nullable(),
    direction: z.literal("outbound"),
    interactedAt: z.string().min(1),
    providerInternetMessageId: z.string().nullable(),
  }),
});

/**
 * Returns updated step run + tagged interaction for persistence.
 * Mock client uses `recordWorkflowOutboundSend` in workflow-run-storage.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = recordSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const send = {
    workflowRunId: parsed.data.workflowRunId,
    workflowStepRunId: parsed.data.workflowStepRunId,
    interaction: parsed.data.interaction,
  };

  const updatedStepRun = applyOutboundWorkflowTag(parsed.data.stepRun, send);
  const taggedInteraction = taggedOutboundInteraction(send);

  return NextResponse.json({ ok: true, updatedStepRun, taggedInteraction });
}
