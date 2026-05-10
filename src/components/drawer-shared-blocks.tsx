"use client";

import type { DrawerCommitmentLine } from "@/lib/mockData";

/**
 * Shared “spec” blocks for Today action + commitment drawers — static copy from mock data.
 * Optional fields keep existing drawers unchanged when omitted.
 */

export function DrawerWhySurfaced({
  body,
  stamp,
}: {
  body: string;
  stamp?: string;
}) {
  return (
    <div className="rounded-r-[var(--tomo-radius-md)] border-l-[3px] border-[color:var(--tomo-teal)] bg-[color:var(--tomo-canvas)] px-3 py-2.5 dark:bg-[color:var(--tomo-navy-soft)]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--tomo-teal)]">Why this is here</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--foreground)]">{body}</p>
      {stamp ? (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-wide text-[color:var(--tomo-mute)]">{stamp}</p>
      ) : null}
    </div>
  );
}

export function DrawerDraftMeta({
  to,
  ccPlaceholder,
  subject,
  footnote,
}: {
  to?: string;
  ccPlaceholder?: string;
  subject?: string;
  footnote?: string;
}) {
  if (!to && !subject && !ccPlaceholder && !footnote) return null;
  return (
    <div className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card-warm)] px-3 py-2 text-xs dark:bg-[color:var(--tomo-navy-soft)]">
      <dl className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1">
        {to ? (
          <>
            <dt className="font-medium text-[color:var(--tomo-mute)]">To</dt>
            <dd className="text-[color:var(--foreground)]">
              <span className="inline-block rounded-xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-2 py-0.5 text-xs">
                {to}
              </span>
            </dd>
          </>
        ) : null}
        {ccPlaceholder !== undefined ? (
          <>
            <dt className="font-medium text-[color:var(--tomo-mute)]">Cc</dt>
            <dd className="text-[color:var(--tomo-mute)]">{ccPlaceholder || "— add recipients"}</dd>
          </>
        ) : null}
        {subject ? (
          <>
            <dt className="font-medium text-[color:var(--tomo-mute)]">Subject</dt>
            <dd className="font-medium text-[color:var(--foreground)]">{subject}</dd>
          </>
        ) : null}
      </dl>
      {footnote ? (
        <p className="mt-2 border-t border-[color:var(--tomo-rule-soft)] pt-2 text-right font-mono text-[9px] uppercase tracking-wide text-[color:var(--tomo-mute)]">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

export function DrawerCommitmentsCaptured({ items }: { items: DrawerCommitmentLine[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="tomo-field-label text-[11px] tracking-wide">Commitments captured</p>
      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-3 py-2 dark:bg-[color:var(--tomo-navy-soft)]">
        <ul className="divide-y divide-dashed divide-[color:var(--tomo-rule)]">
          {items.map((row) => (
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
