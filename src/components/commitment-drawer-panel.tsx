"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Commitment, DrawerSpecHeader, DrawerSpecHeaderLink, DrawerSpecHeaderPill } from "@/lib/mockData";
import type { TomoAssistance, TomoMessageBlock } from "@/lib/mockTomoAssistance";
import { commitmentDayTime } from "@/lib/today-commitment-time";
import { DrawerCommitmentsCaptured, DrawerSpecV3Head, DrawerWhySurfaced } from "@/components/drawer-shared-blocks";

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

function commitmentDrawerEyebrow(c: Commitment): string {
  if (c.prepStatus === "first_contact") return "Meeting prep · First contact";
  if (c.prepStatus === "ready") return "Meeting prep · Draft for approval";
  return "Coming up · Prep context";
}

function fallbackCommitmentDrawerSpec(c: Commitment): DrawerSpecHeader {
  const pills: DrawerSpecHeaderPill[] = [];
  if (c.commitmentOverdue) pills.push({ tone: "red", label: "Commitment overdue" });
  if (c.prepStatus === "ready") pills.push({ tone: "teal", label: "Prep ready" });
  else if (c.prepStatus === "first_contact") pills.push({ tone: "navy", label: "First contact" });

  const links: DrawerSpecHeaderLink[] = [];
  if (c.calendarUrl) links.push({ href: c.calendarUrl, label: "Open calendar", icon: "calendar" });
  if (c.linkedInUrl) links.push({ href: c.linkedInUrl, label: "LinkedIn", icon: "linkedin" });
  const relPath = c.relationshipId ? `/relationships?focus=${encodeURIComponent(c.relationshipId)}` : "/relationships";
  links.push({ href: relPath, label: "Open LP record", icon: "clock" });
  return { statusPills: pills, links };
}

function commitmentResolutionSpecPills(resolution: CommitmentResolution): DrawerSpecHeaderPill[] {
  if (resolution === "approved") return [{ tone: "teal", label: "Prep sent" }];
  return [];
}

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
  verbLabel: _verbLabel,
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

  const commitmentLines =
    commitment.drawerMeetingCommitments && commitment.drawerMeetingCommitments.length > 0
      ? commitment.drawerMeetingCommitments
      : preview.commitments.map((label) => ({ label }));

  const timeLine = commitmentDayTime(commitment.datetime);
  const spec = commitment.drawerSpecHeader ?? fallbackCommitmentDrawerSpec(commitment);
  const subtitle =
    spec.subtitle ?? [commitment.title, timeLine].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <DrawerSpecV3Head
        eyebrow={commitmentDrawerEyebrow(commitment)}
        title={`${commitment.lp} · ${commitment.contactName}`}
        subtitle={subtitle}
        spec={spec}
        onClose={onClose}
        extraPills={commitmentResolutionSpecPills(resolution)}
      />

      {commitment.drawerWhySurfaced ? (
        <DrawerWhySurfaced body={commitment.drawerWhySurfaced.body} stamp={commitment.drawerWhySurfaced.stamp} />
      ) : null}

      <div className="tomo-card tomo-hint-banner space-y-2 px-3 py-2.5">
        <p className="tomo-field-label text-[11px] tracking-wide">Tomo</p>
        {preview.leadText ? <p className="text-sm leading-relaxed text-[color:var(--foreground)]">{preview.leadText}</p> : null}

        {preview.summary || preview.agenda.length > 0 || preview.snapshotFallback ? (
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
          </div>
        ) : null}
      </div>

      {commitmentLines.length > 0 ? <DrawerCommitmentsCaptured items={commitmentLines} /> : null}

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
