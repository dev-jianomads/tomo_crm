"use client";

/**
 * TODAY page (/home) — “What should I do right now?”
 * - Keep the focus narrow; no firehose
 * - Cross-link to Materials/Briefs for prep and Actions for execution
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TomoAiBadge } from "@/components/tomo-ai-badge";
import { actions, briefs, commitments } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";

type TodaySelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | null;

export default function HomePage() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const { activeFundId } = useFunds();
  const [selection, setSelection] = useState<TodaySelection>(null);
  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const closeDailyBrief = useCallback(() => setShowDailyBrief(false), []);

  const addToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const completeAndReset = () => {
    setSelection(null);
    router.replace("/home");
  };

  const selectedTitle = useMemo(() => {
    if (!selection) return undefined;
    if (selection.type === "action") return actions.find((a) => a.id === selection.id)?.title;
    if (selection.type === "commitment") return commitments.find((c) => c.id === selection.id)?.title;
    if (selection.type === "brief") return briefs.find((b) => b.id === selection.id)?.meetingTitle;
  }, [selection]);

  // Helper lookups
  const selectedAction = selection?.type === "action" ? actions.find((a) => a.id === selection.id) : null;
  const selectedCommitment = selection?.type === "commitment" ? commitments.find((c) => c.id === selection.id) : null;
  const selectedBrief = selection?.type === "brief" ? briefs.find((b) => b.id === selection.id) : null;

  const filteredActions = useMemo(() => {
    if (activeFundId === "all") return actions;
    return actions.filter((_, idx) => idx % 2 === 0); // stub: pretend alternate items match the selected fund
  }, [activeFundId]);

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

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold accent-title">Today</p>
          <div className="flex items-center gap-2">
            <button className="button-secondary" onClick={() => setShowDailyBrief(true)}>
              Daily Brief
            </button>
            <img src="/tomo-logo.png" alt="Tomo logo" className="h-8 w-8 rounded" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <TodayGroup
          title="What needs your attention"
          items={filteredActions.slice(0, 6).map((a, idx) => ({
            id: a.id,
            title: a.title,
            meta: a.trigger,
            extra: idx % 2 === 0 ? "Due today • draft ready" : "Fresh evidence added",
            type: "action" as const,
            status: a.status,
            date: idx % 2 === 0 ? "Updated yesterday" : "As of today",
          }))}
          activeId={selection?.type === "action" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "action", id })}
          dense={!selection}
        />

        <TodayGroup
          title="Coming up"
          items={sortedCommitments.map((c) => ({
            id: c.id,
            title: c.title,
            meta: `${c.datetime} • ${c.lp}`,
            extra: c.window === "today" ? "Happening today" : "Within 72h",
            type: "commitment" as const,
            date: c.datetime,
          }))}
          activeId={selection?.type === "commitment" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "commitment", id })}
          dense={!selection}
        />
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-y-auto p-4">
      {!selection ? (
        <Placeholder title="Select an item to open details." />
      ) : selection.type === "action" ? (
        <ActionDetail actionId={selection.id} onToast={addToast} onComplete={completeAndReset} />
      ) : selection.type === "commitment" ? (
        <CommitmentDetail
          commitment={selectedCommitment}
          brief={selectedCommitment?.briefId ? filteredBriefs.find((b) => b.id === selectedCommitment.briefId) : null}
          onOpenBrief={(briefId) => router.push(`/materials?tab=briefs&brief=${briefId}`)}
          onCreateAction={() => router.push("/activity")}
        />
      ) : selection.type === "brief" ? (
        <BriefDetail brief={selectedBrief} onCreateAction={() => router.push("/activity")} />
      ) : null}
    </div>
  );

  if (!ready) return null;

  return (
    <>
      <AppShell
        section="home"
        listContent={listContent}
        detailContent={detailContent}
        detailVisible={Boolean(selection)}
        contextTitle={selectedTitle}
        assistantChips={["Explain why urgent", "Draft follow-up", "Propose times", "Create action"]}
      />
      <DailyBriefDialog open={showDailyBrief} onClose={closeDailyBrief} blocks={dailyBriefBlocks} />
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
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Today</p>
            <h2 className="text-lg font-semibold accent-title">Daily Brief</h2>
            <p className="text-sm text-gray-600">A focused read on where attention should go right now.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            aria-label="Close Daily Brief"
          >
            X
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {blocks.map((block) => (
            <section key={block.title} className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
              <div className="flex items-start gap-2">
                <BriefSectionIcon kind={block.icon} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{block.title}</p>
                  <p className="text-xs text-gray-600">{block.subtitle}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="min-w-0 flex-1">
                  <ul className="ml-4 space-y-1.5 text-sm text-gray-800">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {block.secondarySubtitle ? <p className="mt-2 text-sm text-gray-700">{block.secondarySubtitle}</p> : null}
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

                <div className="rounded-md border tomo-ai-border bg-white px-2.5 py-2 sm:w-60 sm:shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold accent-title">Tomo insight</p>
                    <TomoAiBadge label="Tomo insight" />
                  </div>
                  <p className="mt-1 text-xs tomo-ai-text">{block.insight}</p>
                </div>
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
      <path fill="currentColor" d="M7 5h7l3 3v11H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm6 .8V9h3.2L13 5.8Zm-3 6.7h4.5V14H10v-1.5Zm0 3h4.5V17H10v-1.5Z" />
      <path fill="currentColor" d="M9.2 9.5 6 12.7 7.1 13.8l2.1-2.1L10.9 13l1.1-1.1-2.8-2.4Z" />
    </svg>
  );
}

function TodayGroup({
  title,
  items,
  onSelect,
  activeId,
  dense = false,
}: {
  title: string;
  items: { id: string; title: string; meta: string; type: "action" | "commitment" | "brief"; status?: string; extra?: string; date?: string }[];
  onSelect: (id: string) => void;
  activeId?: string;
  dense?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold accent-title">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === item.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.meta}</p>
                {!dense && item.extra ? <p className="text-[11px] text-gray-500">{item.extra}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.status ? <StatusPill status={item.status} /> : null}
                {item.date ? <span className="text-[11px] text-gray-500">{item.date}</span> : null}
              </div>
            </div>
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

function ActionDetail({
  actionId,
  onToast,
  onComplete,
}: {
  actionId: string;
  onToast: (message: string) => void;
  onComplete: () => void;
}) {
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
        <StatusPill status={action.status} />
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
        <p className="font-medium text-gray-900">Evidence</p>
        <ul className="mt-1 space-y-1">
          {action.evidence.map((e) => (
            <li key={e} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>

      {action.draft ? (
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

      {action.suggestedUpdates?.length ? (
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

      {isScheduling && showAvailability ? (
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
    </div>
  );
}

function CommitmentDetail({
  commitment,
  brief,
  onOpenBrief,
  onCreateAction,
}: {
  commitment: { id: string; title: string; datetime: string; lp: string } | undefined | null;
  brief: (typeof briefs)[number] | null | undefined;
  onOpenBrief: (briefId: string) => void;
  onCreateAction: () => void;
}) {
  if (!commitment) return <Placeholder title="No commitment selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Commitment</p>
          <h3 className="text-lg font-semibold accent-title">{commitment.title}</h3>
          <p className="text-sm text-gray-600">{commitment.datetime}</p>
          <p className="text-sm text-gray-600">{commitment.lp}</p>
        </div>
      </div>
      <div className="rounded-md border tomo-ai-border bg-gray-50 px-3 py-2 text-sm text-gray-800">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">Meeting prep</p>
          <TomoAiBadge label="Tomo insight" />
        </div>
        <p className="text-sm tomo-ai-text">Keep the next move tight and confirm owner.</p>
      </div>
      {brief ? <BriefDetail brief={brief} onCreateAction={onCreateAction} onOpenBrief={onOpenBrief} compact /> : null}
      <MockActivityBox />
    </div>
  );
}

function BriefDetail({
  brief,
  onCreateAction,
  onOpenBrief,
  compact = false,
}: {
  brief: (typeof briefs)[number] | null | undefined;
  onCreateAction: () => void;
  onOpenBrief?: (id: string) => void;
  compact?: boolean;
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
