"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isDraftStyleStep, type WorkflowDefinition } from "@/lib/workflow-templates";
import type { FlowSelection } from "@/components/workflow-process-flow";

type PreviewLp = { name: string; firm: string };

type WorkflowStepConfigPanelProps = {
  workflow: WorkflowDefinition;
  target: FlowSelection;
  previewLp: PreviewLp | null;
  onSave: (def: WorkflowDefinition) => void;
  onDismiss: () => void;
};

/** Shell persisted on the step; built from the single “what should this reply say” field. */
function buildDraftTemplateFromDescription(description: string): string {
  const trimmed = description.trim();
  const snippet = trimmed ? `${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}` : "…";
  return (
    `Thanks for your note — I wanted to follow up on our last conversation.\n\n` +
    `[Tomo fills specifics from: ${snippet}]`
  );
}

export function WorkflowStepConfigPanel({
  workflow,
  target,
  previewLp,
  onSave,
  onDismiss,
}: WorkflowStepConfigPanelProps) {
  const [triggerText, setTriggerText] = useState(workflow.trigger);
  const [scheduledNote, setScheduledNote] = useState("");

  const stepIndex = target.kind === "step" ? target.index : -1;
  const step = stepIndex >= 0 ? workflow.steps[stepIndex] : null;

  const [stepName, setStepName] = useState(step?.name ?? "");
  const [stepDescription, setStepDescription] = useState(step?.description ?? "");
  const [stepDuration, setStepDuration] = useState(step?.duration ?? "");
  const [stepCondition, setStepCondition] = useState(step?.condition ?? "");

  useEffect(() => {
    queueMicrotask(() => {
      setTriggerText(workflow.trigger);
      setScheduledNote("");
    });
  }, [workflow.trigger, workflow.title, target]);

  useEffect(() => {
    if (!step) return;
    queueMicrotask(() => {
      setStepName(step.name);
      setStepDescription(step.description);
      setStepDuration(step.duration ?? "");
      setStepCondition(step.condition ?? "");
    });
  }, [step, target, workflow]);

  const triggerKind = workflow.triggerKind ?? "EVENT";
  const isWait = step?.type === "wait";
  const isDraft = step ? isDraftStyleStep(step) && step.type === "action" : false;

  const resolvedDraftTemplate = useMemo(
    () => (isDraft ? buildDraftTemplateFromDescription(stepDescription) : ""),
    [isDraft, stepDescription]
  );

  const previewBody = useMemo(() => {
    const lp = previewLp;
    const greeting = lp ? `Hi ${lp.name},` : "Hi [LP name],";
    const core = resolvedDraftTemplate.trim() || "…";
    return `${greeting}\n\n${core}\n\nBest,\n[You]`;
  }, [resolvedDraftTemplate, previewLp]);

  const title = useMemo(() => {
    if (target.kind === "trigger") return "Configure trigger";
    if (!step) return "Step";
    if (isWait) return "Amend schedule";
    if (isDraft) return "Draft reply";
    return "Configure step";
  }, [target.kind, step, isWait, isDraft]);

  const handleSave = () => {
    if (target.kind === "trigger") {
      let nextTrigger = triggerText.trim();
      if (triggerKind === "SCHEDULED" && scheduledNote.trim()) {
        nextTrigger = nextTrigger
          ? `${nextTrigger}\n\nSchedule note: ${scheduledNote.trim()}`
          : `Schedule note: ${scheduledNote.trim()}`;
      }
      onSave({ ...workflow, trigger: nextTrigger || workflow.trigger });
      setScheduledNote("");
      toast.success("Trigger updated");
      return;
    }

    if (!step || stepIndex < 0) return;

    const nextSteps = workflow.steps.map((s, i) => {
      if (i !== stepIndex) return s;
      if (isWait) {
        return {
          ...s,
          description: stepDescription.trim() || s.description,
          duration: stepDuration.trim() || undefined,
          condition: stepCondition.trim() || undefined,
        };
      }
      if (isDraft) {
        const desc = stepDescription.trim() || s.description;
        return {
          ...s,
          name: stepName.trim() || s.name,
          description: desc,
          draftTemplate: buildDraftTemplateFromDescription(desc),
        };
      }
      return {
        ...s,
        name: stepName.trim() || s.name,
        description: stepDescription.trim() || s.description,
      };
    });

    onSave({ ...workflow, steps: nextSteps });
    toast.success("Saved");
  };

  return (
    <div
      className="mt-3 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_42%,var(--tomo-card))] px-3 py-3 shadow-[var(--tomo-shadow-1)]"
      data-testid="workflow-step-config-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="tomo-field-label">{title}</p>
          {target.kind === "step" && step ? (
            <p className="mt-0.5 text-xs text-[color:var(--tomo-body)]">
              Step {stepIndex + 2} · {step.type === "wait" ? "Wait" : "Action"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[11px] font-medium text-[color:var(--tomo-mute)] transition hover:text-[color:var(--foreground)]"
        >
          Close
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {target.kind === "trigger" ? (
          <>
            <div>
              <label className="tomo-field-label block">Trigger text</label>
              <textarea
                value={triggerText}
                onChange={(e) => setTriggerText(e.target.value)}
                rows={3}
                className="tomo-input mt-1 min-h-[4.5rem] w-full resize-y text-xs shadow-none"
              />
              <p className="mt-1 text-[10px] text-[color:var(--tomo-mute)]">
                Describes when this workflow runs ({triggerKind}). Tomo chat can also edit this.
              </p>
            </div>
            {triggerKind === "SCHEDULED" ? (
              <div>
                <label className="tomo-field-label block">Schedule / run note (optional)</label>
                <input
                  type="text"
                  value={scheduledNote}
                  onChange={(e) => setScheduledNote(e.target.value)}
                  placeholder="e.g. 7 days before NYC trip — 30 May 2026"
                  className="tomo-input mt-1 w-full text-xs shadow-none"
                />
                <p className="mt-1 text-[10px] text-[color:var(--tomo-mute)]">
                  Appended to the trigger so cadence stays explicit for the team.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {target.kind === "step" && step && isWait ? (
          <>
            <div>
              <label className="tomo-field-label block">Duration</label>
              <input
                type="text"
                value={stepDuration}
                onChange={(e) => setStepDuration(e.target.value)}
                placeholder="e.g. 48h, 5 business days, Human review"
                className="tomo-input mt-1 w-full text-xs shadow-none"
              />
            </div>
            <div>
              <label className="tomo-field-label block">Condition (optional)</label>
              <input
                type="text"
                value={stepCondition}
                onChange={(e) => setStepCondition(e.target.value)}
                className="tomo-input mt-1 w-full text-xs shadow-none"
              />
            </div>
            <div>
              <label className="tomo-field-label block">Description</label>
              <textarea
                value={stepDescription}
                onChange={(e) => setStepDescription(e.target.value)}
                rows={2}
                className="tomo-input mt-1 min-h-[3.25rem] w-full resize-y text-xs shadow-none"
              />
            </div>
          </>
        ) : null}

        {target.kind === "step" && step && !isWait && isDraft ? (
          <>
            <div>
              <label className="tomo-field-label block">Step name</label>
              <input
                type="text"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                className="tomo-input mt-1 w-full text-xs shadow-none"
              />
            </div>
            <div>
              <label className="tomo-field-label block">What should this reply say?</label>
              <textarea
                value={stepDescription}
                onChange={(e) => setStepDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Thank them, recap AI landscape and our fund thesis, propose a short call"
                className="tomo-input mt-1 min-h-[5rem] w-full resize-y text-xs shadow-none"
              />
            </div>
            <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2 py-2 shadow-[var(--tomo-shadow-1)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Preview</p>
              <p className="mt-1 text-[10px] text-[color:var(--tomo-mute)]">
                Example LP:{" "}
                {previewLp ? (
                  <span className="font-medium text-[color:var(--foreground)]">
                    {previewLp.name} · {previewLp.firm}
                  </span>
                ) : (
                  <span className="font-medium text-[color:var(--tomo-status-amber-text)]">
                    Link a list with relationships to use a live LP name.
                  </span>
                )}
              </p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--tomo-radius-sm)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] px-2 py-1.5 text-[11px] text-[color:var(--foreground)]">
                {previewBody}
              </pre>
            </div>
          </>
        ) : null}

        {target.kind === "step" && step && !isWait && !isDraft ? (
          <>
            <div>
              <label className="tomo-field-label block">Step name</label>
              <input
                type="text"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                className="tomo-input mt-1 w-full text-xs shadow-none"
              />
            </div>
            <div>
              <label className="tomo-field-label block">Description</label>
              <textarea
                value={stepDescription}
                onChange={(e) => setStepDescription(e.target.value)}
                rows={3}
                className="tomo-input mt-1 min-h-[5rem] w-full resize-y text-xs shadow-none"
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] pt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-[var(--tomo-radius-md)] border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}
