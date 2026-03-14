/**
 * POST /api/tomo/orchestrate
 *
 * Unified Tomo agent orchestrator. Routes user intent to one of four tools:
 * - filter_relationships: Parse natural language into relationship filter criteria
 * - update_workflow: Modify workflow definitions (title, trigger, steps)
 * - update_crm: Apply CRM field updates, status changes, reminders
 * - draft_reply: Generate email or meeting invite drafts
 *
 * Context (page, selection, workflowContext, etc.) is injected to guide tool selection.
 */

import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  workflowToMarkdown,
  type WorkflowStep,
} from "@/lib/workflow-templates";
import { parseFilterPrompt } from "@/lib/parseFilterPrompt";
import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";

// ── Context types ────────────────────────────────────────────────────────────

export type OrchestratorContext = {
  page?:
    | "home"
    | "relationships"
    | "workflows"
    | "targets"
    | "activity"
    | "materials"
    | "settings"
    | "search";
  section?: string;
  selection?: { type: string; id: string };
  contextTitle?: string;
  workflowContext?: string;
  playbookName?: string;
  playbookType?: string;
  assistanceContext?: TomoAssistance | null;
  currentFilters?: Partial<StructuredFilterCriteria>;
  intentHint?: "filter" | "workflow" | "crm" | "draft" | "general";
};

// ── System prompt builder ───────────────────────────────────────────────────

function buildSystemPrompt(context: OrchestratorContext): string {
  const lines: string[] = [
    `You are Tomo, an AI assistant for a CRM tool used by fund managers.`,
    `You help users filter relationships, edit workflows, update CRM records, and draft emails or meeting invites.`,
    ``,
    `You have access to 4 tools. Use the appropriate tool based on user intent:`,
    ``,
    `1. filter_relationships — When the user wants to filter the relationship list (e.g. "show Tier 1 LPs", "cooling relationships", "no contact in 14 days"). Only use when page is relationships or user explicitly asks to filter.`,
    `2. update_workflow — When the user wants to add, remove, reorder, or modify workflow steps. Only use when workflowContext is provided (user is on Workflows page with a workflow selected).`,
    `3. update_crm — When the user wants to apply CRM field updates, set a reminder, or change status (e.g. blocked, in progress) on an entity. Requires selection (entity id).`,
    `4. draft_reply — When the user wants to draft an email or meeting invite. Can use selection/assistanceContext for context.`,
    ``,
    `Rules:`,
    `- Be conversational but concise.`,
    `- Only call a tool when the user clearly intends that action.`,
    `- If unsure, respond with a clarifying question or helpful text.`,
    `- Do not make up data. Only reference what is in the context.`,
    `- When workflowContext is present, the user is editing a workflow — prefer update_workflow for add/remove/reorder requests.`,
    `- When selection is present and user confirms CRM updates or status, use update_crm.`,
    `- When user asks to filter (e.g. on Relationships page), use filter_relationships.`,
  ];

  if (context.page) {
    lines.push(``, `Current page: ${context.page}`);
  }
  if (context.selection) {
    lines.push(`Selected entity: ${context.selection.type} (id: ${context.selection.id})`);
  }
  if (context.contextTitle) {
    lines.push(`Context: ${context.contextTitle}`);
  }
  if (context.workflowContext) {
    lines.push(``, `Workflow being edited:`, context.workflowContext);
  }
  if (context.assistanceContext?.initialMessage) {
    lines.push(``, `Assistance context: "${context.assistanceContext.initialMessage.text}"`);
    for (const block of context.assistanceContext.initialMessage.blocks ?? []) {
      if (block.kind === "crm_table") {
        lines.push("Proposed CRM updates:");
        for (const row of block.rows) {
          lines.push(`  - ${row.field}: ${row.current} → ${row.update} (${row.reason})`);
        }
      } else if (block.kind === "draft") {
        lines.push(`Draft ${block.type ?? "email"}: "${block.content}"`);
      }
    }
  }
  if (context.intentHint) {
    lines.push(``, `Intent hint: User likely wants ${context.intentHint} action.`);
  }

  return lines.join("\n");
}

// ── Tool schemas ──────────────────────────────────────────────────────────────

const stepSchema = z.object({
  name: z.string().max(30).describe("Short name for this step"),
  type: z.enum(["action", "wait"]).describe("Whether this is an action or a wait period"),
  description: z.string().max(100).describe("What this step does"),
  duration: z.string().optional().describe("Duration for wait steps, e.g. '24h', '5 business days'"),
  condition: z.string().optional().describe("Condition for this step, e.g. 'No reply detected'"),
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

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { messages: unknown[]; context?: OrchestratorContext };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, context = {} } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages must be an array" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(context);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools: {
      filter_relationships: tool({
        description:
          "Parse natural language into relationship filter criteria. Use when the user wants to filter the LP/relationship list (e.g. 'show Tier 1', 'cooling relationships', 'no contact in 14 days').",
        inputSchema: z.object({
          prompt: z.string().describe("The user's filter request in natural language"),
        }),
        execute: async ({ prompt }) => {
          const currentFilters = context.currentFilters ?? {};
          const result = await parseFilterPrompt(prompt, currentFilters);
          if ("error" in result) {
            return { success: false, error: result.error };
          }
          return {
            success: true,
            filters: result.filters,
            fallback: result.fallback,
          };
        },
      }),

      update_workflow: tool({
        description:
          "Update the workflow definition. Use when the user wants to add, remove, reorder, or modify workflow steps or the trigger. Requires workflowContext to be present.",
        inputSchema: workflowSchema,
        execute: async (input) => {
          const definition = {
            title: input.title,
            trigger: input.trigger,
            steps: input.steps as WorkflowStep[],
          };
          const markdown = workflowToMarkdown(definition);
          return { markdown, definition };
        },
      }),

      update_crm: tool({
        description:
          "Apply CRM updates to an entity. Use when the user confirms they want to apply field updates, set a reminder, or change status (e.g. blocked, in progress). Requires selection with entity id.",
        inputSchema: z.object({
          entityId: z.string().describe("The entity id (from selection)"),
          rows: z
            .array(
              z.object({
                field: z.string(),
                update: z.string(),
              })
            )
            .optional()
            .describe("CRM field updates"),
          status: z.string().optional().describe("Status change, e.g. blocked, in progress"),
          reminderDuration: z
            .string()
            .optional()
            .describe("Reminder duration, e.g. '3 days', '1 week'"),
        }),
        execute: async ({ entityId, rows, status, reminderDuration }) => {
          // Stub: no persistence yet. Client onToolCall will handle UI updates.
          return {
            applied: true,
            entityId,
            fields: rows?.map((r) => r.field) ?? [],
            status: status ?? null,
            reminderDuration: reminderDuration ?? null,
          };
        },
      }),

      draft_reply: tool({
        description:
          "Generate a draft email or meeting invite. Use when the user asks to draft, write, or compose an email or invite.",
        inputSchema: z.object({
          type: z.enum(["email", "invite"]).describe("Type of draft"),
          tone: z
            .enum(["professional", "friendly", "concise", "formal"])
            .optional()
            .describe("Tone of the draft"),
          context: z.string().optional().describe("Additional context for the draft"),
        }),
        execute: async ({ type, tone, context: draftContext }) => {
          // Stub: return placeholder. Phase 4+ can add LLM-based draft generation.
          const base =
            type === "email"
              ? "Hi,\n\nQuick update on performance and next steps. Happy to discuss when you have 15 minutes.\n\nBest,"
              : "Hi,\n\nI found a 30m slot next week. Want me to send the invite with a brief agenda?\n\nBest,";
          return {
            type,
            content: base,
            tone: tone ?? "professional",
            context: draftContext ?? null,
          };
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
