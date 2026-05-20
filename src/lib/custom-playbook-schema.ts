/**
 * User-created workflow types + validation (no localStorage — safe for API routes).
 */

import type { WorkflowActionBuildConfig } from "./workflow-action-build";
import type { WorkflowLeg } from "./workflow-follow-up-design";
import { z } from "zod";

export type { WorkflowLeg, WorkflowFollowUpTrigger } from "./workflow-follow-up-design";
export {
  WORKFLOW_FOLLOW_UP_V15,
  WORKFLOW_FOLLOW_UP_VERSION,
  validateStoredFollowUp,
  workflowCustomStepIds,
  workflowFollowUpTriggerSchema,
} from "./workflow-follow-up-design";

export const CUSTOM_PLAYBOOKS_STORAGE_KEY = "tomo-custom-playbooks-v1";

/** Structured primary action for a user-created workflow (tool + storage). */
export type UserWorkflowAction =
  | { kind: "send_email"; subject: string; body: string }
  | { kind: "schedule_meeting"; title: string; datetime: string; notes?: string }
  | { kind: "schedule_call"; title: string; datetime: string; agenda?: string }
  | { kind: "other"; label: string; details: string };

export const userWorkflowActionSchema = z.union([
  z.object({
    kind: z.literal("send_email"),
    subject: z.string().min(1).describe("Email subject line"),
    body: z.string().min(1).describe("Full email body or draft the user approved"),
  }),
  z.object({
    kind: z.literal("schedule_meeting"),
    title: z.string().min(1).describe("Meeting title or purpose"),
    datetime: z.string().min(1).describe("When to meet (ISO date-time or explicit date + time + timezone)"),
    notes: z.string().optional().describe("Optional agenda or attendees"),
  }),
  z.object({
    kind: z.literal("schedule_call"),
    title: z.string().min(1).describe("Call title or purpose"),
    datetime: z.string().min(1).describe("When to call (ISO date-time or explicit date + time + timezone)"),
    agenda: z.string().optional().describe("Optional talking points"),
  }),
  z.object({
    kind: z.literal("other"),
    label: z.string().min(1).describe("Short label for this action"),
    details: z.string().min(1).describe("Concrete description of what happens"),
  }),
]);

/** Input for `create_user_workflow` (orchestrator + client validation). */
export const createUserWorkflowInputSchema = z.object({
  name: z.string().min(1).describe("Short display name for the new workflow"),
  trigger: z.string().min(1).describe("When or why the workflow runs"),
  action: userWorkflowActionSchema.describe(
    "Primary action with type-specific required fields — do not omit body, datetime, etc."
  ),
});

export type CreateUserWorkflowInput = z.infer<typeof createUserWorkflowInputSchema>;

/** Action-step wizard: finalized prompt for cohort draft generation (Draft step). */
export const workflowActionPromptSchema = z.object({
  instruction: z
    .string()
    .min(1)
    .describe(
      "Optimised meta-prompt for the Draft step — tone, structure, length, personalization, CTA, context usage. Not the email itself."
    ),
  action_description: z
    .string()
    .optional()
    .describe("One short sentence for the process-flow action node"),
  action_kind: z
    .enum(["send_email", "schedule_meeting", "schedule_call", "other"])
    .optional()
    .describe("Primary action type; default send_email for outreach"),
});

export type WorkflowActionPrompt = z.infer<typeof workflowActionPromptSchema>;

export type CustomPlaybookStored = {
  id: string;
  name: string;
  trigger: string;
  /** One-line summary for list cards (denormalized). */
  action: string;
  /** Structured action when created via the updated tool; absent on older stored rows. */
  actionSpec?: UserWorkflowAction;
  /** Action build wizard output (context, attachments, cohort + per-LP drafts). */
  actionBuild?: WorkflowActionBuildConfig;
  /**
   * Optional follow-up leg (V1.5). Primary remains flat fields above.
   * @see docs/WORKFLOW_FOLLOW_UP_BUILDER_PLAN.md
   */
  followUp?: WorkflowLeg;
  createdAt: string;
};

export function trimUserWorkflowAction(a: UserWorkflowAction): UserWorkflowAction {
  switch (a.kind) {
    case "send_email":
      return { kind: "send_email", subject: a.subject.trim(), body: a.body.trim() };
    case "schedule_meeting": {
      const notes = a.notes?.trim();
      return {
        kind: "schedule_meeting",
        title: a.title.trim(),
        datetime: a.datetime.trim(),
        ...(notes ? { notes } : {}),
      };
    }
    case "schedule_call": {
      const agenda = a.agenda?.trim();
      return {
        kind: "schedule_call",
        title: a.title.trim(),
        datetime: a.datetime.trim(),
        ...(agenda ? { agenda } : {}),
      };
    }
    case "other":
      return { kind: "other", label: a.label.trim(), details: a.details.trim() };
  }
}

export function isUserWorkflowActionComplete(a: UserWorkflowAction): boolean {
  const t = trimUserWorkflowAction(a);
  switch (t.kind) {
    case "send_email":
      return Boolean(t.subject && t.body);
    case "schedule_meeting":
      return Boolean(t.title && t.datetime);
    case "schedule_call":
      return Boolean(t.title && t.datetime);
    case "other":
      return Boolean(t.label && t.details);
  }
}

export function summarizeUserWorkflowAction(a: UserWorkflowAction): string {
  const t = trimUserWorkflowAction(a);
  switch (t.kind) {
    case "send_email":
      return `Email: ${t.subject}`;
    case "schedule_meeting":
      return `Meeting: ${t.title} @ ${t.datetime}`;
    case "schedule_call":
      return `Call: ${t.title} @ ${t.datetime}`;
    case "other": {
      const d = t.details;
      return d.length > 100 ? `${t.label}: ${d.slice(0, 100)}…` : `${t.label}: ${d}`;
    }
  }
}

export function actionStepName(a: UserWorkflowAction): string {
  switch (a.kind) {
    case "send_email":
      return "Send email";
    case "schedule_meeting":
      return "Schedule meeting";
    case "schedule_call":
      return "Schedule call";
    case "other":
      return a.label.trim() || "Action";
  }
}

/** Rich step text for the workflow editor / markdown view. */
export function formatActionSpecForWorkflowDescription(a: UserWorkflowAction): string {
  const t = trimUserWorkflowAction(a);
  switch (t.kind) {
    case "send_email":
      return `Send email\nSubject: ${t.subject}\nBody:\n${t.body}`;
    case "schedule_meeting":
      return ["Schedule meeting", `Title: ${t.title}`, `When: ${t.datetime}`, t.notes ? `Notes: ${t.notes}` : null]
        .filter(Boolean)
        .join("\n");
    case "schedule_call":
      return ["Schedule call", `Title: ${t.title}`, `When: ${t.datetime}`, t.agenda ? `Agenda: ${t.agenda}` : null]
        .filter(Boolean)
        .join("\n");
    case "other":
      return `${t.label}\n${t.details}`;
  }
}

export function newCustomPlaybookId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pb-custom-${crypto.randomUUID()}`;
  }
  return `pb-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Legacy custom playbooks only had a flat `action` string. Adds `actionSpec` as
 * `other` so workflow steps and prompts see the same structured shape as new saves.
 */
export function migrateLegacyCustomPlaybooksList(list: CustomPlaybookStored[]): {
  list: CustomPlaybookStored[];
  changed: boolean;
} {
  let changed = false;
  const next = list.map((c) => {
    if (c.actionSpec) return c;
    const details = typeof c.action === "string" ? c.action.trim() : "";
    if (!details) return c;
    changed = true;
    return {
      ...c,
      actionSpec: {
        kind: "other" as const,
        label: "Action",
        details,
      },
    };
  });
  return { list: next, changed };
}
