"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { SuppressionEntry } from "@/lib/workflow-outbound-safety-mock";

type WorkflowDuplicatePreventionModalProps = {
  open: boolean;
  onClose: () => void;
  /** Current workflow title — used in overlap example copy */
  workflowTitle: string;
  /** Other active workflow name for overlap example (demo) */
  otherActiveWorkflowName?: string;
  overlapLpCount: number;
  suppressionRows: SuppressionEntry[];
};

export function WorkflowDuplicatePreventionModal({
  open,
  onClose,
  workflowTitle,
  otherActiveWorkflowName = "Post-Meeting Follow-Up",
  overlapLpCount,
  suppressionRows,
}: WorkflowDuplicatePreventionModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const overlapExample =
    overlapLpCount > 0
      ? `${overlapLpCount} LP${overlapLpCount === 1 ? "" : "s"} in this list are also receiving ${otherActiveWorkflowName}. They will be suppressed from this run.`
      : `No overlap is flagged for ${workflowTitle} right now. Tomo still checks on every launch before you confirm a send.`;

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center tomo-modal-scrim p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="dup-prevention-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)]"
        data-testid="workflow-duplicate-prevention-modal"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="dup-prevention-title" className="text-base font-semibold text-[color:var(--foreground)]">
            Duplicate workflow prevention
          </h2>
          <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-[color:var(--tomo-body)]">
          <section className="border-b border-[color:var(--tomo-rule-soft)] pb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
              1. LP-level deduplication at run time
            </h3>
            <p className="mt-2 leading-relaxed">
              Before a draft fires, Tomo checks whether the target LP has received a workflow-generated touch in a
              configurable window (default <strong>14 days</strong>). If a recent touch is found, the LP is skipped and
              logged as <span className="font-medium text-[color:var(--foreground)]">Suppressed — recent workflow touch</span>.
            </p>
            <p className="mt-2 rounded-[var(--tomo-radius-md)] bg-[color:var(--tomo-navy-soft)] px-2 py-1.5 text-xs text-[color:var(--tomo-body)]">
              This guardrail is <strong>always on</strong> for production sends — not optional.
            </p>
          </section>

          <section className="border-b border-[color:var(--tomo-rule-soft)] py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
              2. Overlap warning on launch
            </h3>
            <p className="mt-2 leading-relaxed">
              When you start a workflow run, Tomo compares this list to <strong>all other active workflows</strong>. If
              LPs would receive overlapping sequences, you see a warning <strong>before</strong> confirmation — then you
              choose to proceed or cancel.
            </p>
            <p className="mt-2 rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-status-amber)_45%,var(--tomo-rule))] bg-[color:var(--tomo-status-amber-bg)] px-2 py-2 text-xs text-[color:var(--tomo-status-amber-text)]">
              <span className="font-medium">Example:</span> {overlapExample}
            </p>
          </section>

          <section className="pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">3. Suppression log</h3>
            <p className="mt-2 leading-relaxed">
              Every suppressed LP is recorded with a reason. You can review runs in the workflow activity log and, in a
              full rollout, <strong>override individual suppressions</strong> when you intentionally want a second touch.
            </p>
            <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">Recent suppressions for this audience:</p>
            <ul className="mt-2 space-y-1.5">
              {suppressionRows.map((row) => (
                <li
                  key={`${row.at}-${row.lp}`}
                  className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_70%,var(--tomo-card))] px-2 py-1.5 text-[11px] text-[color:var(--foreground)]"
                >
                  <span className="text-[color:var(--tomo-mute)]">{row.at}</span>{" "}
                  <span className="font-medium text-[color:var(--foreground)]">{row.lp}</span> — {row.reason}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <button
            type="button"
            data-testid="workflow-dup-modal-close"
            onClick={onClose}
            className="w-full rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
