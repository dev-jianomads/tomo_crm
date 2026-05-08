"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export type ActivityLogEntry = {
  id?: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
};

function displayActor(actor: ActivityLogEntry["actor"]) {
  if (actor === "User") return "GP";
  return actor;
}

/**
 * Section 3: Activity log at bottom of drawer.
 * Accordion — collapsed by default to free vertical space for other sections.
 */
export function DrawerSection3ActivityLog({
  entries,
  defaultExpanded = false,
}: {
  entries: ActivityLogEntry[];
  /** When false (default), only the header row is visible until expanded. */
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const display = entries.slice(0, 5);
  if (!display.length) return null;

  return (
    <div className="shrink-0 border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] dark:bg-[color:var(--tomo-canvas)]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[color:var(--tomo-navy-soft)] dark:hover:bg-[color:var(--tomo-card)]"
        aria-expanded={expanded}
        aria-controls="activity-log-content"
      >
        <p className="tomo-field-label text-[11px] tracking-wide">
          Activity log {entries.length > 5 ? "(5 most recent)" : ""}
        </p>
        <span className="text-[color:var(--tomo-mute)]">
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
        <div className="max-h-32 space-y-2 overflow-y-auto px-4 pb-3 pt-0">
          {display.map((entry, i) => (
            <div
              key={entry.id ?? `log-${i}`}
              className="flex items-start justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[color:var(--foreground)]">{entry.summary}</p>
                <span className="text-[11px] text-[color:var(--tomo-mute)]">{displayActor(entry.actor)}</span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] text-[color:var(--tomo-mute)]">{entry.ts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
