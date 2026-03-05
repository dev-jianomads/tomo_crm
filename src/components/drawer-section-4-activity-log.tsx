"use client";

export type ActivityLogEntry = {
  id?: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
};

/**
 * Section 4: Activity log at bottom of drawer.
 * Shows entity-specific past activity (ts, actor, summary).
 */
export function DrawerSection4ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  if (!entries.length) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-gray-50/80 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Activity log</p>
      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
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
  );
}
