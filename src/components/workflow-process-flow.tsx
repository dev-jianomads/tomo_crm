"use client";

/**
 * Visual process flow for a workflow/playbook.
 * Renders from a WorkflowDefinition (parsed from markdown).
 * Pattern: [Step 1 trigger] → [Step 2] → [Step 3] → ... → [+]
 *
 * When highlightVersion bumps, only cards that actually changed
 * (or were newly added) get the pulse-glow animation.
 */

import { useEffect, useRef, useState } from "react";
import type { WorkflowDefinition, WorkflowStep, WorkflowTriggerKind } from "@/lib/workflow-templates";

const TRIGGER_KIND_LABEL: Record<WorkflowTriggerKind, string> = {
  EVENT: "EVENT",
  THRESHOLD: "THRESHOLD",
  SCHEDULED: "SCHEDULED",
};

/** Border/background + chip colors — Tomo tokens; EVENT / THRESHOLD / SCHEDULED stay visually distinct. */
const TRIGGER_KIND_STYLES: Record<
  WorkflowTriggerKind,
  { card: string; label: string; chip: string }
> = {
  EVENT: {
    card: "border-[color:color-mix(in_srgb,var(--tomo-teal)_42%,var(--tomo-rule))] bg-[color:var(--tomo-teal-tint)]",
    label: "text-[color:var(--tomo-teal-muted)]",
    chip: "bg-[color:var(--tomo-teal)]",
  },
  THRESHOLD: {
    card: "border-[color:color-mix(in_srgb,var(--tomo-status-amber)_48%,var(--tomo-rule))] bg-[color:var(--tomo-status-amber-bg)]",
    label: "text-[color:var(--tomo-status-amber-text)]",
    chip: "bg-[color:var(--tomo-status-amber)]",
  },
  SCHEDULED: {
    card: "border-[color:color-mix(in_srgb,var(--accent)_45%,var(--tomo-rule))] bg-[color:var(--accent-soft)]",
    label: "text-[color:var(--accent-ink)]",
    chip: "bg-[color:var(--accent)]",
  },
};

/** Matches label row (subtle Step N line + mb-1) so arrows align with cards, not labels. */
const CONNECTOR_TOP_PAD = "pt-[20px]";

function Connector() {
  return (
    <div
      className={`mx-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center self-start sm:mx-1 sm:w-10 ${CONNECTOR_TOP_PAD}`}
    >
      <svg
        className="h-4 w-4 text-[color:var(--tomo-rule)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  );
}

function TomoUpdatedLabel() {
  return (
    <span className="mt-1.5 animate-pulse text-[10px] font-medium text-[color:var(--tomo-teal)]">
      Tomo updated
    </span>
  );
}

const GLOW_CLASS = "animate-[ring-pulse_1s_ease-out_5]";

function stepEquals(a: WorkflowStep | undefined, b: WorkflowStep | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.description === b.description &&
    (a.duration ?? "") === (b.duration ?? "") &&
    (a.condition ?? "") === (b.condition ?? "") &&
    (a.draftTemplate ?? "") === (b.draftTemplate ?? "")
  );
}

export type FlowSelection =
  | { kind: "trigger" }
  | { kind: "step"; index: number }
  | { kind: "add-step" };

export function WorkflowProcessFlow({
  workflow,
  highlightVersion = 0,
  selection = null,
  onSelect,
}: {
  workflow: WorkflowDefinition;
  highlightVersion?: number;
  selection?: FlowSelection | null;
  onSelect?: (target: FlowSelection) => void;
}) {
  const { trigger, steps } = workflow;
  const triggerKind: WorkflowTriggerKind = workflow.triggerKind ?? "EVENT";
  const prevWorkflow = useRef<WorkflowDefinition | null>(null);
  const prevVersion = useRef(highlightVersion);
  const [changedSet, setChangedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const versionBumped = highlightVersion !== prevVersion.current;
    prevVersion.current = highlightVersion;

    if (!versionBumped || highlightVersion === 0) {
      prevWorkflow.current = workflow;
      return;
    }

    const prev = prevWorkflow.current;
    const changed = new Set<string>();

    const prevKind = prev?.triggerKind ?? "EVENT";
    const nextKind = workflow.triggerKind ?? "EVENT";
    if (!prev || prev.trigger !== workflow.trigger || prevKind !== nextKind) {
      changed.add("trigger");
    }

    const maxLen = Math.max(prev?.steps.length ?? 0, workflow.steps.length);
    for (let i = 0; i < maxLen; i++) {
      if (!stepEquals(prev?.steps[i], workflow.steps[i])) {
        changed.add(`step-${i}`);
      }
    }

    prevWorkflow.current = workflow;

    if (changed.size === 0) return;

    queueMicrotask(() => setChangedSet(changed));
    const timer = setTimeout(() => setChangedSet(new Set()), 5000);
    return () => clearTimeout(timer);
  }, [highlightVersion, workflow]);

  const isGlowing = (key: string) => changedSet.has(key);
  const glowFor = (key: string) => (isGlowing(key) ? GLOW_CLASS : "");
  const kindStyle = TRIGGER_KIND_STYLES[triggerKind];
  const interactive = Boolean(onSelect);
  const flowKey = (k: FlowSelection) =>
    k.kind === "trigger" ? "trigger" : k.kind === "add-step" ? "add-step" : `step-${k.index}`;
  const selectionMatches = (a: FlowSelection | null, b: FlowSelection) =>
    Boolean(a && flowKey(a) === flowKey(b) && (a.kind !== "step" || b.kind !== "step" || a.index === b.index));
  const isSel = (k: FlowSelection) =>
    selectionMatches(selection, k) ? "ring-2 ring-[color:var(--accent)] ring-offset-1" : "";
  const cardInteractive =
    "cursor-pointer text-left transition hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))] hover:bg-[color:var(--tomo-navy-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";

  return (
    <div className="flex flex-col overflow-hidden" data-testid="workflow-process-flow">
      <p className="px-4 pt-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">Process flow</p>
      <div className="flex min-h-0 items-start overflow-x-auto px-4 py-2">
        <div className="flex items-start gap-0">
          {/* Trigger card */}
          <div className="flex shrink-0 flex-col items-center">
            <span className="mb-1 w-full text-center text-[10px] font-medium text-[color:var(--tomo-mute)]">Step 1</span>
            <button
              type="button"
              disabled={!interactive}
              data-testid="workflow-flow-trigger"
              onClick={() => onSelect?.({ kind: "trigger" })}
              className={`flex w-[160px] min-h-0 flex-col rounded-lg border-2 px-3 py-1.5 shadow-[var(--tomo-shadow-1)] sm:w-[190px] ${kindStyle.card} ${glowFor("trigger")} ${isSel({ kind: "trigger" })} ${interactive ? cardInteractive : ""}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] font-medium uppercase tracking-wide ${kindStyle.label}`}>
                  Trigger
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ${kindStyle.chip}`}
                  title={`Trigger type: ${TRIGGER_KIND_LABEL[triggerKind]}`}
                  data-testid="workflow-trigger-kind-badge"
                  data-trigger-kind={triggerKind}
                >
                  {TRIGGER_KIND_LABEL[triggerKind]}
                </span>
              </div>
              <span className="mt-0.5 text-xs font-semibold leading-snug text-[color:var(--foreground)] line-clamp-4">
                {trigger}
              </span>
            </button>
            {isGlowing("trigger") && <TomoUpdatedLabel />}
          </div>

          {steps.map((step, i) => {
            const key = `step-${i}`;
            return (
              <div key={`${step.name}-${i}`} className="flex items-start">
                <Connector />
                <div className="flex flex-col items-center">
                  <span className="mb-1 w-full min-w-[140px] text-center text-[10px] font-medium text-[color:var(--tomo-mute)] sm:min-w-[170px]">
                    Step {i + 2}
                  </span>
                  <button
                    type="button"
                    disabled={!interactive}
                    data-testid={`workflow-flow-step-${i}`}
                    onClick={() => onSelect?.({ kind: "step", index: i })}
                    className={`flex w-[140px] min-h-0 flex-col rounded-lg border-2 border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-1.5 shadow-[var(--tomo-shadow-1)] transition-all duration-300 sm:w-[170px] ${glowFor(key)} ${isSel({ kind: "step", index: i })} ${interactive ? cardInteractive : ""}`}
                  >
                    <span className="text-xs font-semibold text-[color:var(--foreground)]">{step.name}</span>
                    <span className="mt-0.5 text-[10px] leading-snug text-[color:var(--tomo-mute)] line-clamp-4">
                      {step.description}
                    </span>
                    {step.duration && (
                      <span className="mt-1 inline-flex items-center self-start rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_72%,var(--tomo-card))] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--tomo-body)]">
                        {step.duration}
                      </span>
                    )}
                  </button>
                  {isGlowing(key) && <TomoUpdatedLabel />}
                </div>
              </div>
            );
          })}

          {/* Add step card */}
          <Connector />
          <div className="flex w-[80px] shrink-0 flex-col items-center">
            <span className="mb-1 invisible text-[10px]">.</span>
            <button
              type="button"
              disabled={!interactive}
              data-testid="workflow-flow-add-step"
              onClick={() => onSelect?.({ kind: "add-step" })}
              className={`flex min-h-0 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_45%,var(--tomo-card))] px-2 py-1.5 ${isSel({ kind: "add-step" })} ${interactive ? `${cardInteractive} disabled:cursor-not-allowed disabled:opacity-60` : ""}`}
            >
              <span className="text-lg font-light leading-none text-[color:var(--tomo-mute)]">+</span>
              <span className="mt-0.5 text-[10px] text-[color:var(--tomo-body)]">Add step</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
