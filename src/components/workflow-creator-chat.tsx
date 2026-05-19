"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UIMessage } from "ai";
import type { Pipeline } from "@/lib/pipelines";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import {
  appendCustomPlaybook,
  createUserWorkflowInputSchema,
  type CustomPlaybookStored,
  type UserWorkflowAction,
  userWorkflowActionSchema,
} from "@/lib/customPlaybooks";
import { toast } from "sonner";
import { z } from "zod";

const confirmTriggerSchema = z.object({
  trigger: z.string().min(1),
  summary: z.string().optional(),
  inferred_default_time: z.string().optional(),
});

type WorkflowCreatorChatProps = {
  pipeline: Pipeline;
  onWorkflowCreated: (entry: CustomPlaybookStored) => void;
  onWorkflowDraftReady?: (input: import("@/lib/custom-playbook-schema").CreateUserWorkflowInput) => void;
  surfaceContext?: "pipeline" | "workflows";
  wizardStep?: "trigger" | "action";
  workflowName?: string;
  confirmedTrigger?: string;
  /** Trigger step: trigger already applied via confirm_workflow_trigger. */
  triggerConfirmed?: boolean;
  contextText?: string;
  attachmentNames?: string[];
  onTriggerConfirmed?: (payload: {
    trigger: string;
    summary: string | null;
    inferredDefaultTime: string | null;
  }) => void;
  onAdvanceWizardStep?: () => void;
  onActionConfirmed?: (action: UserWorkflowAction) => void;
  actionPills?: ReadonlyArray<{ id: string; label: string; instruction: string; kind?: string }>;
  onActionPillSelect?: (pill: { id: string; label: string; instruction: string; kind?: string }) => void;
  variant?: "compact" | "wizard";
};

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const displayText =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";
  if (!displayText.trim()) return null;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[var(--tomo-radius-md)] border px-3 py-2.5 ${
          isUser
            ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_32%,var(--tomo-rule))] bg-[color:var(--tomo-teal-tint)] text-[color:var(--foreground)]"
            : "border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] text-[color:var(--foreground)]"
        }`}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed">{displayText}</p>
      </div>
    </div>
  );
}

/**
 * Tomo chat for Lists “Use in workflow” → Custom. Surface workflow_creator + create_user_workflow (typed action).
 */
export function WorkflowCreatorChat({
  pipeline,
  onWorkflowCreated,
  onWorkflowDraftReady,
  surfaceContext = "pipeline",
  wizardStep,
  workflowName,
  confirmedTrigger,
  triggerConfirmed,
  contextText,
  attachmentNames,
  onTriggerConfirmed,
  onAdvanceWizardStep,
  onActionConfirmed,
  actionPills,
  onActionPillSelect,
  variant = "compact",
}: WorkflowCreatorChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const processedToolCallIds = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");

  const filterSummary = formatFilterSummary(pipeline.filterCriteria) || undefined;

  const orchestratorPage = surfaceContext === "workflows" ? ("workflows" as const) : ("pipeline" as const);

  const workflowCreatorBody = useMemo(
    () => ({
      surface: "workflow_creator" as const,
      page: orchestratorPage,
      workflowCreator: {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        ...(filterSummary ? { filterSummary } : {}),
        ...(surfaceContext === "workflows" && !wizardStep ? { listPreselected: true as const } : {}),
        ...(wizardStep ? { wizardStep } : {}),
        ...(workflowName?.trim() ? { workflowName: workflowName.trim() } : {}),
        ...(wizardStep === "trigger" && triggerConfirmed && confirmedTrigger?.trim()
          ? { triggerAlreadyConfirmed: true as const, confirmedTrigger: confirmedTrigger.trim() }
          : {}),
        ...(wizardStep === "action" && confirmedTrigger?.trim()
          ? { confirmedTrigger: confirmedTrigger.trim() }
          : {}),
        ...(wizardStep === "action" && contextText?.trim() ? { contextText: contextText.trim() } : {}),
        ...(wizardStep === "action" && attachmentNames?.length ? { attachmentNames } : {}),
      },
    }),
    [
      orchestratorPage,
      pipeline.id,
      pipeline.name,
      filterSummary,
      surfaceContext,
      wizardStep,
      workflowName,
      confirmedTrigger,
      triggerConfirmed,
      contextText,
      attachmentNames,
    ]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: { context: workflowCreatorBody },
      }),
    [workflowCreatorBody]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      const tcId =
        "toolCallId" in toolCall && typeof toolCall.toolCallId === "string"
          ? toolCall.toolCallId
          : null;
      if (tcId) {
        if (processedToolCallIds.current.has(tcId)) return;
        processedToolCallIds.current.add(tcId);
      }

      if (toolCall.toolName === "confirm_workflow_trigger") {
        const parsed = confirmTriggerSchema.safeParse(toolCall.input);
        if (!parsed.success) {
          toast.error("Could not set trigger — try describing when this should run again.");
          return;
        }
        onTriggerConfirmed?.({
          trigger: parsed.data.trigger.trim(),
          summary: parsed.data.summary?.trim() || null,
          inferredDefaultTime: parsed.data.inferred_default_time?.trim() || null,
        });
        return;
      }

      if (toolCall.toolName === "advance_workflow_wizard_step") {
        onAdvanceWizardStep?.();
        return;
      }

      if (toolCall.toolName === "confirm_workflow_action") {
        const parsed = userWorkflowActionSchema.safeParse(toolCall.input);
        if (!parsed.success) {
          toast.error("Could not confirm action — check required fields for your action type.");
          return;
        }
        onActionConfirmed?.(parsed.data);
        return;
      }

      if (toolCall.toolName !== "create_user_workflow") return;

      const raw = toolCall.input as unknown;
      const parsed = createUserWorkflowInputSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Could not create workflow — check name, trigger, and action fields for your action type.");
        return;
      }
      if (onWorkflowDraftReady) {
        onWorkflowDraftReady(parsed.data);
        return;
      }
      const entry = appendCustomPlaybook(parsed.data);
      if (!entry) {
        toast.error("Could not create workflow — name, trigger, and action must all be filled.");
        return;
      }
      onWorkflowCreated(entry);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(
      { text: trimmed },
      {
        body: { context: workflowCreatorBody },
      }
    );

    if (wizardStep === "trigger" && triggerConfirmed && onAdvanceWizardStep) {
      const affirmative = /^(yes|yep|yeah|sure|ok|okay|continue|next|let'?s go|go ahead)\s*[.!?]*$/i.test(trimmed);
      if (affirmative) {
        window.setTimeout(() => onAdvanceWizardStep(), 400);
      }
    }
  };

  const chatTitle =
    wizardStep === "trigger"
      ? "TOMO — define trigger"
      : wizardStep === "action"
        ? "TOMO — define action"
        : "TOMO — create workflow";

  const chatSubtitle =
    wizardStep === "trigger"
      ? `When should "${workflowName ?? "this workflow"}" run on ${pipeline.name}?`
      : wizardStep === "action"
        ? `Describe the action step for ${pipeline.name}`
        : surfaceContext === "workflows"
          ? `Describe when this runs and what Tomo should do on "${pipeline.name}".`
          : "Share a name, trigger, and action for this list.";

  const introCopy =
    wizardStep === "trigger" ? (
      triggerConfirmed && confirmedTrigger ? (
        <>
          Trigger is set to <strong>{confirmedTrigger}</strong>. Say <strong>yes</strong> when you’re ready to configure
          the action.
        </>
      ) : (
        <>
          When should <strong>{workflowName}</strong> run? Give a date (and time if you care). If you only give a date,
          I’ll use <strong>9:00 AM</strong> local time.
        </>
      )
    ) : wizardStep === "action" ? (
      <>
        Describe the <strong>action step</strong> — what Tomo should do for each LP when this workflow runs. Use the
        context panel for .docx materials, or pick a suggestion below.
      </>
    ) : surfaceContext === "workflows" ? (
      <>
        List <strong>{pipeline.name}</strong> is set. Tell me <strong>trigger</strong> and <strong>action</strong>.
      </>
    ) : (
      <>
        I’ll ask for <strong>name</strong>, <strong>trigger</strong>, and <strong>action</strong> for &quot;
        {pipeline.name}&quot;.
      </>
    );

  const shellClass =
    variant === "wizard"
      ? "flex min-h-[380px] flex-1 flex-col rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]"
      : "flex min-h-[220px] max-h-[40vh] flex-col rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]";

  return (
    <div className={shellClass}>
      <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
        <p className="text-xs font-medium text-[color:var(--foreground)]">{chatTitle}</p>
        <p className="text-[11px] text-[color:var(--tomo-mute)]">{chatSubtitle}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2 text-sm">
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] px-3 py-2">
            <p className="text-sm text-[color:var(--foreground)]">{introCopy}</p>
          </div>
        </div>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {wizardStep === "action" && actionPills?.length ? (
        <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] px-2 pt-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {actionPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                disabled={isStreaming}
                onClick={() => onActionPillSelect?.(pill)}
                className="rounded-full border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-2.5 py-1 text-[11px] text-[color:var(--tomo-body)] transition hover:border-[color:var(--tomo-teal)] hover:text-[color:var(--foreground)] disabled:opacity-50"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex shrink-0 gap-2 border-t border-[color:var(--tomo-rule-soft)] p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Message Tomo…"
          disabled={isStreaming}
          className="tomo-input min-w-0 flex-1 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2 text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)] disabled:opacity-50"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
      {messages.length > 0 && (
        <div className="border-t border-[color:var(--tomo-rule-soft)] px-2 pb-2">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[11px] text-[color:var(--tomo-mute)] transition hover:text-[color:var(--foreground)]"
          >
            Clear chat
          </button>
        </div>
      )}
    </div>
  );
}
