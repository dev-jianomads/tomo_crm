"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AppShell } from "@/components/app-shell";
import { WorkflowProcessFlow } from "@/components/workflow-process-flow";
import { suggestedPlaybooks, Playbook } from "@/lib/mockPlaybooks";
import { TargetList, TARGET_LISTS_STORAGE_KEY } from "@/lib/targets";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/storage";
import {
  DEFAULT_TEMPLATES,
  PLAYBOOK_SUGGESTIONS,
  workflowToMarkdown,
  workflowSummary,
  type WorkflowDefinition,
} from "@/lib/workflow-templates";
import type { PlaybookType } from "@/lib/mockPlaybooks";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type PlaybookTargetOverrides = Record<string, { targetListId?: string }>;

function WorkflowsPageContent() {
  const { ready } = useRequireSession();
  const searchParams = useSearchParams();
  const playbookIdFromUrl = searchParams.get("playbook");

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    () => playbookIdFromUrl || null
  );
  const [targetLists] = usePersistentState<TargetList[]>(TARGET_LISTS_STORAGE_KEY, []);
  const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookTargetOverrides>(
    "tomo-playbook-target-overrides",
    {}
  );
  const [recentTargetsOpen, setRecentTargetsOpen] = useState(false);
  const [topPanelHeight, setTopPanelHeight] = usePersistentState<number>(
    "tomo-workflows-split-height",
    50
  );
  const [draggingRow, setDraggingRow] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // ── Workflow markdown state (in-memory, resets on playbook switch) ──────
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [highlightVersion, setHighlightVersion] = useState(0);

  const selectedPlaybook = useMemo(
    () => suggestedPlaybooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId]
  );

  // Load default template when playbook changes
  useEffect(() => {
    if (selectedPlaybook) {
      const template = DEFAULT_TEMPLATES[selectedPlaybook.type];
      setWorkflow(template);
    } else {
      setWorkflow(null);
    }
  }, [selectedPlaybook]);

  // Row resize handler
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRow || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(80, Math.max(20, newHeight));
      setTopPanelHeight(clamped);
    };
    const handleUp = () => setDraggingRow(false);
    if (draggingRow) {
      document.body.classList.add("select-none");
      document.body.style.cursor = "row-resize";
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [draggingRow, setTopPanelHeight]);

  const getPlaybookTargetsSummary = useMemo(() => {
    return (playbook: Playbook): string => {
      const override = playbookOverrides[playbook.id];
      const targetListId = override?.targetListId ?? playbook.targetListId;
      if (targetListId) {
        const list = targetLists.find((l) => l.id === targetListId);
        return list ? `List: ${list.name} (${list.members.length} members)` : "List (not found)";
      }
      const filters = playbook.targetFilters;
      if (filters && Object.keys(filters).length > 0) {
        const parts = Object.entries(filters)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        return parts.length ? `Filters: ${parts.join(", ")}` : "No targets set";
      }
      return "No targets set";
    };
  }, [playbookOverrides, targetLists]);

  const handleUseInPlaybook = (list: TargetList) => {
    if (!selectedPlaybookId) return;
    setPlaybookOverrides((prev) => ({
      ...prev,
      [selectedPlaybookId]: { targetListId: list.id },
    }));
  };

  const handleResetWorkflow = useCallback(() => {
    if (!selectedPlaybook) return;
    setWorkflow(DEFAULT_TEMPLATES[selectedPlaybook.type]);
  }, [selectedPlaybook]);

  const handleWorkflowUpdate = useCallback((def: WorkflowDefinition) => {
    setWorkflow(def);
    setHighlightVersion((v) => v + 1);
  }, []);

  const recentLists = targetLists.slice(0, 3);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Workflows</p>
        <p className="mt-1 text-sm text-gray-600">
          Workflows run on schedule, check evidence, and create drafts.
        </p>
        <Link
          href="/targets"
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          View target lists →
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <div className="space-y-2">
          {suggestedPlaybooks.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              targetsSummary={getPlaybookTargetsSummary(playbook)}
              isSelected={selectedPlaybookId === playbook.id}
              onSelect={() => setSelectedPlaybookId(playbook.id)}
            />
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50/60">
          <button
            onClick={() => setRecentTargetsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80"
          >
            <span>Recent target lists</span>
            {recentTargetsOpen ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {recentTargetsOpen && (
            <div className="border-t border-gray-200 px-3 py-2 space-y-2">
              {recentLists.length ? (
                recentLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{list.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {list.members.length} members • {list.filters.tier}, {list.filters.stage}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUseInPlaybook(list)}
                      disabled={!selectedPlaybookId}
                      className="rounded-md border border-[color:var(--accent)] px-2 py-1 text-[11px] font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      Use in workflow
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-2">No target lists yet.</p>
              )}
              <Link
                href="/targets"
                className="block text-center text-xs text-[color:var(--accent)] hover:underline py-1"
              >
                Create or manage lists →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const detailContent = selectedPlaybook && workflow ? (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {selectedPlaybook.name}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Chat with Tomo to modify this workflow. Changes reset on refresh.
          </p>
        </div>
        <button
          onClick={handleResetWorkflow}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          title="Reset to default"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      <div ref={splitContainerRef} className="relative flex flex-1 min-h-0 flex-col">
        <div
          className="min-h-0 shrink-0 overflow-hidden border-b border-gray-200 bg-gray-50/50"
          style={{ height: `${topPanelHeight}%` }}
        >
          <WorkflowProcessFlow workflow={workflow} highlightVersion={highlightVersion} />
        </div>
        <div
          className="h-2 shrink-0 cursor-row-resize bg-gray-100 transition-colors hover:bg-blue-100 active:bg-blue-200"
          onMouseDown={() => setDraggingRow(true)}
          aria-label="Resize panes"
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkflowTomoChat
            workflow={workflow}
            playbookName={selectedPlaybook.name}
            playbookType={selectedPlaybook.type}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full items-center justify-center p-8">
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-8 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">Select a workflow</p>
        <p className="mt-1 text-xs text-gray-500">
          Click a workflow on the left to open Tomo and configure it.
        </p>
      </div>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="workflows"
      listContent={listContent}
      detailContent={detailContent}
      detailVisible={Boolean(selectedPlaybook)}
      contextTitle={selectedPlaybook?.name}
      assistantChips={
        selectedPlaybook
          ? [
              "Add a wait step",
              "Remove the last step",
              "Change the trigger",
              "Add an escalation step",
            ]
          : undefined
      }
    />
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsPageFallback />}>
      <WorkflowsPageContent />
    </Suspense>
  );
}

function WorkflowsPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-sm text-gray-500">Loading workflows…</div>
    </div>
  );
}

function PlaybookCard({
  playbook,
  targetsSummary,
  isSelected,
  onSelect,
}: {
  playbook: Playbook;
  targetsSummary: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
        isSelected
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{playbook.name}</p>
          <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
            {playbook.description}
          </p>
          <p className="mt-1.5 text-[11px] text-gray-500 truncate" title={targetsSummary}>
            {targetsSummary}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {playbook.enabled ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
              On
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
              Off
            </span>
          )}
          {playbook.targetCount != null && playbook.targetCount > 0 ? (
            <span className="text-[11px] text-gray-500">
              {playbook.targetCount} targets
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ── AI-powered workflow chat ────────────────────────────────────────────────

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { UIMessage } from "ai";

function WorkflowTomoChat({
  workflow,
  playbookName,
  playbookType,
  onWorkflowUpdate,
}: {
  workflow: WorkflowDefinition;
  playbookName: string;
  playbookType: PlaybookType;
  onWorkflowUpdate: (def: WorkflowDefinition) => void;
}) {
  const currentMarkdown = workflowToMarkdown(workflow);
  const endRef = useRef<HTMLDivElement>(null);
  const welcomeText = workflowSummary(workflow, playbookType);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/tomo/chat" }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "update_workflow") {
        const input = toolCall.input as {
          title: string;
          trigger: string;
          steps: WorkflowDefinition["steps"];
        };
        onWorkflowUpdate({
          title: input.title,
          trigger: input.trigger,
          steps: input.steps,
        });
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const allSuggestions = PLAYBOOK_SUGGESTIONS[playbookType];
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  const visibleSuggestions = useMemo(
    () => allSuggestions.filter((s) => !usedChips.has(s)),
    [allSuggestions, usedChips]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (allSuggestions.includes(trimmed)) {
      setUsedChips((prev) => new Set([...prev, trimmed]));
    }
    sendMessage({
      text: `---WORKFLOW_CONTEXT_START---\n${currentMarkdown}\n---WORKFLOW_CONTEXT_END---\n${trimmed}`,
    });
  };

  return (
    <div className="flex h-full flex-col rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">TOMO AI</p>
          <p className="text-xs text-gray-500">{playbookName}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Context-aware suggestion chips */}
      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2">
          {visibleSuggestions.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        {/* Initial workflow summary (always visible at top) */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="whitespace-pre-line leading-relaxed">{welcomeText}</p>
          </div>
        </div>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
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
      <ChatInput onSend={handleSend} disabled={isStreaming} playbookName={playbookName} />
    </div>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textContent = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    ?? "";

  // For user messages, strip the injected context prefix and show only the user request
  const displayText = isUser
    ? textContent.replace(/---WORKFLOW_CONTEXT_START---[\s\S]*?---WORKFLOW_CONTEXT_END---\n?/, "")
    : textContent;

  if (!displayText.trim()) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg border px-3 py-2.5 ${
          isUser
            ? "border-blue-200 bg-blue-50 text-gray-900"
            : "border-gray-200 bg-gray-50 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-line leading-relaxed">{displayText}</p>
      </div>
    </div>
  );
}

function ChatInput({
  onSend,
  disabled,
  playbookName,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  playbookName: string;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="border-t border-gray-200 px-3 py-3">
      <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Tomo about ${playbookName}…`}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-md tomo-ai-bg text-white transition disabled:opacity-50"
          aria-label="Send to TOMO"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
