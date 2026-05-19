/**
 * State for the unified Workflows "New workflow" create wizard.
 */

import type { UserWorkflowAction } from "@/lib/custom-playbook-schema";
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
      return draft.actionSpec !== null;
    case "draft":
      return Boolean(draft.baseSubject.trim() && draft.baseBody.trim() && draft.lpDrafts.length > 0);
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
