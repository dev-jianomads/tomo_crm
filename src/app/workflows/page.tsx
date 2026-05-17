"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useFunds } from "@/components/fund-provider";
import { useRelationships } from "@/components/relationships-provider";
import { useRequireSession } from "@/lib/auth";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers, isManualList } from "@/lib/pipelines";
import { usePersistentState } from "@/lib/usePersistentState";
import { usePipelines } from "@/lib/use-pipelines";
import {
  workflowSurfaceEntries,
  type WorkflowAttentionItem,
  type WorkflowMetaItem,
  type WorkflowStateSummary,
  type WorkflowStepNode,
  type WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";

type WorkflowEnabledOverrides = Record<string, boolean>;

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
  const [workflowEnabledOverrides, setWorkflowEnabledOverrides] = usePersistentState<WorkflowEnabledOverrides>(
    "tomo-workflow-surface-enabled-overrides-v1",
    {}
  );

  useEffect(() => {
    if (selectedPipelineId || pipelines.length === 0) return;
    queueMicrotask(() => setSelectedPipelineId(pipelines[0]?.id ?? null));
  }, [pipelines, selectedPipelineId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingWorkflow = normalizeWorkflowId(params.get("workflow") ?? params.get("playbook") ?? params.get("tomoDefault"));
    const incomingList = params.get("openList") ?? params.get("pipelineId");

    if (incomingWorkflow && workflowSurfaceEntries.some((entry) => entry.id === incomingWorkflow)) {
      queueMicrotask(() => setExpandedWorkflowId(incomingWorkflow));
    }
    if (incomingList && pipelines.some((pipeline) => pipeline.id === incomingList)) {
      queueMicrotask(() => setSelectedPipelineId(incomingList));
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

  const effectiveEnabled = useCallback(
    (entry: WorkflowSurfaceEntry) => workflowEnabledOverrides[entry.id] ?? entry.status === "active",
    [workflowEnabledOverrides]
  );

  const toggleWorkflowEnabled = useCallback(
    (entry: WorkflowSurfaceEntry) => {
      const next = !effectiveEnabled(entry);
      setWorkflowEnabledOverrides((prev) => ({ ...prev, [entry.id]: next }));
    },
    [effectiveEnabled, setWorkflowEnabledOverrides]
  );

  const defaultEntries = workflowSurfaceEntries.filter((entry) => entry.kind === "locked_default");
  const tailoredEntries = workflowSurfaceEntries.filter((entry) => entry.kind === "configurable_template");
  const expandedEntry = workflowSurfaceEntries.find((entry) => entry.id === expandedWorkflowId) ?? null;

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
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]">
              List{selectedPipeline ? ` · ${selectedPipeline.name}` : ""}
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
            <WorkflowSectionDivider
              label="Tomo defaults"
              count={`${defaultEntries.length} workflows · structurally locked · content editable per run`}
            />
            <div className="space-y-3">
              {defaultEntries.map((entry) => (
                <WorkflowAccordionCard
                  key={entry.id}
                  entry={entry}
                  enabled={effectiveEnabled(entry)}
                  expanded={expandedWorkflowId === entry.id}
                  onToggleExpanded={() => setExpandedWorkflowId((prev) => (prev === entry.id ? "" : entry.id))}
                  onToggleEnabled={() => toggleWorkflowEnabled(entry)}
                />
              ))}
            </div>

            <div className="mt-6">
              <WorkflowSectionDivider label="Tailored" count={`${tailoredEntries.length} workflows · parameterized per run`} />
              <div className="space-y-3">
                {tailoredEntries.map((entry) => (
                  <WorkflowAccordionCard
                    key={entry.id}
                    entry={entry}
                    enabled={effectiveEnabled(entry)}
                    expanded={expandedWorkflowId === entry.id}
                    onToggleExpanded={() => setExpandedWorkflowId((prev) => (prev === entry.id ? "" : entry.id))}
                    onToggleEnabled={() => toggleWorkflowEnabled(entry)}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
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
  enabled,
  expanded,
  onToggleExpanded,
  onToggleEnabled,
}: {
  entry: WorkflowSurfaceEntry;
  enabled: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleEnabled: () => void;
}) {
  const muted = !enabled;

  return (
    <article
      className={`overflow-hidden rounded-[var(--tomo-radius-sm)] border shadow-[var(--tomo-shadow-1)] transition ${
        expanded
          ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-teal)_18%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))]"
      } ${muted ? "opacity-70" : ""}`}
      data-testid={`workflow-accordion-card-${entry.id}`}
    >
      <div className="flex min-h-[72px] items-stretch">
        <ActiveToggle enabled={enabled} onToggle={onToggleEnabled} />
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

      {expanded ? <WorkflowExpandedShell entry={entry} /> : null}
    </article>
  );
}

function ActiveToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-center border-r border-[color:var(--tomo-rule-soft)] px-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? "Active: on" : "Active: off"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`relative h-7 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tomo-teal)] focus-visible:ring-offset-1 ${
          enabled ? "bg-[color:var(--tomo-status-green)]" : "bg-[color:color-mix(in_srgb,var(--tomo-mute)_42%,var(--tomo-rule))]"
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

function WorkflowExpandedShell({ entry }: { entry: WorkflowSurfaceEntry }) {
  return (
    <div className="border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,var(--tomo-card-warm))]">
      <WorkflowMetaStrip meta={entry.meta} />
      <InlineProcessFlow steps={entry.steps} triggerLabel={entry.triggerLabel} />
      <WorkflowAttentionRow items={entry.attentionItems} />
      <WorkflowStateSummaryPanel summary={entry.stateSummary} />
      <WorkflowRunHistoryPanel runs={entry.runHistory} />
    </div>
  );
}

function WorkflowMetaStrip({ meta }: { meta: WorkflowMetaItem[] }) {
  if (meta.length === 0) return null;

  return (
    <div className="grid gap-0 border-b border-[color:var(--tomo-rule-soft)] md:grid-cols-2">
      {meta.map((item) => (
        <div key={`${item.label}-${item.value}`} className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
            {item.label}
          </p>
          <p
            className={`mt-1 text-xs ${
              item.tone === "good"
                ? "text-[color:var(--tomo-status-green)]"
                : item.tone === "warning"
                  ? "text-[color:var(--tomo-status-amber-text)]"
                  : "text-[color:var(--tomo-body)]"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function InlineProcessFlow({ steps, triggerLabel }: { steps: WorkflowStepNode[]; triggerLabel: string }) {
  return (
    <div className="px-4 py-4">
      <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">
        Process flow
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-2">
          <ProcessNode
            title="When"
            description={triggerLabel}
            tag="Trigger"
            variant="trigger"
          />
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              <FlowArrow />
              <ProcessNode
                title={step.title}
                description={step.description}
                tag={step.statusLabel ?? step.timingLabel ?? step.nodeType}
                timing={step.timingLabel}
                variant={step.actionType === "draft_batch" || step.actionType === "single_draft" ? "draft" : step.nodeType === "wait" ? "wait" : "default"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex h-[112px] items-center text-[color:var(--tomo-rule)]">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  );
}

function ProcessNode({
  title,
  description,
  tag,
  timing,
  variant,
}: {
  title: string;
  description: string;
  tag: string;
  timing?: string;
  variant: "trigger" | "draft" | "wait" | "default";
}) {
  const variantClass =
    variant === "trigger"
      ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_45%,var(--tomo-rule))] bg-[color:var(--tomo-teal-tint)]"
      : variant === "draft"
        ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_35%,var(--tomo-rule))] bg-[color:var(--tomo-card)]"
        : variant === "wait"
          ? "border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_70%,var(--tomo-card))]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]";

  return (
    <button
      type="button"
      className={`relative flex h-[112px] w-[178px] flex-col rounded-[var(--tomo-radius-sm)] border px-3 py-2 text-left shadow-[var(--tomo-shadow-1)] transition hover:border-[color:var(--tomo-teal)] ${variantClass}`}
      title="Step-level drawers arrive in Phase 4"
    >
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
        {timing ?? tag}
      </span>
      <span className="mt-1 text-sm font-semibold leading-snug text-[color:var(--foreground)]">{title}</span>
      <span className="mt-1 line-clamp-3 text-[11px] leading-snug text-[color:var(--tomo-body)]">{description}</span>
      {variant === "draft" ? (
        <span className="mt-auto self-start rounded-full bg-[color:var(--tomo-teal-evidence-bg)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--tomo-teal)]">
          Drafts
        </span>
      ) : null}
    </button>
  );
}

function WorkflowAttentionRow({ items }: { items: WorkflowAttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-amber)_34%,var(--tomo-rule))] bg-[color:var(--tomo-status-amber-bg)] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--tomo-status-amber-text)]">
        {items.map((item, index) => (
          <span key={item.id} className="flex items-center gap-2">
            {index > 0 ? <span className="text-[color:var(--tomo-rule)]">·</span> : null}
            <span>
              <span className="font-semibold">{item.count}</span> {item.label}
            </span>
          </span>
        ))}
        <span className="ml-auto font-medium text-[color:var(--tomo-teal)]">{items[0]?.actionLabel} →</span>
      </div>
    </div>
  );
}

function WorkflowStateSummaryPanel({ summary }: { summary: WorkflowStateSummary }) {
  return (
    <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3">
      <p className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">{summary.title}</p>
      <div className="grid gap-2 md:grid-cols-3">
        {summary.segments.map((segment) => (
          <div key={segment.id} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] px-3 py-2">
            <p className="text-xs font-medium text-[color:var(--foreground)]">{segment.label}</p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
              {segment.drafted} drafted · {segment.sent} sent · {segment.waiting} waiting
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
        <span>{summary.replied} replied</span>
        <span>{summary.readyForOutcome} ready for outcome</span>
        <span>{summary.skipped} skipped</span>
      </div>
    </div>
  );
}

function WorkflowRunHistoryPanel({ runs }: { runs: WorkflowSurfaceEntry["runHistory"] }) {
  if (runs.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
      <div className="flex items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Run history</p>
        <button type="button" className="text-xs font-medium text-[color:var(--tomo-teal)]">
          Show all →
        </button>
      </div>
      <div className="divide-y divide-[color:var(--tomo-rule-soft)]">
        {runs.map((run) => (
          <div key={run.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{run.listName}</p>
              <p className="text-xs text-[color:var(--tomo-mute)]">
                {run.startedAtLabel} · {run.lpCount} LPs
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-[color:var(--foreground)]">{run.statusLabel}</p>
              <p className="text-xs text-[color:var(--tomo-mute)]">{run.outcomeSummary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
