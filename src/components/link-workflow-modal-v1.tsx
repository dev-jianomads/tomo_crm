"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import type { Relationship } from "@/lib/mockData";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers, isManualList, type Pipeline } from "@/lib/pipelines";
import { suggestedPlaybooks, type PlaybookType } from "@/lib/mockPlaybooks";

export type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

type Tab = "system" | "custom";

function triggerSpecForPlaybookType(t: PlaybookType): { kind: "event" | "scheduled" | "signal" | "manual"; label: string } {
  if (t === "themed_outreach" || t === "trip_orchestrator") return { kind: "manual", label: "Manual" };
  if (t === "no_response_stall") return { kind: "signal", label: "Signal" };
  if (
    t === "intro_tracker" ||
    t === "post_meeting" ||
    t === "ddq_response" ||
    t === "reengagement_urgent"
  ) {
    return { kind: "event", label: "Event-triggered" };
  }
  return { kind: "scheduled", label: "Scheduled" };
}

function triggerClass(kind: "event" | "scheduled" | "signal" | "manual"): string {
  if (kind === "event") return "bg-[color:color-mix(in_srgb,var(--tomo-teal)_12%,transparent)] text-[color:var(--tomo-teal)]";
  if (kind === "signal") return "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]";
  if (kind === "manual") return "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]";
  return "bg-[color:var(--tomo-card-warm)] text-[color:var(--tomo-mute)]";
}

function modalContextCopy(pipeline: Pipeline, manual: boolean, lpCount: number): ReactNode {
  const filterLine = manual
    ? pipeline.manualDescription?.trim() || "Manual list · explicit membership"
    : formatFilterSummary(pipeline.filterCriteria).replace(/^Tomo:\s*/i, "").trim() || "No structured filters";
  return (
    <div>
      <strong>{pipeline.name}</strong> · {lpCount} LPs
      {manual ? (
        <span className="text-[color:var(--tomo-mute)]"> · {filterLine}</span>
      ) : (
        <span className="text-[color:var(--tomo-mute)]">
          {" "}
          ·{" "}
          <span className="text-[color:var(--tomo-mute)]">
            <span className="mr-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-teal)]">
              Filter
            </span>
            {filterLine}
          </span>
        </span>
      )}
    </div>
  );
}

export type LinkWorkflowModalV1Props = {
  open: boolean;
  pipeline: Pipeline | null;
  relationships: Relationship[];
  customPlaybooks: CustomPlaybookStored[];
  onClose: () => void;
  setPlaybookOverrides: (
    val: PlaybookPipelineOverrides | ((prev: PlaybookPipelineOverrides) => PlaybookPipelineOverrides)
  ) => void;
  router: { push: (href: string) => void };
};

/**
 * Lists v1 “Run workflow on this list” dialog — `design/tomo_lists_v1.html` (link workflow modal).
 */
export function LinkWorkflowModalV1({
  open,
  pipeline,
  relationships,
  customPlaybooks,
  onClose,
  setPlaybookOverrides,
  router,
}: LinkWorkflowModalV1Props) {
  const [tab, setTab] = useState<Tab>("system");
  const [selectedId, setSelectedId] = useState<string>("");

  const manual = pipeline ? isManualList(pipeline) : false;
  const lpCount = useMemo(() => {
    if (!pipeline) return 0;
    return getPipelineMembers(relationships, pipeline).length;
  }, [relationships, pipeline]);

  const systemCount = suggestedPlaybooks.length;
  const customCount = customPlaybooks.length;

  useEffect(() => {
    if (!open || !pipeline) return;
    queueMicrotask(() => {
      setTab("system");
      const first = suggestedPlaybooks.find((p) => !p.comingSoonLabel) ?? suggestedPlaybooks[0];
      setSelectedId(first?.id ?? "");
    });
  }, [open, pipeline]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectFirstInTab = (t: Tab) => {
    if (t === "system") {
      const first = suggestedPlaybooks.find((p) => !p.comingSoonLabel) ?? suggestedPlaybooks[0];
      setSelectedId(first?.id ?? "");
    } else {
      setSelectedId(customPlaybooks[0]?.id ?? "");
    }
  };

  const selectedSystem = tab === "system" ? suggestedPlaybooks.find((p) => p.id === selectedId) : undefined;
  const selectionBlocked = Boolean(selectedSystem?.comingSoonLabel);

  const confirm = () => {
    if (!pipeline) return;
    if (!selectedId || selectionBlocked) {
      toast.error("Pick an available workflow");
      return;
    }
    setPlaybookOverrides((prev) => ({
      ...prev,
      [selectedId]: { pipelineId: pipeline.id },
    }));
    toast.success("Opening workflow for this list");
    router.push(`/workflows?playbook=${encodeURIComponent(selectedId)}`);
    onClose();
  };

  if (!open || !pipeline) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:items-center"
      data-testid="list-link-workflow-modal"
    >
      <button
        type="button"
        className="fixed inset-0 bg-[color:rgba(28,43,58,0.30)] backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-link-wf-title"
        className="relative z-[201] my-auto flex w-full max-w-[720px] flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(85dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-6 pb-[18px] pt-[22px] sm:px-7">
          <div className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">
            Run workflow on this list
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="list-link-wf-title"
              className="font-[family-name:var(--font-newsreader)] text-[22px] font-medium leading-tight text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_26]"
            >
              Pick a workflow
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] text-[color:var(--tomo-mute)] transition hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mt-1.5 text-xs leading-relaxed text-[color:var(--tomo-body)]">{modalContextCopy(pipeline, manual, lpCount)}</div>
        </div>

        <div className="flex shrink-0 gap-0 border-b border-[color:var(--tomo-rule)] px-6 sm:px-7" role="tablist" aria-label="Workflow source">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "system"}
            onClick={() => {
              setTab("system");
              selectFirstInTab("system");
            }}
            className={`mb-[-1px] flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-medium transition ${
              tab === "system"
                ? "border-[color:var(--tomo-teal)] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
                : "border-transparent text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
            }`}
          >
            System defaults
            <span className="rounded-full bg-[color:var(--tomo-card-warm)] px-1.5 py-px font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
              {systemCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "custom"}
            onClick={() => {
              setTab("custom");
              selectFirstInTab("custom");
            }}
            className={`mb-[-1px] flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-medium transition ${
              tab === "custom"
                ? "border-[color:var(--tomo-teal)] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
                : "border-transparent text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
            }`}
          >
            Custom
            <span className="rounded-full bg-[color:var(--tomo-card-warm)] px-1.5 py-px font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
              {customCount}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-[18px] sm:px-7">
          {tab === "system" ? (
            <div className="flex flex-col gap-2">
              {suggestedPlaybooks.map((pb) => {
                const spec = triggerSpecForPlaybookType(pb.type);
                const selected = selectedId === pb.id;
                const locked = Boolean(pb.comingSoonLabel);
                return (
                  <button
                    key={pb.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setSelectedId(pb.id)}
                    className={`rounded-[var(--tomo-radius-md)] border px-4 py-3.5 text-left transition ${
                      locked
                        ? "cursor-not-allowed border-[color:var(--tomo-rule-soft)] opacity-60"
                        : selected
                          ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)]"
                          : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] hover:border-[color:var(--tomo-navy)]"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2.5">
                      <span className="font-[family-name:var(--font-newsreader)] text-[15px] font-medium leading-snug text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_18]">
                        {pb.name}
                      </span>
                      <span
                        className={`font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[2px] ${triggerClass(spec.kind)}`}
                      >
                        {spec.label}
                      </span>
                      {pb.comingSoonLabel ? (
                        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] text-[color:var(--tomo-mute)]">{pb.comingSoonLabel}</span>
                      ) : null}
                    </div>
                    <p className="mb-1.5 text-xs leading-snug text-[color:var(--tomo-body)]">{pb.summary}</p>
                    <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
                      {pb.targetCount != null ? (
                        <span>
                          <span className="font-semibold text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{pb.targetCount}</span> in seed cohort
                        </span>
                      ) : null}
                      <span>Draft only · GP approval</span>
                      <span>De-dup in Workflows</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : customPlaybooks.length === 0 ? (
            <p className="text-sm text-[color:var(--tomo-mute)]">No custom workflows yet. Create one from Workflows.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {customPlaybooks.map((c) => {
                const selected = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`rounded-[var(--tomo-radius-md)] border px-4 py-3.5 text-left transition ${
                      selected
                        ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)]"
                        : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] hover:border-[color:var(--tomo-navy)]"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2.5">
                      <span className="font-[family-name:var(--font-newsreader)] text-[15px] font-medium leading-snug text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] [font-variation-settings:'opsz'_18]">
                        {c.name}
                      </span>
                      <span
                        className={`font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[2px] ${triggerClass("manual")}`}
                      >
                        Custom
                      </span>
                    </div>
                    <p className="mb-1.5 text-xs leading-snug text-[color:var(--tomo-body)]">{c.action}</p>
                    <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
                      <span>User-defined flow</span>
                      <span>De-dup in Workflows</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
            <span className="font-semibold text-[color:var(--tomo-teal)]">{lpCount}</span> LPs in this cohort · duplicate prevention in Workflows
          </span>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-1.5 text-xs font-medium text-[color:var(--tomo-navy)] transition hover:border-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedId || selectionBlocked || (tab === "custom" && customPlaybooks.length === 0)}
              onClick={confirm}
              className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white transition enabled:hover:bg-[color:var(--tomo-teal-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open in Workflows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
