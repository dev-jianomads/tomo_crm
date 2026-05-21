"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Pipeline } from "@/lib/pipelines";
import type { UserWorkflowAction } from "@/lib/custom-playbook-schema";
import {
  WORKFLOW_FOLLOW_UP_V15,
  formatFollowUpTriggerLabel,
  type WorkflowFollowUpTrigger,
} from "@/lib/workflow-follow-up-design";
import {
  buildMockActionBuildLpDrafts,
  mergeContextWithAttachmentText,
  WORKFLOW_FOLLOW_UP_ACTION_PILLS,
  type WorkflowActionBuildConfig,
} from "@/lib/workflow-action-build";
import { WorkflowCondensedBuildPanel } from "@/components/workflow-condensed-build-panel";
import {
  canGenerateLegDrafts,
  hasGeneratedLegDrafts,
  setLegTriggerSpec,
  type WorkflowLegDraft,
} from "@/lib/workflow-leg-draft";
import { deriveWorkflowActionDescription } from "@/lib/workflow-action-description";

function instructionFromAction(action: UserWorkflowAction): string {
  if (action.kind === "send_email") return action.body;
  return "";
}

export type WorkflowLegWizardProps = {
  pipeline: Pipeline;
  workflowName: string;
  primaryActionBuild?: WorkflowActionBuildConfig;
  primaryTrigger?: string;
  draft: WorkflowLegDraft;
  onDraftChange: (draft: WorkflowLegDraft | ((prev: WorkflowLegDraft) => WorkflowLegDraft)) => void;
  onBackLeg?: () => void;
  onSaveFollowUp: () => void;
};

export function WorkflowLegWizard({
  pipeline,
  workflowName,
  primaryActionBuild,
  primaryTrigger,
  draft,
  onDraftChange,
  onBackLeg,
  onSaveFollowUp,
}: WorkflowLegWizardProps) {
  const [generating, setGenerating] = useState(false);
  const [actionChatKey, setActionChatKey] = useState(0);
  const [actionChatStreaming, setActionChatStreaming] = useState(false);

  const mergedContextText = useMemo(
    () => mergeContextWithAttachmentText(draft.contextText, draft.attachments),
    [draft.contextText, draft.attachments]
  );

  const primaryTemplateContext = useMemo(() => {
    if (!primaryActionBuild?.baseSubject && !primaryActionBuild?.baseBody) return "";
    return [
      "Primary outreach template (use as context for follow-up):",
      `Subject: ${primaryActionBuild.baseSubject}`,
      primaryActionBuild.baseBody,
      primaryTrigger ? `Primary trigger: ${primaryTrigger}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [primaryActionBuild, primaryTrigger]);

  const orchestratorContextText = useMemo(() => {
    if (!primaryTemplateContext.trim()) return mergedContextText;
    if (!mergedContextText.trim()) return primaryTemplateContext;
    return `${mergedContextText.trim()}\n\n${primaryTemplateContext}`;
  }, [mergedContextText, primaryTemplateContext]);

  const attachmentNames = draft.attachments.map((a) => a.name);
  const draftPanelVisible = hasGeneratedLegDrafts(draft);

  const runTomoGenerate = useCallback(async () => {
    const instruction = draft.tomoInstruction.trim();
    if (!instruction) {
      toast.error("Describe the follow-up in the action section first");
      return;
    }
    setGenerating(true);
    try {
      const primaryTemplate =
        primaryActionBuild?.baseSubject?.trim() && primaryActionBuild.baseBody?.trim()
          ? {
              subject: primaryActionBuild.baseSubject,
              body: primaryActionBuild.baseBody,
              trigger: primaryTrigger,
              actionDescription: primaryActionBuild.actionDescription,
            }
          : undefined;

      const res = await fetch("/api/tomo/generate-workflow-cohort-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: `${workflowName.trim()} — follow-up`,
          listName: pipeline.name,
          instruction,
          contextText: mergedContextText,
          draftKind: "follow_up",
          primaryTemplate,
          trigger: draft.trigger,
          attachmentNames: draft.attachments.map((a) => a.name),
        }),
      });
      if (!res.ok) throw new Error("Draft generation failed");
      const generated = (await res.json()) as {
        subject: string;
        body: string;
        actionDescription: string;
        usedLlm?: boolean;
      };
      const { subject, body, actionDescription } = generated;
      const cohort = buildMockActionBuildLpDrafts(pipeline.name).map((d) => ({
        ...d,
        subject,
        body: body.replace(/\{\{lp_first_name\}\}/g, d.lpName.split(" ")[0] ?? "there"),
        status: "ready" as const,
        personalised: false,
      }));
      const actionSpec = {
        kind: "send_email" as const,
        subject,
        body,
      } satisfies UserWorkflowAction;
      onDraftChange((prev) => ({
        ...prev,
        baseSubject: subject,
        baseBody: body,
        actionDescription:
          prev.actionDescription.trim() ||
          deriveWorkflowActionDescription({ instruction, actionDescription }),
        lpDrafts: cohort,
        actionSpec,
      }));
      toast.success(
        generated.usedLlm ? "Tomo drafted your follow-up template" : "Follow-up draft ready (offline template)"
      );
    } catch {
      toast.error("Could not generate follow-up drafts — try again");
    } finally {
      setGenerating(false);
    }
  }, [
    draft.attachments,
    draft.tomoInstruction,
    draft.trigger,
    onDraftChange,
    mergedContextText,
    pipeline.name,
    primaryActionBuild,
    primaryTrigger,
    workflowName,
  ]);

  const selectTriggerKind = (kind: WorkflowFollowUpTrigger["kind"]) => {
    if (kind === "wait") {
      onDraftChange((prev) =>
        setLegTriggerSpec(prev, {
          kind: "wait",
          days: prev.triggerSpec.kind === "wait" ? prev.triggerSpec.days : WORKFLOW_FOLLOW_UP_V15.defaultWaitDays,
          condition: "no_reply",
        })
      );
      return;
    }
    onDraftChange((prev) =>
      setLegTriggerSpec(prev, { kind: "on_inbound_reply", condition: "any_reply" })
    );
  };

  const setWaitDays = (days: number) => {
    const clamped = Math.min(
      WORKFLOW_FOLLOW_UP_V15.maxWaitDays,
      Math.max(WORKFLOW_FOLLOW_UP_V15.minWaitDays, Math.round(days))
    );
    onDraftChange((prev) => {
      if (prev.triggerSpec.kind !== "wait") return prev;
      return setLegTriggerSpec(prev, { kind: "wait", days: clamped, condition: "no_reply" });
    });
  };

  const selectActionPill = (pill: { id: string; label: string; instruction: string; kind?: string }) => {
    onDraftChange((prev) => ({
      ...prev,
      tomoInstruction: "",
      actionPromptConfirmed: false,
      actionDescription: pill.label,
      actionSpec: {
        kind: "send_email",
        subject: `Re: ${workflowName.trim() || "Outreach"}`,
        body: "",
      },
    }));
    toast.message(`Selected: ${pill.label} — tell Tomo how to refine it`);
  };

  const followUpTriggerSection = (
    <div className="space-y-3" data-testid="workflow-leg-trigger-section">
      <p className="text-[11px] text-[color:var(--tomo-mute)]">
        When Tomo should draft the follow-up. One cohort template for all LPs in v1.5.
      </p>
      <fieldset className="space-y-2">
        <label className="flex cursor-pointer gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] p-2.5 has-[:checked]:border-[color:var(--tomo-teal)]">
          <input
            type="radio"
            name="follow-up-trigger"
            checked={draft.triggerSpec.kind === "wait"}
            onChange={() => selectTriggerKind("wait")}
            className="mt-0.5"
          />
          <span className="min-w-0 flex-1 text-xs">
            <span className="font-medium text-[color:var(--foreground)]">Wait, then no reply</span>
            {draft.triggerSpec.kind === "wait" ? (
              <span className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min={WORKFLOW_FOLLOW_UP_V15.minWaitDays}
                  max={WORKFLOW_FOLLOW_UP_V15.maxWaitDays}
                  value={draft.triggerSpec.days}
                  onChange={(e) => setWaitDays(Number(e.target.value))}
                  className="tomo-input w-14 text-sm"
                />
                <span>days</span>
              </span>
            ) : null}
          </span>
        </label>
        <label className="flex cursor-pointer gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] p-2.5 has-[:checked]:border-[color:var(--tomo-teal)]">
          <input
            type="radio"
            name="follow-up-trigger"
            checked={draft.triggerSpec.kind === "on_inbound_reply"}
            onChange={() => selectTriggerKind("on_inbound_reply")}
            className="mt-0.5"
          />
          <span className="text-xs font-medium text-[color:var(--foreground)]">When LP replies</span>
        </label>
      </fieldset>
      <p className="text-[11px] text-[color:var(--tomo-status-green)]">
        {formatFollowUpTriggerLabel(draft.triggerSpec)}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="workflow-leg-wizard">
      {onBackLeg ? (
        <button
          type="button"
          onClick={onBackLeg}
          className="mb-3 text-xs text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-teal)]"
        >
          ← Back to primary
        </button>
      ) : null}

      <WorkflowCondensedBuildPanel
        pipeline={pipeline}
        workflowName={`${workflowName} — follow-up`}
        triggerSection={followUpTriggerSection}
        contextText={draft.contextText}
        onContextTextChange={(v) => onDraftChange((prev) => ({ ...prev, contextText: v }))}
        contextLabel="Extra context (optional)"
        contextPlaceholder="Tone for the nudge, what to reference from the primary email…"
        attachments={draft.attachments}
        onAttachmentsChange={(attachments) => onDraftChange((prev) => ({ ...prev, attachments }))}
        actionChatKey={actionChatKey}
        confirmedTrigger={draft.trigger}
        orchestratorContextText={orchestratorContextText}
        attachmentNames={attachmentNames}
        actionPills={[...WORKFLOW_FOLLOW_UP_ACTION_PILLS]}
        tomoInstruction={draft.tomoInstruction}
        actionPromptConfirmed={draft.actionPromptConfirmed}
        actionChatStreaming={actionChatStreaming}
        generating={generating}
        canGenerateDrafts={canGenerateLegDrafts(draft)}
        generateLabel="Generate follow-up drafts"
        onGenerateDrafts={() => void runTomoGenerate()}
        onActionPillSelect={selectActionPill}
        onStreamingChange={setActionChatStreaming}
        onActionPromptRevoked={() =>
          onDraftChange((prev) => ({ ...prev, actionPromptConfirmed: false }))
        }
        onActionPromptConfirmed={({ instruction, actionDescription }) => {
          onDraftChange((prev) => ({
            ...prev,
            tomoInstruction: instruction,
            actionPromptConfirmed: true,
            actionDescription:
              actionDescription?.trim() ||
              deriveWorkflowActionDescription({
                instruction,
                actionDescription: prev.actionDescription,
              }),
            actionSpec: {
              kind: "send_email",
              subject: `Re: ${workflowName.trim() || "Outreach"}`,
              body: instruction,
            },
          }));
          toast.success("Follow-up prompt set");
        }}
        onActionConfirmed={(action) => {
          if (action.kind !== "send_email") {
            toast.error("Follow-up actions must be email only in v1.5");
            return;
          }
          onDraftChange((prev) => ({
            ...prev,
            actionSpec: action,
            tomoInstruction: prev.tomoInstruction.trim() || instructionFromAction(action),
            actionPromptConfirmed: true,
          }));
        }}
        draftVisible={draftPanelVisible}
        actionDescription={draft.actionDescription}
        onActionDescriptionChange={(v) => onDraftChange((prev) => ({ ...prev, actionDescription: v }))}
        baseSubject={draft.baseSubject}
        onBaseSubjectChange={(v) => onDraftChange((prev) => ({ ...prev, baseSubject: v }))}
        baseBody={draft.baseBody}
        onBaseBodyChange={(v) => onDraftChange((prev) => ({ ...prev, baseBody: v }))}
        lpDraftCount={draft.lpDrafts.length}
        draftActionTitle="Follow-up action"
        draftTemplateTitle="Cohort follow-up template"
        draftLpHint={`${draft.lpDrafts.length} LP slots — same template for all (no per-LP personalise in v1.5).`}
      />

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] pt-3">
        <button
          type="button"
          disabled={!draftPanelVisible}
          onClick={onSaveFollowUp}
          className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          data-testid="workflow-save-follow-up"
        >
          Save workflow with follow-up
        </button>
      </div>
    </div>
  );
}
