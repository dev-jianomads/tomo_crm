"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export type ActivityLogEntry = {
  id?: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
  /** Second line — quotes, metrics, or extra context */
  detail?: string;
};

function ActorBadge({ actor }: { actor: ActivityLogEntry["actor"] }) {
  const isTomo = actor === "TOMO";
  return (
    <span
      className={
        isTomo
          ? "mr-1.5 inline align-middle font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-tint)] px-1 py-0.5 rounded-sm"
          : "mr-1.5 inline align-middle font-mono text-[10px] font-medium uppercase tracking-wide text-[color:var(--foreground)] bg-[color:var(--tomo-navy-soft)] px-1 py-0.5 rounded-sm dark:bg-[color:var(--tomo-card-warm)]"
      }
    >
      {isTomo ? "Tomo" : "GP"}
    </span>
  );
}

/**
 * Section 3: Activity log at bottom of drawer.
 * Accordion — collapsed by default to free vertical space for other sections.
 */
export function DrawerSection3ActivityLog({
  entries,
  defaultExpanded = false,
  expandSignal,
  variant = "default",
}: {
  entries: ActivityLogEntry[];
  /** When false (default), only the header row is visible until expanded. */
  defaultExpanded?: boolean;
  /** Increment (e.g. from parent state) to expand programmatically — meeting prep “View full history”. */
  expandSignal?: number;
  /** `relationships` — marker column layout per `tomo_relationships_lp_drawer_v2.html`. */
  variant?: "default" | "relationships";
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (expandSignal != null && expandSignal > 0) setExpanded(true);
  }, [expandSignal]);

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
          Recent activity {entries.length > 5 ? "(5 most recent)" : ""}
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
          expanded ? "max-h-[min(22rem,55vh)]" : "max-h-0"
        }`}
      >
        <div className="max-h-[min(20rem,50vh)] space-y-3 overflow-y-auto px-4 pb-3 pt-0">
          {display.map((entry, i) =>
            variant === "relationships" ? (
              <div
                key={entry.id ?? `log-${i}`}
                className="grid grid-cols-[24px_1fr_auto] gap-3 border-b border-[color:var(--tomo-rule-soft)] pb-3 last:border-b-0 last:pb-0"
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${
                    entry.actor === "TOMO"
                      ? "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]"
                      : "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)]"
                  }`}
                  aria-hidden
                >
                  {entry.actor === "TOMO" ? "AI" : "GP"}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-[color:var(--tomo-navy)]">{entry.summary}</p>
                  {entry.detail ? (
                    <p className="mt-1 text-[11px] leading-relaxed italic text-[color:var(--tomo-body)]">{entry.detail}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--tomo-teal)]">
                    {entry.actor === "TOMO" ? "Tomo" : "GP"}
                  </p>
                </div>
                <span className="shrink-0 whitespace-pre-line text-right font-mono text-[11px] leading-snug tabular-nums text-[color:var(--tomo-mute)]">
                  {entry.ts}
                </span>
              </div>
            ) : (
              <div
                key={entry.id ?? `log-${i}`}
                className="flex items-start justify-between gap-3 border-b border-[color:var(--tomo-rule-soft)] pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-[color:var(--foreground)]">
                    <ActorBadge actor={entry.actor} />
                    {entry.summary}
                  </p>
                  {entry.detail ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--tomo-body)]">
                      <span className="italic text-[color:var(--tomo-mute)]">{entry.detail}</span>
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 whitespace-pre-line text-right font-mono text-[10px] leading-snug text-[color:var(--tomo-mute)]">
                  {entry.ts}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
