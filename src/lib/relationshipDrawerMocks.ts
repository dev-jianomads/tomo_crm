import type { Relationship } from "@/lib/mockData";
import { formatRelationshipGeography } from "@/lib/mockData";
import { derivePipelineFlagMock } from "@/lib/todayRaiseStands";
import { formatNurturingEvidenceTouchesPrefix } from "@/lib/touchesInStage";

function hashInt(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1000;
}

/** Mock pipeline_flag_reason headline + body for drawer signal-evidence block */
export function buildSignalEvidence(rel: Relationship): { label: string; body: string } {
  const flag = derivePipelineFlagMock(rel);
  const label =
    flag === "green"
      ? "Pipeline flag · Active engagement detected"
      : flag === "amber"
        ? "Pipeline flag · Watch — cadence drift"
        : "Pipeline flag · Drifting — silence risk";

  const d = rel.daysSinceLastMeaningfulContact;
  const body =
    flag === "green"
      ? `Last meaningful touch was ${d}d ago; momentum is ${rel.momentumDirection.toLowerCase()} with band ${rel.band}. Open loops: ${rel.openLoops}. Next move — ${rel.nextMove.slice(0, 120)}${rel.nextMove.length > 120 ? "…" : ""}`
      : flag === "amber"
        ? `Silence window exceeds typical cadence for ${rel.stage} (${d}d since meaningful touch). Consider a concise update or propose slots — ${rel.nextMove.slice(0, 100)}${rel.nextMove.length > 100 ? "…" : ""}`
        : `Engagement has stalled relative to peers in ${rel.stage}: ${d}d without meaningful touch and band ${rel.band}. Priority reconnect — ${rel.nextMove.slice(0, 100)}${rel.nextMove.length > 100 ? "…" : ""}`;

  const prefix = formatNurturingEvidenceTouchesPrefix(rel);
  const narrative = prefix ? `${prefix}${body}` : body;
  return { label, body: `${narrative} (Demo narrative · replace with lp_signal_log + SLA benchmarks.)` };
}

export function mockDaysInCurrentStage(rel: Relationship): number {
  const base = 10 + (hashInt(rel.id, 11) % 45);
  return Math.min(base + Math.floor(rel.daysSinceLastMeaningfulContact / 14), 120);
}

export function mockDaysInPriorStage(rel: Relationship): { days: number; stageHint: string } {
  const days = 20 + (hashInt(rel.id, 13) % 60);
  const hints = ["First meeting", "Nurturing", "Sourced"];
  return { days, stageHint: hints[hashInt(rel.id, 17) % hints.length]! };
}

export type MockOpenLoopRow = {
  id: string;
  who: "GP" | "LP";
  text: string;
  dueLabel: string;
  overdue?: boolean;
  status: "open" | "fulfilled";
};

/** Deterministic open-loop rows from CRM counters + next move (demo). */
export function buildMockOpenLoopRows(rel: Relationship): MockOpenLoopRow[] {
  const n = Math.min(Math.max(rel.openLoops, 0), 5);
  const rows: MockOpenLoopRow[] = [];
  const templates: MockOpenLoopRow[] = [
    {
      id: "ol1",
      who: "GP",
      text: rel.nextMove || "Define next move",
      dueLabel: "This week",
      status: "open",
    },
    {
      id: "ol2",
      who: "LP",
      text: "Allocator requested DD materials follow-up",
      dueLabel: rel.daysSinceLastMeaningfulContact > 14 ? "Overdue" : "Fri",
      overdue: rel.daysSinceLastMeaningfulContact > 14,
      status: "open",
    },
    {
      id: "ol3",
      who: "GP",
      text: "Confirm IC timeline after strategy session",
      dueLabel: "Next sprint",
      status: rel.openLoops > 2 ? "open" : "fulfilled",
    },
  ];
  for (let i = 0; i < n; i++) rows.push({ ...templates[i % templates.length]!, id: `ol-${rel.id}-${i}` });
  return rows;
}

/** Nine-cell behavioural grid (mock surrogates until lp_behavioural_signals exists). */
export function buildBehaviouralSignals(rel: Relationship) {
  const latency = `${Math.min(72, 12 + (hashInt(rel.id, 19) % 48))}h median`;
  return [
    { name: "Engagement velocity", value: rel.momentumDirection, trend: "flat" as const },
    { name: "Response latency", value: latency, trend: rel.daysSinceLastMeaningfulContact > 21 ? ("decelerating" as const) : ("accelerating" as const) },
    { name: "Meeting cadence", value: rel.lastMeetingDate ? "Scheduled" : "No upcoming", trend: "flat" as const },
    { name: "Material completeness", value: rel.openLoops ? "Gaps" : "Complete", trend: "flat" as const },
    { name: "Commitment signal", value: `${rel.openLoops} open loops`, trend: rel.openLoops > 2 ? ("accelerating" as const) : ("flat" as const) },
    { name: "Consultant path", value: rel.consultantDependent, trend: "flat" as const },
    { name: "Geography fit", value: formatRelationshipGeography(rel), trend: "flat" as const },
    { name: "Ticket posture", value: rel.typicalCheckSize, trend: "flat" as const },
    { name: "ESG posture", value: rel.esgRequired, trend: "flat" as const },
  ];
}

export function pipelineFlagLabel(flag: ReturnType<typeof derivePipelineFlagMock>): string {
  if (flag === "green") return "● Green · Healthy";
  if (flag === "amber") return "● Amber · Watch";
  return "● Red · Drifting";
}
