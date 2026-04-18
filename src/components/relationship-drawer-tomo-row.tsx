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
    <div className="shrink-0 border-t border-gray-200 bg-gray-50/90 px-4 py-3" data-testid="relationship-drawer-tomo-row">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">Update with Tomo</p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="How can I help update this CRM record?"
          disabled={isStreaming}
          className="min-w-0 flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
          aria-label="Ask Tomo to update CRM fields"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="shrink-0 text-gray-500 transition hover:text-gray-800 disabled:opacity-30"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
        {isStreaming ? (
          <span className="shrink-0 text-xs text-gray-500" aria-live="polite">
            …
          </span>
        ) : null}
      </form>
    </div>
  );
}
