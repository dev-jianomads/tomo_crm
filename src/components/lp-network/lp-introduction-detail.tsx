"use client";

import Link from "next/link";
import type { Fund } from "@/components/fund-provider";
import { LpIntroStatusStrip } from "@/components/lp-network/lp-intro-status-strip";
import { formatIntroUpdatedAt } from "@/lib/lpNetworkIntroState";
import type { IntroductionStatus, NetworkLpMandate } from "@/lib/mockLpNetwork";

export type LpIntroductionDetailProps = {
  mandate: NetworkLpMandate;
  funds: Fund[];
  introStatus: IntroductionStatus;
  /** ISO timestamp from persisted intro thread */
  introUpdatedAt?: string | null;
  onRequestIntroduction: () => void;
  onNotNow: () => void;
  /** One-click demo: LP approves → `lp_approved` */
  onSimulateLpApprove: () => void;
  /** Remove persisted thread for this mandate/fund (demo reset) */
  onResetIntroThread: () => void;
  /** Demo-only: jump intro machine for screenshots */
  onDemoSetStatus: (status: IntroductionStatus) => void;
};

export function LpIntroductionDetail({
  mandate,
  funds,
  introStatus,
  introUpdatedAt,
  onRequestIntroduction,
  onNotNow,
  onSimulateLpApprove,
  onResetIntroThread,
  onDemoSetStatus,
}: LpIntroductionDetailProps) {
  const canRequest = introStatus === "eligible";
  const canSimulateLpApprove = introStatus === "gp_requested" || introStatus === "lp_pending";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Anonymised mandate</p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900">{mandate.displayLabel}</h2>
        <p className="mt-1 text-xs text-gray-500">
          No name, email, or institution is shown until the allocator approves an introduction (double opt-in).
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {mandate.strategyTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--accent-ink)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <DetailItem label="Check size" value={mandate.checkSizeBand} />
        <DetailItem label="Deployment" value={mandate.deploymentStatus} />
        <DetailItem label="Geography" value={mandate.geographyLabel} />
        <DetailItem label="Manager stage" value={mandate.managerStagePreference} />
        <DetailItem label="Fit score" value={mandate.fitScore} />
        <DetailItem
          label="Fund eligibility"
          value={
            mandate.eligibleFundIds.length === 0
              ? "All funds in workspace"
              : mandate.eligibleFundIds.map((id) => funds.find((f) => f.id === id)?.name ?? id).join(", ")
          }
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="font-medium text-gray-900">Hard constraints</p>
        <p className="mt-1 leading-relaxed text-gray-700">{mandate.hardConstraints}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="font-medium text-gray-900">What makes an introduction worth their time?</p>
        <p className="mt-1 leading-relaxed text-gray-700">{mandate.introWorthTime}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={!canRequest}
          onClick={onRequestIntroduction}
          className="rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          Request introduction
        </button>
        <button
          type="button"
          onClick={onNotNow}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
      {!canRequest ? (
        <p className="text-xs text-gray-500">Introduction already in progress for this mandate and fund.</p>
      ) : null}

      {introUpdatedAt ? (
        <p className="text-xs text-gray-500">
          Last update: <span className="font-medium text-gray-700">{formatIntroUpdatedAt(introUpdatedAt)}</span>
        </p>
      ) : null}

      <LpIntroStatusStrip status={introStatus} />

      {canSimulateLpApprove ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm">
          <p className="text-xs font-semibold text-emerald-900">Simulate allocator (demo)</p>
          <p className="mt-1 text-xs text-emerald-800">Skips to LP approved — same as the allocator accepting in the LP dashboard.</p>
          <button
            type="button"
            onClick={onSimulateLpApprove}
            className="mt-2 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Simulate LP approved
          </button>
        </div>
      ) : null}

      <details className="rounded-md border border-dashed border-gray-300 bg-gray-50/50 px-3 py-2 text-xs text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-700">Advance workflow (demo)</summary>
        <p className="mt-2 text-gray-500">Jump to any step or reset this thread.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <DemoStatusBtn label="Eligible" status="eligible" current={introStatus} onPick={onDemoSetStatus} />
          <DemoStatusBtn label="LP notified" status="gp_requested" current={introStatus} onPick={onDemoSetStatus} />
          <DemoStatusBtn label="Awaiting LP" status="lp_pending" current={introStatus} onPick={onDemoSetStatus} />
          <DemoStatusBtn label="LP approved" status="lp_approved" current={introStatus} onPick={onDemoSetStatus} />
          <DemoStatusBtn label="Intro sent" status="connected" current={introStatus} onPick={onDemoSetStatus} />
        </div>
        <button
          type="button"
          onClick={onResetIntroThread}
          className="mt-3 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset intro thread
        </button>
      </details>

      <Link
        href="/lp-network/mandate?demo=1"
        className="inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
      >
        Open LP mandate preview (demo) →
      </Link>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-gray-900">{value}</p>
    </div>
  );
}

function DemoStatusBtn({
  label,
  status,
  current,
  onPick,
}: {
  label: string;
  status: IntroductionStatus;
  current: IntroductionStatus;
  onPick: (s: IntroductionStatus) => void;
}) {
  const active = current === status;
  return (
    <button
      type="button"
      onClick={() => onPick(status)}
      className={`rounded-md px-2 py-1 ring-1 transition ${
        active ? "bg-[color:var(--accent-soft)] font-semibold text-[color:var(--accent-ink)] ring-[color:var(--accent)]" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
