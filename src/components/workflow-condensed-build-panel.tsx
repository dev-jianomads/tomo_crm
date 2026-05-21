"use client";

import { useState, type ReactNode } from "react";
import { CalendarDaysIcon, ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { Pipeline } from "@/lib/pipelines";
import type { UserWorkflowAction } from "@/lib/custom-playbook-schema";
import type { WorkflowActionBuildAttachment } from "@/lib/workflow-action-build";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import { WorkflowWizardFileUpload } from "@/components/workflow-wizard-file-upload";

export type WorkflowCondensedBuildPanelProps = {
  pipeline: Pipeline;
  workflowName: string;
  triggerSection: ReactNode;
  contextText: string;
  onContextTextChange: (value: string) => void;
  contextPlaceholder?: string;
  contextLabel?: string;
  actionSectionLabel?: string;
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
  contextLabel = "Context",
  actionSectionLabel = "Tomo — define action",
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
  const [hasRefinedOnce, setHasRefinedOnce] = useState(
    () => actionPromptConfirmed || Boolean(tomoInstruction.trim())
  );
  const [actionSummaryOpen, setActionSummaryOpen] = useState(false);

  const showGenerateDrafts = hasRefinedOnce;

  return (
    <div
      className={`grid min-h-[min(32rem,60vh)] gap-4 ${draftVisible ? "lg:grid-cols-2" : ""} lg:items-start`}
      data-testid="workflow-condensed-build-panel"
    >
      <div className="flex flex-col gap-4">
        <section className="shrink-0 space-y-1.5" data-testid="workflow-build-trigger-section">
          <span className="text-xs font-medium text-[color:var(--foreground)]">Trigger</span>
          {triggerSection}
        </section>

        <section className="shrink-0 space-y-1.5">
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

        <section className="min-h-0 space-y-1.5">
          <span className="text-xs font-medium text-[color:var(--foreground)]">{actionSectionLabel}</span>
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
            hideSectionHeader
            actionPills={actionPills}
            actionPromptConfirmed={actionPromptConfirmed}
            confirmedActionInstruction={tomoInstruction}
            onStreamingChange={onStreamingChange}
            onActionPromptRevoked={onActionPromptRevoked}
            onActionPillSelect={onActionPillSelect}
            onRefineStarted={() => setHasRefinedOnce(true)}
            showGenerateDrafts={showGenerateDrafts}
            onGenerateDrafts={onGenerateDrafts}
            canGenerateDrafts={canGenerateDrafts}
            generatingDrafts={generating}
            generateDraftsLabel={generateLabel}
            onWorkflowCreated={() => {}}
            onActionPromptConfirmed={(payload) => {
              setHasRefinedOnce(true);
              onActionPromptConfirmed(payload);
            }}
            onActionConfirmed={(action) => {
              setHasRefinedOnce(true);
              onActionConfirmed(action);
            }}
          />
          {actionChatStreaming && !generating ? (
            <p className="text-[11px] text-[color:var(--tomo-mute)]">Tomo is refining…</p>
          ) : null}
        </section>
      </div>

      {draftVisible && baseBody ? (
        <div className="flex min-h-0 flex-col gap-3 lg:sticky lg:top-0 lg:max-h-[min(72vh,640px)] lg:overflow-y-auto" data-testid="workflow-build-draft-panel">
          <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_25%,var(--tomo-card))]">
            <button
              type="button"
              onClick={() => setActionSummaryOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              aria-expanded={actionSummaryOpen}
            >
              <div className="min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
                  {draftActionTitle}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-[color:var(--tomo-mute)]">
                  {actionDescription.trim() || "Step summary — expand to edit"}
                </p>
              </div>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-[color:var(--tomo-mute)] transition ${actionSummaryOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {actionSummaryOpen ? (
              <div className="border-t border-[color:var(--tomo-rule-soft)] px-4 pb-4">
                <p className="mt-2 text-[11px] text-[color:var(--tomo-mute)]">
                  Short label for what Tomo runs per LP (from your refined prompt). Collapsed by default so you can
                  focus on the email draft.
                </p>
                <textarea
                  value={actionDescription}
                  onChange={(e) => onActionDescriptionChange(e.target.value)}
                  rows={3}
                  className="tomo-input mt-2 w-full resize-y text-sm"
                />
              </div>
            ) : null}
          </div>

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
                rows={12}
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
