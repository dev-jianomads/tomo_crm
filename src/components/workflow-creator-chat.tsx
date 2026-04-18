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
} from "@/lib/customPlaybooks";
import { toast } from "sonner";

type WorkflowCreatorChatProps = {
  pipeline: Pipeline;
  onWorkflowCreated: (entry: CustomPlaybookStored) => void;
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
        className={`max-w-[85%] rounded-lg border px-3 py-2.5 ${
          isUser
            ? "border-blue-200 bg-blue-50 text-gray-900"
            : "border-gray-200 bg-gray-50 text-gray-900"
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
export function WorkflowCreatorChat({ pipeline, onWorkflowCreated }: WorkflowCreatorChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const processedToolCallIds = useRef<Set<string>>(new Set());
  const [input, setInput] = useState("");

  const filterSummary = formatFilterSummary(pipeline.filterCriteria) || undefined;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "workflow_creator" as const,
            page: "pipeline" as const,
            workflowCreator: {
              pipelineId: pipeline.id,
              pipelineName: pipeline.name,
              ...(filterSummary ? { filterSummary } : {}),
            },
          },
        },
      }),
    [pipeline.id, pipeline.name, filterSummary]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName !== "create_user_workflow") return;
      const tcId =
        "toolCallId" in toolCall && typeof toolCall.toolCallId === "string"
          ? toolCall.toolCallId
          : null;
      if (tcId) {
        if (processedToolCallIds.current.has(tcId)) return;
        processedToolCallIds.current.add(tcId);
      }
      const raw = toolCall.input as unknown;
      const parsed = createUserWorkflowInputSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Could not create workflow — check name, trigger, and action fields for your action type.");
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
        body: {
          context: {
            surface: "workflow_creator" as const,
            page: "pipeline" as const,
            workflowCreator: {
              pipelineId: pipeline.id,
              pipelineName: pipeline.name,
              ...(filterSummary ? { filterSummary } : {}),
            },
          },
        },
      }
    );
  };

  return (
    <div className="flex min-h-[220px] max-h-[40vh] flex-col rounded-lg border border-gray-200 bg-white">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-medium text-gray-900">TOMO — create workflow</p>
        <p className="text-[11px] text-gray-500">Share a name, trigger, and action for this list.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2 text-sm">
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-sm text-gray-900">
              I’ll ask for a short <strong>name</strong>, <strong>trigger</strong>, and <strong>action</strong>. When
              we’re aligned, I’ll finalize the workflow for list &quot;{pipeline.name}&quot;.
            </p>
          </div>
        </div>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex shrink-0 gap-2 border-t border-gray-100 p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Message Tomo…"
          disabled={isStreaming}
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
      {messages.length > 0 && (
        <div className="border-t border-gray-100 px-2 pb-2">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[11px] text-gray-400 hover:text-gray-600"
          >
            Clear chat
          </button>
        </div>
      )}
    </div>
  );
}
