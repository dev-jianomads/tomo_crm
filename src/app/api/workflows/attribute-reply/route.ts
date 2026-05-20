import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyInboundReplyAttribution,
  attributeInboundReply,
  type WorkflowRunRecord,
  type WorkflowStepRunRecord,
  type WorkflowTaggedInteraction,
} from "@/lib/workflow-runs";

const attributeReplySchema = z.object({
  inbound: z.object({
    id: z.string().min(1),
    lpContactId: z.string().min(1),
    lpEmailThreadId: z.string().nullable(),
    direction: z.literal("inbound"),
    interactedAt: z.string().min(1),
    providerInternetMessageId: z.string().nullable(),
    inReplyToMessageId: z.string().nullable().optional(),
    isOoo: z.boolean().optional(),
    isMeaningfulTouch: z.boolean().optional(),
  }),
  runs: z.array(z.custom<WorkflowRunRecord>()).default([]),
  stepRuns: z.array(z.custom<WorkflowStepRunRecord>()).default([]),
  outboundInteractions: z.array(z.custom<WorkflowTaggedInteraction>()).default([]),
});

/** Stateless reply matcher — production ingest passes DB-loaded runs/stepRuns/outbound. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = attributeReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const inbound: WorkflowTaggedInteraction = {
    ...parsed.data.inbound,
    workflowRunId: null,
    workflowStepRunId: null,
  };

  const outboundById = new Map(
    parsed.data.outboundInteractions
      .filter((i) => i.direction === "outbound")
      .map((i) => [i.id, i])
  );

  const result = attributeInboundReply(
    inbound,
    parsed.data.runs,
    parsed.data.stepRuns,
    outboundById
  );

  let updatedStepRun: WorkflowStepRunRecord | undefined;
  if (result.attributed && result.workflowStepRunId) {
    const sr = parsed.data.stepRuns.find((s) => s.id === result.workflowStepRunId);
    if (sr && sr.status === "sent") {
      updatedStepRun = applyInboundReplyAttribution(sr, {
        ...inbound,
        workflowRunId: result.workflowRunId ?? null,
        workflowStepRunId: result.workflowStepRunId ?? null,
      });
    }
  }

  return NextResponse.json({ ...result, updatedStepRun });
}
