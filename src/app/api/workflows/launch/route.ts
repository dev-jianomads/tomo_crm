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
    },
    existing
  );

  const runHistory = cohortLaunchesToRunSummaries([cohort], runs);

  return NextResponse.json({
    cohortLaunchId: cohort.id,
    workflowRunIds: runs.map((r) => r.id),
    workflowStepRunIds: stepRuns.map((sr) => sr.id),
    skippedLpContactIds,
    enrolledCount: runs.length,
    runHistoryRow: runHistory[0] ?? null,
    runs,
    stepRuns,
  });
}
