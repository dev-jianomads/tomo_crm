"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Pipeline } from "@/lib/pipelines";
import type { Relationship } from "@/lib/mockData";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import { formatFilterSummary } from "@/lib/relationshipFilters";
import { getPipelineMembers } from "@/lib/pipelines";

const ENABLE_WORKFLOW_CREATOR = true;

type PlaybookPipelineOverrides = Record<string, { pipelineId?: string }>;

type WorkflowAttachModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
  relationships: Relationship[];
  customPlaybooks: CustomPlaybookStored[];
  onClose: () => void;
  setPlaybookOverrides: (
    val: PlaybookPipelineOverrides | ((prev: PlaybookPipelineOverrides) => PlaybookPipelineOverrides)
  ) => void;
  /** After linking an existing playbook */
  onLinkedPlaybook: (playbookId: string) => void;
};

export function WorkflowAttachModal({
  open,
  pipeline,
  relationships,
  customPlaybooks,
  onClose,
  setPlaybookOverrides,
  onLinkedPlaybook,
}: WorkflowAttachModalProps) {
  const [mode, setMode] = useState<"existing" | "custom">("existing");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>(
    () => suggestedPlaybooks[0]?.id ?? ""
  );
  const [createdEntry, setCreatedEntry] = useState<CustomPlaybookStored | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setMode("existing");
      setCreatedEntry(null);
      const first = suggestedPlaybooks[0]?.id ?? customPlaybooks[0]?.id ?? "";
      setSelectedPlaybookId(first);
    });
  }, [open, pipeline?.id, customPlaybooks]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pipeline) return null;

  const pipelineSummary = formatFilterSummary(pipeline.filterCriteria);
  const pipelineCount = getPipelineMembers(relationships, pipeline).length;

  const linkPlaybook = (playbookId: string) => {
    setPlaybookOverrides((prev) => ({
      ...prev,
      [playbookId]: { pipelineId: pipeline.id },
    }));
    toast.success("Workflow linked to this list");
    onLinkedPlaybook(playbookId);
    onClose();
  };

  const handleWorkflowCreated = (entry: CustomPlaybookStored) => {
    setPlaybookOverrides((prev) => ({
      ...prev,
      [entry.id]: { pipelineId: pipeline.id },
    }));
    setCreatedEntry(entry);
    toast.success("Workflow created and linked to this list");
  };

  const openCreatedInDrawer = () => {
    if (!createdEntry) return;
    onLinkedPlaybook(createdEntry.id);
    onClose();
  };

  const allExistingRows: { id: string; name: string; summary: string }[] = [
    ...suggestedPlaybooks.map((pb) => ({ id: pb.id, name: pb.name, summary: pb.summary })),
    ...customPlaybooks.map((c) => ({ id: c.id, name: c.name, summary: c.action })),
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain tomo-modal-scrim p-4 sm:items-center"
      data-testid="workflow-attach-modal"
    >
      <div className="fixed inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-attach-title"
        className={`relative z-[61] my-auto flex w-full ${ENABLE_WORKFLOW_CREATOR ? "max-w-lg" : "max-w-md"} flex-col overflow-hidden rounded-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(92dvh,calc(100vh-2rem))]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tomo-field-label">Create workflow</p>
              <h2 id="workflow-attach-title" className="text-lg font-semibold text-[color:var(--foreground)]">
                Link to this list
              </h2>
              <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
                <span className="font-medium text-[color:var(--foreground)]">{pipeline.name}</span>
                <span className="text-[color:var(--tomo-mute)]">
                  {" "}
                  · {pipelineCount} relationships
                  {pipelineSummary ? ` · ${pipelineSummary}` : ""}
                </span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="tomo-drawer-icon-btn shrink-0 text-lg leading-none" aria-label="Close">
              ×
            </button>
          </div>
          {ENABLE_WORKFLOW_CREATOR && (
            <div className="mt-3 flex gap-2" role="tablist" aria-label="Workflow source">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "existing"}
                onClick={() => setMode("existing")}
                className={`rounded-[var(--tomo-radius-md)] px-3 py-1.5 text-xs font-medium transition ${
                  mode === "existing"
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:var(--accent)]"
                    : "bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_85%,var(--tomo-card))] text-[color:var(--tomo-body)] hover:bg-[color:var(--tomo-navy-soft)]"
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "custom"}
                onClick={() => setMode("custom")}
                className={`rounded-[var(--tomo-radius-md)] px-3 py-1.5 text-xs font-medium transition ${
                  mode === "custom"
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:var(--accent)]"
                    : "bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_85%,var(--tomo-card))] text-[color:var(--tomo-body)] hover:bg-[color:var(--tomo-navy-soft)]"
                }`}
              >
                Custom
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {(!ENABLE_WORKFLOW_CREATOR || mode === "existing") && (
            <>
              <p className="mb-2 text-xs font-medium text-[color:var(--tomo-mute)]">User-defined workflows</p>
              <ul className="space-y-2">
                {allExistingRows.map((pb) => {
                  const selected = selectedPlaybookId === pb.id;
                  return (
                    <li key={pb.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlaybookId(pb.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent)]"
                            : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))]"
                        }`}
                      >
                        <span className="font-semibold text-[color:var(--foreground)]">{pb.name}</span>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[color:var(--tomo-body)]">{pb.summary}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {ENABLE_WORKFLOW_CREATOR && mode === "custom" && (
            <div className="space-y-3">
              {createdEntry ? (
                <p className="rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-sm text-[color:var(--tomo-status-green)]">
                  Created <span className="font-semibold">{createdEntry.name}</span>. Open it in the drawer to edit
                  the flow with Tomo.
                </p>
              ) : null}
              <WorkflowCreatorChat key={pipeline.id} pipeline={pipeline} onWorkflowCreated={handleWorkflowCreated} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Cancel
          </button>
          {ENABLE_WORKFLOW_CREATOR && mode === "custom" && createdEntry ? (
            <button
              type="button"
              onClick={openCreatedInDrawer}
              className="button-primary rounded-md px-3 py-2 text-sm font-medium"
            >
              Open workflow
            </button>
          ) : null}
          {(!ENABLE_WORKFLOW_CREATOR || mode === "existing") && (
            <button
              type="button"
              onClick={() => {
                if (!selectedPlaybookId) {
                  toast.error("Select a workflow");
                  return;
                }
                linkPlaybook(selectedPlaybookId);
              }}
              className="button-primary rounded-md px-3 py-2 text-sm font-medium"
            >
              Link workflow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
