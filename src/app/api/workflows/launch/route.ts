import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCohortLaunch, cohortLaunchesToRunSummaries } from "@/lib/workflow-runs";

const launchBodySchema = z.object({
  workspaceId: z.string().min(1).default("demo-workspace"),
  workflowId: z.string().min(1),
  listId: z.string().min(1),
  listName: z.string().min(1),
  lpContactIds: z.array(z.string().min(1)).min(1),
  launchParameters: z.record(z.string(), z.string()).optional(),
  startedByUserId: z.string().optional(),
  initialWorkflowStepId: z.string().optional(),
  stepPlan: z
    .object({
      primaryStepId: z.string().min(1),
      followUpStepId: z.string().optional(),
      followUpTriggerKind: z.enum(["wait", "on_inbound_reply"]).optional(),
      followUpWaitDays: z.number().int().positive().optional(),
    })
    .optional(),
  /** Existing runs for dedup (production: load from DB). */
  existingRuns: z
    .array(
      z.object({
        id: z.string().uuid(),
        workflowId: z.string(),
        lpContactId: z.string(),
        status: z.enum(["running", "paused", "completed", "cancelled", "failed"]),
      })
    )
    .optional(),
});

/**
 * Stateless cohort launch — returns UUIDs for client/DB persistence.
 * Mock UI persists via `launchWorkflowCohort` in `workflow-run-storage.ts` (localStorage).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = launchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = (parsed.data.existingRuns ?? []).map((r) => ({
    id: r.id,
    cohortLaunchId: "",
    workspaceId: parsed.data.workspaceId,
    workflowId: r.workflowId,
    lpContactId: r.lpContactId,
    listId: parsed.data.listId,
    listName: parsed.data.listName,
    status: r.status,
    startedAt: new Date().toISOString(),
    launchParameters: parsed.data.launchParameters ?? {},
  }));

  const { cohort, runs, stepRuns, skippedLpContactIds } = buildCohortLaunch(
    {
      workspaceId: parsed.data.workspaceId,
      workflowId: parsed.data.workflowId,
      listId: parsed.data.listId,
      listName: parsed.data.listName,
      lpContactIds: parsed.data.lpContactIds,
      launchParameters: parsed.data.launchParameters,
      startedByUserId: parsed.data.startedByUserId,
      initialWorkflowStepId: parsed.data.initialWorkflowStepId,
      stepPlan: parsed.data.stepPlan,
    },
    existing
  );

  const primaryStepRuns = stepRuns.filter(
    (sr) =>
      sr.workflowStepId ===
      (parsed.data.stepPlan?.primaryStepId ?? parsed.data.initialWorkflowStepId)
  );
  const followUpStepRuns = parsed.data.stepPlan?.followUpStepId
    ? stepRuns.filter((sr) => sr.workflowStepId === parsed.data.stepPlan!.followUpStepId)
    : [];

  const runHistory = cohortLaunchesToRunSummaries([cohort], runs);

  return NextResponse.json({
    cohortLaunchId: cohort.id,
    workflowRunIds: runs.map((r) => r.id),
    workflowStepRunIds: stepRuns.map((sr) => sr.id),
    primaryStepRunIds: primaryStepRuns.map((sr) => sr.id),
    followUpStepRunIds: followUpStepRuns.map((sr) => sr.id),
    registeredFollowUp: Boolean(parsed.data.stepPlan?.followUpStepId),
    skippedLpContactIds,
    enrolledCount: runs.length,
    runHistoryRow: runHistory[0] ?? null,
    runs,
    stepRuns,
  });
}
