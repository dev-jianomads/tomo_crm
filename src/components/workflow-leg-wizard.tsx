"use client";

import { useCallback, useMemo, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
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
import { WorkflowWizardFileUpload } from "@/components/workflow-wizard-file-upload";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import {
  canAdvanceLegStep,
  legStepIndex,
  maxReachableLegStep,
  setLegTriggerSpec,
  WORKFLOW_LEG_STEPS,
  type WorkflowLegDraft,
  type WorkflowLegStep,
} from "@/lib/workflow-leg-draft";

function instructionFromAction(action: UserWorkflowAction): string {
  if (action.kind === "send_email") return action.body;
  return "";
}

export type WorkflowLegWizardProps = {
  pipeline: Pipeline;
  workflowName: string;
  /** Primary leg templates — passed into follow-up draft generation context. */
  primaryActionBuild?: WorkflowActionBuildConfig;
  primaryTrigger?: string;
  draft: WorkflowLegDraft;
  onDraftChange: (draft: WorkflowLegDraft | ((prev: WorkflowLegDraft) => WorkflowLegDraft)) => void;
  step: WorkflowLegStep;
  onStepChange: (step: WorkflowLegStep) => void;
  onBackFromTrigger?: () => void;
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
  step,
  onStepChange,
  onBackFromTrigger,
  onBackLeg,
  onSaveFollowUp,
}: WorkflowLegWizardProps) {
  const [generating, setGenerating] = useState(false);
  const [actionChatKey, setActionChatKey] = useState(0);

  const reachable = maxReachableLegStep(draft);
  const reachableIdx = legStepIndex(reachable);
  const currentIdx = legStepIndex(step);

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

  const goToStep = (target: WorkflowLegStep) => {
    const targetIdx = legStepIndex(target);
    if (targetIdx <= reachableIdx || target === step) onStepChange(target);
  };

  const runTomoGenerate = useCallback(async () => {
    const instruction = draft.tomoInstruction.trim();
    if (!instruction) {
      toast.error("Complete the follow-up action prompt with Tomo first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/tomo/generate-workflow-cohort-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: `${workflowName.trim()} — follow-up`,
          listName: pipeline.name,
          instruction,
          contextText: orchestratorContextText,
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
        actionDescription: prev.actionDescription.trim() || actionDescription,
        lpDrafts: cohort,
        actionSpec,
      }));
      onStepChange("draft");
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
    onStepChange,
    orchestratorContextText,
    pipeline.name,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="workflow-leg-wizard">
      <ol className="mb-4 flex flex-wrap gap-2">
        {WORKFLOW_LEG_STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isReachable = i <= reachableIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!isReachable && !isActive}
                onClick={() => goToStep(s.id)}
                className={`rounded-full border px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]"
                    : isReachable
                      ? "border-[color:var(--tomo-rule-soft)] text-[color:var(--tomo-body)] hover:border-[color:var(--tomo-teal)]"
                      : "cursor-not-allowed border-[color:var(--tomo-rule-soft)] text-[color:var(--tomo-mute)] opacity-50"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      {step === "trigger" ? (
        <div className="space-y-4" data-testid="workflow-leg-trigger-step">
          <p className="text-xs text-[color:var(--tomo-body)]">
            Choose when Tomo should draft the follow-up. Per-LP personalise is off in v1.5 — one cohort template
            applies to all LPs.
          </p>
          <fieldset className="space-y-3">
            <label className="flex cursor-pointer gap-3 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] p-3 has-[:checked]:border-[color:var(--tomo-teal)]">
              <input
                type="radio"
                name="follow-up-trigger"
                checked={draft.triggerSpec.kind === "wait"}
                onChange={() => selectTriggerKind("wait")}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-[color:var(--foreground)]">Wait, then no reply</span>
                <span className="mt-1 block text-xs text-[color:var(--tomo-mute)]">
                  Draft follow-up only if the LP has not replied after the primary send.
                </span>
                {draft.triggerSpec.kind === "wait" ? (
                  <span className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-[color:var(--tomo-body)]">Wait</span>
                    <input
                      type="number"
                      min={WORKFLOW_FOLLOW_UP_V15.minWaitDays}
                      max={WORKFLOW_FOLLOW_UP_V15.maxWaitDays}
                      value={draft.triggerSpec.days}
                      onChange={(e) => setWaitDays(Number(e.target.value))}
                      className="tomo-input w-16 text-sm"
                    />
                    <span className="text-[color:var(--tomo-body)]">days</span>
                  </span>
                ) : null}
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] p-3 has-[:checked]:border-[color:var(--tomo-teal)]">
              <input
                type="radio"
                name="follow-up-trigger"
                checked={draft.triggerSpec.kind === "on_inbound_reply"}
                onChange={() => selectTriggerKind("on_inbound_reply")}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-[color:var(--foreground)]">When LP replies</span>
                <span className="mt-1 block text-xs text-[color:var(--tomo-mute)]">
                  Draft a contextual response as soon as Tomo attributes an inbound reply to the primary email.
                </span>
              </span>
            </label>
          </fieldset>
          <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-xs text-[color:var(--tomo-status-green)]">
            {formatFollowUpTriggerLabel(draft.triggerSpec)}
          </p>
          {onBackFromTrigger ? (
            <button type="button" onClick={onBackFromTrigger} className="text-xs text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-teal)]">
              ← Back to primary personalise
            </button>
          ) : null}
        </div>
      ) : null}

      {step === "action" ? (
        <div className="grid min-h-[28rem] gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--foreground)]">Extra context (optional)</span>
              <textarea
                value={draft.contextText}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, contextText: e.target.value }))}
                className="tomo-input mt-1.5 h-[10rem] w-full resize-none text-sm"
                placeholder="Tone for the nudge, what to reference from the primary email…"
              />
            </label>
            {draft.actionPromptConfirmed && draft.tomoInstruction.trim() ? (
              <div className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-status-green)]">
                  Follow-up prompt ready
                </p>
                <textarea
                  value={draft.tomoInstruction}
                  onChange={(e) =>
                    onDraftChange((prev) => ({
                      ...prev,
                      tomoInstruction: e.target.value,
                      actionPromptConfirmed: e.target.value.trim().length > 0,
                    }))
                  }
                  rows={4}
                  className="tomo-input mt-2 w-full resize-y text-sm"
                />
              </div>
            ) : null}
          </div>
          <WorkflowCreatorChat
            key={`follow-up-action-${actionChatKey}`}
            pipeline={pipeline}
            surfaceContext="workflows"
            wizardStep="action"
            workflowName={`${workflowName} — follow-up`}
            confirmedTrigger={draft.trigger}
            contextText={orchestratorContextText}
            attachmentNames={attachmentNames}
            variant="wizard"
            actionPills={[...WORKFLOW_FOLLOW_UP_ACTION_PILLS]}
            actionPromptConfirmed={draft.actionPromptConfirmed}
            confirmedActionInstruction={draft.tomoInstruction}
            onActionPillSelect={selectActionPill}
            onWorkflowCreated={() => {}}
            onActionPromptConfirmed={({ instruction, actionDescription }) => {
              onDraftChange((prev) => ({
                ...prev,
                tomoInstruction: instruction,
                actionPromptConfirmed: true,
                actionDescription: actionDescription ?? prev.actionDescription,
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
          />
        </div>
      ) : null}

      {step === "draft" && draft.baseBody ? (
        <div className="space-y-6">
          <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_25%,var(--tomo-card))] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
              Follow-up action
            </h3>
            <textarea
              value={draft.actionDescription}
              onChange={(e) => onDraftChange((prev) => ({ ...prev, actionDescription: e.target.value }))}
              rows={3}
              className="tomo-input mt-3 w-full resize-y text-sm"
            />
          </section>
          <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
                Cohort follow-up template
              </h3>
              <button
                type="button"
                disabled={generating}
                onClick={runTomoGenerate}
                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--tomo-teal)] disabled:opacity-50"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
              <input
                value={draft.baseSubject}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, baseSubject: e.target.value }))}
                className="tomo-input mt-1 w-full text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
              <textarea
                value={draft.baseBody}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, baseBody: e.target.value }))}
                rows={10}
                className="tomo-input mt-1 w-full resize-y text-sm"
              />
            </label>
            <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">
              {draft.lpDrafts.length} LP slots — same template for all (no per-LP personalise in v1.5).
            </p>
          </section>
        </div>
      ) : null}

      <div className="mt-4 border-t border-[color:var(--tomo-rule-soft)] pt-3">
        <WorkflowLegWizardFooter
          step={step}
          draft={draft}
          generating={generating}
          onBack={() => {
            if (step === "action") onStepChange("trigger");
            else if (step === "draft") onStepChange("action");
            else onBackLeg?.();
          }}
          onNextFromTrigger={() => {
            setActionChatKey((k) => k + 1);
            onStepChange("action");
          }}
          onGenerateDrafts={runTomoGenerate}
          onSaveFollowUp={onSaveFollowUp}
        />
      </div>
    </div>
  );
}

export type WorkflowLegWizardFooterProps = {
  step: WorkflowLegStep;
  draft: WorkflowLegDraft;
  generating: boolean;
  onBack: () => void;
  onNextFromTrigger: () => void;
  onGenerateDrafts: () => void;
  onSaveFollowUp: () => void;
  showBackToPrimary?: boolean;
};

export function WorkflowLegWizardFooter({
  step,
  draft,
  generating,
  onBack,
  onNextFromTrigger,
  onGenerateDrafts,
  onSaveFollowUp,
}: WorkflowLegWizardFooterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {step !== "trigger" ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs"
        >
          Back
        </button>
      ) : null}

      {step === "trigger" && canAdvanceLegStep("trigger", draft) ? (
        <button
          type="button"
          onClick={onNextFromTrigger}
          className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
        >
          Next — follow-up action
        </button>
      ) : null}

      {step === "action" ? (
        <button
          type="button"
          disabled={!canAdvanceLegStep("action", draft) || generating}
          onClick={onGenerateDrafts}
          className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          {generating ? "Drafting…" : "Generate follow-up drafts"}
        </button>
      ) : null}

      {step === "draft" ? (
        <button
          type="button"
          disabled={!canAdvanceLegStep("draft", draft)}
          onClick={onSaveFollowUp}
          className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Save workflow with follow-up
        </button>
      ) : null}
    </div>
  );
}
