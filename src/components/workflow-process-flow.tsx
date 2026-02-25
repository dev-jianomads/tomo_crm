"use client";

/**
 * Visual process flow for a workflow/playbook.
 * Pattern: [Target list / individual + context] → [Wait] → [Action] → ... → [+]
 * View-only; user amends workflow via Tomo chat.
 */

import type { Playbook, PlaybookType } from "@/lib/mockPlaybooks";

type FlowStep = { label: string; sublabel?: string; kind: "wait" | "action" };

const STEP_PRESETS: Record<PlaybookType, FlowStep[]> = {
  follow_up: [
    { label: "Wait", sublabel: "5 business days", kind: "wait" },
    { label: "Check reply", sublabel: "Same thread only?", kind: "action" },
    { label: "Create draft", sublabel: "Max 1 attempt", kind: "action" },
  ],
  warm_cadence: [
    { label: "Wait", sublabel: "21 / 45 / 90 days by tier", kind: "wait" },
    { label: "Check skip", sublabel: "Inbound 14d / Outbound 7d", kind: "action" },
    { label: "Create draft", sublabel: "Light touch", kind: "action" },
  ],
  re_engage: [
    { label: "Wait", sublabel: "120 days no touch", kind: "wait" },
    { label: "Nudge", sublabel: "First touch", kind: "action" },
    { label: "Value add", sublabel: "Second touch", kind: "action" },
    { label: "Request call", sublabel: "Third touch", kind: "action" },
  ],
  intro_tracking: [
    { label: "Wait", sublabel: "24 hours", kind: "wait" },
    { label: "Check reply", sublabel: "Replied?", kind: "action" },
    { label: "Remind", sublabel: "If not replied", kind: "action" },
  ],
};

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
  playbook,
  targetsSummary,
}: {
  playbook: Playbook;
  targetsSummary?: string;
}) {
  const steps = STEP_PRESETS[playbook.type] ?? [];
  const isEmpty = steps.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <p className="px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Process flow
      </p>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="flex items-center gap-0">
          {isEmpty ? (
            /* Empty state: only the "+" box */
            <div className="flex min-w-[80px] max-w-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-4">
              <span className="text-2xl font-light text-gray-400">+</span>
              <span className="mt-1 text-[10px] text-gray-500">Add step</span>
            </div>
          ) : (
            <>
              {/* First box: Target list / individual + context */}
              <div className="flex min-w-[100px] max-w-[140px] flex-col rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-900">
                  Target list / individual + context
                </span>
                <span className="mt-0.5 text-[10px] text-gray-500 leading-tight line-clamp-2">
                  {targetsSummary ?? "No targets set"}
                </span>
              </div>

              {steps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <Connector />
                  <div
                    className={`flex min-w-[100px] max-w-[140px] flex-col rounded-lg border-2 px-3 py-2.5 shadow-sm ${
                      step.kind === "wait"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-xs font-semibold text-gray-900">{step.label}</span>
                    {step.sublabel && (
                      <span className="mt-0.5 text-[10px] text-gray-500 leading-tight">
                        {step.sublabel}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Final "+" box */}
              <Connector />
              <div className="flex min-w-[80px] max-w-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-3">
                <span className="text-xl font-light text-gray-400">+</span>
                <span className="mt-0.5 text-[10px] text-gray-500">Add step</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
