/**
 * Two-word workflow pill labels for Today attention groups.
 * Mock workflows use a fixed registry; user-created workflows store `pillLabel` on the playbook row.
 */

import type { ActionItem } from "@/lib/mockData";
import { loadCustomPlaybooks } from "@/lib/customPlaybooks";
import { workflowSourceIdFromAction } from "@/lib/workflow-id-resolve";

/** Exactly two words — shown uppercase via `TomoWorkflowTag`. */
export type WorkflowPillLabel = string;

/** V1 mock attention workflows (playbook / Tomo-default source ids). */
export const MOCK_WORKFLOW_PILL_LABELS: Record<string, WorkflowPillLabel> = {
  "td-email-scheduling": "Slot Reply",
  "pb-intro-tracker": "Warm Intro",
  "pb-post-meeting": "Post Meet",
  "td-post-meeting-execution": "Post Meet",
  "pb-no-response-stall": "Silence Nudge",
  "pb-update-followup": "Update Pulse",
  "wf-post-meeting-execution": "Post Meet",
  "wf-themed-outreach": "Themed Push",
  "wf-trip-orchestrator": "Trip Outreach",
  "wf-f7-three-touch": "Three Touch",
};

const TWO_WORD_RE = /^[\p{L}\p{N}'-]+\s+[\p{L}\p{N}'-]+$/u;

export function isTwoWordPillLabel(label: string): boolean {
  return TWO_WORD_RE.test(label.trim());
}

/** Derive a two-word label from a longer workflow name (fallback when LLM label missing). */
export function deriveTwoWordPillLabelFromName(name: string): WorkflowPillLabel {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]} ${words[1]}`;
  if (words.length === 1) return `${words[0]} Flow`;
  return "Custom Flow";
}

export function resolveWorkflowPillLabelForSource(sourceId: string, actionPillOverride?: string): WorkflowPillLabel {
  if (actionPillOverride?.trim() && isTwoWordPillLabel(actionPillOverride)) {
    return actionPillOverride.trim();
  }
  const registry = MOCK_WORKFLOW_PILL_LABELS[sourceId];
  if (registry) return registry;

  const custom = loadCustomPlaybooks().find((p) => p.id === sourceId);
  if (custom?.pillLabel?.trim() && isTwoWordPillLabel(custom.pillLabel)) {
    return custom.pillLabel.trim();
  }
  if (custom?.name) return deriveTwoWordPillLabelFromName(custom.name);

  return deriveTwoWordPillLabelFromName(sourceId.replace(/^pb-/, "").replace(/-/g, " "));
}

export function resolveWorkflowPillLabelForAction(action: ActionItem): WorkflowPillLabel | null {
  const sourceId = workflowSourceIdFromAction(action);
  if (!sourceId) return null;
  if (action.workflowPillLabel?.trim() && isTwoWordPillLabel(action.workflowPillLabel)) {
    return action.workflowPillLabel.trim();
  }
  return resolveWorkflowPillLabelForSource(sourceId);
}
