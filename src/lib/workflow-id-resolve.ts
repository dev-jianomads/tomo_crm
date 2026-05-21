/**
 * Maps legacy playbook / Tomo-default ids to Workflows surface `workflows.id` values.
 * Used for deep links from Today attention groups and `/workflows` query params.
 */

export const WORKFLOW_SOURCE_TO_SURFACE_ID: Record<string, string> = {
  "pb-post-meeting": "wf-post-meeting-execution",
  "td-post-meeting-execution": "wf-post-meeting-execution",
  "td-meeting-notes": "wf-post-meeting-execution",
  "pb-three-touch-qualification": "wf-f7-three-touch",
  "td-three-touch-qualification": "wf-f7-three-touch",
  "pb-themed-outreach": "wf-themed-outreach",
  "pb-update-followup": "wf-themed-outreach",
  "pb-trip-orchestrator": "wf-trip-orchestrator",
  "pb-roadshow-prep": "wf-trip-orchestrator",
  "pb-ny-roadshow-2026": "wf-trip-orchestrator",
};

/** Resolve any workflow source id to the id used on `/workflows` (`?workflow=`). */
export function normalizeWorkflowSurfaceId(sourceId: string | null | undefined): string | null {
  if (!sourceId?.trim()) return null;
  const id = sourceId.trim();
  return WORKFLOW_SOURCE_TO_SURFACE_ID[id] ?? id;
}

export function workflowSurfaceHref(surfaceId: string): string {
  return `/workflows?workflow=${encodeURIComponent(surfaceId)}`;
}

/** Source id from an action row (playbook or Tomo default). */
export function workflowSourceIdFromAction(action: {
  workflowPlaybookId?: string;
  workflowTomoDefaultId?: string;
}): string | null {
  return action.workflowTomoDefaultId ?? action.workflowPlaybookId ?? null;
}
