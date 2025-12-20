"use client";

/**
 * MATERIALS page (/materials) — outbound content + briefs merged
 * Tabs: Outbound (default) | Briefs
 * - Outbound: engagement + momentum impact + follow-up signals
 * - Briefs: meeting prep memos; CTA to create follow-up actions
 */

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { materials, briefs, Material, Brief } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

type Tab = "outbound" | "briefs";
type Selection = { type: "material"; id: string } | { type: "brief"; id: string } | null;

export default function MaterialsPage() {
  const { ready } = useRequireSession();
  const [tab, setTab] = useState<Tab>("outbound");
  const [selection, setSelection] = useState<Selection>(() => (materials[0] ? { type: "material", id: materials[0].id } : null));

  const activeMaterial = selection?.type === "material" ? materials.find((m) => m.id === selection.id) ?? null : null;
  const activeBrief = selection?.type === "brief" ? briefs.find((b) => b.id === selection.id) ?? null : null;

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Materials</p>
            <p className="text-sm text-gray-600">Outbound + briefs in one place.</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <TabButton label="Outbound" active={tab === "outbound"} onClick={() => setTab("outbound")} />
          <TabButton label="Briefs" active={tab === "briefs"} onClick={() => setTab("briefs")} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {tab === "outbound"
          ? materials.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelection({ type: "material", id: m.id })}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selection?.type === "material" && selection.id === m.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-600">{m.type} • {m.version} • {m.date}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">{m.engagement}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Momentum: {m.momentumImpact === "up" ? "↑" : m.momentumImpact === "down" ? "↓" : "→"}</span>
                  <span>{m.followUpSignal}</span>
                </div>
              </button>
            ))
          : briefs.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelection({ type: "brief", id: b.id })}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selection?.type === "brief" && selection.id === b.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.meetingTitle}</p>
                    <p className="text-xs text-gray-600">{b.datetime} • {b.lp}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">{b.status}</span>
                </div>
                <p className="text-xs text-gray-600">{b.openLoops} open loops</p>
              </button>
            ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {tab === "outbound" ? (
        activeMaterial ? <MaterialDetail material={activeMaterial} /> : <Placeholder title="Select a material" />
      ) : activeBrief ? (
        <BriefDetail brief={activeBrief} />
      ) : (
        <Placeholder title="Select a brief" />
      )}
    </div>
  );

  if (!ready) return null;

  const contextTitle = tab === "outbound" ? activeMaterial?.name : activeBrief?.meetingTitle;

  return (
    <AppShell
      section="materials"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={contextTitle}
      assistantChips={
        tab === "outbound"
          ? ["Draft investor letter", "Segment variants", "Draft follow-ups", "Create action"]
          : ["Generate talking points", "Draft follow-up", "Summarize prior thread", "Suggest next step"]
      }
    />
  );
}

function MaterialDetail({ material }: { material: Material }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Material</p>
          <h3 className="text-lg font-semibold text-gray-900">{material.name}</h3>
          <p className="text-sm text-gray-600">{material.type} • {material.version} • {material.date}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{material.engagement}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Active materials" value="12" />
        <Tile label="Engagement rate" value="48% meaningful" />
        <Tile label="Momentum impact" value={material.momentumImpact === "up" ? "↑ Positive" : material.momentumImpact === "down" ? "↓ Negative" : "→ Neutral"} />
        <Tile label="Follow-up opps" value="7 flagged" />
      </div>

      <Disclosure title="Engagement breakdown">
        <p className="text-sm text-gray-700">Grouped views by LP segment; keep lean in mock.</p>
      </Disclosure>

      <Disclosure title="Momentum attribution">
        <p className="text-sm text-gray-700">LPs ↑/→/↓ from this material. Placeholder only.</p>
      </Disclosure>

      <Disclosure title="Follow-up recommendations" defaultOpen>
        <ul className="space-y-1 text-sm text-gray-800">
          <li>High openers: send concise follow-up</li>
          <li>No reply after opens: create action in Actions</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="button-primary">Create action</button>
          <button className="button-secondary">Draft follow-up</button>
        </div>
      </Disclosure>
    </div>
  );
}

function BriefDetail({ brief }: { brief: Brief }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Brief</p>
          <h3 className="text-lg font-semibold text-gray-900">{brief.meetingTitle}</h3>
          <p className="text-sm text-gray-600">{brief.datetime} • {brief.lp}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{brief.status}</span>
      </div>

      <Disclosure title="Summary" defaultOpen>
        <p className="text-sm text-gray-700">{brief.summary}</p>
      </Disclosure>

      <Disclosure title="Agenda" defaultOpen>
        <ul className="space-y-1 text-sm text-gray-800">
          {brief.agenda.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title="Commitments" defaultOpen>
        <ul className="space-y-1 text-sm text-gray-800">
          {brief.commitments.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Disclosure>

      <div className="flex flex-wrap gap-2">
        <button className="button-primary">Create follow-up action</button>
        <button className="button-secondary">Draft email</button>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
        active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
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



