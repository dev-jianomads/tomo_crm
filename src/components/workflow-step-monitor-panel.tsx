"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { WorkflowStepNode, WorkflowSurfaceEntry } from "@/lib/workflow-surface-mock";
import {
  getWorkflowStepMonitoring,
  type WorkflowStepLpRow,
  type WorkflowStepMetricKey,
} from "@/lib/workflow-step-monitoring";

const METRIC_LABELS: Record<WorkflowStepMetricKey, string> = {
  drafted: "Drafted",
  sent: "Sent",
  replied: "Replied",
  skipped: "Skipped",
};

function formatLpStatus(status: WorkflowStepLpRow["emailStatus"]): string {
  if (status === "draft") return "Drafted";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function MonitorSectionCard({
  title,
  countLabel,
  collapsible,
  defaultCollapsed = false,
  children,
}: {
  title: string;
  countLabel?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (!collapsible) {
    return (
      <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
        <p className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
          {title}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-left"
        aria-expanded={!collapsed}
      >
        <span className="text-xs font-semibold text-[color:var(--foreground)]">{title}</span>
        <span className="flex items-center gap-2">
          {countLabel ? (
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
              {countLabel}
            </span>
          ) : null}
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 text-[color:var(--tomo-mute)] transition ${collapsed ? "-rotate-90" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {!collapsed ? children : null}
    </div>
  );
}

export function WorkflowStepMonitorPanel({
  entry,
  step,
  listId = null,
}: {
  entry: WorkflowSurfaceEntry;
  step: WorkflowStepNode;
  listId?: string | null;
}) {
  const monitoring = getWorkflowStepMonitoring(entry, step, listId);
  const metrics = monitoring.visibleMetrics ?? [];
  const showParameters = monitoring.showParameters !== false && Boolean(monitoring.parameters?.length);
  const showDraftPreview =
    monitoring.showDraftPreview !== false && Boolean(monitoring.draftPreview?.body?.trim());
  const showLpTable = monitoring.showLpTable !== false && Boolean(monitoring.lpRows?.length);
  const lpCount = monitoring.lpRows?.length ?? 0;

  return (
    <div className="space-y-4">
      {metrics.length > 0 ? (
        <div
          className={`grid gap-2 ${
            metrics.length <= 2
              ? "grid-cols-2"
              : metrics.length <= 4
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-3 sm:grid-cols-6"
          }`}
        >
          {metrics.map((key) => (
            <div
              key={key}
              className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2 py-2 text-center"
            >
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-[color:var(--foreground)]">
                {monitoring.metrics[key]}
              </p>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
                {METRIC_LABELS[key]}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showParameters ? (
        <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <p className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
            Parameters
          </p>
          <dl className="divide-y divide-[color:var(--tomo-rule-soft)]">
            {monitoring.parameters!.map((p) => (
              <div key={p.label} className="flex gap-3 px-3 py-2 text-xs">
                <dt className="w-28 shrink-0 font-medium text-[color:var(--tomo-mute)]">{p.label}</dt>
                <dd className="min-w-0 text-[color:var(--tomo-body)]">{p.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {showDraftPreview ? (
        <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
          <div className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
            <p className="text-xs font-semibold text-[color:var(--foreground)]">Draft</p>
            {monitoring.draftPreview!.caption ? (
              <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
                {monitoring.draftPreview!.caption}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 px-3 py-3">
            <div>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
                Subject
              </p>
              <p className="mt-0.5 text-sm font-medium text-[color:var(--foreground)]">
                {monitoring.draftPreview!.subject}
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
                Body
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[color:var(--tomo-body)]">
                {monitoring.draftPreview!.body}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showLpTable ? (
        <MonitorSectionCard
          title="LPs on this step"
          countLabel={`${lpCount} LP${lpCount === 1 ? "" : "s"}`}
          collapsible
          defaultCollapsed={lpCount > 6}
        >
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
                {monitoring.lpRows!.map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--tomo-rule-soft)] last:border-0">
                    <td className="px-3 py-2 font-medium text-[color:var(--foreground)]">{row.lpName}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-body)]">{row.firmName}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-body)]">{formatLpStatus(row.emailStatus)}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-mute)]">{row.sentAtLabel ?? "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--tomo-mute)]">{row.repliedAtLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MonitorSectionCard>
      ) : null}

      {monitoring.footnote ? (
        <p className="text-xs text-[color:var(--tomo-mute)]">{monitoring.footnote}</p>
      ) : null}
    </div>
  );
}
