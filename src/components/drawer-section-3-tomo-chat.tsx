"use client";

import { useCallback, useEffect, useState } from "react";
import { TomoAssistant } from "./tomo-assistant";
import { TomoMessage } from "@/lib/types";

const FALLBACK_SUGGESTIONS = ["Explain why urgent", "Draft follow-up", "Propose times", "Create action"];

/**
 * Mock response generator for drawer chat.
 * PRODUCTION: Replace with Tomo AI API call.
 */
function drawerSuggestionFromText(input: string, contextLabel?: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("apply") || lower.includes("approve")) return "Done. Updates applied.";
  if (lower.includes("reject")) return "Rejected. I won't suggest this again for this card.";
  if (lower.includes("reminder")) return "Reminder set for 3 days from now.";
  if (lower.includes("explain")) return "Based on the evidence and engagement signals, this is the recommended next step.";
  if (lower.includes("tone") || lower.includes("shorter")) return "Here's a revised version with that adjustment.";
  if (lower.includes("workflow")) return "This workflow runs when the trigger fires. You can edit it on the Workflows page.";
  if (contextLabel) return `Pulling context on "${contextLabel}". Here's a concise next step.`;
  return "Got it. I'll keep this in mind and suggest follow-ups.";
}

type DrawerSection3TomoChatProps = {
  /** Dynamic suggestions from Section 2 (mockTomoAssistance.suggestedPrompts) */
  suggestions: string[];
  /** Context label (e.g. selected card title) */
  contextLabel?: string;
  /** Reset chat when this changes (card-specific, ephemeral) */
  entityKey: string;
};

/**
 * Section 3: Tomo chat — card-specific, separate from main Tomo chat.
 * Messages are ephemeral per drawer open; reset when selection changes.
 */
export function DrawerSection3TomoChat({ suggestions, contextLabel, entityKey }: DrawerSection3TomoChatProps) {
  const [messages, setMessages] = useState<TomoMessage[]>([]);

  // Reset messages when entity changes (card-specific chat)
  useEffect(() => {
    setMessages([]);
  }, [entityKey]);

  const onSend = useCallback(
    (text: string) => {
      const userMessage: TomoMessage = {
        id: crypto.randomUUID(),
        from: "user",
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // MOCK: Simulate AI response
      // PRODUCTION: Replace with streaming API call
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: "tomo",
            text: drawerSuggestionFromText(text, contextLabel),
            timestamp: Date.now(),
          },
        ]);
      }, 400);
    },
    [contextLabel]
  );

  const displaySuggestions = suggestions.length ? suggestions : FALLBACK_SUGGESTIONS;

  return (
    <div className="h-[280px] min-h-[280px] shrink-0">
      <TomoAssistant
        messages={messages}
        onSend={onSend}
        suggestions={displaySuggestions}
        contextLabel={contextLabel}
        placeholder="Ask about this card..."
        hideSuggestionsWhenActive
      />
    </div>
  );
}
