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
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-2 shadow-[var(--tomo-shadow-1)]">
        <p className="min-w-0 text-[11px] leading-snug text-[color:var(--tomo-body)]">
          <span className="font-medium text-[color:var(--foreground)]">Outbound safety</span>
          <span className="text-[color:var(--tomo-mute)]">
            {" "}
            — {unique} unique LP{unique === 1 ? "" : "s"} on this {audienceLabel}
          </span>
          {removed > 0 ? (
            <span className="text-[color:var(--tomo-mute)]">
              {" "}
              · {removed} duplicate address{removed === 1 ? "" : "es"} removed
            </span>
          ) : null}
        </p>
        <button
          type="button"
          data-testid="workflow-outbound-safety-chip"
          onClick={() => setOpen(true)}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums shadow-[var(--tomo-shadow-1)] transition ${
            hasOverlap
              ? "border-[color:color-mix(in_srgb,var(--tomo-status-amber)_45%,var(--tomo-rule))] bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)] hover:bg-[color:color-mix(in_srgb,var(--tomo-status-amber-bg)_85%,var(--tomo-card))]"
              : "border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_52%,var(--tomo-card))] text-[color:var(--foreground)] hover:bg-[color:var(--tomo-navy-soft)]"
          }`}
          title="How Tomo prevents duplicate workflow touches"
        >
          {hasOverlap ? (
            <ExclamationTriangleIcon className="h-3.5 w-3.5 text-[color:var(--tomo-status-amber)]" aria-hidden />
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
