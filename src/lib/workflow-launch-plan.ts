/**
 * Resolve launch step ids from surface entries / stored custom playbooks (Phase 3).
 */

import type { CustomPlaybookStored } from "@/lib/custom-playbook-schema";
import { hasValidStoredFollowUp } from "@/lib/custom-playbook-surface";
import {
  validateStoredFollowUp,
  workflowCustomStepIds,
} from "@/lib/workflow-follow-up-design";
import type { WorkflowLaunchStepPlan } from "@/lib/workflow-runs";
import type { WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

export type { WorkflowLaunchStepPlan };

export type ResolvedLaunchInput = {
  initialWorkflowStepId: string;
  stepPlan: WorkflowLaunchStepPlan;
};

export function resolvePrimaryWorkflowStepId(entry: WorkflowSurfaceEntry): string | undefined {
  const primary = entry.steps.find(
    (s) => s.nodeType === "action" && s.id.endsWith("-primary")
  );
  if (primary) return primary.id;

  const firstAction = entry.steps.find(
    (s) => s.nodeType === "action" && s.actionType !== "outcome_capture"
  );
  return firstAction?.id;
}

export function launchStepPlanFromSurfaceEntry(
  entry: WorkflowSurfaceEntry
): WorkflowLaunchStepPlan | null {
  const primaryStepId = resolvePrimaryWorkflowStepId(entry);
  if (!primaryStepId) return null;

  const followUpStep = entry.steps.find(
    (s) =>
      s.nodeType === "action" &&
      (s.id.endsWith("-follow-up") || s.id.includes("follow-up"))
  );
  if (!followUpStep) {
    return { primaryStepId };
  }

  return {
    primaryStepId,
    followUpStepId: followUpStep.id,
  };
}

export function launchStepPlanFromCustomStored(
  c: CustomPlaybookStored
): WorkflowLaunchStepPlan {
  const ids = workflowCustomStepIds(c.id);
  const plan: WorkflowLaunchStepPlan = { primaryStepId: ids.primary };

  if (!c.followUp || !hasValidStoredFollowUp(c)) return plan;

  const spec = c.followUp.triggerSpec;
  plan.followUpStepId = ids.followUp;
  if (spec?.kind === "wait") {
    plan.followUpTriggerKind = "wait";
    plan.followUpWaitDays = spec.days;
  } else if (spec?.kind === "on_inbound_reply") {
    plan.followUpTriggerKind = "on_inbound_reply";
  }

  return plan;
}

/** Full launch resolution for API / localStorage cohort launch. */
export function resolveLaunchInputFromEntry(
  entry: WorkflowSurfaceEntry,
  customStored?: CustomPlaybookStored | null
): ResolvedLaunchInput | null {
  if (customStored && entry.kind === "user_custom") {
    const stepPlan = launchStepPlanFromCustomStored(customStored);
    return {
      initialWorkflowStepId: stepPlan.primaryStepId,
      stepPlan,
    };
  }

  const fromSurface = launchStepPlanFromSurfaceEntry(entry);
  if (!fromSurface) return null;

  return {
    initialWorkflowStepId: fromSurface.primaryStepId,
    stepPlan: fromSurface,
  };
}

/** Serialize step plan into launch_parameters_jsonb-friendly strings. */
export function stepPlanToLaunchParameters(
  plan: WorkflowLaunchStepPlan,
  base: Record<string, string> = {}
): Record<string, string> {
  const next: Record<string, string> = {
    ...base,
    primary_step_id: plan.primaryStepId,
  };
  if (plan.followUpStepId) next.follow_up_step_id = plan.followUpStepId;
  if (plan.followUpTriggerKind) next.follow_up_trigger_kind = plan.followUpTriggerKind;
  if (plan.followUpWaitDays != null) next.follow_up_wait_days = String(plan.followUpWaitDays);
  return next;
}

export function launchParametersToStepPlan(
  params: Record<string, string>
): WorkflowLaunchStepPlan | null {
  const primaryStepId = params.primary_step_id?.trim();
  if (!primaryStepId) return null;
  const followUpStepId = params.follow_up_step_id?.trim() || undefined;
  const kind = params.follow_up_trigger_kind;
  const plan: WorkflowLaunchStepPlan = { primaryStepId, followUpStepId };
  if (kind === "wait" || kind === "on_inbound_reply") {
    plan.followUpTriggerKind = kind;
    const days = Number(params.follow_up_wait_days);
    if (kind === "wait" && Number.isFinite(days)) plan.followUpWaitDays = days;
  }
  return plan;
}

export function validateLaunchStepPlan(
  plan: WorkflowLaunchStepPlan,
  customStored?: CustomPlaybookStored | null
): boolean {
  if (!plan.primaryStepId.trim()) return false;
  if (!plan.followUpStepId) return true;
  if (!customStored?.followUp) return true;
  return validateStoredFollowUp(customStored.followUp).ok;
}
