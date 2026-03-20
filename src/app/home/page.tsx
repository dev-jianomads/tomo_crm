"use client";

/**
 * TODAY page (/home) — “What should I do right now?”
 * - Keep the focus narrow; no firehose
 * - Cross-link to Materials/Briefs for prep and Actions for execution
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { DrawerSection2TomoChat } from "@/components/drawer-section-2-tomo-chat";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";
import { TomoAiBadge } from "@/components/tomo-ai-badge";
import { TomoAssistant } from "@/components/tomo-assistant";
import { useTomoChat } from "@/components/tomo-chat-context";
import { actions, briefs, commitments, type ActionAttentionCard } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePersistentState } from "@/lib/storage";

type TodaySelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | null;

/**
 * Inline Tomo AI chat - minimal prompt-only view for Today page.
 * Focused on answering questions about What needs your attention and Coming up.
 * Uses orchestrator (surface: general) with todayContext injected.
 */
function TomoChatInline({ subtitle }: { subtitle?: string }) {
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
            contextLabel={subtitle}
            placeholder="Ask about your tasks or upcoming meetings..."
            isStreaming={tomo.isStreaming}
            suggestionChipsSingleRow
          />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { ready, session } = useRequireSession();
  const router = useRouter();
  const { activeFundId } = useFunds();
  const [selection, setSelection] = useState<TodaySelection>(null);
  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const closeDailyBrief = useCallback(() => setShowDailyBrief(false), []);

  // Top/bottom split ratio (25–75%), persisted. Default 70% for chatbox (slider up).
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-today-split-ratio", 70);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggingSplit) return;
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
  }, [draggingSplit, setSplitRatio]);

  const addToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const closeDrawerAndReset = () => {
    setSelection(null);
    router.replace("/home");
  };

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
    if (activeFundId === "all") return actions;
    return actions.filter((_, idx) => idx % 2 === 0); // stub: pretend alternate items match the selected fund
  }, [activeFundId]);

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

  const filteredCommitments = useMemo(() => {
    if (activeFundId === "all") return commitments;
    return commitments.filter((_, idx) => idx % 2 === 1);
  }, [activeFundId]);

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
    if (activeFundId === "all") return briefs;
    return briefs.filter((_, idx) => idx % 2 === 0);
  }, [activeFundId]);

  const dailyBriefBlocks: {
    icon: "followups" | "meetings" | "momentum" | "loops";
    title: string;
    subtitle: string;
    items: string[];
    secondarySubtitle?: string;
    secondaryItems?: string[];
    insight: string;
  }[] = [
    {
      icon: "followups",
      title: "Priority Follow-ups",
      subtitle: "LP follow-ups due today",
      items: ["Blackstone - post-meeting note", "Endowment A - deck resend", "Family Office X - Q&A response"],
      insight: "Based on follow-up queue and unresolved asks.",
    },
    {
      icon: "meetings",
      title: "Meetings Requiring Prep",
      subtitle: "Today's LP meetings",
      items: ["10:30 - Pension Fund B", "14:00 - FoF C"],
      insight: "Generated from commitments and linked brief context.",
    },
    {
      icon: "momentum",
      title: "Momentum Signals",
      subtitle: "Conversations heating up",
      items: ["Sovereign D - reply time accelerating", "Insurance Co E - increased engagement"],
      secondarySubtitle: "Conversations cooling",
      secondaryItems: ["Endowment F - 10 days no response"],
      insight: "Derived from momentum and engagement trend signals.",
    },
    {
      icon: "loops",
      title: "Open Execution Loops",
      subtitle: "Threads needing closure",
      items: ["Legal docs pending", "DDQ follow-up not sent"],
      insight: "Compiled from outstanding tasks and open threads.",
    },
  ];

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

  const listContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageListHeader
        label="Today"
        description="Prioritize actions and meetings for the active fund, skim briefs, and ask Tomo to reason over what needs attention next."
      />
      {/* Resizable top/bottom split */}
      <div
        ref={splitContainerRef}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Top: Tomo chat UI */}
        <div
          className="flex min-h-[160px] min-w-0 flex-col overflow-hidden bg-white px-4 py-3"
          style={{ flex: `${splitRatio} 1 0` }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {greeting}, {userName}.
            </h1>
            <button
              className="button-secondary shrink-0 text-sm"
              onClick={() => setShowDailyBrief(true)}
              aria-label="Open Daily Brief"
            >
              Daily Brief
            </button>
          </div>
          <div className="min-h-[200px] flex-1 overflow-hidden">
            <TomoChatInline subtitle={selectedTitle ?? undefined} />
          </div>
        </div>

        {/* Resize handle - no border, minimal */}
        <div
          role="separator"
          aria-label="Resize top and bottom sections"
          className={`flex shrink-0 cursor-row-resize items-center justify-center py-1 hover:bg-gray-50 ${draggingSplit ? "bg-gray-50" : ""}`}
          onMouseDown={() => setDraggingSplit(true)}
        >
          <div className="h-1 w-12 rounded-full bg-gray-200" />
        </div>

        {/* Bottom: attention | coming up */}
        <div
          className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3"
          style={{ flex: `${100 - splitRatio} 1 0` }}
        >
          {/* Side-by-side: What needs your attention | Coming up */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex min-h-0 flex-col overflow-hidden">
              <TodayGroup
                title="What needs your attention"
                items={sortedActionItems.slice(0, 6).map((a) => {
                  const isTomo = Boolean(a.workflowTomoDefaultId) || a.workflowPillOverride === "Tomo";
                  const attentionRow3Prefix = isTomo ? "Tomo draft: " : a.workflowPlaybookId ? "User Defined: " : "";
                  return {
                    id: a.id,
                    title: a.title,
                    meta: a.trigger,
                    extra: undefined,
                    type: "action" as const,
                    pills: [] as string[],
                    attentionCard: a.attentionCard,
                    attentionRow3Prefix,
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
                  pills: c.window === "today" ? ["Happening today"] : ["Within 72h"],
                  comingUpCard: {
                    company: c.lp,
                    contactName: c.contactName,
                    timeLabel: commitmentTimeOnly(c.datetime),
                  },
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
        assistantChips={["What's urgent today?", "Why is Lumen blocked?", "Prep my next meeting", "Summarize what needs attention"]}
        todayContext={{
          actions: sortedActionItems.slice(0, 6).map((a) => ({
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
        }}
      />
      <DailyBriefDialog open={showDailyBrief} onClose={closeDailyBrief} blocks={dailyBriefBlocks} />
      <ContextDrawer
        open={Boolean(selection)}
        onClose={closeDrawerAndReset}
        title={selectedTitle ?? "Details"}
        section1Content={
          selection?.type === "action" ? (
            <ActionDetail
              actionId={selection.id}
              onToast={addToast}
              onComplete={closeDrawerAndReset}
              detailsOnly
            />
          ) : selection?.type === "commitment" ? (
            <CommitmentDetail
              commitment={selectedCommitment}
              brief={selectedCommitment?.briefId ? filteredBriefs.find((b) => b.id === selectedCommitment.briefId) : null}
              onOpenBrief={(briefId) => router.push(`/materials?tab=briefs&brief=${briefId}`)}
              onCreateAction={() => router.push("/activity")}
              detailsOnly
            />
          ) : selection?.type === "brief" ? (
            <BriefDetail
              brief={selectedBrief}
              onCreateAction={() => router.push("/activity")}
              detailsOnly
            />
          ) : null
        }
        section2Content={
          selection ? (
            <DrawerSection2TomoChat
              initialMessage={getTomoAssistance(selection.id)?.initialMessage}
              suggestions={getTomoAssistance(selection.id)?.suggestedPrompts ?? []}
              contextLabel={selectedTitle ?? undefined}
              entityKey={selection.id}
              selection={selection}
              assistanceContext={getTomoAssistance(selection.id)}
            />
          ) : undefined
        }
        section3Entries={getActivityLogEntries()}
      />
      <ToastViewport toasts={toasts} />
    </>
  );
}

function DailyBriefDialog({
  open,
  onClose,
  blocks,
}: {
  open: boolean;
  onClose: () => void;
  blocks: {
    icon: "followups" | "meetings" | "momentum" | "loops";
    title: string;
    subtitle: string;
    items: string[];
    secondarySubtitle?: string;
    secondaryItems?: string[];
    insight: string;
  }[];
}) {
  const [showInsights, setShowInsights] = useState(true);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 sm:items-center" onClick={onClose}>
      <div
        className={`w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5 ${
          showInsights ? "max-w-2xl" : "max-w-xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Today</p>
            <h2 className="text-lg font-semibold accent-title">Daily Brief</h2>
            <p className="text-sm text-gray-600">A focused read on where attention should go right now.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInsights((prev) => !prev)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md border hover:bg-gray-50 ${
                showInsights ? "border-[color:var(--peach)] bg-[color:var(--peach-soft)]" : "border-gray-200"
              }`}
              aria-label={showInsights ? "Hide Tomo insights" : "Show Tomo insights"}
              title={showInsights ? "Hide Tomo insights" : "Show Tomo insights"}
            >
              <span className="tomo-ai-badge inline-block h-4 w-4 align-middle" aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
              aria-label="Close Daily Brief"
            >
              X
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {blocks.map((block) => (
            <section key={block.title} className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
              <div className={showInsights ? "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3" : "block"}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <BriefSectionIcon kind={block.icon} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{block.title}</p>
                      <p className="text-xs text-gray-600">{block.subtitle}</p>
                    </div>
                  </div>
                  <ul className="ml-4 mt-2 space-y-1.5 text-sm text-gray-800">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {block.secondarySubtitle ? <p className="ml-6 mt-2 text-xs text-gray-600">{block.secondarySubtitle}</p> : null}
                  {block.secondaryItems?.length ? (
                    <ul className="ml-4 mt-1 space-y-1.5 text-sm text-gray-800">
                      {block.secondaryItems.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gray-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {showInsights ? (
                  <div className="rounded-md border tomo-ai-border bg-white px-2.5 py-2 sm:w-60 sm:shrink-0">
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
  );
}

function BriefSectionIcon({ kind }: { kind: "followups" | "meetings" | "momentum" | "loops" }) {
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
  return (
    <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path fill="currentColor" d="M12 8.3a1 1 0 0 1 1 1V12h2.2a1 1 0 1 1 0 2H12a1 1 0 0 1-1-1V9.3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/** Strip day prefix from commitment datetime for Today “Coming up” second row (time + TZ only). */
function commitmentTimeOnly(datetime: string): string {
  return datetime
    .replace(/^(?:Today|Tomorrow)\s+/i, "")
    .replace(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/i, "")
    .trim();
}

function TodayGroup({
  title,
  items,
  onSelect,
  activeId,
  scrollable = false,
}: {
  title: string;
  items: {
    id: string;
    title: string;
    meta: string;
    type: "action" | "commitment" | "brief";
    extra?: string;
    pills: string[];
    workflowName?: string;
    attentionCard?: ActionAttentionCard;
    /** Prefix for row 3 (User Defined / Tomo draft); trigger follows from `meta`. */
    attentionRow3Prefix?: string;
    /** Today “Coming up” — same visual rhythm as attention cards (company : name, time row, peach pill). */
    comingUpCard?: { company: string; contactName: string; timeLabel: string };
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
        {items.map((item) => (
          <button
            key={item.id}
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
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]">
                    {item.attentionCard.verb}
                  </span>
                </div>
                <p className="mt-0.5 min-w-0 truncate text-xs leading-snug text-gray-600">
                  {item.attentionCard.workKind} : {item.attentionCard.workSubject}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--peach-ink)]">
                  {item.attentionRow3Prefix}
                  {item.meta}
                </p>
              </>
            ) : item.comingUpCard ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold accent-title">
                    {item.comingUpCard.company} : {item.comingUpCard.contactName}
                  </p>
                  {item.pills[0] ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]">
                      {item.pills[0]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 min-w-0 truncate text-xs leading-snug text-gray-600">{item.comingUpCard.timeLabel}</p>
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approval: "Needs approval",
    in_progress: "In progress",
    blocked: "Blocked",
  };
  const tone =
    status === "approval"
      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]"
      : status === "blocked"
      ? "bg-[color:var(--peach-soft)] text-[color:var(--peach-ink)]"
      : "bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{map[status] ?? status}</span>;
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

function ActionDetail({
  actionId,
  onToast,
  onComplete,
  detailsOnly = false,
}: {
  actionId: string;
  onToast: (message: string) => void;
  onComplete: () => void;
  detailsOnly?: boolean;
}) {
  const router = useRouter();
  const action = actions.find((a) => a.id === actionId);
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showInviteDraft, setShowInviteDraft] = useState(false);
  const [updateStatuses, setUpdateStatuses] = useState<Record<number, "accepted" | "rejected" | "pending">>({});
  if (!action) return <Placeholder title="No action selected" />;
  const isScheduling = action.type === "scheduling";
  const isCrmUpdate = action.type === "crm_update";
  const crmTitle = isCrmUpdate ? action.title.replace(/^Update CRM:\s*/i, "") : action.title;
  const suggestedRows = (action.suggestedUpdates ?? []).map((text) => {
    const [fieldRaw, updateRaw] = text.split(":").map((s) => s.trim());
    return {
      field: fieldRaw || "Update",
      current: "—",
      update: updateRaw || text,
      reason: action.trigger,
    };
  });
  const availability = [
    { day: "Mon", slots: ["10:00 AM", "2:00 PM"] },
    { day: "Tue", slots: ["9:30 AM", "3:00 PM"] },
    { day: "Wed", slots: ["11:00 AM", "4:30 PM"] },
    { day: "Thu", slots: ["10:30 AM", "1:30 PM"] },
    { day: "Fri", slots: ["9:00 AM", "2:30 PM"] },
  ];

  const resetLocalState = () => {
    setShowAvailability(false);
    setSelectedSlot(null);
    setShowInviteDraft(false);
    setUpdateStatuses({});
  };

  useEffect(() => {
    resetLocalState();
  }, [actionId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Action</p>
          <h3 className="text-lg font-semibold accent-title">{crmTitle}</h3>
          <p className="text-sm text-gray-600">Why: {action.trigger}</p>
        </div>
        <div className="flex items-center gap-2">
          {action.workflowPlaybookId ? (
            <button
              onClick={() => router.push(`/workflows?playbook=${action.workflowPlaybookId}`)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition tomo-ai-bg hover:bg-[#ff8b79]"
            >
              → workflow
            </button>
          ) : action.workflowTomoDefaultId ? (
            <button
              onClick={() => router.push(`/workflows?tomoDefault=${action.workflowTomoDefaultId}`)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition tomo-ai-bg hover:bg-[#ff8b79]"
            >
              → workflow
            </button>
          ) : null}
          <StatusPill status={action.status} />
        </div>
      </div>

      {detailsOnly ? null : action.draft ? (
        <div className="space-y-2 rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">Draft (review before send)</p>
              <TomoAiBadge label="Tomo draft" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                defaultChecked={action.autoApproveType}
                onChange={() => {
                  // mock-only preference toggle
                }}
              />
              Always auto-approve this type
            </label>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm tomo-ai-text whitespace-pre-line">{action.draft}</div>
        </div>
      ) : null}

      {detailsOnly ? null : action.suggestedUpdates?.length ? (
        isCrmUpdate ? (
          <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Proposed updates</p>
              <div className="flex items-center gap-2">
                <button
                  className="button-secondary"
                  onClick={() => {
                    const allAccepted = suggestedRows.reduce<Record<number, "accepted" | "rejected" | "pending">>(
                      (acc, _, idx) => {
                        acc[idx] = "accepted";
                        return acc;
                      },
                      {}
                    );
                    setUpdateStatuses(allAccepted);
                  }}
                >
                  Accept all
                </button>
                <TomoAiBadge label="Tomo suggestion" />
              </div>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-2">Field</th>
                    <th className="py-2 pr-2">Current</th>
                    <th className="py-2 pr-2">Update</th>
                    <th className="py-2 pr-2">Reason</th>
                    <th className="py-2">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suggestedRows.map((row, idx) => {
                    const status = updateStatuses[idx] ?? "pending";
                    return (
                      <tr key={`${row.field}-${idx}`} className="align-top">
                        <td className="py-2 pr-2 font-medium text-gray-900">{row.field}</td>
                        <td className="py-2 pr-2 text-gray-600">{row.current}</td>
                        <td className="py-2 pr-2 text-gray-800">{row.update}</td>
                        <td className="py-2 pr-2 text-gray-600">{row.reason}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <button
                              className={`rounded-full border px-2 py-1 text-[11px] ${
                                status === "accepted" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"
                              }`}
                              onClick={() => setUpdateStatuses((prev) => ({ ...prev, [idx]: "accepted" }))}
                            >
                              Accept
                            </button>
                            <button
                              className={`rounded-full border px-2 py-1 text-[11px] ${
                                status === "rejected" ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 text-gray-600"
                              }`}
                              onClick={() => setUpdateStatuses((prev) => ({ ...prev, [idx]: "rejected" }))}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="button-primary tomo-ai-bg"
                onClick={() => {
                  onToast("CRM updates applied.");
                  resetLocalState();
                  onComplete();
                }}
              >
                Apply updates
              </button>
              <button className="button-secondary" onClick={() => setUpdateStatuses({})}>
                Reset selections
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Proposed updates</p>
              <TomoAiBadge label="Tomo suggestion" />
            </div>
            <ul className="mt-1 space-y-1 tomo-ai-text">
              {action.suggestedUpdates.map((u) => (
                <li key={u} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      {detailsOnly ? null : (
      <div className="flex flex-wrap gap-2">
        {isScheduling ? (
          <button
            className="button-primary tomo-ai-bg"
            onClick={() => {
              setShowAvailability(true);
              onToast("Tomo is fetching availability…");
            }}
          >
            Schedule
          </button>
        ) : (
          <>
            <button
              className="button-primary tomo-ai-bg"
              onClick={() => {
                onToast("Outreach approved and queued to send.");
                resetLocalState();
                onComplete();
              }}
            >
              Approve &amp; Send
            </button>
            <button className="button-secondary">Edit</button>
            <button className="button-secondary">Snooze</button>
            <button className="text-sm text-gray-600 underline">Reject</button>
          </>
        )}
      </div>
      )}

      {detailsOnly ? null : isScheduling && showAvailability ? (
        <div className="space-y-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">Weekly availability</p>
            <span className="text-xs text-gray-500">Mock calendar</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availability.map((day) => (
              <div key={day.day} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                <p className="text-xs font-semibold text-gray-700">{day.day}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {day.slots.map((slot) => {
                    const slotKey = `${day.day} ${slot}`;
                    const isSelected = selectedSlot === slotKey;
                    return (
                      <button
                        key={slot}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          isSelected ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]" : "border-gray-200 text-gray-600"
                        }`}
                        onClick={() => {
                          setSelectedSlot(slotKey);
                          setShowInviteDraft(true);
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {showInviteDraft && selectedSlot ? (
            <div className="space-y-2 rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">Draft invitation</p>
                  <TomoAiBadge label="Tomo draft" />
                </div>
                <span className="text-xs text-gray-500">{selectedSlot}</span>
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm tomo-ai-text">
                Hi Jamie — Tomo found a 30m slot on {selectedSlot}. Want me to send the invite with a brief agenda and next steps?
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-primary tomo-ai-bg"
                  onClick={() => {
                    onToast("Invitation sent.");
                    resetLocalState();
                    onComplete();
                  }}
                >
                  Send invite
                </button>
                <button className="button-secondary">Edit</button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setShowInviteDraft(false);
                    setSelectedSlot(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {detailsOnly ? null : <SuggestedWorkflows />}

      {detailsOnly ? null : (
      <div className="space-y-1 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Activity log</p>
        {action.activityLog.slice(-5).map((log) => (
          <div key={log.id} className="flex items-center justify-between">
            <span>{log.ts}</span>
            <span className="text-gray-700">{log.summary}</span>
            <span className="text-gray-500">{log.actor}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function CommitmentDetail({
  commitment,
  brief,
  onOpenBrief,
  onCreateAction,
  detailsOnly = false,
}: {
  commitment: { id: string; title: string; datetime: string; lp: string; contactName: string } | undefined | null;
  brief: (typeof briefs)[number] | null | undefined;
  onOpenBrief: (briefId: string) => void;
  onCreateAction: () => void;
  detailsOnly?: boolean;
}) {
  if (!commitment) return <Placeholder title="No commitment selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Commitment</p>
          <h3 className="text-lg font-semibold accent-title">{commitment.title}</h3>
          <p className="text-sm text-gray-600">{commitment.datetime}</p>
          <p className="text-sm text-gray-600">
            {commitment.lp} · {commitment.contactName}
          </p>
        </div>
      </div>
      {detailsOnly ? null : (
        <>
          <div className="rounded-md border tomo-ai-border bg-gray-50 px-3 py-2 text-sm text-gray-800">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">Meeting prep</p>
              <TomoAiBadge label="Tomo insight" />
            </div>
            <p className="text-sm tomo-ai-text">Keep the next move tight and confirm owner.</p>
          </div>
          {brief ? <BriefDetail brief={brief} onCreateAction={onCreateAction} onOpenBrief={onOpenBrief} compact /> : null}
          <SuggestedWorkflows />
        </>
      )}
    </div>
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
