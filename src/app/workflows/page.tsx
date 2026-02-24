"use client";

/**
 * WORKFLOWS page (/workflows) — Playbooks + Tomo Chat
 * - Left: Playbooks list + collapsible Recent target lists (Option C)
 * - Right: Tomo Chat UI (only visible when a playbook is selected)
 * - Selected playbook is injected as initial context including current targets (Option A)
 */

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TomoAssistant } from "@/components/tomo-assistant";
import { suggestedPlaybooks, Playbook } from "@/lib/mockPlaybooks";
import { TargetList, TARGET_LISTS_STORAGE_KEY } from "@/lib/targets";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/storage";
import { TomoMessage } from "@/lib/types";
import { initialMessages } from "@/lib/mock-data";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type PlaybookTargetOverrides = Record<string, { targetListId?: string }>;

function WorkflowsPageContent() {
  const { ready } = useRequireSession();
  const searchParams = useSearchParams();
  const playbookIdFromUrl = searchParams.get("playbook");

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    () => playbookIdFromUrl || null
  );
  const [messages, setMessages] = usePersistentState<TomoMessage[]>(
    "tomo-workflows-chat",
    initialMessages
  );
  const [targetLists] = usePersistentState<TargetList[]>(TARGET_LISTS_STORAGE_KEY, []);
  const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookTargetOverrides>(
    "tomo-playbook-target-overrides",
    {}
  );
  const [recentTargetsOpen, setRecentTargetsOpen] = useState(false);

  const selectedPlaybook = useMemo(
    () => suggestedPlaybooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId]
  );

  // Resolve effective targets for a playbook (list or filters)
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

  // When a playbook is selected, inject it as context including current targets
  const chatContext = useMemo(() => {
    if (!selectedPlaybook) return null;
    const targetsSummary = getPlaybookTargetsSummary(selectedPlaybook);
    return `[Playbook context]\n${selectedPlaybook.name}\n${selectedPlaybook.summary}\n\nCurrent targets: ${targetsSummary}. Ask to change.\n\nYou're helping configure or run this playbook. The user can ask to edit rules, change targets, or test it.`;
  }, [selectedPlaybook, getPlaybookTargetsSummary]);

  const recentLists = targetLists.slice(0, 3);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Workflows</p>
        <p className="mt-1 text-sm text-gray-600">
          Playbooks run on schedule, check evidence, and create drafts.
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

        {/* Collapsible Recent target lists (Option C) */}
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
                      Use in playbook
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

  const detailContent = selectedPlaybook ? (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Chat with Tomo — {selectedPlaybook.name}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Playbook rules and current targets are loaded. Ask to edit, change targets, or run.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowsTomoChat
          messages={messages}
          setMessages={setMessages}
          playbookContext={chatContext}
          playbookName={selectedPlaybook.name}
          targetsSummary={getPlaybookTargetsSummary(selectedPlaybook)}
        />
      </div>
    </div>
  ) : (
    <div className="flex h-full items-center justify-center p-8">
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-8 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">Select a playbook</p>
        <p className="mt-1 text-xs text-gray-500">
          Click a playbook on the left to open Tomo and configure it.
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
              "Edit wait days",
              "Change reply definition",
              "Add target filters",
              "Test on last 5",
              "Turn on",
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

function WorkflowsTomoChat({
  messages,
  setMessages,
  playbookContext,
  playbookName,
  targetsSummary,
}: {
  messages: TomoMessage[];
  setMessages: React.Dispatch<React.SetStateAction<TomoMessage[]>>;
  playbookContext: string | null;
  playbookName: string;
  targetsSummary: string;
}) {
  const handleSend = (text: string) => {
    const userMessage: TomoMessage = {
      id: crypto.randomUUID(),
      from: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Mock: simulate AI response with playbook-aware reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "tomo",
          text: playbookContext
            ? `Got it. I'm working with the **${playbookName}** playbook. I can help you adjust the rules, change targets, or run a test. What would you like to do?`
            : "How can I help with this playbook?",
          timestamp: Date.now(),
        },
      ]);
    }, 400);
  };

  // Prepend a system message with playbook context and targets if we have it
  const displayMessages = useMemo(() => {
    if (!playbookContext) return messages;
    const contextMessage: TomoMessage = {
      id: "context",
      from: "tomo",
      text: `_Loaded playbook context. Current targets: ${targetsSummary}. Ready to configure._`,
      timestamp: Date.now(),
    };
    const withoutContext = messages[0]?.id === "context" ? messages.slice(1) : messages;
    return [contextMessage, ...withoutContext];
  }, [messages, playbookContext, targetsSummary]);

  return (
    <TomoAssistant
      messages={displayMessages}
      onSend={handleSend}
      suggestions={[
        "Change targets",
        "Edit wait days",
        "Change reply definition",
        "Add target filters",
        "Test on last 5",
        "Turn on",
      ]}
      contextLabel={playbookName}
      placeholder={`Ask about ${playbookName}…`}
    />
  );
}
