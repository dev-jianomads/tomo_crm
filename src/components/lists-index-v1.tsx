"use client";

import { useMemo } from "react";
import { ArrowPathIcon, ArrowUpTrayIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Pipeline } from "@/lib/pipelines";
import {
  countActiveWorkflowsForPipeline,
  getListsIndexAggregates,
  getPipelineMembers,
  isManualList,
  type ListsIndexAggregates,
} from "@/lib/pipelines";
import type { Relationship } from "@/lib/mockData";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";

function FunnelGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ManualListGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.5" />
      <circle cx="3" cy="12" r="1.5" />
      <circle cx="3" cy="18" r="1.5" />
    </svg>
  );
}

function filterBodyForRow(pipeline: Pipeline, manual: boolean): string | null {
  if (manual) {
    const d = pipeline.manualDescription?.trim();
    return d || null;
  }
  const raw = formatFilterSummary(pipeline.filterCriteria).replace(/^Tomo:\s*/i, "").trim();
  return raw || null;
}

function ListTypePill({ manual }: { manual: boolean }) {
  if (manual) {
    return (
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className="inline-flex items-center gap-1 rounded-[2px] border border-[color:var(--tomo-rule)] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[color:var(--tomo-mute)]" aria-hidden />
          Manual
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1 rounded-[2px] bg-[color:var(--tomo-status-green-bg)] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-status-green)]">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[color:var(--tomo-status-green)]" aria-hidden />
        Live
      </span>
    </span>
  );
}

function WorkflowLine({ count }: { count: number }) {
  if (count <= 0) {
    return (
      <p className="mt-0.5 flex items-center justify-end gap-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[color:var(--tomo-rule)]" aria-hidden />
        No workflows
      </p>
    );
  }
  return (
    <p className="mt-0.5 flex items-center justify-end gap-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.04em] text-[color:var(--tomo-teal)]">
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[color:var(--tomo-teal)]" aria-hidden />
      {count} workflow{count !== 1 ? "s" : ""} active
    </p>
  );
}

type ListIndexRowProps = {
  pipeline: Pipeline;
  count: number;
  wfCount: number;
  selected: boolean;
  onSelect: () => void;
};

function ListIndexRow({ pipeline, count, wfCount, selected, onSelect }: ListIndexRowProps) {
  const manual = isManualList(pipeline);
  const body = filterBodyForRow(pipeline, manual);
  const countLabel = manual ? "LPs in list" : "LPs matching";

  const iconWrap =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] " +
    (manual
      ? "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-mute)]"
      : "bg-[color:var(--tomo-card-warm)] text-[color:var(--tomo-navy)]");

  return (
    <button
      type="button"
      data-testid={`list-index-row-${pipeline.id}`}
      onClick={onSelect}
      className={`grid w-full grid-cols-1 gap-3 rounded-[var(--tomo-radius-md)] border p-4 text-left transition duration-200 sm:grid-cols-[36px_1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-4 ${
        selected
          ? "border-[color:var(--tomo-navy)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]"
          : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] hover:border-[color:var(--tomo-navy)] hover:shadow-[var(--tomo-shadow-1)]"
      } `}
    >
      <div className={`${iconWrap} justify-self-start sm:justify-self-auto`}>
        {manual ? <ManualListGlyph /> : <FunnelGlyph />}
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-[family-name:var(--font-newsreader)] text-[17px] font-medium leading-snug tracking-[-0.01em] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
            {pipeline.name}
          </span>
        </div>
        {manual ? (
          body ? (
            <p className="text-[13px] italic leading-snug text-[color:var(--tomo-mute)]">{body}</p>
          ) : (
            <p className="text-[13px] leading-snug text-[color:var(--tomo-mute)]">Manual list</p>
          )
        ) : body ? (
          <p className="text-[13px] leading-snug text-[color:var(--tomo-body)]">
            <span className="mr-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-teal)]">
              Filter
            </span>
            {body}
          </p>
        ) : (
          <p className="text-[13px] leading-snug text-[color:var(--tomo-mute)]">No structured filters</p>
        )}
      </div>
      <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-0.5">
        <ListTypePill manual={manual} />
      </div>
      <div className="min-w-[7.5rem] text-right sm:min-w-[6.875rem]">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold tabular-nums text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
          {count}
        </p>
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
          {countLabel}
        </p>
        <WorkflowLine count={wfCount} />
      </div>
    </button>
  );
}

function ListsSectionDivider({ label, countText }: { label: string; countText: string }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline gap-3 first:mt-2">
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[color:var(--tomo-mute)]">{countText}</span>
      <span className="h-px min-w-[2rem] flex-1 bg-[color:var(--tomo-rule)]" aria-hidden />
    </div>
  );
}

function ListsCreateListCard() {
  return (
    <div
      className="mt-2 flex cursor-not-allowed items-center gap-3.5 rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] px-5 py-4 text-[color:var(--tomo-mute)] opacity-90"
      aria-disabled
      title="Coming soon"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] bg-[color:var(--tomo-card-warm)] text-[color:var(--tomo-mute)]">
        <PlusIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
      </div>
      <p className="font-[family-name:var(--font-newsreader)] text-[15px] italic leading-snug [font-variation-settings:'opsz'_18]">
        <span className="font-medium not-italic text-[color:var(--tomo-teal)]">Create a new list</span>
        <span className="text-[color:var(--tomo-mute)]"> — describe a filter, or hand-pick LPs</span>
      </p>
    </div>
  );
}

export type ListsIndexV1Props = {
  pipelines: Pipeline[];
  relationships: Relationship[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResetDemo?: () => void;
};

/**
 * Lists index layout per `design/tomo_lists_v1.html` (page chrome, section divider, row cards, dashed create card).
 * New list / Import cohort are disabled placeholders (SRS §3.11).
 */
export function ListsIndexV1({ pipelines, relationships, selectedId, onSelect, onResetDemo }: ListsIndexV1Props) {
  const aggregates: ListsIndexAggregates = useMemo(() => getListsIndexAggregates(pipelines), [pipelines]);

  const rows = useMemo(
    () =>
      pipelines.map((pipeline) => ({
        pipeline,
        count: getPipelineMembers(relationships, pipeline).length,
        wfCount: countActiveWorkflowsForPipeline(pipeline.id, suggestedPlaybooks),
      })),
    [pipelines, relationships]
  );

  const sectionCountText = pipelines.length === 1 ? "1 list" : `${pipelines.length} lists`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--tomo-canvas)]" data-testid="lists-index-v1">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pb-16 pt-6 sm:px-8 sm:pt-6">
          {/* Top row — eyebrow + util buttons */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-[18px]">
            <p
              className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]"
              data-testid="lists-eyebrow"
            >
              Lists
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                aria-disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-navy)] bg-[color:var(--tomo-navy)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-card)] opacity-55"
                title="Coming soon"
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
                New list
              </button>
              <button
                type="button"
                disabled
                aria-disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-navy)] opacity-55 dark:text-[color:var(--foreground)]"
                title="Coming soon"
              >
                <ArrowUpTrayIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Import cohort
              </button>
              {onResetDemo ? (
                <button
                  type="button"
                  onClick={onResetDemo}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] border border-transparent text-[color:var(--tomo-mute)] transition hover:border-[color:var(--tomo-rule)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
                  title="Reset to 3 demo lists"
                  aria-label="Reset to demo"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Page heading */}
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="font-[family-name:var(--font-newsreader)] text-[28px] font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--tomo-navy)] sm:text-[30px] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_36]">
              Your lists
            </h1>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
              <span className="font-semibold text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{aggregates.total}</span>{" "}
              total ·{" "}
              <span className="font-semibold text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{aggregates.live}</span>{" "}
              live ·{" "}
              <span className="font-semibold text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{aggregates.manual}</span> manual
            </p>
          </div>

          <p className="mb-6 max-w-[720px] text-sm leading-relaxed text-[color:var(--tomo-body)] sm:mb-6">
            Lists are <span className="font-medium text-[color:var(--tomo-teal)]">cohorts you act on</span>. Define a
            filter or build a manual set, then attach a workflow that runs across every LP in it. Lists update
            automatically as LPs match the criteria.
          </p>

          <ListsSectionDivider label="Your lists" countText={sectionCountText} />

          {rows.length === 0 ? (
            <>
              <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,transparent)] px-4 py-6 text-center text-sm text-[color:var(--tomo-body)]">
                No lists yet. Save a filtered view as a list from Relationships, or use Reset demo to load sample lists.
              </div>
              <ListsCreateListCard />
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map(({ pipeline, count, wfCount }) => (
                <ListIndexRow
                  key={pipeline.id}
                  pipeline={pipeline}
                  count={count}
                  wfCount={wfCount}
                  selected={selectedId === pipeline.id}
                  onSelect={() => onSelect(pipeline.id)}
                />
              ))}
              <ListsCreateListCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
