/**
 * Draft state for a workflow leg sub-wizard (follow-up: trigger → action → draft).
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

export type WorkflowLegStep = "trigger" | "action" | "draft";

export const WORKFLOW_LEG_STEPS: Array<{ id: WorkflowLegStep; label: string }> = [
  { id: "trigger", label: "Follow-up trigger" },
  { id: "action", label: "Follow-up action" },
  { id: "draft", label: "Follow-up draft" },
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

export function canAdvanceLegStep(step: WorkflowLegStep, draft: WorkflowLegDraft): boolean {
  switch (step) {
    case "trigger":
      return draft.triggerConfirmed && Boolean(draft.trigger.trim());
    case "action":
      return draft.actionPromptConfirmed && Boolean(draft.tomoInstruction.trim());
    case "draft":
      return Boolean(
        draft.actionDescription.trim() &&
          draft.baseSubject.trim() &&
          draft.baseBody.trim() &&
          draft.lpDrafts.length > 0 &&
          draft.actionSpec?.kind === "send_email"
      );
    default:
      return false;
  }
}

export function maxReachableLegStep(draft: WorkflowLegDraft): WorkflowLegStep {
  if (!canAdvanceLegStep("trigger", draft)) return "trigger";
  if (!canAdvanceLegStep("action", draft)) return "action";
  if (!canAdvanceLegStep("draft", draft)) return "draft";
  return "draft";
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
  if (!canAdvanceLegStep("draft", draft) || !draft.actionSpec || draft.actionSpec.kind !== "send_email") {
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
