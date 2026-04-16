"use client";

import type { ActionItem } from "@/lib/mockData";
import type { TomoAssistance, TomoMessageBlock } from "@/lib/mockTomoAssistance";

export type ActionResolution = "approved" | "later" | null;

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
  onAmend,
  onFindAnotherTime,
  finalApproveLabel = "Approve & send",
}: ActionDrawerPanelProps) {
  const card = action.attentionCard;
  if (!card) {
    return <p className="text-sm text-gray-600">This action has no structured card layout.</p>;
  }

  const preview = getActionDrawerDraftPreview(action, assistance);
  const showCtas = resolution === null;
  const pillIsApproved = verbLabel === "Approved" || resolution === "approved";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold accent-title">
            {card.company} : {card.contactName}
          </p>
          <span
            className={
              pillIsApproved
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
          <button type="button" className="button-secondary" onClick={onLater}>
            Do later
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          {resolution === "approved"
            ? "Approved — Tomo will proceed with this action."
            : "Deferred — you can revisit this card from the list."}
        </p>
      )}
    </div>
  );
}
