"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  Commitment,
  DrawerSpecHeader,
  DrawerSpecHeaderLink,
  DrawerSpecHeaderPill,
} from "@/lib/mockData";
import type { TomoAssistance, TomoMessageBlock } from "@/lib/mockTomoAssistance";
import { commitmentDayTime } from "@/lib/today-commitment-time";
import { DrawerSpecV3Head, DrawerWhySurfaced } from "@/components/drawer-shared-blocks";
import {
  DrawerLastTouchBlock,
  DrawerOpenCommitmentsPrepBlock,
  DrawerPrepActionBar,
  DrawerPrepActivityPreview,
  DrawerPrepAttendeesBlock,
  DrawerPrepMaterialsBlock,
  DrawerSuggestedFocusBlock,
  MeetingPrepTimeStrip,
} from "@/components/meeting-prep-drawer-blocks";

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

function mergeHeaderSpec(commitment: Commitment, spec: DrawerSpecHeader): DrawerSpecHeader {
  const thread = commitment.drawerThreadLink;
  const base = spec.links ?? [];
  const links: DrawerSpecHeaderLink[] = thread
    ? [{ href: thread.href, label: thread.label, icon: "envelope" }, ...base]
    : [...base];
  return { ...spec, links };
}

type CommitmentDrawerPanelProps = {
  commitment: Commitment;
  assistance: TomoAssistance | null | undefined;
  verbLabel: string;
  resolution: CommitmentResolution;
  onApproveAndSend: () => void;
  onAmend: () => void;
  onAttachDocument: () => void;
  onClose: () => void;
  attachedFiles?: string[];
  onDetachFile?: (index: number) => void;
  finalApproveLabel?: string;
  /** Meeting prep — scroll + expand full activity accordion */
  onExpandFullActivity?: () => void;
  /** Toasts for prep chip row (mock) */
  onMeetingPrepNotify?: (message: string) => void;
};

/**
 * Today “Coming up” — `design/tomo_drawer_meetingprep_light_v3.html` when `drawerTimeStrip` / prep fields are set.
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
  onExpandFullActivity,
  onMeetingPrepNotify,
}: CommitmentDrawerPanelProps) {
  const preview = getCommitmentDrawerAgendaPreview(assistance);
  const showCtas = resolution === null;
  const notify = onMeetingPrepNotify ?? (() => {});

  const commitmentLines =
    commitment.drawerMeetingCommitments && commitment.drawerMeetingCommitments.length > 0
      ? commitment.drawerMeetingCommitments
      : preview.commitments.map((label) => ({ label }));

  const timeLine = commitmentDayTime(commitment.datetime);
  const rawSpec = commitment.drawerSpecHeader ?? fallbackCommitmentDrawerSpec(commitment);
  const spec = mergeHeaderSpec(commitment, rawSpec);
  const subtitle =
    spec.subtitle ?? [commitment.title, timeLine].filter(Boolean).join(" · ");

  const eyebrow = commitment.drawerPrepEyebrow ?? commitmentDrawerEyebrow(commitment);
  const title = commitment.drawerPrepTitle ?? `${commitment.lp} · ${commitment.contactName}`;

  const labels = commitment.drawerPrepLabels ?? {};
  const activityEntries = commitment.activityLog ?? [];
  const hasMeetingPrepChrome = Boolean(commitment.drawerTimeStrip);

  useEffect(() => {
    if (!hasMeetingPrepChrome || !showCtas) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        notify("Marked as reviewed (demo).");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMeetingPrepChrome, showCtas, notify]);

  const timeStripNode =
    commitment.drawerTimeStrip != null ? (
      <MeetingPrepTimeStrip
        rangeLabel={commitment.drawerTimeStrip.rangeLabel}
        whereLabel={commitment.drawerTimeStrip.whereLabel}
        calendarUrl={commitment.calendarUrl}
        joinUrl={commitment.drawerTimeStrip.joinUrl}
      />
    ) : null;

  const showTomoBrief =
    !hasMeetingPrepChrome &&
    Boolean(preview.leadText || preview.summary || preview.agenda.length > 0 || preview.snapshotFallback);

  return (
    <div className="space-y-5">
      <DrawerSpecV3Head
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        spec={spec}
        onClose={onClose}
        extraPills={commitmentResolutionSpecPills(resolution)}
        afterSubtitle={timeStripNode}
      />

      {commitment.drawerWhySurfaced ? (
        <DrawerWhySurfaced
          label={commitment.drawerWhySurfaced.label}
          body={commitment.drawerWhySurfaced.body}
          stamp={commitment.drawerWhySurfaced.stamp}
        />
      ) : null}

      {commitment.drawerAttendees && commitment.drawerAttendees.length > 0 ? (
        <DrawerPrepAttendeesBlock label={labels.attendees ?? "Who's on the call"} attendees={commitment.drawerAttendees} />
      ) : null}

      {commitment.drawerLastTouch && commitment.drawerLastTouch.length > 0 ? (
        <DrawerLastTouchBlock
          label={labels.lastTouch ?? "Where you left things"}
          paragraphs={commitment.drawerLastTouch}
        />
      ) : null}

      {commitmentLines.length > 0 ? (
        <DrawerOpenCommitmentsPrepBlock
          label={labels.openCommitments ?? "Open commitments"}
          rows={commitmentLines}
        />
      ) : null}

      {commitment.drawerSuggestedFocus && commitment.drawerSuggestedFocus.length > 0 ? (
        <DrawerSuggestedFocusBlock label={labels.focus ?? "What to push on"} items={commitment.drawerSuggestedFocus} />
      ) : null}

      {commitment.drawerPrepMaterials && commitment.drawerPrepMaterials.length > 0 ? (
        <DrawerPrepMaterialsBlock label={labels.materials ?? "Materials at hand"} materials={commitment.drawerPrepMaterials} />
      ) : null}

      {activityEntries.length > 0 ? (
        <DrawerPrepActivityPreview
          label={labels.activityPreview ?? "Recent activity"}
          entries={activityEntries}
          historyTotal={commitment.drawerActivityHistoryTotal}
          onViewFullHistory={onExpandFullActivity}
        />
      ) : null}

      {showTomoBrief ? (
        <div className="tomo-card tomo-hint-banner space-y-2 px-3 py-2.5">
          <p className="tomo-field-label text-[11px] tracking-wide">Tomo briefing</p>
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
      ) : null}

      {showCtas ? (
        <>
          {hasMeetingPrepChrome ? (
            <DrawerPrepActionBar
              onMarkReviewed={() => notify("Marked as reviewed (demo).")}
              onPrintPrep={() => notify("Print prep (demo).")}
              onSendToPhone={() => notify("Send to phone (demo).")}
              onAddNote={() => notify("Note saved locally (demo).")}
              onDraftMessage={onAmend}
            />
          ) : null}

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
              {hasMeetingPrepChrome ? "Dismiss" : "Close"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-[color:var(--tomo-mute)]">Agenda sent — participants will receive the prep pack.</p>
      )}
    </div>
  );
}
