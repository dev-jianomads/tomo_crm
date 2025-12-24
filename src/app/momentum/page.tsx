"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FlowBand, healthMetrics, momentumFlowSummary, relationships } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";

const bandLabelMap: Record<FlowBand, string> = {
  Heating: "Heating Up",
  Active: "Active-Stable",
  Cooling: "Cooling",
  Stalled: "Stalled",
};

type Selection =
  | { kind: "momentum"; band: FlowBand }
  | { kind: "health"; id: string }
  | { kind: "flow"; band: FlowBand };

export default function MomentumPage() {
  return (
    <Suspense fallback={null}>
      <MomentumContent />
    </Suspense>
  );
}

function MomentumContent() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeFundId } = useFunds();
  const [selection, setSelection] = useState<Selection>({ kind: "momentum", band: "Heating" });

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

  const momentumTiles = useMemo(
    () => [
      { band: "Heating" as FlowBand, label: "Heating", delta: flowTiles.find((f) => f.band === "Heating")?.delta ?? 0, count: flowTiles.find((f) => f.band === "Heating")?.count ?? 0 },
      { band: "Active" as FlowBand, label: "Health", delta: flowTiles.find((f) => f.band === "Active")?.delta ?? 0, count: flowTiles.find((f) => f.band === "Active")?.count ?? 0 },
      { band: "Cooling" as FlowBand, label: "Cooling", delta: flowTiles.find((f) => f.band === "Cooling")?.delta ?? 0, count: flowTiles.find((f) => f.band === "Cooling")?.count ?? 0 },
      { band: "Stalled" as FlowBand, label: "Stalled", delta: flowTiles.find((f) => f.band === "Stalled")?.delta ?? 0, count: flowTiles.find((f) => f.band === "Stalled")?.count ?? 0 },
    ],
    [flowTiles]
  );

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus && ["Heating", "Cooling", "Stalled", "Active", "Active-Stable"].includes(focus)) {
      const band: FlowBand = focus === "Active-Stable" ? "Active" : (focus as FlowBand);
      setSelection({ kind: "flow", band });
    }
  }, [searchParams]);

  const relatedRelationships = useMemo(() => {
    const filterByFund = (items: typeof relationships) => {
      if (activeFundId === "all") return items;
      const parity = activeFundId === "fund-1" ? 0 : 1;
      return items.filter((_, idx) => idx % 2 === parity);
    };
    if (selection.kind === "flow" || selection.kind === "momentum") {
      const label = bandLabelMap[selection.band];
      return filterByFund(relationships.filter((r) => r.band === label));
    }
    return filterByFund(relationships.slice(0, 4));
  }, [activeFundId, bandLabelMap, selection]);

  const selectedHealthMetric = selection.kind === "health" ? healthMetrics.find((m) => m.id === selection.id) : null;

  const listContent = (
    <div className="flex h-full flex-col gap-3 p-4">
      <SectionGroup title="Momentum">
        <div className="grid gap-2 sm:grid-cols-2">
          {momentumTiles.map((tile) => (
            <TileButton
              key={tile.band}
              active={selection.kind === "momentum" && selection.band === tile.band}
              label={tile.label}
              value={`${tile.count}`}
              delta={tile.delta}
              onClick={() => setSelection({ kind: "momentum", band: tile.band })}
            />
          ))}
        </div>
      </SectionGroup>

      <SectionGroup title="Health">
        <div className="grid gap-2 sm:grid-cols-2">
          {healthMetrics.map((metric) => (
            <TileButton
              key={metric.id}
              active={selection.kind === "health" && selection.id === metric.id}
              label={metric.label}
              value={metric.value}
              delta={metric.trend ? parseTrend(metric.trend) : undefined}
              onClick={() => setSelection({ kind: "health", id: metric.id })}
            />
          ))}
        </div>
      </SectionGroup>

      <SectionGroup title="Flow">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {flowTiles.map((tile) => (
            <TileButton
              key={tile.band}
              active={selection.kind === "flow" && selection.band === tile.band}
              label={bandLabelMap[tile.band]}
              value={`${tile.count}`}
              delta={tile.delta}
              onClick={() => setSelection({ kind: "flow", band: tile.band })}
              hint={tile.names.length ? `Top: ${tile.names.join(", ")}` : undefined}
            />
          ))}
        </div>
      </SectionGroup>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4 space-y-3">
      {selection.kind === "health" && selectedHealthMetric ? (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3">
          <p className="text-sm font-semibold accent-title">{selectedHealthMetric.label}</p>
          <p className="text-lg font-semibold text-gray-900">{selectedHealthMetric.value}</p>
          {selectedHealthMetric.trend ? <p className="text-xs text-gray-600">Trend: {selectedHealthMetric.trend}</p> : null}
          <p className="text-sm text-gray-700">{selectedHealthMetric.description}</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3">
          <p className="text-sm font-semibold accent-title">
            {selection.kind === "flow"
              ? bandLabelMap[selection.band]
              : selection.kind === "momentum"
              ? `${selection.band} momentum`
              : "Health detail"}
          </p>
          <p className="text-sm text-gray-700">Relationships driving this state:</p>
          <div className="space-y-2">
            {relatedRelationships.map((rel) => (
              <div key={rel.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{rel.name}</p>
                  <span className="text-xs text-gray-600">{rel.firm}</span>
                </div>
                <p className="text-xs text-gray-600">Last touch: {rel.lastInteraction} • Next move: {rel.nextMove}</p>
                <button className="text-xs text-blue-700 hover:underline" onClick={() => router.push(`/contacts?contact=${rel.id}`)}>
                  View in Relationships
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="momentum"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={selection.kind === "health" ? selectedHealthMetric?.label : bandLabelMap[selection.band]}
      assistantChips={["Explain this state", "What changed", "Who to contact"]}
    />
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold accent-title">{title}</p>
      {children}
    </div>
  );
}

function TileButton({
  label,
  value,
  delta,
  hint,
  onClick,
  active,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col rounded-md border px-3 py-2 text-left transition ${
        active ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        {typeof delta === "number" ? <span className={`text-xs ${delta > 0 ? "text-green-700" : delta < 0 ? "text-amber-700" : "text-gray-600"}`}>{delta === 0 ? "↔" : delta > 0 ? "↑" : "↓"} {Math.abs(delta)}</span> : null}
      </div>
      <p className="text-lg font-semibold accent-title">{value}</p>
      {hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
    </button>
  );
}

function parseTrend(trend: string) {
  const numeric = parseInt(trend.replace(/[^0-9-]/g, ""), 10);
  if (Number.isNaN(numeric)) return 0;
  return numeric;
}

