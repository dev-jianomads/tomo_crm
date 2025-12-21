"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { actions, ActionItem } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

type ActionGroupKey = "approval" | "in_progress" | "blocked";

export default function ActionsPage() {
  const { ready } = useRequireSession();
  const [activeId, setActiveId] = useState<string | null>(() => actions[0]?.id ?? null);

  const groups = useMemo(() => {
    const map: Record<ActionGroupKey, ActionItem[]> = { approval: [], in_progress: [], blocked: [] };
    actions.forEach((a) => map[a.status].push(a));
    return map;
  }, []);

  const active = actions.find((a) => a.id === activeId) ?? null;

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Actions</p>
        <p className="text-sm text-gray-600">Ready to execute</p>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <ActionGroup
          title="Needs your sign-off"
          items={groups.approval}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <ActionGroup
          title="In motion"
          items={groups.in_progress}
          activeId={activeId}
          onSelect={setActiveId}
        />
        {groups.blocked.length ? (
          <ActionGroup
            title="Needs intervention"
            items={groups.blocked}
            activeId={activeId}
            onSelect={setActiveId}
          />
        ) : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!active ? <Placeholder title="Select an action to move forward." /> : <ActionDetail action={active} />}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="tasks"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active?.title}
      assistantChips={["Explain why this surfaced", "What should happen next", "Draft outreach", "Create follow-up action"]}
    />
  );
}

function ActionGroup({
  title,
  items,
  activeId,
  onSelect,
}: {
  title: string;
  items: ActionItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold accent-title">{title}</p>
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
                <p className="text-xs text-gray-600">{item.evidence.slice(0, 3).join(" · ") || item.trigger}</p>
              </div>
              <StatusPill status={item.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ActionGroupKey }) {
  const map: Record<ActionGroupKey, string> = {
    approval: "Needs sign-off",
    in_progress: "In motion",
    blocked: "Needs intervention",
  };
  const isPeach = status === "blocked";
  return <span className={isPeach ? "peach-chip" : "accent-chip"}>{map[status]}</span>;
}

function ActionDetail({ action }: { action: ActionItem }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Action</p>
          <h2 className="text-lg font-semibold accent-title">{action.title}</h2>
        </div>
        <StatusPill status={action.status} />
      </div>

      <DisclosureCard title="Evidence" defaultOpen>
        <ul className="space-y-1 text-sm text-gray-800">
          {action.evidence.slice(0, 3).map((e) => (
            <li key={e} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </DisclosureCard>

      <DraftSection draft={action.draft} autoApprove={action.autoApproveType} />

      {action.suggestedUpdates?.length ? (
        <DisclosureCard title="Proposed CRM updates" defaultOpen={false}>
          <ul className="space-y-1 text-sm text-gray-800">
            {action.suggestedUpdates.map((u) => (
              <li key={u} className="flex items-start gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </DisclosureCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="button-primary">Approve and send</button>
        <button className="button-secondary">Edit</button>
        <button className="button-secondary">Snooze</button>
        <button className="text-sm text-gray-600 underline">Reject</button>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" defaultChecked={action.autoApproveType} />
        Always auto-approve this type
      </label>

      <DisclosureCard title="Audit trail" defaultOpen={false}>
        <div className="space-y-1 text-xs text-gray-700">
          {action.activityLog.slice(-5).map((log) => (
            <div key={log.id} className="flex items-center justify-between">
              <span>{log.ts}</span>
              <span className="text-gray-800">{log.summary}</span>
              <span className="text-gray-500">{log.actor}</span>
            </div>
          ))}
        </div>
      </DisclosureCard>

      <DisclosureCard title="TOMO" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          <button className="button-secondary">Explain why this surfaced</button>
          <button className="button-secondary">What should happen next</button>
          <button className="button-secondary">Draft outreach</button>
          <button className="button-secondary">Create follow-up action</button>
        </div>
      </DisclosureCard>
    </div>
  );
}

function DraftSection({ draft, autoApprove }: { draft?: string; autoApprove?: boolean }) {
  const [open, setOpen] = useState(false);
  const firstLine = draft ? draft.split("\n")[0] : "";
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-900" onClick={() => setOpen((v) => !v)}>
        <span>Draft</span>
        <span className="text-xs text-gray-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-3 py-2 space-y-2">
          {draft ? <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-line">{draft}</div> : <p className="text-sm text-gray-700">No draft available.</p>}
        </div>
      ) : (
        <div className="border-t border-gray-100 px-3 py-2 text-sm text-gray-700">{firstLine || "No draft available."}</div>
      )}
    </div>
  );
}

function DisclosureCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-900" onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <span className="text-xs text-gray-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="border-t border-gray-100 px-3 py-2">{children}</div> : null}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

