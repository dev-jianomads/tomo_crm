"use client";

import type { IntroductionStatus, NetworkLpMandate } from "@/lib/mockLpNetwork";

function introStatusPill(introStatus: IntroductionStatus): string {
  switch (introStatus) {
    case "eligible":
      return "Eligible";
    case "gp_requested":
      return "LP notified";
    case "lp_pending":
      return "Awaiting LP";
    case "lp_approved":
      return "LP approved";
    case "connected":
      return "Intro sent";
  }
}

function fitTone(fit: NetworkLpMandate["fitScore"]): string {
  if (fit === "High") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (fit === "Medium") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-gray-100 text-gray-700 ring-gray-200";
}

export type QualifiedLpCardProps = {
  mandate: NetworkLpMandate;
  selected: boolean;
  onSelect: () => void;
  introStatus: IntroductionStatus;
};

/**
 * GP-safe list tile: strategy, cheque, deployment, manager stage — no PII.
 */
export function QualifiedLpCard({ mandate, selected, onSelect, introStatus }: QualifiedLpCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-lg border px-3 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition ${
        selected
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent)]/30"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-gray-900">{mandate.displayLabel}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${fitTone(mandate.fitScore)}`}
          >
            {mandate.fitScore} fit
          </span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
            {introStatusPill(introStatus)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {mandate.strategyTags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200/80 group-hover:bg-white"
          >
            {tag}
          </span>
        ))}
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-600">
        <div>
          <dt className="text-gray-400">Check</dt>
          <dd className="font-medium text-gray-800">{mandate.checkSizeBand}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Deployment</dt>
          <dd className="font-medium text-gray-800">{mandate.deploymentStatus}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-400">Manager stage</dt>
          <dd className="font-medium text-gray-800">{mandate.managerStagePreference}</dd>
        </div>
      </dl>
    </button>
  );
}
