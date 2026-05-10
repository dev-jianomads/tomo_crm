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
 *
 * Surfaces:
 * - workflow_creator — collect name/trigger/typed action; tool create_user_workflow returns payload for client persistence.
 */

import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  workflowToMarkdown,
  type WorkflowStep,
} from "@/lib/workflow-templates";
import { parseFilterPrompt } from "@/lib/parseFilterPrompt";
import { CRM_UPDATE_FIELD_REFERENCE } from "@/lib/crmFieldSchema";
import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";
import type { DailyBriefBlock } from "@/lib/dailyBriefFromToday";
import type { RadarModalPayload } from "@/lib/radarModalTypes";
import {
  createUserWorkflowInputSchema,
  isUserWorkflowActionComplete,
  trimUserWorkflowAction,
} from "@/lib/custom-playbook-schema";

// ── Context types ────────────────────────────────────────────────────────────

export type OrchestratorSurface =
  | "drawer"
  | "workflow"
  | "general"
  | "filter"
  /** Pipeline “Use in workflow” custom creator chat — create_user_workflow only */
  | "workflow_creator";

export type OrchestratorContext = {
  /** Surface determines which tools are available. workflow_creator = create_user_workflow only. */
  surface?: OrchestratorSurface;
  page?:
    | "home"
    | "relationships"
    | "workflows"
    | "pipeline"
    | "activity"
    | "materials"
    | "settings"
    | "search";
  section?: string;
  selection?:
    | { type: string; id: string }
    | { type: "pipeline_stage"; pipelineId: string; stage: string; relationshipIds: string[] };
  contextTitle?: string;
  workflowContext?: string;
  playbookName?: string;
  playbookType?: string;
  pipelineContext?: {
    pipelineId: string;
    pipelineName: string;
    relationshipIds: string[];
    relationshipCount: number;
  } | null;
  /** When surface is workflow_creator: pipeline already chosen in the dialog; will be linked on the client after Phase 1 tool runs */
  workflowCreator?: {
    pipelineId: string;
    pipelineName: string;
    filterSummary?: string;
  };
  assistanceContext?: TomoAssistance | null;
  currentFilters?: Partial<StructuredFilterCriteria>;
  /** For filter surface: id/name/firm so Tomo can resolve "Lumen" or "Acme Capital" to entityId */
  relationshipLookup?: { id: string; name: string; firm: string }[];
  intentHint?: "filter" | "workflow" | "crm" | "draft" | "general";
  /** For Today page: actions and commitments so Tomo can answer questions about what needs attention and coming up */
  todayContext?: {
    actions: { id: string; title: string; trigger: string; status: string; type: string }[];
    commitments: { id: string; title: string; datetime: string; lp: string; contactName: string }[];
    /** Same digest blocks as email/orchestrator legacy path (four sections). */
    dailyBriefBlocks?: DailyBriefBlock[];
    radarModalPayload?: RadarModalPayload;
    previousAttention?: {
      count: number;
      items: { id: string; title: string; trigger: string; status: string; type: string; group: string }[];
    };
  };
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
      `- update_crm: Apply CRM field updates (tier, stage, band, etc.), set a reminder, or change status`,
      `- draft_reply: Draft an email or meeting invite`,
      ``,
      `When the user asks for a CRM field update, you MUST call update_crm with entityId set to the selected entity's id. Do NOT ask about reminders or other fields unless the user explicitly requests them.`,
      ``,
      `CRITICAL: When performing a CRM update, you MUST call the update_crm tool — never claim an update was made in text without actually calling the tool. Pass entityId and rows with field/update. Use exact field names and values from the schema below.`,
      ``,
      CRM_UPDATE_FIELD_REFERENCE,
      ``,
      `If the user asks to filter the list (e.g. "show Tier 1", "cooling relationships"), politely redirect: "Use the filter bar above to filter the list. For this relationship, I can help you apply updates, draft outreach, or set a reminder."`,
      ``,
      `Rules: Be conversational but concise. Only call a tool when the user clearly intends that action. For simple field updates, execute without extra confirmation questions.`,
    );
  } else if (surface === "workflow") {
    lines.push(
      ``,
      `You are editing a workflow. You can ONLY use update_workflow to add, remove, reorder, or modify steps and the trigger.`,
      ``,
      `Rules: Be conversational but concise. Always include ALL steps in the tool call — the tool replaces the entire workflow. Keep step names under 30 chars, descriptions under 80 chars.`,
      ``,
      `CRITICAL — how you reply after update_workflow:`,
      `- The process flow UI already shows the full workflow. Do NOT paste the full workflow, markdown headings (# or ##), or a numbered list of every step.`,
      `- Do NOT say "Here is the new version" or quote the tool's markdown output.`,
      `- Reply in at most 2 short sentences: only what changed (e.g. "Added a Thank Sarah step after Detect & Log." or "Renamed the trigger to …").`,
      `- If nothing structural changed, a single brief line is enough.`,
    );
    if (context.pipelineContext) {
      const pc = context.pipelineContext;
      lines.push(
        ``,
        `This workflow targets list "${pc.pipelineName}" (${pc.relationshipCount} relationships).`,
        `Relationship IDs: ${pc.relationshipIds.slice(0, 20).join(", ")}${pc.relationshipIds.length > 20 ? ` ... and ${pc.relationshipIds.length - 20} more` : ""}`,
      );
    }
  } else if (surface === "filter") {
    lines.push(
      ``,
      `You are helping with the relationship list. You can:`,
      `1. filter_relationships — Parse natural language into filter criteria (e.g. "show Tier 1", "cooling relationships")`,
      `2. update_crm — Apply CRM field updates to ONE specific relationship (e.g. "update Lumen to heating", "mark Acme Capital as blocked")`,
      ``,
      `CRITICAL for CRM updates:`,
      `- Updates apply to ONE row only. Never update multiple relationships from this surface.`,
      `- If the user requests a CRM update but does NOT specify which relationship (name or company), you MUST ask: "Which relationship? Please provide the name or company."`,
      `- Once the user provides a name or company, search the relationshipLookup in context (match name or firm, case-insensitive). If exactly one match: confirm briefly (e.g. "Updating Lumen Capital to heating") and call update_crm with entityId. If multiple matches: ask the user to disambiguate. If no match: say no relationship found and suggest checking the name.`,
      `- Only call update_crm when you have a confirmed entityId.`,
      `- Use exact field names and valid enum values from the CRM field reference below.`,
      ``,
      `When the user asks to filter, call filter_relationships. For "clear" or "show all", return empty filters.`,
      ``,
      `Rules: Be conversational but concise. Always confirm the target row before making a CRM change.`,
      ``,
      CRM_UPDATE_FIELD_REFERENCE,
    );
    if (context.relationshipLookup?.length) {
      const lookup = context.relationshipLookup;
      const preview = lookup.slice(0, 50).map((r) => `${r.id}: ${r.name} @ ${r.firm}`).join("\n");
      lines.push(
        ``,
        `relationshipLookup (search by name or firm to resolve to entityId):`,
        preview,
        lookup.length > 50 ? `\n... and ${lookup.length - 50} more` : "",
      );
    } else {
      lines.push(``, `relationshipLookup: empty — no relationships in current view. Suggest the user filter or show all before updating.`);
    }
  } else if (surface === "workflow_creator") {
    lines.push(
      ``,
      `You are in **workflow creator** mode. The user is defining a new user-defined workflow from the Lists page dialog.`,
      ``,
      `You have exactly one tool: **create_user_workflow**. Call it only when you have **name**, **trigger**, and a complete **action** object.`,
      ``,
      `- **name** — short title for the workflow`,
      `- **trigger** — when or why it runs (schedule, event, or condition)`,
      `- **action** — a typed object with **kind** and all required fields for that kind:`,
      `  - **send_email** — subject (string) and body (string; full draft or content the user wants sent)`,
      `  - **schedule_meeting** — title, datetime (ISO or explicit date+time+timezone); optional notes`,
      `  - **schedule_call** — title, datetime; optional agenda`,
      `  - **other** — label + details for anything else (CRM update, Slack, etc.)`,
      ``,
      `Do not call the tool until every required field for the chosen kind is known. If something is missing or vague, ask one brief follow-up instead of calling the tool.`,
      ``,
      `The pre-selected list (in context) will be linked by the app when the tool result is applied — do not ask the user to pick a different list unless they explicitly want to cancel.`,
      `After a successful tool call, confirm briefly in plain language; do not claim server-side database persistence (the client applies the result).`,
      ``,
      `Keep replies concise.`,
    );
    const wc = context.workflowCreator;
    if (wc) {
      lines.push(
        ``,
        `Pre-selected list: "${wc.pipelineName}" (id: ${wc.pipelineId}).`,
        wc.filterSummary ? `Filter summary: ${wc.filterSummary}` : `No filter summary provided.`,
      );
    } else {
      lines.push(``, `workflowCreator context was not sent — ask the user to reopen the dialog from Lists if needed.`);
    }
    // Do not append shared context below (page, todayContext, workflowContext, etc.) — it would
    // contradict the narrow creator task if the client sends a bloated context payload.
    return lines.join("\n");
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

  // Today page: focus on answering questions about What needs your attention and Coming up
  if (context.page === "home" && context.todayContext) {
    const tc = context.todayContext;
    lines.push(
      ``,
      `The user is on the Today page. Your primary role is to answer questions about "What needs your attention" and "Coming up". Use the data below. For deeper actions (CRM updates, drafts), suggest they open the item's drawer.`,
      ``,
      `What needs your attention:`,
      ...tc.actions.map((a) => `- ${a.title} (id: ${a.id}) — ${a.trigger} [${a.status}, ${a.type}]`),
      ``,
      `Coming up:`,
      ...tc.commitments.map(
        (c) => `- ${c.lp} : ${c.contactName} — ${c.datetime} (${c.title})`,
      ),
    );

    if (tc.previousAttention?.count) {
      lines.push(
        ``,
        `The Today page also has a collapsible "Previous" section (${tc.previousAttention.count} item${
          tc.previousAttention.count === 1 ? "" : "s"
        }) with older attention queue items and "Do later" cards, grouped by day. It may be collapsed; expand "Previous" on the left column to see every row. Summary:`,
        ...tc.previousAttention.items.map(
          (a) =>
            `- [group: ${a.group}] ${a.title} (id: ${a.id}) — ${a.trigger} [${a.status}, ${a.type}]`,
        ),
      );
    }

    if (tc.dailyBriefBlocks?.length) {
      lines.push(
        ``,
        `Daily Brief — this is the SAME structured summary as the user's "Daily Brief" modal (same blocks, lines, and entity ids). Prefer this when they ask for a brief, summary of the day, or "what's in my daily brief". Each bullet may include a link type and id so you can tell them which drawer to open.`,
      );
      for (const block of tc.dailyBriefBlocks) {
        lines.push(``, `${block.title} — ${block.subtitle}`, `Insight: ${block.insight}`);
        for (const item of block.items) {
          if (item.link) {
            lines.push(`- ${item.label} [${item.link.kind} id: ${item.link.id}]`);
          } else {
            lines.push(`- ${item.label}`);
          }
        }
        if (block.secondarySubtitle) {
          lines.push(block.secondarySubtitle);
          for (const item of block.secondaryItems ?? []) {
            if (item.link) {
              lines.push(`- ${item.label} [${item.link.kind} id: ${item.link.id}]`);
            } else {
              lines.push(`- ${item.label}`);
            }
          }
        }
      }
      lines.push(``);
    }

    if (tc.radarModalPayload?.sections?.length) {
      const rm = tc.radarModalPayload;
      lines.push(
        ``,
        `Radar Modal — unified Daily Brief + On my radar (same as the in-app modal). Eyebrow: ${rm.eyebrowLabel}. Narrative: ${rm.narrativeSummaryPlain}`,
      );
      for (const sec of rm.sections) {
        lines.push(``, `${sec.title} — ${sec.countSummary}`);
        if (sec.items.length === 0) {
          if (sec.emptyMessage) lines.push(`- (empty — ${sec.emptyMessage})`);
          continue;
        }
        for (const item of sec.items) {
          const who = item.personLabel ? `${item.lpLabel} · ${item.personLabel}` : item.lpLabel;
          lines.push(`- ${who}: ${item.evidencePlain}`);
          if (item.link) {
            lines.push(`  [nav ${item.link.kind}: ${item.link.id}]`);
          }
          for (const cta of item.ctas ?? []) {
            if (cta.link) lines.push(`  [cta "${cta.label}" → ${cta.link.kind}: ${cta.link.id}]`);
          }
        }
      }
      lines.push(``);
    }

    lines.push(
      ``,
      `SCOPE: You only have the Today snapshot above (primary attention list, any "Previous" items listed, commitments, Daily Brief blocks, Radar Modal sections when listed). If the user asks about anything not reflected there — e.g. searching all email, the whole CRM, or facts you cannot derive from this data — say clearly that you do not have access to that. Direct them to Relationships or Lists for broader lookup, to expand "Previous" on Today if items are in that backlog, or to open a specific row's drawer for CRM updates and drafts. Do not invent answers as if you searched a large corpus.`,
    );
  }

  if (context.page) {
    lines.push(``, `Current page: ${context.page}`);
  }
  if (context.selection) {
    const sel = context.selection;
    if (sel.type === "pipeline_stage") {
      const ps = sel as {
        type: "pipeline_stage";
        pipelineId: string;
        stage: string;
        relationshipIds: string[];
      };
      lines.push(
        ``,
        `Selected list funnel stage: ${ps.pipelineId} / ${ps.stage}`,
        `Relationship IDs in this stage (${ps.relationshipIds.length}): ${ps.relationshipIds.join(", ")}`,
        `When updating CRM: use entityId for single updates, or pass relationshipIds for bulk updates.`,
      );
    } else {
      const es = sel as { type: string; id: string };
      lines.push(`Selected entity: ${es.type} (id: ${es.id})`);
    }
  }
  if (context.contextTitle) {
    lines.push(`Context: ${context.contextTitle}`);
  }
  if (context.workflowContext) {
    lines.push(``, `Workflow being edited:`, context.workflowContext);
    if (surface === "workflow") {
      lines.push(
        `(Use this as the source of truth for edits. After update_workflow, do not paste this block or a full restatement of every step into your reply — the diagram already shows it.)`
      );
    }
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
  draftTemplate: z
    .string()
    .max(2000)
    .optional()
    .describe("Optional saved draft shell for draft-style outbound steps"),
});

const workflowSchema = z.object({
  title: z.string().describe("The workflow title"),
  trigger: z.string().describe("What triggers this workflow to start"),
  triggerKind: z
    .enum(["EVENT", "THRESHOLD", "SCHEDULED"])
    .optional()
    .describe("Trigger class: EVENT (one-off signal), THRESHOLD (metric/time rule), SCHEDULED (calendar/cadence)"),
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

  // Build tools conditionally by surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  if (surface === "workflow_creator") {
    const pipelineIdForCreator = context.workflowCreator?.pipelineId;
    tools.create_user_workflow = tool({
      description:
        "Finalize a new user-defined workflow. Call when name, trigger, and action (typed object: send_email | schedule_meeting | schedule_call | other) are complete. The client persists and links the pre-selected list.",
      inputSchema: createUserWorkflowInputSchema,
      execute: async ({ name, trigger, action }) => {
        const nameT = name.trim();
        const triggerT = trigger.trim();
        const actionT = trimUserWorkflowAction(action);
        if (!nameT || !triggerT || !isUserWorkflowActionComplete(actionT)) {
          return {
            success: false as const,
            error: "name, trigger, and action (all required fields for the action kind) must be non-empty after trimming",
          };
        }
        return {
          success: true as const,
          name: nameT,
          trigger: triggerT,
          action: actionT,
          pipelineId: pipelineIdForCreator ?? null,
        };
      },
    });
  }

  if (surface === "general" || surface === "filter") {
    tools.filter_relationships = tool({
        description:
          "Parse natural language into relationship filter criteria. Use when the user wants to filter the LP/relationship list (e.g. 'show Tier 1', 'cooling relationships', 'no contact in 14 days').",
        inputSchema: z.object({
          prompt: z.string().describe("The user's filter request in natural language"),
        }),
        execute: async ({ prompt }) => {
          const currentFilters = context.currentFilters ?? {};
          const result = await parseFilterPrompt(prompt, currentFilters);
          if ("error" in result && result.filters === null) {
            return { success: false, error: result.error };
          }
          const ok = result as import("@/lib/parseFilterPrompt").ParseFilterOk;
          return {
            success: true,
            filters: ok.filters,
            outcome: ok.outcome,
            message: ok.message,
            fallback: ok.fallback ?? ok.outcome === "partial",
          };
        },
      });
  }

  if (surface === "general" || surface === "workflow") {
    tools.update_workflow = tool({
      description:
        surface === "workflow"
          ? "Update the workflow definition. Pass the full replacement (title, trigger, all steps). The UI redraws the flow automatically — after calling, acknowledge only the delta in chat (do not list every step)."
          : "Update the workflow definition. Use when the user wants to add, remove, reorder, or modify workflow steps or the trigger. Requires workflowContext to be present.",
      inputSchema: workflowSchema,
      execute: async (input) => {
        const definition = {
          title: input.title,
          trigger: input.trigger,
          steps: input.steps as WorkflowStep[],
          triggerKind: input.triggerKind ?? "EVENT",
        };
        if (surface === "workflow") {
          return {
            applied: true,
            title: definition.title,
            stepCount: definition.steps.length,
            hint: "UI updated. Reply in ≤2 sentences describing only what changed; never paste full workflow or markdown.",
          };
        }
        const markdown = workflowToMarkdown(definition);
        return { markdown, definition };
      },
    });
  }

  if (surface === "general" || surface === "drawer" || surface === "filter") {
    tools.update_crm = tool({
        description:
          "Apply CRM field updates to an entity. Supports all Relationship fields: tier, stage, band, momentum, owner, investorType, strategyFit, strategyType, lpLocation, investmentRemit, typicalCheckSize, fundSizePreference, source, lastFundHistory, decisionTimeline, fiscalYearEnd, consultantDependent, esgRequired, nextMove, openLoops, sourceDetail, consultantName, lastMeetingDate, contactSeniority. Use exact field names and valid enum values. Pass entityId for single updates, or relationshipIds for bulk. Only include reminderDuration when the user explicitly asks.",
        inputSchema: z.object({
          entityId: z
            .string()
            .optional()
            .describe("Single entity id (use for one relationship)"),
          relationshipIds: z
            .array(z.string())
            .optional()
            .describe("Multiple relationship ids for bulk updates (use when selection is pipeline_stage)"),
          rows: z
            .array(
              z.object({
                field: z.string().describe("CRM field name (tier, stage, band, owner, etc.)"),
                update: z.string().describe("New value; use exact enum values where applicable"),
              })
            )
            .optional()
            .describe("CRM field updates; any Relationship field can be updated"),
          status: z.string().optional().describe("Status change, e.g. blocked, in progress"),
          reminderDuration: z
            .string()
            .optional()
            .describe("Reminder duration, e.g. '3 days', '1 week'"),
        }),
        execute: async ({ entityId, relationshipIds, rows, status, reminderDuration }) => {
          const ids = relationshipIds ?? (entityId ? [entityId] : []);
          return {
            applied: true,
            entityId: entityId ?? null,
            relationshipIds: ids,
            rows: rows ?? [],
            status: status ?? null,
            reminderDuration: reminderDuration ?? null,
          };
        },
      });
  }

  if (surface === "general" || surface === "drawer") {
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
