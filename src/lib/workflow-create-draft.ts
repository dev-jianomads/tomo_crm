/**
 * State for the unified Workflows "New workflow" create wizard.
 */

import type { CustomPlaybookStored, UserWorkflowAction } from "@/lib/custom-playbook-schema";
import type {
  WorkflowActionBuildAttachment,
  WorkflowActionBuildLpDraft,
} from "@/lib/workflow-action-build";

export type WorkflowCreateStep = "name" | "trigger" | "action" | "draft" | "personalise";

export const WORKFLOW_CREATE_STEPS: Array<{ id: WorkflowCreateStep; label: string }> = [
  { id: "name", label: "Name" },
  { id: "trigger", label: "Trigger" },
  { id: "action", label: "Action" },
  { id: "draft", label: "Draft" },
  { id: "personalise", label: "Personalise" },
];

export type WorkflowCreateDraft = {
  workflowName: string;
  trigger: string | null;
  triggerSummary: string | null;
  triggerConfirmed: boolean;
  actionSpec: UserWorkflowAction | null;
  actionPromptConfirmed: boolean;
  actionDescription: string;
  tomoInstruction: string;
  contextText: string;
  attachments: WorkflowActionBuildAttachment[];
  baseSubject: string;
  baseBody: string;
  lpDrafts: WorkflowActionBuildLpDraft[];
  personaliseEnabled: boolean;
};

export function initialWorkflowCreateDraft(): WorkflowCreateDraft {
  return {
    workflowName: "",
    trigger: null,
    triggerSummary: null,
    triggerConfirmed: false,
    actionSpec: null,
    actionPromptConfirmed: false,
    actionDescription: "",
    tomoInstruction: "",
    contextText: "",
    attachments: [],
    baseSubject: "",
    baseBody: "",
    lpDrafts: [],
    personaliseEnabled: false,
  };
}

export function stepIndex(step: WorkflowCreateStep): number {
  return WORKFLOW_CREATE_STEPS.findIndex((s) => s.id === step);
}

export function canAdvanceFromStep(step: WorkflowCreateStep, draft: WorkflowCreateDraft): boolean {
  switch (step) {
    case "name":
      return draft.workflowName.trim().length >= 2;
    case "trigger":
      return draft.triggerConfirmed && Boolean(draft.trigger?.trim());
    case "action":
      return draft.actionPromptConfirmed && Boolean(draft.tomoInstruction.trim());
    case "draft":
      return Boolean(
        draft.actionDescription.trim() &&
          draft.baseSubject.trim() &&
          draft.baseBody.trim() &&
          draft.lpDrafts.length > 0
      );
    case "personalise":
      return draft.lpDrafts.length > 0;
    default:
      return false;
  }
}

export function maxReachableStep(draft: WorkflowCreateDraft): WorkflowCreateStep {
  if (!canAdvanceFromStep("name", draft)) return "name";
  if (!canAdvanceFromStep("trigger", draft)) return "trigger";
  if (!canAdvanceFromStep("action", draft)) return "action";
  if (!canAdvanceFromStep("draft", draft)) return "draft";
  return draft.personaliseEnabled ? "personalise" : "draft";
}

/** Hydrate wizard state when editing a saved custom workflow. */
export function workflowCreateDraftFromStored(pb: CustomPlaybookStored): WorkflowCreateDraft {
  const ab = pb.actionBuild;
  let actionSpec = pb.actionSpec ?? null;
  const baseSubject =
    ab?.baseSubject?.trim() ||
    (actionSpec?.kind === "send_email" ? actionSpec.subject : "");
  const baseBody =
    ab?.baseBody?.trim() || (actionSpec?.kind === "send_email" ? actionSpec.body : "");
  if (!actionSpec && baseSubject && baseBody) {
    actionSpec = { kind: "send_email", subject: baseSubject, body: baseBody };
  }
  const lpDrafts = ab?.lpDrafts ?? [];
  const personalised = lpDrafts.some((d) => d.personalised);

  return {
    workflowName: pb.name,
    trigger: pb.trigger,
    triggerSummary: null,
    triggerConfirmed: true,
    actionSpec,
    actionPromptConfirmed: Boolean(ab?.tomoInstruction?.trim()),
    actionDescription: ab?.actionDescription?.trim() || ab?.actionName?.trim() || pb.action,
    tomoInstruction: ab?.tomoInstruction?.trim() || "",
    contextText: ab?.contextText ?? "",
    attachments: ab?.attachments ?? [],
    baseSubject,
    baseBody,
    lpDrafts,
    personaliseEnabled: personalised || Boolean(ab && !ab.approvedAllAt && lpDrafts.length > 0),
  };
}
