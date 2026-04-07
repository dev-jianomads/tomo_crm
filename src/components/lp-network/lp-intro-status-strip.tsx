"use client";

import type { IntroductionStatus } from "@/lib/mockLpNetwork";

/** Product copy aligned with execution plan (GP view). */
export const LP_INTRO_PIPELINE_STEPS: {
  status: IntroductionStatus;
  label: string;
  hint: string;
}[] = [
  { status: "eligible", label: "Eligible", hint: "Mandate matches your fund; you have not requested an intro yet." },
  { status: "gp_requested", label: "LP notified", hint: "TOMO has notified the allocator of your request." },
  { status: "lp_pending", label: "Awaiting LP", hint: "Allocator is deciding whether to accept the introduction." },
  { status: "lp_approved", label: "LP approved", hint: "Allocator agreed; TOMO can connect both sides." },
  { status: "connected", label: "Introduction sent", hint: "Connection email sent with one line of context." },
];

export function lpIntroStepIndex(status: IntroductionStatus): number {
  return LP_INTRO_PIPELINE_STEPS.findIndex((s) => s.status === status);
}

export function LpIntroStatusStrip({ status }: { status: IntroductionStatus }) {
  const currentStep = lpIntroStepIndex(status);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Introduction status</p>
      <ol className="mt-3 space-y-2">
        {LP_INTRO_PIPELINE_STEPS.map((step, i) => {
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
    </div>
  );
}
