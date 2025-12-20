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

type TodaySelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | null;

export default function HomePage() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const [selection, setSelection] = useState<TodaySelection>(() => {
    if (actions.length) return { type: "action", id: actions[0].id };
    if (commitments.length) return { type: "commitment", id: commitments[0].id };
    if (briefs.length) return { type: "brief", id: briefs[0].id };
    return null;
  });

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

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Today</p>
            <h2 className="text-lg font-semibold accent-title">Stay focused, not flooded</h2>
          </div>
          <img src="/tomo-logo.png" alt="Tomo logo" className="h-8 w-8 rounded" />
        </div>
        <p className="mt-2 text-xs text-gray-600">Calm view of what to move now; no dashboards or charts.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <TodayGroup
          title="What needs your attention"
          hint="Approvals and urgent sends to move now"
          items={actions.slice(0, 5).map((a) => ({
            id: a.id,
            title: a.title,
            meta: a.trigger,
            type: "action" as const,
            status: a.status,
          }))}
          activeId={selection?.type === "action" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "action", id })}
        />

        <MomentumShiftsSection
          shifts={momentumShifts}
          onNavigate={(band) => router.push(`/momentum?band=${encodeURIComponent(band)}`)}
        />

        <TodayGroup
          title="Coming up"
          hint="Next commitments and prep steps"
          items={commitments.map((c) => ({
            id: c.id,
            title: c.title,
            meta: `${c.datetime} • ${c.lp}`,
            type: "commitment" as const,
          }))}
          activeId={selection?.type === "commitment" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "commitment", id })}
        />

        <TodayGroup
          title="Briefs Ready"
          hint="Only briefs tied to upcoming commitments"
          items={briefs.map((b) => ({
            id: b.id,
            title: b.meetingTitle,
            meta: `${b.datetime} • ${b.lp} • ${b.status}`,
            type: "brief" as const,
          }))}
          activeId={selection?.type === "brief" ? selection.id : undefined}
          onSelect={(id) => setSelection({ type: "brief", id })}
        />
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-y-auto p-4">
      {!selection ? (
        <Placeholder title="Pick an action, commitment, or brief to move now." />
      ) : selection.type === "action" ? (
        <ActionDetail actionId={selection.id} />
      ) : selection.type === "commitment" ? (
        <CommitmentDetail commitment={selectedCommitment} briefId={selectedCommitment?.briefId} onOpenBrief={(briefId) => router.push(`/materials?tab=briefs&brief=${briefId}`)} />
      ) : (
        <BriefDetail brief={selectedBrief} onCreateAction={() => router.push("/tasks")} />
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="home"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={selectedTitle}
      assistantChips={["Explain why urgent", "Draft follow-up", "Propose times", "Create action"]}
    />
  );
}

function TodayGroup({
  title,
  hint,
  items,
  onSelect,
  activeId,
}: {
  title: string;
  hint: string;
  items: { id: string; title: string; meta: string; type: "action" | "commitment" | "brief"; status?: string }[];
  onSelect: (id: string) => void;
  activeId?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold accent-title">{title}</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === item.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">{item.meta}</p>
              </div>
              {item.status ? <StatusPill status={item.status} /> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MomentumShiftsSection({ shifts, onNavigate }: { shifts: MomentumShift[]; onNavigate: (bandParam: string) => void }) {
  const items = useMemo(() => {
    const order: MomentumShift["band"][] = ["Stalled", "Heating", "Cooling", "Stable"];
    const bandParamMap: Record<MomentumShift["band"], string> = {
      Heating: "Heating",
      Cooling: "Cooling",
      Stalled: "Stalled",
      Stable: "Active-Stable",
    };

    return order
      .map((band) => shifts.find((shift) => shift.band === band))
      .filter((shift): shift is MomentumShift => Boolean(shift))
      .filter((shift) => shift.delta >= 2 || (shift.delta === 1 && shift.band === "Stalled"))
      .slice(0, 4)
      .map((shift) => ({
        band: shift.band,
        bandParam: bandParamMap[shift.band],
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
      <div className="space-y-0.5">
        <p className="text-sm font-semibold accent-title">Momentum shifts</p>
        <p className="text-xs text-gray-500">What changed since yesterday</p>
      </div>

      <div className="mt-2 space-y-1">
        {items.length ? (
          items.map((item) => (
            <button
              key={item.band}
              onClick={() => onNavigate(item.bandParam)}
              className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-gray-900 transition hover:bg-white"
            >
              {item.label}
            </button>
          ))
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
  briefId,
  onOpenBrief,
}: {
  commitment: { id: string; title: string; datetime: string; lp: string } | undefined | null;
  briefId?: string;
  onOpenBrief: (briefId: string) => void;
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
        <p className="text-sm text-gray-700">Use the brief to prep; focus on next move and commitments.</p>
      </div>
      {briefId ? (
        <button className="button-primary" onClick={() => onOpenBrief(briefId)}>
          Open brief in Materials → Briefs
        </button>
      ) : null}
    </div>
  );
}

function BriefDetail({ brief, onCreateAction }: { brief: (typeof briefs)[number] | null | undefined; onCreateAction: () => void }) {
  if (!brief) return <Placeholder title="No brief selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Brief</p>
          <h3 className="text-lg font-semibold accent-title">{brief.meetingTitle}</h3>
          <p className="text-sm text-gray-600">{brief.datetime} • {brief.lp}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{brief.status}</span>
      </div>
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
        <p className="font-medium text-gray-900">Summary</p>
        <p className="text-sm text-gray-700">{brief.summary}</p>
      </div>
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
      <div className="flex flex-wrap gap-2">
        <button className="button-primary" onClick={onCreateAction}>Create follow-up action</button>
        <button className="button-secondary" onClick={onCreateAction}>Draft email</button>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}
