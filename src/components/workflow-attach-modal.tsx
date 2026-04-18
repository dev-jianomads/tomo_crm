"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Pipeline } from "@/lib/pipelines";
import type { Relationship } from "@/lib/mockData";
import { suggestedPlaybooks } from "@/lib/mockPlaybooks";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import { applyFilters, formatFilterSummary } from "@/lib/relationshipFilters";
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
    setMode("existing");
    setCreatedEntry(null);
    const first = suggestedPlaybooks[0]?.id ?? customPlaybooks[0]?.id ?? "";
    setSelectedPlaybookId(first);
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
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 p-4 sm:items-center"
      data-testid="workflow-attach-modal"
    >
      <div className="fixed inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-attach-title"
        className={`relative z-[61] my-auto flex w-full ${ENABLE_WORKFLOW_CREATOR ? "max-w-lg" : "max-w-md"} flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[min(92dvh,calc(100vh-2rem))]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500">Attach workflow</p>
              <h2 id="workflow-attach-title" className="text-lg font-semibold text-gray-900">
                Link to this list
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{pipeline.name}</span>
                <span className="text-gray-500">
                  {" "}
                  · {pipelineCount} relationships
                  {pipelineSummary ? ` · ${pipelineSummary}` : ""}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              aria-label="Close"
            >
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
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "existing"
                    ? "bg-[color:var(--accent-soft)] text-gray-900 ring-1 ring-[color:var(--accent)]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "custom"}
                onClick={() => setMode("custom")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "custom"
                    ? "bg-[color:var(--accent-soft)] text-gray-900 ring-1 ring-[color:var(--accent)]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              <p className="mb-2 text-xs font-medium text-gray-500">User-defined workflows</p>
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
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="font-semibold text-gray-900">{pb.name}</span>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{pb.summary}</p>
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
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                  Created <span className="font-semibold">{createdEntry.name}</span>. Open it in the drawer to edit
                  the flow with Tomo.
                </p>
              ) : null}
              <WorkflowCreatorChat key={pipeline.id} pipeline={pipeline} onWorkflowCreated={handleWorkflowCreated} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
