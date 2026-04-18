"use client";

/**
 * Placeholder when user clicks "+ Add step" — structural changes go through Tomo.
 */
export function WorkflowAddStepPlaceholder({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 shadow-sm"
      data-testid="workflow-add-step-placeholder"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Add step</p>
          <p className="mt-1 text-xs leading-snug text-gray-700">
            New steps are added through <span className="font-medium">TOMO AI</span> at the bottom of this drawer.
            Describe what to insert (e.g. &quot;Add a wait step after Draft Reply&quot;) and Tomo will update the
            flow.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[11px] font-medium text-gray-500 hover:text-gray-800"
        >
          Close
        </button>
      </div>
      <p className="mt-2 text-[10px] text-gray-500">
        Tip: suggestion chips under the chat are a fast way to iterate without typing from scratch.
      </p>
    </div>
  );
}
