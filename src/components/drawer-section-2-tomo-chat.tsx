"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { TomoMessageContent } from "./tomo-message-content";
import type { TomoInitialMessage } from "@/lib/mockTomoAssistance";
import type { TomoMessage } from "@/lib/types";

const FALLBACK_SUGGESTIONS = ["Explain why urgent", "Draft follow-up", "Propose times", "Create action"];

function mockResponse(input: string, contextLabel?: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("apply") || lower.includes("approve")) return "Done. Updates applied.";
  if (lower.includes("reject")) return "Rejected. I won't suggest this again for this card.";
  if (lower.includes("reminder")) return "Reminder set for 3 days from now.";
  if (lower.includes("explain")) return "Based on the evidence and engagement signals, this is the recommended next step.";
  if (lower.includes("tone") || lower.includes("shorter")) return "Here's a revised version with that adjustment.";
  if (lower.includes("workflow") || lower.includes("playbook")) return "This workflow runs when the trigger fires. You can edit it on the Workflows page.";
  if (contextLabel) return `Pulling context on "${contextLabel}". Here's a concise next step.`;
  return "Got it. I'll keep this in mind and suggest follow-ups.";
}

type DrawerSection2TomoChatProps = {
  initialMessage?: TomoInitialMessage;
  suggestions: string[];
  contextLabel?: string;
  entityKey: string;
};

/**
 * Section 2: Tomo Chat — Tomo speaks first with initialMessage, then mock conversation.
 * Phase 3 replaces mock with useChat + Vercel AI SDK.
 */
export function DrawerSection2TomoChat({ initialMessage, suggestions, contextLabel, entityKey }: DrawerSection2TomoChatProps) {
  const [messages, setMessages] = useState<TomoMessage[]>([]);
  const [input, setInput] = useState("");
  const entityKeyRef = useRef(entityKey);

  useEffect(() => {
    entityKeyRef.current = entityKey;
    setMessages([]);
    setInput("");
  }, [entityKey]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput("");

      const capturedKey = entityKeyRef.current;
      const userMsg: TomoMessage = { id: crypto.randomUUID(), from: "user", text: trimmed, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      setTimeout(() => {
        if (entityKeyRef.current !== capturedKey) return;
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), from: "tomo", text: mockResponse(trimmed, contextLabel), timestamp: Date.now() },
        ]);
      }, 400);
    },
    [contextLabel]
  );

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
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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

        {/* Conversation */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg border px-3 py-2 ${
                msg.from === "user"
                  ? "border-blue-200 bg-blue-50 text-gray-900"
                  : "border-gray-200 bg-gray-50 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-line leading-relaxed text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
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
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="text-gray-400 transition hover:text-gray-600 disabled:opacity-30"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
