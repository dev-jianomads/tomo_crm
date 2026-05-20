"use client";

import type {
  WorkflowAttentionItem,
  WorkflowMetaItem,
  WorkflowStepNode,
  WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";
import { visibleWorkflowAttentionItems, visibleWorkflowMeta } from "@/lib/workflow-surface-display";
import {
  WorkflowRunConfigPanel,
  type WorkflowLaunchContext,
} from "@/components/workflow-run-config-panel";

export function WorkflowExpandedBody({
  entry,
  customSaved = false,
  onActivateCustom,
  onEditAction,
  onStepAction,
  launchContext,
  onLaunched,
}: {
  entry: WorkflowSurfaceEntry;
  customSaved?: boolean;
  onActivateCustom?: () => void;
  onEditAction?: () => void;
  onStepAction?: (entry: WorkflowSurfaceEntry, step: WorkflowStepNode) => void;
  launchContext?: WorkflowLaunchContext | null;
  onLaunched?: () => void;
}) {
  const monitorOnly = entry.status === "active" && !customSaved;

  return (
    <div className="border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,var(--tomo-card-warm))]">
      {customSaved ? (
        <CustomSavedBanner onActivate={onActivateCustom} onEditAction={onEditAction} />
      ) : null}
      {monitorOnly ? <MonitorOnlyBanner entry={entry} /> : null}
      <WorkflowMetaStrip meta={visibleWorkflowMeta(entry.meta)} />
      <InlineProcessFlow steps={entry.steps} triggerLabel={entry.triggerLabel} onStepAction={(step) => onStepAction?.(entry, step)} />
      <WorkflowMonitoringStrip items={visibleWorkflowAttentionItems(entry.attentionItems)} />
      {entry.runConfig && (entry.runConfig.editable || entry.runConfig.launchable) ? (
        <div className="mx-4 mt-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4">
          <WorkflowRunConfigPanel entry={entry} launchContext={launchContext} onLaunched={onLaunched} />
        </div>
      ) : null}
      <WorkflowRunHistoryPanel runs={entry.runHistory} />
    </div>
  );
}

function MonitorOnlyBanner({ entry }: { entry: WorkflowSurfaceEntry }) {
  return (
    <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_35%,var(--tomo-card))] px-4 py-3">
      <p className="text-xs leading-relaxed text-[color:var(--tomo-body)]">
        <span className="font-semibold text-[color:var(--foreground)]">Active on this list.</span> Monitor
        in-flight LPs and capture outcomes — structure and parameters are read-only while running.
        {entry.kind === "configurable_template" && entry.baseTemplateId
          ? " Saved from the Themed Outreach base template."
          : null}
      </p>
    </div>
  );
}

function CustomSavedBanner({
  onActivate,
  onEditAction,
}: {
  onActivate?: () => void;
  onEditAction?: () => void;
}) {
  return (
    <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-teal)_7%,var(--tomo-card))] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-[color:var(--tomo-body)]">
          <span className="font-semibold text-[color:var(--foreground)]">Saved on this list.</span> V1 custom workflows
          are trigger plus one action. Edit action to change trigger, context, or drafts; activate when ready to run.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            data-testid="workflow-edit-action-cta"
            onClick={onEditAction}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-body)] transition hover:border-[color:var(--tomo-teal)] hover:text-[color:var(--tomo-teal)]"
          >
            Edit action
          </button>
          <button
            type="button"
            onClick={onActivate}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[color:var(--tomo-teal-muted)]"
          >
            Activate
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowMetaStrip({ meta }: { meta: WorkflowMetaItem[] }) {
  if (meta.length === 0) return null;

  return (
    <div className="grid gap-0 border-b border-[color:var(--tomo-rule-soft)] md:grid-cols-2">
      {meta.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
        >
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

function InlineProcessFlow({
  steps,
  triggerLabel,
  onStepAction,
}: {
  steps: WorkflowStepNode[];
  triggerLabel: string;
  onStepAction?: (step: WorkflowStepNode) => void;
}) {
  const flowSteps = steps.length
    ? steps
    : [
        {
          id: "trigger",
          nodeType: "trigger" as const,
          actionType: "readonly" as const,
          title: "When",
          description: triggerLabel,
          statusLabel: "Trigger",
        },
      ];

  return (
    <div className="px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">
          Process flow
        </p>
        <p className="hidden text-[11px] text-[color:var(--tomo-mute)] sm:block">
          Click a step to open monitoring detail for that step.
        </p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-2">
          {flowSteps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-2">
              {index > 0 ? <FlowArrow /> : null}
              <ProcessNode step={step} onStepAction={onStepAction} />
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
  step,
  onStepAction,
}: {
  step: WorkflowStepNode;
  onStepAction?: (step: WorkflowStepNode) => void;
}) {
  const variant =
    step.nodeType === "trigger"
      ? "trigger"
      : step.actionType === "draft_batch" || step.actionType === "single_draft"
        ? "draft"
        : step.nodeType === "wait"
          ? "wait"
          : step.nodeType === "outcome"
            ? "outcome"
            : "default";

  const variantClass =
    variant === "trigger"
      ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_45%,var(--tomo-rule))] bg-[color:var(--tomo-teal-tint)]"
      : variant === "draft"
        ? "border-[color:color-mix(in_srgb,var(--tomo-teal)_35%,var(--tomo-rule))] bg-[color:var(--tomo-card)]"
        : variant === "wait"
          ? "border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-card-warm)_70%,var(--tomo-card))]"
          : variant === "outcome"
            ? "border-[color:color-mix(in_srgb,var(--tomo-status-amber)_45%,var(--tomo-rule))] bg-[color:var(--tomo-status-amber-bg)]"
            : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]";

  return (
    <button
      type="button"
      onClick={() => onStepAction?.(step)}
      className={`relative flex h-[112px] w-[178px] flex-col rounded-[var(--tomo-radius-sm)] border px-3 py-2 text-left shadow-[var(--tomo-shadow-1)] transition hover:border-[color:var(--tomo-teal)] ${variantClass}`}
      title={`Open ${step.actionType.replace("_", " ")}`}
      data-step-action={step.actionType}
    >
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
        {step.timingLabel ?? step.statusLabel ?? step.nodeType}
      </span>
      <span className="mt-1 text-sm font-semibold leading-snug text-[color:var(--foreground)]">{step.title}</span>
      {step.description ? (
        <span className="mt-1 line-clamp-3 text-[11px] leading-snug text-[color:var(--tomo-body)]">{step.description}</span>
      ) : null}
      <span
        className={`mt-auto self-start rounded-full px-2 py-0.5 text-[10px] font-medium ${
          variant === "draft"
            ? "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]"
            : variant === "outcome"
              ? "bg-[color:var(--tomo-card)] text-[color:var(--tomo-status-amber-text)]"
              : "bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_70%,var(--tomo-card))] text-[color:var(--tomo-body)]"
        }`}
      >
        {step.actionType === "draft_batch"
          ? "Batch drafts"
          : step.actionType === "single_draft"
            ? "Draft"
            : step.actionType === "outcome_capture"
              ? "Outcome"
              : step.statusLabel ?? step.actionType}
      </span>
    </button>
  );
}

function WorkflowMonitoringStrip({ items }: { items: WorkflowAttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_40%,var(--tomo-card))] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--tomo-body)]">
        {items.map((item, index) => (
          <span key={item.id} className="flex items-center gap-2">
            {index > 0 ? <span className="text-[color:var(--tomo-rule)]">·</span> : null}
            <span>
              <span className="font-semibold text-[color:var(--foreground)]">{item.count}</span> {item.label}
            </span>
          </span>
        ))}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
