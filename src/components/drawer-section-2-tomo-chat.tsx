"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { TomoMessageContent } from "./tomo-message-content";
import type { TomoInitialMessage, TomoAssistance } from "@/lib/mockTomoAssistance";

const FALLBACK_SUGGESTIONS = ["Explain why urgent", "Draft follow-up", "Propose times", "Create action"];

export type DrawerSelection =
  | { type: "relationship"; id: string }
  | { type: "pipeline_stage"; pipelineId: string; stage: string; relationshipIds: string[] }
  | { type: string; id: string };

export type CrmUpdatePayload = {
  entityId?: string;
  relationshipIds?: string[];
  rows?: { field: string; update: string }[];
  status?: string;
  reminderDuration?: string;
};

type DrawerSection2TomoChatProps = {
  initialMessage?: TomoInitialMessage;
  suggestions: string[];
  contextLabel?: string;
  entityKey: string;
  selection?: DrawerSelection;
  assistanceContext?: TomoAssistance | null;
  /** Called when update_crm tool runs — use to persist changes to mock/store */
  onCrmUpdate?: (payload: CrmUpdatePayload) => void;
};

/**
 * Section 2: Tomo Chat — Tomo speaks first with initialMessage, then AI conversation via Vercel AI SDK.
 */
export function DrawerSection2TomoChat({
  initialMessage,
  suggestions,
  contextLabel,
  entityKey,
  selection,
  assistanceContext,
  onCrmUpdate,
}: DrawerSection2TomoChatProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "drawer" as const,
            page:
              selection?.type === "relationship"
                ? "relationships"
                : selection?.type === "pipeline_stage"
                  ? "pipeline"
                  : "home",
            selection,
            contextTitle: contextLabel,
            assistanceContext: assistanceContext ?? null,
          },
        },
      }),
    [selection, contextLabel, assistanceContext]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onFinish: ({ message }) => {
      for (const part of message.parts ?? []) {
        if (
          part.type === "tool-update_crm" &&
          "state" in part &&
          part.state === "output-available" &&
          part.output
        ) {
          const result = part.output as CrmUpdatePayload & { applied?: boolean };
          if (!result?.applied) break;

          // Fallback: use selection id when entityId is missing
          const payload: CrmUpdatePayload =
            !result.entityId && !result.relationshipIds?.length && selection?.type === "relationship"
              ? { ...result, entityId: selection.id }
              : result;

          onCrmUpdate?.(payload);

          const fields = result.rows?.map((r) => r.field) ?? [];
          const count = result.relationshipIds?.length ?? (result.entityId ? 1 : 0);
          if (fields.length || result.status || result.reminderDuration) {
            const target = count > 1 ? `${count} relationships` : "CRM";
            toast.success(
              result.status
                ? `Status set to ${result.status}${count > 1 ? ` (${count} items)` : ""}`
                : result.reminderDuration
                  ? `Reminder set for ${result.reminderDuration}${count > 1 ? ` (${count} items)` : ""}`
                  : `${target} updated: ${fields.join(", ") || "done"}`
            );
          }
          break;
        }
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [entityKey, setMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage({ text: trimmed });
  };

  const displaySuggestions = suggestions.length ? suggestions : FALLBACK_SUGGESTIONS;
  const showChips = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header — compact; contextLabel omitted when redundant (e.g. same as drawer title) */}
      <div className="flex shrink-0 items-center border-b border-gray-200 px-3 py-1.5">
        <p className="text-xs font-medium text-gray-900">TOMO AI</p>
        {contextLabel ? <p className="ml-2 text-[11px] text-gray-500">— {contextLabel}</p> : null}
      </div>

      {/* Suggestion chips — visible until user sends first message */}
      {showChips && displaySuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-3 py-2">
          {displaySuggestions.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {/* Messages area */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {/* Tomo's initial message (static, always first) */}
        <TomoMessageContent message={initialMessage ?? { text: "What can I help you with?" }} />

        {/* AI conversation */}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
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

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 px-3 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this card..."
            disabled={isStreaming}
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="text-gray-400 transition hover:text-gray-600 disabled:opacity-30"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textContent = message.parts
    ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";

  if (!textContent.trim()) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg border px-3 py-2 ${
          isUser
            ? "border-blue-200 bg-blue-50 text-gray-900"
            : "border-gray-200 bg-gray-50 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-line leading-relaxed text-sm">{textContent}</p>
      </div>
    </div>
  );
}
