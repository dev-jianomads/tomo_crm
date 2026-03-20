"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/pipelines";
import { relationships, STAGE_OPTIONS, type Relationship, type Stage } from "@/lib/mockData";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { RelationshipsFilterChat } from "@/components/relationships-filter-chat";
import { PipelineStageTomoChat } from "@/components/pipeline-stage-tomo-chat";
import { usePersistentState } from "@/lib/storage";
import { toast } from "sonner";

export default function PipelinePage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;
  const { pipelines, addPipeline, resetToMock, ready: pipelinesReady } = usePipelines(activeFundId);

  const [filterCriteria, setFilterCriteria] = useState<StructuredFilterCriteria>(() => ({ ...EMPTY_CRITERIA }));
  const [listName, setListName] = useState("");
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<Stage | null>(null);
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-pipeline-split-ratio", 35);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const filteredCount = useMemo(
    () => applyFilters(relationships, filterCriteria).length,
    [filterCriteria]
  );

  const clearFilters = () => setFilterCriteria({ ...EMPTY_CRITERIA });

  const handleCreatePipeline = () => {
    const trimmed = listName.trim();
    if (!trimmed) {
      toast.error("Enter a pipeline name");
      return;
    }
    addPipeline({
      name: trimmed,
      fundId: effectiveFundId,
      filterCriteria: { ...filterCriteria },
    });
    setListName("");
    toast.success(`Pipeline "${trimmed}" created`);
  };

  const handlePipelineClick = (id: string) => {
    setActivePipelineId(id);
  };

  const handleDrawerClose = () => {
    setActivePipelineId(null);
    setSelectedFunnelStage(null);
  };

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const drawerOpen = activePipelineId !== null;

  useEffect(() => {
    if (!draggingSplit) return;
    const handleMove = (e: MouseEvent) => {
      const el = splitContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(80, Math.max(10, newRatio));
      setSplitRatio(clamped);
    };
    const stop = () => setDraggingSplit(false);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [draggingSplit, setSplitRatio]);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageListHeader
        label="Pipeline"
        description="Refine the CRM with natural-language filters, save the result as a named pipeline, and open it for funnel stages or workflow audiences."
        action={{ href: "/workflows", label: "View workflows →" }}
      />
      <div ref={splitContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top: Filter chat */}
      <div
        className="min-h-0 shrink-0 flex-col overflow-hidden border-b border-gray-200"
        style={{ flex: `${splitRatio} 1 0`, display: "flex" }}
      >
        <RelationshipsFilterChat
          currentFilters={filterCriteria}
          onFiltersChange={setFilterCriteria}
          onClearFilters={clearFilters}
          onFilterApplied={() => toast.success("Filters applied")}
        />
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-label="Resize filter and pipeline sections"
        className={`flex shrink-0 cursor-row-resize items-center justify-center py-1 hover:bg-gray-50 ${draggingSplit ? "bg-gray-50" : ""}`}
        onMouseDown={() => setDraggingSplit(true)}
      >
        <div className="h-1 w-12 rounded-full bg-gray-200" />
      </div>

      {/* Bottom: Create pipeline + Pipeline list */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ flex: `${100 - splitRatio} 1 0` }}
      >
        {/* Create pipeline */}
        <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50/50 p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Create pipeline</p>
            <span className="text-xs text-gray-500">
              {Object.keys(filterCriteria).length > 0
                ? `Showing ${filteredCount} of ${relationships.length} relationship${relationships.length !== 1 ? "s" : ""}`
                : `${relationships.length} relationship${relationships.length !== 1 ? "s" : ""} (filter to create)`}
            </span>
          </div>
          {Object.keys(filterCriteria).length > 0 && (() => {
            const summary = formatFilterSummary(filterCriteria);
            return summary ? (
              <span className="min-w-0 truncate text-xs font-medium peach-text" title={summary}>
                {summary}
              </span>
            ) : null;
          })()}
        </div>
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="Name your pipeline here"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
        <button
          className={`w-full rounded-md px-3 py-2 text-sm font-medium transition ${
            Object.keys(filterCriteria).length === 0
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "button-primary"
          }`}
          onClick={handleCreatePipeline}
          disabled={Object.keys(filterCriteria).length === 0 || !listName.trim()}
        >
          Create
        </button>
        </div>

        {/* Pipeline list */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-gray-100 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold accent-title">Pipelines</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">
                {pipelines.length} {activeFundId === "all" ? "total" : "in fund"}
              </span>
              <button
                type="button"
                onClick={() => {
                  resetToMock();
                  setActivePipelineId(null);
                  toast.success("Reset to 3 demo pipelines");
                }}
                className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                title="Reset to 3 demo pipelines"
                aria-label="Reset to demo"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-2 px-4 py-3">
          {pipelines.length ? (
            pipelines.map((pipeline) => {
              const count = applyFilters(relationships, pipeline.filterCriteria).length;
              const summary = formatFilterSummary(pipeline.filterCriteria);
              const isSelected = activePipelineId === pipeline.id;
              return (
                <div
                  key={pipeline.id}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <button
                    onClick={() => handlePipelineClick(pipeline.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
                      <span className="text-xs text-gray-600">{count} relationships</span>
                    </div>
                    {summary ? (
                      <p className="mt-0.5 truncate text-xs text-gray-600" title={summary}>
                        {summary}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-500">No filters</p>
                    )}
                  </button>
                  <Link
                    href={`/workflows?pipelineId=${pipeline.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-block rounded-md border border-[color:var(--accent)] px-2 py-1 text-[11px] font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Use in workflow
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              No pipelines yet. Filter the CRM above and create one.
            </div>
          )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );

  if (!ready || !pipelinesReady) return null;

  return (
    <>
      <AppShell
        section="pipeline"
        listContent={listContent}
        detailContent={null}
        detailVisible={false}
        contextTitle={activePipeline?.name}
        assistantChips={["Suggest filters", "Who should be added", "Tighten this list"]}
      />

      <ContextDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={
          selectedFunnelStage
            ? `${activePipeline?.name ?? "Pipeline"} — ${selectedFunnelStage}`
            : (activePipeline?.name ?? "Pipeline")
        }
        section1Content={
          activePipeline ? (
            selectedFunnelStage ? (
              <PipelineStageDrawerContent
                pipeline={activePipeline}
                stage={selectedFunnelStage}
                onBack={() => setSelectedFunnelStage(null)}
              />
            ) : (
              <PipelineDrawerContent
                pipeline={activePipeline}
                onStageClick={setSelectedFunnelStage}
              />
            )
          ) : (
            <p className="text-sm text-gray-500">No pipeline selected</p>
          )
        }
        section2Content={
          activePipeline && selectedFunnelStage ? (
            <PipelineStageTomoChat
              pipelineId={activePipeline.id}
              pipelineName={activePipeline.name}
              stage={selectedFunnelStage}
              relationshipIds={(() => {
                const filtered = applyFilters(relationships, activePipeline.filterCriteria);
                const byStage = groupByStage(filtered);
                return byStage[selectedFunnelStage].map((r) => r.id);
              })()}
            />
          ) : undefined
        }
        hideSection2={!selectedFunnelStage}
        section3Entries={[]}
      />
    </>
  );
}

function groupByStage(rels: Relationship[]): Record<Stage, Relationship[]> {
  const groups = {} as Record<Stage, Relationship[]>;
  for (const stage of STAGE_OPTIONS) {
    groups[stage] = rels.filter((r) => r.stage === stage);
  }
  return groups;
}

/** Pale green → red spectrum, Pass = black */
const STAGE_COLORS: Record<Stage, string> = {
  "First contact": "#c8e6c9",
  "Deck sent": "#a5d6a7",
  "Met": "#81c784",
  "Active diligence": "#ffeb3b",
  "DD": "#ffb74d",
  "Soft circle": "#ff8a65",
  "Closed": "#f44336",
  "Pass": "#000000",
};

function PipelineStageDrawerContent({
  pipeline,
  stage,
  onBack,
}: {
  pipeline: { id: string; name: string; filterCriteria: StructuredFilterCriteria };
  stage: Stage;
  onBack: () => void;
}) {
  const filteredRels = useMemo(
    () => applyFilters(relationships, pipeline.filterCriteria),
    [pipeline.filterCriteria]
  );
  const byStage = useMemo(() => groupByStage(filteredRels), [filteredRels]);
  const relsInStage = byStage[stage];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        ← Back to funnel
      </button>
      <div>
        <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
        <p className="text-xs font-medium text-gray-600">{stage}</p>
        <p className="text-xs text-gray-500">
          {relsInStage.length} relationship{relsInStage.length !== 1 ? "s" : ""} in this stage
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {relsInStage.length ? (
          relsInStage.map((r) => (
            <span
              key={r.id}
              className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200"
            >
              {r.firm}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500">No relationships in this stage</span>
        )}
      </div>
    </div>
  );
}

function PipelineDrawerContent({
  pipeline,
  onStageClick,
}: {
  pipeline: { id: string; name: string; filterCriteria: StructuredFilterCriteria };
  onStageClick: (stage: Stage) => void;
}) {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  const filteredRels = useMemo(
    () => applyFilters(relationships, pipeline.filterCriteria),
    [pipeline.filterCriteria]
  );
  const byStage = useMemo(() => groupByStage(filteredRels), [filteredRels]);
  const total = filteredRels.length;

  const stageCounts = useMemo(
    () => STAGE_OPTIONS.map((s) => ({ stage: s, count: byStage[s].length })),
    [byStage]
  );

  const funnelRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [linePoints, setLinePoints] = useState<{ top: string; bottom: string } | null>(null);

  useLayoutEffect(() => {
    const funnel = funnelRef.current;
    if (!funnel) return;
    const bars = barRefs.current.filter(Boolean) as HTMLDivElement[];
    if (bars.length < 2) return;

    const funnelRect = funnel.getBoundingClientRect();
    const stagesToLink = stageCounts.slice(0, -1);
    if (stagesToLink.length < 2) return;

    const topPoints: [number, number][] = [];
    const bottomPoints: [number, number][] = [];

    for (let i = 0; i < stagesToLink.length; i++) {
      const bar = bars[i];
      if (!bar) continue;
      const rect = bar.getBoundingClientRect();
      const x = rect.left - funnelRect.left + rect.width / 2;
      const topY = rect.top - funnelRect.top;
      const bottomY = rect.bottom - funnelRect.top;
      topPoints.push([x, topY]);
      bottomPoints.push([x, bottomY]);
    }

    const topPath = topPoints.map(([x, y]) => `${x},${y}`).join(" ");
    const bottomPath = bottomPoints.map(([x, y]) => `${x},${y}`).join(" ");
    setLinePoints({ top: topPath, bottom: bottomPath });
  }, [stageCounts, selectedStage]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
        <p className="text-xs text-gray-600">
          {total} relationship{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Horizontal funnel — fixed width, height proportional to count, centered */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Funnel by stage</p>
        <div ref={funnelRef} className="relative" style={{ height: 100 }}>
          {linePoints && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ overflow: "visible" }}
            >
              <polyline
                points={linePoints.top}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={linePoints.bottom}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <div className="relative flex items-center justify-between gap-px px-0.5" style={{ height: 100 }}>
            {stageCounts.map(({ stage, count }, i) => {
              const isSelected = selectedStage === stage;
              const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
              const barHeight = Math.max((count / maxCount) * 72, count > 0 ? 12 : 6);
              const bgColor = STAGE_COLORS[stage];
              const isPass = stage === "Pass";
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => onStageClick(stage)}
                  title={`${stage}: ${count}`}
                  className={`flex flex-1 flex-col items-center gap-1 transition ${
                    isSelected ? "ring-2 ring-[color:var(--accent)] ring-offset-1 rounded" : ""
                  }`}
                >
                  <div className="flex flex-1 items-center justify-center w-full min-h-[60px]">
                    <div
                      ref={(el) => {
                        barRefs.current[i] = el;
                      }}
                      className="w-12 min-w-12 rounded"
                      style={{
                        height: barHeight,
                        backgroundColor: bgColor,
                        boxShadow: isPass ? "none" : "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    />
                  </div>
                  <span className="line-clamp-2 break-words w-full text-center text-[10px] text-gray-700">
                    {stage}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-600">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expandable section: firms in selected stage */}
      {selectedStage !== null && (
        <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            {selectedStage} ({byStage[selectedStage].length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {byStage[selectedStage].length ? (
              byStage[selectedStage].map((r) => (
                <span
                  key={r.id}
                  className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200"
                >
                  {r.firm}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">No relationships in this stage</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
