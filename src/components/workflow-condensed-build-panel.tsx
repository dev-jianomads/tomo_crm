"use client";

import type { ReactNode } from "react";
import type { WorkflowActionBuildAttachment } from "@/lib/workflow-action-build";
import type { WorkflowBuildSubPhase } from "@/lib/workflow-create-draft";
import { WorkflowWizardFileUpload } from "@/components/workflow-wizard-file-upload";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

export type WorkflowCondensedBuildPanelProps = {
  phase: WorkflowBuildSubPhase;
  triggerSection: ReactNode;
  /** Read-only trigger label in review phase */
  triggerLabel?: string;
  contextText: string;
  onContextTextChange: (value: string) => void;
  contextPlaceholder?: string;
  contextLabel?: string;
  attachments: WorkflowActionBuildAttachment[];
  onAttachmentsChange: (attachments: WorkflowActionBuildAttachment[]) => void;
  onOpenAvailability?: () => void;
  availabilitySlotCount?: number;
  actionDescription: string;
  onActionDescriptionChange: (value: string) => void;
  baseSubject: string;
  onBaseSubjectChange: (value: string) => void;
  baseBody: string;
  onBaseBodyChange: (value: string) => void;
  draftLpHint?: string;
  draftActionTitle?: string;
  showDraftAttachments?: boolean;
};

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">{children}</h3>
  );
}

export function WorkflowCondensedBuildPanel({
  phase,
  triggerSection,
  triggerLabel = "",
  contextText,
  onContextTextChange,
  contextPlaceholder = "Theme, trip dates, talking points, anything Tomo should know…",
  contextLabel = "Context",
  attachments,
  onAttachmentsChange,
  onOpenAvailability,
  availabilitySlotCount = 0,
  actionDescription,
  onActionDescriptionChange,
  baseSubject,
  onBaseSubjectChange,
  baseBody,
  onBaseBodyChange,
  draftLpHint,
  draftActionTitle = "Action",
  showDraftAttachments = false,
}: WorkflowCondensedBuildPanelProps) {
  if (phase === "context") {
    return (
      <div className="flex max-w-2xl flex-col gap-4" data-testid="workflow-condensed-build-panel">
        <section className="shrink-0 space-y-1.5" data-testid="workflow-build-trigger-section">
          <span className="text-xs font-medium text-[color:var(--foreground)]">Trigger</span>
          {triggerSection}
        </section>

        <section className="shrink-0 space-y-1.5" data-testid="workflow-build-context-section">
          <span className="text-xs font-medium text-[color:var(--foreground)]">{contextLabel}</span>
          <textarea
            value={contextText}
            onChange={(e) => onContextTextChange(e.target.value)}
            rows={4}
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
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4" data-testid="workflow-build-review-panel">
      <section className="space-y-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
        <SectionHeader>Trigger</SectionHeader>
        <p className="text-sm text-[color:var(--foreground)]">{triggerLabel.trim() || "—"}</p>
      </section>

      <section className="space-y-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
        <SectionHeader>{draftActionTitle}</SectionHeader>
        <input
          value={actionDescription}
          onChange={(e) => onActionDescriptionChange(e.target.value)}
          className="tomo-input w-full text-sm"
          placeholder="Short action label (5–7 words)"
        />
      </section>

      <section className="space-y-3 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
        <SectionHeader>Draft</SectionHeader>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
          <input
            value={baseSubject}
            onChange={(e) => onBaseSubjectChange(e.target.value)}
            className="tomo-input mt-1 w-full text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
          <textarea
            value={baseBody}
            onChange={(e) => onBaseBodyChange(e.target.value)}
            rows={12}
            className="tomo-input mt-1 w-full resize-y text-sm"
          />
        </label>
        {draftLpHint ? (
          <p className="text-xs text-[color:var(--tomo-mute)]">{draftLpHint}</p>
        ) : null}
      </section>

      {showDraftAttachments ? (
        <WorkflowWizardFileUpload
          attachments={attachments}
          onChange={onAttachmentsChange}
          label="Attachments for this outreach"
        />
      ) : null}
    </div>
  );
}
