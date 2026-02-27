"use client";

/**
 * Visual process flow for a workflow/playbook.
 * Renders from a WorkflowDefinition (parsed from markdown).
 * Pattern: [Trigger] → [Step 1] → [Step 2] → ... → [+]
 *
 * When highlightVersion bumps, only cards that actually changed
 * (or were newly added) get the pulse-glow animation.
 */

import { useEffect, useRef, useState } from "react";
import type { WorkflowDefinition, WorkflowStep } from "@/lib/workflow-templates";

function Connector() {
  return (
    <div className="mx-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center sm:mx-1 sm:w-10">
      <svg
        className="h-4 w-4 text-gray-300"
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

const GLOW_CLASS = "animate-[ring-pulse_1s_ease-out_3]";

function stepEquals(a: WorkflowStep | undefined, b: WorkflowStep | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.description === b.description &&
    (a.duration ?? "") === (b.duration ?? "") &&
    (a.condition ?? "") === (b.condition ?? "")
  );
}

export function WorkflowProcessFlow({
  workflow,
  highlightVersion = 0,
}: {
  workflow: WorkflowDefinition;
  highlightVersion?: number;
}) {
  const { trigger, steps } = workflow;
  const prevWorkflow = useRef<WorkflowDefinition | null>(null);
  const [changedSet, setChangedSet] = useState<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevWorkflow.current = workflow;
      return;
    }
    if (highlightVersion === 0) {
      prevWorkflow.current = workflow;
      return;
    }

    const prev = prevWorkflow.current;
    const changed = new Set<string>();

    if (!prev || prev.trigger !== workflow.trigger) {
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

    setChangedSet(changed);
    const timer = setTimeout(() => setChangedSet(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [highlightVersion, workflow]);

  const glowFor = (key: string) => (changedSet.has(key) ? GLOW_CLASS : "");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Process flow
      </p>
      <div className="flex flex-1 items-center overflow-x-auto px-4 py-3">
        <div className="flex items-stretch gap-0">
          {/* Trigger card */}
          <div
            className={`flex w-[160px] shrink-0 flex-col rounded-lg border-2 border-blue-200 bg-blue-50/50 px-3 py-2.5 shadow-sm sm:w-[190px] ${glowFor("trigger")}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-blue-500">
              Trigger
            </span>
            <span className="mt-0.5 text-xs font-semibold text-gray-900 leading-tight line-clamp-3">
              {trigger}
            </span>
          </div>

          {steps.map((step, i) => (
            <div key={`${step.name}-${i}`} className="flex items-center">
              <Connector />
              <div
                className={`flex w-[140px] shrink-0 flex-col rounded-lg border-2 px-3 py-2.5 shadow-sm transition-all duration-300 sm:w-[170px] ${
                  step.type === "wait"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-gray-200 bg-white"
                } ${glowFor(`step-${i}`)}`}
              >
                <span className="text-xs font-semibold text-gray-900 truncate">
                  {step.name}
                </span>
                <span className="mt-0.5 text-[10px] text-gray-500 leading-tight line-clamp-3">
                  {step.description}
                </span>
                {step.duration && (
                  <span className="mt-1 text-[10px] font-medium text-amber-600">
                    {step.duration}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Add step card */}
          <Connector />
          <div className="flex w-[80px] shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 px-3 py-3">
            <span className="text-xl font-light text-gray-400">+</span>
            <span className="mt-0.5 text-[10px] text-gray-500">Add step</span>
          </div>
        </div>
      </div>
    </div>
  );
}
