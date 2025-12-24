"use client";

/**
 * TODAY page (/home) — “What should I do right now?”
 * - Keep the focus narrow; no firehose
 * - Cross-link to Materials/Briefs for prep and Actions for execution
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MomentumShift, actions, briefs, commitments, momentumShifts } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";

type TodaySelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | { type: "shift"; band: MomentumShift["band"] }
  | null;

export default function HomePage() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const { activeFundId } = useFunds();
  const [selection, setSelection] = useState<TodaySelection>(null);

  const selectedTitle = useMemo(() => {
    if (!selection) return undefined;
    if (selection.type === "action") return actions.find((a) => a.id === selection.id)?.title;
    if (selection.type === "commitment") return commitments.find((c) => c.id === selection.id)?.title;
    if (selection.type === "brief") return briefs.find((b) => b.id === selection.id)?.meetingTitle;
    if (selection.type === "shift") return `Momentum shift: ${selection.band}`;
  }, [selection]);

  // Helper lookups
  const selectedAction = selection?.type === "action" ? actions.find((a) => a.id === selection.id) : null;
  const selectedCommitment = selection?.type === "commitment" ? commitments.find((c) => c.id === selection.id) : null;
  const selectedBrief = selection?.type === "brief" ? briefs.find((b) => b.id === selection.id) : null;
  const selectedShift = selection?.type === "shift" ? momentumShifts.find((s) => s.band === selection.band) : null;

  const filteredActions = useMemo(() => {
    if (activeFundId === "all") return actions;
    return actions.filter((_, idx) => idx % 2 === 0); // stub: pretend alternate items match the selected fund
  }, [activeFundId]);

  const filteredCommitments = useMemo(() => {
    if (activeFundId === "all") return commitments;
    return commitments.filter((_, idx) => idx % 2 === 1);
  }, [activeFundId]);

  const filteredBriefs = useMemo(() => {
    if (activeFundId === "all") return briefs;
    return briefs.filter((_, idx) => idx % 2 === 0);
  }, [activeFundId]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold accent-title">Today</p>
          <img src="/tomo-logo.png" alt="Tomo logo" className="h-8 w-8 rounded" />
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
          }))}
          activeId={selection?.type === "action" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "action", id })}
          dense={!selection}
        />

        <MomentumShiftsSection
          shifts={momentumShifts}
          onSelect={(band) => setSelection({ type: "shift", band })}
          activeBand={selection?.type === "shift" ? selection.band : undefined}
        />

        <TodayGroup
          title="Coming up"
          items={filteredCommitments.map((c) => ({
            id: c.id,
            title: c.title,
            meta: `${c.datetime} • ${c.lp}`,
            extra: c.window === "today" ? "Happening today" : "Within 72h",
            type: "commitment" as const,
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
        <ActionDetail actionId={selection.id} />
      ) : selection.type === "commitment" ? (
        <CommitmentDetail
          commitment={selectedCommitment}
          brief={selectedCommitment?.briefId ? filteredBriefs.find((b) => b.id === selectedCommitment.briefId) : null}
          onOpenBrief={(briefId) => router.push(`/materials?tab=briefs&brief=${briefId}`)}
          onCreateAction={() => router.push("/activity")}
        />
      ) : (
        selection.type === "brief" ? (
          <BriefDetail brief={selectedBrief} onCreateAction={() => router.push("/activity")} />
        ) : (
          <ShiftDetail shift={selectedShift} onViewMomentum={(bandParam) => router.push(`/momentum?focus=${encodeURIComponent(bandParam)}`)} />
        )
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="home"
      listContent={listContent}
      detailContent={detailContent}
      detailVisible={Boolean(selection)}
      contextTitle={selectedTitle}
      assistantChips={["Explain why urgent", "Draft follow-up", "Propose times", "Create action"]}
    />
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
  items: { id: string; title: string; meta: string; type: "action" | "commitment" | "brief"; status?: string; extra?: string }[];
  onSelect: (id: string) => void;
  activeId?: string;
  dense?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[color:var(--accent-ink)]">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === item.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.meta}</p>
                {!dense && item.extra ? <p className="text-[11px] text-gray-500">{item.extra}</p> : null}
              </div>
              {item.status ? <StatusPill status={item.status} /> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MomentumShiftsSection({ shifts, onSelect, activeBand }: { shifts: MomentumShift[]; onSelect: (bandParam: MomentumShift["band"]) => void; activeBand?: MomentumShift["band"] }) {
  const items = useMemo(() => {
    const order: MomentumShift["band"][] = ["Stalled", "Heating", "Cooling", "Stable"];
    return order
      .map((band) => shifts.find((shift) => shift.band === band))
      .filter((shift): shift is MomentumShift => Boolean(shift))
      .filter((shift) => shift.delta >= 2 || (shift.delta === 1 && shift.band === "Stalled"))
      .slice(0, 4)
      .map((shift) => ({
        band: shift.band,
        label:
          shift.band === "Heating"
            ? `↑ ${shift.delta} heating up`
            : shift.band === "Cooling"
            ? `↓ ${shift.delta} cooling`
            : shift.band === "Stalled"
            ? `⚠ ${shift.delta} stalled`
            : `↔ ${shift.delta} stable`,
      }));
  }, [shifts]);

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-3">
      <p className="text-sm font-semibold accent-title">Momentum shifts</p>

      <div className="mt-2 space-y-1">
        {items.length ? (
          items.map((item) => {
            const isStalled = item.band === "Stalled";
            return (
              <button
                key={item.band}
                onClick={() => onSelect(item.band)}
                className={`w-full rounded-md px-2 py-2 text-left text-sm font-medium transition hover:bg-white ${
                  isStalled ? "peach-text" : "text-gray-900"
                } ${activeBand === item.band ? "border border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : ""}`}
              >
                {item.label}
              </button>
            );
          })
        ) : (
          <p className="text-xs text-gray-600">No meaningful changes since yesterday.</p>
        )}
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
  return <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">{map[status] ?? status}</span>;
}

function ActionDetail({ actionId }: { actionId: string }) {
  const action = actions.find((a) => a.id === actionId);
  if (!action) return <Placeholder title="No action selected" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Action</p>
          <h3 className="text-lg font-semibold accent-title">{action.title}</h3>
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
        <div className="space-y-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">Draft (review before send)</p>
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
          <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-line">{action.draft}</div>
        </div>
      ) : null}

      {action.suggestedUpdates?.length ? (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
          <p className="font-medium text-gray-900">Proposed updates</p>
          <ul className="mt-1 space-y-1">
            {action.suggestedUpdates.map((u) => (
              <li key={u} className="flex items-start gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="button-primary">Approve &amp; Send</button>
        <button className="button-secondary">Edit</button>
        <button className="button-secondary">Snooze</button>
        <button className="text-sm text-gray-600 underline">Reject</button>
      </div>

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
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
        <p className="font-medium text-gray-900">Meeting prep</p>
        <p className="text-sm text-gray-700">Keep the next move tight and confirm owner.</p>
      </div>
      {brief ? <BriefDetail brief={brief} onCreateAction={onCreateAction} onOpenBrief={onOpenBrief} compact /> : null}
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
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
        <p className="font-medium text-gray-900">Summary</p>
        <p className="text-sm text-gray-700">{brief.summary}</p>
      </div>
      {!compact ? (
        <>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="font-medium text-gray-900">Agenda</p>
            <ul className="mt-1 space-y-1">
              {brief.agenda.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="font-medium text-gray-900">Commitments</p>
            <ul className="mt-1 space-y-1">
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

function ShiftDetail({ shift, onViewMomentum }: { shift: MomentumShift | undefined | null; onViewMomentum: (bandParam: string) => void }) {
  if (!shift) return <Placeholder title="No shift selected" />;
  const bandParamMap: Record<MomentumShift["band"], string> = {
    Heating: "Heating",
    Cooling: "Cooling",
    Stalled: "Stalled",
    Stable: "Active-Stable",
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Momentum shift</p>
          <h3 className="text-lg font-semibold accent-title">{shift.band}</h3>
          <p className="text-sm text-gray-700">{shift.delta} moved since yesterday</p>
        </div>
      </div>
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
        <p className="font-medium text-gray-900">What to watch</p>
        <p className="mt-1 text-sm text-gray-700">
          Focus on relationships driving this move. Pull up the Momentum view to see the breakdown and act from there.
        </p>
      </div>
      <button className="button-primary" onClick={() => onViewMomentum(bandParamMap[shift.band])}>
        View in Momentum
      </button>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}
