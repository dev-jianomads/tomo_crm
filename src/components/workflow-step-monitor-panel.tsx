"use client";

import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";
import { getWorkflowStepMonitoring } from "@/lib/workflow-step-monitoring-mock";

export function WorkflowStepMonitorPanel({
  entry,
  step,
}: {
  entry: WorkflowSurfaceEntry;
  step: WorkflowStepNode;
}) {
  const monitoring = getWorkflowStepMonitoring(entry, step);

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))] bg-[color:color-mix(in_srgb,var(--tomo-teal)_6%,var(--tomo-card))] px-3 py-2.5">
        <p className="text-xs leading-relaxed text-[color:var(--tomo-body)]">
          <span className="font-semibold text-[color:var(--foreground)]">Monitor only.</span> View trigger,
          parameters, and per-LP send status. Approve drafts and capture outcomes in Action Drawer.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(
          [
            ["Drafted", monitoring.metrics.drafted],
            ["Approved", monitoring.metrics.approved],
            ["Sent", monitoring.metrics.sent],
            ["Waiting", monitoring.metrics.waiting],
            ["Replied", monitoring.metrics.replied],
            ["Skipped", monitoring.metrics.skipped],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2 py-2 text-center"
          >
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
              {value}
            </p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
              {label}
            </p>
          </div>
        ))}
      </div>

      {monitoring.parameters?.length ? (
        <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <p className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
            Parameters
          </p>
          <dl className="divide-y divide-[color:var(--tomo-rule-soft)]">
            {monitoring.parameters.map((p) => (
              <div key={p.label} className="flex gap-3 px-3 py-2 text-xs">
                <dt className="w-28 shrink-0 font-medium text-[color:var(--tomo-mute)]">{p.label}</dt>
                <dd className="min-w-0 text-[color:var(--tomo-body)]">{p.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {monitoring.lpRows?.length ? (
        <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <p className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
            LPs on this step
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-[color:var(--tomo-rule-soft)] text-[color:var(--tomo-mute)]">
                  <th className="px-3 py-2 font-medium">LP</th>
                  <th className="px-3 py-2 font-medium">Firm</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Sent</th>
                  <th className="px-3 py-2 font-medium">Replied</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.lpRows.map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--tomo-rule-soft)] last:border-0">
                    <td className="px-3 py-2 font-medium text-[color:var(--foreground)]">{row.lpName}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-body)]">{row.firmName}</td>
                    <td className="px-3 py-2 capitalize text-[color:var(--tomo-body)]">{row.emailStatus}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-mute)]">{row.sentAtLabel ?? "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-mute)]">{row.repliedAtLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {monitoring.footnote ? (
        <p className="text-xs text-[color:var(--tomo-mute)]">{monitoring.footnote}</p>
      ) : null}
    </div>
  );
}
