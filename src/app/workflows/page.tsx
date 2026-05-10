"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { WorkflowDetailDrawer } from "@/components/workflow-detail-drawer";
import { WorkflowAttachModal } from "@/components/workflow-attach-modal";
import {
  suggestedPlaybooks,
  Playbook,
  tomoDefaultWorkflows,
  type TomoDefaultWorkflow,
} from "@/lib/mockPlaybooks";
import { usePipelines } from "@/lib/use-pipelines";
import { useFunds } from "@/components/fund-provider";
import { useRelationships } from "@/components/relationships-provider";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers, isManualList } from "@/lib/pipelines";
import { useRequireSession } from "@/lib/auth";
import { type CustomPlaybookStored, workflowDefinitionFromCustomStored } from "@/lib/customPlaybooks";
import { usePersistentState } from "@/lib/usePersistentState";
import { useCustomPlaybooksPersistentState } from "@/lib/use-custom-playbooks-state";
import { DEFAULT_TEMPLATES, TOMO_DEFAULT_TEMPLATES, type WorkflowDefinition } from "@/lib/workflow-templates";

type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

function stubPlaybookCardRow(c: CustomPlaybookStored): Playbook {
  return {
    id: c.id,
    name: c.name,
    type: "roadshow_prep",
    description: c.trigger,
    summary: c.action,
    createdAt: c.createdAt,
    enabled: true,
  };
}

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
    const pb = raw === "pb-ny-roadshow-2026" ? "pb-roadshow-prep" : raw;
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
    const td = searchParams.get("tomoDefault");
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

  const listWorkflowRows = useMemo(() => {
    if (!selectedPipelineId) return [];
    const rows: Array<{ id: string; playbook: Playbook }> = [];
    for (const pb of suggestedPlaybooks) {
      const pid = playbookOverrides[pb.id]?.pipelineId ?? pb.pipelineId;
      if (pid === selectedPipelineId) rows.push({ id: pb.id, playbook: pb });
    }
    for (const c of customPlaybooks) {
      const pid = playbookOverrides[c.id]?.pipelineId;
      if (pid === selectedPipelineId) rows.push({ id: c.id, playbook: stubPlaybookCardRow(c) });
    }
    return rows;
  }, [selectedPipelineId, playbookOverrides, customPlaybooks]);

  const selectedPipeline = useMemo(
    () => (selectedPipelineId ? pipelines.find((p) => p.id === selectedPipelineId) ?? null : null),
    [pipelines, selectedPipelineId]
  );

  const drawerOpen = hasDrawerSelection && Boolean(workflow);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PageListHeader label="Workflows" />

      <div className="flex min-h-0 flex-1">
        {/* Column 1 — fund-scoped lists */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <p className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
            Lists
          </p>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
            {pipelines.length === 0 ? (
              <p className="px-2 text-xs text-[color:var(--tomo-mute)]">No lists for this fund.</p>
            ) : (
              pipelines.map((p) => {
                const count = getPipelineMembers(relationships, p).length;
                const sel = selectedPipelineId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPipelineId(p.id)}
                    className={`w-full rounded-[var(--tomo-radius-md)] border px-3 py-2.5 text-left text-sm shadow-[var(--tomo-shadow-1)] transition ${
                      sel
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
                        : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))]"
                    }`}
                  >
                    <p className="font-semibold text-[color:var(--foreground)]">{p.name}</p>
                    <p className="text-[11px] text-[color:var(--tomo-mute)]">{count} relationships</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2 — Tomo Default + workflows for selected list */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_38%,var(--tomo-card))]">
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Tomo Default</p>
            <p className="text-xs text-[color:var(--tomo-body)]">Global automations — not tied to a list</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tomoDefaultWorkflows.map((wf) => (
                <TomoDefaultWorkflowPill
                  key={wf.id}
                  workflow={wf}
                  enabled={effectiveEnabled(wf.id, wf.enabled)}
                  isSelected={selectedTomoDefaultId === wf.id}
                  onSelect={() => handleSelectTomoDefault(wf.id)}
                  onToggleEnabled={() => toggleRowEnabled(wf.id, wf.enabled)}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!selectedPipeline ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm font-medium text-[color:var(--foreground)]">Select a list</p>
                  <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
                    Choose a fund list on the left to see and attach workflows.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)]">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">User Custom</p>
                    <p className="mt-0.5 text-xs leading-snug text-[color:var(--tomo-body)]">
                      Workflows linked to your selected list. Open one to edit, or create from a template or with Tomo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachModalOpen(true)}
                    className="shrink-0 rounded-[var(--tomo-radius-md)] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:opacity-90"
                  >
                    Create workflow
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {listWorkflowRows.length === 0 ? (
                    <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-8 text-center text-sm text-[color:var(--tomo-mute)] shadow-[var(--tomo-shadow-1)]">
                      No workflows linked yet. Use Create workflow to link a template or build a custom one with Tomo.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {listWorkflowRows.map((row) => (
                        <li key={row.id}>
                          <WorkflowListRow
                            playbook={row.playbook}
                            enabled={effectiveEnabled(row.id, row.playbook.enabled)}
                            isSelected={selectedPlaybookId === row.id && selectedTomoDefaultId === null}
                            onSelect={() => handleSelectPlaybook(row.id)}
                            onToggleEnabled={() => toggleRowEnabled(row.id, row.playbook.enabled)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
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
              <p className="text-xs text-[color:var(--tomo-mute)]">Global — no CRM audience</p>
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

/** DD MMM YYYY (e.g. 08 Nov 2025) — date only, locale-friendly */
function formatWorkflowCardDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatWorkflowCardSubtitle(playbook: Playbook): string {
  const summary = (playbook.summary || playbook.description || "").trim();
  const created = playbook.createdAt ? formatWorkflowCardDate(playbook.createdAt) : "—";
  return `Created ${created}: ${summary}`;
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

function TomoDefaultWorkflowPill({
  workflow,
  enabled,
  isSelected,
  onSelect,
  onToggleEnabled,
}: {
  workflow: TomoDefaultWorkflow;
  enabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
}) {
  return (
    <div
      className={`flex max-w-full items-center gap-1 rounded-[var(--tomo-radius-md)] border px-2 py-1.5 shadow-[var(--tomo-shadow-1)] ${
        isSelected
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-semibold text-[color:var(--foreground)]">{workflow.name}</p>
      </button>
      <div className="flex items-center border-l border-transparent pl-1">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? `${workflow.name}: on` : `${workflow.name}: off`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled();
          }}
          className={`relative h-6 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tomo-teal)] ${
            enabled ? "bg-[color:var(--tomo-status-green)]" : "bg-[color:color-mix(in_srgb,var(--tomo-mute)_48%,var(--tomo-rule))]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[color:var(--tomo-card)] shadow transition-transform ${
              enabled ? "translate-x-3" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function WorkflowListRow({
  playbook,
  enabled,
  isSelected,
  onSelect,
  onToggleEnabled,
}: {
  playbook: Playbook;
  enabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
}) {
  const subtitle = formatWorkflowCardSubtitle(playbook);
  return (
    <div
      className={`flex items-stretch gap-0 rounded-[var(--tomo-radius-md)] border shadow-[var(--tomo-shadow-1)] transition ${
        isSelected
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))]"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-3 py-3 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{playbook.name}</p>
          {playbook.comingSoonLabel ? (
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_78%,var(--tomo-card))] px-2 py-0.5 text-[10px] font-medium text-[color:var(--tomo-body)]">
              {playbook.comingSoonLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[color:var(--tomo-mute)] break-words" title={subtitle}>
          {subtitle}
        </p>
      </button>
      <ActiveToggle
        enabled={enabled}
        onToggle={onToggleEnabled}
        disabled={Boolean(playbook.comingSoonLabel)}
      />
    </div>
  );
}
