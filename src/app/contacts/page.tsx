"use client";

/**
 * RELATIONSHIPS page (/contacts) — single-LP briefing room
 * - Above the fold: brief narrative + state snapshot + open loops
 * - Everything else is progressive disclosure
 */

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { relationships, Relationship } from "@/lib/mockData";
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
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Relationship</p>
          <h2 className="text-lg font-semibold text-gray-900">{relationship.name}</h2>
          <p className="text-sm text-gray-600">{relationship.firm}</p>
          <p className="text-xs text-gray-500">Last meaningful interaction: {relationship.lastInteraction}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MomentumChip score={relationship.momentumScore} trend={relationship.momentumTrend} />
          <span className="text-xs text-gray-600">{relationship.band}</span>
        </div>
      </div>

      {/* Relationship brief (living memo) */}
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-medium text-gray-900">Relationship brief</p>
        <p className="mt-1 text-sm text-gray-700">
          Narrative snapshot from recent emails/meetings/materials. Focus on momentum, stall risk, and the next move.
        </p>
        <div className="mt-2 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
          <SnapshotItem label="Momentum" value={`${relationship.momentumScore} (${relationship.momentumTrend})`} />
          <SnapshotItem label="Velocity" value={relationship.velocity} />
          <SnapshotItem label="Stall risk" value={relationship.band === "Stalled" || relationship.momentumTrend === "down" ? "Elevated" : "Low"} />
          <SnapshotItem label="Next move" value={relationship.nextMove} />
        </div>
        <p className="mt-2 text-xs text-gray-500">Generated from recent emails, meetings, and materials.</p>
      </div>

      {/* Open loops & risks */}
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Open loops & risks</p>
          <span className="text-xs text-gray-500">Links create/open actions</span>
        </div>
        {relationship.openLoops ? (
          <ul className="mt-2 space-y-1 text-sm text-gray-800">
            <li className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>Follow up on allocation timing (peak interest window)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>Send concise performance snapshot</span>
            </li>
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No open loops.</p>
        )}
      </div>

      {/* Progressive disclosure accordions */}
      <Accordion title="Momentum timeline" hint="Inflection markers only">
        <p className="text-sm text-gray-700">Heating → Cooling as engagement slowed. Show sparkline placeholder here.</p>
      </Accordion>
      <Accordion title="Key interactions" hint="Meaningful events only">
        <ul className="space-y-1 text-sm text-gray-700">
          <li>Call 3d ago — discussed Q4 performance</li>
          <li>Deck opened 3x last week</li>
          <li>Email follow-up pending reply</li>
        </ul>
      </Accordion>
      <Accordion title="Materials & engagement" hint="Links into Materials">
        <p className="text-sm text-gray-700">See Materials → Outbound filtered to this LP.</p>
      </Accordion>
      <Accordion title="Recent actions trace" hint="Last 5, read-only">
        <ul className="space-y-1 text-sm text-gray-700">
          <li>Approved outreach draft</li>
          <li>Scheduling in flight</li>
          <li>Notified stall risk</li>
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

function SnapshotItem({ label, value }: { label: string; value: string }) {
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

