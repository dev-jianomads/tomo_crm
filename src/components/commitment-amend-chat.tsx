"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";
import { getToolParts } from "@/lib/tomoToolParts";
import type { DrawerSelection } from "@/components/context-drawer";
import { getCommitmentDrawerAgendaPreview } from "@/components/commitment-drawer-panel";
import type { Commitment } from "@/lib/mockData";

type CommitmentAmendChatProps = {
  entityKey: string;
  selection: DrawerSelection;
  commitment: Commitment;
  assistance: TomoAssistance;
  onBack: () => void;
  onFinalApprove: () => void;
  finalApproveLabel?: string;
};

/**
 * Amend subflow for Coming up — current agenda preview, chat, back, final approve.
 */
export function CommitmentAmendChat({
  entityKey,
  selection,
  commitment,
  assistance,
  onBack,
  onFinalApprove,
  finalApproveLabel = "Approve and Send",
}: CommitmentAmendChatProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const preview = useMemo(() => getCommitmentDrawerAgendaPreview(assistance), [assistance]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "drawer" as const,
            page: "home" as const,
            selection,
            contextTitle: "Amend agenda",
            assistanceContext: { ...assistance, executionChips: undefined, draftChips: undefined },
          },
        },
      }),
    [selection, assistance]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [entityKey, setMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setInput("");
      sendMessage({ text: trimmed });
    },
    [isStreaming, sendMessage]
  );

  const hasAssistantReply = useMemo(
    () => messages.some((m) => m.role === "assistant" && messageHasVisibleTextOrTool(m)),
    [messages]
  );

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="commitment-amend-chat">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-1 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          Back
        </button>
        <span className="text-xs font-medium text-gray-900">Amend with Tomo</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-3 text-sm">
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Current agenda</p>
          <p className="text-xs text-gray-500">
            {commitment.lp} : {commitment.contactName}
            {commitment.title ? ` · ${commitment.title}` : ""}
          </p>
          {preview.leadText ? <p className="text-sm leading-relaxed text-gray-800">{preview.leadText}</p> : null}
          {preview.summary ? <p className="text-sm leading-relaxed text-gray-800">{preview.summary}</p> : null}
          {preview.snapshotFallback && !preview.summary ? (
            <p className="text-sm leading-relaxed text-gray-800">{preview.snapshotFallback}</p>
          ) : null}
          {preview.agenda.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-gray-800">
              {preview.agenda.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {preview.commitments.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-gray-800">
              {preview.commitments.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {!preview.leadText &&
          !preview.summary &&
          !preview.snapshotFallback &&
          preview.agenda.length === 0 &&
          preview.commitments.length === 0 ? (
            <p className="text-sm text-gray-600">No agenda block yet — describe what to change.</p>
          ) : null}
        </div>

        {messages.map((msg) => (
          <AmendBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">Tomo is thinking…</div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray-200 px-1 py-2">
        {hasAssistantReply ? (
          <button type="button" className="button-primary tomo-ai-bg w-full text-sm" onClick={() => onFinalApprove()}>
            {finalApproveLabel}
          </button>
        ) : null}
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
            placeholder="Tell Tomo how to amend the agenda…"
            disabled={isStreaming}
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || isStreaming} className="text-gray-400 transition hover:text-gray-600 disabled:opacity-30">
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function messageHasVisibleTextOrTool(message: UIMessage): boolean {
  const text =
    message.parts?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text").map((p) => p.text).join("") ?? "";
  if (text.trim()) return true;
  return getToolParts(message).length > 0;
}

function AmendBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textContent =
    message.parts?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text").map((p) => p.text).join("") ?? "";
  if (!textContent.trim()) return null;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm leading-relaxed ${
          isUser ? "border-blue-200 bg-blue-50 text-gray-900" : "border-gray-200 bg-gray-50 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-line">{textContent}</p>
      </div>
    </div>
  );
}
