"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import {
  countQualifiedForFund,
  getMandatesForFund,
  getQualifiedMandatesForFund,
  lpNetworkIntroductionThreads,
  type IntroductionStatus,
  type NetworkLpMandate,
} from "@/lib/mockLpNetwork";

function introStatusForMandate(mandateId: string, fundId: string): IntroductionStatus {
  const thread = lpNetworkIntroductionThreads.find(
    (t) => t.mandateId === mandateId && t.fundId === fundId
  );
  return thread?.status ?? "eligible";
}

const INTRO_STEPS: { status: IntroductionStatus; label: string; hint: string }[] = [
  { status: "eligible", label: "Eligible", hint: "Mandate matches your fund; no intro requested yet." },
  { status: "gp_requested", label: "Intro requested", hint: "You asked TOMO to notify this allocator." },
  { status: "lp_pending", label: "Awaiting LP", hint: "Allocator is reviewing whether to accept." },
  { status: "lp_approved", label: "LP approved", hint: "Allocator agreed; connection can be made." },
  { status: "connected", label: "Introduced", hint: "Both parties connected with context." },
];

function stepIndex(status: IntroductionStatus): number {
  return INTRO_STEPS.findIndex((s) => s.status === status);
}

export default function LpNetworkPage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;

  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const qualified = useMemo(() => getQualifiedMandatesForFund(effectiveFundId), [effectiveFundId]);
  const allForFund = useMemo(() => getMandatesForFund(effectiveFundId), [effectiveFundId]);
  const list = qualifiedOnly ? qualified : allForFund;

  const qualifiedCount = useMemo(() => countQualifiedForFund(effectiveFundId), [effectiveFundId]);

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && list.some((m) => m.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [list]);

  const selected = list.find((m) => m.id === selectedId) ?? null;
  const introStatus = selected ? introStatusForMandate(selected.id, effectiveFundId) : "eligible";
  const currentStep = stepIndex(introStatus);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PageListHeader
        label="Qualified LP introductions"
        description="Curated allocator mandates from the TOMO LP Network. Cards stay anonymised until double opt-in — only strategy fit, cheque size, and deployment signals are shown here."
        action={{ href: "/lp-network/mandate?demo=1", label: "Preview LP mandate view (demo) →" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
            value={activeFundId}
            onChange={(e) => setActiveFundId(e.target.value)}
          >
            <option value="all">Fund: All (using first fund for matches)</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                Fund: {f.name}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={qualifiedOnly}
              onChange={(e) => setQualifiedOnly(e.target.checked)}
            />
            Qualified only (high fit + actively deploying)
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          TOMO has identified{" "}
          <span className="font-semibold text-gray-800">{qualifiedCount}</span> qualified LP
          {qualifiedCount === 1 ? "" : "s"} for{" "}
          <span className="font-medium text-gray-700">
            {activeFundId === "all" ? funds[0]?.name ?? "Fund I" : funds.find((f) => f.id === activeFundId)?.name ?? "this fund"}
          </span>
          . Showing {list.length} in this list.
        </p>
      </PageListHeader>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-3">
        {list.map((m) => (
          <MandateRow
            key={m.id}
            mandate={m}
            selected={selectedId === m.id}
            onSelect={() => setSelectedId(m.id)}
            introStatus={introStatusForMandate(m.id, effectiveFundId)}
          />
        ))}
        {!list.length ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
            No mandates in this view. Try turning off &quot;Qualified only&quot; or switching fund.
          </div>
        ) : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!selected ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">
          Select a mandate to see fit details and introduction status.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Anonymised mandate</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{selected.displayLabel}</h2>
            <p className="mt-1 text-xs text-gray-500">
              No name, email, or institution is shown until the allocator approves an introduction.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selected.strategyTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--accent-ink)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Check size" value={selected.checkSizeBand} />
            <DetailItem label="Deployment" value={selected.deploymentStatus} />
            <DetailItem label="Geography" value={selected.geographyLabel} />
            <DetailItem label="Manager stage" value={selected.managerStagePreference} />
            <DetailItem label="Fit score" value={selected.fitScore} />
            <DetailItem
              label="Fund eligibility"
              value={
                selected.eligibleFundIds.length === 0
                  ? "All funds in workspace"
                  : selected.eligibleFundIds
                      .map((id) => funds.find((f) => f.id === id)?.name ?? id)
                      .join(", ")
              }
            />
          </div>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
            <p className="font-medium text-gray-900">Hard constraints</p>
            <p className="mt-1 text-gray-700">{selected.hardConstraints}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
            <p className="font-medium text-gray-900">What makes an introduction worth their time?</p>
            <p className="mt-1 text-gray-700">{selected.introWorthTime}</p>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50/80 px-3 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Introduction status</p>
            <ol className="mt-3 space-y-2">
              {INTRO_STEPS.map((step, i) => {
                const done = i < currentStep;
                const current = i === currentStep;
                return (
                  <li key={step.status} className="flex gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done
                          ? "bg-[color:var(--accent)] text-white"
                          : current
                            ? "border-2 border-[color:var(--accent)] bg-white text-[color:var(--accent)]"
                            : "border border-gray-200 bg-white text-gray-400"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <div>
                      <p className={`font-medium ${current ? "text-gray-900" : "text-gray-600"}`}>{step.label}</p>
                      <p className="text-xs text-gray-500">{step.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Request / approval actions ship in Phase 4 (persisted mock). This panel reflects the end-state workflow.
            </p>
          </div>

          <Link
            href="/lp-network/mandate?demo=1"
            className="inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
          >
            Open LP mandate preview (demo) →
          </Link>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="lp_network"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={selected?.displayLabel}
      assistantChips={["Who fits our fundraise?", "Summarize intro status", "Explain double opt-in"]}
    />
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-gray-900">{value}</p>
    </div>
  );
}

function MandateRow({
  mandate,
  selected,
  onSelect,
  introStatus,
}: {
  mandate: NetworkLpMandate;
  selected: boolean;
  onSelect: () => void;
  introStatus: IntroductionStatus;
}) {
  const statusLabel =
    introStatus === "eligible"
      ? "Eligible"
      : introStatus === "gp_requested"
        ? "Requested"
        : introStatus === "lp_pending"
          ? "LP pending"
          : introStatus === "lp_approved"
            ? "LP approved"
            : "Introduced";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-2.5 text-left transition ${
        selected ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{mandate.displayLabel}</p>
        <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{mandate.strategyTags.join(" · ")}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-gray-500">
        <span>{mandate.checkSizeBand}</span>
        <span>·</span>
        <span>{mandate.deploymentStatus}</span>
      </div>
    </button>
  );
}
