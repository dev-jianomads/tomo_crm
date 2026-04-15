"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { PaperAirplaneIcon, WrenchScrewdriverIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { TomoMessageContent } from "./tomo-message-content";
import type { TomoInitialMessage, TomoAssistance } from "@/lib/mockTomoAssistance";
import { getToolParts } from "@/lib/tomoToolParts";

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
  /** Phase 1 — optional split from `suggestions`; execution = silent confirm, draft = chat + stack */
  executionChips?: string[];
  draftChips?: string[];
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
  executionChips = [],
  draftChips = [],
  contextLabel,
  entityKey,
  selection,
  assistanceContext,
  onCrmUpdate,
}: DrawerSection2TomoChatProps) {
  const [input, setInput] = useState("");
  const [draftStack, setDraftStack] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  // Track which tool calls we've already processed so we don't double-fire
  const processedToolCalls = useRef<Set<string>>(new Set());

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

  // Stable ref for onCrmUpdate so useEffect always has the latest
  const onCrmUpdateRef = useRef(onCrmUpdate);
  onCrmUpdateRef.current = onCrmUpdate;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const applyCrmUpdate = useCallback((toolCallId: string, crmInput: unknown, crmOutput: unknown) => {
    if (processedToolCalls.current.has(toolCallId)) return;
    processedToolCalls.current.add(toolCallId);

    // Use output if it has rows, otherwise fall back to input
    const result = (crmOutput ?? crmInput) as CrmUpdatePayload & { applied?: boolean };
    if (!result) return;

    // Fallback: use selection id when entityId is missing
    const sel = selectionRef.current;
    const hasIds = !!(result.entityId || result.relationshipIds?.length);
    const payload: CrmUpdatePayload = hasIds
      ? result
      : sel?.type === "relationship"
        ? { ...result, entityId: sel.id, relationshipIds: undefined }
        : result;

    onCrmUpdateRef.current?.(payload);

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
  }, []);

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  // Watch messages for tool results — robust detection that works with both
  // typed (type: "tool-update_crm") and dynamic (type: "dynamic-tool") parts
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const toolParts = getToolParts(msg);
      for (const tp of toolParts) {
        if (tp.toolName === "update_crm" && tp.state === "output-available") {
          const toolCallId = (tp as { toolCallId?: string }).toolCallId ?? `${msg.id}-update_crm`;
          applyCrmUpdate(toolCallId, tp.input, tp.output);
        }
      }
    }
  }, [messages, applyCrmUpdate]);

  useEffect(() => {
    processedToolCalls.current.clear();
    setMessages([]);
    setInput("");
    setDraftStack([]);
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
  const hasSplitChips = executionChips.length > 0 || draftChips.length > 0;
  const legacyChips = hasSplitChips ? [] : displaySuggestions;

  const runExecutionChip = (label: string) => {
    toast.success("Recorded", { description: label });
  };

  const runDraftChip = (label: string) => {
    setDraftStack((prev) => [...prev, label]);
    handleSend(label);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-gray-200 px-3 py-1.5">
        <p className="text-xs font-medium text-gray-900">TOMO AI</p>
        {contextLabel ? <p className="ml-2 text-[11px] text-gray-500">— {contextLabel}</p> : null}
      </div>

      {hasSplitChips ? (
        <>
          {executionChips.length > 0 ? (
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Execution</p>
              <div className="flex flex-wrap gap-1.5">
                {executionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => runExecutionChip(chip)}
                    disabled={isStreaming}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 transition hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--accent-soft)] disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {draftChips.length > 0 ? (
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Draft with Tomo</p>
              <div className="flex flex-wrap gap-1.5">
                {draftChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => runDraftChip(chip)}
                    disabled={isStreaming}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : legacyChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-3 py-2">
          {legacyChips.map((chip) => (
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

      {draftStack.length > 0 ? (
        <div className="shrink-0 border-b border-[color:var(--peach)]/40 bg-[color:var(--peach-soft)]/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--peach-ink)]">Drafted by TOMO</p>
          <ul className="mt-1 space-y-1 text-xs text-gray-800">
            {draftStack.map((line, idx) => (
              <li key={`${line}-${idx}`} className="rounded border border-white/60 bg-white/80 px-2 py-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        <TomoMessageContent message={initialMessage ?? { text: "What can I help you with?" }} />

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

/** Render a single tool invocation as a compact status chip */
function ToolCallChip({ toolName, state, input }: { toolName: string; state: string; input?: unknown }) {
  const label = toolName === "update_crm" ? "CRM Update" : toolName === "draft_reply" ? "Draft" : toolName;

  const inputData = input as { rows?: { field: string; update: string }[] } | undefined;
  const summary = inputData?.rows?.map((r) => `${r.field} → ${r.update}`).join(", ");

  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
        <WrenchScrewdriverIcon className="h-3.5 w-3.5 animate-spin" />
        <span className="font-medium">{label}</span>
        <span className="text-amber-600">running…</span>
      </div>
    );
  }

  if (state === "output-available") {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-800">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        {summary ? <span className="text-green-600">— {summary}</span> : <span className="text-green-600">done</span>}
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
        <ExclamationCircleIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        <span className="text-red-600">failed</span>
      </div>
    );
  }

  return null;
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textContent = message.parts
    ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";

  // Extract tool parts for visual display
  const toolParts = getToolParts(message);

  if (!textContent.trim() && toolParts.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      {/* Tool call indicators */}
      {toolParts.map((tp, i) => (
        <ToolCallChip key={`${tp.toolName}-${i}`} toolName={tp.toolName} state={tp.state} input={tp.input} />
      ))}
      {/* Text content */}
      {textContent.trim() ? (
        <div
          className={`max-w-[85%] rounded-lg border px-3 py-2 ${
            isUser
              ? "border-blue-200 bg-blue-50 text-gray-900"
              : "border-gray-200 bg-gray-50 text-gray-900"
          }`}
        >
          <p className="whitespace-pre-line leading-relaxed text-sm">{textContent}</p>
        </div>
      ) : null}
    </div>
  );
}
