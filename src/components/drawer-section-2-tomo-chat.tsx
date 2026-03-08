"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { TomoMessageContent } from "./tomo-message-content";
import type { TomoInitialMessage, TomoAssistance } from "@/lib/mockTomoAssistance";

const FALLBACK_SUGGESTIONS = ["Explain why urgent", "Draft follow-up", "Propose times", "Create action"];

type DrawerSection2TomoChatProps = {
  initialMessage?: TomoInitialMessage;
  suggestions: string[];
  contextLabel?: string;
  entityKey: string;
  selection?: { type: string; id: string };
  assistanceContext?: TomoAssistance | null;
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
}: DrawerSection2TomoChatProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/drawer-chat",
        body: {
          entityId: entityKey,
          selection,
          assistanceContext: assistanceContext ?? null,
        },
      }),
    [entityKey, selection, assistanceContext]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
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
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-900">TOMO AI</p>
          {contextLabel ? <p className="text-xs text-gray-500">{contextLabel}</p> : null}
        </div>
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
        {initialMessage ? <TomoMessageContent message={initialMessage} /> : null}

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
