"use client";

/**
 * Inline Tomo chatbox for Today page - prominent input at top, not in dock.
 * Matches the design: "Ask anything...", Recent chat, Auto, upload, send.
 */

import { useState } from "react";
import { PaperAirplaneIcon, Square2StackIcon } from "@heroicons/react/24/outline";
import { useTomoChat } from "./tomo-chat-context";

const RECENT_CHAT = "Prep for call with Tom";

type TomoChatboxInlineProps = {
  placeholder?: string;
  recentChat?: string;
};

export function TomoChatboxInline({
  placeholder = "Ask anything...",
  recentChat = RECENT_CHAT,
}: TomoChatboxInlineProps) {
  const [input, setInput] = useState("");
  const tomo = useTomoChat();

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (tomo) {
      tomo.openAndSend(text);
      setInput("");
    } else {
      // Fallback if used outside provider: just clear
      setInput("");
    }
  };

  const handleRecentClick = () => {
    if (tomo) tomo.openAndSend(recentChat);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {recentChat ? (
        <button
          onClick={handleRecentClick}
          className="mb-2 block text-left text-xs text-gray-500 hover:text-gray-700"
        >
          Recent chat — {recentChat}
        </button>
      ) : null}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-400">Auto</span>
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            aria-label="Attach"
          >
            <Square2StackIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--accent)] text-white transition hover:opacity-90"
            aria-label="Send"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
