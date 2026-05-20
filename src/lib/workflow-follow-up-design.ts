/**
 * V1.5 follow-up leg — design lock (Phase 0).
 *
 * Locked product rules and shared types for optional follow-up after the primary
 * trigger + action. UI and runtime wiring land in later phases; import this module
 * from schema, wizard, surface mapping, and run advancement.
 *
 * @see docs/WORKFLOW_FOLLOW_UP_BUILDER_PLAN.md
 */

import type { WorkflowActionBuildConfig } from "./workflow-action-build";
import type { UserWorkflowAction } from "./custom-playbook-schema";
import { z } from "zod";

function trimFollowUpAction(action: UserWorkflowAction): UserWorkflowAction | null {
  if (action.kind !== "send_email") return null;
  const subject = action.subject.trim();
  const body = action.body.trim();
  if (!subject || !body) return null;
  return { kind: "send_email", subject, body };
}

// ---------------------------------------------------------------------------
// V1.5 scope (locked 2026-05-20)
// ---------------------------------------------------------------------------

/** Product version tag for follow-up builder features. */
export const WORKFLOW_FOLLOW_UP_VERSION = "v1.5" as const;

/**
 * Locked scope for first ship. Wizard and validators must respect these flags.
 */
export const WORKFLOW_FOLLOW_UP_V15 = {
  /** At most one follow-up leg per custom workflow. */
  maxFollowUpLegs: 1,
  /** Follow-up actions are email drafts only (no meeting/call/other). */
  allowedFollowUpActionKinds: ["send_email"] as const,
  /** Supported follow-up trigger kinds. */
  allowedFollowUpTriggerKinds: ["wait", "on_inbound_reply"] as const,
  /** Wait trigger: only advance when primary step has no attributed reply. */
  allowedWaitConditions: ["no_reply"] as const,
  /** Inbound trigger: any attributed reply (meaningful_reply deferred). */
  allowedInboundReplyConditions: ["any_reply"] as const,
  /** Per-LP personalise on follow-up draft step is out of scope for v1.5. */
  followUpPersonalisePerLp: false,
  /** Default wait duration when GP does not pick (days). */
  defaultWaitDays: 7,
  minWaitDays: 1,
  maxWaitDays: 90,
} as const;

export type WorkflowFollowUpAllowedActionKind =
  (typeof WORKFLOW_FOLLOW_UP_V15.allowedFollowUpActionKinds)[number];

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export type WorkflowWaitFollowUpCondition = "no_reply";

export type WorkflowInboundReplyCondition = "any_reply";

/** Follow-up trigger: wait then check, or fire on inbound reply to primary thread. */
export type WorkflowFollowUpTrigger =
  | {
      kind: "wait";
      days: number;
      condition: WorkflowWaitFollowUpCondition;
    }
  | {
      kind: "on_inbound_reply";
      condition: WorkflowInboundReplyCondition;
    };

export const workflowWaitFollowUpTriggerSchema = z.object({
  kind: z.literal("wait"),
  days: z
    .number()
    .int()
    .min(WORKFLOW_FOLLOW_UP_V15.minWaitDays)
    .max(WORKFLOW_FOLLOW_UP_V15.maxWaitDays),
  condition: z.literal("no_reply"),
});

export const workflowInboundReplyFollowUpTriggerSchema = z.object({
  kind: z.literal("on_inbound_reply"),
  condition: z.literal("any_reply").default("any_reply"),
});

export const workflowFollowUpTriggerSchema = z.discriminatedUnion("kind", [
  workflowWaitFollowUpTriggerSchema,
  workflowInboundReplyFollowUpTriggerSchema,
]);

// ---------------------------------------------------------------------------
// Leg (primary or follow-up)
// ---------------------------------------------------------------------------

/**
 * One wizard leg: trigger summary + action build output.
 * Primary leg uses flat fields on `CustomPlaybookStored`; follow-up uses `followUp`.
 */
export type WorkflowLeg = {
  /** Human-readable trigger for cards and process flow. */
  trigger: string;
  /** Structured follow-up trigger; required on persisted follow-up legs. */
  triggerSpec?: WorkflowFollowUpTrigger;
  /** One-line action summary (denormalized). */
  action: string;
  actionSpec?: UserWorkflowAction;
  actionBuild?: WorkflowActionBuildConfig;
};

export const workflowLegSchema = z.object({
  trigger: z.string().min(1),
  triggerSpec: workflowFollowUpTriggerSchema.optional(),
  action: z.string().min(1),
  actionSpec: z.custom<UserWorkflowAction>().optional(),
  actionBuild: z.custom<WorkflowActionBuildConfig>().optional(),
});

// ---------------------------------------------------------------------------
// Stable step IDs (runs, attribution, surface nodes)
// ---------------------------------------------------------------------------

export type WorkflowCustomStepIds = {
  trigger: string;
  primary: string;
  wait: string;
  followUp: string;
};

export function workflowCustomStepIds(workflowId: string): WorkflowCustomStepIds {
  return {
    trigger: `${workflowId}-trigger`,
    primary: `${workflowId}-primary`,
    wait: `${workflowId}-wait`,
    followUp: `${workflowId}-follow-up`,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isFollowUpTriggerAllowed(spec: WorkflowFollowUpTrigger): boolean {
  const parsed = workflowFollowUpTriggerSchema.safeParse(spec);
  return parsed.success;
}

export function isFollowUpActionAllowed(action: UserWorkflowAction): boolean {
  const t = trimFollowUpAction(action);
  return t !== null;
}

export function isFollowUpActionBuildComplete(build: WorkflowActionBuildConfig | undefined): boolean {
  if (!build) return false;
  return Boolean(
    build.tomoInstruction?.trim() &&
      build.baseSubject?.trim() &&
      build.baseBody?.trim() &&
      build.lpDrafts.length > 0
  );
}

export type WorkflowLegCompleteOptions = {
  /** Follow-up legs must include `triggerSpec`. */
  requireTriggerSpec?: boolean;
  /** When true, action must be send_email only (follow-up). */
  followUpActionOnly?: boolean;
};

/**
 * Whether a leg has enough data to persist (wizard complete for that leg).
 */
export function isWorkflowLegComplete(
  leg: WorkflowLeg,
  options: WorkflowLegCompleteOptions = {}
): boolean {
  const triggerOk = leg.trigger.trim().length > 0;
  if (!triggerOk) return false;

  if (options.requireTriggerSpec) {
    if (!leg.triggerSpec || !isFollowUpTriggerAllowed(leg.triggerSpec)) return false;
  }

  if (!leg.actionSpec) return false;
  if (options.followUpActionOnly && !isFollowUpActionAllowed(leg.actionSpec)) return false;

  return isFollowUpActionBuildComplete(leg.actionBuild);
}

/** Human label for process-flow wait node and meta strip. */
export function formatFollowUpTriggerLabel(spec: WorkflowFollowUpTrigger): string {
  switch (spec.kind) {
    case "wait":
      return `Wait ${spec.days} day${spec.days === 1 ? "" : "s"} — no reply`;
    case "on_inbound_reply":
      return "When LP replies to primary email";
  }
}

/** Default follow-up trigger for wizard initial state. */
export function defaultFollowUpTriggerSpec(): WorkflowFollowUpTrigger {
  return {
    kind: "wait",
    days: WORKFLOW_FOLLOW_UP_V15.defaultWaitDays,
    condition: "no_reply",
  };
}

export function defaultFollowUpTriggerSummary(): string {
  return formatFollowUpTriggerLabel(defaultFollowUpTriggerSpec());
}

/** Empty follow-up leg for wizard hydration. */
export function emptyFollowUpLeg(): WorkflowLeg {
  const spec = defaultFollowUpTriggerSpec();
  return {
    trigger: defaultFollowUpTriggerSummary(),
    triggerSpec: spec,
    action: "",
  };
}

export type FollowUpValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Validate optional `followUp` on a stored custom workflow before save.
 */
export function validateStoredFollowUp(followUp: WorkflowLeg | undefined): FollowUpValidationResult {
  if (!followUp) return { ok: true };

  const errors: string[] = [];

  if (!followUp.triggerSpec) {
    errors.push("Follow-up requires a structured trigger (wait or on inbound reply).");
  } else if (!isFollowUpTriggerAllowed(followUp.triggerSpec)) {
    errors.push("Follow-up trigger is not allowed in v1.5.");
  }

  if (!isWorkflowLegComplete(followUp, { requireTriggerSpec: true, followUpActionOnly: true })) {
    errors.push("Follow-up leg is incomplete (send_email action and drafts required).");
  }

  if (WORKFLOW_FOLLOW_UP_V15.followUpPersonalisePerLp && followUp.actionBuild?.lpDrafts) {
    const personalised = followUp.actionBuild.lpDrafts.some((d) => d.personalised);
    if (personalised) {
      errors.push("Per-LP follow-up personalise is not enabled in v1.5.");
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
