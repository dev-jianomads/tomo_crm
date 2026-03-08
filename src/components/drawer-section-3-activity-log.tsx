"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export type ActivityLogEntry = {
  id?: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
};

/**
 * Section 3: Activity log at bottom of drawer.
 * Accordion — collapsed by default to free vertical space for other sections.
 */
export function DrawerSection3ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!entries.length) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-gray-50/80">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100/80 transition-colors"
        aria-expanded={expanded}
        aria-controls="activity-log-content"
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Activity log</p>
        <span className="text-gray-400">
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-4 w-4 -rotate-90" aria-hidden />
          )}
        </span>
      </button>
      <div
        id="activity-log-content"
        role="region"
        aria-label="Activity log entries"
        className={`overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "max-h-40" : "max-h-0"
        }`}
      >
        <div className="space-y-2 overflow-y-auto px-4 pb-3 pt-0 max-h-32">
          {entries.map((entry, i) => (
            <div
              key={entry.id ?? `log-${i}`}
              className="flex items-start justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-gray-900">{entry.summary}</p>
                <span className="text-[11px] text-gray-500">{entry.actor}</span>
              </div>
              <span className="text-[11px] text-gray-500 whitespace-nowrap shrink-0">{entry.ts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
