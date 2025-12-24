"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { materials, Material } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";

type FilterKey = "all" | "active" | "engagement" | "impact" | "followup";

export default function MaterialsPage() {
  const { ready } = useRequireSession();
  const [selection, setSelection] = useState<string | null>(() => materials[0]?.id ?? null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const overview = useMemo(
    () => ({
      active: materials.length,
      engagement: "48% meaningful",
      impact: "Positive tilt",
      followup: "7 flagged",
    }),
    []
  );

  const filteredMaterials = useMemo(() => {
    if (filter === "all") return materials;
    if (filter === "active") return materials;
    if (filter === "engagement") return materials.filter((m) => m.engagement === "High" || m.engagement === "Mixed");
    if (filter === "impact") return materials.filter((m) => m.momentumImpact === "up");
    if (filter === "followup") return materials.filter((m) => !!m.followUpSignal);
    return materials;
  }, [filter]);

  const activeMaterial = materials.find((m) => m.id === selection) ?? null;

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Materials</p>
            <p className="text-sm text-gray-600">What you sent — and what it moved.</p>
          </div>
          <Link href="/briefs" className="text-xs text-blue-700 hover:underline">
            View meeting briefs
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <OverviewTiles overview={overview} onSelectFilter={setFilter} />
        <div className="space-y-2">
          {filteredMaterials.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelection(m.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition ${
                selection === m.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold accent-title">{m.name}</p>
                  <p className="text-xs text-gray-600">
                    {m.type} • {m.version} • {m.date}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">{m.engagement}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                <span>
                  Momentum impact: {m.momentumImpact === "up" ? "Positive" : m.momentumImpact === "down" ? "Negative" : "Neutral"}
                </span>
                <span className={`truncate ${m.followUpSignal ? "peach-text" : ""}`}>{m.followUpSignal || "No follow-up flagged"}</span>
              </div>
            </button>
          ))}
          {!filteredMaterials.length ? <Placeholder title="No materials match this filter." /> : null}
        </div>
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {activeMaterial ? <MaterialDetail material={activeMaterial} /> : <Placeholder title="Select a material" />}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="materials"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={activeMaterial?.name}
      assistantChips={["Draft investor update", "Draft follow-ups", "Create action"]}
    />
  );
}

function OverviewTiles({
  overview,
  onSelectFilter,
}: {
  overview: { active: number; engagement: string; impact: string; followup: string };
  onSelectFilter: (filter: FilterKey) => void;
}) {
  const tiles = [
    { label: "Active materials", value: overview.active.toString(), filter: "active" as FilterKey },
    { label: "Engagement rate", value: overview.engagement, filter: "engagement" as FilterKey },
    { label: "Momentum impact", value: overview.impact, filter: "impact" as FilterKey },
    { label: "Follow-up opportunities", value: overview.followup, filter: "followup" as FilterKey },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <button
          key={tile.label}
          onClick={() => onSelectFilter(tile.filter)}
          className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left transition hover:border-gray-200 hover:bg-white"
        >
          <p className="text-xs text-gray-600">{tile.label}</p>
          <p className="text-lg font-semibold accent-title">{tile.value}</p>
        </button>
      ))}
    </div>
  );
}

function MaterialDetail({ material }: { material: Material }) {
  const summary = `Purpose: share ${material.name} with priority LPs. Audience: Tier 1–2 LPs and active prospects.`;
  const engagement = {
    engaged: ["Alex Morgan", "Jamie Chen"],
    skimmed: ["Priya Desai"],
    noResponse: ["Samir Patel"],
  };
  const attribution = {
    up: ["Alex Morgan"],
    flat: ["Jamie Chen"],
    down: ["Samir Patel"],
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Material</p>
          <h3 className="text-lg font-semibold accent-title">{material.name}</h3>
          <p className="text-sm text-gray-600">
            {material.type} • {material.version} • {material.date}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{material.engagement}</span>
      </div>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">Summary</p>
        <p className="mt-1 text-sm text-gray-800">{summary}</p>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">Engagement</p>
        <div className="mt-2 space-y-1 text-sm text-gray-800">
          <p>Engaged: {engagement.engaged.join(", ") || "—"}</p>
          <p>Skimmed: {engagement.skimmed.join(", ") || "—"}</p>
          <p>No response: {engagement.noResponse.join(", ") || "—"}</p>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">Momentum attribution</p>
        <div className="mt-2 space-y-1 text-sm text-gray-800">
          <p>Momentum ↑: {attribution.up.join(", ") || "—"}</p>
          <p>Unchanged: {attribution.flat.join(", ") || "—"}</p>
          <p>Momentum ↓: {attribution.down.join(", ") || "—"}</p>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">What to do next</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="button-primary">Create action</button>
          <button className="button-secondary">Draft follow-up</button>
          <button className="button-secondary">Segment variants</button>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">TOMO</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="button-secondary">Draft investor update</button>
          <button className="button-secondary">Draft follow-ups</button>
          <button className="button-secondary">Create action</button>
        </div>
      </section>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

