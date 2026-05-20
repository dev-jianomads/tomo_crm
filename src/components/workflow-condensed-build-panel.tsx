"use client";

import type { ReactNode } from "react";
import { CalendarDaysIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { Pipeline } from "@/lib/pipelines";
import type { UserWorkflowAction } from "@/lib/custom-playbook-schema";
import type { WorkflowActionBuildAttachment } from "@/lib/workflow-action-build";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import { WorkflowWizardFileUpload } from "@/components/workflow-wizard-file-upload";

export type WorkflowCondensedBuildPanelProps = {
  pipeline: Pipeline;
  workflowName: string;
  /** Section 1 — primary: plain trigger row; follow-up: radio trigger UI. */
  triggerSection: ReactNode;
  contextText: string;
  onContextTextChange: (value: string) => void;
  contextPlaceholder?: string;
  contextLabel?: string;
  attachments: WorkflowActionBuildAttachment[];
  onAttachmentsChange: (attachments: WorkflowActionBuildAttachment[]) => void;
  onOpenAvailability?: () => void;
  availabilitySlotCount?: number;
  actionChatKey: number;
  confirmedTrigger?: string;
  orchestratorContextText: string;
  attachmentNames: string[];
  actionPills: ReadonlyArray<{ id: string; label: string; instruction: string; kind?: string }>;
  tomoInstruction: string;
  actionPromptConfirmed: boolean;
  actionChatStreaming: boolean;
  generating: boolean;
  canGenerateDrafts: boolean;
  generateLabel?: string;
  onGenerateDrafts: () => void;
  onActionPillSelect: (pill: { id: string; label: string; instruction: string; kind?: string }) => void;
  onActionPromptConfirmed: (payload: {
    instruction: string;
    actionDescription: string | null;
    actionKind: "send_email" | "schedule_meeting" | "schedule_call" | "other";
  }) => void;
  onActionConfirmed: (action: UserWorkflowAction) => void;
  onActionPromptRevoked: () => void;
  onStreamingChange: (streaming: boolean) => void;
  draftVisible: boolean;
  actionDescription: string;
  onActionDescriptionChange: (value: string) => void;
  baseSubject: string;
  onBaseSubjectChange: (value: string) => void;
  baseBody: string;
  onBaseBodyChange: (value: string) => void;
  lpDraftCount: number;
  draftActionTitle?: string;
  draftTemplateTitle?: string;
  draftLpHint?: string;
  showDraftAttachments?: boolean;
};

export function WorkflowCondensedBuildPanel({
  pipeline,
  workflowName,
  triggerSection,
  contextText,
  onContextTextChange,
  contextPlaceholder = "Theme, trip dates, talking points, anything Tomo should know…",
  contextLabel = "Context for Tomo",
  attachments,
  onAttachmentsChange,
  onOpenAvailability,
  availabilitySlotCount = 0,
  actionChatKey,
  confirmedTrigger,
  orchestratorContextText,
  attachmentNames,
  actionPills,
  tomoInstruction,
  actionPromptConfirmed,
  actionChatStreaming,
  generating,
  canGenerateDrafts,
  generateLabel = "Generate drafts",
  onGenerateDrafts,
  onActionPillSelect,
  onActionPromptConfirmed,
  onActionConfirmed,
  onActionPromptRevoked,
  onStreamingChange,
  draftVisible,
  actionDescription,
  onActionDescriptionChange,
  baseSubject,
  onBaseSubjectChange,
  baseBody,
  onBaseBodyChange,
  lpDraftCount,
  draftActionTitle = "Action",
  draftTemplateTitle = "LP draft",
  draftLpHint,
  showDraftAttachments = false,
}: WorkflowCondensedBuildPanelProps) {
  return (
    <div
      className={`grid min-h-[min(32rem,60vh)] gap-4 ${draftVisible ? "lg:grid-cols-2" : ""} lg:items-start`}
      data-testid="workflow-condensed-build-panel"
    >
      <div className="flex flex-col gap-4">
        <section className="space-y-1.5" data-testid="workflow-build-trigger-section">
          <span className="text-xs font-medium text-[color:var(--foreground)]">Trigger</span>
          {triggerSection}
        </section>

        <section className="space-y-1.5">
          <span className="text-xs font-medium text-[color:var(--foreground)]">{contextLabel}</span>
          <textarea
            value={contextText}
            onChange={(e) => onContextTextChange(e.target.value)}
            rows={3}
            className="tomo-input w-full resize-none text-sm"
            placeholder={contextPlaceholder}
          />
          <div className="flex flex-wrap items-center gap-2">
            <WorkflowWizardFileUpload
              attachments={attachments}
              onChange={onAttachmentsChange}
              label=""
              emptyHint=""
              compact
            />
            {onOpenAvailability ? (
              <button
                type="button"
                onClick={onOpenAvailability}
                className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] px-2.5 py-1.5 text-xs text-[color:var(--tomo-body)] transition hover:border-[color:var(--tomo-teal)]"
                aria-label="Availability"
              >
                <CalendarDaysIcon className="h-4 w-4 text-[color:var(--tomo-mute)]" aria-hidden />
                Availability
                {availabilitySlotCount > 0 ? (
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-teal)]">
                    ({availabilitySlotCount})
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </section>

        <section className="min-h-0">
          <WorkflowCreatorChat
            key={`action-${actionChatKey}`}
            pipeline={pipeline}
            surfaceContext="workflows"
            wizardStep="action"
            workflowName={workflowName}
            confirmedTrigger={confirmedTrigger}
            contextText={orchestratorContextText}
            attachmentNames={attachmentNames}
            variant="wizardCondensed"
            actionPills={actionPills}
            actionPromptConfirmed={actionPromptConfirmed}
            confirmedActionInstruction={tomoInstruction}
            onOpenAvailability={onOpenAvailability}
            availabilitySlotCount={availabilitySlotCount}
            onStreamingChange={onStreamingChange}
            onActionPromptRevoked={onActionPromptRevoked}
            onActionPillSelect={onActionPillSelect}
            onWorkflowCreated={() => {}}
            onActionPromptConfirmed={onActionPromptConfirmed}
            onActionConfirmed={onActionConfirmed}
          />
        </section>

        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--tomo-rule-soft)] pt-3">
          {actionChatStreaming && !generating ? (
            <span className="text-[11px] text-[color:var(--tomo-mute)]">Tomo is refining…</span>
          ) : null}
          <button
            type="button"
            disabled={!canGenerateDrafts || generating || actionChatStreaming}
            onClick={onGenerateDrafts}
            className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            data-testid="workflow-generate-drafts"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {generating ? "Drafting…" : generateLabel}
          </button>
        </div>
      </div>

      {draftVisible && baseBody ? (
        <div className="space-y-4 lg:sticky lg:top-0" data-testid="workflow-build-draft-panel">
          <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_25%,var(--tomo-card))] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
              {draftActionTitle}
            </h3>
            <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">
              What Tomo will do for each LP when this workflow runs.
            </p>
            <textarea
              value={actionDescription}
              onChange={(e) => onActionDescriptionChange(e.target.value)}
              rows={4}
              className="tomo-input mt-3 w-full resize-y text-sm"
            />
          </section>
          <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
                {draftTemplateTitle}
              </h3>
              <button
                type="button"
                disabled={generating}
                onClick={onGenerateDrafts}
                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--tomo-teal)] disabled:opacity-50"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
              <input
                value={baseSubject}
                onChange={(e) => onBaseSubjectChange(e.target.value)}
                className="tomo-input mt-1 w-full text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
              <textarea
                value={baseBody}
                onChange={(e) => onBaseBodyChange(e.target.value)}
                rows={10}
                className="tomo-input mt-1 w-full resize-y text-sm"
              />
            </label>
            <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">
              {draftLpHint ?? `${lpDraftCount} LP drafts — personalise on the next step.`}
            </p>
          </section>
          {showDraftAttachments ? (
            <WorkflowWizardFileUpload
              attachments={attachments}
              onChange={onAttachmentsChange}
              label="Attachments for this outreach"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
