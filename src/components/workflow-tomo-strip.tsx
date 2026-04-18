"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  mergeStepsPreservingDraftTemplates,
  workflowToMarkdown,
  PLAYBOOK_SUGGESTIONS,
  type WorkflowDefinition,
} from "@/lib/workflow-templates";
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
  suggestions?: string[];
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
  suggestions: externalSuggestions,
}: WorkflowTomoStripProps) {
  const currentMarkdown = workflowToMarkdown(workflow);
  const [input, setInput] = useState("");
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());

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
  const allSuggestions = externalSuggestions ?? (playbookType ? PLAYBOOK_SUGGESTIONS[playbookType] : []);
  const visibleSuggestions = useMemo(
    () => allSuggestions.filter((s) => !usedChips.has(s)),
    [allSuggestions, usedChips]
  );

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (allSuggestions.includes(trimmed)) {
      setUsedChips((prev) => new Set([...prev, trimmed]));
    }
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
    <div className="shrink-0 border-t border-gray-200 bg-white" data-testid="workflow-tomo-strip">
      {visibleSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2">
          {visibleSuggestions.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">TOMO AI</p>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask Tomo to update ${playbookName}…`}
              disabled={isStreaming}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md tomo-ai-bg text-white transition disabled:opacity-50"
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
