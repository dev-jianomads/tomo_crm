import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  workflowToMarkdown,
  type WorkflowStep,
} from "@/lib/workflow-templates";

const SYSTEM_PROMPT = `You are Tomo, a workflow configuration assistant for a CRM tool used by fund managers.
You help users modify workflow automations. You can ONLY use the update_workflow tool to make changes.

Rules:
- Each workflow has a trigger and 1-8 steps.
- Steps are either "action" (something Tomo does) or "wait" (a time delay).
- Keep step names short (under 30 characters).
- Keep descriptions concise and actionable (under 80 characters).
- When the user asks to add, remove, reorder, or modify steps, call the update_workflow tool.
- Always include ALL steps in your update — the tool replaces the entire workflow.
- After making changes, briefly explain what you changed.
- If the user asks something unrelated to workflow editing, politely redirect them.
- Be conversational but concise.`;

const stepSchema = z.object({
  name: z.string().max(30).describe("Short name for this step"),
  type: z
    .enum(["action", "wait"])
    .describe("Whether this is an action or a wait period"),
  description: z.string().max(100).describe("What this step does"),
  duration: z
    .string()
    .optional()
    .describe("Duration for wait steps, e.g. '24h', '5 business days'"),
  condition: z
    .string()
    .optional()
    .describe("Condition for this step, e.g. 'No reply detected'"),
});

const workflowSchema = z.object({
  title: z.string().describe("The workflow title"),
  trigger: z.string().describe("What triggers this workflow to start"),
  steps: z
    .array(stepSchema)
    .min(1)
    .max(8)
    .describe("Ordered list of workflow steps (1-8)"),
});

type WorkflowInput = z.infer<typeof workflowSchema>;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      update_workflow: tool({
        description:
          "Update the workflow definition. Returns the complete updated markdown. Use this whenever the user wants to add, remove, reorder, or modify workflow steps or the trigger.",
        inputSchema: workflowSchema,
        execute: async (input: WorkflowInput) => {
          const definition = {
            title: input.title,
            trigger: input.trigger,
            steps: input.steps as WorkflowStep[],
          };
          const markdown = workflowToMarkdown(definition);
          return { markdown, definition };
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
