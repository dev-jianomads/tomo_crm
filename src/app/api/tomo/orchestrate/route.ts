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

export type OrchestratorSurface = "drawer" | "workflow" | "general";

export type OrchestratorContext = {
  /** Surface determines which tools are available. drawer=entity actions only, workflow=workflow only, general=all tools */
  surface?: OrchestratorSurface;
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

function buildSystemPrompt(context: OrchestratorContext, surface: OrchestratorSurface): string {
  const lines: string[] = [
    `You are Tomo, an AI assistant for a CRM tool used by fund managers.`,
  ];

  if (surface === "drawer") {
    lines.push(
      ``,
      `You are in the drawer viewing a specific entity. You can ONLY help with entity actions:`,
      `- update_crm: Apply CRM field updates, set a reminder, or change status (e.g. blocked, in progress)`,
      `- draft_reply: Draft an email or meeting invite`,
      ``,
      `If the user asks to filter the list (e.g. "show Tier 1", "cooling relationships"), politely redirect: "Use the filter bar above to filter the list. For this relationship, I can help you apply updates, draft outreach, or set a reminder."`,
      ``,
      `Rules: Be conversational but concise. Only call a tool when the user clearly intends that action.`,
    );
  } else if (surface === "workflow") {
    lines.push(
      ``,
      `You are editing a workflow. You can ONLY use update_workflow to add, remove, reorder, or modify steps and the trigger.`,
      ``,
      `Rules: Be conversational but concise. Always include ALL steps when updating — the tool replaces the entire workflow. Keep step names under 30 chars, descriptions under 80 chars.`,
    );
  } else {
    lines.push(
      ``,
      `You have access to 4 tools. Use the appropriate tool based on user intent:`,
      ``,
      `1. filter_relationships — Filter the relationship list (e.g. "show Tier 1", "cooling relationships")`,
      `2. update_workflow — Add, remove, reorder, or modify workflow steps (when workflowContext is present)`,
      `3. update_crm — Apply CRM updates, set reminder, change status on an entity`,
      `4. draft_reply — Draft an email or meeting invite`,
      ``,
      `Rules: Be conversational but concise. Only call a tool when the user clearly intends that action.`,
    );
  }

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

  const surface: OrchestratorSurface = context.surface ?? "general";
  const systemPrompt = buildSystemPrompt(context, surface);

  // Build tools conditionally by surface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  if (surface === "general") {
    tools.filter_relationships = tool({
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
      });
  }

  if (surface === "general" || surface === "workflow") {
    tools.update_workflow = tool({
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
    });
  }

  if (surface === "general" || surface === "drawer") {
    tools.update_crm = tool({
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
      });

    tools.draft_reply = tool({
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
      });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
