"use client";

import { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { WorkflowDuplicatePreventionModal } from "@/components/workflow-duplicate-prevention-modal";
import {
  mockDedupedCount,
  mockHasOverlapScenario,
  mockOverlapLpCount,
  mockSuppressionRows,
} from "@/lib/workflow-outbound-safety-mock";

type WorkflowOutboundSafetyChipProps = {
  relationshipCount: number;
  audienceLabel?: string;
  /** Shown in modal title / examples */
  workflowTitle: string;
};

/**
 * Compact entry point for duplicate-prevention rules + demo signals (replaces full inline Outbound safety block).
 */
export function WorkflowOutboundSafetyChip({
  relationshipCount,
  audienceLabel = "list",
  workflowTitle,
}: WorkflowOutboundSafetyChipProps) {
  const [open, setOpen] = useState(false);
  const { unique, removed } = mockDedupedCount(relationshipCount);
  const overlapN = mockOverlapLpCount(relationshipCount);
  const hasOverlap = mockHasOverlapScenario(relationshipCount);
  const suppressions = mockSuppressionRows(relationshipCount);

  const chipLabel = hasOverlap
    ? `${overlapN} overlap`
    : removed > 0
      ? `${removed} deduped`
      : suppressions.length > 0
        ? `${suppressions.length} in log`
        : "Rules";

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <p className="min-w-0 text-[11px] leading-snug text-gray-600">
          <span className="font-medium text-gray-800">Outbound safety</span>
          <span className="text-gray-500"> — {unique} unique LP{unique === 1 ? "" : "s"} on this {audienceLabel}</span>
          {removed > 0 ? <span className="text-gray-500"> · {removed} duplicate address{removed === 1 ? "" : "es"} removed</span> : null}
        </p>
        <button
          type="button"
          data-testid="workflow-outbound-safety-chip"
          onClick={() => setOpen(true)}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition ${
            hasOverlap
              ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
              : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
          }`}
          title="How Tomo prevents duplicate workflow touches"
        >
          {hasOverlap ? (
            <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-600" aria-hidden />
          ) : null}
          {chipLabel}
        </button>
      </div>

      <WorkflowDuplicatePreventionModal
        open={open}
        onClose={() => setOpen(false)}
        workflowTitle={workflowTitle}
        overlapLpCount={overlapN}
        suppressionRows={suppressions}
      />
    </>
  );
}
