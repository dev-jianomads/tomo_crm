"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  getWorkflowDraftBatch,
  workflowOutcomeCaptures,
  type WorkflowDraftBatch,
  type WorkflowStepNode,
  type WorkflowSurfaceEntry,
} from "@/lib/workflow-surface-mock";

export type WorkflowStepActionSelection = {
  entry: WorkflowSurfaceEntry;
  step: WorkflowStepNode;
};

export function WorkflowStepActionDrawer({
  selection,
  onClose,
}: {
  selection: WorkflowStepActionSelection | null;
  onClose: () => void;
}) {
  const batch = selection?.step.draftBatchId ? getWorkflowDraftBatch(selection.step.draftBatchId) : undefined;
  const outcome = selection ? workflowOutcomeCaptures.find((item) => item.workflowId === selection.entry.id) : undefined;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[color:rgba(28,43,58,0.24)] backdrop-blur-[1px] transition-opacity ${
          selection ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] flex-col border-l border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-drawer-shadow)] transition-transform duration-200 ${
          selection ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label={selection ? `${selection.entry.name} - ${selection.step.title}` : "Workflow step drawer"}
        aria-modal="true"
      >
        {selection ? (
          <>
            <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
                    {selection.entry.name} · {selection.step.actionType.replace("_", " ")}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-newsreader)] text-2xl font-medium leading-tight text-[color:var(--foreground)] [font-variation-settings:'opsz'_28]">
                    {selection.step.title}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{selection.step.description}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] text-[color:var(--tomo-mute)] transition hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
                  aria-label="Close workflow step drawer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <StepActionContent entry={selection.entry} step={selection.step} batch={batch} outcome={outcome} />
            </div>

            <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[color:var(--tomo-mute)]">
                  Phase 4 routing is active. Full editing controls arrive in the next drawer phase.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-1.5 text-xs font-medium text-[color:var(--foreground)]"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}

function StepActionContent({
  entry,
  step,
  batch,
  outcome,
}: {
  entry: WorkflowSurfaceEntry;
  step: WorkflowStepNode;
  batch?: WorkflowDraftBatch;
  outcome?: (typeof workflowOutcomeCaptures)[number];
}) {
  if (step.actionType === "draft_batch") {
    return batch ? <DraftBatchPreview batch={batch} /> : <EmptyState title="No draft batch yet" body="This step is draft-capable, but no mock batch is attached yet." />;
  }

  if (step.actionType === "single_draft") {
    return (
      <EmptyState
        title="Single draft review"
        body="This step will open a one-recipient draft editor. Phase 4 wires the route; Phase 5 adds full editing controls."
      />
    );
  }

  if (step.actionType === "settings") {
    return <SettingsPreview step={step} />;
  }

  if (step.actionType === "outcome_capture") {
    return outcome ? <OutcomePreview outcome={outcome} /> : <EmptyState title="No outcomes pending" body="No mock outcome capture payload is attached for this workflow yet." />;
  }

  if (step.actionType === "run_config") {
    return entry.runConfig ? <RunConfigPreview entry={entry} /> : <EmptyState title="Run configuration" body="This step launches or configures the workflow run." />;
  }

  return <EmptyState title="Read-only step" body="This step is informational and does not require a drawer action." />;
}

function DraftBatchPreview({ batch }: { batch: WorkflowDraftBatch }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">
          {batch.eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{batch.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{batch.context}</p>
      </div>

      <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-3 py-2 text-xs text-[color:var(--tomo-mute)]">
        Tomo batch prompt placeholder: <span className="text-[color:var(--foreground)]">{batch.batchTomoPlaceholder}</span>
      </div>

      <div className="space-y-2">
        {batch.drafts.map((draft) => (
          <div key={draft.id} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{draft.firmName}</p>
                <p className="text-xs text-[color:var(--tomo-mute)]">
                  {draft.lpName} · {draft.roleLabel} · {draft.tierLabel}
                </p>
              </div>
              <span className="rounded-full bg-[color:var(--tomo-teal-evidence-bg)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--tomo-teal)]">
                {draft.status}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]">{draft.subject}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--tomo-body)]">{draft.body}</p>
            {draft.attachment ? (
              <p className="mt-2 text-[11px] text-[color:var(--tomo-mute)]">
                Attachment: <span className="text-[color:var(--foreground)]">{draft.attachment.name}</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPreview({ step }: { step: WorkflowStepNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoCard label="Action type" value={step.actionType} />
      <InfoCard label="Node type" value={step.nodeType} />
      <InfoCard label="Timing" value={step.timingLabel ?? "No timing set"} />
      <InfoCard label="Locked" value={step.locked ? "Framework-mandated" : "Editable for future runs"} />
    </div>
  );
}

function OutcomePreview({ outcome }: { outcome: (typeof workflowOutcomeCaptures)[number] }) {
  return (
    <div className="space-y-4">
      <InfoCard label="Pending LPs" value={outcome.pendingLpNames.join(", ")} />
      <div className="space-y-2">
        {outcome.options.map((option) => (
          <div key={option.id} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">{option.label}</p>
            <p className="mt-1 text-xs text-[color:var(--tomo-body)]">{option.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunConfigPreview({ entry }: { entry: WorkflowSurfaceEntry }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entry.runConfig?.fields.map((field) => (
        <InfoCard key={field.id} label={field.label} value={field.value} helperText={field.helperText} />
      ))}
    </div>
  );
}

function InfoCard({ label, value, helperText }: { label: string; value: string; helperText?: string }) {
  return (
    <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3">
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">{value}</p>
      {helperText ? <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">{helperText}</p> : null}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--tomo-radius-sm)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] p-5 text-center">
      <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{body}</p>
    </div>
  );
}
