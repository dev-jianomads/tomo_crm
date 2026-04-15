"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/use-pipelines";
import type { Pipeline } from "@/lib/pipelines";
import { STAGE_COLORS, STAGE_OPTIONS, type Relationship, type Stage } from "@/lib/mockData";
import { useRelationships } from "@/components/relationships-provider";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { RelationshipsFilterChat } from "@/components/relationships-filter-chat";
import { PipelineStageTomoChat } from "@/components/pipeline-stage-tomo-chat";
import { usePersistentState } from "@/lib/usePersistentState";
import { toast } from "sonner";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import type { CustomPlaybookStored } from "@/lib/customPlaybooks";

/** Set false to hide Custom workflow creator in “Use in workflow” (Phase 4 rollback). */
const ENABLE_WORKFLOW_CREATOR = true;

type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

export default function PipelinePage() {
  const router = useRouter();
  const { ready } = useRequireSession();
  const { relationships } = useRelationships();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;
  const { pipelines, addPipeline, resetToMock, ready: pipelinesReady } = usePipelines(activeFundId);
  const [, setPlaybookOverrides] = usePersistentState<PlaybookPipelineOverrides>(
    "tomo-playbook-pipeline-overrides",
    {}
  );

  const [filterCriteria, setFilterCriteria] = useState<StructuredFilterCriteria>(() => ({ ...EMPTY_CRITERIA }));
  const [listName, setListName] = useState("");
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<Stage | null>(null);
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-pipeline-split-ratio", 35);
  const [filterChatExpanded, setFilterChatExpanded] = usePersistentState<boolean>(
    "tomo-pipeline-filter-chat-expanded",
    false
  );
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  /** Pipeline id when "Use in workflow" dialog is open */
  const [useWorkflowPipelineId, setUseWorkflowPipelineId] = useState<string | null>(null);
  const [useWorkflowPlaybookId, setUseWorkflowPlaybookId] = useState<string>(
    () => suggestedPlaybooks[0]?.id ?? ""
  );

  const filteredCount = useMemo(
    () => applyFilters(relationships, filterCriteria).length,
    [relationships, filterCriteria]
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
    if (!draggingSplit || !filterChatExpanded) return;
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
  }, [draggingSplit, filterChatExpanded, setSplitRatio]);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageListHeader
        label="Pipeline"
        description="Refine the CRM with natural-language filters, save the result as a named pipeline, and open it for funnel stages or workflow audiences."
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href="/workflows"
            className="text-xs font-medium text-[color:var(--accent)] hover:underline"
          >
            View workflows →
          </Link>
          <Link
            href="/lp-network"
            className="text-xs font-medium text-[color:var(--accent)] hover:underline"
          >
            LP Network intros (demo) →
          </Link>
        </div>
      </PageListHeader>
      <div ref={splitContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top: Filter chat */}
      <div
        className="min-h-0 shrink-0 flex-col overflow-hidden border-b border-gray-200 bg-white"
        style={
          filterChatExpanded
            ? { flex: `${splitRatio} 1 0`, minHeight: 180, display: "flex" }
            : { flex: "0 0 auto", display: "flex" }
        }
      >
        <RelationshipsFilterChat
          expanded={filterChatExpanded}
          onExpandedChange={setFilterChatExpanded}
          currentFilters={filterCriteria}
          onFiltersChange={setFilterCriteria}
          onClearFilters={clearFilters}
          onFilterApplied={() => toast.success("Filters applied")}
        />
      </div>

      {filterChatExpanded ? (
        <div
          role="separator"
          aria-label="Resize filter and pipeline sections"
          className={`flex shrink-0 cursor-row-resize items-center justify-center py-1 hover:bg-gray-50 ${draggingSplit ? "bg-gray-50" : ""}`}
          onMouseDown={() => setDraggingSplit(true)}
        >
          <div className="h-1 w-12 rounded-full bg-gray-200" />
        </div>
      ) : null}

      {/* Bottom: Create pipeline + Pipeline list */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ flex: filterChatExpanded ? `${100 - splitRatio} 1 0` : "1 1 0" }}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUseWorkflowPipelineId(pipeline.id);
                      setUseWorkflowPlaybookId(suggestedPlaybooks[0]?.id ?? "");
                    }}
                    className="mt-2 inline-block rounded-md border border-[color:var(--accent)] px-2 py-1 text-[11px] font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition"
                  >
                    Use in workflow
                  </button>
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

  const useWorkflowPipeline = useWorkflowPipelineId
    ? pipelines.find((p) => p.id === useWorkflowPipelineId)
    : null;

  return (
    <>
      {useWorkflowPipelineId && useWorkflowPipeline && (
        <UseInWorkflowDialog
          pipeline={useWorkflowPipeline}
          relationships={relationships}
          selectedPlaybookId={useWorkflowPlaybookId}
          onSelectPlaybook={setUseWorkflowPlaybookId}
          onClose={() => setUseWorkflowPipelineId(null)}
          setPlaybookOverrides={setPlaybookOverrides}
          router={router}
          onConfirm={() => {
            if (!useWorkflowPlaybookId) {
              toast.error("Select a workflow");
              return;
            }
            const q = new URLSearchParams({
              playbook: useWorkflowPlaybookId,
              pipelineId: useWorkflowPipelineId,
            });
            setUseWorkflowPipelineId(null);
            router.push(`/workflows?${q.toString()}`);
          }}
        />
      )}
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
                relationships={relationships}
                stage={selectedFunnelStage}
                onBack={() => setSelectedFunnelStage(null)}
              />
            ) : (
              <PipelineDrawerContent
                pipeline={activePipeline}
                relationships={relationships}
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

type UseInWorkflowDialogMode = "existing" | "custom";

function UseInWorkflowDialog({
  pipeline,
  relationships,
  selectedPlaybookId,
  onSelectPlaybook,
  onClose,
  onConfirm,
  setPlaybookOverrides,
  router,
}: {
  pipeline: Pipeline;
  relationships: Relationship[];
  selectedPlaybookId: string;
  onSelectPlaybook: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  setPlaybookOverrides: (
    val: PlaybookPipelineOverrides | ((prev: PlaybookPipelineOverrides) => PlaybookPipelineOverrides)
  ) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [mode, setMode] = useState<UseInWorkflowDialogMode>("existing");
  const [createdEntry, setCreatedEntry] = useState<CustomPlaybookStored | null>(null);

  useEffect(() => {
    setMode("existing");
    setCreatedEntry(null);
  }, [pipeline.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const pipelineSummary = formatFilterSummary(pipeline.filterCriteria);
  const pipelineCount = applyFilters(relationships, pipeline.filterCriteria).length;

  const handleWorkflowCreated = (entry: CustomPlaybookStored) => {
    setPlaybookOverrides((prev) => ({
      ...prev,
      [entry.id]: { pipelineId: pipeline.id },
    }));
    setCreatedEntry(entry);
    toast.success("Workflow created!");
  };

  const openCreatedInWorkflows = () => {
    if (!createdEntry) return;
    const q = new URLSearchParams({
      playbook: createdEntry.id,
      pipelineId: pipeline.id,
    });
    onClose();
    router.push(`/workflows?${q.toString()}`);
  };

  const dialogMaxWidth = ENABLE_WORKFLOW_CREATOR ? "max-w-lg" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/30 p-4 sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="use-in-workflow-title"
        className={`my-auto flex w-full ${dialogMaxWidth} flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[min(92dvh,calc(100vh-2rem))]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500">Use in workflow</p>
              <h2 id="use-in-workflow-title" className="text-lg font-semibold accent-title">
                Link pipeline to a workflow
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{pipeline.name}</span>
                <span className="text-gray-500">
                  {" "}
                  · {pipelineCount} relationships
                  {pipelineSummary ? ` · ${pipelineSummary}` : ""}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {ENABLE_WORKFLOW_CREATOR && (
            <div className="mt-3 flex gap-2" role="tablist" aria-label="Workflow source">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "existing"}
                onClick={() => setMode("existing")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "existing"
                    ? "bg-[color:var(--accent-soft)] text-gray-900 ring-1 ring-[color:var(--accent)]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "custom"}
                onClick={() => setMode("custom")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "custom"
                    ? "bg-[color:var(--accent-soft)] text-gray-900 ring-1 ring-[color:var(--accent)]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Custom
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {(!ENABLE_WORKFLOW_CREATOR || mode === "existing") && (
            <>
              <p className="mb-2 text-xs font-medium text-gray-500">User-defined workflows</p>
              <ul className="space-y-2">
                {suggestedPlaybooks.map((pb) => {
                  const selected = selectedPlaybookId === pb.id;
                  return (
                    <li key={pb.id}>
                      <button
                        type="button"
                        onClick={() => onSelectPlaybook(pb.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent)]"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">{pb.name}</span>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{pb.summary}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {ENABLE_WORKFLOW_CREATOR && mode === "custom" && (
            <div className="space-y-3">
              {createdEntry ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                  Created <span className="font-semibold">{createdEntry.name}</span>. Open it in Workflows to edit the
                  flow with Tomo.
                </p>
              ) : null}
              <WorkflowCreatorChat
                key={pipeline.id}
                pipeline={pipeline}
                onWorkflowCreated={handleWorkflowCreated}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {ENABLE_WORKFLOW_CREATOR && mode === "custom" && createdEntry ? (
            <button
              type="button"
              onClick={openCreatedInWorkflows}
              className="button-primary rounded-md px-3 py-2 text-sm font-medium"
            >
              Open in Workflows
            </button>
          ) : null}
          {(!ENABLE_WORKFLOW_CREATOR || mode === "existing") && (
            <button type="button" onClick={onConfirm} className="button-primary rounded-md px-3 py-2 text-sm font-medium">
              Open in Workflows
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByStage(rels: Relationship[]): Record<Stage, Relationship[]> {
  const groups = {} as Record<Stage, Relationship[]>;
  for (const stage of STAGE_OPTIONS) {
    groups[stage] = rels.filter((r) => r.stage === stage);
  }
  return groups;
}

function PipelineStageDrawerContent({
  pipeline,
  relationships,
  stage,
  onBack,
}: {
  pipeline: { id: string; name: string; filterCriteria: StructuredFilterCriteria };
  relationships: Relationship[];
  stage: Stage;
  onBack: () => void;
}) {
  const filteredRels = useMemo(
    () => applyFilters(relationships, pipeline.filterCriteria),
    [relationships, pipeline.filterCriteria]
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
  relationships,
  onStageClick,
}: {
  pipeline: { id: string; name: string; filterCriteria: StructuredFilterCriteria };
  relationships: Relationship[];
  onStageClick: (stage: Stage) => void;
}) {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  const filteredRels = useMemo(
    () => applyFilters(relationships, pipeline.filterCriteria),
    [relationships, pipeline.filterCriteria]
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
