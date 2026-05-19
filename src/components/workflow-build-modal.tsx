"use client";

import { useEffect, useState } from "react";
import type { Pipeline } from "@/lib/pipelines";
import type { CreateUserWorkflowInput, CustomPlaybookStored } from "@/lib/customPlaybooks";
import { appendCustomPlaybookWithActionBuild } from "@/lib/customPlaybooks";
import type { WorkflowActionBuildConfig } from "@/lib/workflow-action-build";
import { WorkflowActionBuildModal } from "@/components/workflow-action-build-modal";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";

export type WorkflowBuildModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
  onClose: () => void;
  onWorkflowCreated: (entry: CustomPlaybookStored) => void;
};

type BuildPhase = "trigger_chat" | "action_build" | "done";

export function WorkflowBuildModal({ open, pipeline, onClose, onWorkflowCreated }: WorkflowBuildModalProps) {
  const [phase, setPhase] = useState<BuildPhase>("trigger_chat");
  const [pendingInput, setPendingInput] = useState<CreateUserWorkflowInput | null>(null);
  const [createdEntry, setCreatedEntry] = useState<CustomPlaybookStored | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setPhase("trigger_chat");
      setPendingInput(null);
      setCreatedEntry(null);
    });
  }, [open, pipeline?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pipeline) return null;

  const handleDraftReady = (input: CreateUserWorkflowInput) => {
    setPendingInput(input);
    setPhase("action_build");
  };

  const handleActionBuildComplete = (result: {
    workflowInput: CreateUserWorkflowInput;
    actionBuild: WorkflowActionBuildConfig;
  }) => {
    const entry = appendCustomPlaybookWithActionBuild(result.workflowInput, result.actionBuild);
    if (!entry) return;
    setCreatedEntry(entry);
    setPhase("done");
    onWorkflowCreated(entry);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:items-center"
        data-testid="workflow-build-modal"
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
          aria-labelledby="workflow-build-title"
          className="relative z-[201] my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(88dvh,calc(100vh-2rem))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 pb-4 pt-5 sm:px-6">
            <WorkflowBuildModalHeader pipeline={pipeline} onClose={onClose} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {createdEntry ? (
              <p className="mb-3 rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-sm text-[color:var(--tomo-status-green)]">
                Saved <span className="font-semibold">{createdEntry.name}</span> on this list. Activate it from the card
                when you are ready to run.
              </p>
            ) : (
              <p className="mb-3 text-xs text-[color:var(--tomo-mute)]">
                Step 1: describe the <strong className="text-[color:var(--foreground)]">trigger</strong> with Tomo. Step
                2: configure the <strong className="text-[color:var(--foreground)]">action</strong> (context, instruct,
                drafts).
              </p>
            )}
            {phase === "trigger_chat" ? (
              <WorkflowCreatorChat
                key={pipeline.id}
                pipeline={pipeline}
                surfaceContext="workflows"
                onWorkflowDraftReady={handleDraftReady}
                onWorkflowCreated={onWorkflowCreated}
              />
            ) : null}
          </div>

          <WorkflowBuildModalFooter createdEntry={createdEntry} onClose={onClose} />
        </div>
      </div>

      {pendingInput && phase === "action_build" ? (
        <WorkflowActionBuildModal
          open
          listName={pipeline.name}
          workflowName={pendingInput.name}
          trigger={pendingInput.trigger}
          onClose={() => {
            setPhase("trigger_chat");
            setPendingInput(null);
          }}
          onComplete={handleActionBuildComplete}
        />
      ) : null}
    </>
  );
}

function WorkflowBuildModalHeader({ pipeline, onClose }: { pipeline: Pipeline; onClose: () => void }) {
  return (
    <>
      <div className="mb-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">
        New workflow
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="workflow-build-title"
            className="font-[family-name:var(--font-newsreader)] text-[22px] font-medium leading-tight text-[color:var(--foreground)] [font-variation-settings:'opsz'_26]"
          >
            Build for this list
          </h2>
          <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
            <span className="font-medium text-[color:var(--foreground)]">{pipeline.name}</span>
            <span className="text-[color:var(--tomo-mute)]"> — trigger via chat, then configure the action.</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] text-[color:var(--tomo-mute)] transition hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </>
  );
}

function WorkflowBuildModalFooter({
  createdEntry,
  onClose,
}: {
  createdEntry: CustomPlaybookStored | null;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] px-5 py-3 sm:px-6">
      <button
        type="button"
        onClick={onClose}
        className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-1.5 text-xs font-medium text-[color:var(--foreground)] transition hover:bg-[color:var(--tomo-navy-soft)]"
      >
        {createdEntry ? "Done" : "Cancel"}
      </button>
    </div>
  );
}
