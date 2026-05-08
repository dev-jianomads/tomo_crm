"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { mergeStepsPreservingDraftTemplates, workflowToMarkdown, type WorkflowDefinition } from "@/lib/workflow-templates";
import type { PlaybookType } from "@/lib/mockPlaybooks";

type PipelineCtx = {
  pipelineId: string;
  pipelineName: string;
  relationshipIds: string[];
  relationshipCount: number;
} | null;

type WorkflowTomoStripProps = {
  workflow: WorkflowDefinition;
  playbookName: string;
  playbookType?: PlaybookType;
  pipelineContext: PipelineCtx;
  onWorkflowUpdate: (def: WorkflowDefinition) => void;
};

/**
 * Single-row Tomo input for workflow edits — no chat thread; tool success surfaces via toast.
 */
export function WorkflowTomoStrip({
  workflow,
  playbookName,
  playbookType,
  pipelineContext,
  onWorkflowUpdate,
}: WorkflowTomoStripProps) {
  const currentMarkdown = workflowToMarkdown(workflow);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "workflow" as const,
            page: "workflows",
            playbookName,
            ...(playbookType ? { playbookType } : {}),
          },
        },
      }),
    [playbookName, playbookType]
  );

  const { sendMessage, status } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName !== "update_workflow") return;
      const raw = toolCall.input as {
        title: string;
        trigger: string;
        steps: WorkflowDefinition["steps"];
        triggerKind?: WorkflowDefinition["triggerKind"];
      };
      onWorkflowUpdate({
        title: raw.title,
        trigger: raw.trigger,
        steps: mergeStepsPreservingDraftTemplates(workflow.steps, raw.steps),
        triggerKind: raw.triggerKind ?? workflow.triggerKind ?? "EVENT",
      });
      toast.success("Workflow updated");
    },
    onError: () => {
      toast.error("Couldn’t reach Tomo — try again.");
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(
      { text: trimmed },
      {
        body: {
          context: {
            surface: "workflow" as const,
            page: "workflows",
            workflowContext: currentMarkdown,
            playbookName,
            ...(playbookType ? { playbookType } : {}),
            pipelineContext,
          },
        },
      }
    );
    setInput("");
  };

  return (
    <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]" data-testid="workflow-tomo-strip">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">TOMO AI</p>
          <div className="flex min-w-0 items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-2 shadow-[var(--tomo-shadow-1)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tomo to amend this step"
              disabled={isStreaming}
              className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--tomo-mute)] focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleSend(input)}
              disabled={isStreaming || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] tomo-ai-bg text-[color:var(--tomo-card)] transition disabled:opacity-50"
              aria-label="Send to TOMO"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
