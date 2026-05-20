"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { Pipeline } from "@/lib/pipelines";
import {
  appendCustomPlaybookWithActionBuild,
  updateCustomPlaybookWithActionBuild,
  type CustomPlaybookStored,
} from "@/lib/customPlaybooks";
import type { UserWorkflowAction, WorkflowLeg } from "@/lib/custom-playbook-schema";
import {
  buildMockActionBuildLpDrafts,
  mergeContextWithAttachmentText,
  WORKFLOW_WIZARD_ACTION_PILLS,
  type WorkflowActionBuildConfig,
  type WorkflowActionBuildLpDraft,
} from "@/lib/workflow-action-build";
import { WorkflowWizardFileUpload } from "@/components/workflow-wizard-file-upload";
import {
  WORKFLOW_CREATE_STEPS,
  canAdvanceFromStep,
  initialWorkflowCreateDraft,
  maxReachableStep,
  stepIndex,
  workflowCreateDraftFromStored,
  type WorkflowCreateDraft,
  type WorkflowCreateStep,
} from "@/lib/workflow-create-draft";
import {
  initialWorkflowLegDraft,
  maxReachableLegStep,
  workflowLegDraftFromStored,
  workflowLegDraftToStored,
  type WorkflowLegDraft,
  type WorkflowLegStep,
} from "@/lib/workflow-leg-draft";
import { WorkflowLegWizard } from "@/components/workflow-leg-wizard";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";
import { SchedulingFindTimeModal } from "@/components/scheduling-find-time-modal";
import {
  formatAvailabilityContext,
  type SchedulingSlotModel,
} from "@/lib/schedulingFindTime";

export type WorkflowBuildModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
  /** When set, wizard updates this saved custom workflow instead of creating a new one. */
  editEntry?: CustomPlaybookStored | null;
  onClose: () => void;
  onWorkflowCreated: (entry: CustomPlaybookStored) => void;
};

function instructionFromAction(action: UserWorkflowAction): string {
  switch (action.kind) {
    case "send_email":
      return action.body;
    case "schedule_meeting":
      return [action.title, action.notes].filter(Boolean).join(" — ");
    case "schedule_call":
      return [action.title, action.agenda].filter(Boolean).join(" — ");
    case "other":
      return action.details;
  }
}

export function WorkflowBuildModal({
  open,
  pipeline,
  editEntry = null,
  onClose,
  onWorkflowCreated,
}: WorkflowBuildModalProps) {
  const isEditMode = Boolean(editEntry?.id);
  const [buildPhase, setBuildPhase] = useState<"primary" | "followUp">("primary");
  const [editSection, setEditSection] = useState<"primary" | "followUp">("primary");
  const [step, setStep] = useState<WorkflowCreateStep>("name");
  const [legStep, setLegStep] = useState<WorkflowLegStep>("trigger");
  const [draft, setDraft] = useState<WorkflowCreateDraft>(() => initialWorkflowCreateDraft());
  const [followUpDraft, setFollowUpDraft] = useState<WorkflowLegDraft>(() => initialWorkflowLegDraft());
  const [createdEntry, setCreatedEntry] = useState<CustomPlaybookStored | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedLpId, setSelectedLpId] = useState<string | null>(null);
  const [triggerChatKey, setTriggerChatKey] = useState(0);
  const [actionChatKey, setActionChatKey] = useState(0);
  const [availabilitySlots, setAvailabilitySlots] = useState<SchedulingSlotModel[]>([]);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (editEntry) {
        const hydrated = workflowCreateDraftFromStored(editEntry);
        setDraft(hydrated);
        setStep(maxReachableStep(hydrated));
        setSelectedLpId(hydrated.lpDrafts[0]?.id ?? null);
        setFollowUpDraft(
          editEntry.followUp ? workflowLegDraftFromStored(editEntry.followUp) : initialWorkflowLegDraft()
        );
        setEditSection("primary");
        setBuildPhase("primary");
        setLegStep(
          editEntry.followUp ? maxReachableLegStep(workflowLegDraftFromStored(editEntry.followUp)) : "trigger"
        );
      } else {
        setStep("name");
        setDraft(initialWorkflowCreateDraft());
        setFollowUpDraft(initialWorkflowLegDraft());
        setSelectedLpId(null);
        setBuildPhase("primary");
        setEditSection("primary");
        setLegStep("trigger");
      }
      setCreatedEntry(null);
      setGenerating(false);
      setTriggerChatKey((k) => k + 1);
      setActionChatKey((k) => k + 1);
      setAvailabilitySlots([]);
      setAvailabilityModalOpen(false);
    });
  }, [open, pipeline?.id, editEntry?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedDraft = useMemo(
    () => draft.lpDrafts.find((d) => d.id === selectedLpId) ?? draft.lpDrafts[0],
    [draft.lpDrafts, selectedLpId]
  );

  const reachable = maxReachableStep(draft);
  const attachmentNames = draft.attachments.map((a) => a.name);
  const mergedContextText = useMemo(
    () => mergeContextWithAttachmentText(draft.contextText, draft.attachments),
    [draft.contextText, draft.attachments]
  );

  /** Context + attachments + calendar slots — sent to Tomo only, not shown in the left textarea. */
  const orchestratorContextText = useMemo(() => {
    const availability = formatAvailabilityContext(availabilitySlots);
    if (!availability) return mergedContextText;
    if (!mergedContextText.trim()) return availability;
    return `${mergedContextText.trim()}\n\n${availability}`;
  }, [mergedContextText, availabilitySlots]);

  const goToStep = (target: WorkflowCreateStep) => {
    const targetIdx = stepIndex(target);
    const reachableIdx = stepIndex(reachable);
    if (target === "personalise" && !draft.personaliseEnabled && step !== "personalise") return;
    if (targetIdx <= reachableIdx || target === step) setStep(target);
  };

  const runTomoGenerate = useCallback(async () => {
    if (!pipeline) return;
    const instruction = draft.tomoInstruction.trim();
    if (!instruction) {
      toast.error("Complete the action prompt with Tomo first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/tomo/generate-workflow-cohort-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: draft.workflowName.trim(),
          listName: pipeline.name,
          instruction,
          contextText: orchestratorContextText,
          trigger: draft.trigger ?? undefined,
          attachmentNames: draft.attachments.map((a) => a.name),
        }),
      });
      if (!res.ok) {
        throw new Error("Draft generation failed");
      }
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
      const actionSpec =
        draft.actionSpec?.kind === "send_email"
          ? { ...draft.actionSpec, subject, body }
          : ({
              kind: "send_email" as const,
              subject,
              body,
            } satisfies UserWorkflowAction);
      setDraft((prev) => ({
        ...prev,
        baseSubject: subject,
        baseBody: body,
        actionDescription: prev.actionDescription.trim() || actionDescription,
        lpDrafts: cohort,
        actionSpec,
      }));
      setSelectedLpId(cohort[0]?.id ?? null);
      setStep("draft");
      toast.success(generated.usedLlm ? "Tomo drafted your cohort email" : "Draft ready (offline template — add OPENAI_API_KEY for LLM)");
    } catch {
      toast.error("Could not generate drafts — try again");
    } finally {
      setGenerating(false);
    }
  }, [
    draft.actionSpec,
    draft.actionDescription,
    draft.attachments,
    draft.tomoInstruction,
    draft.trigger,
    draft.workflowName,
    orchestratorContextText,
    pipeline,
  ]);

  const finishBuild = (
    lpDrafts: WorkflowActionBuildLpDraft[],
    approveAll: boolean,
    options?: {
      fromPersonaliseStep?: boolean;
      followUp?: WorkflowLeg | null;
      closeOnSave?: boolean;
    }
  ) => {
    if (!pipeline || !draft.trigger || !draft.actionSpec) return;
    const actionBuild: WorkflowActionBuildConfig = {
      actionName: draft.workflowName.trim(),
      contextText: draft.contextText,
      attachments: draft.attachments,
      tomoInstruction: draft.tomoInstruction,
      actionDescription: draft.actionDescription,
      baseSubject: draft.baseSubject,
      baseBody: draft.baseBody,
      lpDrafts,
      ...(approveAll ? { approvedAllAt: new Date().toISOString() } : {}),
    };
    const input = { name: draft.workflowName.trim(), trigger: draft.trigger, action: draft.actionSpec };
    const saveOptions =
      options?.followUp !== undefined ? { followUp: options.followUp } : undefined;
    const entry = isEditMode && editEntry
      ? updateCustomPlaybookWithActionBuild(editEntry.id, input, actionBuild, saveOptions)
      : appendCustomPlaybookWithActionBuild(input, actionBuild, saveOptions);
    if (!entry) {
      toast.error("Could not save workflow");
      return;
    }
    onWorkflowCreated(entry);
    const hasFollowUp = Boolean(entry.followUp);
    if (options?.fromPersonaliseStep || options?.closeOnSave) {
      toast.success(hasFollowUp ? "Workflow and follow-up saved" : "Workflow saved", {
        description: "Activate from the workflow card when ready.",
      });
      onClose();
      return;
    }
    setCreatedEntry(entry);
    toast.success(
      isEditMode
        ? hasFollowUp
          ? `Updated ${entry.name} (with follow-up)`
          : `Updated ${entry.name}`
        : hasFollowUp
          ? `Saved ${entry.name} (with follow-up)`
          : `Saved ${entry.name}`
    );
  };

  const updateSelectedDraft = (patch: Partial<WorkflowActionBuildLpDraft>) => {
    if (!selectedDraft) return;
    setDraft((prev) => ({
      ...prev,
      lpDrafts: prev.lpDrafts.map((d) => {
        if (d.id !== selectedDraft.id) return d;
        const personalised = patch.personalised ?? true;
        const status =
          patch.status ??
          (personalised ? (d.status === "approved" ? "approved" : "edited") : "ready");
        return { ...d, ...patch, personalised, status };
      }),
    }));
  };

  const selectActionPill = (pill: { id: string; label: string; instruction: string; kind?: string }) => {
    setDraft((prev) => {
      const actionSpec: UserWorkflowAction =
        pill.kind === "schedule_meeting" || pill.id === "request_meeting"
          ? {
              kind: "schedule_meeting",
              title: pill.label,
              datetime: "TBD — confirm when scheduling",
              notes: pill.instruction,
            }
          : {
              kind: "send_email",
              subject: `${prev.workflowName.trim() || "Outreach"} — ${pipeline?.name ?? "list"}`,
              body: "",
            };
      return {
        ...prev,
        tomoInstruction: "",
        actionPromptConfirmed: false,
        actionDescription: pill.label,
        actionSpec,
      };
    });
    toast.message(`Selected: ${pill.label} — tell Tomo how to refine it`);
  };

  const handleDraftNext = () => {
    setDraft((prev) => ({ ...prev, personaliseEnabled: true }));
    setSelectedLpId(draft.lpDrafts[0]?.id ?? null);
    setStep("personalise");
  };

  const primaryActionBuildForLeg = useMemo((): WorkflowActionBuildConfig | undefined => {
    if (!draft.baseBody.trim()) return undefined;
    return {
      actionName: draft.actionDescription.trim() || draft.workflowName.trim(),
      contextText: draft.contextText,
      attachments: draft.attachments,
      tomoInstruction: draft.tomoInstruction,
      actionDescription: draft.actionDescription,
      baseSubject: draft.baseSubject,
      baseBody: draft.baseBody,
      lpDrafts: draft.lpDrafts,
    };
  }, [draft]);

  if (!open || !pipeline) return null;

  const handleNext = () => {
    if (step === "name" && canAdvanceFromStep("name", draft)) {
      setStep("trigger");
      return;
    }
    if (step === "trigger" && canAdvanceFromStep("trigger", draft)) {
      setActionChatKey((k) => k + 1);
      setStep("action");
      return;
    }
    if (step === "action" && canAdvanceFromStep("action", draft)) runTomoGenerate();
  };

  const handleBack = () => {
    if (step === "trigger") setStep("name");
    else if (step === "action") setStep("trigger");
    else if (step === "draft") setStep("action");
    else if (step === "personalise") setStep("draft");
  };

  const reachableIdx = stepIndex(reachable);
  const currentStepIdx = stepIndex(step);

  const handlePersonalise = () => {
    setDraft((prev) => ({ ...prev, personaliseEnabled: true }));
    setSelectedLpId(draft.lpDrafts[0]?.id ?? null);
    setStep("personalise");
  };

  const handleApproveAll = () => {
    const approved = draft.lpDrafts.map((d) => ({ ...d, status: "approved" as const }));
    finishBuild(approved, true);
  };

  const handleSavePersonalised = () => {
    finishBuild(draft.lpDrafts, false, { fromPersonaliseStep: true });
  };

  const handleAddFollowUp = () => {
    setFollowUpDraft(initialWorkflowLegDraft());
    setLegStep("trigger");
    setBuildPhase("followUp");
  };

  const handleSaveWithFollowUp = () => {
    const leg = workflowLegDraftToStored(followUpDraft);
    if (!leg) {
      toast.error("Complete the follow-up draft before saving");
      return;
    }
    finishBuild(draft.lpDrafts, true, { followUp: leg, closeOnSave: true });
  };

  const handleRemoveFollowUp = () => {
    if (!editEntry) return;
    finishBuild(draft.lpDrafts, Boolean(draft.lpDrafts.every((d) => d.status === "approved")), {
      followUp: null,
      closeOnSave: true,
    });
  };

  const switchEditSection = (section: "primary" | "followUp") => {
    setEditSection(section);
    if (section === "primary") {
      setBuildPhase("primary");
      setStep(maxReachableStep(draft));
    } else {
      setBuildPhase("followUp");
      setLegStep(maxReachableLegStep(followUpDraft));
    }
  };

  const stepTitle =
    buildPhase === "followUp"
      ? "Add follow-up"
      : step === "personalise"
        ? "Personalise per LP"
        : step === "draft"
          ? "Review cohort draft"
          : "Build for this list";

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
        className="relative z-[201] my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(96dvh,calc(100vh-1rem))] min-h-[min(720px,96dvh)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
                {isEditMode ? "Edit workflow" : "New workflow"} · {pipeline.name}
              </p>
              <h2
                id="workflow-build-title"
                className="mt-1 font-[family-name:var(--font-newsreader)] text-xl font-medium text-[color:var(--foreground)]"
              >
                {stepTitle}
              </h2>
              {draft.workflowName.trim() ? (
                <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
                  <span className="font-medium text-[color:var(--tomo-body)]">{draft.workflowName.trim()}</span>
                  {draft.triggerConfirmed && draft.trigger ? (
                    <>
                      {" "}
                      · Trigger: <span className="text-[color:var(--tomo-body)]">{draft.trigger}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)]"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {isEditMode ? (
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Edit workflow section"
              data-testid="workflow-build-edit-sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={editSection === "primary"}
                onClick={() => switchEditSection("primary")}
                className={`rounded-[var(--tomo-radius-sm)] border px-3 py-1 text-xs font-medium transition ${
                  editSection === "primary"
                    ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]"
                    : "border-[color:var(--tomo-rule-soft)] text-[color:var(--tomo-body)] hover:border-[color:var(--tomo-teal)]"
                }`}
              >
                Primary
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editSection === "followUp"}
                onClick={() => switchEditSection("followUp")}
                className={`rounded-[var(--tomo-radius-sm)] border px-3 py-1 text-xs font-medium transition ${
                  editSection === "followUp"
                    ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]"
                    : "border-[color:var(--tomo-rule-soft)] text-[color:var(--tomo-body)] hover:border-[color:var(--tomo-teal)]"
                }`}
              >
                Follow-up{editEntry?.followUp ? "" : " (add)"}
              </button>
            </div>
          ) : null}
          {buildPhase === "primary" ? (
          <ol className="mt-4 flex flex-wrap gap-2">
            {WORKFLOW_CREATE_STEPS.map((s, i) => {
              const isActive = s.id === step;
              const isReachable =
                i <= reachableIdx || (s.id === "personalise" && (draft.personaliseEnabled || step === "personalise"));
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
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 min-h-[480px]">
          {buildPhase === "followUp" && !createdEntry ? (
            <WorkflowLegWizard
              pipeline={pipeline}
              workflowName={draft.workflowName}
              primaryActionBuild={primaryActionBuildForLeg}
              primaryTrigger={draft.trigger ?? undefined}
              draft={followUpDraft}
              onDraftChange={setFollowUpDraft}
              step={legStep}
              onStepChange={setLegStep}
              onBackFromTrigger={
                !isEditMode ? () => {
                  setBuildPhase("primary");
                  setStep("personalise");
                } : undefined
              }
              onBackLeg={() => {
                if (isEditMode) switchEditSection("primary");
                else {
                  setBuildPhase("primary");
                  setStep("personalise");
                }
              }}
              onSaveFollowUp={handleSaveWithFollowUp}
            />
          ) : null}

          {createdEntry ? (
            <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-sm text-[color:var(--tomo-status-green)]">
              Saved <span className="font-semibold">{createdEntry.name}</span> on this list. Activate it from the card when
              you are ready to run.
            </p>
          ) : null}

          {buildPhase === "primary" && step === "name" ? (
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--foreground)]">Workflow name</span>
              <input
                value={draft.workflowName}
                onChange={(e) => setDraft((prev) => ({ ...prev, workflowName: e.target.value }))}
                className="tomo-input mt-1.5 w-full text-sm"
                placeholder="e.g. London trip outreach"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-[color:var(--tomo-mute)]">
                Shown on the workflow card for <span className="font-medium text-[color:var(--foreground)]">{pipeline.name}</span>.
              </p>
            </label>
          ) : null}

          {buildPhase === "primary" && step === "trigger" ? (
            <div className="space-y-4">
              <WorkflowCreatorChat
                key={`trigger-${triggerChatKey}`}
                pipeline={pipeline}
                surfaceContext="workflows"
                wizardStep="trigger"
                workflowName={draft.workflowName.trim()}
                variant="wizard"
                onWorkflowCreated={() => {}}
                confirmedTrigger={draft.trigger ?? undefined}
                triggerConfirmed={draft.triggerConfirmed}
                onTriggerConfirmed={(payload) => {
                  setDraft((prev) => ({
                    ...prev,
                    trigger: payload.trigger,
                    triggerSummary: payload.summary,
                    triggerConfirmed: true,
                  }));
                  if (payload.inferredDefaultTime) {
                    toast.message(`Using ${payload.inferredDefaultTime} — say a different time in chat to change it.`);
                  }
                }}
                onAdvanceWizardStep={() => {
                  setActionChatKey((k) => k + 1);
                  setStep("action");
                }}
              />
              {draft.triggerConfirmed && draft.trigger ? (
                <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-xs text-[color:var(--tomo-status-green)]">
                  Trigger set: <span className="font-medium">{draft.trigger}</span>
                  {draft.triggerSummary ? (
                    <span className="mt-0.5 block text-[color:var(--tomo-body)]">{draft.triggerSummary}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}

          {buildPhase === "primary" && step === "action" ? (
            <div className="grid min-h-[28rem] gap-4 lg:grid-cols-2 lg:items-stretch">
              <div className="flex flex-col gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Context for Tomo</span>
                  <textarea
                    value={draft.contextText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, contextText: e.target.value }))}
                    className="tomo-input mt-1.5 h-[12rem] w-full resize-none text-sm"
                    placeholder="Theme, trip dates, talking points, anything Tomo should know…"
                  />
                </label>
                <WorkflowWizardFileUpload
                  attachments={draft.attachments}
                  onChange={(attachments) => setDraft((prev) => ({ ...prev, attachments }))}
                  emptyHint=""
                />
                {draft.actionPromptConfirmed && draft.tomoInstruction.trim() ? (
                  <div className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-status-green)]">
                      Optimised prompt — ready for Draft step
                    </p>
                    <textarea
                      value={draft.tomoInstruction}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          tomoInstruction: e.target.value,
                          actionPromptConfirmed: e.target.value.trim().length > 0,
                        }))
                      }
                      rows={5}
                      className="tomo-input mt-2 w-full resize-y text-sm"
                    />
                    <p className="mt-2 text-xs text-[color:var(--tomo-body)]">
                      Tomo will use this prompt to generate the cohort email on the next step. Edit if needed, then
                      click <span className="font-medium text-[color:var(--foreground)]">Generate drafts</span>.
                    </p>
                  </div>
                ) : null}
              </div>
              <WorkflowCreatorChat
                key={`action-${actionChatKey}`}
                pipeline={pipeline}
                surfaceContext="workflows"
                wizardStep="action"
                workflowName={draft.workflowName.trim()}
                confirmedTrigger={draft.trigger ?? undefined}
                contextText={orchestratorContextText}
                attachmentNames={attachmentNames}
                variant="wizard"
                actionPills={[...WORKFLOW_WIZARD_ACTION_PILLS]}
                actionPromptConfirmed={draft.actionPromptConfirmed}
                confirmedActionInstruction={draft.tomoInstruction}
                onOpenAvailability={() => setAvailabilityModalOpen(true)}
                availabilitySlotCount={availabilitySlots.length}
                onActionPillSelect={selectActionPill}
                onWorkflowCreated={() => {}}
                onActionPromptConfirmed={({ instruction, actionDescription, actionKind }) => {
                  setDraft((prev) => {
                    const actionSpec: UserWorkflowAction =
                      actionKind === "schedule_meeting"
                        ? {
                            kind: "schedule_meeting",
                            title: prev.workflowName.trim() || "Meeting",
                            datetime: "TBD — confirm when scheduling",
                            notes: instruction,
                          }
                        : actionKind === "schedule_call"
                          ? {
                              kind: "schedule_call",
                              title: prev.workflowName.trim() || "Call",
                              datetime: "TBD — confirm when scheduling",
                              agenda: instruction,
                            }
                          : actionKind === "other"
                            ? { kind: "other", label: "Action", details: instruction }
                            : {
                                kind: "send_email",
                                subject: `${prev.workflowName.trim() || "Outreach"} — ${pipeline.name}`,
                                body: instruction,
                              };
                    return {
                      ...prev,
                      tomoInstruction: instruction,
                      actionPromptConfirmed: true,
                      actionDescription: actionDescription ?? prev.actionDescription,
                      actionSpec,
                    };
                  });
                  toast.success("Action prompt set");
                }}
                onActionConfirmed={(action) => {
                  setDraft((prev) => ({
                    ...prev,
                    actionSpec: action,
                    tomoInstruction: prev.tomoInstruction.trim() || instructionFromAction(action),
                    actionPromptConfirmed: true,
                  }));
                }}
              />
            </div>
          ) : null}

          {buildPhase === "primary" && step === "draft" && draft.baseBody ? (
            <div className="space-y-6">
              <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_25%,var(--tomo-card))] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">Action</h3>
                <p className="mt-1 text-[11px] text-[color:var(--tomo-mute)]">
                  What Tomo will do for each LP when this workflow runs.
                </p>
                <textarea
                  value={draft.actionDescription}
                  onChange={(e) => setDraft((prev) => ({ ...prev, actionDescription: e.target.value }))}
                  rows={4}
                  className="tomo-input mt-3 w-full resize-y text-sm"
                />
              </section>
              <section className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-teal)]">
                    LP draft
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
                    onChange={(e) => setDraft((prev) => ({ ...prev, baseSubject: e.target.value }))}
                    className="tomo-input mt-1 w-full text-sm"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
                  <textarea
                    value={draft.baseBody}
                    onChange={(e) => setDraft((prev) => ({ ...prev, baseBody: e.target.value }))}
                    rows={10}
                    className="tomo-input mt-1 w-full resize-y text-sm"
                  />
                </label>
                <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">
                  {draft.lpDrafts.length} LP drafts — personalise on the next step.
                </p>
              </section>
              <WorkflowWizardFileUpload
                attachments={draft.attachments}
                onChange={(attachments) => setDraft((prev) => ({ ...prev, attachments }))}
                label="Attachments for this outreach"
              />
            </div>
          ) : null}

          {buildPhase === "primary" && step === "personalise" && selectedDraft ? (
            <div className="flex min-h-[360px] gap-0 overflow-hidden rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)]">
              <ul className="w-[220px] shrink-0 overflow-y-auto border-r border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_40%,var(--tomo-card))]">
                {draft.lpDrafts.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLpId(d.id)}
                      className={`w-full border-l-2 px-3 py-2.5 text-left text-xs transition ${
                        selectedDraft.id === d.id
                          ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)]"
                          : "border-transparent hover:bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_50%,transparent)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-semibold text-[color:var(--foreground)]">{d.lpName}</p>
                        {d.personalised ? (
                          <span className="shrink-0 rounded-full bg-[color:var(--tomo-teal-tint)] px-1.5 py-0.5 text-[9px] font-medium text-[color:var(--tomo-teal)]">
                            Edited
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[color:var(--tomo-mute)]">{d.firmName}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="min-w-0 flex-1 p-4">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {selectedDraft.lpName} · {selectedDraft.firmName}
                </p>
                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
                  <input
                    value={selectedDraft.subject}
                    onChange={(e) => updateSelectedDraft({ subject: e.target.value })}
                    className="tomo-input mt-1 w-full text-sm"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
                  <textarea
                    value={selectedDraft.body}
                    onChange={(e) => updateSelectedDraft({ body: e.target.value })}
                    rows={10}
                    className="tomo-input mt-1 w-full resize-y text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedDraft({
                      subject: draft.baseSubject,
                      body: draft.baseBody.replace("{{lp_first_name}}", selectedDraft.lpName.split(" ")[0] ?? "there"),
                      personalised: false,
                      status: "ready",
                    })
                  }
                  className="mt-2 text-xs text-[color:var(--tomo-teal)]"
                >
                  Reset to Tomo draft
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[color:var(--tomo-rule-soft)] px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="text-xs text-[color:var(--tomo-mute)]">
            {createdEntry ? "Done" : "Cancel"}
          </button>
          {!createdEntry && buildPhase === "primary" ? (
            <div className="flex flex-wrap gap-2">
              {step !== "name" && currentStepIdx > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs"
                >
                  Back
                </button>
              ) : null}

              {step === "name" ? (
                <button
                  type="button"
                  disabled={!canAdvanceFromStep("name", draft)}
                  onClick={handleNext}
                  className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Next
                </button>
              ) : null}

              {step === "trigger" ? (
                draft.triggerConfirmed ? (
                  <span className="text-[11px] text-[color:var(--tomo-mute)]">
                    Say <strong className="text-[color:var(--tomo-body)]">yes</strong> in chat to continue — or{" "}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="font-medium text-[color:var(--tomo-teal)] underline-offset-2 hover:underline"
                    >
                      Next
                    </button>
                  </span>
                ) : null
              ) : null}

              {step === "action" ? (
                <button
                  type="button"
                  disabled={!canAdvanceFromStep("action", draft) || generating}
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  {generating ? "Drafting…" : "Generate drafts"}
                </button>
              ) : null}

              {step === "draft" ? (
                <button
                  type="button"
                  disabled={!canAdvanceFromStep("draft", draft)}
                  onClick={handleDraftNext}
                  className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Next — personalise per LP
                </button>
              ) : null}

              {step === "personalise" ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddFollowUp}
                    className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-[color:var(--tomo-teal)]"
                    data-testid="workflow-add-follow-up"
                  >
                    Add follow-up
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePersonalised}
                    className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                  >
                    Save & finish
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {!createdEntry && buildPhase === "followUp" && isEditMode && editEntry?.followUp ? (
            <button
              type="button"
              onClick={handleRemoveFollowUp}
              className="text-xs text-[color:var(--tomo-status-red)]"
            >
              Remove follow-up
            </button>
          ) : null}
        </footer>
      </div>
    </div>
    <SchedulingFindTimeModal
      mode="multi"
      stackAboveModal
      open={availabilityModalOpen}
      onClose={() => setAvailabilityModalOpen(false)}
      weekAnchor={new Date()}
      initialSelected={availabilitySlots}
      onConfirmSlots={(slots) => {
        setAvailabilitySlots(slots);
        if (slots.length > 0) {
          toast.success(
            `${slots.length} availability slot${slots.length === 1 ? "" : "s"} added for Tomo`
          );
        }
      }}
    />
    </>
  );
}
