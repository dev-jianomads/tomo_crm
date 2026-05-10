import { mandateFitTableLabel, type Relationship } from "@/lib/mockData";

function csvEscape(cell: string): string {
  const s = cell.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Client-side CSV for list membership (Story 8.6.5 — mock / demo). */
export function downloadListMembersCsv(pipelineName: string, members: Relationship[]): void {
  const header = [
    "Name",
    "Firm",
    "Stage",
    "Tier",
    "Mandate fit",
    "Days since meaningful contact",
    "Expected commitment",
  ];
  const lines = [
    header.map(csvEscape).join(","),
    ...members.map((r) =>
      [
        r.name,
        r.firm,
        r.stage,
        r.tier,
        mandateFitTableLabel(r.strategyFit),
        String(r.daysSinceLastMeaningfulContact),
        r.typicalCheckSize,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];
  const csv = lines.join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base = pipelineName.replace(/[^\w\-\s]/g, "").trim().replace(/\s+/g, "_") || "list";
  a.href = url;
  a.download = `${base}_lps.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
