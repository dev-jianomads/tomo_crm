"use client";

/**
 * TODAY page (/home) — “What should I do right now?”
 * - Keep the focus narrow; no firehose
 * - Cross-link to Materials/Briefs for prep and Actions for execution
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ActionAmendChat } from "@/components/action-amend-chat";
import { ActionDrawerPanel } from "@/components/action-drawer-panel";
import { AttachDocumentModal } from "@/components/attach-document-modal";
import { CommitmentAmendChat } from "@/components/commitment-amend-chat";
import { CommitmentDrawerPanel } from "@/components/commitment-drawer-panel";
import { ContextDrawer } from "@/components/context-drawer";
import { DrawerSection2TomoChat } from "@/components/drawer-section-2-tomo-chat";
import { SchedulingFindTimeModal } from "@/components/scheduling-find-time-modal";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
import {
  buildRedraftedSchedulingCopy,
  mergeTomoAssistanceWithSchedulingOverride,
  type SchedulingDraftOverride,
} from "@/lib/schedulingFindTime";
import { suggestedPlaybooks, tomoDefaultWorkflows } from "@/lib/mockPlaybooks";
import { TomoAiBadge } from "@/components/tomo-ai-badge";
import { TomoAssistant } from "@/components/tomo-assistant";
import { useTomoChat } from "@/components/tomo-chat-context";
import {
  buildDailyBriefBlocks,
  buildOnMyRadarBlocks,
  type DailyBriefBlock,
  type DailyBriefLine,
  type DailyBriefLink,
} from "@/lib/dailyBriefFromToday";
import { getStillInTodoActions } from "@/lib/todayEngagement";
import { useTodayEngagement } from "@/hooks/useTodayEngagement";
import { actions, briefs, commitments, type ActionAttentionCard, type ActionItem } from "@/lib/mockData";
import { commitmentDayTime } from "@/lib/today-commitment-time";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/usePersistentState";
type TodaySelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | null;

function workflowLabelForAction(action: ActionItem): string {
  const fromPlaybook = action.workflowPlaybookId
    ? suggestedPlaybooks.find((p) => p.id === action.workflowPlaybookId)?.name
    : undefined;
  const fromTomo = action.workflowTomoDefaultId
    ? tomoDefaultWorkflows.find((w) => w.id === action.workflowTomoDefaultId)?.name
    : undefined;
  return fromPlaybook ?? fromTomo ?? "—";
}

/**
 * Inline Tomo on Today — same orchestrator as the shell, with todayContext.
 */
function TomoChatInline({ showAssistantHeader = true }: { showAssistantHeader?: boolean }) {
  const tomo = useTomoChat();

  if (!tomo) return null;
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="flex h-full w-full min-w-0 flex-col px-4">
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          <TomoAssistant
            messages={tomo.messages}
            onSend={tomo.onSend}
            suggestions={tomo.suggestions ?? []}
            showHeader={showAssistantHeader}
            placeholder="Ask Tomo about what's on Today…"
            isStreaming={tomo.isStreaming}
            suggestionChipsSingleRow
            hideSuggestionsWhenActive
          />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { ready, session } = useRequireSession();
  const router = useRouter();
  const [selection, setSelection] = useState<TodaySelection>(null);
  const [actionDrawerPhase, setActionDrawerPhase] = useState<"cta" | "amend">("cta");
  const [commitmentDrawerPhase, setCommitmentDrawerPhase] = useState<"cta" | "amend">("cta");
  const [actionOutcomeById, setActionOutcomeById] = useState<
    Record<string, "approved" | "later" | "dismissed">
  >({});
  const [commitmentOutcomeById, setCommitmentOutcomeById] = useState<Record<string, "approved">>({});
  const [attachDocumentOpen, setAttachDocumentOpen] = useState(false);
  /** Mock: filenames “attached” for the commitment drawer (per commitment id). */
  const [attachedFilesByCommitmentId, setAttachedFilesByCommitmentId] = useState<Record<string, string[]>>(
    {}
  );
  /** Replaces mock Tomo draft + lead for scheduling actions after "Find another time". */
  const [schedulingDraftOverrideByActionId, setSchedulingDraftOverrideByActionId] = useState<
    Record<string, SchedulingDraftOverride | undefined>
  >({});
  const [schedulingFindTimeOpen, setSchedulingFindTimeOpen] = useState(false);
  /** Bumps when opening the picker so the modal remounts at the narrative week (week offset resets). */
  const [schedulingFindTimeEpoch, setSchedulingFindTimeEpoch] = useState(0);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  /** Phase 2: single-line Tomo vs full inline chat */
  const [todayChatExpanded, setTodayChatExpanded] = usePersistentState<boolean>(
    "tomo-today-inline-chat-expanded",
    false
  );
  const [onMyRadarOpen, setOnMyRadarOpen] = useState(false);
  /** Larger viewport for the same thread (single TomoAssistant mount — inline or overlay, not both). */
  const [todayChatOverlayOpen, setTodayChatOverlayOpen] = useState(false);
  const [chatPortalReady, setChatPortalReady] = useState(false);
  useEffect(() => setChatPortalReady(true), []);

  // Top/bottom split ratio (25–75%), persisted. Default 70% for chatbox (slider up).
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-today-split-ratio", 70);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggingSplit || !todayChatExpanded) return;
    const handleMove = (e: MouseEvent) => {
      const el = splitContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(75, Math.max(25, newRatio));
      setSplitRatio(clamped);
    };
    const stop = () => setDraggingSplit(false);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [draggingSplit, todayChatExpanded, setSplitRatio]);

  useEffect(() => {
    if (!todayChatExpanded) setTodayChatOverlayOpen(false);
  }, [todayChatExpanded]);

  useEffect(() => {
    if (!todayChatOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTodayChatOverlayOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [todayChatOverlayOpen]);

  useEffect(() => {
    if (!onMyRadarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOnMyRadarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onMyRadarOpen]);

  const addToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const closeDrawerAndReset = () => {
    if (selection?.type === "commitment") {
      setAttachedFilesByCommitmentId((prev) => {
        const next = { ...prev };
        delete next[selection.id];
        return next;
      });
    }
    setSelection(null);
    setActionDrawerPhase("cta");
    setCommitmentDrawerPhase("cta");
    setAttachDocumentOpen(false);
    setSchedulingFindTimeOpen(false);
    router.replace("/home");
  };

  useEffect(() => {
    if (!selection || selection.type !== "action") setActionDrawerPhase("cta");
  }, [selection]);

  useEffect(() => {
    if (!selection || selection.type !== "commitment") setCommitmentDrawerPhase("cta");
  }, [selection]);

  const verbPillForAction = useCallback(
    (id: string) => {
      const done = actionOutcomeById[id];
      if (done === "approved") return "Approved";
      if (done === "later") return "Later";
      if (done === "dismissed") return "Dismissed";
      return actions.find((a) => a.id === id)?.attentionCard?.verb ?? "—";
    },
    [actionOutcomeById]
  );

  const verbPillForCommitment = useCallback(
    (id: string) => {
      if (commitmentOutcomeById[id] === "approved") return "Prep sent";
      const c = commitments.find((x) => x.id === id);
      if (!c) return "—";
      if (c.prepStatus === "ready") return "Prep ready";
      if (c.prepStatus === "first_contact") return "First Contact";
      return "";
    },
    [commitmentOutcomeById]
  );

  const selectedTitle = useMemo(() => {
    if (!selection) return undefined;
    if (selection.type === "action") return actions.find((a) => a.id === selection.id)?.title;
    if (selection.type === "commitment") {
      const c = commitments.find((x) => x.id === selection.id);
      return c ? `${c.lp} : ${c.contactName}` : undefined;
    }
    if (selection.type === "brief") return briefs.find((b) => b.id === selection.id)?.meetingTitle;
  }, [selection]);

  // Helper lookups
  const selectedAction = selection?.type === "action" ? actions.find((a) => a.id === selection.id) : null;
  const selectedCommitment = selection?.type === "commitment" ? commitments.find((c) => c.id === selection.id) : null;
  const selectedBrief = selection?.type === "brief" ? briefs.find((b) => b.id === selection.id) : null;

  const effectiveTomoAssistanceForSelectedAction = useMemo(() => {
    if (selection?.type !== "action") return null;
    const base = getTomoAssistance(selection.id);
    if (!base) return null;
    const override = schedulingDraftOverrideByActionId[selection.id];
    return mergeTomoAssistanceWithSchedulingOverride(base, override);
  }, [selection, schedulingDraftOverrideByActionId]);

  const getActivityLogEntries = useCallback(() => {
    if (!selection) return [];
    if (selection.type === "action") {
      const a = actions.find((x) => x.id === selection.id);
      return (a?.activityLog ?? []).map((e) => ({ id: e.id, ts: e.ts, actor: e.actor, summary: e.summary }));
    }
    if (selection.type === "commitment") {
      return [
        { ts: "Yesterday 3:20 PM", actor: "User" as const, summary: "Call — Discussed allocation timing and next steps." },
        { ts: "Tue 11:00 AM", actor: "User" as const, summary: "Meeting — Reviewed Q4 results; asked for updated deck." },
        { ts: "Mon 9:05 AM", actor: "User" as const, summary: "Email — Shared performance snapshot + follow-up agenda." },
      ];
    }
    if (selection.type === "brief") return [];
    return [];
  }, [selection]);

  const filteredActions = useMemo(() => {
    // Mock: show full attention list for any fund selection (no fund-scoped filtering yet).
    return actions;
  }, []);

  /** Sort by urgency: blocked first, then approval, then in_progress (CRM update card before Northwind) */
  const sortedActionItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const urgencyOrder = { blocked: 0, approval: 1, in_progress: 2 };
    return [...filteredActions].sort((a, b) => {
      const aOverdue = a.dueDate ? a.dueDate < today : false;
      const bOverdue = b.dueDate ? b.dueDate < today : false;
      const aScore = urgencyOrder[a.status as keyof typeof urgencyOrder] ?? 3;
      const bScore = urgencyOrder[b.status as keyof typeof urgencyOrder] ?? 3;
      if (aScore !== bScore) return aScore - bScore;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return 0;
    });
  }, [filteredActions]);

  /** Top attention slots, excluding items completed (Approve / Do later) in this session */
  const attentionActionsVisible = useMemo(
    () => sortedActionItems.filter((a) => actionOutcomeById[a.id] == null).slice(0, 6),
    [sortedActionItems, actionOutcomeById]
  );

  const filteredCommitments = useMemo(() => {
    return commitments;
  }, []);

  const sortedCommitments = useMemo(() => {
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const windowOrder: Record<string, number> = { today: 0, next72h: 1 };
    const parseTimeToMinutes = (time: string) => {
      const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      let hour = Number(match[1]) % 12;
      const minutes = Number(match[2]);
      if (match[3].toUpperCase() === "PM") hour += 12;
      return hour * 60 + minutes;
    };
    const commitmentKey = (commitment: (typeof commitments)[number]) => {
      const dt = commitment.datetime;
      if (dt.startsWith("Today")) return [windowOrder[commitment.window] ?? 9, 0, parseTimeToMinutes(dt)];
      if (dt.startsWith("Tomorrow")) return [windowOrder[commitment.window] ?? 9, 1, parseTimeToMinutes(dt)];
      const dayIdx = dayOrder.findIndex((day) => dt.startsWith(day));
      return [windowOrder[commitment.window] ?? 9, dayIdx === -1 ? 9 : dayIdx + 2, parseTimeToMinutes(dt)];
    };
    return [...filteredCommitments].sort((a, b) => {
      const [wA, dA, tA] = commitmentKey(a);
      const [wB, dB, tB] = commitmentKey(b);
      if (wA !== wB) return wA - wB;
      if (dA !== dB) return dA - dB;
      return tA - tB;
    });
  }, [filteredCommitments]);

  const filteredBriefs = useMemo(() => {
    return briefs;
  }, []);

  const dailyBriefBlocks = useMemo(
    () => buildDailyBriefBlocks(sortedActionItems, sortedCommitments, filteredBriefs),
    [sortedActionItems, sortedCommitments, filteredBriefs],
  );

  const attentionQueueIds = useMemo(() => attentionActionsVisible.map((a) => a.id), [attentionActionsVisible]);
  const { state: engagementState, recordEngaged } = useTodayEngagement(attentionQueueIds);

  useEffect(() => {
    if (selection?.type === "action") {
      recordEngaged(selection.id);
    }
  }, [selection, recordEngaged]);

  const stillInTodoActions = useMemo(
    () => getStillInTodoActions(actions, engagementState),
    [engagementState],
  );

  const onMyRadarBlocks = useMemo(
    () => buildOnMyRadarBlocks(sortedActionItems, sortedCommitments, filteredBriefs, stillInTodoActions),
    [sortedActionItems, sortedCommitments, filteredBriefs, stillInTodoActions],
  );

  const onMyRadarLineCount = useMemo(() => {
    let n = 0;
    for (const b of onMyRadarBlocks) {
      n += b.items.length + (b.secondaryItems?.length ?? 0);
    }
    return n;
  }, [onMyRadarBlocks]);

  const navigateBriefLine = useCallback((link: DailyBriefLink) => {
    if (link.kind === "action") setSelection({ type: "action", id: link.id });
    else if (link.kind === "commitment") setSelection({ type: "commitment", id: link.id });
    else setSelection({ type: "brief", id: link.id });
  }, []);

  const navigateBriefLineFromRadar = useCallback(
    (link: DailyBriefLink) => {
      navigateBriefLine(link);
      setOnMyRadarOpen(false);
    },
    [navigateBriefLine],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const userName = useMemo(() => {
    const email = session?.email ?? "";
    const match = email.match(/^([^@]+)/);
    const name = match ? match[1] : "";
    const derived = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
    return derived === "Test" || !derived ? "Ken" : derived;
  }, [session?.email]);

  const showDailyBriefResend =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SHOW_DAILY_BRIEF_RESEND === "true";

  const [dailyBriefResendBusy, setDailyBriefResendBusy] = useState(false);

  const resendDailyBrief = useCallback(async () => {
    setDailyBriefResendBusy(true);
    try {
      const res = await fetch("/api/email/daily-brief/resend", { method: "POST" });
      let data: { error?: string; detail?: string; loopsHttpStatus?: number } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* non-JSON body */
      }
      if (!res.ok) {
        const detail = data.detail?.trim();
        const head = data.error ?? "Could not send daily brief";
        const suffix = detail ? `${head}: ${detail}` : head;
        const withStatus =
          data.loopsHttpStatus != null ? `${suffix} (Loops HTTP ${data.loopsHttpStatus})` : suffix;
        throw new Error(withStatus);
      }
      addToast("Daily brief sent to your inbox.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send daily brief";
      addToast(msg);
    } finally {
      setDailyBriefResendBusy(false);
    }
  }, []);

  const resetDemoAttention = useCallback(() => {
    setActionOutcomeById({});
    setCommitmentOutcomeById({});
    addToast("Demo reset — attention list restored.");
  }, []);

  const listContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageListHeader label="Today" />
      {/* Resizable top/bottom split — Phase 2: collapsible inline Tomo */}
      <div
        ref={splitContainerRef}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Top: Tomo chat UI */}
        <div
          className="flex min-w-0 flex-col overflow-hidden bg-white px-4 py-3"
          style={
            todayChatExpanded
              ? { flex: `${splitRatio} 1 0`, minHeight: 160 }
              : { flex: "0 0 auto" }
          }
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-bold text-gray-900">
              {greeting}, {userName}.
            </h1>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-0.5">
              {showDailyBriefResend ? (
                <button
                  type="button"
                  onClick={() => void resendDailyBrief()}
                  disabled={dailyBriefResendBusy}
                  className="text-[11px] font-normal text-gray-400 underline-offset-2 transition hover:text-gray-600 hover:underline disabled:opacity-50"
                  title="Sends the Daily Brief email via Loops (demo)"
                >
                  {dailyBriefResendBusy ? "Sending…" : "Resend daily brief"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetDemoAttention}
                className="text-[11px] font-normal text-gray-400 underline-offset-2 transition hover:text-gray-600 hover:underline"
                title="Clears completed Today actions for this browser session (demo)"
              >
                Reset demo
              </button>
              <button
                type="button"
                onClick={() => setOnMyRadarOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={
                  onMyRadarLineCount > 0
                    ? `On My Radar, ${onMyRadarLineCount} items`
                    : "On My Radar"
                }
              >
                On My Radar
                {onMyRadarLineCount > 0 ? (
                  <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1 text-[11px] font-bold tabular-nums">
                    {onMyRadarLineCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          {todayChatExpanded ? (
            <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-end gap-2 pb-1">
                {!todayChatOverlayOpen ? (
                  <button
                    type="button"
                    onClick={() => setTodayChatOverlayOpen(true)}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 hover:text-gray-800"
                    aria-label="Expand Tomo chat to a larger view"
                  >
                    Expand view
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setTodayChatOverlayOpen(false);
                    setTodayChatExpanded(false);
                  }}
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 hover:text-gray-800"
                  aria-label="Collapse Tomo to single-line"
                >
                  Collapse
                  <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {todayChatOverlayOpen ? (
                <div className="flex min-h-[120px] shrink-0 flex-col justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3 text-center">
                  <p className="text-sm text-gray-600">Conversation open in expanded view.</p>
                  <button
                    type="button"
                    onClick={() => setTodayChatOverlayOpen(false)}
                    className="mt-2 text-xs font-medium text-[color:var(--accent)] underline-offset-2 hover:underline"
                  >
                    Return to inline chat
                  </button>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-hidden">
                  <TomoChatInline />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTodayChatExpanded(true)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-left transition hover:bg-gray-100"
              aria-label="Expand Tomo chat"
            >
              <span className="text-sm text-gray-600">Ask Tomo about what&apos;s on Today…</span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </button>
          )}
        </div>

        {todayChatExpanded ? (
          <div
            role="separator"
            aria-label="Resize top and bottom sections"
            className={`flex shrink-0 cursor-row-resize items-center justify-center py-1 hover:bg-gray-50 ${draggingSplit ? "bg-gray-50" : ""}`}
            onMouseDown={() => setDraggingSplit(true)}
          >
            <div className="h-1 w-12 rounded-full bg-gray-200" />
          </div>
        ) : null}

        {/* Bottom: attention | coming up (On My Radar is header + modal) */}
        <div
          className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3"
          style={{ flex: todayChatExpanded ? `${100 - splitRatio} 1 0` : "1 1 0" }}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex min-h-0 flex-col overflow-hidden">
              <TodayGroup
                title="What needs your attention"
                emptyHint="All caught up — nothing needs your attention right now."
                items={attentionActionsVisible.map((a) => {
                  const attentionWorkflowName =
                    (a.workflowPlaybookId &&
                      suggestedPlaybooks.find((p) => p.id === a.workflowPlaybookId)?.name) ||
                    (a.workflowTomoDefaultId &&
                      tomoDefaultWorkflows.find((w) => w.id === a.workflowTomoDefaultId)?.name) ||
                    undefined;
                  return {
                    id: a.id,
                    title: a.title,
                    meta: a.trigger,
                    extra: undefined,
                    type: "action" as const,
                    pills: [] as string[],
                    attentionCard: a.attentionCard,
                    attentionWorkflowName,
                    verbLabel: verbPillForAction(a.id),
                    attentionEmailSourceUrl: a.emailSourceUrl,
                  };
                })}
                activeId={selection?.type === "action" ? selection.id : undefined}
                onSelect={(id) => setSelection({ type: "action", id })}
                scrollable
              />
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden">
              <TodayGroup
                title="Coming up"
                items={sortedCommitments.map((c) => ({
                  id: c.id,
                  title: c.title,
                  meta: c.datetime,
                  extra: undefined,
                  type: "commitment" as const,
                  pills: [] as string[],
                  commitmentStatusPill:
                    commitmentOutcomeById[c.id] === "approved"
                      ? { label: "Prep sent", tone: "green" as const }
                      : c.prepStatus === "ready"
                        ? { label: "Prep ready", tone: "peach" as const }
                        : c.prepStatus === "first_contact"
                          ? { label: "First Contact", tone: "violet" as const }
                          : undefined,
                  comingUpCard: {
                    company: c.lp,
                    contactName: c.contactName,
                    timeLabel: commitmentDayTime(c.datetime),
                    meetingTitle: c.title,
                  },
                  commitmentOverdue: c.commitmentOverdue,
                  calendarUrl: c.calendarUrl,
                  linkedInUrl: c.linkedInUrl,
                }))}
                activeId={selection?.type === "commitment" ? selection.id : undefined}
                onSelect={(id) => setSelection({ type: "commitment", id })}
                scrollable
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Detail column hidden on Today; all detail views use fly-in drawer instead
  const detailContent = <div className="h-full" aria-hidden="true" />;

  if (!ready) return null;

  return (
    <>
      <AppShell
        section="home"
        listContent={listContent}
        detailContent={detailContent}
        detailVisible={false}
        contextTitle={selectedTitle ?? undefined}
        assistantChips={[
          "What's urgent today?",
          "Summarize what needs attention",
          "Who needs a follow-up?",
        ]}
        todayContext={{
          actions: attentionActionsVisible.map((a) => ({
            id: a.id,
            title: a.title,
            trigger: a.trigger,
            status: a.status,
            type: a.type,
          })),
          commitments: sortedCommitments.map((c) => ({
            id: c.id,
            title: c.title,
            datetime: c.datetime,
            lp: c.lp,
            contactName: c.contactName,
          })),
          dailyBriefBlocks,
        }}
      />
      <ContextDrawer
        open={Boolean(selection)}
        onClose={closeDrawerAndReset}
        title={selectedTitle ?? "Details"}
        hideHeaderTitle={selection?.type === "action" || selection?.type === "commitment"}
        drawerAriaLabel={
          selection?.type === "action" && selectedAction?.attentionCard
            ? `${selectedAction.attentionCard.company} — ${selectedAction.attentionCard.workKind}`
            : selection?.type === "commitment" && selectedCommitment
              ? `${selectedCommitment.lp} — ${selectedCommitment.title || "Commitment"}`
              : (selectedTitle ?? "Details")
        }
        section1Content={
          selection?.type === "action" && actionDrawerPhase === "amend"
            ? null
            : selection?.type === "commitment" && commitmentDrawerPhase === "amend"
              ? null
              : selection?.type === "action" && selectedAction ? (
            <ActionDrawerPanel
              action={selectedAction}
              assistance={effectiveTomoAssistanceForSelectedAction ?? getTomoAssistance(selection.id)}
              workflowDisplayName={workflowLabelForAction(selectedAction)}
              verbLabel={verbPillForAction(selection.id)}
              resolution={actionOutcomeById[selection.id] ?? null}
              onApprove={() => {
                setActionOutcomeById((p) => ({ ...p, [selection.id]: "approved" }));
                addToast("Email sent!");
                closeDrawerAndReset();
              }}
              onLater={() => {
                setActionOutcomeById((p) => ({ ...p, [selection.id]: "later" }));
                addToast("Deferred — we’ll remind you.");
              }}
              onDismiss={() => {
                setActionOutcomeById((p) => ({ ...p, [selection.id]: "dismissed" }));
                addToast("Removed from What needs your attention.");
                closeDrawerAndReset();
              }}
              onAmend={() => setActionDrawerPhase("amend")}
              onFindAnotherTime={
                selectedAction.type === "scheduling"
                  ? () => {
                      setSchedulingFindTimeEpoch((n) => n + 1);
                      setSchedulingFindTimeOpen(true);
                    }
                  : undefined
              }
              finalApproveLabel="Approve & send"
            />
          ) : selection?.type === "commitment" && selectedCommitment ? (
            <CommitmentDrawerPanel
              commitment={selectedCommitment}
              assistance={getTomoAssistance(selection.id)}
              verbLabel={verbPillForCommitment(selection.id)}
              resolution={commitmentOutcomeById[selection.id] === "approved" ? "approved" : null}
              attachedFiles={attachedFilesByCommitmentId[selection.id] ?? []}
              onDetachFile={(index) => {
                setAttachedFilesByCommitmentId((prev) => {
                  const id = selection.id;
                  const list = [...(prev[id] ?? [])];
                  list.splice(index, 1);
                  if (list.length === 0) {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  }
                  return { ...prev, [id]: list };
                });
              }}
              onApproveAndSend={() => {
                setCommitmentOutcomeById((p) => ({ ...p, [selection.id]: "approved" }));
                addToast("Agenda sent to participants");
                closeDrawerAndReset();
              }}
              onAmend={() => setCommitmentDrawerPhase("amend")}
              onAttachDocument={() => setAttachDocumentOpen(true)}
              onClose={closeDrawerAndReset}
              finalApproveLabel="Approve and Send"
            />
          ) : selection?.type === "brief" ? (
            <BriefDetail
              brief={selectedBrief}
              onCreateAction={() => router.push("/activity")}
              detailsOnly
            />
          ) : null
        }
        hideSection2={Boolean(
          (selection?.type === "action" && actionDrawerPhase === "cta") ||
            (selection?.type === "commitment" && commitmentDrawerPhase === "cta")
        )}
        section2Content={
          selection?.type === "action" && actionDrawerPhase === "amend" && selectedAction ? (
            <ActionAmendChat
              entityKey={`${selection.id}-amend`}
              selection={selection}
              action={selectedAction}
              assistance={
                effectiveTomoAssistanceForSelectedAction ??
                getTomoAssistance(selection.id) ?? {
                  initialMessage: { text: selectedAction.trigger },
                  suggestedPrompts: [],
                }
              }
              onBack={() => setActionDrawerPhase("cta")}
              onFinalApprove={() => {
                setActionOutcomeById((p) => ({ ...p, [selection.id]: "approved" }));
                addToast("Email sent!");
                closeDrawerAndReset();
              }}
              finalApproveLabel="Approve & send"
            />
          ) : selection?.type === "commitment" && commitmentDrawerPhase === "amend" && selectedCommitment ? (
            <CommitmentAmendChat
              entityKey={`${selection.id}-amend`}
              selection={selection}
              commitment={selectedCommitment}
              assistance={
                getTomoAssistance(selection.id) ?? {
                  initialMessage: { text: `${selectedCommitment.title} — tell Tomo what to change.` },
                  suggestedPrompts: [],
                }
              }
              onBack={() => setCommitmentDrawerPhase("cta")}
              onFinalApprove={() => {
                setCommitmentOutcomeById((p) => ({ ...p, [selection.id]: "approved" }));
                addToast("Agenda sent to participants");
                closeDrawerAndReset();
              }}
              finalApproveLabel="Approve and Send"
            />
          ) : selection?.type === "brief" ? (
            <DrawerSection2TomoChat
              initialMessage={getTomoAssistance(selection.id)?.initialMessage}
              suggestions={getTomoAssistance(selection.id)?.suggestedPrompts ?? []}
              executionChips={getTomoAssistance(selection.id)?.executionChips}
              draftChips={getTomoAssistance(selection.id)?.draftChips}
              contextLabel={selectedTitle ?? undefined}
              entityKey={selection.id}
              selection={selection}
              assistanceContext={getTomoAssistance(selection.id)}
            />
          ) : undefined
        }
        section3Entries={getActivityLogEntries()}
      />
      <SchedulingFindTimeModal
        key={schedulingFindTimeEpoch}
        open={schedulingFindTimeOpen}
        onClose={() => setSchedulingFindTimeOpen(false)}
        onSelectSlot={(slot) => {
          if (!selectedAction || selectedAction.type !== "scheduling") return;
          const copy = buildRedraftedSchedulingCopy(selectedAction, slot);
          setSchedulingDraftOverrideByActionId((prev) => ({
            ...prev,
            [selectedAction.id]: copy,
          }));
          addToast("Draft updated for the new time.");
        }}
      />
      <AttachDocumentModal
        open={attachDocumentOpen}
        onClose={() => setAttachDocumentOpen(false)}
        onUploaded={(fileName) => {
          addToast(`Attached: ${fileName}`);
          if (selection?.type === "commitment") {
            const id = selection.id;
            setAttachedFilesByCommitmentId((prev) => ({
              ...prev,
              [id]: [...(prev[id] ?? []), fileName],
            }));
          }
        }}
      />
      <OnMyRadarModal
        open={onMyRadarOpen}
        onClose={() => setOnMyRadarOpen(false)}
        blocks={onMyRadarBlocks}
        lineCount={onMyRadarLineCount}
        onLineNavigate={navigateBriefLineFromRadar}
      />
      <ToastViewport toasts={toasts} />
      {chatPortalReady && todayChatOverlayOpen && todayChatExpanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tomo-today-chat-expanded-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setTodayChatOverlayOpen(false);
              }}
            >
              <div
                className="flex h-[min(92dvh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                  <p id="tomo-today-chat-expanded-title" className="text-sm font-medium text-gray-900">
                    TOMO AI
                  </p>
                  <button
                    type="button"
                    onClick={() => setTodayChatOverlayOpen(false)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800"
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <TomoChatInline showAssistantHeader={false} />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function dailyBriefLineKey(line: DailyBriefLine, index: number): string {
  if (line.link) return `${line.link.kind}-${line.link.id}-i${index}`;
  return `plain-${index}-${line.label.slice(0, 40)}`;
}

function DailyBriefLineRow({
  line,
  onNavigate,
}: {
  line: DailyBriefLine;
  onNavigate: (link: DailyBriefLink) => void;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
      {line.link ? (
        <button
          type="button"
          onClick={() => onNavigate(line.link!)}
          title={line.label}
          className="min-w-0 cursor-pointer text-left text-sm leading-snug text-gray-800 underline-offset-2 transition hover:text-gray-950 hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-1"
          aria-label={`Open details: ${line.label.length > 120 ? `${line.label.slice(0, 120)}…` : line.label}`}
        >
          <span className="line-clamp-2 sm:line-clamp-none">{line.label}</span>
        </button>
      ) : (
        <span className="text-sm leading-snug text-gray-800">{line.label}</span>
      )}
    </li>
  );
}

/**
 * Tomo insights toggle in the On My Radar modal header (peach icon).
 * Set to `true` to show the control again; insight panels + `showInsights` state stay wired below.
 */
const SHOW_ON_MY_RADAR_INSIGHTS_HEADER = false;

/** On My Radar — header control opens this modal (not inline accordion). */
function OnMyRadarModal({
  open,
  onClose,
  blocks,
  lineCount,
  onLineNavigate,
}: {
  open: boolean;
  onClose: () => void;
  blocks: DailyBriefBlock[];
  lineCount: number;
  onLineNavigate: (link: DailyBriefLink) => void;
}) {
  const [showInsights, setShowInsights] = useState(false);
  const insightsVisible = SHOW_ON_MY_RADAR_INSIGHTS_HEADER && showInsights;

  useEffect(() => {
    if (!open) setShowInsights(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="on-my-radar-modal-title"
        className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="on-my-radar-modal-title" className="text-sm font-semibold text-gray-900">
              On My Radar
            </h2>
            {lineCount > 0 ? (
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-50 px-1.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200/80">
                {lineCount}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {SHOW_ON_MY_RADAR_INSIGHTS_HEADER ? (
              <button
                type="button"
                onClick={() => setShowInsights((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition hover:bg-gray-50 ${
                  showInsights ? "border-[color:var(--peach)] bg-[color:var(--peach-soft)]" : "border-gray-200 bg-white"
                }`}
                aria-label={showInsights ? "Hide Tomo insights" : "Show Tomo insights"}
                title={showInsights ? "Hide Tomo insights" : "Show Tomo insights"}
              >
                <span className="tomo-ai-badge inline-block h-4 w-4 align-middle" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 text-xs text-gray-600">
            Priority follow-ups and meetings are in the columns below. On My Radar focuses on momentum, execution
            loops, and items you haven&apos;t engaged yet.
          </p>
          <p className="mb-3 text-xs text-gray-600">Tap a line to open details in the drawer.</p>
          <div className="space-y-2.5 sm:space-y-3">
            {blocks.map((block) => (
              <section
                key={`${block.icon}-${block.title}`}
                className="rounded-xl border border-blue-100 bg-blue-50/40 px-2.5 py-2.5 sm:px-3 sm:py-2.5"
              >
                <div className={insightsVisible ? "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3" : "block"}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <BriefSectionIcon kind={block.icon} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{block.title}</p>
                        <p className="text-xs text-gray-600">{block.subtitle}</p>
                      </div>
                    </div>
                    <ul className="ml-4 mt-1.5 space-y-1 text-sm text-gray-800 sm:mt-2 sm:space-y-1.5">
                      {block.items.map((item, idx) => (
                        <DailyBriefLineRow key={dailyBriefLineKey(item, idx)} line={item} onNavigate={onLineNavigate} />
                      ))}
                    </ul>
                    {block.secondarySubtitle ? (
                      <p className="ml-6 mt-1.5 text-xs font-medium text-gray-600">{block.secondarySubtitle}</p>
                    ) : null}
                    {block.secondaryItems?.length ? (
                      <ul className="ml-4 mt-1 space-y-1 text-sm text-gray-800 sm:space-y-1.5">
                        {block.secondaryItems.map((item, idx) => (
                          <DailyBriefLineRow
                            key={dailyBriefLineKey(item, idx)}
                            line={item}
                            onNavigate={onLineNavigate}
                          />
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {insightsVisible ? (
                    <div className="rounded-md border tomo-ai-border bg-white px-2.5 py-2 sm:w-56 sm:shrink-0">
                      <div className="flex items-center justify-start">
                        <TomoAiBadge label="Tomo insight" />
                      </div>
                      <p className="mt-1 text-xs tomo-ai-text">{block.insight}</p>
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefSectionIcon({ kind }: { kind: DailyBriefBlock["icon"] }) {
  const common = "h-4 w-4 text-[color:var(--accent)]";

  if (kind === "followups") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path fill="currentColor" d="M7 4h8l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm7 1.5V9h3.5L14 5.5ZM9 11h8v1.5H9V11Zm0 3h8v1.5H9V14Z" />
      </svg>
    );
  }
  if (kind === "meetings") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 3h1.5v2H14V3h1.5v2H18a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2h2V3Zm10.5 7.5h-13V18a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 18.5 18v-7.5Z"
        />
      </svg>
    );
  }
  if (kind === "momentum") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path fill="currentColor" d="m4 16 5-5 3 3 6-7 2 1.7-8 9.3-3-3-3.7 3.7L4 16Zm0 4h16v1.5H4V20Z" />
      </svg>
    );
  }
  if (kind === "todo") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 3h9a2 2 0 0 1 2 2v14l-7-3-7 3V5a2 2 0 0 1 2-2Zm1 4.5v1.5h7V7.5H10Zm0 3v1.5h5v-1.5h-5Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="currentColor" d="M12 8.3a1 1 0 0 1 1 1V12h2.2a1 1 0 1 1 0 2H12a1 1 0 0 1-1-1V9.3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function TodayGroup({
  title,
  items,
  onSelect,
  activeId,
  scrollable = false,
  emptyHint,
}: {
  title: string;
  /** Shown when there are no rows (e.g. attention list after completions) */
  emptyHint?: string;
  items: {
    id: string;
    title: string;
    meta: string;
    type: "action" | "commitment" | "brief";
    extra?: string;
    pills: string[];
    workflowName?: string;
    attentionCard?: ActionAttentionCard;
    /** Resolved playbook / Tomo Default name for row 3; falls back to `meta` (trigger). */
    attentionWorkflowName?: string;
    /** Right pill; mirrors drawer after Approve / Do later */
    verbLabel?: string;
    /** Today “Coming up” — title row includes `meetingTitle` after contact name; time on row 2. */
    comingUpCard?: { company: string; contactName: string; timeLabel: string; meetingTitle?: string };
    /** Right pill: Prep sent (green); Prep ready (peach); First Contact (violet). */
    commitmentStatusPill?: { label: string; tone: "peach" | "green" | "violet" };
    commitmentOverdue?: boolean;
    calendarUrl?: string;
    linkedInUrl?: string;
    attentionEmailSourceUrl?: string;
  }[];
  onSelect: (id: string) => void;
  activeId?: string;
  dense?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 text-base font-semibold accent-title">{title}</p>
      <div className={`min-h-0 flex-1 space-y-2 ${scrollable ? "overflow-y-auto" : ""}`}>
        {items.length === 0 && emptyHint ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-gray-50/80 px-3 py-4 text-center text-sm text-gray-500">{emptyHint}</p>
        ) : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`today-${item.type}-row-${item.id}`}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === item.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {item.attentionCard ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold accent-title">
                    {item.attentionCard.company} : {item.attentionCard.contactName}
                  </p>
                  <span
                    className={
                      (item.verbLabel ?? item.attentionCard.verb) === "Approved"
                        ? "inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800"
                        : "inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]"
                    }
                  >
                    {item.verbLabel ?? item.attentionCard.verb}
                  </span>
                </div>
                <p className="mt-0.5 min-w-0 truncate text-xs leading-snug text-gray-600">
                  {item.attentionCard.workKind} : {item.attentionCard.workSubject}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--peach-ink)]">
                  {item.attentionWorkflowName ?? item.meta}
                </p>
                {item.attentionEmailSourceUrl ? (
                  <a
                    href={item.attentionEmailSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-[11px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open email
                  </a>
                ) : null}
              </>
            ) : item.comingUpCard ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold accent-title">
                    <span>
                      {item.comingUpCard.company} : {item.comingUpCard.contactName}
                    </span>
                    {item.comingUpCard.meetingTitle ? (
                      <span className="font-semibold text-gray-700"> · {item.comingUpCard.meetingTitle}</span>
                    ) : null}
                  </p>
                  {item.commitmentStatusPill ? (
                    <span
                      className={`inline-flex max-w-[min(100%,11rem)] shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight ${
                        item.commitmentStatusPill.tone === "green"
                          ? "border-green-200 bg-green-50 text-green-800"
                          : item.commitmentStatusPill.tone === "violet"
                            ? "border-violet-200 bg-violet-50 text-violet-900"
                            : "border-[color:var(--peach)] bg-[color:var(--peach-soft)] text-[color:var(--peach-ink)]"
                      }`}
                    >
                      {item.commitmentStatusPill.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 min-w-0 truncate text-xs leading-snug text-gray-600">{item.comingUpCard.timeLabel}</p>
                {item.commitmentOverdue ? (
                  <p className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                    Commitment overdue
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {item.calendarUrl ? (
                    <a
                      href={item.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                      data-testid="today-commitment-open-calendar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open calendar
                    </a>
                  ) : null}
                  {item.linkedInUrl ? (
                    <a
                      href={item.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-[#0a66c2] underline underline-offset-2 hover:text-[#004182]"
                      data-testid="today-commitment-open-linkedin"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{item.title}</p>
                  {item.pills.length > 0 ? (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {item.pills.map((pill) => (
                        <UrgencyChip key={pill} kind={pill} />
                      ))}
                    </div>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-600">{item.meta}</p>
                {item.workflowName ? (
                  <p className="mt-0.5 text-[11px] text-gray-500">{item.workflowName}</p>
                ) : null}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SuggestedWorkflows() {
  const router = useRouter();
  const playbooks = suggestedPlaybooks.filter((p) => p.enabled).slice(0, 2);
  if (!playbooks.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Suggested workflows</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {playbooks.map((playbook) => (
          <button
            key={playbook.id}
            onClick={() => router.push(`/workflows?playbook=${playbook.id}`)}
            className="rounded-lg border border-[color:var(--peach)] bg-[color:var(--peach-soft)] p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[color:var(--peach)] hover:bg-[color:var(--peach-soft)]"
          >
            <p className="text-sm font-semibold text-[color:var(--peach-ink)]">{playbook.name}</p>
            <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{playbook.description}</p>
            {playbook.targetCount != null && playbook.targetCount > 0 ? (
              <span className="mt-2 inline-block text-[11px] text-gray-500">{playbook.targetCount} targets</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function UrgencyChip({ kind }: { kind: string }) {
  const styles =
    kind === "Tomo"
      ? "bg-[color:var(--peach-soft)] text-[color:var(--peach-ink)] border-[color:var(--peach)]"
      : kind === "User Defined"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : kind === "Happening today" || kind === "Within 72h"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {kind}
    </span>
  );
}


function BriefDetail({
  brief,
  onCreateAction,
  onOpenBrief,
  compact = false,
  detailsOnly = false,
}: {
  brief: (typeof briefs)[number] | null | undefined;
  onCreateAction: () => void;
  onOpenBrief?: (id: string) => void;
  compact?: boolean;
  detailsOnly?: boolean;
}) {
  if (!brief) return <Placeholder title="No brief selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Brief</p>
          <h3 className="text-lg font-semibold accent-title">{brief.meetingTitle}</h3>
          <p className="text-sm text-gray-600">
            {brief.datetime} • {brief.lp}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{brief.status}</span>
      </div>
      {detailsOnly ? null : (
        <>
          <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Summary</p>
              <TomoAiBadge label="Tomo summary" />
            </div>
            <p className="text-sm tomo-ai-text">{brief.summary}</p>
          </div>
          {!compact ? (
            <>
              <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">Agenda</p>
                  <TomoAiBadge label="Tomo draft" />
                </div>
                <ul className="mt-1 space-y-1 tomo-ai-text">
                  {brief.agenda.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">Commitments</p>
                  <TomoAiBadge label="Tomo draft" />
                </div>
                <ul className="mt-1 space-y-1 tomo-ai-text">
                  {brief.commitments.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
          {!compact ? <SuggestedWorkflows /> : null}
          <div className="flex flex-wrap gap-2">
            <button className="button-primary" onClick={onCreateAction}>
              Create follow-up action
            </button>
            <button className="button-secondary" onClick={onCreateAction}>
              Draft email
            </button>
            {onOpenBrief ? (
              <button className="button-secondary" onClick={() => onOpenBrief(brief.id)}>
                Open full brief
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

function MockActivityBox() {
  const items = [
    { ts: "Yesterday 3:20 PM", type: "Call", note: "Discussed allocation timing and next steps." },
    { ts: "Tue 11:00 AM", type: "Meeting", note: "Reviewed Q4 results; asked for updated deck." },
    { ts: "Mon 9:05 AM", type: "Email", note: "Shared performance snapshot + follow-up agenda." },
  ];
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Recent activity</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={`${item.ts}-${item.type}`} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-900">{item.type}</p>
              <p className="text-xs text-gray-600">{item.note}</p>
            </div>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.ts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToastViewport({ toasts }: { toasts: { id: string; message: string }[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[280px] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-md border border-[color:var(--peach)] tomo-ai-bg px-3 py-2 text-sm text-white shadow-sm"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
