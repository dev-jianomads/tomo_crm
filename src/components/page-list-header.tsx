"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type PageListHeaderProps = {
  label: string;
  /** Omitted for title-only headers (Phase 0 copy cleanup). */
  description?: string;
  /** e.g. "View lists →" */
  action?: { href: string; label: string };
  /** Right-aligned actions on the title row (e.g. demo reset + primary CTA). */
  titleRight?: ReactNode;
  /** Filters, search field, buttons—rendered below the description */
  children?: ReactNode;
  /** Wraps the sticky header surface (Relationships v3 uses warm canvas). */
  className?: string;
};

/**
 * List-pane header: uppercase label, optional body copy, optional accent link—matches /workflows.
 */
export function PageListHeader({
  label,
  description,
  action,
  titleRight,
  children,
  className,
}: PageListHeaderProps) {
  const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
  return (
    <div
      className={
        className ??
        "sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white p-4"
      }
      data-testid="page-list-header"
    >
      <div className={`flex items-start gap-3 ${titleRight ? "justify-between" : ""}`}>
        <p
          className="min-w-0 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--tomo-mute)]"
          data-testid={`page-header-title-${labelSlug}`}
        >
          {label}
        </p>
        {titleRight ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">{titleRight}</div> : null}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-gray-600" data-testid="page-header-description">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
          data-testid="page-header-action-link"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
