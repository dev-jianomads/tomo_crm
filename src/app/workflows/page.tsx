"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { WorkflowExpandedBody } from "@/components/workflow-expanded-body";
import {
  WorkflowStepActionDrawer,
  type WorkflowStepActionSelection,
} from "@/components/workflow-step-action-drawer";
import { WorkflowBuildModal } from "@/components/workflow-build-modal";
import type { PlaybookPipelineOverrides } from "@/components/link-workflow-modal-v1";
import {
  customPlaybookToSurfaceEntry,
  isUserCustomWorkflowEntry,
} from "@/lib/custom-playbook-surface";
import { loadCustomPlaybooks, removeCustomPlaybook, type CustomPlaybookStored } from "@/lib/customPlaybooks";
import { useCustomPlaybooksPersistentState } from "@/lib/use-custom-playbooks-state";
import { useFunds } from "@/components/fund-provider";
import { useRelationships } from "@/components/relationships-provider";
import { useRequireSession } from "@/lib/auth";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers, isManualList } from "@/lib/pipelines";
import { usePersistentState } from "@/lib/usePersistentState";
import { usePipelines } from "@/lib/use-pipelines";
import {
  workflowSurfaceEntries,
  type WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";

type WorkflowActivationOverrides = Record<string, boolean>;
type HiddenWorkflowIds = string[];

type WorkflowDeleteTarget = {
  id: string;
  name: string;
  kind: "tailored" | "custom";
};

const WORKFLOW_ALIASES: Record<string, string> = {
  "pb-post-meeting": "wf-post-meeting-execution",
  "td-post-meeting-execution": "wf-post-meeting-execution",
  "td-meeting-notes": "wf-post-meeting-execution",
  "pb-three-touch-qualification": "wf-f7-three-touch",
  "td-three-touch-qualification": "wf-f7-three-touch",
  "pb-themed-outreach": "wf-themed-outreach",
  "pb-update-followup": "wf-themed-outreach",
  "pb-trip-orchestrator": "wf-trip-orchestrator",
  "pb-roadshow-prep": "wf-trip-orchestrator",
  "pb-ny-roadshow-2026": "wf-trip-orchestrator",
};

function normalizeWorkflowId(id: string | null): string | null {
  if (!id) return null;
  return WORKFLOW_ALIASES[id] ?? id;
}

function WorkflowsPageContent() {
  const { ready } = useRequireSession();
  const { relationships } = useRelationships();
  const { activeFundId } = useFunds();
  const { pipelines } = usePipelines(activeFundId);

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string>(workflowSurfaceEntries[1]?.id ?? workflowSurfaceEntries[0]?.id ?? "");
  const [stepActionSelection, setStepActionSelection] = useState<WorkflowStepActionSelection | null>(null);
  const [workflowActivationOverrides, setWorkflowActivationOverrides] =
    usePersistentState<WorkflowActivationOverrides>("tomo-workflow-surface-activation-overrides-v1", {});
  const [hiddenWorkflowIds, setHiddenWorkflowIds] = usePersistentState<HiddenWorkflowIds>(
    "tomo-workflow-surface-hidden-ids-v1",
    []
  );
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDeleteTarget | null>(null);
  const [customPlaybooks, setCustomPlaybooks] = useCustomPlaybooksPersistentState();
  const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookPipelineOverrides>(
    "tomo-playbook-pipeline-overrides",
    {}
  );
  const [buildModalOpen, setBuildModalOpen] = useState(false);

  useEffect(() => {
    if (selectedPipelineId || pipelines.length === 0) return;
    queueMicrotask(() => setSelectedPipelineId(pipelines[0]?.id ?? null));
  }, [pipelines, selectedPipelineId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingWorkflow = normalizeWorkflowId(params.get("workflow") ?? params.get("playbook") ?? params.get("tomoDefault"));
    const incomingList = params.get("openList") ?? params.get("pipelineId");
    const openBuild = params.get("build") === "1";

    if (incomingWorkflow) {
      const normalized = normalizeWorkflowId(incomingWorkflow) ?? incomingWorkflow;
      queueMicrotask(() => setExpandedWorkflowId(normalized));
    }
    if (incomingList && pipelines.some((pipeline) => pipeline.id === incomingList)) {
      queueMicrotask(() => setSelectedPipelineId(incomingList));
    }
    if (openBuild) {
      queueMicrotask(() => setBuildModalOpen(true));
    }
  }, [pipelines]);

  const selectedPipeline = useMemo(
    () => (selectedPipelineId ? pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? null : null),
    [pipelines, selectedPipelineId]
  );

  const selectedPipelineMeta = useMemo(() => {
    if (!selectedPipeline) return null;
    const count = getPipelineMembers(relationships, selectedPipeline).length;
    const manual = isManualList(selectedPipeline);
    const filterSummary = manual
      ? selectedPipeline.manualDescription?.trim() || "Manual list"
      : formatFilterSummary(selectedPipeline.filterCriteria).replace(/^Tomo:\s*/i, "").trim();

    return {
      count,
      mode: manual ? "Manual" : "Live",
      filterSummary,
    };
  }, [relationships, selectedPipeline]);

  const filteredPipelines = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return pipelines;
    return pipelines.filter((pipeline) => pipeline.name.toLowerCase().includes(q));
  }, [listQuery, pipelines]);

  const isCustomActivated = useCallback(
    (entryId: string) => workflowActivationOverrides[entryId] === true,
    [workflowActivationOverrides]
  );

  const activateCustomWorkflow = useCallback(
    (entryId: string) => {
      setWorkflowActivationOverrides((prev) => ({ ...prev, [entryId]: true }));
      toast.success("Workflow activated on this list");
    },
    [setWorkflowActivationOverrides]
  );

  const confirmDeleteWorkflow = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "custom") {
      removeCustomPlaybook(deleteTarget.id);
      setPlaybookOverrides((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setWorkflowActivationOverrides((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setCustomPlaybooks(loadCustomPlaybooks());
    } else {
      setHiddenWorkflowIds((prev) => (prev.includes(deleteTarget.id) ? prev : [...prev, deleteTarget.id]));
    }
    if (expandedWorkflowId === deleteTarget.id) {
      setExpandedWorkflowId("");
      setStepActionSelection(null);
    }
    toast.success(`Removed "${deleteTarget.name}" from this list`);
    setDeleteTarget(null);
  }, [
    deleteTarget,
    expandedWorkflowId,
    setCustomPlaybooks,
    setHiddenWorkflowIds,
    setPlaybookOverrides,
    setWorkflowActivationOverrides,
  ]);

  const toggleExpandedWorkflow = useCallback((entryId: string) => {
    setExpandedWorkflowId((prev) => (prev === entryId ? "" : entryId));
    setStepActionSelection(null);
  }, []);

  const defaultEntries = workflowSurfaceEntries.filter((entry) => entry.kind === "locked_default");
  const tailoredEntries = workflowSurfaceEntries.filter(
    (entry) => entry.kind === "configurable_template" && !hiddenWorkflowIds.includes(entry.id)
  );

  const customEntriesForList = useMemo(() => {
    if (!selectedPipelineId) return [];
    return customPlaybooks
      .filter((pb) => playbookOverrides[pb.id]?.pipelineId === selectedPipelineId)
      .map((pb) => customPlaybookToSurfaceEntry(pb, isCustomActivated(pb.id)));
  }, [customPlaybooks, selectedPipelineId, playbookOverrides, isCustomActivated]);

  const allDisplayEntries = useMemo(
    () => [...workflowSurfaceEntries, ...customEntriesForList],
    [customEntriesForList]
  );

  const expandedEntry = allDisplayEntries.find((entry) => entry.id === expandedWorkflowId) ?? null;

  const handleWorkflowBuilt = useCallback(
    (entry: CustomPlaybookStored) => {
      if (!selectedPipelineId) return;
      setPlaybookOverrides((prev) => ({
        ...prev,
        [entry.id]: { pipelineId: selectedPipelineId },
      }));
      setCustomPlaybooks(loadCustomPlaybooks());
      setExpandedWorkflowId(entry.id);
      toast.success(`Saved "${entry.name}" on this list`);
    },
    [selectedPipelineId, setPlaybookOverrides, setCustomPlaybooks]
  );

  const listContent = (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--tomo-bg)]">
      <PageListHeader label="Workflows" />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[250px] shrink-0 flex-col border-r border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-4 py-4">
            <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]">
              Workflows
            </p>
            <label className="flex items-center gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_80%,var(--tomo-bg))] px-2.5 py-1.5 shadow-inner">
              <MagnifyingGlassIcon className="h-3.5 w-3.5 text-[color:var(--tomo-mute)]" />
              <input
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Search lists..."
                className="min-w-0 flex-1 bg-transparent text-xs text-[color:var(--foreground)] placeholder:text-[color:var(--tomo-mute)] focus:outline-none"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <p className="mb-2 px-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">
              Your lists
            </p>
            {filteredPipelines.length === 0 ? (
              <p className="px-1 text-xs text-[color:var(--tomo-mute)]">No lists match this search.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredPipelines.map((pipeline) => {
                  const count = getPipelineMembers(relationships, pipeline).length;
                  const selected = selectedPipelineId === pipeline.id;
                  const manual = isManualList(pipeline);

                  return (
                    <button
                      key={pipeline.id}
                      type="button"
                      onClick={() => setSelectedPipelineId(pipeline.id)}
                      className={`w-full rounded-[var(--tomo-radius-sm)] px-3 py-2.5 text-left transition ${
                        selected
                          ? "bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_82%,var(--tomo-card))] shadow-[inset_3px_0_0_var(--tomo-teal)]"
                          : "hover:bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_45%,transparent)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--foreground)]">{pipeline.name}</p>
                        <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
                          {count}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]">
                        <span className={manual ? "text-[color:var(--tomo-mute)]" : "text-[color:var(--tomo-teal)]"}>
                          {manual ? "Manual" : "Live"}
                        </span>
                        <span>·</span>
                        <span>{selected ? "Selected" : "1 running"}</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_70%,var(--tomo-bg))]">
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-7 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]">
                  List{selectedPipeline ? ` · ${selectedPipeline.name}` : ""}
                </p>
                <h1 className="mt-1 font-[family-name:var(--font-newsreader)] text-[28px] font-medium leading-none text-[color:var(--foreground)] [font-variation-settings:'opsz'_28]">
                  {selectedPipeline?.name ?? "Select a list"}
                </h1>
              </div>
              <button
                type="button"
                data-testid="workflows-new-workflow-cta"
                disabled={!selectedPipeline}
                onClick={() => setBuildModalOpen(true)}
                title={selectedPipeline ? undefined : "Select a list on the left first"}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal)] px-3.5 py-2 text-xs font-medium text-white transition enabled:hover:bg-[color:var(--tomo-teal-muted)] disabled:cursor-not-allowed disabled:border-[color:var(--tomo-rule)] disabled:bg-[color:var(--tomo-navy-soft)] disabled:text-[color:var(--tomo-mute)]"
              >
                <PlusIcon className="h-3.5 w-3.5" aria-hidden />
                New workflow
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.08em] text-[color:var(--tomo-mute)]">
              {selectedPipelineMeta ? (
                <>
                  <span>
                    <span className="font-semibold text-[color:var(--foreground)]">{selectedPipelineMeta.count}</span> LPs
                  </span>
                  <span className="text-[color:var(--tomo-rule)]">·</span>
                  <span>
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--tomo-teal)]" />
                    {selectedPipelineMeta.mode} · auto-updating
                  </span>
                  <span className="text-[color:var(--tomo-rule)]">·</span>
                  <span className="normal-case tracking-normal">Filter: {selectedPipelineMeta.filterSummary}</span>
                </>
              ) : (
                <span>Choose a list on the left to configure workflow runs.</span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
            <WorkflowSectionDivider
              label="Tomo defaults"
              count={`${defaultEntries.length} workflows · active · monitor only`}
            />
            <div className="space-y-3">
              {defaultEntries.map((entry) => (
                <WorkflowAccordionCard
                  key={entry.id}
                  entry={entry}
                  expanded={expandedWorkflowId === entry.id}
                  onToggleExpanded={() => toggleExpandedWorkflow(entry.id)}
                  onStepAction={(selection) => setStepActionSelection(selection)}
                />
              ))}
            </div>

            <div className="mt-6">
              <WorkflowSectionDivider
                label="Tailored"
                count={`${tailoredEntries.length} workflows · active on this list · monitor only`}
              />
              <div className="space-y-3">
                {tailoredEntries.map((entry) => (
                  <WorkflowAccordionCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedWorkflowId === entry.id}
                    onToggleExpanded={() => toggleExpandedWorkflow(entry.id)}
                    onRequestDelete={() => setDeleteTarget({ id: entry.id, name: entry.name, kind: "tailored" })}
                    onStepAction={(selection) => setStepActionSelection(selection)}
                  />
                ))}
              </div>
            </div>

            {customEntriesForList.length > 0 ? (
              <div className="mt-6">
                <WorkflowSectionDivider
                  label="Built on this list"
                  count={`${customEntriesForList.length} custom workflow${customEntriesForList.length === 1 ? "" : "s"} · activate or delete`}
                />
                <div className="space-y-3">
                  {customEntriesForList.map((entry) => (
                    <WorkflowAccordionCard
                      key={entry.id}
                      entry={entry}
                      expanded={expandedWorkflowId === entry.id}
                      onToggleExpanded={() => toggleExpandedWorkflow(entry.id)}
                      onRequestDelete={() => setDeleteTarget({ id: entry.id, name: entry.name, kind: "custom" })}
                      onActivateCustom={
                        !isCustomActivated(entry.id) ? () => activateCustomWorkflow(entry.id) : undefined
                      }
                      onStepAction={(selection) => setStepActionSelection(selection)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
      <WorkflowBuildModal
        open={buildModalOpen}
        pipeline={selectedPipeline}
        onClose={() => setBuildModalOpen(false)}
        onWorkflowCreated={handleWorkflowBuilt}
      />
      <WorkflowStepActionDrawer selection={stepActionSelection} onClose={() => setStepActionSelection(null)} />
      <WorkflowDeleteConfirmDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteWorkflow}
      />
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="workflows"
      listContent={listContent}
      detailContent={null}
      detailVisible={false}
      contextTitle={expandedEntry?.name}
      assistantChips={expandedEntry ? ["Summarize activity", "Review waiting drafts", "Tune cadence"] : undefined}
    />
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsPageFallback />}>
      <WorkflowsPageContent />
    </Suspense>
  );
}

function WorkflowsPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-sm text-[color:var(--tomo-mute)]">Loading workflows...</div>
    </div>
  );
}

function WorkflowSectionDivider({ label, count }: { label: string; count: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] tracking-[0.12em] text-[color:var(--tomo-mute)]">
        {count}
      </span>
      <span className="h-px flex-1 bg-[color:var(--tomo-rule-soft)]" />
    </div>
  );
}

function WorkflowAccordionCard({
  entry,
  expanded,
  onToggleExpanded,
  onRequestDelete,
  onActivateCustom,
  onStepAction,
}: {
  entry: WorkflowSurfaceEntry;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRequestDelete?: () => void;
  onActivateCustom?: () => void;
  onStepAction: (selection: WorkflowStepActionSelection) => void;
}) {
  const customSaved = isUserCustomWorkflowEntry(entry) && entry.status === "inactive";
  const showDelete = entry.kind !== "locked_default" && Boolean(onRequestDelete);

  return (
    <article
      className={`overflow-hidden rounded-[var(--tomo-radius-sm)] border shadow-[var(--tomo-shadow-1)] transition ${
        expanded
          ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-teal)_18%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))]"
      } ${customSaved ? "opacity-90" : ""}`}
      data-testid={`workflow-accordion-card-${entry.id}`}
    >
      <div className="flex min-h-[72px] items-stretch">
        {showDelete ? (
          <div className="flex shrink-0 items-center justify-center border-r border-[color:var(--tomo-rule-soft)] px-3">
            <button
              type="button"
              aria-label={`Delete ${entry.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onRequestDelete?.();
              }}
              className="rounded-[var(--tomo-radius-sm)] p-1.5 text-[color:var(--tomo-mute)] transition hover:bg-[color:var(--tomo-status-red-bg)] hover:text-[color:var(--tomo-status-red)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tomo-teal)]"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <button type="button" onClick={onToggleExpanded} className="min-w-0 flex-1 px-4 py-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-newsreader)] text-[17px] font-medium leading-snug text-[color:var(--foreground)] [font-variation-settings:'opsz'_20]">
              {entry.name}
            </h2>
            <span className="rounded-[2px] bg-[color:color-mix(in_srgb,var(--tomo-teal)_10%,transparent)] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--tomo-teal)]">
              {entry.kind === "locked_default" ? "Locked · " : ""}
              {entry.badgeLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--tomo-body)]" title={entry.summary}>
            {entry.summary}
          </p>
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-[220px] shrink-0 items-center justify-end gap-6 border-l border-[color:var(--tomo-rule-soft)] px-4 py-3 text-right"
          aria-expanded={expanded}
        >
          {entry.stats.map((stat) => (
            <span key={stat.label}>
              <span className="block font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
                {stat.value}
              </span>
              <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
                {stat.label}
              </span>
            </span>
          ))}
          <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
            {expanded ? "Hide flow" : "View flow"}
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180 text-[color:var(--tomo-teal)]" : ""}`} />
          </span>
        </button>
      </div>

      {expanded ? (
        <WorkflowExpandedBody
          entry={entry}
          customSaved={customSaved}
          onActivateCustom={onActivateCustom}
          onStepAction={(stepEntry, step) => onStepAction({ entry: stepEntry, step })}
        />
      ) : null}
    </article>
  );
}

function WorkflowDeleteConfirmDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: WorkflowDeleteTarget | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[color:rgba(28,43,58,0.30)] backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-delete-title"
        className="relative z-[211] w-full max-w-md rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-5 shadow-[var(--tomo-modal-shadow)]"
      >
        <h2 id="workflow-delete-title" className="font-[family-name:var(--font-newsreader)] text-lg font-medium text-[color:var(--foreground)]">
          Remove workflow?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--tomo-body)]">
          <span className="font-semibold text-[color:var(--foreground)]">{target.name}</span> will be removed from
          this list. This cannot be undone in the demo.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-body)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-status-red)] bg-[color:var(--tomo-status-red)] px-3 py-1.5 text-xs font-medium text-white"
          >
            Delete workflow
          </button>
        </div>
      </div>
    </div>
  );
}
