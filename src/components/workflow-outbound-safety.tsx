"use client";

/**
 * Phase 1 — Workflow outbound guardrails (demo + trust).
 * Runtime dedupe, overlap warning, and suppression log are mock-computed from audience size.
 */

type SuppressionEntry = { at: string; lp: string; reason: string };

function mockDedupedCount(raw: number): { unique: number; removed: number } {
  if (raw <= 0) return { unique: 0, removed: 0 };
  const removed = raw >= 8 ? 3 : raw >= 4 ? 2 : raw >= 2 ? 1 : 0;
  return { unique: Math.max(1, raw - removed), removed };
}

function mockSuppressionRows(count: number): SuppressionEntry[] {
  const base: SuppressionEntry[] = [
    { at: "Today 06:12", lp: "Oakmont FoF", reason: "Duplicate thread — prior send in last 24h" },
    { at: "Today 06:40", lp: "Meridian Capital", reason: "LP unsubscribe signal (marketing)" },
    { at: "Yesterday 18:05", lp: "Redstone Partners", reason: "Quiet hours — rescheduled to 08:00 ET" },
  ];
  return count >= 6 ? base : count >= 2 ? base.slice(0, 2) : base.slice(0, 1);
}

export function WorkflowOutboundSafety({
  relationshipCount,
  audienceLabel = "list",
}: {
  relationshipCount: number;
  /** "list" or "pipeline" — copy aligns with Lists rename */
  audienceLabel?: string;
}) {
  const { unique, removed } = mockDedupedCount(relationshipCount);
  const overlap =
    relationshipCount >= 6
      ? "Another enabled workflow already sent to 3 overlapping LPs in the last 24h. Review before enabling sends."
      : null;
  const rows = mockSuppressionRows(relationshipCount);

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Outbound safety</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs text-gray-800">
          <p className="font-semibold text-gray-900">LP deduplication</p>
          <p className="mt-0.5 text-gray-600">
            <span className="font-medium text-gray-900">{unique} unique LPs</span>
            {removed > 0 ? (
              <>
                {" "}
                after removing {removed} duplicate address{removed === 1 ? "" : "es"} across this {audienceLabel}{" "}
                audience.
              </>
            ) : (
              <> — no duplicates detected for this run.</>
            )}
          </p>
        </div>
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            overlap
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-green-100 bg-green-50/80 text-green-900"
          }`}
        >
          <p className="font-semibold">{overlap ? "Overlap warning" : "No overlap flagged"}</p>
          <p className="mt-0.5">
            {overlap ?? "No other active workflow is scheduled for the same LP cohort in this window."}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-[11px] font-medium text-gray-700">Suppression log</p>
        <ul className="mt-1 space-y-1.5">
          {rows.map((row) => (
            <li
              key={`${row.at}-${row.lp}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-gray-100 bg-white px-2 py-1.5 text-[11px] text-gray-700"
            >
              <span className="shrink-0 text-gray-500">{row.at}</span>
              <span className="font-medium text-gray-900">{row.lp}</span>
              <span className="min-w-0 text-gray-600">— {row.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
