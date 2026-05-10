"use client";

import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  DocumentIcon,
  TableCellsIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import type {
  ActivityLogEntry,
  DrawerCommitmentLine,
  DrawerLastTouchParagraph,
  DrawerPrepAttendee,
  DrawerPrepFocusItem,
  DrawerPrepMaterial,
} from "@/lib/mockData";

/** design/tomo_drawer_meetingprep_light_v3.html — canvas band under title */
export function MeetingPrepTimeStrip({
  rangeLabel,
  whereLabel,
  calendarUrl,
  joinUrl,
}: {
  rangeLabel: string;
  whereLabel?: string;
  calendarUrl?: string;
  joinUrl?: string;
}) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-3.5 py-3 dark:bg-[color:var(--tomo-navy-soft)]">
      <span className="font-mono text-xs font-medium tracking-wide text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
        {rangeLabel}
      </span>
      {whereLabel ? (
        <>
          <span className="text-[color:var(--tomo-mute)]">·</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--tomo-body)]">
            <VideoCameraIcon className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden />
            {whereLabel}
          </span>
        </>
      ) : null}
      <span className="min-w-[1rem] flex-1" />
      {calendarUrl ? (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--tomo-mute)] transition-colors hover:text-[color:var(--tomo-teal)]"
        >
          Open in calendar
        </a>
      ) : null}
      {joinUrl ? (
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--tomo-teal)] transition-colors hover:underline"
        >
          Join meeting
        </a>
      ) : null}
    </div>
  );
}

function PrepSectionLabel({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">{children}</p>
  );
}

export function DrawerPrepAttendeesBlock({ label, attendees }: { label: string; attendees: DrawerPrepAttendee[] }) {
  if (!attendees.length) return null;
  return (
    <div className="space-y-2.5">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]">
        {attendees.map((a) => (
          <div
            key={a.name}
            className="grid grid-cols-[36px_1fr_auto] items-start gap-3.5 border-b border-[color:var(--tomo-rule-soft)] px-3.5 py-3 last:border-b-0"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--tomo-navy-soft)] text-[11px] font-semibold text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
              {a.initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
                {a.name}
                {a.role ? <span className="font-normal text-[color:var(--tomo-body)]"> — {a.role}</span> : null}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--tomo-body)]">{a.context}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
              {a.linkedInUrl ? (
                <a
                  href={a.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-teal)]"
                >
                  LinkedIn
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderLastTouchParagraph(p: DrawerLastTouchParagraph, i: number) {
  return (
    <p key={i} className="text-[13px] leading-relaxed text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)] last:mb-0 mb-2.5">
      {p.segments.map((s, j) =>
        s.kind === "quote" ? (
          <span key={j} className="italic text-[color:var(--tomo-mute)]">
            &ldquo;{s.text}&rdquo;
          </span>
        ) : (
          <span key={j}>{s.text}</span>
        )
      )}
    </p>
  );
}

export function DrawerLastTouchBlock({ label, paragraphs }: { label: string; paragraphs: DrawerLastTouchParagraph[] }) {
  if (!paragraphs.length) return null;
  return (
    <div className="space-y-2.5">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="rounded-r-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] border-l-[3px] border-l-[color:var(--tomo-navy)] bg-[color:var(--tomo-card)] px-4 py-3.5 dark:border-l-[color:var(--tomo-body)]">
        {paragraphs.map((p, i) => renderLastTouchParagraph(p, i))}
      </div>
    </div>
  );
}

const prepStateClass: Record<NonNullable<DrawerCommitmentLine["prepState"]>, string> = {
  delivered: "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]",
  for_today: "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]",
  queued: "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]",
  open: "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]",
};

const prepStateLabel: Record<NonNullable<DrawerCommitmentLine["prepState"]>, string> = {
  delivered: "Delivered",
  for_today: "For today",
  queued: "Queued",
  open: "Open",
};

export function DrawerOpenCommitmentsPrepBlock({ label, rows }: { label: string; rows: DrawerCommitmentLine[] }) {
  const rich = rows.some((r) => r.source || r.prepState);
  if (!rows.length) return null;

  if (!rich) {
    return (
      <div className="space-y-2">
        <PrepSectionLabel>{label}</PrepSectionLabel>
        <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-3 py-2 dark:bg-[color:var(--tomo-navy-soft)]">
          <ul className="divide-y divide-dashed divide-[color:var(--tomo-rule)]">
            {rows.map((row) => (
              <li key={row.label} className="flex items-start justify-between gap-3 py-1.5 text-sm first:pt-0 last:pb-0">
                <span className="min-w-0 text-[color:var(--foreground)]">{row.label}</span>
                {row.badge ? (
                  <span className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-status-amber-text)]">
                    {row.badge}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 items-center gap-3 border-b border-[color:var(--tomo-rule-soft)] px-3.5 py-3 text-[13px] last:border-b-0 sm:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0 leading-snug text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
              {row.label}
              {row.source ? <span className="mt-0.5 block text-[11px] text-[color:var(--tomo-mute)]">{row.source}</span> : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              {row.prepState ? (
                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${prepStateClass[row.prepState]}`}
                >
                  {prepStateLabel[row.prepState]}
                </span>
              ) : row.badge ? (
                <span className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-status-amber-text)]">
                  {row.badge}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DrawerSuggestedFocusBlock({ label, items }: { label: string; items: DrawerPrepFocusItem[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="flex flex-col">
        {items.map((item) => (
          <div
            key={item.num}
            className="grid grid-cols-[24px_1fr] gap-3 border-b border-[color:var(--tomo-rule-soft)] py-2 text-[13px] leading-snug last:border-b-0"
          >
            <span className="pt-0.5 font-mono text-[11px] font-medium text-[color:var(--tomo-teal)]">{item.num}</span>
            <div className="text-[color:var(--tomo-body)]">
              <strong className="font-medium text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{item.lead}</strong>{" "}
              {item.rest}
              {item.evidence ? (
                <span className="font-medium text-[color:var(--tomo-teal)]"> {item.evidence}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("xls") || lower.includes("sheet")) {
    return <TableCellsIcon className="h-5 w-5 text-[color:var(--tomo-mute)]" aria-hidden />;
  }
  return <DocumentIcon className="h-5 w-5 text-[color:var(--tomo-mute)]" aria-hidden />;
}

export function DrawerPrepMaterialsBlock({ label, materials }: { label: string; materials: DrawerPrepMaterial[] }) {
  if (!materials.length) return null;
  return (
    <div className="space-y-2.5">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]">
        {materials.map((m) => {
          const isInternal = m.href.startsWith("/");
          const linkCls =
            "inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-teal)] hover:underline";
          const open = isInternal ? (
            <Link href={m.href} className={linkCls}>
              Open <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden />
            </Link>
          ) : (
            <a href={m.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
              Open <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden />
            </a>
          );
          return (
            <div
              key={m.name}
              className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-[color:var(--tomo-rule-soft)] px-3.5 py-2.5 text-[13px] last:border-b-0"
            >
              <MaterialIcon name={m.name} />
              <div className="min-w-0">
                <p className="font-medium text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">{m.name}</p>
                <p className="text-[11px] text-[color:var(--tomo-mute)]">{m.meta}</p>
              </div>
              {open}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DrawerPrepActivityPreview({
  label,
  entries,
  historyTotal,
  onViewFullHistory,
}: {
  label: string;
  entries: ActivityLogEntry[];
  historyTotal?: number;
  onViewFullHistory?: () => void;
}) {
  const rows = entries.slice(0, 5);
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <PrepSectionLabel>{label}</PrepSectionLabel>
      <div className="flex flex-col">
        {rows.map((entry, i) => {
          const isTomo = entry.actor === "TOMO";
          return (
            <div
              key={entry.id ?? `prev-${i}`}
              className="grid grid-cols-[24px_1fr_auto] gap-3 border-b border-[color:var(--tomo-rule-soft)] py-2.5 last:border-b-0"
            >
              <div
                className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[var(--tomo-radius-sm)] ${
                  isTomo ? "bg-[color:var(--tomo-teal-tint)] text-[color:var(--tomo-teal)]" : "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]"
                }`}
              >
                {isTomo ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 21l-4.35-4.35" />
                    <circle cx="11" cy="11" r="8" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] leading-snug text-[color:var(--tomo-navy)] dark:text-[color:var(--foreground)]">
                  <span
                    className={
                      isTomo
                        ? "mr-1.5 inline align-middle rounded-sm bg-[color:var(--tomo-teal-tint)] px-1 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-teal)]"
                        : "mr-1.5 inline align-middle rounded-sm bg-[color:var(--tomo-navy-soft)] px-1 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--foreground)]"
                    }
                  >
                    {isTomo ? "Tomo" : "GP"}
                  </span>
                  {entry.summary}
                </p>
                {entry.detail ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--tomo-body)]">
                    {entry.detail.includes('"') ? (
                      <span className="italic text-[color:var(--tomo-mute)]">{entry.detail}</span>
                    ) : (
                      entry.detail
                    )}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-right font-mono text-[10px] leading-snug tracking-wide text-[color:var(--tomo-mute)]">
                {entry.ts}
              </span>
            </div>
          );
        })}
      </div>
      {onViewFullHistory ? (
        <button
          type="button"
          onClick={onViewFullHistory}
          className="mt-1 text-left text-xs text-[color:var(--tomo-mute)] transition-colors hover:text-[color:var(--tomo-teal)]"
        >
          View full history
          {historyTotal != null ? ` (${historyTotal} entries)` : ""} →
        </button>
      ) : null}
    </div>
  );
}

export function DrawerPrepActionBar({
  onMarkReviewed,
  onPrintPrep,
  onSendToPhone,
  onAddNote,
  onDraftMessage,
}: {
  onMarkReviewed: () => void;
  onPrintPrep: () => void;
  onSendToPhone: () => void;
  onAddNote: () => void;
  onDraftMessage: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-3.5 py-3.5 dark:bg-[color:var(--tomo-navy-soft)]">
      <button
        type="button"
        onClick={onMarkReviewed}
        className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] bg-[color:var(--tomo-teal)] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[color:var(--tomo-teal-muted)]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Mark as reviewed
        <span className="font-mono text-[10px] opacity-80">R</span>
      </button>
      <button
        type="button"
        onClick={onPrintPrep}
        className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--tomo-navy)] transition-colors hover:border-[color:var(--tomo-navy)] hover:bg-[color:var(--tomo-canvas)] dark:text-[color:var(--foreground)]"
      >
        Print prep
      </button>
      <button
        type="button"
        onClick={onSendToPhone}
        className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--tomo-navy)] transition-colors hover:border-[color:var(--tomo-navy)] hover:bg-[color:var(--tomo-canvas)] dark:text-[color:var(--foreground)]"
      >
        Send to phone
      </button>
      <button
        type="button"
        onClick={onAddNote}
        className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--tomo-navy)] transition-colors hover:border-[color:var(--tomo-navy)] hover:bg-[color:var(--tomo-canvas)] dark:text-[color:var(--foreground)]"
      >
        Add my own note
      </button>
      <button
        type="button"
        onClick={onDraftMessage}
        className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--tomo-navy)] transition-colors hover:border-[color:var(--tomo-navy)] hover:bg-[color:var(--tomo-canvas)] dark:text-[color:var(--foreground)]"
      >
        Draft message before call
      </button>
    </div>
  );
}
