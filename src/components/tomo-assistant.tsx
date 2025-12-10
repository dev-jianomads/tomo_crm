"use client";

import { useEffect, useRef, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { TomoMessage } from "@/lib/types";

type TomoAssistantProps = {
  messages: TomoMessage[];
  onSend: (text: string) => void;
  suggestions?: string[];
  contextLabel?: string;
  placeholder?: string;
};

export function TomoAssistant({
  messages,
  onSend,
  suggestions = [],
  contextLabel,
  placeholder = "Ask TOMO anything…",
}: TomoAssistantProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    onSend(value);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">TOMO AI</p>
          {contextLabel ? <p className="text-xs text-gray-500">{contextLabel}</p> : null}
        </div>
        <span className="text-xs text-gray-400">Always on</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-md border px-3 py-2 ${
                msg.from === "user"
                  ? "border-blue-100 bg-blue-50 text-gray-900"
                  : "border-gray-200 bg-gray-50 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              <span className="mt-1 block text-[11px] text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {suggestions.length ? (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-2">
          {suggestions.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white transition hover:bg-blue-700"
            aria-label="Send to TOMO"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

