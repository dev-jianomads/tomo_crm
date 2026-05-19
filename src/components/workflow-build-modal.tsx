"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PaperClipIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { Pipeline } from "@/lib/pipelines";
import type { CustomPlaybookStored } from "@/lib/customPlaybooks";
import { appendCustomPlaybookWithActionBuild } from "@/lib/customPlaybooks";
import type { UserWorkflowAction } from "@/lib/custom-playbook-schema";
import {
  buildMockActionBuildLpDrafts,
  mockTomoGenerateCohortDraft,
  type WorkflowActionBuildConfig,
  type WorkflowActionBuildLpDraft,
} from "@/lib/workflow-action-build";
import {
  WORKFLOW_CREATE_STEPS,
  canAdvanceFromStep,
  initialWorkflowCreateDraft,
  maxReachableStep,
  stepIndex,
  type WorkflowCreateDraft,
  type WorkflowCreateStep,
} from "@/lib/workflow-create-draft";
import { WorkflowCreatorChat } from "@/components/workflow-creator-chat";

export type WorkflowBuildModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
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

export function WorkflowBuildModal({ open, pipeline, onClose, onWorkflowCreated }: WorkflowBuildModalProps) {
  const [step, setStep] = useState<WorkflowCreateStep>("name");
  const [draft, setDraft] = useState<WorkflowCreateDraft>(() => initialWorkflowCreateDraft());
  const [createdEntry, setCreatedEntry] = useState<CustomPlaybookStored | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedLpId, setSelectedLpId] = useState<string | null>(null);
  const [triggerChatKey, setTriggerChatKey] = useState(0);
  const [actionChatKey, setActionChatKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setStep("name");
      setDraft(initialWorkflowCreateDraft());
      setCreatedEntry(null);
      setGenerating(false);
      setSelectedLpId(null);
      setTriggerChatKey((k) => k + 1);
      setActionChatKey((k) => k + 1);
    });
  }, [open, pipeline?.id]);

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

  const goToStep = (target: WorkflowCreateStep) => {
    const targetIdx = stepIndex(target);
    const reachableIdx = stepIndex(reachable);
    if (target === "personalise" && !draft.personaliseEnabled && step !== "personalise") return;
    if (targetIdx <= reachableIdx || target === step) setStep(target);
  };

  const runTomoGenerate = useCallback(() => {
    if (!pipeline || !draft.actionSpec) return;
    setGenerating(true);
    window.setTimeout(() => {
      const instruction = draft.tomoInstruction.trim() || instructionFromAction(draft.actionSpec!);
      const { subject, body } = mockTomoGenerateCohortDraft({
        actionName: draft.workflowName.trim(),
        contextText: draft.contextText,
        instruction,
        listName: pipeline.name,
      });
      const cohort = buildMockActionBuildLpDrafts(pipeline.name).map((d) => ({
        ...d,
        subject,
        body: body.replace("{{lp_first_name}}", d.lpName.split(" ")[0] ?? "there"),
        status: "ready" as const,
        personalised: false,
      }));
      setDraft((prev) => ({ ...prev, baseSubject: subject, baseBody: body, lpDrafts: cohort }));
      setSelectedLpId(cohort[0]?.id ?? null);
      setGenerating(false);
      setStep("draft");
      toast.success("Tomo drafted outreach for this cohort");
    }, 700);
  }, [draft.actionSpec, draft.contextText, draft.tomoInstruction, draft.workflowName, pipeline]);

  const finishBuild = (lpDrafts: WorkflowActionBuildLpDraft[], approveAll: boolean) => {
    if (!pipeline || !draft.trigger || !draft.actionSpec) return;
    const actionBuild: WorkflowActionBuildConfig = {
      actionName: draft.workflowName.trim(),
      contextText: draft.contextText,
      attachments: draft.attachments,
      tomoInstruction: draft.tomoInstruction,
      baseSubject: draft.baseSubject,
      baseBody: draft.baseBody,
      lpDrafts,
      ...(approveAll ? { approvedAllAt: new Date().toISOString() } : {}),
    };
    const entry = appendCustomPlaybookWithActionBuild(
      { name: draft.workflowName.trim(), trigger: draft.trigger, action: draft.actionSpec },
      actionBuild
    );
    if (!entry) {
      toast.error("Could not save workflow");
      return;
    }
    setCreatedEntry(entry);
    onWorkflowCreated(entry);
    toast.success(`Saved ${entry.name}`);
  };

  const updateSelectedDraft = (patch: Partial<WorkflowActionBuildLpDraft>) => {
    if (!selectedDraft) return;
    setDraft((prev) => ({
      ...prev,
      lpDrafts: prev.lpDrafts.map((d) =>
        d.id === selectedDraft.id
          ? { ...d, ...patch, personalised: true, status: d.status === "approved" ? "approved" : "edited" }
          : d
      ),
    }));
  };

  const addMockAttachment = () => {
    setDraft((prev) => {
      const n = prev.attachments.length + 1;
      return {
        ...prev,
        attachments: [
          ...prev.attachments,
          { id: `att-${n}`, name: `Context attachment ${n}.pdf`, meta: "420 KB · uploaded in wizard" },
        ],
      };
    });
  };

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
    finishBuild(draft.lpDrafts, false);
  };

  const stepTitle =
    step === "personalise"
      ? "Personalise per LP"
      : step === "draft"
        ? "Review cohort draft"
        : "Build for this list";

  return (
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
        className="relative z-[201] my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(92dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
                New workflow · {pipeline.name}
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
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {createdEntry ? (
            <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-sm text-[color:var(--tomo-status-green)]">
              Saved <span className="font-semibold">{createdEntry.name}</span> on this list. Activate it from the card when
              you are ready to run.
            </p>
          ) : null}

          {step === "name" ? (
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

          {step === "trigger" ? (
            <div className="space-y-4">
              <WorkflowCreatorChat
                key={`trigger-${triggerChatKey}`}
                pipeline={pipeline}
                surfaceContext="workflows"
                wizardStep="trigger"
                workflowName={draft.workflowName.trim()}
                variant="wizard"
                onWorkflowCreated={() => {}}
                onTriggerProposed={(payload) => {
                  setDraft((prev) => ({
                    ...prev,
                    trigger: payload.trigger,
                    triggerSummary: payload.summary,
                    triggerConfirmed: false,
                  }));
                }}
              />
              {draft.trigger && !draft.triggerConfirmed ? (
                <div className="rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-teal)_35%,var(--tomo-rule))] bg-[color:var(--tomo-teal-tint)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--tomo-teal)]">
                    Proposed trigger
                  </p>
                  <p className="mt-2 text-sm font-medium text-[color:var(--foreground)]">{draft.trigger}</p>
                  {draft.triggerSummary ? (
                    <p className="mt-1 text-xs text-[color:var(--tomo-body)]">{draft.triggerSummary}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, triggerConfirmed: true }))}
                      className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Confirm trigger
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, trigger: null, triggerSummary: null, triggerConfirmed: false }))
                      }
                      className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs text-[color:var(--tomo-body)]"
                    >
                      Revise in chat
                    </button>
                  </div>
                </div>
              ) : null}
              {draft.triggerConfirmed && draft.trigger ? (
                <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-xs text-[color:var(--tomo-status-green)]">
                  Trigger confirmed: <span className="font-medium">{draft.trigger}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "action" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Context for Tomo</span>
                  <textarea
                    value={draft.contextText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, contextText: e.target.value }))}
                    rows={4}
                    className="tomo-input mt-1.5 w-full resize-y text-sm"
                    placeholder="Theme, trip dates, talking points, anything Tomo should know…"
                  />
                </label>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--foreground)]">Attachments</span>
                    <button
                      type="button"
                      onClick={addMockAttachment}
                      className="text-xs font-medium text-[color:var(--tomo-teal)]"
                    >
                      + Add file (demo)
                    </button>
                  </div>
                  {draft.attachments.length === 0 ? (
                    <p className="text-xs text-[color:var(--tomo-mute)]">Optional decks, one-pagers, or notes.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {draft.attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] px-2 py-1.5 text-xs"
                        >
                          <PaperClipIcon className="h-3.5 w-3.5 text-[color:var(--tomo-mute)]" />
                          <span className="font-medium text-[color:var(--foreground)]">{a.name}</span>
                          <span className="text-[color:var(--tomo-mute)]">{a.meta}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {draft.actionSpec ? (
                  <p className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-3 py-2 text-xs text-[color:var(--tomo-status-green)]">
                    Action confirmed — ready to generate drafts.
                  </p>
                ) : null}
              </div>
              <WorkflowCreatorChat
                key={`action-${actionChatKey}`}
                pipeline={pipeline}
                surfaceContext="workflows"
                wizardStep="action"
                workflowName={draft.workflowName.trim()}
                confirmedTrigger={draft.trigger ?? undefined}
                contextText={draft.contextText}
                attachmentNames={attachmentNames}
                variant="wizard"
                onWorkflowCreated={() => {}}
                onActionConfirmed={(action) => {
                  setDraft((prev) => ({
                    ...prev,
                    actionSpec: action,
                    tomoInstruction: prev.tomoInstruction.trim() || instructionFromAction(action),
                  }));
                }}
              />
            </div>
          ) : null}

          {step === "draft" && draft.baseBody ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-[color:var(--tomo-teal)]">Cohort draft (editable)</p>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
                <input
                  value={draft.baseSubject}
                  onChange={(e) => setDraft((prev) => ({ ...prev, baseSubject: e.target.value }))}
                  className="tomo-input mt-1 w-full text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
                <textarea
                  value={draft.baseBody}
                  onChange={(e) => setDraft((prev) => ({ ...prev, baseBody: e.target.value }))}
                  rows={8}
                  className="tomo-input mt-1 w-full resize-y text-sm"
                />
              </label>
              <p className="text-xs text-[color:var(--tomo-mute)]">
                {draft.lpDrafts.length} LP drafts ready — approve all or personalise each.
              </p>
            </div>
          ) : null}

          {step === "personalise" && selectedDraft ? (
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
                      <p className="font-semibold text-[color:var(--foreground)]">{d.lpName}</p>
                      <p className="truncate text-[color:var(--tomo-mute)]">{d.firmName}</p>
                      <span className="mt-1 inline-block rounded px-1 py-0.5 text-[9px] uppercase tracking-wide text-[color:var(--tomo-mute)]">
                        {d.personalised ? "Edited" : d.status}
                      </span>
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
          {!createdEntry ? (
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
                <button
                  type="button"
                  disabled={!canAdvanceFromStep("trigger", draft)}
                  onClick={handleNext}
                  className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Next
                </button>
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
                <>
                  <button
                    type="button"
                    onClick={handlePersonalise}
                    className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-teal)]"
                  >
                    Personalise per LP
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                  >
                    Approve all drafts
                  </button>
                </>
              ) : null}

              {step === "personalise" ? (
                <button
                  type="button"
                  onClick={handleSavePersonalised}
                  className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                >
                  Save & finish
                </button>
              ) : null}
            </div>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
