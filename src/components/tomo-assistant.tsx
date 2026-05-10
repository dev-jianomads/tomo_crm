/**
 * TOMO CRM - Tomo AI Assistant Component
 *
 * Chat interface wired to POST /api/tomo/orchestrate (surface: general, drawer, or workflow).
 * Uses Vercel AI SDK useChat with streaming. Context (page, selection) passed per-request.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UIMessage } from "ai";

type TomoAssistantProps = {
  messages: UIMessage[];
  onSend: (text: string) => void;
  suggestions?: string[];
  contextLabel?: string;
  /** Shown above suggestion chips (e.g. "Quick prompts") */
  suggestionsHeader?: string;
  /** When false, hides the TOMO AI title row (e.g. when an outer shell provides the title). */
  showHeader?: boolean;
  placeholder?: string;
  /** When true, hide suggestion chips once conversation has started (frees space for chat) */
  hideSuggestionsWhenActive?: boolean;
  /** When true, show loading state and disable input */
  isStreaming?: boolean;
  /** Keep suggestion chips on one row (overflow-x scroll on narrow widths) */
  suggestionChipsSingleRow?: boolean;
};

/**
 * Tomo AI Assistant chat interface
 * 
 * @param messages - Array of conversation messages
 * @param onSend - Callback when user sends a message
 * @param suggestions - Quick-action chips (context-aware)
 * @param contextLabel - Shows what context Tomo is aware of
 * @param placeholder - Input placeholder text
 * 
 * PRODUCTION ENHANCEMENTS:
 * - Add loading/streaming state
 * - Add error handling for failed API calls
 * - Add retry mechanism
 * - Add message reactions (helpful/not helpful)
 * - Add copy button for AI responses
 * - Add tool call UI (email preview, task preview, etc.)
 */
export function TomoAssistant({
  messages,
  onSend,
  suggestions = [],
  contextLabel,
  suggestionsHeader,
  showHeader = true,
  placeholder = "Ask TOMO anything…",
  hideSuggestionsWhenActive = false,
  isStreaming = false,
  suggestionChipsSingleRow = false,
}: TomoAssistantProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;
    onSend(value);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]">
      {showHeader ? (
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3 dark:border-[color:var(--tomo-rule)]">
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground)]">TOMO AI</p>
            {contextLabel ? (
              <p className="whitespace-pre-line text-xs text-[color:var(--tomo-mute)]">{contextLabel}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Quick suggestion chips — collapse when active to give chat more space */}
      {suggestions.length && !(hideSuggestionsWhenActive && messages.length > 0) ? (
        <div className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-2 dark:border-[color:var(--tomo-rule)]">
          {suggestionsHeader ? (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">
              {suggestionsHeader}
            </p>
          ) : null}
          <div
            className={`flex gap-2 ${
              suggestionChipsSingleRow
                ? "min-w-0 flex-nowrap overflow-x-auto"
                : "flex-wrap"
            }`}
          >
          {suggestions.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="shrink-0 rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-navy-soft)] px-3 py-1 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-tint)] hover:text-[color:var(--foreground)] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
          </div>
        </div>
      ) : null}

      {/* Message list - min-h-0 allows shrinking so input stays visible */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((msg) => {
          const textContent =
            msg.parts
              ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
              .map((p) => p.text)
              .join("") ?? "";
          if (!textContent.trim()) return null;
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg border px-3 py-2.5 ${
                  isUser
                    ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,transparent)] bg-[color:var(--tomo-teal-tint)] text-[color:var(--foreground)]"
                    : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] text-[color:var(--foreground)]"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{textContent}</p>
              </div>
            </div>
          );
        })}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-3 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {/* Scroll anchor */}
        <div ref={endRef} />
      </div>

      {/* Input area - shrink-0 so prompt stays visible when container is resized */}
      <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] px-3 py-3 dark:border-[color:var(--tomo-rule)]">
        <div className="flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-3 py-2 shadow-[var(--tomo-shadow-1)] transition focus-within:border-[color:var(--tomo-teal)] dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_55%,transparent)] dark:focus-within:border-[color:var(--tomo-teal)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--tomo-mute)] focus:outline-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 items-center justify-center rounded-md tomo-ai-bg text-white transition disabled:opacity-50"
            aria-label="Send to TOMO"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
