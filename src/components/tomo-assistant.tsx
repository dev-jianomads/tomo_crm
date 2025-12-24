/**
 * =============================================================================
 * TOMO CRM - Tomo AI Assistant Component
 * =============================================================================
 * 
 * The always-present AI chat interface for the Tomo CRM.
 * Users can ask questions, request actions, and get context-aware suggestions.
 * 
 * CURRENT STATE: Mock responses (local simulation)
 * 
 * PRODUCTION WIRING - TOMO AI API:
 * 
 * 1. API ENDPOINT:
 *    The Tomo AI agent will be built separately and expose API endpoints.
 *    Expected endpoint: POST /api/tomo/chat
 * 
 * 2. REQUEST FORMAT:
 *    ```
 *    {
 *      message: "Draft a follow-up email",
 *      conversationHistory: [...previousMessages],
 *      context: {
 *        currentPage: "contacts",
 *        selectedEntity: { type: "contact", id: "c1", data: {...} },
 *        userPreferences: { ... }
 *      }
 *    }
 *    ```
 * 
 * 3. RESPONSE FORMAT (streaming TBD):
 *    Option A - Server-Sent Events (SSE):
 *    ```
 *    const response = await fetch('/api/tomo/chat', {
 *      method: 'POST',
 *      headers: { 'Authorization': `Bearer ${token}` },
 *      body: JSON.stringify(payload),
 *    });
 *    
 *    const reader = response.body?.getReader();
 *    while (true) {
 *      const { done, value } = await reader.read();
 *      if (done) break;
 *      const chunk = new TextDecoder().decode(value);
 *      // Append chunk to message
 *    }
 *    ```
 * 
 *    Option B - WebSocket:
 *    ```
 *    const ws = new WebSocket('wss://your-api/tomo/chat');
 *    ws.send(JSON.stringify(payload));
 *    ws.onmessage = (event) => {
 *      const { type, content } = JSON.parse(event.data);
 *      if (type === 'token') appendToMessage(content);
 *      if (type === 'done') finalizeMessage();
 *    };
 *    ```
 * 
 * 4. TOOL CALLS:
 *    Tomo AI may return tool_calls for actions like:
 *    - draft_email: { to, subject, body }
 *    - create_task: { title, due, linkedTo }
 *    - schedule_meeting: { with, when, agenda }
 *    - search_contacts: { query }
 *    
 *    Handle these in the UI to show previews/confirmations.
 * 
 * 5. STREAMING UI:
 *    While streaming, show:
 *    - Typing indicator
 *    - Partial message text
 *    - Tool call previews as they arrive
 * =============================================================================
 */

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
  placeholder = "Ask TOMO anything…",
}: TomoAssistantProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
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
      {/* Header with context indicator */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">TOMO AI</p>
          {/* 
            Context label shows what entity Tomo is aware of
            PRODUCTION: This context is sent with each message to the API
          */}
          {contextLabel ? <p className="text-xs text-gray-500">{contextLabel}</p> : null}
        </div>
        <span className="text-xs text-gray-400">Always on</span>
      </div>

      {/* Quick suggestion chips */}
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2">
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

      {/* Message list */}
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
              {/* 
                PRODUCTION: For Tomo messages, support:
                - Markdown rendering
                - Code blocks
                - Tool call previews (email drafts, task creation, etc.)
                - Action buttons
              */}
              <p className="whitespace-pre-line">{msg.text}</p>
              <span className="mt-1 block text-[11px] text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {/* Scroll anchor */}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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

/**
 * =============================================================================
 * PRODUCTION: Streaming Integration Example
 * =============================================================================
 * 
 * Replace the mock onSend handler in app-shell.tsx with:
 * 
 * ```
 * const handleSendToTomo = async (text: string) => {
 *   // Add user message immediately
 *   const userMessage: TomoMessage = {
 *     id: crypto.randomUUID(),
 *     from: 'user',
 *     text,
 *     timestamp: Date.now(),
 *   };
 *   setMessages(prev => [...prev, userMessage]);
 *   
 *   // Create placeholder for AI response
 *   const aiMessageId = crypto.randomUUID();
 *   setMessages(prev => [...prev, {
 *     id: aiMessageId,
 *     from: 'tomo',
 *     text: '',
 *     timestamp: Date.now(),
 *   }]);
 *   
 *   try {
 *     const response = await fetch('/api/tomo/chat', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Bearer ${await getFirebaseIdToken()}`,
 *       },
 *       body: JSON.stringify({
 *         message: text,
 *         context: {
 *           page: section,
 *           selectedEntity: contextTitle ? { title: contextTitle } : null,
 *         },
 *       }),
 *     });
 *     
 *     // Handle streaming response
 *     const reader = response.body?.getReader();
 *     const decoder = new TextDecoder();
 *     let fullText = '';
 *     
 *     while (true) {
 *       const { done, value } = await reader!.read();
 *       if (done) break;
 *       
 *       const chunk = decoder.decode(value);
 *       fullText += chunk;
 *       
 *       // Update message in place
 *       setMessages(prev => prev.map(m =>
 *         m.id === aiMessageId ? { ...m, text: fullText } : m
 *       ));
 *     }
 *   } catch (error) {
 *     console.error('Tomo AI error:', error);
 *     setMessages(prev => prev.map(m =>
 *       m.id === aiMessageId
 *         ? { ...m, text: 'Sorry, I encountered an error. Please try again.' }
 *         : m
 *     ));
 *   }
 * };
 * ```
 */
