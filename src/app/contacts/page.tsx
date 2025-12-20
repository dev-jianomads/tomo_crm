"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { activityLog, relationships, Relationship } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

export default function RelationshipsPage() {
  const { ready } = useRequireSession();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(() => relationships[0]?.id ?? null);

const filtered = relationships.filter((rel) => rel.name.toLowerCase().includes(query.toLowerCase()) || rel.firm.toLowerCase().includes(query.toLowerCase()));
  const active = useMemo(() => relationships.find((r) => r.id === activeId) ?? null, [activeId]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Relationships</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search relationships"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filtered.map((rel) => (
          <button
            key={rel.id}
            onClick={() => setActiveId(rel.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === rel.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{rel.name}</p>
                <p className="text-xs text-gray-600">{rel.firm}</p>
              </div>
              <div className="flex items-center gap-2">
                <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} />
                {rel.openLoops ? <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">{rel.openLoops} loops</span> : null}
              </div>
            </div>
            <p className="text-xs text-gray-600">Last: {rel.lastInteraction}</p>
            <p className="text-xs text-gray-600">Next move: {rel.nextMove}</p>
          </button>
        ))}
        {!filtered.length ? <Placeholder title="No relationships match." /> : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!active ? (
        <Placeholder title="Select a relationship to view the brief." />
      ) : (
        <RelationshipDetail relationship={active} />
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="contacts"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active?.name}
      assistantChips={["Summarize last thread", "Draft outreach", "Propose next step", "Create action"]}
    />
  );
}

function RelationshipDetail({ relationship }: { relationship: Relationship }) {
  const router = useRouter();

  const snapshot = useMemo(() => {
    const direction = relationship.momentumTrend === "up" ? "Momentum is heating up" : relationship.momentumTrend === "down" ? "Momentum is cooling" : "Momentum is steady";
    const pace = `Pace feels ${relationship.velocity.toLowerCase()}.`;
    const next = relationship.nextMove ? `Next to watch: ${relationship.nextMove}.` : "";
    return `${direction}. ${pace} ${next}`.trim();
  }, [relationship]);

  const stallRisk = relationship.band === "Stalled" || relationship.momentumTrend === "down" ? "High" : relationship.momentumTrend === "flat" ? "Medium" : "Low";
  const openLoopItems = [
    "Confirm timing for the next allocation step",
    "Close the loop on the latest performance send",
    "Re-affirm interest level before quarter-end",
  ].slice(0, 3);

  const keyChanges = [
    "Momentum softened after no reply to last update.",
    "Recent deck opens suggest renewed interest.",
    "Meeting request sent; awaiting confirmation.",
  ];

  const keyInteractions = [
    "Call last week on Q4 performance; asked for pipeline clarity.",
    "Deck opened multiple times over the weekend.",
    "Short reply promising a follow-up date.",
  ];

  const materialsEngagement = "Mixed engagement; recent deck opens nudged momentum slightly up.";

  const recent = activityLog.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Relationship</p>
          <h2 className="text-lg font-semibold text-gray-900">{relationship.name}</h2>
          <p className="text-sm text-gray-600">{relationship.firm}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MomentumChip score={relationship.momentumScore} trend={relationship.momentumTrend} />
          <span className="text-xs text-gray-600">{relationship.band}</span>
        </div>
      </div>

      {/* Section 1 — Current Snapshot */}
      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold text-gray-900">Current snapshot</p>
        <p className="mt-1 text-sm text-gray-800">{snapshot}</p>
      </section>

      {/* Section 2 — Relationship Status */}
      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold text-gray-900">Relationship status</p>
        <div className="mt-2 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
          <StatusField label="Momentum" value={`${relationship.momentumScore} ${relationship.momentumTrend === "up" ? "↑" : relationship.momentumTrend === "down" ? "↓" : "→"}`} />
          <StatusField label="Pace" value={relationship.velocity} />
          <StatusField label="Stall risk" value={stallRisk} />
          <StatusField label="Next move" value={relationship.nextMove} />
        </div>
        <p className="mt-2 text-xs text-gray-500">Updated from recent emails, meetings, and shared materials.</p>
      </section>

      {/* Section 3 — Open Loops */}
      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Open Loops</p>
            <p className="text-xs text-gray-600">Unresolved items that could slow momentum.</p>
          </div>
          <button className="text-xs text-blue-700 hover:underline" onClick={() => router.push("/tasks")}>
            Create action
          </button>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-gray-800">
          {openLoopItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 4 — Key Changes Over Time */}
      <Accordion title="KEY CHANGES OVER TIME" hint="Key moments that changed direction">
        <ul className="space-y-1 text-sm text-gray-800">
          {keyChanges.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-amber-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Accordion>

      {/* Section 5 — Key Interactions */}
      <Accordion title="KEY INTERACTIONS" hint="Meaningful meetings, replies, or materials">
        <ul className="space-y-1 text-sm text-gray-800">
          {keyInteractions.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-green-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Accordion>

      {/* Section 6 — Engagement with Materials */}
      <Accordion title="Engagement with Materials" hint="Directional view; no per-LP analytics">
        <div className="text-sm text-gray-800">{materialsEngagement}</div>
        <button className="mt-2 text-sm text-blue-700 hover:underline" onClick={() => router.push(`/materials?lp=${encodeURIComponent(relationship.name)}`)}>
          View details
        </button>
      </Accordion>

      {/* Section 7 — Recent Activity */}
      <Accordion title="Recent activity" hint="Last 5 system-recorded actions">
        <ul className="space-y-1 text-sm text-gray-800">
          {recent.map((log) => (
            <li key={log.id} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-gray-400" />
              <span>{log.summary}</span>
            </li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}

function MomentumChip({ score, trend }: { score: number; trend: Relationship["momentumTrend"] }) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
      {score} {trendIcon}
    </span>
  );
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function Accordion({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-900" onClick={() => setOpen((v) => !v)}>
        <div>
          <p>{title}</p>
          {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        </div>
        <span className="text-xs text-gray-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="border-t border-gray-100 px-3 py-2">{children}</div> : null}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

