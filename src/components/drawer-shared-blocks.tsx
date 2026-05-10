"use client";

import Link from "next/link";
import { EnvelopeIcon, CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import type {
  DrawerCommitmentLine,
  DrawerSpecHeader,
  DrawerSpecHeaderLink,
  DrawerSpecHeaderPill,
} from "@/lib/mockData";

/**
 * Shared “spec” blocks for Today action + commitment drawers — static copy from mock data.
 * Optional fields keep existing drawers unchanged when omitted.
 */

function SpecHeaderIcon({ link }: { link: DrawerSpecHeaderLink }) {
  const cls = "h-2.5 w-2.5 shrink-0 opacity-60";
  switch (link.icon) {
    case "envelope":
      return <EnvelopeIcon className={cls} aria-hidden />;
    case "calendar":
      return <CalendarIcon className={cls} aria-hidden />;
    case "clock":
      return <ClockIcon className={cls} aria-hidden />;
    case "linkedin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
          <path d="M22 21V11a4 4 0 0 0-4-4h-1" />
          <path d="M14 21v-7a4 4 0 0 0-4-4h-1" />
        </svg>
      );
    default:
      return null;
  }
}

const pillToneClass: Record<DrawerSpecHeaderPill["tone"], string> = {
  red: "bg-[color:var(--tomo-red-bg)] text-[color:var(--tomo-red)]",
  amber: "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]",
  teal: "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]",
  navy: "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)] dark:text-[color:var(--tomo-body)]",
};

const dotToneClass: Record<DrawerSpecHeaderPill["tone"], string> = {
  red: "bg-[color:var(--tomo-red)]",
  amber: "bg-[color:var(--tomo-status-amber)]",
  teal: "bg-[color:var(--tomo-teal)]",
  navy: "bg-[color:var(--tomo-navy)] dark:bg-[color:var(--tomo-body)]",
};

/**
 * design/tomo_drawer_draft_light_v3.html — drawer-head + status-strip + Esc
 */
export function DrawerSpecV3Head({
  eyebrow,
  title,
  titleId,
  subtitle,
  spec,
  onClose,
  extraPills,
}: {
  eyebrow: string;
  title: string;
  titleId?: string;
  subtitle?: string;
  spec: DrawerSpecHeader;
  onClose: () => void;
  /** Appended after spec.statusPills (e.g. Approved / Dismissed) */
  extraPills?: DrawerSpecHeaderPill[];
}) {
  const pills = [...spec.statusPills, ...(extraPills ?? [])];
  const links = spec.links ?? [];

  return (
    <header className="border-b border-[color:var(--tomo-rule-soft)] pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
            {eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-2 text-[1.35rem] font-medium leading-snug tracking-tight text-[color:var(--tomo-navy)] [font-family:var(--font-newsreader,serif)] dark:text-[color:var(--foreground)]"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--tomo-body)]">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-transparent px-2.5 py-1 font-mono text-[11px] text-[color:var(--tomo-mute)] transition-colors hover:border-[color:var(--tomo-navy)] hover:text-[color:var(--tomo-navy)] dark:hover:text-[color:var(--foreground)]"
          aria-label="Close drawer"
        >
          Esc
        </button>
      </div>

      {pills.length > 0 || links.length > 0 ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {pills.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-1.5 rounded-[var(--tomo-radius-sm)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] ${pillToneClass[p.tone]}`}
            >
              <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${dotToneClass[p.tone]}`} aria-hidden />
              {p.label}
            </span>
          ))}
          {links.map((link) => {
            const isInternal = link.href.startsWith("/");
            const className =
              "inline-flex items-center gap-1 text-xs text-[color:var(--tomo-mute)] transition-colors hover:text-[color:var(--tomo-teal)]";
            const inner = (
              <>
                <SpecHeaderIcon link={link} />
                {link.label}
              </>
            );
            return isInternal ? (
              <Link key={link.label} href={link.href} className={className}>
                {inner}
              </Link>
            ) : (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {inner}
              </a>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}

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
