"use client";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { getMockWorkflowRunLog, type WorkflowRunLogEntry } from "@/lib/workflow-run-log-mock";

type WorkflowActivityLogAccordionProps = {
  workflowRowId: string | null;
  listName: string | null;
  isGlobalWorkflow: boolean;
};

export function WorkflowActivityLogAccordion({
  workflowRowId,
  listName,
  isGlobalWorkflow,
}: WorkflowActivityLogAccordionProps) {
  const entries: WorkflowRunLogEntry[] =
    workflowRowId != null
      ? getMockWorkflowRunLog(workflowRowId, { listName, isGlobalWorkflow })
      : [];

  return (
    <div className="border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-2" data-testid="workflow-activity-log-accordion">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)] [&::-webkit-details-marker]:hidden">
          <span>Activity log (last runs)</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[color:var(--tomo-mute)] transition-transform group-open:rotate-180" />
        </summary>
        <p className="pb-2 text-[10px] leading-snug text-[color:var(--tomo-mute)]">
          When this workflow ran, which list it used, outreach volume, and suppressions — up to five recent runs.
        </p>
        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-[color:var(--tomo-rule-soft)] text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                <th className="py-1.5 pr-2 font-medium">Last triggered</th>
                <th className="py-1.5 pr-2 font-medium">List</th>
                <th className="py-1.5 pr-2 font-medium text-right">LPs touched</th>
                <th className="py-1.5 pr-2 font-medium text-right">Drafts</th>
                <th className="py-1.5 pr-2 font-medium text-right">Approved</th>
                <th className="py-1.5 font-medium text-right">Suppressed</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[color:var(--tomo-rule-soft)] text-[color:var(--foreground)] last:border-0">
                  <td className="max-w-[120px] py-2 pr-2 align-top text-[color:var(--tomo-body)]">{e.triggeredAt}</td>
                  <td className="max-w-[140px] py-2 pr-2 align-top text-[color:var(--tomo-mute)]">{e.listLabel}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{e.lpsTouched}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{e.draftsGenerated}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{e.draftsApproved}</td>
                  <td className="py-2 text-right tabular-nums text-[color:var(--tomo-status-amber-text)]">{e.lpsSuppressed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
