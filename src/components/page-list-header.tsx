"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type PageListHeaderProps = {
  label: string;
  description: string;
  /** e.g. "View pipelines →" */
  action?: { href: string; label: string };
  /** Filters, search field, buttons—rendered below the description */
  children?: ReactNode;
};

/**
 * List-pane header: uppercase label, body copy, optional accent link—matches /workflows.
 */
export function PageListHeader({ label, description, action, children }: PageListHeaderProps) {
  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {children ? <div className="mt-3">{children}</div> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
