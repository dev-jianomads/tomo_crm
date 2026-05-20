"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { WorkflowStepMonitorPanel } from "@/components/workflow-step-monitor-panel";
import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";

export type WorkflowStepActionSelection = {
  entry: WorkflowSurfaceEntry;
  step: WorkflowStepNode;
};

export function WorkflowStepActionDrawer({
  selection,
  listId = null,
  onClose,
}: {
  selection: WorkflowStepActionSelection | null;
  listId?: string | null;
  onClose: () => void;
}) {
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
        aria-label={selection ? `${selection.entry.name} - ${selection.step.title} monitoring` : "Workflow step monitor"}
        aria-modal="true"
      >
        {selection ? (
          <>
            <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
                    {selection.entry.name} · Monitor
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-newsreader)] text-2xl font-medium leading-tight text-[color:var(--foreground)] [font-variation-settings:'opsz'_28]">
                    {selection.step.title}
                  </h2>
                  {selection.step.description ? (
                    <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{selection.step.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] text-[color:var(--tomo-mute)] transition hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
                  aria-label="Close workflow step monitor"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <WorkflowStepMonitorPanel entry={selection.entry} step={selection.step} listId={listId} />
            </div>

            <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-5 py-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-1.5 text-xs font-medium text-[color:var(--foreground)]"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
