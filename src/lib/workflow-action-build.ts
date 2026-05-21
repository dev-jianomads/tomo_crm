/**
 * Action build — configuration surface for the single V1 custom workflow action step.
 * Persisted on CustomPlaybookStored.actionBuild (mock: localStorage).
 */

import type { WorkflowDraft, WorkflowDraftStatus } from "@/lib/workflow-surface-mock";
import { deriveWorkflowActionDescription } from "@/lib/workflow-action-description";

export type WorkflowActionBuildAttachment = {
  id: string;
  name: string;
  meta: string;
  /** Plain text extracted from uploaded .docx / .pdf (wizard). */
  extractedText?: string;
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
  /** Short LLM summary of what happens on the action step. */
  actionDescription?: string;
  /** Cohort-wide draft Tomo generated before per-LP overrides. */
  baseSubject: string;
  baseBody: string;
  lpDrafts: WorkflowActionBuildLpDraft[];
  /** Set when GP chose approve-all without per-LP edits. */
  approvedAllAt?: string;
};

/** Action-type pills on the wizard Action step (right column). */
export const WORKFLOW_WIZARD_ACTION_PILLS = [
  {
    id: "cover_letter",
    label: "Draft cover letter",
    instruction: "Draft a personalized cover letter email for each LP on this list.",
    kind: "send_email" as const,
  },
  {
    id: "request_meeting",
    label: "Request meeting",
    instruction: "Request a brief meeting or call with each LP, proposing times next week.",
    kind: "schedule_meeting" as const,
  },
  {
    id: "conference",
    label: "Conference / roadshow",
    instruction: "Invite each LP to meet at our upcoming conference or roadshow event.",
    kind: "send_email" as const,
  },
] as const;

/** Follow-up leg wizard — send_email only (V1.5). */
export const WORKFLOW_FOLLOW_UP_ACTION_PILLS = [
  {
    id: "follow_up_nudge",
    label: "Light follow-up nudge",
    instruction:
      "Draft a short, contextual follow-up that references the primary outreach. Keep it under 100 words with one clear ask.",
    kind: "send_email" as const,
  },
  {
    id: "follow_up_reply",
    label: "Reply to LP response",
    instruction:
      "Draft a thoughtful reply that acknowledges what the LP said in their email and moves the conversation forward using the primary thread context.",
    kind: "send_email" as const,
  },
] as const;

export function mergeContextWithAttachmentText(
  contextText: string,
  attachments: WorkflowActionBuildAttachment[]
): string {
  const docBlocks = attachments
    .filter((a) => a.extractedText?.trim())
    .map((a) => `--- ${a.name} ---\n${a.extractedText!.trim()}`);
  if (!docBlocks.length) return contextText.trim();
  const base = contextText.trim();
  return [base, ...docBlocks].filter(Boolean).join("\n\n");
}

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
  trigger?: string;
}): { subject: string; body: string; actionDescription: string } {
  const snippet = params.instruction.trim() || "a concise outreach email";
  const triggerNote = params.trigger?.trim() ? ` when the workflow runs (${params.trigger.trim()})` : "";
  return {
    subject: `${params.actionName} — ${params.listName}`,
    body: `Hi {{lp_first_name}},\n\n${snippet}.\n\n${
      params.contextText.trim() ? `${params.contextText.trim()}\n\n` : ""
    }Let me know if a short call would be useful.\n\nBest regards,`,
    actionDescription: deriveWorkflowActionDescription({
      instruction: params.instruction,
      actionDescription: null,
    }),
  };
}
