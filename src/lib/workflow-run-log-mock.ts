/**
 * Mock last-run history for workflow drawer (demo; not persisted).
 * One stable set of up to 5 rows per workflow row id (deterministic hash).
 */

export type WorkflowRunLogEntry = {
  id: string;
  /** Display string, e.g. "Today 06:40" */
  triggeredAt: string;
  /** List / audience this run targeted */
  listLabel: string;
  lpsTouched: number;
  draftsGenerated: number;
  draftsApproved: number;
  lpsSuppressed: number;
};

const DATE_LABELS = [
  "Today 06:40",
  "Yesterday 14:12",
  "Fri 10 Jan 2026 08:05",
  "Thu 9 Jan 2026 16:22",
  "Wed 8 Jan 2026 11:30",
];

function hashToUint(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Up to 5 mock runs for compliance / UX (“when did it run, who did it touch?”).
 */
export function getMockWorkflowRunLog(
  workflowRowId: string,
  opts: { listName: string | null; isGlobalWorkflow: boolean }
): WorkflowRunLogEntry[] {
  const h = hashToUint(workflowRowId);
  const baseList =
    opts.isGlobalWorkflow
      ? "Global — recipients chosen at send"
      : opts.listName?.trim() || "Linked list";

  const rows: WorkflowRunLogEntry[] = [];
  for (let i = 0; i < 5; i++) {
    const seed = (h + i * 1103515245) >>> 0;
    const lpsTouched = 3 + (seed % 18);
    const draftsGenerated = Math.max(1, Math.min(lpsTouched, 2 + (seed % 12)));
    const draftsApproved = Math.max(0, Math.min(draftsGenerated, (seed >> 3) % (draftsGenerated + 1)));
    const lpsSuppressed = Math.min(lpsTouched, (seed >> 7) % 4);

    rows.push({
      id: `wrun-${workflowRowId}-${i}`,
      triggeredAt: DATE_LABELS[i] ?? `Run ${i + 1}`,
      listLabel: i === 0 ? baseList : baseList,
      lpsTouched,
      draftsGenerated,
      draftsApproved,
      lpsSuppressed,
    });
  }
  return rows;
}
