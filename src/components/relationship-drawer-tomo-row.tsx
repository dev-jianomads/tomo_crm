"use client";

import { FormEvent } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";
import { useTomoDrawerOrchestrate, type CrmUpdatePayload, type TomoDrawerOrchestrateSelection } from "@/hooks/use-tomo-drawer-orchestrate";

export type RelationshipDrawerTomoRowProps = {
  entityKey: string;
  selection: TomoDrawerOrchestrateSelection;
  contextLabel?: string;
  assistanceContext?: TomoAssistance | null;
  onCrmUpdate?: (payload: CrmUpdatePayload) => void;
};

/**
 * Single-line Tomo input for the relationship drawer — same orchestration path as the full chat panel.
 * Styling aligned with `design/tomo_relationships_lp_drawer_v2.html` update strip.
 */
export function RelationshipDrawerTomoRow({
  entityKey,
  selection,
  contextLabel,
  assistanceContext,
  onCrmUpdate,
}: RelationshipDrawerTomoRowProps) {
  const { input, setInput, handleSend, isStreaming } = useTomoDrawerOrchestrate({
    entityKey,
    selection,
    contextLabel,
    assistanceContext,
    onCrmUpdate,
  });

  return (
    <div
      className="shrink-0 border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-canvas)] px-4 py-3 dark:bg-[color:var(--tomo-navy-soft)]"
      data-testid="relationship-drawer-tomo-row"
    >
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">Update with Tomo</p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2.5 shadow-[var(--tomo-shadow-1)] transition focus-within:border-[color:var(--tomo-teal)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="How can I help update this CRM record?"
          disabled={isStreaming}
          className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--tomo-mute)] disabled:opacity-50"
          aria-label="Ask Tomo to update CRM fields"
        />
        <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--tomo-teal)] sm:inline">AI</span>
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="shrink-0 rounded-[2px] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] p-1.5 text-[color:var(--tomo-mute)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal)] hover:text-white disabled:opacity-30"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
        {isStreaming ? (
          <span className="shrink-0 text-xs text-[color:var(--tomo-mute)]" aria-live="polite">
            …
          </span>
        ) : null}
      </form>
      <p className="mt-2 font-mono text-[10px] tracking-[0.04em] text-[color:var(--tomo-mute)]">
        Example: <span className="italic text-[color:var(--tomo-body)]">Set stage to Soft commit and owner to IR Person</span>
      </p>
    </div>
  );
}
