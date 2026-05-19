"use client";

import { useCallback, useMemo, useState } from "react";
import { PaperClipIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { CreateUserWorkflowInput } from "@/lib/custom-playbook-schema";
import {
  WORKFLOW_ACTION_BUILD_SUGGESTION_PILLS,
  buildMockActionBuildLpDrafts,
  type WorkflowActionBuildConfig,
  type WorkflowActionBuildLpDraft,
} from "@/lib/workflow-action-build";

type BuildPhase = "name" | "context" | "instruct" | "review" | "personalise";

export type WorkflowActionBuildResult = {
  workflowInput: CreateUserWorkflowInput;
  actionBuild: WorkflowActionBuildConfig;
};

export function WorkflowActionBuildModal({
  open,
  listName,
  workflowName,
  trigger,
  onClose,
  onComplete,
}: {
  open: boolean;
  listName: string;
  workflowName: string;
  trigger: string;
  onClose: () => void;
  onComplete: (result: WorkflowActionBuildResult) => void;
}) {
  const [phase, setPhase] = useState<BuildPhase>("name");
  const [actionName, setActionName] = useState(workflowName);
  const [contextText, setContextText] = useState("");
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; meta: string }>>([]);
  const [instruction, setInstruction] = useState("");
  const [baseSubject, setBaseSubject] = useState("");
  const [baseBody, setBaseBody] = useState("");
  const [lpDrafts, setLpDrafts] = useState<WorkflowActionBuildLpDraft[]>([]);
  const [selectedLpId, setSelectedLpId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedDraft = useMemo(
    () => lpDrafts.find((d) => d.id === selectedLpId) ?? lpDrafts[0],
    [lpDrafts, selectedLpId]
  );

  const runTomoGenerate = useCallback(async () => {
    if (!instruction.trim()) {
      toast.error("Describe the action first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/tomo/generate-workflow-cohort-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName: actionName.trim() || workflowName,
          listName,
          instruction,
          contextText,
          trigger,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const generated = (await res.json()) as { subject: string; body: string; usedLlm?: boolean };
      const { subject, body } = generated;
      setBaseSubject(subject);
      setBaseBody(body);
      const cohort = buildMockActionBuildLpDrafts(listName).map((d) => ({
        ...d,
        subject,
        body: body.replace(/\{\{lp_first_name\}\}/g, d.lpName.split(" ")[0] ?? "there"),
        status: "ready" as const,
        personalised: false,
      }));
      setLpDrafts(cohort);
      setSelectedLpId(cohort[0]?.id ?? null);
      setPhase("review");
      toast.success(generated.usedLlm ? "Tomo drafted outreach for this cohort" : "Draft ready");
    } catch {
      toast.error("Could not generate drafts");
    } finally {
      setGenerating(false);
    }
  }, [actionName, contextText, instruction, listName, trigger, workflowName]);

  const handleApproveAll = () => {
    const approved = lpDrafts.map((d) => ({ ...d, status: "approved" as const }));
    setLpDrafts(approved);
    finishBuild(approved, true);
  };

  const finishBuild = (drafts: WorkflowActionBuildLpDraft[], approveAll: boolean) => {
    const first = drafts[0];
    const actionBuild: WorkflowActionBuildConfig = {
      actionName: actionName.trim() || workflowName,
      contextText,
      attachments,
      tomoInstruction: instruction,
      baseSubject,
      baseBody,
      lpDrafts: drafts,
      ...(approveAll ? { approvedAllAt: new Date().toISOString() } : {}),
    };
    onComplete({
      workflowInput: {
        name: workflowName,
        trigger,
        action: {
          kind: "send_email",
          subject: first?.subject ?? baseSubject,
          body: first?.body ?? baseBody,
        },
      },
      actionBuild,
    });
  };

  const handleSavePersonalised = () => {
    finishBuild(lpDrafts, false);
  };

  const updateSelectedDraft = (patch: Partial<WorkflowActionBuildLpDraft>) => {
    if (!selectedDraft) return;
    setLpDrafts((prev) =>
      prev.map((d) =>
        d.id === selectedDraft.id
          ? {
              ...d,
              ...patch,
              personalised: true,
              status: d.status === "approved" ? "approved" : "edited",
            }
          : d
      )
    );
  };

  const addMockAttachment = () => {
    const n = attachments.length + 1;
    setAttachments((prev) => [
      ...prev,
      { id: `att-${n}`, name: `Context attachment ${n}.pdf`, meta: "420 KB · uploaded in action build" },
    ]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" className="fixed inset-0 bg-[color:rgba(28,43,58,0.32)] backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-build-title"
        className="relative z-[221] my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(92dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
                Configure action · {listName}
              </p>
              <h2 id="action-build-title" className="mt-1 font-[family-name:var(--font-newsreader)] text-xl font-medium text-[color:var(--foreground)]">
                {phase === "personalise" ? "Personalise per LP" : "Build your action"}
              </h2>
              <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
                Trigger: <span className="text-[color:var(--tomo-body)]">{trigger}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded p-1 text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)]" aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <BuildStepper phase={phase} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {phase === "name" ? (
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--foreground)]">Action name</span>
              <input
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                className="tomo-input mt-1.5 w-full text-sm"
                placeholder="e.g. Trip outreach to London LPs"
              />
              <p className="mt-1.5 text-xs text-[color:var(--tomo-mute)]">Shown on the workflow card and in monitoring.</p>
            </label>
          ) : null}

          {phase === "context" ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-[color:var(--foreground)]">Context for Tomo</span>
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  rows={4}
                  className="tomo-input mt-1.5 w-full resize-y text-sm"
                  placeholder="Theme, trip dates, talking points, anything Tomo should know…"
                />
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Attachments</span>
                  <button type="button" onClick={addMockAttachment} className="text-xs font-medium text-[color:var(--tomo-teal)]">
                    + Add file (demo)
                  </button>
                </div>
                {attachments.length === 0 ? (
                  <p className="text-xs text-[color:var(--tomo-mute)]">Optional decks, one-pagers, or notes.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {attachments.map((a) => (
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
            </div>
          ) : null}

          {phase === "instruct" ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-[color:var(--foreground)]">Instruct Tomo</span>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={3}
                  className="tomo-input mt-1.5 w-full resize-y text-sm"
                  placeholder="e.g. Draft a cover email and include my availability next week"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WORKFLOW_ACTION_BUILD_SUGGESTION_PILLS.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setInstruction((prev) => (prev ? `${prev}. ${pill}` : pill))}
                    className="rounded-full border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-2.5 py-1 text-[11px] text-[color:var(--tomo-body)] transition hover:border-[color:var(--tomo-teal)]"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {phase === "review" && baseBody ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-[color:var(--tomo-teal)]">Cohort draft (generic)</p>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Subject</span>
                <input value={baseSubject} readOnly className="tomo-input mt-1 w-full text-sm opacity-80" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-[color:var(--tomo-mute)]">Body</span>
                <textarea value={baseBody} readOnly rows={6} className="tomo-input mt-1 w-full resize-y text-sm opacity-80" />
              </label>
              <p className="text-xs text-[color:var(--tomo-mute)]">{lpDrafts.length} LP drafts ready — approve all or personalise each.</p>
            </div>
          ) : null}

          {phase === "personalise" && selectedDraft ? (
            <div className="flex min-h-[320px] gap-0 overflow-hidden rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)]">
              <ul className="w-[200px] shrink-0 overflow-y-auto border-r border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_40%,var(--tomo-card))]">
                {lpDrafts.map((d) => (
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
                    rows={8}
                    className="tomo-input mt-1 w-full resize-y text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedDraft({
                      subject: baseSubject,
                      body: baseBody.replace("{{lp_first_name}}", selectedDraft.lpName.split(" ")[0] ?? "there"),
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

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[color:var(--tomo-rule-soft)] px-5 py-3">
          <button type="button" onClick={onClose} className="text-xs text-[color:var(--tomo-mute)]">
            Cancel
          </button>
          <div className="flex flex-wrap gap-2">
            {phase === "name" ? (
              <button
                type="button"
                disabled={!actionName.trim()}
                onClick={() => setPhase("context")}
                className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Next
              </button>
            ) : null}
            {phase === "context" ? (
              <>
                <button type="button" onClick={() => setPhase("name")} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("instruct")}
                  className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white"
                >
                  Next
                </button>
              </>
            ) : null}
            {phase === "instruct" ? (
              <>
                <button type="button" onClick={() => setPhase("context")} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs">
                  Back
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={runTomoGenerate}
                  className="inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  {generating ? "Drafting…" : "Generate drafts"}
                </button>
              </>
            ) : null}
            {phase === "review" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("personalise");
                    setSelectedLpId(lpDrafts[0]?.id ?? null);
                  }}
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
            {phase === "personalise" ? (
              <>
                <button type="button" onClick={() => setPhase("review")} className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs">
                  Back to review
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
        </footer>
      </div>
    </div>
  );
}

function BuildStepper({ phase }: { phase: BuildPhase }) {
  const steps: Array<{ id: BuildPhase; label: string }> = [
    { id: "name", label: "Name" },
    { id: "context", label: "Context" },
    { id: "instruct", label: "Instruct" },
    { id: "review", label: "Review" },
  ];
  const activeIdx =
    phase === "personalise" ? 3 : steps.findIndex((s) => s.id === phase);

  return (
    <ol className="mt-3 flex gap-2">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={`font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.12em] ${
            i <= activeIdx ? "text-[color:var(--tomo-teal)]" : "text-[color:var(--tomo-mute)]"
          }`}
        >
          {i + 1}. {s.label}
        </li>
      ))}
    </ol>
  );
}
