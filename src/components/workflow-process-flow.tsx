"use client";

/**
 * Visual process flow for a workflow/playbook.
 * Renders from a WorkflowDefinition (parsed from markdown).
 * Pattern: [Trigger] → [Step 1] → [Step 2] → ... → [+]
 */

import type { WorkflowDefinition } from "@/lib/workflow-templates";

function Connector() {
  return (
    <div className="mx-1 flex h-8 w-12 flex-shrink-0 items-center justify-center">
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

export function WorkflowProcessFlow({
  workflow,
}: {
  workflow: WorkflowDefinition;
}) {
  const { trigger, steps } = workflow;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Process flow
      </p>
      <div className="flex flex-1 items-center overflow-x-auto p-4">
        <div className="flex items-center gap-0">
          {/* Trigger card */}
          <div className="flex min-w-[110px] max-w-[150px] flex-col rounded-lg border-2 border-blue-200 bg-blue-50/50 px-3 py-2.5 shadow-sm">
            <span className="text-[10px] font-medium uppercase tracking-wide text-blue-500">
              Trigger
            </span>
            <span className="mt-0.5 text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
              {trigger}
            </span>
          </div>

          {steps.map((step, i) => (
            <div key={`${step.name}-${i}`} className="flex items-center">
              <Connector />
              <div
                className={`flex min-w-[110px] max-w-[150px] flex-col rounded-lg border-2 px-3 py-2.5 shadow-sm transition-all duration-300 ${
                  step.type === "wait"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-xs font-semibold text-gray-900">
                  {step.name}
                </span>
                <span className="mt-0.5 text-[10px] text-gray-500 leading-tight line-clamp-2">
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
          <div className="flex min-w-[80px] max-w-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-3">
            <span className="text-xl font-light text-gray-400">+</span>
            <span className="mt-0.5 text-[10px] text-gray-500">Add step</span>
          </div>
        </div>
      </div>
    </div>
  );
}
