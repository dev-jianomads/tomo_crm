"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { StructuredFilterCriteria } from "@/lib/relationshipFilters";

const FILTER_SUGGESTIONS = [
  "cooling relationships",
  "Tier 1 LPs",
  "no contact in 14 days",
  "family offices in North America",
  "heating up",
  "show all",
];

type RelationshipsFilterChatProps = {
  currentFilters: StructuredFilterCriteria;
  onFiltersChange: (filters: StructuredFilterCriteria) => void;
  onClearFilters: () => void;
};

/**
 * Chat UI for natural language relationship filtering via orchestrator.
 * Replaces the single-line filter bar with a full chat experience.
 */
export function RelationshipsFilterChat({
  currentFilters,
  onFiltersChange,
  onClearFilters,
}: RelationshipsFilterChatProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "filter" as const,
            page: "relationships",
            intentHint: "filter" as const,
          },
        },
      }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onFinish: ({ message }) => {
      // Server executes tools; extract filter result from tool parts (type: tool-filter_relationships)
      for (const part of message.parts ?? []) {
        if (
          part.type === "tool-filter_relationships" &&
          "state" in part &&
          part.state === "output-available" &&
          part.output
        ) {
          const result = part.output as
            | { success: true; filters: StructuredFilterCriteria }
            | { success: false; error: string };
          if (result?.success && result.filters != null) {
            onFiltersChange(result.filters);
          }
          break;
        }
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (/\b(clear|reset|show\s+all)\b/i.test(trimmed)) {
      onClearFilters();
      setInput("");
      return;
    }
    setInput("");
    sendMessage(
      { text: trimmed },
      {
        body: {
          context: {
            surface: "filter" as const,
            page: "relationships",
            currentFilters,
            intentHint: "filter" as const,
          },
        },
      }
    );
  };

  const hasFilters = Object.keys(currentFilters).length > 0;
  const showChips = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Ask Tomo to filter
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Tomo's initial message */}
      <div className="flex justify-start border-b border-gray-100 px-4 py-3">
        <div className="max-w-[85%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-sm text-gray-900">How can I help you filter the CRM?</p>
        </div>
      </div>

      {showChips && (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2">
          {FILTER_SUGGESTIONS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/10 hover:text-[color:var(--accent)] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
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

      <div className="shrink-0 border-t border-gray-200 px-4 py-2">
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
            placeholder='e.g. "Tier 1 with no contact in 14 days" or "cooling" — type "clear" to reset'
            disabled={isStreaming}
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="rounded-md bg-[color:var(--accent)] p-1.5 text-white transition hover:opacity-90 disabled:opacity-50"
            aria-label="Send"
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

  const textContent =
    message.parts
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
