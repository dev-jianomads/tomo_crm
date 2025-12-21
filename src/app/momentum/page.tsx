"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FlowBand, healthMetrics, momentumFlowSummary, relationships } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

export default function MomentumPage() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const [bandFilter, setBandFilter] = useState<FlowBand | null>(null);
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);

  const bandLabelMap: Record<FlowBand, string> = {
    Heating: "Heating Up",
    Active: "Active-Stable",
    Cooling: "Cooling",
    Stalled: "Stalled",
  };

  const flowTiles = useMemo(() => {
    return momentumFlowSummary.map((tile) => {
      const bandLabel = bandLabelMap[tile.band];
      const matching = relationships.filter((r) => r.band === bandLabel);
      return {
        ...tile,
        count: matching.length,
        names: matching.slice(0, 3).map((r) => r.name),
      };
    });
  }, []);

  const filteredRelationships = useMemo(() => {
    if (!bandFilter) return relationships;
    return relationships.filter((r) => r.band === bandLabelMap[bandFilter]);
  }, [bandFilter]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Relationships</p>
            <p className="text-sm text-gray-600">Drill-down for flow and health. Read-only.</p>
          </div>
          {bandFilter ? (
            <button className="text-xs text-blue-700 hover:underline" onClick={() => setBandFilter(null)}>
              Clear filter
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filteredRelationships.map((rel) => (
          <button
            key={rel.id}
            onClick={() => router.push(`/contacts?contact=${rel.id}`)}
            title={`Why this moved: momentum ${rel.momentumTrend}`}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-gray-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold accent-title">{rel.firm}</p>
                <p className="text-xs text-gray-600">{rel.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <BandBadge band={rel.band} />
                <Tag>{rel.velocity}</Tag>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-600">
              <span className="truncate">Last touch: {rel.lastInteraction}</span>
              <span className="truncate">Next move: {rel.nextMove}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Momentum</p>
          <p className="text-sm text-gray-600">How fundraising is moving.</p>
        </div>
      </header>

      <FlowSection tiles={flowTiles} onFilter={setBandFilter} />
      <HealthSection showMore={showMoreMetrics} onToggleShowMore={() => setShowMoreMetrics((prev) => !prev)} />
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="momentum"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle="Momentum"
      assistantChips={["Explain this state", "What next", "Draft outreach", "Create action from this state"]}
    />
  );
}

function FlowSection({
  tiles,
  onFilter,
}: {
  tiles: ((typeof momentumFlowSummary)[number] & { count: number; names: string[] })[];
  onFilter: (band: FlowBand) => void;
}) {
  const labelMap: Record<FlowBand, string> = {
    Heating: "Heating up",
    Active: "Active",
    Cooling: "Cooling",
    Stalled: "Stalled",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold accent-title">Flow</p>
          <p className="text-xs text-gray-600">Momentum bands — motion, not stages.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.band}
            onClick={() => onFilter(tile.band)}
            className="group flex w-full flex-col rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left transition hover:border-gray-200 hover:bg-white"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-gray-500">{labelMap[tile.band]}</p>
              <span className={`text-xs font-semibold ${tile.delta > 0 ? "text-green-700" : tile.delta < 0 ? "text-amber-700" : "text-gray-600"}`}>
                {tile.delta > 0 ? "↑" : tile.delta < 0 ? "↓" : "↔"} {Math.abs(tile.delta)}
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold accent-title">{tile.count}</p>
            <p className="mt-0.5 truncate text-xs text-gray-600">{tile.names.length ? `Top: ${tile.names.slice(0, 3).join(", ")}` : "Top: —"}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function HealthSection({ showMore, onToggleShowMore }: { showMore: boolean; onToggleShowMore: () => void }) {
  const priorityA = healthMetrics.filter((m) => m.tier === "A");
  const priorityB = healthMetrics.filter((m) => m.tier === "B");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold accent-title">Health</p>
        <button className="text-xs text-blue-700 hover:underline" onClick={onToggleShowMore}>
          {showMore ? "Show less" : "Show more"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {priorityA.map((metric) => (
          <MetricTile key={metric.id} metric={metric} />
        ))}
        {showMore ? priorityB.map((metric) => <MetricTile key={metric.id} metric={metric} />) : null}
      </div>
    </div>
  );
}

function MetricTile({ metric }: { metric: (typeof healthMetrics)[number] }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2" title={metric.description}>
      <p className="text-xs text-gray-600">{metric.label}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-lg font-semibold accent-title">{metric.value}</p>
        {metric.trend ? <span className={`text-xs ${metric.trend.startsWith("-") ? "text-amber-700" : "text-green-700"}`}>{metric.trend}</span> : null}
      </div>
    </div>
  );
}

function BandBadge({ band }: { band: string }) {
  const map: Record<string, string> = {
    "Heating Up": "bg-green-50 text-green-700",
    "Active-Stable": "bg-blue-50 text-blue-700",
    Cooling: "bg-amber-50 text-amber-700",
    Stalled: "peach-chip",
  };
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${map[band] ?? "bg-gray-100 text-gray-700"}`}>{band}</span>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">{children}</span>;
}
