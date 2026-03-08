import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";

function buildSystemPrompt(
  entityId: string,
  selection: { type: string; id: string } | undefined,
  assistance: TomoAssistance | null,
): string {
  const contextLines: string[] = [];

  if (selection) {
    contextLines.push(`Entity: ${selection.type} (id: ${selection.id})`);
  }

  if (assistance?.initialMessage) {
    contextLines.push(`Initial suggestion to user: "${assistance.initialMessage.text}"`);

    for (const block of assistance.initialMessage.blocks ?? []) {
      switch (block.kind) {
        case "crm_table":
          contextLines.push("Proposed CRM updates:");
          for (const row of block.rows) {
            contextLines.push(`  - ${row.field}: ${row.current} → ${row.update} (${row.reason})`);
          }
          break;
        case "draft":
          contextLines.push(`Draft ${block.type ?? "email"}: "${block.content}"`);
          break;
        case "brief":
          if (block.summary) contextLines.push(`Brief summary: ${block.summary}`);
          if (block.agenda?.length) contextLines.push(`Agenda: ${block.agenda.join(", ")}`);
          if (block.commitments?.length) contextLines.push(`Commitments: ${block.commitments.join(", ")}`);
          break;
        case "workflow_link":
          contextLines.push(`Suggested workflow: ${block.name} — ${block.description}`);
          break;
      }
    }
  }

  const context = contextLines.length
    ? `\n\nCurrent context:\n${contextLines.join("\n")}`
    : "";

  return `You are Tomo, an AI assistant for a CRM tool used by fund managers.
You help users take action on their relationships — applying CRM updates, drafting emails, setting reminders, and explaining suggestions.

Rules:
- Be conversational but concise. Keep responses under 3 sentences unless the user asks for detail.
- When the user asks to apply CRM updates, use the apply_crm_updates tool.
- When the user asks to set a reminder, use the set_reminder tool.
- When the user asks to apply a status change (e.g. blocked), use the apply_status tool.
- If asked to explain something, give a brief rationale based on the context.
- If asked to edit a draft, provide a revised version inline.
- Do not make up data. Only reference what is in the context below.${context}`;
}

export async function POST(req: Request) {
  const { messages, entityId, selection, assistanceContext } = await req.json();

  const assistance = assistanceContext as TomoAssistance | null;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(entityId, selection, assistance),
    messages: await convertToModelMessages(messages),
    tools: {
      apply_crm_updates: tool({
        description: "Apply the proposed CRM field updates. Call this when the user confirms they want to apply the CRM changes.",
        inputSchema: z.object({
          rows: z.array(z.object({
            field: z.string(),
            update: z.string(),
          })).describe("The CRM fields to update"),
        }),
        execute: async ({ rows }) => {
          return { applied: true, fields: rows.map((r) => r.field) };
        },
      }),
      set_reminder: tool({
        description: "Set a follow-up reminder for this entity.",
        inputSchema: z.object({
          duration: z.string().describe("When to remind, e.g. '3 days', '1 week'"),
        }),
        execute: async ({ duration }) => {
          return { set: true, duration };
        },
      }),
      apply_status: tool({
        description: "Apply a status change to this entity (e.g. mark as blocked, in progress).",
        inputSchema: z.object({
          status: z.string().describe("The new status to apply"),
        }),
        execute: async ({ status }) => {
          return { applied: true, status };
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
