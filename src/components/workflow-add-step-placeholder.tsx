"use client";

/**
 * Placeholder when user clicks "+ Add step" — structural changes go through Tomo.
 */
export function WorkflowAddStepPlaceholder({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="mt-3 rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-3 shadow-[var(--tomo-shadow-1)]"
      data-testid="workflow-add-step-placeholder"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Add step</p>
          <p className="mt-1 text-xs leading-snug text-[color:var(--foreground)]">
            New steps are added through <span className="font-medium">TOMO AI</span> at the bottom of this drawer.
            Describe what to insert (e.g. &quot;Add a wait step after Draft Reply&quot;) and Tomo will update the
            flow.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[11px] font-medium text-[color:var(--tomo-mute)] transition hover:text-[color:var(--foreground)]"
        >
          Close
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[color:var(--tomo-mute)]">
        Tip: suggestion chips under the chat are a fast way to iterate without typing from scratch.
      </p>
    </div>
  );
}
