"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AppShell } from "@/components/app-shell";
import { WorkflowProcessFlow } from "@/components/workflow-process-flow";
import { suggestedPlaybooks, Playbook, tomoDefaultWorkflows, type TomoDefaultWorkflow } from "@/lib/mockPlaybooks";
import { usePipelines } from "@/lib/pipelines";
import { useFunds } from "@/components/fund-provider";
import { relationships } from "@/lib/mockData";
import { applyFilters, formatFilterSummary } from "@/lib/relationshipFilters";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/storage";
import {
  DEFAULT_TEMPLATES,
  PLAYBOOK_SUGGESTIONS,
  workflowToMarkdown,
  type WorkflowDefinition,
} from "@/lib/workflow-templates";
import type { PlaybookType } from "@/lib/mockPlaybooks";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

function WorkflowsPageContent() {
  const { ready } = useRequireSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const playbookIdFromUrl = searchParams.get("playbook");
  const pipelineIdFromUrl = searchParams.get("pipelineId");
  const { activeFundId } = useFunds();
  const { pipelines } = usePipelines(activeFundId);

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    () => playbookIdFromUrl || null
  );
  const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookPipelineOverrides>(
    "tomo-playbook-pipeline-overrides",
    {}
  );
  const [tomoDefaultOpen, setTomoDefaultOpen] = useState(true);
  const [userDefinedOpen, setUserDefinedOpen] = useState(true);
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

  // When pipelineId in URL (from /pipeline "Use in workflow"), assign to playbook and navigate
  useEffect(() => {
    if (!pipelineIdFromUrl || !pipelines.length) return;
    const pipeline = pipelines.find((p) => p.id === pipelineIdFromUrl);
    if (!pipeline) return;
    const targetPlaybookId = playbookIdFromUrl || suggestedPlaybooks[0]?.id;
    if (!targetPlaybookId) return;
    setPlaybookOverrides((prev) => ({
      ...prev,
      [targetPlaybookId]: { pipelineId: pipeline.id },
    }));
    setSelectedPlaybookId(targetPlaybookId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pipelineId");
    router.replace(params.toString() ? `?${params}` : "/workflows", { scroll: false });
  }, [pipelineIdFromUrl, pipelines, playbookIdFromUrl, router, searchParams, setPlaybookOverrides]);

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
      const pipelineId = override?.pipelineId ?? playbook.pipelineId;
      if (pipelineId) {
        const pipeline = pipelines.find((p) => p.id === pipelineId);
        if (!pipeline) return "Pipeline (not found)";
        const count = applyFilters(relationships, pipeline.filterCriteria).length;
        const summary = formatFilterSummary(pipeline.filterCriteria);
        return summary
          ? `Pipeline: ${pipeline.name} (${count}) — ${summary}`
          : `Pipeline: ${pipeline.name} (${count})`;
      }
      const criteria = playbook.filterCriteria;
      if (criteria && Object.keys(criteria).length > 0) {
        const count = applyFilters(relationships, criteria).length;
        const summary = formatFilterSummary(criteria);
        return summary ? `${count} targets — ${summary}` : `${count} targets`;
      }
      return "No targets set";
    };
  }, [playbookOverrides, pipelines]);

  const handleResetWorkflow = useCallback(() => {
    if (!selectedPlaybook) return;
    setWorkflow(DEFAULT_TEMPLATES[selectedPlaybook.type]);
  }, [selectedPlaybook]);

  const handleWorkflowUpdate = useCallback((def: WorkflowDefinition) => {
    setWorkflow(def);
    setHighlightVersion((v) => v + 1);
  }, []);

  const pipelineContext = useMemo(() => {
    if (!selectedPlaybook) return null;
    const override = playbookOverrides[selectedPlaybook.id];
    const pipelineId = override?.pipelineId ?? selectedPlaybook.pipelineId;
    if (!pipelineId) return null;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return null;
    const rels = applyFilters(relationships, pipeline.filterCriteria);
    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      relationshipIds: rels.map((r) => r.id),
      relationshipCount: rels.length,
    };
  }, [selectedPlaybook, playbookOverrides, pipelines]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Workflows</p>
        <p className="mt-1 text-sm text-gray-600">
          Workflows run on schedule, check evidence, and create drafts.
        </p>
        <Link
          href="/pipeline"
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          View pipelines →
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {/* Tomo Default accordion */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/60">
          <button
            onClick={() => setTomoDefaultOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80"
          >
            <span>Tomo Default</span>
            {tomoDefaultOpen ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {tomoDefaultOpen && (
            <div className="border-t border-gray-200 px-3 py-2 space-y-2">
              {tomoDefaultWorkflows.map((wf) => (
                <TomoDefaultWorkflowCard key={wf.id} workflow={wf} />
              ))}
            </div>
          )}
        </div>

        {/* User Defined accordion */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/60">
          <button
            onClick={() => setUserDefinedOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80"
          >
            <span>User Defined</span>
            {userDefinedOpen ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {userDefinedOpen && (
            <div className="border-t border-gray-200 px-3 py-2 space-y-2">
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
            pipelineContext={pipelineContext}
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

function TomoDefaultWorkflowCard({ workflow }: { workflow: TomoDefaultWorkflow }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{workflow.name}</p>
          <p className="mt-0.5 text-xs text-gray-600">
            <span className="text-gray-500">{workflow.trigger}</span>
            <span className="mx-1">→</span>
            <span>{workflow.action}</span>
          </p>
        </div>
        {workflow.enabled ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
            On
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            Off
          </span>
        )}
      </div>
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
  pipelineContext,
  onWorkflowUpdate,
}: {
  workflow: WorkflowDefinition;
  playbookName: string;
  playbookType: PlaybookType;
  pipelineContext: {
    pipelineId: string;
    pipelineName: string;
    relationshipIds: string[];
    relationshipCount: number;
  } | null;
  onWorkflowUpdate: (def: WorkflowDefinition) => void;
}) {
  const currentMarkdown = workflowToMarkdown(workflow);
  const endRef = useRef<HTMLDivElement>(null);

  // Transport uses static config only. workflowContext is passed per-request in sendMessage
  // to avoid stale context (useChat doesn't react to transport/body changes after init).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "workflow" as const,
            page: "workflows",
            playbookName,
            playbookType,
          },
        },
      }),
    [playbookName, playbookType]
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
    sendMessage(
      { text: trimmed },
      {
        body: {
          context: {
            surface: "workflow" as const,
            page: "workflows",
            workflowContext: currentMarkdown,
            playbookName,
            playbookType,
            pipelineContext,
          },
        },
      }
    );
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
        {/* Tomo's initial message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-sm text-gray-900">Can I help you understand or update this workflow?</p>
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

  const displayText =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

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
