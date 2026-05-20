/**
 * LLM cohort draft generation for the workflow create wizard (Draft step).
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { mockTomoGenerateCohortDraft } from "@/lib/workflow-action-build";

export const workflowCohortDraftSchema = z.object({
  subject: z.string().min(1).describe("Email subject line; may include {{lp_first_name}}"),
  body: z
    .string()
    .min(1)
    .describe("Email body template; must include {{lp_first_name}} for per-LP personalization"),
  actionDescription: z
    .string()
    .min(1)
    .describe("One sentence: what Tomo does for each LP when this workflow action runs"),
});

export type WorkflowCohortDraftResult = z.infer<typeof workflowCohortDraftSchema>;

export type WorkflowCohortDraftKind = "primary" | "follow_up";

export type WorkflowPrimaryTemplateContext = {
  subject: string;
  body: string;
  trigger?: string;
  actionDescription?: string;
};

export type GenerateWorkflowCohortDraftParams = {
  workflowName: string;
  listName: string;
  instruction: string;
  contextText: string;
  trigger?: string;
  attachmentNames?: string[];
  /** Defaults to primary outreach template generation. */
  draftKind?: WorkflowCohortDraftKind;
  /** Required for best follow-up quality; optional offline still works. */
  primaryTemplate?: WorkflowPrimaryTemplateContext;
};

const PRIMARY_SYSTEM_PROMPT = `You are Tomo, drafting a cohort-wide outreach email template for a GP CRM workflow.

The GP will review this template, then personalize per LP on the next wizard step. Write one strong generic draft that incorporates their instruction and context.

Rules:
- Return plain text only (no markdown, no HTML).
- The body MUST include the placeholder {{lp_first_name}} in the greeting.
- Subject may optionally use {{lp_first_name}}.
- Professional GP–LP tone; concise; one clear call to action when appropriate.
- actionDescription is one sentence for a process-flow node (e.g. "For each LP on X, Tomo sends a personalized email about Y").
- Do not invent LP names or firm details — this is a template for the whole cohort.`;

const FOLLOW_UP_SYSTEM_PROMPT = `You are Tomo, drafting a cohort-wide follow-up email template for a GP CRM workflow.

The GP already sent a primary outreach email (template provided). This follow-up runs later — after a wait with no reply, or when the LP replies — per the follow-up trigger.

Rules:
- Return plain text only (no markdown, no HTML).
- The body MUST include the placeholder {{lp_first_name}} in the greeting.
- Subject should read as a reply thread when appropriate (e.g. "Re: …" referencing the primary subject).
- Reference the primary message naturally; do not repeat it verbatim.
- Shorter than primary outreach unless the instruction asks for a fuller reply.
- Professional GP–LP tone; one clear call to action.
- actionDescription is one sentence for the follow-up process node.
- Do not invent LP names or firm details — cohort template only.`;

export function formatPrimaryTemplateForPrompt(primary: WorkflowPrimaryTemplateContext): string {
  const lines = [
    "Primary outreach already sent (follow-up must reference this):",
    `Subject: ${primary.subject.trim()}`,
    primary.body.trim(),
  ];
  if (primary.trigger?.trim()) lines.push(`Primary trigger: ${primary.trigger.trim()}`);
  if (primary.actionDescription?.trim()) {
    lines.push(`Primary action summary: ${primary.actionDescription.trim()}`);
  }
  return lines.join("\n\n");
}

export function buildWorkflowCohortDraftUserPrompt(params: GenerateWorkflowCohortDraftParams): string {
  const kind = params.draftKind ?? "primary";
  const lines: Array<string | null> = [
    `Workflow name: ${params.workflowName}`,
    `List / cohort: ${params.listName}`,
    kind === "follow_up" ? "Draft kind: follow-up (contextual to primary outreach)" : null,
  ];

  if (params.trigger?.trim()) {
    lines.push(
      kind === "follow_up"
        ? `Follow-up trigger (when it runs): ${params.trigger.trim()}`
        : `Trigger (when it runs): ${params.trigger.trim()}`
    );
  }

  if (kind === "follow_up" && params.primaryTemplate?.subject?.trim() && params.primaryTemplate.body?.trim()) {
    lines.push("", formatPrimaryTemplateForPrompt(params.primaryTemplate));
  }

  lines.push(
    "",
    kind === "follow_up"
      ? "Follow-up instruction (what Tomo should write):"
      : "Action instruction (what Tomo should write):",
    params.instruction.trim()
  );

  if (params.contextText.trim()) {
    lines.push("", "Additional context from GP:", params.contextText.trim());
  }
  if (params.attachmentNames?.length) {
    lines.push("", "Attached materials:", params.attachmentNames.join(", "));
  }
  return lines.filter((l) => l !== null).join("\n");
}

export function mockTomoGenerateFollowUpDraft(params: {
  workflowName: string;
  listName: string;
  contextText: string;
  instruction: string;
  trigger?: string;
  primaryTemplate?: WorkflowPrimaryTemplateContext;
}): WorkflowCohortDraftResult {
  const primary = params.primaryTemplate;
  const primarySubject = primary?.subject?.trim() || params.workflowName;
  const subject = primarySubject.startsWith("Re:") ? primarySubject : `Re: ${primarySubject}`;
  const snippet = params.instruction.trim() || "a short contextual follow-up";
  const triggerNote = params.trigger?.trim() ? ` (${params.trigger.trim()})` : "";
  const primaryRef = primary?.body?.trim()
    ? `Following up on my note below.\n\n`
    : "";
  return {
    subject,
    body: `Hi {{lp_first_name}},\n\n${primaryRef}${snippet}.\n\n${
      params.contextText.trim() ? `${params.contextText.trim()}\n\n` : ""
    }Happy to share more detail if helpful.\n\nBest regards,`,
    actionDescription: `For each LP on ${params.listName}, Tomo sends ${snippet.charAt(0).toLowerCase()}${snippet.slice(1)}${triggerNote}.`,
  };
}

export async function generateWorkflowCohortDraft(
  params: GenerateWorkflowCohortDraftParams
): Promise<{ draft: WorkflowCohortDraftResult; usedLlm: boolean }> {
  const kind = params.draftKind ?? "primary";

  const fallback = () => ({
    draft:
      kind === "follow_up"
        ? mockTomoGenerateFollowUpDraft({
            workflowName: params.workflowName,
            contextText: params.contextText,
            instruction: params.instruction,
            listName: params.listName,
            trigger: params.trigger,
            primaryTemplate: params.primaryTemplate,
          })
        : mockTomoGenerateCohortDraft({
            actionName: params.workflowName,
            contextText: params.contextText,
            instruction: params.instruction,
            listName: params.listName,
            trigger: params.trigger,
          }),
    usedLlm: false,
  });

  if (!process.env.OPENAI_API_KEY) {
    return fallback();
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: workflowCohortDraftSchema,
      system: kind === "follow_up" ? FOLLOW_UP_SYSTEM_PROMPT : PRIMARY_SYSTEM_PROMPT,
      prompt: buildWorkflowCohortDraftUserPrompt(params),
    });

    let body = object.body.trim();
    if (!body.includes("{{lp_first_name}}")) {
      body = `Hi {{lp_first_name}},\n\n${body}`;
    }

    return {
      draft: {
        subject: object.subject.trim(),
        body,
        actionDescription: object.actionDescription.trim(),
      },
      usedLlm: true,
    };
  } catch {
    return fallback();
  }
}
