"use client";

import type {
  WorkflowAttentionItem,
  WorkflowStepNode,
  WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";
import type { WorkflowTelemetry } from "@/lib/workflow-telemetry";
import { visibleWorkflowAttentionItems } from "@/lib/workflow-surface-display";
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
  const telemetry = entry.telemetry ?? null;
  const attentionItems = visibleWorkflowAttentionItems(entry.attentionItems);
  const showRunConfig =
    !customSaved &&
    entry.runConfig &&
    (entry.runConfig.editable || entry.runConfig.launchable) &&
    !telemetry?.hasRuns;

  return (
    <div className="border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,var(--tomo-card-warm))]">
      {customSaved ? (
        <CustomSavedBanner
          hasFollowUp={entry.steps.some((s) => s.id.endsWith("-follow-up"))}
          onActivate={onActivateCustom}
          onEditAction={onEditAction}
        />
      ) : (
        <>
          <InlineProcessFlow
            steps={entry.steps}
            triggerLabel={entry.triggerLabel}
            onStepAction={(step) => onStepAction?.(entry, step)}
          />
          {entry.status === "active" ? (
            telemetry?.hasRuns ? (
              <WorkflowTelemetryPanel telemetry={telemetry} attentionItems={attentionItems} />
            ) : (
              <WorkflowNoRunsPanel entry={entry} />
            )
          ) : null}
        </>
      )}
      {showRunConfig ? (
        <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4">
          <WorkflowRunConfigPanel entry={entry} launchContext={launchContext} onLaunched={onLaunched} />
        </div>
      ) : null}
      {telemetry?.hasRuns && telemetry.olderRunCount > 0 ? (
        <WorkflowRunHistoryPanel runs={entry.runHistory} />
      ) : null}
    </div>
  );
}

function CustomSavedBanner({
  hasFollowUp = false,
  onActivate,
  onEditAction,
}: {
  hasFollowUp?: boolean;
  onActivate?: () => void;
  onEditAction?: () => void;
}) {
  return (
    <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-teal)_7%,var(--tomo-card))] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-[color:var(--tomo-body)]">
          <span className="font-semibold text-[color:var(--foreground)]">Saved on this list.</span>{" "}
          {hasFollowUp
            ? "Edit primary or follow-up, then activate to enroll this list."
            : "Edit the action, then activate to enroll this list."}
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

function WorkflowNoRunsPanel({ entry }: { entry: WorkflowSurfaceEntry }) {
  const launchable = entry.runConfig?.launchable;
  return (
    <div className="mx-4 mb-3 px-1 py-1" data-testid="workflow-no-runs">
      <p className="text-xs leading-relaxed text-[color:var(--tomo-mute)]">
        {launchable
          ? "No LPs in flight on this list. Launch a run below to enroll the list."
          : entry.kind === "locked_default"
            ? "No in-flight runs on this list. Runs start automatically when the trigger fires."
            : "No LPs in flight on this list."}
      </p>
    </div>
  );
}

function WorkflowTelemetryPanel({
  telemetry,
  attentionItems,
}: {
  telemetry: WorkflowTelemetry;
  attentionItems: WorkflowAttentionItem[];
}) {
  const headline = [
    `${telemetry.inFlight} in flight`,
    `${telemetry.sent} sent`,
    `${telemetry.replied} replied`,
  ].join(" · ");

  return (
    <div
      className="mx-4 mb-3 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-3"
      data-testid="workflow-telemetry"
    >
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
        {headline}
      </p>
      <p className="mt-1.5 text-xs text-[color:var(--tomo-body)]">
        <span className="font-medium text-[color:var(--foreground)]">Primary:</span> {telemetry.primaryLine}
        {telemetry.followUpLine ? (
          <>
            {" "}
            · <span className="font-medium text-[color:var(--foreground)]">{telemetry.followUpLine}</span>
          </>
        ) : null}
      </p>
      {telemetry.latestRun ? (
        <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">
          <span className="font-medium text-[color:var(--foreground)]">{telemetry.latestRun.listName}</span>
          {" · "}
          {telemetry.latestRun.startedAtLabel} · {telemetry.latestRun.lpCount} LPs ·{" "}
          {telemetry.latestRun.statusLabel}
        </p>
      ) : null}
      {attentionItems.length > 0 ? (
        <div className="mt-2 border-t border-[color:var(--tomo-rule-soft)] pt-2">
          {attentionItems.map((item) => (
            <p key={item.id} className="text-xs text-[color:var(--tomo-status-amber-text)]">
              <span className="font-semibold text-[color:var(--foreground)]">{item.count}</span> {item.label}
            </p>
          ))}
        </div>
      ) : null}
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

function WorkflowRunHistoryPanel({ runs }: { runs: WorkflowSurfaceEntry["runHistory"] }) {
  if (runs.length <= 1) return null;

  return (
    <div className="mx-4 mb-4 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
      <div className="flex items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Earlier runs</p>
      </div>
      <div className="divide-y divide-[color:var(--tomo-rule-soft)]">
        {runs.slice(1).map((run) => (
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
