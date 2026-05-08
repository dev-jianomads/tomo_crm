"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Commitment } from "@/lib/mockData";
import type { TomoAssistance, TomoMessageBlock } from "@/lib/mockTomoAssistance";
import { commitmentDayTime } from "@/lib/today-commitment-time";

function blockBrief(blocks: TomoMessageBlock[] | undefined): Extract<TomoMessageBlock, { kind: "brief" }> | null {
  const b = blocks?.find((x): x is Extract<TomoMessageBlock, { kind: "brief" }> => x.kind === "brief");
  return b ?? null;
}

function blockSnapshot(blocks: TomoMessageBlock[] | undefined): Extract<TomoMessageBlock, { kind: "snapshot" }> | null {
  const s = blocks?.find((x): x is Extract<TomoMessageBlock, { kind: "snapshot" }> => x.kind === "snapshot");
  return s ?? null;
}

export function getCommitmentDrawerAgendaPreview(assistance: TomoAssistance | null | undefined): {
  leadText: string;
  summary: string | null;
  agenda: string[];
  commitments: string[];
  snapshotFallback: string | null;
} {
  const blocks = assistance?.initialMessage.blocks;
  const brief = blockBrief(blocks);
  const snap = blockSnapshot(blocks);
  const leadText = assistance?.initialMessage.text?.trim() ?? "";
  return {
    leadText,
    summary: brief?.summary ?? null,
    agenda: brief?.agenda ?? [],
    commitments: brief?.commitments ?? [],
    snapshotFallback: !brief && snap ? snap.text : null,
  };
}

export type CommitmentResolution = "approved" | null;

type CommitmentDrawerPanelProps = {
  commitment: Commitment;
  assistance: TomoAssistance | null | undefined;
  /** Right-hand status pill */
  verbLabel: string;
  resolution: CommitmentResolution;
  onApproveAndSend: () => void;
  onAmend: () => void;
  onAttachDocument: () => void;
  onClose: () => void;
  /** Mock: attached filenames shown above CTAs; each row can be removed. */
  attachedFiles?: string[];
  onDetachFile?: (index: number) => void;
  finalApproveLabel?: string;
};

/**
 * Today “Coming up” drawer — section 1: commitment header, Tomo agenda preview, primary CTAs (mirrors ActionDrawerPanel).
 */
export function CommitmentDrawerPanel({
  commitment,
  assistance,
  verbLabel,
  resolution,
  onApproveAndSend,
  onAmend,
  onAttachDocument,
  onClose,
  attachedFiles = [],
  onDetachFile,
  finalApproveLabel = "Approve and Send",
}: CommitmentDrawerPanelProps) {
  const preview = getCommitmentDrawerAgendaPreview(assistance);
  const showCtas = resolution === null;
  const pillIsSent = verbLabel === "Prep sent" || resolution === "approved";

  const timeLine = commitmentDayTime(commitment.datetime);

  const commitmentStatusPillClass =
    pillIsSent || verbLabel === "Prep sent"
      ? "inline-flex shrink-0 items-center rounded-full border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--tomo-teal-muted)] dark:text-[color:var(--tomo-teal)]"
      : verbLabel === "First Contact"
        ? "inline-flex shrink-0 items-center rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)] dark:bg-[color:var(--tomo-navy-soft)]"
        : verbLabel === "Prep ready"
          ? "inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]"
          : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="tomo-field-label">Commitment</p>
            <p className="text-sm font-semibold accent-title">
              {commitment.lp} : {commitment.contactName}
              {commitment.title ? <span className="font-semibold text-[color:var(--foreground)]"> · {commitment.title}</span> : null}
            </p>
            <p className="text-sm text-[color:var(--tomo-body)]">{timeLine}</p>
            {commitment.commitmentOverdue ? (
              <p className="mt-1 inline-flex rounded-full border border-[color:var(--tomo-red)] bg-[color:var(--tomo-red-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--tomo-red)]">
                Commitment overdue — needs attention
              </p>
            ) : null}
            {commitment.calendarUrl || commitment.linkedInUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {commitment.calendarUrl ? (
                  <a
                    href={commitment.calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[color:var(--tomo-teal)] underline underline-offset-2 hover:text-[color:var(--tomo-teal-muted)]"
                  >
                    Open calendar
                  </a>
                ) : null}
                {commitment.linkedInUrl ? (
                  <a
                    href={commitment.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[#0a66c2] underline underline-offset-2 hover:text-[#004182]"
                  >
                    LinkedIn profile
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          {commitmentStatusPillClass && verbLabel ? (
            <span className={commitmentStatusPillClass}>{verbLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="tomo-card tomo-hint-banner space-y-2 px-3 py-2.5">
        <p className="tomo-field-label text-[11px] tracking-wide">Tomo</p>
        {preview.leadText ? <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{preview.leadText}</p> : null}

        {preview.summary || preview.agenda.length > 0 || preview.commitments.length > 0 || preview.snapshotFallback ? (
          <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2.5">
            {preview.summary ? <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{preview.summary}</p> : null}
            {preview.snapshotFallback && !preview.summary ? (
              <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{preview.snapshotFallback}</p>
            ) : null}

            {preview.agenda.length > 0 ? (
              <div className={preview.summary || preview.snapshotFallback ? "mt-3" : ""}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Agenda</p>
                <ul className="mt-1 space-y-1 text-sm text-[color:var(--foreground)]">
                  {preview.agenda.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--tomo-teal)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.commitments.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Commitments</p>
                <ul className="mt-1 space-y-1 text-sm text-[color:var(--foreground)]">
                  {preview.commitments.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--tomo-teal-muted)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showCtas ? (
        <>
          {attachedFiles.length > 0 ? (
            <div className="tomo-card px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Attached</p>
              <ul className="mt-2 space-y-1.5">
                {attachedFiles.map((name, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="flex min-w-0 items-center justify-between gap-2 text-sm text-[color:var(--foreground)]"
                  >
                    <span className="min-w-0 truncate" title={name}>
                      {name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDetachFile?.(index)}
                      className="tomo-drawer-icon-btn h-7 w-7"
                      aria-label={`Remove ${name}`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="button-primary tomo-ai-bg min-w-[7rem]" onClick={onApproveAndSend}>
              {finalApproveLabel}
            </button>
            <button type="button" className="button-secondary" onClick={onAmend}>
              Amend
            </button>
            <button type="button" className="button-secondary" onClick={onAttachDocument}>
              Attach Document
            </button>
            <button type="button" className="button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-[color:var(--tomo-mute)]">Agenda sent — participants will receive the prep pack.</p>
      )}
    </div>
  );
}
