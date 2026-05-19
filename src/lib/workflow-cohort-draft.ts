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

export type GenerateWorkflowCohortDraftParams = {
  workflowName: string;
  listName: string;
  instruction: string;
  contextText: string;
  trigger?: string;
  attachmentNames?: string[];
};

const SYSTEM_PROMPT = `You are Tomo, drafting a cohort-wide outreach email template for a GP CRM workflow.

The GP will review this template, then personalize per LP on the next wizard step. Write one strong generic draft that incorporates their instruction and context.

Rules:
- Return plain text only (no markdown, no HTML).
- The body MUST include the placeholder {{lp_first_name}} in the greeting.
- Subject may optionally use {{lp_first_name}}.
- Professional GP–LP tone; concise; one clear call to action when appropriate.
- actionDescription is one sentence for a process-flow node (e.g. "For each LP on X, Tomo sends a personalized email about Y").
- Do not invent LP names or firm details — this is a template for the whole cohort.`;

function buildUserPrompt(params: GenerateWorkflowCohortDraftParams): string {
  const lines = [
    `Workflow name: ${params.workflowName}`,
    `List / cohort: ${params.listName}`,
    params.trigger?.trim() ? `Trigger (when it runs): ${params.trigger.trim()}` : null,
    "",
    "Action instruction (what Tomo should write):",
    params.instruction.trim(),
  ];
  if (params.contextText.trim()) {
    lines.push("", "Context from GP:", params.contextText.trim());
  }
  if (params.attachmentNames?.length) {
    lines.push("", "Attached materials:", params.attachmentNames.join(", "));
  }
  return lines.filter((l) => l !== null).join("\n");
}

export async function generateWorkflowCohortDraft(
  params: GenerateWorkflowCohortDraftParams
): Promise<{ draft: WorkflowCohortDraftResult; usedLlm: boolean }> {
  const fallback = () => ({
    draft: mockTomoGenerateCohortDraft({
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
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(params),
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
