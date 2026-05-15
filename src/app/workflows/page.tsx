"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { WorkflowDetailDrawer } from "@/components/workflow-detail-drawer";
import { WorkflowAttachModal } from "@/components/workflow-attach-modal";
import {
  suggestedPlaybooks,
  tomoDefaultWorkflows,
} from "@/lib/mockPlaybooks";
import { usePipelines } from "@/lib/use-pipelines";
import { useFunds } from "@/components/fund-provider";
import { useRelationships } from "@/components/relationships-provider";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers, isManualList } from "@/lib/pipelines";
import { useRequireSession } from "@/lib/auth";
import { workflowDefinitionFromCustomStored } from "@/lib/customPlaybooks";
import { usePersistentState } from "@/lib/usePersistentState";
import { useCustomPlaybooksPersistentState } from "@/lib/use-custom-playbooks-state";
import { DEFAULT_TEMPLATES, TOMO_DEFAULT_TEMPLATES, type WorkflowDefinition } from "@/lib/workflow-templates";

type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

const WORKFLOW_PLAYBOOK_ALIASES: Record<string, string> = {
  "pb-ny-roadshow-2026": "pb-trip-orchestrator",
  "pb-roadshow-prep": "pb-trip-orchestrator",
  "pb-update-followup": "pb-themed-outreach",
};

const WORKFLOW_DEFAULT_ALIASES: Record<string, string> = {
  "pb-post-meeting": "td-post-meeting-execution",
  "pb-three-touch-qualification": "td-three-touch-qualification",
  "td-meeting-notes": "td-post-meeting-execution",
};

function WorkflowsPageContent() {
  const { ready } = useRequireSession();
  const { relationships } = useRelationships();
  const searchParams = useSearchParams();
  const router = useRouter();
  const openListFromUrl = searchParams.get("openList") ?? searchParams.get("pipelineId");
  const attachFromUrl = searchParams.get("attach") === "1";

  const { activeFundId } = useFunds();
  const { pipelines } = usePipelines(activeFundId);

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [selectedTomoDefaultId, setSelectedTomoDefaultId] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [playbookOverrides, setPlaybookOverrides] = usePersistentState<PlaybookPipelineOverrides>(
    "tomo-playbook-pipeline-overrides",
    {}
  );
  const [workflowEnabledOverrides, setWorkflowEnabledOverrides] = usePersistentState<Record<string, boolean>>(
    "tomo-workflow-enabled-overrides-v1",
    {}
  );
  const [customPlaybooks] = useCustomPlaybooksPersistentState();
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  const [workflowDefOverrides, setWorkflowDefOverrides, workflowOverridesReady] = usePersistentState<
    Record<string, WorkflowDefinition>
  >("tomo-workflow-definition-overrides-v2", {});

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [highlightVersion, setHighlightVersion] = useState(0);

  const selectedPlaybook = useMemo(
    () => suggestedPlaybooks.find((p) => p.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId]
  );

  const selectedCustomPlaybook = useMemo(
    () => customPlaybooks.find((c) => c.id === selectedPlaybookId) ?? null,
    [customPlaybooks, selectedPlaybookId]
  );

  const selectedTomoDefault = useMemo(
    () => tomoDefaultWorkflows.find((w) => w.id === selectedTomoDefaultId) ?? null,
    [selectedTomoDefaultId]
  );

  const hasDrawerSelection =
    Boolean(selectedPlaybook) || Boolean(selectedCustomPlaybook) || Boolean(selectedTomoDefault);
  const selectedName =
    selectedPlaybook?.name ?? selectedCustomPlaybook?.name ?? selectedTomoDefault?.name ?? null;

  const workflowRowId =
    selectedPlaybook?.id ?? selectedCustomPlaybook?.id ?? selectedTomoDefaultId ?? null;

  const baseWorkflow = useMemo((): WorkflowDefinition | null => {
    if (selectedPlaybook) return DEFAULT_TEMPLATES[selectedPlaybook.type];
    if (selectedCustomPlaybook) return workflowDefinitionFromCustomStored(selectedCustomPlaybook);
    if (selectedTomoDefaultId && TOMO_DEFAULT_TEMPLATES[selectedTomoDefaultId]) {
      return TOMO_DEFAULT_TEMPLATES[selectedTomoDefaultId];
    }
    return null;
  }, [selectedPlaybook, selectedCustomPlaybook, selectedTomoDefaultId]);

  const effectiveEnabled = useCallback(
    (rowId: string, defaultEnabled: boolean) => workflowEnabledOverrides[rowId] ?? defaultEnabled,
    [workflowEnabledOverrides]
  );

  const toggleRowEnabled = useCallback(
    (rowId: string, defaultEnabled: boolean) => {
      const next = !effectiveEnabled(rowId, defaultEnabled);
      setWorkflowEnabledOverrides((prev) => ({ ...prev, [rowId]: next }));
    },
    [effectiveEnabled, setWorkflowEnabledOverrides]
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (!workflowRowId || !baseWorkflow) {
        setWorkflow(null);
        return;
      }
      if (!workflowOverridesReady) {
        setWorkflow(baseWorkflow);
        return;
      }
      setWorkflow(workflowDefOverrides[workflowRowId] ?? baseWorkflow);
    });
  }, [workflowRowId, baseWorkflow, workflowDefOverrides, workflowOverridesReady]);

  /** Deep link: open list + optional attach modal */
  useEffect(() => {
    if (!openListFromUrl || !pipelines.length) return;
    const p = pipelines.find((x) => x.id === openListFromUrl);
    if (!p) return;
    queueMicrotask(() => {
      setSelectedPipelineId(p.id);
      if (attachFromUrl) setAttachModalOpen(true);
    });
    router.replace("/workflows", { scroll: false });
  }, [openListFromUrl, attachFromUrl, pipelines, router]);

  /** Deep link: ?playbook= — select list + workflow row */
  useEffect(() => {
    const raw = searchParams.get("playbook");
    const defaultAlias = raw ? WORKFLOW_DEFAULT_ALIASES[raw] : undefined;
    if (defaultAlias) {
      queueMicrotask(() => {
        setSelectedTomoDefaultId(defaultAlias);
        setSelectedPlaybookId(null);
      });
      router.replace("/workflows", { scroll: false });
      return;
    }
    const pb = raw ? WORKFLOW_PLAYBOOK_ALIASES[raw] ?? raw : raw;
    if (!pb) return;
    const sp = suggestedPlaybooks.find((x) => x.id === pb);
    const cp = customPlaybooks.find((c) => c.id === pb);
    if (!sp && !cp) return;
    const pid = sp
      ? playbookOverrides[sp.id]?.pipelineId ?? sp.pipelineId
      : playbookOverrides[pb]?.pipelineId;
    queueMicrotask(() => {
      if (pid) setSelectedPipelineId(pid);
      setSelectedPlaybookId(pb);
      setSelectedTomoDefaultId(null);
    });
    router.replace("/workflows", { scroll: false });
  }, [searchParams, playbookOverrides, customPlaybooks, router]);

  useEffect(() => {
    const raw = searchParams.get("tomoDefault");
    const td = raw ? WORKFLOW_DEFAULT_ALIASES[raw] ?? raw : raw;
    if (!td?.startsWith("td-")) return;
    queueMicrotask(() => {
      setSelectedTomoDefaultId(td);
      setSelectedPlaybookId(null);
    });
    router.replace("/workflows", { scroll: false });
  }, [searchParams, router]);

  const handleSelectPlaybook = useCallback((id: string) => {
    setSelectedPlaybookId(id);
    setSelectedTomoDefaultId(null);
  }, []);

  const handleSelectTemplateForCurrentList = useCallback(
    (id: string) => {
      if (selectedPipelineId) {
        setPlaybookOverrides((prev) => ({
          ...prev,
          [id]: { pipelineId: selectedPipelineId },
        }));
      }
      handleSelectPlaybook(id);
    },
    [handleSelectPlaybook, selectedPipelineId, setPlaybookOverrides]
  );

  const handleSelectTomoDefault = useCallback((id: string) => {
    setSelectedTomoDefaultId(id);
    setSelectedPlaybookId(null);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedPlaybookId(null);
    setSelectedTomoDefaultId(null);
  }, []);

  const handleResetWorkflow = useCallback(() => {
    if (!workflowRowId) {
      toast.error("Nothing to reset");
      return;
    }
    setWorkflowDefOverrides((prev) => {
      const next = { ...prev };
      delete next[workflowRowId];
      return next;
    });
    if (selectedPlaybook) {
      setWorkflow(DEFAULT_TEMPLATES[selectedPlaybook.type]);
    } else if (selectedCustomPlaybook) {
      setWorkflow(workflowDefinitionFromCustomStored(selectedCustomPlaybook));
    } else if (selectedTomoDefaultId && TOMO_DEFAULT_TEMPLATES[selectedTomoDefaultId]) {
      setWorkflow(TOMO_DEFAULT_TEMPLATES[selectedTomoDefaultId]);
    }
    setHighlightVersion((v) => v + 1);
    toast.success("Workflow reset to default");
  }, [
    workflowRowId,
    setWorkflowDefOverrides,
    selectedPlaybook,
    selectedCustomPlaybook,
    selectedTomoDefaultId,
  ]);

  const handleWorkflowUpdate = useCallback(
    (def: WorkflowDefinition) => {
      if (workflowRowId) {
        setWorkflowDefOverrides((prev) => ({ ...prev, [workflowRowId]: def }));
      }
      setWorkflow(def);
      setHighlightVersion((v) => v + 1);
    },
    [workflowRowId, setWorkflowDefOverrides]
  );

  const pipelineContext = useMemo(() => {
    const rowId = selectedPlaybook?.id ?? selectedCustomPlaybook?.id ?? null;
    if (!rowId) return null;
    const override = playbookOverrides[rowId];
    const pipelineId = override?.pipelineId ?? selectedPlaybook?.pipelineId;
    if (!pipelineId) return null;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return null;
    const rels = getPipelineMembers(relationships, pipeline);
    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      relationshipIds: rels.map((r) => r.id),
      relationshipCount: rels.length,
    };
  }, [selectedPlaybook, selectedCustomPlaybook, playbookOverrides, pipelines, relationships]);

  const playbookPipelineBanner = useMemo(() => {
    if (selectedTomoDefault) return null;
    const rowId = selectedPlaybook?.id ?? selectedCustomPlaybook?.id ?? null;
    if (!rowId) return null;
    const override = playbookOverrides[rowId];
    const pipelineId = override?.pipelineId ?? selectedPlaybook?.pipelineId;
    if (!pipelineId) return null;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) {
      return { kind: "missing" as const, pipelineId };
    }
    const count = getPipelineMembers(relationships, pipeline).length;
    const filterSummary = isManualList(pipeline)
      ? (pipeline.manualDescription ?? "Manual list")
      : formatFilterSummary(pipeline.filterCriteria);
    return {
      kind: "ok" as const,
      name: pipeline.name,
      count,
      filterSummary,
    };
  }, [selectedPlaybook, selectedCustomPlaybook, selectedTomoDefault, playbookOverrides, pipelines, relationships]);

  const outboundAudienceCount = pipelineContext?.relationshipCount ?? 0;

  const previewLp = useMemo(() => {
    if (pipelineContext?.relationshipIds.length) {
      const id = pipelineContext.relationshipIds[0];
      const r = relationships.find((x) => x.id === id);
      if (r) return { name: r.name, firm: r.firm };
    }
    const r0 = relationships[0];
    return r0 ? { name: r0.name, firm: r0.firm } : null;
  }, [pipelineContext, relationships]);

  const selectedPipeline = useMemo(
    () => (selectedPipelineId ? pipelines.find((p) => p.id === selectedPipelineId) ?? null : null),
    [pipelines, selectedPipelineId]
  );

  useEffect(() => {
    if (selectedPipelineId || pipelines.length === 0) return;
    queueMicrotask(() => setSelectedPipelineId(pipelines[0]?.id ?? null));
  }, [pipelines, selectedPipelineId]);

  const filteredPipelines = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return pipelines;
    return pipelines.filter((p) => p.name.toLowerCase().includes(q));
  }, [listQuery, pipelines]);

  const selectedPipelineMeta = useMemo(() => {
    if (!selectedPipeline) return null;
    const count = getPipelineMembers(relationships, selectedPipeline).length;
    const filterSummary = isManualList(selectedPipeline)
      ? (selectedPipeline.manualDescription ?? "Manual list")
      : formatFilterSummary(selectedPipeline.filterCriteria).replace(/^Tomo:\s*/i, "").trim();
    return {
      count,
      mode: isManualList(selectedPipeline) ? "Manual" : "Live",
      filterSummary,
    };
  }, [relationships, selectedPipeline]);

  const drawerOpen = hasDrawerSelection && Boolean(workflow);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--tomo-bg)]">
      <PageListHeader label="Workflows" />

      <div className="flex min-h-0 flex-1">
        {/* Left rail — fund-scoped lists, matching the workflows reference layout. */}
        <aside className="flex w-[250px] shrink-0 flex-col border-r border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-4 py-4">
            <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]">
              Workflows
            </p>
            <label className="flex items-center gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_80%,var(--tomo-bg))] px-2.5 py-1.5 shadow-inner">
              <MagnifyingGlassIcon className="h-3.5 w-3.5 text-[color:var(--tomo-mute)]" />
              <input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
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
                {filteredPipelines.map((p) => {
                const count = getPipelineMembers(relationships, p).length;
                const sel = selectedPipelineId === p.id;
                const manual = isManualList(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPipelineId(p.id)}
                    className={`w-full rounded-[var(--tomo-radius-sm)] px-3 py-2.5 text-left transition ${
                      sel
                        ? "bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_82%,var(--tomo-card))] shadow-[inset_3px_0_0_var(--tomo-teal)]"
                        : "hover:bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_45%,transparent)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--foreground)]">{p.name}</p>
                      <span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
                        {count}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]">
                      <span className={manual ? "text-[color:var(--tomo-mute)]" : "text-[color:var(--tomo-teal)]"}>
                        {manual ? "Manual" : "Live"}
                      </span>
                      <span>·</span>
                      <span>{sel ? "Selected" : "1 running"}</span>
                    </p>
                  </button>
                );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Main pane — selected list header + 4 workflow cards. */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_70%,var(--tomo-bg))]">
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-7 py-5">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]">
              List
              {selectedPipeline ? ` · ${selectedPipeline.name}` : ""}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-newsreader)] text-[28px] font-medium leading-none text-[color:var(--foreground)] [font-variation-settings:'opsz'_28]">
              {selectedPipeline?.name ?? "Select a list"}
            </h1>
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
            <WorkflowSectionDivider label="Tomo defaults" count="2 workflows · structurally locked · content editable per run" />
            <div className="space-y-3">
              {tomoDefaultWorkflows.map((wf) => (
                <WorkflowSurfaceCard
                  key={wf.id}
                  name={wf.name}
                  badge="Default"
                  flow={`${wf.trigger} · ${wf.action}`}
                  enabled={effectiveEnabled(wf.id, wf.enabled)}
                  isSelected={selectedTomoDefaultId === wf.id}
                  primaryStat={wf.id === "td-post-meeting-execution" ? "42" : "14"}
                  primaryLabel={wf.id === "td-post-meeting-execution" ? "Done last 30d" : "Running now"}
                  secondaryStat={wf.id === "td-three-touch-qualification" ? "28" : undefined}
                  secondaryLabel={wf.id === "td-three-touch-qualification" ? "Done last 30d" : undefined}
                  onSelect={() => handleSelectTomoDefault(wf.id)}
                  onToggleEnabled={() => toggleRowEnabled(wf.id, wf.enabled)}
                  locked
                />
              ))}
            </div>

            <div className="mt-6">
              <WorkflowSectionDivider label="Tailored" count="2 workflows · parameterized per run" />
              <div className="space-y-3">
                {suggestedPlaybooks.map((pb) => (
                  <WorkflowSurfaceCard
                    key={pb.id}
                    name={pb.name}
                    badge={pb.type === "trip_orchestrator" ? "Saved configuration" : "Starting template"}
                    flow={pb.summary}
                    enabled={effectiveEnabled(pb.id, pb.enabled)}
                    isSelected={selectedPlaybookId === pb.id && selectedTomoDefaultId === null}
                    primaryStat={pb.type === "trip_orchestrator" ? "3-5d" : "2w"}
                    primaryLabel={pb.type === "trip_orchestrator" ? "Incremental build" : "Base implementation"}
                    onSelect={() => handleSelectTemplateForCurrentList(pb.id)}
                    onToggleEnabled={() => toggleRowEnabled(pb.id, pb.enabled)}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <WorkflowAttachModal
        open={attachModalOpen}
        pipeline={selectedPipeline}
        relationships={relationships}
        customPlaybooks={customPlaybooks}
        onClose={() => setAttachModalOpen(false)}
        setPlaybookOverrides={setPlaybookOverrides}
        onLinkedPlaybook={(id) => {
          handleSelectPlaybook(id);
        }}
      />

      {drawerOpen && workflow ? (
        <WorkflowDetailDrawer
          open={drawerOpen}
          title={selectedName ?? "Workflow"}
          onClose={handleCloseDrawer}
          onReset={handleResetWorkflow}
          workflow={workflow}
          highlightVersion={highlightVersion}
          playbookPipelineBanner={playbookPipelineBanner}
          outboundAudienceCount={outboundAudienceCount}
          playbookName={selectedName ?? ""}
          playbookType={selectedPlaybook?.type}
          pipelineContext={pipelineContext}
          onWorkflowUpdate={handleWorkflowUpdate}
          headerNote={
            selectedTomoDefault ? (
              <p className="text-xs text-[color:var(--tomo-mute)]">Locked default · structure fixed · content settings editable</p>
            ) : undefined
          }
          previewLp={previewLp}
          workflowRowId={workflowRowId}
          activityLogListName={
            playbookPipelineBanner?.kind === "ok"
              ? playbookPipelineBanner.name
              : pipelineContext?.pipelineName ?? null
          }
          activityLogIsGlobal={Boolean(selectedTomoDefault)}
        />
      ) : null}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="workflows"
      listContent={listContent}
      detailContent={null}
      detailVisible={false}
      contextTitle={selectedName ?? undefined}
      assistantChips={
        drawerOpen
          ? ["Add a wait step", "Remove the last step", "Change the trigger", "Add an escalation step"]
          : undefined
      }
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
      <div className="text-sm text-[color:var(--tomo-mute)]">Loading workflows…</div>
    </div>
  );
}

function ActiveToggle({
  enabled,
  onToggle,
  showLabel = true,
  disabled = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  showLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-[color:var(--tomo-rule-soft)] px-2 py-2">
      {showLabel ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">Active</span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        aria-label={enabled ? "Active: on" : "Active: off"}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        className={`relative h-7 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tomo-teal)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? "bg-[color:var(--tomo-status-green)]" : "bg-[color:color-mix(in_srgb,var(--tomo-mute)_48%,var(--tomo-rule))]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-[color:var(--tomo-card)] shadow transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
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

function WorkflowSurfaceCard({
  name,
  badge,
  flow,
  enabled,
  isSelected,
  primaryStat,
  primaryLabel,
  secondaryStat,
  secondaryLabel,
  onSelect,
  onToggleEnabled,
  locked = false,
}: {
  name: string;
  badge: string;
  flow: string;
  enabled: boolean;
  isSelected: boolean;
  primaryStat?: string;
  primaryLabel?: string;
  secondaryStat?: string;
  secondaryLabel?: string;
  onSelect: () => void;
  onToggleEnabled: () => void;
  locked?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[72px] items-stretch rounded-[var(--tomo-radius-sm)] border shadow-[var(--tomo-shadow-1)] transition ${
        isSelected
          ? "border-[color:var(--tomo-teal)] bg-[color:color-mix(in_srgb,var(--tomo-teal)_9%,var(--tomo-card))] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-teal)_24%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))]"
      }`}
    >
      <ActiveToggle enabled={enabled} onToggle={onToggleEnabled} showLabel={false} />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-[family-name:var(--font-newsreader)] text-[17px] font-medium leading-snug text-[color:var(--foreground)] [font-variation-settings:'opsz'_20]">
            {name}
          </p>
          <span className="inline-flex items-center gap-1 rounded-[2px] bg-[color:color-mix(in_srgb,var(--tomo-teal)_10%,transparent)] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--tomo-teal)]">
            {locked ? "Locked · " : ""}
            {badge}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--tomo-body)]" title={flow}>
          {flow}
        </p>
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-[180px] shrink-0 items-center justify-end gap-6 border-l border-[color:var(--tomo-rule-soft)] px-4 py-3 text-right"
      >
        {primaryStat && primaryLabel ? (
          <span>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
              {primaryStat}
            </span>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              {primaryLabel}
            </span>
          </span>
        ) : null}
        {secondaryStat && secondaryLabel ? (
          <span>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
              {secondaryStat}
            </span>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              {secondaryLabel}
            </span>
          </span>
        ) : null}
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
          View flow
        </span>
      </button>
    </div>
  );
}
