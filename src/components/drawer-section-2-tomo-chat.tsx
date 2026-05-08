"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { PaperAirplaneIcon, WrenchScrewdriverIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { TomoMessageContent } from "./tomo-message-content";
import type { TomoInitialMessage, TomoAssistance } from "@/lib/mockTomoAssistance";
import { getToolParts } from "@/lib/tomoToolParts";
import {
  useTomoDrawerOrchestrate,
  type CrmUpdatePayload,
  type TomoDrawerOrchestrateSelection,
} from "@/hooks/use-tomo-drawer-orchestrate";

export type { CrmUpdatePayload };

const FALLBACK_SUGGESTIONS = ["Explain why urgent", "Draft follow-up", "Propose times", "Create action"];

export type DrawerSelection = TomoDrawerOrchestrateSelection;

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
  const [draftStack, setDraftStack] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const { input, setInput, handleSend, isStreaming, messages } = useTomoDrawerOrchestrate({
    entityKey,
    selection,
    contextLabel,
    assistanceContext,
    onCrmUpdate,
  });

  useEffect(() => {
    setDraftStack([]);
  }, [entityKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex h-full flex-col" data-testid="drawer-tomo-chat">
      <div className="flex shrink-0 items-center border-b border-[color:var(--tomo-rule)] px-3 py-1.5">
        <p className="text-xs font-medium text-[color:var(--foreground)]">TOMO AI</p>
        {contextLabel ? <p className="ml-2 text-[11px] text-[color:var(--tomo-mute)]">— {contextLabel}</p> : null}
      </div>

      {hasSplitChips ? (
        <>
          {executionChips.length > 0 ? (
            <div className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2" data-testid="drawer-tomo-execution-chips">
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]"
                data-testid="drawer-tomo-execution-heading"
              >
                Execution
              </p>
              <div className="flex flex-wrap gap-1.5">
                {executionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => runExecutionChip(chip)}
                    disabled={isStreaming}
                    className="rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-tint)] disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {draftChips.length > 0 ? (
            <div className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2" data-testid="drawer-tomo-draft-chips">
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]"
                data-testid="drawer-tomo-draft-heading"
              >
                Draft with Tomo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draftChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => runDraftChip(chip)}
                    disabled={isStreaming}
                    className="rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-teal-tint)] px-2.5 py-1 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-soft)] disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : legacyChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
          {legacyChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-teal-tint)] px-2.5 py-1 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-soft)] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {draftStack.length > 0 ? (
        <div className="shrink-0 border-b border-[color:var(--tomo-teal)]/35 bg-[color:var(--tomo-teal-tint)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">Drafted by TOMO</p>
          <ul className="mt-1 space-y-1 text-xs text-[color:var(--foreground)]">
            {draftStack.map((line, idx) => (
              <li
                key={`${line}-${idx}`}
                className="rounded border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2 py-1"
              >
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
            <div className="max-w-[85%] rounded-lg border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-teal-tint)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--tomo-mute)] [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-[color:var(--tomo-rule)] px-3 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2 transition-colors focus-within:border-[color:var(--tomo-teal)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this card..."
            disabled={isStreaming}
            className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--tomo-mute)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="text-[color:var(--tomo-mute)] transition hover:text-[color:var(--tomo-teal)] disabled:opacity-30"
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
      <div className="flex items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-status-amber-bg)] px-2.5 py-1.5 text-xs text-[color:var(--tomo-status-amber-text)]">
        <WrenchScrewdriverIcon className="h-3.5 w-3.5 animate-spin" />
        <span className="font-medium">{label}</span>
        <span className="opacity-90">running…</span>
      </div>
    );
  }

  if (state === "output-available") {
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] px-2.5 py-1.5 text-xs text-[color:var(--tomo-teal-muted)] dark:text-[color:var(--tomo-teal)]">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        {summary ? <span className="opacity-90">— {summary}</span> : <span className="opacity-90">done</span>}
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-red)] bg-[color:var(--tomo-red-bg)] px-2.5 py-1.5 text-xs text-[color:var(--tomo-red)]">
        <ExclamationCircleIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        <span className="opacity-90">failed</span>
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
              ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] text-[color:var(--foreground)]"
              : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] text-[color:var(--foreground)] dark:bg-[color:var(--tomo-navy-soft)]"
          }`}
        >
          <p className="whitespace-pre-line leading-relaxed text-sm">{textContent}</p>
        </div>
      ) : null}
    </div>
  );
}
