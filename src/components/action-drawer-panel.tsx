"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ActionItem } from "@/lib/mockData";
import type { TomoAssistance, TomoMessageBlock } from "@/lib/mockTomoAssistance";
import { usePersistentState } from "@/lib/usePersistentState";

export type ActionResolution = "approved" | "later" | "dismissed" | null;

function blockPrimaryDraft(blocks: TomoMessageBlock[] | undefined): Extract<TomoMessageBlock, { kind: "draft" }> | null {
  const d = blocks?.find((b): b is Extract<TomoMessageBlock, { kind: "draft" }> => b.kind === "draft");
  return d ?? null;
}

function blockSnapshot(blocks: TomoMessageBlock[] | undefined): Extract<TomoMessageBlock, { kind: "snapshot" }> | null {
  const s = blocks?.find((b): b is Extract<TomoMessageBlock, { kind: "snapshot" }> => b.kind === "snapshot");
  return s ?? null;
}

export function getActionDrawerDraftPreview(
  action: ActionItem,
  assistance: TomoAssistance | null | undefined
): { leadText: string; draftBody: string | null; draftType?: "email" | "invite"; scheduleHint?: string } {
  const blocks = assistance?.initialMessage.blocks;
  const draft = blockPrimaryDraft(blocks);
  const snap = blockSnapshot(blocks);
  const leadText = assistance?.initialMessage.text?.trim() ?? "";

  if (draft) {
    return {
      leadText,
      draftBody: draft.content,
      draftType: draft.type,
      scheduleHint: action.type === "scheduling" ? extractScheduleHint(leadText) : undefined,
    };
  }
  if (snap) {
    return { leadText, draftBody: snap.text, scheduleHint: undefined };
  }
  if (action.draft) {
    return {
      leadText,
      draftBody: action.draft,
      draftType: "email",
      scheduleHint: action.type === "scheduling" ? extractScheduleHint(leadText) : undefined,
    };
  }
  return { leadText, draftBody: null, scheduleHint: undefined };
}

function extractScheduleHint(lead: string): string | undefined {
  const m = lead.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*ET)/gi);
  if (m?.length) return `Suggested times — ${m.join(", ")}`;
  return undefined;
}

type ActionDrawerPanelProps = {
  action: ActionItem;
  workflowDisplayName: string;
  /** Right-hand pill (matches list card); updates after Approve / Do later */
  verbLabel: string;
  resolution: ActionResolution;
  assistance: TomoAssistance | null | undefined;
  onApprove: () => void;
  onLater: () => void;
  onDismiss: () => void;
  onAmend: () => void;
  /** Scheduling actions only — opens week picker; omitted when not supported. */
  onFindAnotherTime?: () => void;
  /** Primary label for final send (email vs invite vs generic) */
  finalApproveLabel?: string;
};

/**
 * Today action drawer — section 1: card-aligned header, Tomo draft/preview, primary CTAs (scheduling adds Find another time).
 */
export function ActionDrawerPanel({
  action,
  workflowDisplayName,
  verbLabel,
  resolution,
  assistance,
  onApprove,
  onLater,
  onDismiss,
  onAmend,
  onFindAnotherTime,
  finalApproveLabel = "Approve & send",
}: ActionDrawerPanelProps) {
  const [laterConfirmOpen, setLaterConfirmOpen] = useState(false);
  const [dismissConfirmOpen, setDismissConfirmOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [skipDoLaterConfirm, setSkipDoLaterConfirm, persistReady] = usePersistentState<boolean>(
    "tomo-skip-do-later-confirm",
    false,
  );
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (laterConfirmOpen) setDontShowAgain(false);
  }, [laterConfirmOpen]);

  useEffect(() => {
    const modal = dismissConfirmOpen ? "dismiss" : laterConfirmOpen ? "later" : null;
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (modal === "dismiss") setDismissConfirmOpen(false);
        else setLaterConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [laterConfirmOpen, dismissConfirmOpen]);

  const card = action.attentionCard;
  if (!card) {
    return <p className="text-sm text-gray-600">This action has no structured card layout.</p>;
  }

  const preview = getActionDrawerDraftPreview(action, assistance);
  const showCtas = resolution === null;
  const pillIsApproved = verbLabel === "Approved" || resolution === "approved";
  const pillIsDismissed = resolution === "dismissed" || verbLabel === "Dismissed";

  const requestDoLater = () => {
    if (persistReady && skipDoLaterConfirm) {
      onLater();
      return;
    }
    setLaterConfirmOpen(true);
  };

  const laterConfirmModal =
    portalReady && laterConfirmOpen
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Close"
              onClick={() => setLaterConfirmOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="do-later-confirm-title"
              className="relative z-10 w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 id="do-later-confirm-title" className="text-sm font-semibold text-gray-900">
                  Do later?
                </h2>
                <button
                  type="button"
                  onClick={() => setLaterConfirmOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-gray-700">
                  Are you sure? We&apos;ll keep this in Needs your attention with a reminder tomorrow.
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                  />
                  <span>Don&apos;t show this again</span>
                </label>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" className="button-secondary" onClick={() => setLaterConfirmOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => {
                      if (dontShowAgain) setSkipDoLaterConfirm(true);
                      setLaterConfirmOpen(false);
                      onLater();
                    }}
                  >
                    Do later
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const dismissConfirmModal =
    portalReady && dismissConfirmOpen
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Close"
              onClick={() => setDismissConfirmOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dismiss-confirm-title"
              className="relative z-10 w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 id="dismiss-confirm-title" className="text-sm font-semibold text-gray-900">
                  Dismiss task?
                </h2>
                <button
                  type="button"
                  onClick={() => setDismissConfirmOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-gray-700">
                  Are you sure? This removes the task permanently from What Needs Your Attention.
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" className="button-secondary" onClick={() => setDismissConfirmOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50"
                    onClick={() => {
                      setDismissConfirmOpen(false);
                      onDismiss();
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold accent-title">
            {card.company} : {card.contactName}
          </p>
          <span
            className={
              pillIsDismissed
                ? "inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
                : pillIsApproved
                  ? "inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800"
                  : "inline-flex shrink-0 items-center rounded-full border border-[color:var(--peach)] bg-[color:var(--peach-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--peach-ink)]"
            }
          >
            {verbLabel}
          </span>
        </div>
        <p className="text-xs leading-snug text-gray-600">
          <span className="font-medium text-gray-700">Action required:</span> {card.workKind}: {card.workSubject}
        </p>
        <p className="text-[11px] leading-snug text-[color:var(--peach-ink)]">
          <span className="font-medium text-gray-600">Workflow:</span> {workflowDisplayName}
        </p>
        {action.emailSourceUrl ? (
          <a
            href={action.emailSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[11px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            Open email
          </a>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Tomo</p>
        {preview.leadText ? <p className="text-sm leading-relaxed text-gray-900">{preview.leadText}</p> : null}

        {preview.draftBody ? (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--accent)]">Drafted by Tomo</span>
              <span className="text-[11px] text-gray-500">{preview.draftType === "invite" ? "Invite" : "Email"}</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{preview.draftBody}</p>
          </div>
        ) : null}

        {preview.scheduleHint ? (
          <p className="rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-1.5 text-xs text-blue-950">{preview.scheduleHint}</p>
        ) : null}
      </div>

      {showCtas ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-primary tomo-ai-bg min-w-[7rem]" onClick={onApprove}>
            {finalApproveLabel}
          </button>
          <button type="button" className="button-secondary" onClick={onAmend}>
            Amend
          </button>
          {onFindAnotherTime ? (
            <button type="button" className="button-secondary" onClick={onFindAnotherTime}>
              Find another time
            </button>
          ) : null}
          <button type="button" className="button-secondary" onClick={requestDoLater}>
            Do later
          </button>
          <button
            type="button"
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50"
            onClick={() => setDismissConfirmOpen(true)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          {resolution === "approved"
            ? "Approved — Tomo will proceed with this action."
            : resolution === "dismissed"
              ? "This task was removed from What needs your attention."
              : "Deferred — you can revisit this card from the list."}
        </p>
      )}
      {laterConfirmModal}
      {dismissConfirmModal}
    </div>
  );
}
