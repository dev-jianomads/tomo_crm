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
  useEffect(() => setMounted(true), []);

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="dup-prevention-title">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close dialog" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        data-testid="workflow-duplicate-prevention-modal"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h2 id="dup-prevention-title" className="text-base font-semibold text-gray-900">
            Duplicate workflow prevention
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-gray-700">
          <section className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">1. LP-level deduplication at run time</h3>
            <p className="mt-2 leading-relaxed">
              Before a draft fires, Tomo checks whether the target LP has received a workflow-generated touch in a
              configurable window (default <strong>14 days</strong>). If a recent touch is found, the LP is skipped and
              logged as <span className="font-medium text-gray-900">Suppressed — recent workflow touch</span>.
            </p>
            <p className="mt-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
              This guardrail is <strong>always on</strong> for production sends — not optional.
            </p>
          </section>

          <section className="border-b border-gray-100 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">2. Overlap warning on launch</h3>
            <p className="mt-2 leading-relaxed">
              When you start a workflow run, Tomo compares this list to <strong>all other active workflows</strong>. If
              LPs would receive overlapping sequences, you see a warning <strong>before</strong> confirmation — then you
              choose to proceed or cancel.
            </p>
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-950">
              <span className="font-medium">Example:</span> {overlapExample}
            </p>
          </section>

          <section className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">3. Suppression log</h3>
            <p className="mt-2 leading-relaxed">
              Every suppressed LP is recorded with a reason. You can review runs in the workflow activity log and, in a
              full rollout, <strong>override individual suppressions</strong> when you intentionally want a second touch.
            </p>
            <p className="mt-2 text-xs text-gray-500">Recent demo suppressions for this audience:</p>
            <ul className="mt-2 space-y-1.5">
              {suppressionRows.map((row) => (
                <li
                  key={`${row.at}-${row.lp}`}
                  className="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5 text-[11px] text-gray-800"
                >
                  <span className="text-gray-500">{row.at}</span>{" "}
                  <span className="font-medium text-gray-900">{row.lp}</span> — {row.reason}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            data-testid="workflow-dup-modal-close"
            onClick={onClose}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
