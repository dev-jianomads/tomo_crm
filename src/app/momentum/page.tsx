"use client";

/**
 * MOMENTUM page (/momentum) — analytics dashboard + explainability
 * - Funnel bands + 7 KPIs
 * - Explainability for selected LP
 * - Read-only; no edits here
 */

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { relationships } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

const kpis = [
  { id: "k1", label: "Active Relationship Coverage", value: "74%", delta: "+6%" },
  { id: "k2", label: "Momentum Distribution", value: "Heating 32%", delta: "+4%" },
  { id: "k3", label: "Momentum Velocity", value: "Fast 41%", delta: "+3%" },
  { id: "k4", label: "Stall Risk Index", value: "18%", delta: "-2%" },
  { id: "k5", label: "Engagement Quality Index", value: "7.9/10", delta: "+0.3" },
  { id: "k6", label: "Flow Conversion Health", value: "63%", delta: "+5%" },
  { id: "k7", label: "Execution Coverage", value: "81%", delta: "+2%" },
];

export default function MomentumPage() {
  const { ready } = useRequireSession();
  const [activeId, setActiveId] = useState<string | null>(() => relationships[0]?.id ?? null);

  const active = useMemo(() => relationships.find((r) => r.id === activeId) ?? relationships[0] ?? null, [activeId]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Momentum</p>
        <p className="text-sm text-gray-600">Portfolio-level view; no edits here.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {relationships.map((rel) => (
          <button
            key={rel.id}
            onClick={() => setActiveId(rel.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === rel.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{rel.firm}</p>
                <p className="text-xs text-gray-600">{rel.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} />
                <Tag>{rel.velocity}</Tag>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Last: {rel.lastInteraction}</span>
              <span>Next: {rel.nextMove}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Flow / Funnel bands */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Flow / Funnel summary</p>
          <span className="text-xs text-gray-500">Motion bands</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <BandCard title="Heating Up" value="12" delta="+3" />
          <BandCard title="Active-Stable" value="18" delta="+2" />
          <BandCard title="Cooling" value="9" delta="-1" />
          <BandCard title="Stalled" value="6" delta="+0" />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm font-semibold text-gray-900">KPIs</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-600">{kpi.label}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900">{kpi.value}</p>
                <span className="text-xs text-green-700">{kpi.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explainability panel for selected LP */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Why this score?</p>
          {active ? <MomentumChip score={active.momentumScore} trend={active.momentumTrend} /> : null}
        </div>
        {active ? (
          <div className="mt-3 space-y-2 text-sm text-gray-800">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Top positive drivers</p>
              <ul className="mt-1 space-y-1">
                <li className="flex items-start gap-2"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-green-600" /> Deck opened 3x last week</li>
                <li className="flex items-start gap-2"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-green-600" /> Meeting booked within 72h</li>
                <li className="flex items-start gap-2"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-green-600" /> Reply latency under 24h</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Negative factor</p>
              <ul className="mt-1 space-y-1">
                <li className="flex items-start gap-2"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-amber-600" /> No follow-up after last meeting</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Evidence snippets</p>
              <ul className="mt-1 space-y-1">
                <li>“Opened deck 3x”</li>
                <li>“Meeting booked”</li>
                <li>“No reply in 9d”</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700">Select a relationship to explain its score.</p>
        )}
      </div>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="momentum"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active ? `${active.firm} (${active.name})` : undefined}
      assistantChips={["Explain this score", "What next", "Draft outreach", "Create action from this state"]}
    />
  );
}

function MomentumChip({ score, trend }: { score: number; trend: "up" | "flat" | "down" }) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up" ? "text-green-700" : trend === "down" ? "text-amber-700" : "text-gray-700";
  return (
    <span className={`rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium ${trendColor}`}>
      {score} {trendIcon}
    </span>
  );
}

function BandCard({ title, value, delta }: { title: string; value: string; delta: string }) {
  const positive = delta.startsWith("+") || delta.startsWith("-");
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-600">{title}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        <span className={`text-xs ${positive ? "text-green-700" : "text-gray-600"}`}>{delta}</span>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">{children}</span>;
}




