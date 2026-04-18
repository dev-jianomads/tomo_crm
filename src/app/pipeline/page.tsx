"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/use-pipelines";
import { AmendListModal } from "@/components/amend-list-modal";
import type { Pipeline } from "@/lib/pipelines";
import { getPipelineMembers } from "@/lib/pipelines";
import { STAGE_COLORS, STAGE_OPTIONS, type Relationship, type Stage } from "@/lib/mockData";
import { useRelationships } from "@/components/relationships-provider";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";
import { toast } from "sonner";

export default function PipelinePage() {
  const router = useRouter();
  const { ready } = useRequireSession();
  const { relationships } = useRelationships();
  const { activeFundId } = useFunds();
  const { pipelines, resetToMock, updatePipeline, ready: pipelinesReady } = usePipelines(activeFundId);

  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  /** Opens amend modal; drawer closes so the modal is the only focus */
  const [amendPipelineId, setAmendPipelineId] = useState<string | null>(null);

  const handlePipelineClick = (id: string) => {
    setActivePipelineId(id);
  };

  const handleDrawerClose = () => {
    setActivePipelineId(null);
  };

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const drawerOpen = activePipelineId !== null;

  const listContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageListHeader label="Lists" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-gray-100 px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold accent-title">Your lists</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">
                  {pipelines.length} {activeFundId === "all" ? "total" : "in fund"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetToMock();
                    setActivePipelineId(null);
                    toast.success("Reset to 3 demo lists");
                  }}
                  className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  title="Reset to 3 demo lists"
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
                const count = getPipelineMembers(relationships, pipeline).length;
                const summary = formatFilterSummary(pipeline.filterCriteria);
                const isSelected = activePipelineId === pipeline.id;
                return (
                  <button
                    key={pipeline.id}
                    type="button"
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
                No lists yet. Save a filtered view as a list from Relationships, or reset demo for sample lists.
              </div>
            )}
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
        title={activePipeline?.name ?? "List"}
        listContextDrawerLayout
        section2MinHeightClassName="min-h-0"
        section1Content={
          activePipeline ? (
            <PipelineDrawerContent pipeline={activePipeline} relationships={relationships} />
          ) : (
            <p className="text-sm text-gray-500">No list selected</p>
          )
        }
        section2Content={
          activePipeline ? (
            <ListDrawerWorkflows pipelineId={activePipeline.id} router={router} />
          ) : null
        }
        hideSection2={!activePipeline}
        section3Entries={[]}
        section3Custom={
          activePipeline ? (
            <ListDrawerActions
              pipelineId={activePipeline.id}
              onClose={handleDrawerClose}
              router={router}
              onOpenAmend={() => {
                setAmendPipelineId(activePipeline.id);
                handleDrawerClose();
              }}
            />
          ) : null
        }
      />

      <AmendListModal
        open={amendPipelineId !== null}
        pipeline={pipelines.find((p) => p.id === amendPipelineId) ?? null}
        relationships={relationships}
        onClose={() => setAmendPipelineId(null)}
        onConfirm={(excludedIds, addedIds) => {
          if (!amendPipelineId) return;
          updatePipeline(amendPipelineId, {
            excludedRelationshipIds: excludedIds,
            addedRelationshipIds: addedIds,
          });
          toast.success("List updated");
          setAmendPipelineId(null);
        }}
      />
    </>
  );
}

function ListDrawerWorkflows({
  pipelineId,
  router,
}: {
  pipelineId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const workflows = useMemo(
    () => suggestedPlaybooks.filter((pb) => pb.pipelineId === pipelineId && pb.enabled !== false),
    [pipelineId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" data-testid="list-drawer-workflows">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Active workflows</p>
      {workflows.length === 0 ? (
        <p className="text-xs text-gray-500">No workflows linked to this list yet.</p>
      ) : (
        <ul className="space-y-2">
          {workflows.map((pb) => (
            <li key={pb.id}>
              <button
                type="button"
                onClick={() => {
                  const q = new URLSearchParams({ playbook: pb.id, pipelineId });
                  router.push(`/workflows?${q.toString()}`);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/40"
              >
                <span className="font-semibold text-gray-900">{pb.name}</span>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{pb.summary}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListDrawerActions({
  pipelineId,
  onClose,
  router,
  onOpenAmend,
}: {
  pipelineId: string;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  onOpenAmend: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3" data-testid="list-drawer-actions">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Actions</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          onClick={onOpenAmend}
        >
          Amend list
        </button>
        <button
          type="button"
          className="button-primary rounded-md px-3 py-2 text-sm font-medium"
          onClick={() => {
            onClose();
            router.push(
              `/workflows?openList=${encodeURIComponent(pipelineId)}&attach=1`
            );
          }}
        >
          Create workflow
        </button>
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

function PipelineDrawerContent({
  pipeline,
  relationships,
}: {
  pipeline: Pipeline;
  relationships: Relationship[];
}) {
  const filteredRels = useMemo(
    () => getPipelineMembers(relationships, pipeline),
    [relationships, pipeline]
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
  }, [stageCounts]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
        <p className="text-xs text-gray-600">
          {total} relationship{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Funnel by stage</p>
        <div ref={funnelRef} className="relative" style={{ height: 100 }}>
          {linePoints && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ overflow: "visible" }}
              aria-hidden
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
              const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
              const barHeight = Math.max((count / maxCount) * 72, count > 0 ? 12 : 6);
              const bgColor = STAGE_COLORS[stage];
              const isPass = stage === "Pass";
              return (
                <div
                  key={stage}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${stage}: ${count}`}
                >
                  <div className="flex min-h-[60px] w-full flex-1 items-center justify-center">
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
                  <span className="line-clamp-2 w-full break-words text-center text-[10px] text-gray-700">
                    {stage}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Companies by stage</p>
        <div className="max-h-[min(320px,40vh)] space-y-3 overflow-y-auto pr-1">
          {STAGE_OPTIONS.map((stage) => (
            <div key={stage}>
              <p className="text-xs font-semibold text-gray-700">
                {stage}{" "}
                <span className="font-normal text-gray-500">({byStage[stage].length})</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {byStage[stage].length ? (
                  byStage[stage].map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex max-w-full truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200"
                      title={r.firm}
                    >
                      {r.firm}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No companies in this stage</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
