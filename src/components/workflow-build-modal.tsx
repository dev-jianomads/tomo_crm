"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
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
import {
  WORKFLOW_CREATE_STEPS,
  canAdvanceFromStep,
  canGenerateWorkflowDrafts,
  hasGeneratedWorkflowDrafts,
  initialWorkflowCreateDraft,
  maxReachableStep,
  stepIndex,
  workflowCreateDraftFromStored,
  type WorkflowCreateDraft,
  type WorkflowCreateStep,
} from "@/lib/workflow-create-draft";
import {
  initialWorkflowLegDraft,
  workflowLegDraftFromStored,
  workflowLegDraftToStored,
  type WorkflowLegDraft,
} from "@/lib/workflow-leg-draft";
import { WorkflowLegWizard } from "@/components/workflow-leg-wizard";
import { WorkflowCondensedBuildPanel } from "@/components/workflow-condensed-build-panel";
import { SchedulingFindTimeModal } from "@/components/scheduling-find-time-modal";
import {
  formatAvailabilityContext,
  type SchedulingSlotModel,
} from "@/lib/schedulingFindTime";

export type WorkflowBuildModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
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
  const [draft, setDraft] = useState<WorkflowCreateDraft>(() => initialWorkflowCreateDraft());
  const [followUpDraft, setFollowUpDraft] = useState<WorkflowLegDraft>(() => initialWorkflowLegDraft());
  const [savedPrimaryEntry, setSavedPrimaryEntry] = useState<CustomPlaybookStored | null>(null);
  const [followUpPromptOpen, setFollowUpPromptOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedLpId, setSelectedLpId] = useState<string | null>(null);
  const [actionChatKey, setActionChatKey] = useState(0);
  const [availabilitySlots, setAvailabilitySlots] = useState<SchedulingSlotModel[]>([]);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [actionChatStreaming, setActionChatStreaming] = useState(false);

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
      } else {
        setStep("name");
        setDraft(initialWorkflowCreateDraft());
        setFollowUpDraft(initialWorkflowLegDraft());
        setSelectedLpId(null);
        setBuildPhase("primary");
        setEditSection("primary");
      }
      setSavedPrimaryEntry(null);
      setFollowUpPromptOpen(false);
      setGenerating(false);
      setActionChatKey((k) => k + 1);
      setAvailabilitySlots([]);
      setAvailabilityModalOpen(false);
    });
  }, [open, pipeline?.id, editEntry?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !followUpPromptOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, followUpPromptOpen]);

  const selectedDraft = useMemo(
    () => draft.lpDrafts.find((d) => d.id === selectedLpId) ?? draft.lpDrafts[0],
    [draft.lpDrafts, selectedLpId]
  );

  const reachable = maxReachableStep(draft);
  const draftPanelVisible = hasGeneratedWorkflowDrafts(draft);
  const attachmentNames = draft.attachments.map((a) => a.name);
  const mergedContextText = useMemo(
    () => mergeContextWithAttachmentText(draft.contextText, draft.attachments),
    [draft.contextText, draft.attachments]
  );

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
      toast.error("Describe the outreach in the action section first");
      return;
    }
    if (!draft.trigger?.trim()) {
      toast.error("Add a trigger before generating drafts");
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
        triggerConfirmed: true,
      }));
      setSelectedLpId(cohort[0]?.id ?? null);
      toast.success(
        generated.usedLlm
          ? "Tomo drafted your cohort email"
          : "Draft ready (offline template — add OPENAI_API_KEY for LLM)"
      );
    } catch {
      toast.error("Could not generate drafts — try again");
    } finally {
      setGenerating(false);
    }
  }, [
    draft.actionSpec,
    draft.attachments,
    draft.tomoInstruction,
    draft.trigger,
    draft.workflowName,
    orchestratorContextText,
    pipeline,
  ]);

  const persistPrimary = (
    lpDrafts: WorkflowActionBuildLpDraft[],
    approveAll: boolean,
    followUp?: WorkflowLeg | null
  ): CustomPlaybookStored | null => {
    if (!pipeline || !draft.trigger?.trim() || !draft.actionSpec) return null;
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
    const input = { name: draft.workflowName.trim(), trigger: draft.trigger.trim(), action: draft.actionSpec };
    const saveOptions = followUp !== undefined ? { followUp } : undefined;
    const existingId = savedPrimaryEntry?.id ?? editEntry?.id;
    const entry = existingId
      ? updateCustomPlaybookWithActionBuild(existingId, input, actionBuild, saveOptions)
      : appendCustomPlaybookWithActionBuild(input, actionBuild, saveOptions);
    if (entry) {
      onWorkflowCreated(entry);
      if (!savedPrimaryEntry?.id && !editEntry?.id) setSavedPrimaryEntry(entry);
    }
    return entry;
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

  const activeEntry = savedPrimaryEntry ?? editEntry;

  const handleSavePersonalised = () => {
    const entry = persistPrimary(draft.lpDrafts, false);
    if (!entry) {
      toast.error("Could not save workflow");
      return;
    }
    const offerFollowUp = buildPhase === "primary" && !entry.followUp;
    if (offerFollowUp) {
      setSavedPrimaryEntry(entry);
      setFollowUpPromptOpen(true);
      return;
    }
    toast.success(entry.followUp ? "Workflow and follow-up saved" : "Workflow saved", {
      description: "Activate from the workflow card when ready.",
    });
    onClose();
  };

  const handleFollowUpPromptNo = () => {
    setFollowUpPromptOpen(false);
    toast.success("Workflow saved", {
      description: "Activate from the workflow card when ready.",
    });
    onClose();
  };

  const handleFollowUpPromptYes = () => {
    setFollowUpPromptOpen(false);
    setFollowUpDraft(initialWorkflowLegDraft());
    setBuildPhase("followUp");
    setEditSection("followUp");
    setActionChatKey((k) => k + 1);
    toast.message("Configure your follow-up — same build layout as the primary step.");
  };

  const handleSaveWithFollowUp = () => {
    const leg = workflowLegDraftToStored(followUpDraft);
    if (!leg) {
      toast.error("Complete the follow-up draft before saving");
      return;
    }
    const entry = persistPrimary(draft.lpDrafts, true, leg);
    if (!entry) {
      toast.error("Could not save workflow");
      return;
    }
    toast.success("Workflow and follow-up saved", {
      description: "Activate from the workflow card when ready.",
    });
    onClose();
  };

  const handleRemoveFollowUp = () => {
    if (!editEntry) return;
    const entry = persistPrimary(draft.lpDrafts, Boolean(draft.lpDrafts.every((d) => d.status === "approved")), null);
    if (!entry) return;
    toast.success("Follow-up removed");
    setFollowUpDraft(initialWorkflowLegDraft());
    onClose();
  };

  const switchEditSection = (section: "primary" | "followUp") => {
    setEditSection(section);
    if (section === "primary") {
      setBuildPhase("primary");
      setStep(maxReachableStep(draft));
    } else {
      setBuildPhase("followUp");
      setActionChatKey((k) => k + 1);
    }
  };

  if (!open || !pipeline) return null;

  const handleNext = () => {
    if (step === "name" && canAdvanceFromStep("name", draft)) setStep("build");
  };

  const handleBack = () => {
    if (step === "personalise") setStep("build");
    else if (step === "build") setStep("name");
  };

  const reachableIdx = stepIndex(reachable);
  const currentStepIdx = stepIndex(step);
  const showPrimaryStepper = buildPhase === "primary" && editSection === "primary";

  const stepTitle =
    buildPhase === "followUp"
      ? "Follow-up"
      : step === "personalise"
        ? "Personalise per LP"
        : step === "build"
          ? "Build for this list"
          : "Name your workflow";

  const primaryTriggerSection = (
    <>
      <input
        value={draft.trigger ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          setDraft((prev) => ({
            ...prev,
            trigger: v,
            triggerConfirmed: v.trim().length > 0,
          }));
        }}
        className="tomo-input w-full text-sm"
        placeholder={`e.g. May 26, 2026, 9:00 AM — ${pipeline.name}`}
      />
      <p className="text-xs text-[color:var(--tomo-mute)]">
        When should <span className="font-medium text-[color:var(--foreground)]">{draft.workflowName.trim() || "this workflow"}</span>{" "}
        run on {pipeline.name}? If you only provide a date, we assume 9:00 AM local time.
      </p>
    </>
  );

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
          className="relative z-[201] my-auto flex w-full max-w-7xl flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(96dvh,calc(100vh-1rem))] min-h-[min(720px,96dvh)]"
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
                    {draft.trigger?.trim() ? (
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
                  Follow-up{activeEntry?.followUp || editEntry?.followUp ? "" : " (add)"}
                </button>
              </div>
            ) : null}
            {showPrimaryStepper ? (
              <ol className="mt-4 flex flex-wrap gap-2">
                {WORKFLOW_CREATE_STEPS.map((s, i) => {
                  const isActive = s.id === step;
                  const isReachable =
                    i <= reachableIdx ||
                    (s.id === "personalise" && (draft.personaliseEnabled || step === "personalise"));
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
            {buildPhase === "followUp" && (editSection === "followUp" || !isEditMode) ? (
              <WorkflowLegWizard
                pipeline={pipeline}
                workflowName={draft.workflowName}
                primaryActionBuild={primaryActionBuildForLeg}
                primaryTrigger={draft.trigger ?? undefined}
                draft={followUpDraft}
                onDraftChange={setFollowUpDraft}
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
                  Shown on the workflow card for{" "}
                  <span className="font-medium text-[color:var(--foreground)]">{pipeline.name}</span>.
                </p>
              </label>
            ) : null}

            {buildPhase === "primary" && step === "build" ? (
              <WorkflowCondensedBuildPanel
                pipeline={pipeline}
                workflowName={draft.workflowName.trim()}
                triggerSection={primaryTriggerSection}
                contextText={draft.contextText}
                onContextTextChange={(v) => setDraft((prev) => ({ ...prev, contextText: v }))}
                attachments={draft.attachments}
                onAttachmentsChange={(attachments) => setDraft((prev) => ({ ...prev, attachments }))}
                onOpenAvailability={() => setAvailabilityModalOpen(true)}
                availabilitySlotCount={availabilitySlots.length}
                actionChatKey={actionChatKey}
                confirmedTrigger={draft.trigger ?? undefined}
                orchestratorContextText={orchestratorContextText}
                attachmentNames={attachmentNames}
                actionPills={[...WORKFLOW_WIZARD_ACTION_PILLS]}
                tomoInstruction={draft.tomoInstruction}
                actionPromptConfirmed={draft.actionPromptConfirmed}
                actionChatStreaming={actionChatStreaming}
                generating={generating}
                canGenerateDrafts={canGenerateWorkflowDrafts(draft)}
                onGenerateDrafts={() => void runTomoGenerate()}
                onActionPillSelect={selectActionPill}
                onStreamingChange={setActionChatStreaming}
                onActionPromptRevoked={() =>
                  setDraft((prev) => ({ ...prev, actionPromptConfirmed: false }))
                }
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
                draftVisible={draftPanelVisible}
                actionDescription={draft.actionDescription}
                onActionDescriptionChange={(v) => setDraft((prev) => ({ ...prev, actionDescription: v }))}
                baseSubject={draft.baseSubject}
                onBaseSubjectChange={(v) => setDraft((prev) => ({ ...prev, baseSubject: v }))}
                baseBody={draft.baseBody}
                onBaseBodyChange={(v) => setDraft((prev) => ({ ...prev, baseBody: v }))}
                lpDraftCount={draft.lpDrafts.length}
                showDraftAttachments
              />
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
                        body: draft.baseBody.replace(
                          "{{lp_first_name}}",
                          selectedDraft.lpName.split(" ")[0] ?? "there"
                        ),
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
              Cancel
            </button>
            {buildPhase === "primary" ? (
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

                {step === "build" && draftPanelVisible ? (
                  <button
                    type="button"
                    onClick={handleDraftNext}
                    className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                  >
                    Next — personalise per LP
                  </button>
                ) : null}

                {step === "personalise" ? (
                  <button
                    type="button"
                    onClick={handleSavePersonalised}
                    className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                    data-testid="workflow-save-finish"
                  >
                    Save & finish
                  </button>
                ) : null}
              </div>
            ) : null}
            {buildPhase === "followUp" && isEditMode && editEntry?.followUp ? (
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

      {followUpPromptOpen ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="follow-up-prompt-title"
          data-testid="workflow-follow-up-prompt"
        >
          <button
            type="button"
            className="fixed inset-0 bg-[color:rgba(28,43,58,0.40)]"
            aria-label="Dismiss"
            onClick={handleFollowUpPromptNo}
          />
          <div className="relative z-[211] w-full max-w-md rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-5 shadow-[var(--tomo-modal-shadow)]">
            <h3
              id="follow-up-prompt-title"
              className="font-[family-name:var(--font-newsreader)] text-lg font-medium text-[color:var(--foreground)]"
            >
              Add a follow-up step?
            </h3>
            <p className="mt-2 text-sm text-[color:var(--tomo-body)]">
              Tomo can draft a nudge after no reply, or a reply when an LP responds — configured on the same build
              screen as your primary outreach.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleFollowUpPromptNo}
                className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-4 py-1.5 text-xs"
              >
                No thanks
              </button>
              <button
                type="button"
                onClick={handleFollowUpPromptYes}
                className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                data-testid="workflow-follow-up-prompt-yes"
              >
                Add follow-up
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
