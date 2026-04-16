"use client";

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
  finalApproveLabel = "Approve and Send",
}: CommitmentDrawerPanelProps) {
  const preview = getCommitmentDrawerAgendaPreview(assistance);
  const showCtas = resolution === null;
  const prepReady = commitment.prepStatus === "ready";
  const pillIsSent = verbLabel === "Prep sent" || resolution === "approved";

  const timeLine = commitmentDayTime(commitment.datetime);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Commitment</p>
            <p className="text-sm font-semibold accent-title">
              {commitment.lp} : {commitment.contactName}
              {commitment.title ? <span className="font-semibold text-gray-800"> · {commitment.title}</span> : null}
            </p>
            <p className="text-sm text-gray-600">{timeLine}</p>
            {commitment.commitmentOverdue ? (
              <p className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                Commitment overdue — needs attention
              </p>
            ) : null}
            {commitment.calendarUrl ? (
              <a
                href={commitment.calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                Open calendar
              </a>
            ) : null}
          </div>
          {pillIsSent || prepReady ? (
            <span
              className={
                pillIsSent
                  ? "inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800"
                  : "inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]"
              }
            >
              {pillIsSent ? "Prep sent" : "Prep ready"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Tomo</p>
        {preview.leadText ? <p className="text-sm leading-relaxed text-gray-900">{preview.leadText}</p> : null}

        {preview.summary || preview.agenda.length > 0 || preview.commitments.length > 0 || preview.snapshotFallback ? (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
            {preview.summary ? <p className="text-sm leading-relaxed text-gray-800">{preview.summary}</p> : null}
            {preview.snapshotFallback && !preview.summary ? (
              <p className="text-sm leading-relaxed text-gray-800">{preview.snapshotFallback}</p>
            ) : null}

            {preview.agenda.length > 0 ? (
              <div className={preview.summary || preview.snapshotFallback ? "mt-3" : ""}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Agenda</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-800">
                  {preview.agenda.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.commitments.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Commitments</p>
                <ul className="mt-1 space-y-1 text-sm text-gray-800">
                  {preview.commitments.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
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
      ) : (
        <p className="text-xs text-gray-500">Agenda sent — participants will receive the prep pack.</p>
      )}
    </div>
  );
}
