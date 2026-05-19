/**
 * Action build — configuration surface for the single V1 custom workflow action step.
 * Persisted on CustomPlaybookStored.actionBuild (mock: localStorage).
 */

import type { WorkflowDraft, WorkflowDraftStatus } from "@/lib/workflow-surface-mock";

export type WorkflowActionBuildAttachment = {
  id: string;
  name: string;
  meta: string;
};

export type WorkflowActionBuildLpDraft = WorkflowDraft & {
  /** Override from cohort base draft when personalised. */
  personalised: boolean;
};

export type WorkflowActionBuildConfig = {
  /** Display name for the action step (may differ from workflow name). */
  actionName: string;
  contextText: string;
  attachments: WorkflowActionBuildAttachment[];
  tomoInstruction: string;
  /** Cohort-wide draft Tomo generated before per-LP overrides. */
  baseSubject: string;
  baseBody: string;
  lpDrafts: WorkflowActionBuildLpDraft[];
  /** Set when GP chose approve-all without per-LP edits. */
  approvedAllAt?: string;
};

export const WORKFLOW_ACTION_BUILD_SUGGESTION_PILLS = [
  "Draft a short cover email",
  "Include my availability next week",
  "Mention the attached materials",
  "Warmer tone, under 120 words",
  "Add a single clear call to action",
] as const;

/** Demo cohort drafts for action build personalise step. */
export function buildMockActionBuildLpDrafts(listLabel: string): WorkflowActionBuildLpDraft[] {
  const baseSubject = `Following up — ${listLabel}`;
  const baseBody =
    "I wanted to share a short note ahead of our next conversation. Happy to find time if useful.\n\nBest regards,";

  const rows: Array<Pick<WorkflowActionBuildLpDraft, "lpName" | "firmName" | "roleLabel" | "tierLabel" | "email">> = [
    {
      lpName: "Charly Malek",
      firmName: "UBS Hedge Fund Solutions",
      roleLabel: "Head of Manager Research",
      tierLabel: "Tier 1",
      email: "charly.malek@ubs.com",
    },
    {
      lpName: "Marie-Claude Dumas",
      firmName: "Wellcome Trust",
      roleLabel: "Investment Director",
      tierLabel: "Tier 1",
      email: "marieclaude@wellcome.org",
    },
    {
      lpName: "James McIntyre",
      firmName: "Future Fund Australia",
      roleLabel: "Portfolio Manager",
      tierLabel: "Tier 2",
      email: "james.mcintyre@futurefund.gov.au",
    },
    {
      lpName: "Edoardo Lanzavecchia",
      firmName: "Lingotto Investment Management",
      roleLabel: "Head of HF Allocations",
      tierLabel: "Tier 1",
      email: "edoardo@lingotto.com",
    },
  ];

  return rows.map((row, i) => ({
    id: `action-build-draft-${i}`,
    ...row,
    subject: baseSubject,
    body: `${row.lpName.split(" ")[0]}, ${baseBody}`,
    status: "ready" as WorkflowDraftStatus,
    personalised: false,
  }));
}

export function mockTomoGenerateCohortDraft(params: {
  actionName: string;
  contextText: string;
  instruction: string;
  listName: string;
}): { subject: string; body: string } {
  const snippet = params.instruction.trim() || "a concise outreach email";
  return {
    subject: `${params.actionName} — ${params.listName}`,
    body: `Hi {{lp_first_name}},\n\n${snippet}.\n\n${
      params.contextText.trim() ? `${params.contextText.trim()}\n\n` : ""
    }Let me know if a short call would be useful.\n\nBest regards,`,
  };
}
