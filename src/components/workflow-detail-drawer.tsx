"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { WorkflowProcessFlow, type FlowSelection } from "@/components/workflow-process-flow";
import { WorkflowOutboundSafetyChip } from "@/components/workflow-outbound-safety-chip";
import { WorkflowAddStepPlaceholder } from "@/components/workflow-add-step-placeholder";
import { WorkflowStepConfigPanel } from "@/components/workflow-step-config-panel";
import { WorkflowActivityLogAccordion } from "@/components/workflow-activity-log-accordion";
import { WorkflowTomoStrip } from "@/components/workflow-tomo-strip";
import type { WorkflowDefinition } from "@/lib/workflow-templates";
import type { PlaybookType } from "@/lib/mockPlaybooks";
import type { ReactNode } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type PipelineBanner =
  | {
      kind: "ok";
      name: string;
      count: number;
      filterSummary?: string;
    }
  | { kind: "missing"; pipelineId: string }
  | null;

type PipelineCtx = {
  pipelineId: string;
  pipelineName: string;
  relationshipIds: string[];
  relationshipCount: number;
} | null;

type WorkflowDetailDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onReset: () => void;
  workflow: WorkflowDefinition;
  highlightVersion: number;
  playbookPipelineBanner: PipelineBanner;
  outboundAudienceCount: number;
  playbookName: string;
  playbookType?: PlaybookType;
  pipelineContext: PipelineCtx;
  onWorkflowUpdate: (def: WorkflowDefinition) => void;
  /** Optional extra node under header (e.g. Tomo Default note) */
  headerNote?: ReactNode;
  /** First LP from the linked list (or a demo relationship) for draft previews */
  previewLp?: { name: string; firm: string } | null;
  /** Mock activity log is keyed by this id (playbook / custom / Tomo default row id) */
  workflowRowId: string | null;
  /** Linked list name for log copy; optional when global or missing banner */
  activityLogListName?: string | null;
  /** Tomo Default workflows — log shows global recipient note */
  activityLogIsGlobal?: boolean;
};

/**
 * Right-hand drawer: scrollable flow + fixed single-row Tomo (laptop-first).
 */
export function WorkflowDetailDrawer({
  open,
  title,
  onClose,
  onReset,
  workflow,
  highlightVersion,
  playbookPipelineBanner,
  outboundAudienceCount,
  playbookName,
  playbookType,
  pipelineContext,
  onWorkflowUpdate,
  headerNote,
  previewLp = null,
  workflowRowId,
  activityLogListName = null,
  activityLogIsGlobal = false,
}: WorkflowDetailDrawerProps) {
  const [flowSelection, setFlowSelection] = useState<FlowSelection | null>(null);

  useEffect(() => {
    if (!open) setFlowSelection(null);
  }, [open]);

  useEffect(() => {
    setFlowSelection((sel) => {
      if (!sel) return null;
      if (sel.kind === "trigger" || sel.kind === "add-step") return sel;
      return sel.index < workflow.steps.length ? sel : null;
    });
  }, [workflow]);

  return (
    <>
      <div
        className={`tomo-drawer-veil fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[min(1200px,96vw)] flex-col overflow-hidden border-l border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-drawer-shadow)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-modal="true"
        aria-label={title}
        data-testid="workflow-detail-drawer"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
            {headerNote}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-testid="workflow-drawer-reset"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-2.5 py-1.5 text-xs text-[color:var(--tomo-body)] transition hover:bg-[color:var(--tomo-navy-soft)] dark:hover:bg-[color:var(--tomo-navy-soft)]"
              title="Restore this workflow to its default template (clears saved edits for this row)"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Reset
            </button>
            <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {playbookPipelineBanner?.kind === "ok" && (
              <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Audience list</p>
                <p className="mt-0.5 text-sm font-semibold text-[color:var(--foreground)]">{playbookPipelineBanner.name}</p>
                <p className="mt-0.5 text-xs text-[color:var(--tomo-body)]">
                  {playbookPipelineBanner.count} relationships
                  {playbookPipelineBanner.filterSummary ? ` · ${playbookPipelineBanner.filterSummary}` : ""}
                </p>
              </div>
            )}
            {playbookPipelineBanner?.kind === "missing" && (
              <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-status-amber-bg)] px-4 py-2 text-xs text-[color:var(--tomo-status-amber-text)]">
                Linked list not found ({playbookPipelineBanner.pipelineId}). Pick another list or reset.
              </div>
            )}
            {outboundAudienceCount > 0 ? (
              <WorkflowOutboundSafetyChip
                relationshipCount={outboundAudienceCount}
                audienceLabel="list"
                workflowTitle={title}
              />
            ) : null}
            <div className="px-2 py-3">
              <WorkflowProcessFlow
                workflow={workflow}
                highlightVersion={highlightVersion}
                selection={flowSelection}
                onSelect={setFlowSelection}
              />
              {flowSelection?.kind === "add-step" ? (
                <WorkflowAddStepPlaceholder onDismiss={() => setFlowSelection(null)} />
              ) : flowSelection ? (
                <WorkflowStepConfigPanel
                  workflow={workflow}
                  target={flowSelection}
                  previewLp={previewLp}
                  onSave={(def) => {
                    onWorkflowUpdate(def);
                  }}
                  onDismiss={() => setFlowSelection(null)}
                />
              ) : null}
            </div>

            <WorkflowActivityLogAccordion
              workflowRowId={workflowRowId}
              listName={activityLogListName}
              isGlobalWorkflow={activityLogIsGlobal}
            />
          </div>

          <WorkflowTomoStrip
            workflow={workflow}
            playbookName={playbookName}
            playbookType={playbookType}
            pipelineContext={pipelineContext}
            onWorkflowUpdate={onWorkflowUpdate}
          />
        </div>
      </aside>
    </>
  );
}
