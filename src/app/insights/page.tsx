/**
 * Insights — three-section V1 layout (SRS §3.6 daily-surfaces amendment).
 * Evidence lines only; Fat Middle cohort is a Relationships filter (no gauge in this slice).
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  MinusSmallIcon,
} from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";

/** Product palette — Insights visual spec */
const C = {
  navy: "#0F1F3D",
  teal: "#0D7377",
  slate: "#4A5568",
  formula: "#6B7280",
} as const;

const THREE_TOUCH_WORKFLOW = "td-three-touch-qualification";

/**
 * Mock nightly snapshot — replace with API (Sections 1–2 live for Singapore; 3–4 gated in backend).
 */
const MOCK = {
  lastUpdatedLabel: "Last updated: today at 2:04am · Next update tonight at 2:00am.",
  execution: {
    followUp: {
      pct: 87,
      baselinePct: 34,
      hasBaseline: true,
      formula:
        "Meetings with a TOMO-drafted follow-up sent within 24 hours ÷ total LP meetings since connection.",
    },
    draftApproval: {
      pct: 73,
      trend: "improving" as const,
      priorPct: 68,
      formula: "Drafts sent unchanged ÷ total drafts generated.",
    },
    scheduling: {
      avgDays: 1.2,
      baselineDays: 4.1,
      handledRequests: 12,
      formula: "Average days from meeting request received to confirmed meeting.",
    },
  },
  pipelineIntel: {
    directional: {
      withSignal: 112,
      activeLps: 150,
      formula: "LPs with at least one signal flag computed by TOMO ÷ total active LPs.",
      context:
        "Before TOMO, pipeline direction depends on memory and gut feel. This is how much of your pipeline is now systematically read.",
    },
    fatMiddle: {
      yourPct: 23,
      industryNorm: "under 20%",
      raiseTarget: "above 60%",
      formula: "LPs with 3+ meaningful touches in last 6 months ÷ total active LPs.",
      promptThreshold: 40,
    },
    rescued: {
      count: 14,
      formula:
        "LPs where TOMO fired a signal flag or re-engagement action and a reply was subsequently received.",
    },
  },
};

function TrendPill({
  direction,
  goodWhen,
  label,
}: {
  direction: "up" | "down" | "flat";
  goodWhen: "up" | "down";
  label: string;
}) {
  const isGood =
    direction === "flat" ? true : direction === goodWhen;
  const Icon =
    direction === "up" ? ArrowTrendingUpIcon : direction === "down" ? ArrowTrendingDownIcon : MinusSmallIcon;
  const color = isGood ? "text-emerald-800 bg-emerald-50" : "text-amber-900 bg-amber-50";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-semibold tracking-tight" style={{ color: C.navy }}>
      {children}
    </h2>
  );
}

function Metric({
  title,
  children,
  formula,
}: {
  title: string;
  children: React.ReactNode;
  formula: string;
}) {
  return (
    <div className="border-b border-gray-100 py-6 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <div className="mt-2">{children}</div>
      <p className="mt-2 text-[11px] leading-snug" style={{ color: C.formula }}>
        {formula}
      </p>
    </div>
  );
}

export default function InsightsPage() {
  const { ready } = useRequireSession();

  if (!ready) return null;

  const e = MOCK.execution;
  const p = MOCK.pipelineIntel;
  const directionalPct = Math.round((p.directional.withSignal / p.directional.activeLps) * 100);
  const showDraftNudge = e.draftApproval.pct < 50;

  const listContent = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <PageListHeader
        label="Insights"
        description="Is TOMO making your raise better? Evidence only — every number ties to activity we observe. Baseline metrics use your 90-day email history from onboarding where available."
      />
      <div className="flex-1 overflow-auto px-4 pb-8 pt-2">
        <div className="mx-auto max-w-2xl space-y-12">
          {/* 1 · Where your raise stands */}
          <section aria-labelledby="insights-s1">
            <SectionTitle>
              <span id="insights-s1">1 · Where your raise stands</span>
            </SectionTitle>
            <p className="mt-1 text-sm" style={{ color: C.slate }}>
              Pipeline coverage and cohort health — ties to Today and Relationships.
            </p>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2">
              <Metric title="Relationships with a clear direction" formula={p.directional.formula}>
                <p className="text-lg font-medium tabular-nums text-gray-900">
                  <span style={{ color: C.teal }}>{p.directional.withSignal}</span>
                  <span className="text-gray-500"> of </span>
                  {p.directional.activeLps} relationships now have a directional signal
                  <span className="text-gray-500"> ({directionalPct}%)</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: C.slate }}>
                  {p.directional.context}
                </p>
              </Metric>

              <Metric title="Relationships rescued from silence" formula={p.rescued.formula}>
                <p className="text-4xl font-semibold tabular-nums" style={{ color: C.teal }}>
                  {p.rescued.count}
                </p>
                <p className="mt-1 text-sm" style={{ color: C.slate }}>
                  relationships flagged before they went cold since connection
                </p>
                <Link
                  href="/relationships"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  style={{ color: C.teal }}
                >
                  Open Relationships
                  <ArrowRightIcon className="h-4 w-4" aria-hidden />
                </Link>
              </Metric>

              <Metric title="Focus list &amp; Fat Middle cohort" formula={p.fatMiddle.formula}>
                <p className="text-sm leading-relaxed" style={{ color: C.slate }}>
                  Metric 10 (Focus list) caps at ten moveable LPs in Momentum. The Fat Middle diagnostic remains available as a named
                  filter in Relationships — no standalone gauge here.
                </p>
                <p className="mt-3 text-sm" style={{ color: C.slate }}>
                  <Link href="/relationships" className="font-medium underline decoration-[#0D7377]/40 underline-offset-2 hover:decoration-[#0D7377]" style={{ color: C.teal }}>
                    Open Relationships
                  </Link>{" "}
                  and use the &quot;Quiet — Fat middle&quot; quick filter, or{" "}
                  <Link
                    href={`/workflows?tomoDefault=${THREE_TOUCH_WORKFLOW}`}
                    className="font-medium underline decoration-[#0D7377]/40 underline-offset-2 hover:decoration-[#0D7377]"
                    style={{ color: C.teal }}
                  >
                    launch Three-Touch Qualification
                  </Link>{" "}
                  on that cohort.
                </p>
              </Metric>
            </div>
          </section>

          {/* 2 · Momentum */}
          <section aria-labelledby="insights-s2">
            <SectionTitle>
              <span id="insights-s2">2 · Momentum</span>
            </SectionTitle>
            <p className="mt-1 text-sm" style={{ color: C.slate }}>
              Velocity and stage motion — available when signal history matures.
            </p>
            <div className="mt-4 space-y-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/30 px-4 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pipeline velocity</p>
                <p className="mt-2 text-sm" style={{ color: C.slate }}>
                  Average days between meaningful touches — with an 8-week sparkline and direction vs connection — unlocks when
                  Raise Momentum goes live.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Stage progression rate</p>
                <p className="mt-2 text-sm" style={{ color: C.slate }}>
                  Available after 30 days — monitoring for stage movements. Shows % of LPs who moved at least one pipeline stage
                  since connection.
                </p>
              </div>
            </div>
          </section>

          {/* 3 · What TOMO has done */}
          <section aria-labelledby="insights-s3">
            <SectionTitle>
              <span id="insights-s3">3 · What TOMO has done</span>
            </SectionTitle>
            <p className="mt-1 text-sm" style={{ color: C.slate }}>
              TOMO&apos;s own execution behaviour — available from day one.
            </p>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2">
              <Metric title="Follow-up compliance rate" formula={e.followUp.formula}>
                <p className="text-4xl font-semibold tabular-nums" style={{ color: C.teal }}>
                  {e.followUp.pct}%
                </p>
                {e.followUp.hasBaseline ? (
                  <p className="mt-1 text-sm" style={{ color: C.slate }}>
                    — up from {e.followUp.baselinePct}% before TOMO
                    <span className="text-gray-400"> (baseline from 90-day email history at connection)</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm" style={{ color: C.slate }}>
                    {e.followUp.pct}% since connection
                    <span className="text-gray-400"> (baseline not available — not enough pre-connection email)</span>
                  </p>
                )}
              </Metric>

              <Metric title="Draft approval rate" formula={e.draftApproval.formula}>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="text-4xl font-semibold tabular-nums" style={{ color: C.teal }}>
                    {e.draftApproval.pct}%
                  </p>
                  <span className="text-sm text-gray-600">approved without edits</span>
                  <TrendPill direction="up" goodWhen="up" label={`Improving vs ${e.draftApproval.priorPct}% prior period`} />
                </div>
                {showDraftNudge ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    Consider re-running tone calibration in Settings — approval rate suggests drafts may not match your voice.
                  </p>
                ) : null}
              </Metric>

              <Metric title="Scheduling efficiency" formula={e.scheduling.formula}>
                {e.scheduling.handledRequests >= 5 ? (
                  <>
                    <p className="text-4xl font-semibold tabular-nums" style={{ color: C.teal }}>
                      {e.scheduling.avgDays} days
                    </p>
                    <p className="mt-1 text-sm" style={{ color: C.slate }}>
                      average — down from {e.scheduling.baselineDays} days before TOMO
                      <span className="text-gray-400"> (baseline from calendar history at onboarding)</span>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Email Scheduling Assistant has handled {e.scheduling.handledRequests} requests.
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 text-sm" style={{ color: C.slate }}>
                    <p className="font-medium text-gray-800">Available after 5 scheduling interactions</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Currently {e.scheduling.handledRequests} logged — baseline will compare to calendar history at onboarding.
                    </p>
                  </div>
                )}
              </Metric>
            </div>
          </section>

          <p className="text-center text-xs leading-relaxed" style={{ color: C.slate }}>
            {MOCK.lastUpdatedLabel}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      section="insights"
      listContent={listContent}
      detailContent={null}
      detailVisible={false}
      contextTitle="Insights"
      assistantChips={[
        "Summarize where the raise stands",
        "What is the Focus list?",
        "What counts as a meaningful touch?",
      ]}
    />
  );
}
