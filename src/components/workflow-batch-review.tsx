"use client";

import { useCallback, useState } from "react";
import { ChevronDownIcon, PaperClipIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { WorkflowDraft, WorkflowDraftBatch, WorkflowDraftStatus } from "@/lib/workflow-surface-mock";

function statusTone(status: WorkflowDraftStatus): string {
  switch (status) {
    case "ready":
      return "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]";
    case "edited":
      return "bg-[color:color-mix(in_srgb,var(--tomo-navy)_8%,var(--tomo-card-warm))] text-[color:var(--foreground)]";
    case "approved":
      return "bg-[color:color-mix(in_srgb,var(--tomo-status-green)_14%,transparent)] text-[color:var(--tomo-status-green)]";
    case "skipped":
      return "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-mute)]";
    default:
      return "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-mute)]";
  }
}

function bumpStatusAfterEdit(status: WorkflowDraftStatus): WorkflowDraftStatus {
  if (status === "approved" || status === "skipped") return status;
  return status === "ready" ? "edited" : status;
}

function isActionable(status: WorkflowDraftStatus): boolean {
  return status !== "approved" && status !== "skipped";
}

export function WorkflowBatchReview({
  batch,
  variant = "batch",
}: {
  batch: WorkflowDraftBatch;
  variant?: "batch" | "single";
}) {
  const [drafts, setDrafts] = useState<WorkflowDraft[]>(() => batch.drafts.map((d) => ({ ...d })));
  const [expandedId, setExpandedId] = useState<string | null>(() =>
    variant === "single" && batch.drafts[0] ? batch.drafts[0].id : null
  );
  const [batchTomo, setBatchTomo] = useState("");
  const [draftTomoById, setDraftTomoById] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setBanner(message);
    window.setTimeout(() => setBanner(null), 2600);
  }, []);

  const applyBatchTomo = () => {
    const instruction = batchTomo.trim();
    if (!instruction) return;
    setDrafts((prev) =>
      prev.map((d) =>
        isActionable(d.status)
          ? {
              ...d,
              body: `${d.body}\n\n— Tomo (batch): ${instruction}`,
              status: bumpStatusAfterEdit(d.status),
            }
          : d
      )
    );
    setBatchTomo("");
    flash("Applied batch instruction to open drafts.");
  };

  const applyDraftTomo = (draftId: string) => {
    const instruction = (draftTomoById[draftId] ?? "").trim();
    if (!instruction) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId && isActionable(d.status)
          ? {
              ...d,
              body: `${d.body}\n\n— Tomo: ${instruction}`,
              status: bumpStatusAfterEdit(d.status),
            }
          : d
      )
    );
    setDraftTomoById((prev) => ({ ...prev, [draftId]: "" }));
    flash("Applied Tomo instruction to this draft.");
  };

  const approveOne = (draftId: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, status: "approved" } : d)));
    flash("Draft marked approved.");
  };

  const skipOne = (draftId: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, status: "skipped" } : d)));
    flash("Draft skipped for this run.");
  };

  const approveAllReady = () => {
    setDrafts((prev) =>
      prev.map((d) => (d.status === "ready" || d.status === "edited" ? { ...d, status: "approved" as const } : d))
    );
    flash("Approved all drafts that were ready or edited.");
  };

  const readyOrEdited = drafts.filter((d) => d.status === "ready" || d.status === "edited").length;
  const approved = drafts.filter((d) => d.status === "approved").length;
  const skipped = drafts.filter((d) => d.status === "skipped").length;

  return (
    <div className="space-y-4">
      {banner ? (
        <div className="rounded-[var(--tomo-radius-sm)] border border-[color:color-mix(in_srgb,var(--tomo-teal)_35%,var(--tomo-rule-soft))] bg-[color:color-mix(in_srgb,var(--tomo-teal)_8%,var(--tomo-card))] px-3 py-2 text-xs text-[color:var(--foreground)]">
          {banner}
        </div>
      ) : null}

      <header>
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">
          {batch.eyebrow}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-newsreader)] text-[22px] font-medium leading-tight text-[color:var(--foreground)] [font-variation-settings:'opsz'_26]">
          {batch.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--tomo-body)]">{batch.context}</p>
      </header>

      <section className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-card)_88%,var(--tomo-bg))] p-3.5 shadow-inner">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[color:var(--tomo-teal-evidence-bg)] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-teal)]">
            Batch · Tomo
          </span>
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[color:var(--tomo-mute)]">
            Applies to every open draft below
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-2 transition focus-within:border-[color:var(--tomo-teal)]">
          <SparklesIcon className="h-4 w-4 shrink-0 text-[color:var(--tomo-teal)]" aria-hidden />
          <input
            value={batchTomo}
            onChange={(e) => setBatchTomo(e.target.value)}
            placeholder={batch.batchTomoPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-xs text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--tomo-mute)]"
            aria-label="Batch-wide Tomo instruction"
          />
          <button
            type="button"
            onClick={applyBatchTomo}
            disabled={!batchTomo.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] text-[color:var(--tomo-card)] transition enabled:hover:bg-[color:color-mix(in_srgb,var(--tomo-teal)_88%,var(--foreground))] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Apply batch instruction"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <div className="space-y-2">
        {drafts.map((draft) => (
          <DraftReviewCard
            key={draft.id}
            draft={draft}
            expanded={expandedId === draft.id}
            onToggle={() => setExpandedId((id) => (id === draft.id ? null : draft.id))}
            tomoValue={draftTomoById[draft.id] ?? ""}
            onTomoChange={(v) => setDraftTomoById((prev) => ({ ...prev, [draft.id]: v }))}
            onApplyTomo={() => applyDraftTomo(draft.id)}
            onSubjectChange={(subject) =>
              setDrafts((prev) =>
                prev.map((d) =>
                  d.id === draft.id && isActionable(d.status) ? { ...d, subject, status: bumpStatusAfterEdit(d.status) } : d
                )
              )
            }
            onBodyChange={(body) =>
              setDrafts((prev) =>
                prev.map((d) =>
                  d.id === draft.id && isActionable(d.status) ? { ...d, body, status: bumpStatusAfterEdit(d.status) } : d
                )
              )
            }
            onApprove={() => approveOne(draft.id)}
            onSkip={() => skipOne(draft.id)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 z-[1] -mx-1 border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_96%,var(--tomo-card-warm))] px-1 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.06em] text-[color:var(--tomo-mute)]">
            <span className="text-[color:var(--foreground)]">{readyOrEdited}</span> open ·{" "}
            <span className="text-[color:var(--foreground)]">{approved}</span> approved ·{" "}
            <span className="text-[color:var(--foreground)]">{skipped}</span> skipped
          </p>
          <button
            type="button"
            onClick={approveAllReady}
            disabled={readyOrEdited === 0}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-teal)] transition hover:bg-[color:var(--tomo-teal)] hover:text-[color:var(--tomo-card)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[color:var(--tomo-card)] disabled:hover:text-[color:var(--tomo-teal)]"
          >
            Approve all ready
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftReviewCard({
  draft,
  expanded,
  onToggle,
  tomoValue,
  onTomoChange,
  onApplyTomo,
  onSubjectChange,
  onBodyChange,
  onApprove,
  onSkip,
}: {
  draft: WorkflowDraft;
  expanded: boolean;
  onToggle: () => void;
  tomoValue: string;
  onTomoChange: (value: string) => void;
  onApplyTomo: () => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onApprove: () => void;
  onSkip: () => void;
}) {
  const locked = !isActionable(draft.status);

  return (
    <article
      className={`overflow-hidden rounded-[var(--tomo-radius-sm)] border bg-[color:var(--tomo-card)] transition ${
        expanded
          ? "border-[color:var(--tomo-teal)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--tomo-teal)_12%,transparent)]"
          : "border-[color:var(--tomo-rule)]"
      }`}
    >
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3.5">
        <button type="button" onClick={onToggle} className="min-w-0 text-left">
          <p className="truncate font-[family-name:var(--font-newsreader)] text-[15px] font-medium text-[color:var(--foreground)] [font-variation-settings:'opsz'_18]">
            {draft.firmName}
          </p>
          <p className="truncate text-[11px] text-[color:var(--tomo-mute)]">
            {draft.lpName} · {draft.roleLabel} · {draft.tierLabel}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {draft.attachment ? (
            <span className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-full bg-[color:var(--tomo-teal-evidence-bg)] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.06em] text-[color:var(--tomo-teal)]">
              <PaperClipIcon className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{draft.attachment.name}</span>
            </span>
          ) : (
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.06em] text-[color:var(--tomo-mute)]">
              No attach
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusTone(draft.status)}`}>{draft.status}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            disabled={locked}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--tomo-teal)] transition hover:bg-[color:var(--tomo-teal)] hover:text-[color:var(--tomo-card)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center text-[color:var(--tomo-mute)] transition hover:text-[color:var(--tomo-teal)]"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse draft" : "Expand draft"}
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? "rotate-180 text-[color:var(--tomo-teal)]" : ""}`} />
          </button>
        </div>
      </div>

      {!expanded ? (
        <div className="border-t border-[color:var(--tomo-rule-soft)] px-4 pb-3.5 pt-3">
          <p className="line-clamp-1 text-[13px] font-medium text-[color:var(--foreground)]">{draft.subject}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--tomo-body)]">{draft.body}</p>
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-3 border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,var(--tomo-card-warm))] px-4 py-4">
          <label className="block">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
              To
            </span>
            <p className="mt-0.5 text-xs text-[color:var(--foreground)]">
              {`${draft.lpName} <${draft.email}>`}
            </p>
          </label>

          <label className="block">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
              Subject
            </span>
            <input
              value={draft.subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={locked}
              className="mt-1 w-full rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-1.5 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)] disabled:opacity-50"
            />
          </label>

          <label className="block">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">
              Body
            </span>
            <textarea
              value={draft.body}
              onChange={(e) => onBodyChange(e.target.value)}
              disabled={locked}
              rows={8}
              className="mt-1 w-full resize-y rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-2 text-xs leading-relaxed text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)] disabled:opacity-50"
            />
          </label>

          {draft.attachment ? (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-2.5 py-1 text-[11px] text-[color:var(--foreground)]">
                <PaperClipIcon className="h-3.5 w-3.5 text-[color:var(--tomo-teal)]" aria-hidden />
                <span className="font-medium">{draft.attachment.name}</span>
                <span className="text-[color:var(--tomo-mute)]">· {draft.attachment.meta}</span>
              </span>
            </div>
          ) : null}

          <div className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]">
              This draft · Tomo
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={tomoValue}
                onChange={(e) => onTomoChange(e.target.value)}
                disabled={locked}
                placeholder="Tighten paragraph two — more institutional tone"
                className="min-w-[200px] flex-1 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-card)_96%,var(--tomo-bg))] px-2.5 py-1.5 text-[11px] text-[color:var(--foreground)] outline-none focus:border-[color:var(--tomo-teal)] disabled:opacity-50"
                aria-label="Tomo instruction for this draft"
              />
              <button
                type="button"
                onClick={onApplyTomo}
                disabled={locked || !tomoValue.trim()}
                className="rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--tomo-card)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSkip}
              disabled={locked}
              className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-mute)] transition hover:border-[color:var(--tomo-rule)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Skip this LP
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
