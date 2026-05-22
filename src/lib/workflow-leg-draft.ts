/**
 * Draft state for a workflow leg sub-wizard (follow-up: single build view).
 */

import type { UserWorkflowAction, WorkflowLeg } from "@/lib/custom-playbook-schema";
import {
  defaultFollowUpTriggerSpec,
  defaultFollowUpTriggerSummary,
  formatFollowUpTriggerLabel,
  type WorkflowFollowUpTrigger,
} from "@/lib/workflow-follow-up-design";
import type {
  WorkflowActionBuildAttachment,
  WorkflowActionBuildLpDraft,
} from "@/lib/workflow-action-build";
import { summarizeUserWorkflowAction } from "@/lib/custom-playbook-schema";

export type WorkflowLegStep = "build";

export const WORKFLOW_LEG_STEPS: Array<{ id: WorkflowLegStep; label: string }> = [
  { id: "build", label: "Follow-up" },
];

export type WorkflowLegDraft = {
  trigger: string;
  triggerSpec: WorkflowFollowUpTrigger;
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
};

export function initialWorkflowLegDraft(): WorkflowLegDraft {
  const spec = defaultFollowUpTriggerSpec();
  return {
    trigger: defaultFollowUpTriggerSummary(),
    triggerSpec: spec,
    triggerConfirmed: true,
    actionSpec: null,
    actionPromptConfirmed: false,
    actionDescription: "",
    tomoInstruction: "",
    contextText: "",
    attachments: [],
    baseSubject: "",
    baseBody: "",
    lpDrafts: [],
  };
}

export function legStepIndex(step: WorkflowLegStep): number {
  return WORKFLOW_LEG_STEPS.findIndex((s) => s.id === step);
}

export type WorkflowLegBuildSubPhase = "context" | "review";

export function canGenerateLegDrafts(draft: WorkflowLegDraft): boolean {
  return draft.triggerConfirmed && Boolean(draft.trigger.trim());
}

export function legBuildSubPhase(draft: WorkflowLegDraft): WorkflowLegBuildSubPhase {
  return hasGeneratedLegDrafts(draft) ? "review" : "context";
}

export function clearLegGeneratedDraft(draft: WorkflowLegDraft): WorkflowLegDraft {
  return {
    ...draft,
    actionDescription: "",
    tomoInstruction: "",
    baseSubject: "",
    baseBody: "",
    lpDrafts: [],
    actionSpec: null,
    actionPromptConfirmed: false,
  };
}

export function hasGeneratedLegDrafts(draft: WorkflowLegDraft): boolean {
  return Boolean(
    draft.actionDescription.trim() &&
      draft.baseSubject.trim() &&
      draft.baseBody.trim() &&
      draft.lpDrafts.length > 0 &&
      draft.actionSpec?.kind === "send_email"
  );
}

export function canAdvanceLegStep(step: WorkflowLegStep, draft: WorkflowLegDraft): boolean {
  switch (step) {
    case "build":
      return hasGeneratedLegDrafts(draft);
    default:
      return false;
  }
}

export function maxReachableLegStep(_draft: WorkflowLegDraft): WorkflowLegStep {
  return "build";
}

export function workflowLegDraftFromStored(leg: WorkflowLeg): WorkflowLegDraft {
  const spec = leg.triggerSpec ?? defaultFollowUpTriggerSpec();
  let actionSpec = leg.actionSpec ?? null;
  const ab = leg.actionBuild;
  const baseSubject =
    ab?.baseSubject?.trim() || (actionSpec?.kind === "send_email" ? actionSpec.subject : "");
  const baseBody =
    ab?.baseBody?.trim() || (actionSpec?.kind === "send_email" ? actionSpec.body : "");
  if (!actionSpec && baseSubject && baseBody) {
    actionSpec = { kind: "send_email", subject: baseSubject, body: baseBody };
  }

  return {
    trigger: leg.trigger.trim() || formatFollowUpTriggerLabel(spec),
    triggerSpec: spec,
    triggerConfirmed: true,
    actionSpec,
    actionPromptConfirmed: Boolean(ab?.tomoInstruction?.trim()),
    actionDescription: ab?.actionDescription?.trim() || ab?.actionName?.trim() || leg.action,
    tomoInstruction: ab?.tomoInstruction?.trim() || "",
    contextText: ab?.contextText ?? "",
    attachments: ab?.attachments ?? [],
    baseSubject,
    baseBody,
    lpDrafts: ab?.lpDrafts ?? [],
  };
}

export function workflowLegDraftToStored(draft: WorkflowLegDraft): WorkflowLeg | null {
  if (!hasGeneratedLegDrafts(draft) || !draft.actionSpec || draft.actionSpec.kind !== "send_email") {
    return null;
  }

  const actionBuild = {
    actionName: draft.actionDescription.trim() || "Follow-up",
    contextText: draft.contextText,
    attachments: draft.attachments,
    tomoInstruction: draft.tomoInstruction,
    actionDescription: draft.actionDescription,
    baseSubject: draft.baseSubject,
    baseBody: draft.baseBody,
    lpDrafts: draft.lpDrafts.map((d) => ({ ...d, personalised: false })),
    approvedAllAt: new Date().toISOString(),
  };

  return {
    trigger: draft.trigger.trim() || formatFollowUpTriggerLabel(draft.triggerSpec),
    triggerSpec: draft.triggerSpec,
    action: summarizeUserWorkflowAction(draft.actionSpec),
    actionSpec: draft.actionSpec,
    actionBuild,
  };
}

export function setLegTriggerSpec(
  draft: WorkflowLegDraft,
  spec: WorkflowFollowUpTrigger
): WorkflowLegDraft {
  return {
    ...draft,
    triggerSpec: spec,
    trigger: formatFollowUpTriggerLabel(spec),
    triggerConfirmed: true,
  };
}
