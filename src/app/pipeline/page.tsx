"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ContextDrawer } from "@/components/context-drawer";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/pipelines";
import { relationships } from "@/lib/mockData";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { RelationshipsFilterChat } from "@/components/relationships-filter-chat";
import { toast } from "sonner";

export default function PipelinePage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;
  const { pipelines, addPipeline, ready: pipelinesReady } = usePipelines(activeFundId);

  const [filterCriteria, setFilterCriteria] = useState<StructuredFilterCriteria>(() => ({ ...EMPTY_CRITERIA }));
  const [listName, setListName] = useState("");
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);

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
  };

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const drawerOpen = activePipelineId !== null;

  const listContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top: Filter chat */}
      <div className="min-h-0 flex-1 overflow-hidden border-b border-gray-200">
        <RelationshipsFilterChat
          currentFilters={filterCriteria}
          onFiltersChange={setFilterCriteria}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Create pipeline */}
      <div className="shrink-0 space-y-2 border-t border-gray-200 bg-gray-50/50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Create pipeline</p>
          <span className="text-xs text-gray-500">{filteredCount} in preview</span>
        </div>
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="Pipeline name"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
        <button
          className="button-primary w-full"
          onClick={handleCreatePipeline}
          disabled={!listName.trim()}
        >
          Create
        </button>
      </div>

      {/* Bottom: Pipeline list */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-gray-200">
        <div className="border-b border-gray-100 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold accent-title">Pipelines</p>
            <span className="text-[11px] text-gray-500">
              {pipelines.length} {activeFundId === "all" ? "total" : "in fund"}
            </span>
          </div>
        </div>
        <div className="space-y-2 px-4 py-3">
          {pipelines.length ? (
            pipelines.map((pipeline) => {
              const count = applyFilters(relationships, pipeline.filterCriteria).length;
              const summary = formatFilterSummary(pipeline.filterCriteria);
              const isSelected = activePipelineId === pipeline.id;
              return (
                <button
                  key={pipeline.id}
                  onClick={() => handlePipelineClick(pipeline.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
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
        title={activePipeline?.name ?? "Pipeline"}
        section1Content={
          activePipeline ? (
            <PipelineDrawerContent pipeline={activePipeline} />
          ) : (
            <p className="text-sm text-gray-500">No pipeline selected</p>
          )
        }
        section3Entries={[]}
      />
    </>
  );
}

function PipelineDrawerContent({ pipeline }: { pipeline: { name: string; filterCriteria: StructuredFilterCriteria } }) {
  const count = applyFilters(relationships, pipeline.filterCriteria).length;
  const summary = formatFilterSummary(pipeline.filterCriteria);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
      <p className="text-xs text-gray-600">
        {count} relationship{count !== 1 ? "s" : ""}
      </p>
      {summary && (
        <p className="text-xs text-gray-600" title={summary}>
          {summary}
        </p>
      )}
      <p className="text-[11px] text-gray-500">Funnel view coming in Stage 3</p>
    </div>
  );
}
