"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pipeline } from "@/lib/pipelines";
import { getPipelineMembers, isManualList } from "@/lib/pipelines";
import {
  formatActiveInvestmentsLabel,
  STAGE_OPTIONS,
  type Relationship,
  type Stage,
} from "@/lib/mockData";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { suggestedPlaybooks, type Playbook } from "@/lib/mockPlaybooks";
import { derivePipelineFlagMock, type PipelineFlagGar } from "@/lib/todayRaiseStands";

/** Funnel bar fill + top accent — `design/tomo_lists_v1.html` stage palette */
const FUNNEL_STAGE_STYLE: Record<
  Stage,
  { bar: string; top: string }
> = {
  Sourced: { bar: "bg-[#E6ECEA]", top: "border-t-2 border-[#4A6B5A]" },
  "First meeting": { bar: "bg-[#DCE8E1]", top: "border-t-2 border-[#2F6045]" },
  Nurturing: { bar: "bg-[#D2E5DA]", top: "border-t-2 border-[#1F5238]" },
  "Active diligence": { bar: "bg-[#F0E5D1]", top: "border-t-2 border-[#8A6B2E]" },
  "Soft commit": { bar: "bg-[#DDE8DC]", top: "border-t-2 border-[#2D6E45]" },
  Committed: { bar: "bg-[#1C2B3A]", top: "border-t-0" },
  "On hold": { bar: "bg-[#EFD5D5]", top: "border-t-2 border-[#7A2D2D]" },
  "Closed lost": { bar: "bg-[#E8E8EC]", top: "border-t-2 border-[#6B6F77]" },
};

const FUNNEL_STAGE_LABEL: Record<Stage, string> = {
  Sourced: "Sourced",
  "First meeting": "First mtg",
  Nurturing: "Nurturing",
  "Active diligence": "Active dilig.",
  "Soft commit": "Soft commit",
  Committed: "Committed",
  "On hold": "On hold",
  "Closed lost": "Closed lost",
};

const LP_PREVIEW_MAX = 12;

function groupByStage(rels: Relationship[]): Record<Stage, Relationship[]> {
  const groups = {} as Record<Stage, Relationship[]>;
  for (const stage of STAGE_OPTIONS) {
    groups[stage] = rels.filter((r) => r.stage === stage);
  }
  return groups;
}

function tierRank(t: Relationship["tier"]): number {
  if (t === "Tier 1") return 0;
  if (t === "Tier 2") return 1;
  return 2;
}

function flagRank(f: PipelineFlagGar): number {
  if (f === "red") return 0;
  if (f === "amber") return 1;
  return 2;
}

function sortListMembers(rels: Relationship[]): Relationship[] {
  return [...rels].sort((a, b) => {
    const tr = tierRank(a.tier) - tierRank(b.tier);
    if (tr !== 0) return tr;
    const fr = flagRank(derivePipelineFlagMock(a)) - flagRank(derivePipelineFlagMock(b));
    if (fr !== 0) return fr;
    return a.firm.localeCompare(b.firm);
  });
}

function stageAbbr(stage: Stage): string {
  if (stage === "Active diligence") return "Active dilig.";
  if (stage === "First meeting") return "First mtg";
  return stage;
}

function stampForListRow(days: number): { text: string; tone: "ok" | "warn" | "danger" } {
  if (days <= 0) return { text: "Now", tone: "ok" };
  if (days < 7) return { text: `${days}d`, tone: "ok" };
  if (days < 14) return { text: `${days}d`, tone: "warn" };
  return { text: `${days}d`, tone: "danger" };
}

function lpMetaLine(r: Relationship): string {
  const parts = [r.name, r.tier, r.typicalCheckSize];
  const fund = formatActiveInvestmentsLabel(r.lastFundHistory);
  if (fund && fund !== "—") parts.push(fund);
  return parts.join(" · ");
}

function SignalDot({ flag }: { flag: PipelineFlagGar }) {
  const cls =
    flag === "red"
      ? "bg-[color:var(--tomo-red)]"
      : flag === "amber"
        ? "bg-[color:var(--tomo-status-amber)]"
        : "bg-[color:var(--tomo-status-green)]";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} aria-hidden title={flag} />;
}

function filterSubtitle(pipeline: Pipeline, manual: boolean): string | null {
  if (manual) {
    const d = pipeline.manualDescription?.trim();
    return d || null;
  }
  const s = formatFilterSummary(pipeline.filterCriteria).replace(/^Tomo:\s*/i, "").trim();
  return s || null;
}

function workflowCardsForPipeline(pipelineId: string): Playbook[] {
  return suggestedPlaybooks.filter((pb) => pb.pipelineId === pipelineId && pb.enabled !== false);
}

export type ListDrawerV1ContentProps = {
  pipeline: Pipeline;
  relationships: Relationship[];
  router: ReturnType<typeof useRouter>;
  onOpenAmend: () => void;
  onClose: () => void;
};

/**
 * List detail body for `design/tomo_lists_v1.html`: title block, funnel, LP row table, active workflows.
 * Drawer chrome (close) lives in `ContextDrawer`.
 */
export function ListDrawerV1Content({ pipeline, relationships, router, onOpenAmend, onClose }: ListDrawerV1ContentProps) {
  const manual = isManualList(pipeline);
  const members = useMemo(() => sortListMembers(getPipelineMembers(relationships, pipeline)), [relationships, pipeline]);
  const preview = useMemo(() => members.slice(0, LP_PREVIEW_MAX), [members]);
  const total = members.length;
  const byStage = useMemo(() => groupByStage(members), [members]);
  const stageCounts = useMemo(
    () => STAGE_OPTIONS.map((s) => ({ stage: s, count: byStage[s].length })),
    [byStage]
  );
  const workflows = useMemo(() => workflowCardsForPipeline(pipeline.id), [pipeline.id]);
  const sub = filterSubtitle(pipeline, manual);

  const funnelRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [linePoints, setLinePoints] = useState<{ top: string; bottom: string } | null>(null);

  useLayoutEffect(() => {
    const funnel = funnelRef.current;
    if (!funnel) return;
    const bars = barRefs.current.filter(Boolean) as HTMLDivElement[];
    if (bars.length < 2) return;
    const funnelRect = funnel.getBoundingClientRect();
    const stagesToLink = stageCounts.slice(0, -1);
    if (stagesToLink.length < 2) return;
    const topPoints: [number, number][] = [];
    const bottomPoints: [number, number][] = [];
    for (let i = 0; i < stagesToLink.length; i++) {
      const bar = bars[i];
      if (!bar) continue;
      const rect = bar.getBoundingClientRect();
      const x = rect.left - funnelRect.left + rect.width / 2;
      topPoints.push([x, rect.top - funnelRect.top]);
      bottomPoints.push([x, rect.bottom - funnelRect.top]);
    }
    setLinePoints({
      top: topPoints.map(([x, y]) => `${x},${y}`).join(" "),
      bottom: bottomPoints.map(([x, y]) => `${x},${y}`).join(" "),
    });
  }, [stageCounts]);

  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  return (
    <div className="pb-6">
      {/* Drawer header block (mock `.drawer-header` content) */}
      <div className="border-b border-[color:var(--tomo-rule-soft)] px-6 pb-4 pt-5 sm:px-8 sm:pb-[18px] sm:pt-[22px]">
        <h2 className="font-[family-name:var(--font-newsreader)] text-[24px] font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--tomo-navy)] sm:text-[26px] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_30]">
          {pipeline.name}
        </h2>
        {manual ? (
          sub ? (
            <p className="mt-1.5 text-[13px] italic leading-snug text-[color:var(--tomo-mute)]">{sub}</p>
          ) : (
            <p className="mt-1.5 text-[13px] text-[color:var(--tomo-mute)]">Manual list</p>
          )
        ) : sub ? (
          <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--tomo-body)]">
            <span className="mr-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-teal)]">
              Filter
            </span>
            {sub}
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] text-[color:var(--tomo-mute)]">No structured filters</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3.5">
          <span className="inline-flex items-center gap-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.06em] text-[color:var(--tomo-mute)]">
            <span className="font-semibold tabular-nums text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{total}</span>
            {manual ? "LPs in list" : "LPs matching"}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.06em] ${
              manual ? "text-[color:var(--tomo-mute)]" : "text-[color:var(--tomo-status-green)]"
            }`}
          >
            <span aria-hidden>{manual ? "○" : "●"}</span>
            {manual ? "Manual" : "Live · auto-updating"}
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.06em] text-[color:var(--tomo-mute)]">
            Demo snapshot
          </span>
        </div>
      </div>

      <div className="space-y-7 px-6 py-6 sm:px-8">
        {/* Funnel */}
        <div>
          <div className="mb-3 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
            Funnel by stage
          </div>
          <div ref={funnelRef} className="relative px-1" style={{ height: 110 }}>
            {linePoints ? (
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                <polyline
                  points={linePoints.top}
                  fill="none"
                  stroke="var(--tomo-rule)"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={linePoints.bottom}
                  fill="none"
                  stroke="var(--tomo-rule)"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            <div className="relative flex h-[110px] items-end justify-between gap-1 px-0.5">
              {stageCounts.map(({ stage, count }, i) => {
                const barH = count === 0 ? 4 : Math.max(Math.round((count / maxCount) * 100), 12);
                const st = FUNNEL_STAGE_STYLE[stage];
                const isCommitted = stage === "Committed";
                return (
                  <div key={stage} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${stage}: ${count}`}>
                    <div className="flex h-[100px] w-full flex-1 items-end justify-center">
                      {count === 0 ? (
                        <div className="h-1 w-full rounded-sm bg-[color:var(--tomo-rule-soft)]" />
                      ) : (
                        <div
                          ref={(el) => {
                            barRefs.current[i] = el;
                          }}
                          className={`w-full max-w-[48px] rounded-t-[3px] ${st.bar} ${st.top} ${isCommitted ? "min-h-[12px]" : ""}`}
                          style={{ height: barH }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex justify-between gap-1 px-0.5">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="min-w-0 flex-1 text-center">
                <div className="mb-0.5 truncate font-[family-name:var(--font-jetbrains-mono)] text-[9px] leading-tight text-[color:var(--tomo-mute)] tracking-[0.04em]">
                  {FUNNEL_STAGE_LABEL[stage]}
                </div>
                <div
                  className={`font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-semibold tabular-nums ${
                    count === 0 ? "font-normal text-[color:var(--tomo-mute)]" : "text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
                  }`}
                >
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LP row table */}
        <div>
          <div className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
            LPs in this list{" "}
            <span className="font-normal normal-case tracking-[0.04em]">
              · top {preview.length} of {total}
              {total > 1 ? " · sorted by tier then signal" : ""}
            </span>
          </div>
          <div className="overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)]">
            <div className="max-h-[min(360px,45vh)] divide-y divide-[color:var(--tomo-rule-soft)] overflow-y-auto">
              {preview.map((r) => {
                const flag = derivePipelineFlagMock(r);
                const stamp = stampForListRow(r.daysSinceLastMeaningfulContact);
                const stampCls =
                  stamp.tone === "danger"
                    ? "text-[color:var(--tomo-red)]"
                    : stamp.tone === "warn"
                      ? "text-[color:var(--tomo-status-amber-text)]"
                      : "text-[color:var(--tomo-mute)]";
                return (
                  <Link
                    key={r.id}
                    href={`/relationships?focus=${encodeURIComponent(r.id)}`}
                    onClick={() => onClose()}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3.5 py-2.5 transition hover:bg-[color:var(--tomo-card-warm)]"
                  >
                    <SignalDot flag={flag} />
                    <div className="min-w-0">
                      <div className="truncate font-[family-name:var(--font-newsreader)] text-sm font-medium leading-snug text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_16]">
                        {r.firm}
                      </div>
                      <div className="truncate text-[11px] text-[color:var(--tomo-body)]">{lpMetaLine(r)}</div>
                    </div>
                    <span className="shrink-0 truncate font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.06em] text-[color:var(--tomo-mute)]">
                      {stageAbbr(r.stage)}
                    </span>
                    <span className={`shrink-0 text-right font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums ${stampCls}`}>
                      {stamp.text}
                    </span>
                  </Link>
                );
              })}
            </div>
            {total > LP_PREVIEW_MAX ? (
              <Link
                href="/relationships"
                onClick={() => onClose()}
                className="block cursor-pointer border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-3.5 py-2 text-center text-[11px] text-[color:var(--tomo-mute)] transition hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
              >
                View all {total} LPs in Relationships →
              </Link>
            ) : total > 0 ? (
              <Link
                href="/relationships"
                onClick={() => onClose()}
                className="block cursor-pointer border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-3.5 py-2 text-center text-[11px] text-[color:var(--tomo-mute)] transition hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
              >
                Open in Relationships →
              </Link>
            ) : null}
          </div>
        </div>

        {/* Active workflows */}
        <div>
          <div className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
            Active workflows{" "}
            <span className="font-normal normal-case tracking-[0.04em]">
              · {workflows.length} attached to this list
            </span>
          </div>
        <div data-testid="list-drawer-workflows">
          {workflows.length === 0 ? (
            <p className="text-sm text-[color:var(--tomo-mute)]">No workflows linked to this list yet.</p>
          ) : (
            <ul className="space-y-2">
              {workflows.map((pb) => (
                <li key={pb.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const q = new URLSearchParams({ playbook: pb.id, pipelineId: pipeline.id });
                      router.push(`/workflows?${q.toString()}`);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-3.5 text-left shadow-[var(--tomo-shadow-1)] transition hover:border-[color:var(--tomo-navy)] hover:shadow-[var(--tomo-shadow-1)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-[family-name:var(--font-newsreader)] text-sm font-medium text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_16]">
                          {pb.name}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--tomo-body)]">{pb.summary}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--tomo-status-green-bg)] px-2 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-status-green)]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--tomo-status-green)] opacity-40" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--tomo-status-green)]" />
                      </span>
                      Active
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>

        {/* Inline actions (mock drawer-actions, before shell footer duplicate) */}
        <div className="flex flex-wrap gap-2 border-t border-[color:var(--tomo-rule-soft)] pt-6" data-testid="list-drawer-actions">
          <button
            type="button"
            onClick={onOpenAmend}
            className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3.5 py-2 text-xs font-medium text-[color:var(--tomo-navy)] shadow-[var(--tomo-shadow-1)] transition hover:border-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
          >
            Amend list
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/workflows?openList=${encodeURIComponent(pipeline.id)}&attach=1`);
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal)] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[color:var(--tomo-teal-muted)]"
          >
            Create workflow
          </button>
        </div>
      </div>
    </div>
  );
}
