/**
 * Mock data for the hedge fund IR “system of motion”.
 * Keep shapes lean and purpose-built for the new IA.
 */

export type MomentumTrend = "up" | "flat" | "down";
export type Velocity = "Fast" | "Moderate" | "Slow";

export type Relationship = {
  id: string;
  name: string;
  firm: string;
  momentumScore: number;
  momentumTrend: MomentumTrend;
  velocity: Velocity;
  lastInteraction: string;
  nextMove: string;
  openLoops: number;
  band: "Heating Up" | "Active-Stable" | "Cooling" | "Stalled";
};

export type ActionStatus = "approval" | "in_progress" | "blocked";

export type MomentumShift = {
  band: "Heating" | "Cooling" | "Stalled" | "Stable";
  delta: number;
};

export type FlowBand = "Heating" | "Active" | "Cooling" | "Stalled";

export type FlowSummary = {
  band: FlowBand;
  delta: number; // net change vs yesterday
  names: string[]; // top LPs in this band
};

export type HealthMetricTier = "A" | "B";

export type HealthMetric = {
  id: string;
  label: string;
  value: string;
  trend?: string;
  description: string;
  tier: HealthMetricTier;
  showIfStageData?: boolean;
};

export type ActionItem = {
  id: string;
  title: string;
  status: ActionStatus;
  trigger: string;
  evidence: string[];
  type: "outreach" | "scheduling" | "crm_update" | "follow_up";
  suggestedUpdates?: string[];
  draft?: string;
  autoApproveType?: boolean; // UI preference only (mock)
  activityLog: { id: string; ts: string; actor: "TOMO" | "User"; summary: string }[];
};

export type Commitment = {
  id: string;
  title: string;
  datetime: string;
  lp: string;
  briefId?: string;
  window: "next72h" | "today";
};

export type Brief = {
  id: string;
  meetingTitle: string;
  lp: string;
  datetime: string;
  status: "Ready" | "Updated";
  openLoops: number;
  summary: string;
  agenda: string[];
  commitments: string[];
};

export type Material = {
  id: string;
  name: string;
  type: "Deck" | "Update" | "Report" | "Data Room";
  version: string;
  date: string;
  engagement: "High" | "Mixed" | "Ignored";
  momentumImpact: MomentumTrend;
  followUpSignal: string;
};

export type ActivityLogEntry = {
  id: string;
  ts: string;
  actor: "TOMO" | "User";
  summary: string;
};

export const relationships: Relationship[] = [
  {
    id: "r1",
    name: "Alex Morgan",
    firm: "Northwind Capital",
    momentumScore: 82,
    momentumTrend: "up",
    velocity: "Fast",
    lastInteraction: "3d ago (call)",
    nextMove: "Share Q4 performance deck",
    openLoops: 2,
    band: "Heating Up",
  },
  {
    id: "r2",
    name: "Jamie Chen",
    firm: "Peakline Partners",
    momentumScore: 67,
    momentumTrend: "flat",
    velocity: "Moderate",
    lastInteraction: "9d ago (email)",
    nextMove: "Schedule allocation review",
    openLoops: 1,
    band: "Active-Stable",
  },
  {
    id: "r3",
    name: "Priya Desai",
    firm: "Lumen LP",
    momentumScore: 48,
    momentumTrend: "down",
    velocity: "Slow",
    lastInteraction: "14d ago (no reply)",
    nextMove: "Send concise update + ask for feedback",
    openLoops: 3,
    band: "Cooling",
  },
  {
    id: "r4",
    name: "Samir Patel",
    firm: "Harborlight Advisors",
    momentumScore: 29,
    momentumTrend: "down",
    velocity: "Slow",
    lastInteraction: "21d ago",
    nextMove: "Re-engage with performance snapshot",
    openLoops: 0,
    band: "Stalled",
  },
];

export const actions: ActionItem[] = [
  {
    id: "a1",
    title: "Approve outreach to Northwind on Q4 performance",
    status: "approval",
    trigger: "Performance deck updated yesterday",
    evidence: ["Deck v4 ready", "Last touch 3d ago", "Momentum trending up"],
    type: "outreach",
    draft: "Hi Alex — quick pulse on Q4 performance and next steps for your allocation...",
    activityLog: [
      { id: "al1", ts: "Today 09:10", actor: "TOMO", summary: "Drafted outreach v1" },
      { id: "al2", ts: "Today 09:12", actor: "TOMO", summary: "Suggested send time tomorrow 9am ET" },
    ],
  },
  {
    id: "a2",
    title: "Schedule allocation review with Peakline",
    status: "in_progress",
    trigger: "Jamie opened deck 3x but no reply",
    evidence: ["Opened deck 3 times", "Last reply 9d ago", "No meeting booked"],
    type: "scheduling",
    suggestedUpdates: ["Propose 30m next Tuesday", "Offer async summary if scheduling fails"],
    activityLog: [
      { id: "al3", ts: "Yesterday 15:04", actor: "TOMO", summary: "Sent scheduling options" },
      { id: "al4", ts: "Today 08:20", actor: "TOMO", summary: "No response yet" },
    ],
  },
  {
    id: "a3",
    title: "Update CRM: Lumen interest and next step",
    status: "blocked",
    trigger: "No response after 2 touches in 10d",
    evidence: ["No reply after 2 follow-ups", "Opened performance note once", "Stall risk rising"],
    type: "crm_update",
    suggestedUpdates: ["Interest: Q4 allocation", "Next step: send performance data", "Stall risk: High"],
    activityLog: [
      { id: "al5", ts: "Today 07:55", actor: "TOMO", summary: "Flagged stall risk" },
      { id: "al6", ts: "Today 08:10", actor: "User", summary: "Marked as blocked" },
    ],
  },
];

export const commitments: Commitment[] = [
  { id: "c1", title: "Northwind Q4 review", datetime: "Tomorrow 10:30 AM ET", lp: "Northwind Capital", briefId: "b1", window: "next72h" },
  { id: "c2", title: "Peakline allocation check-in", datetime: "Fri 2:00 PM ET", lp: "Peakline Partners", briefId: "b2", window: "next72h" },
  { id: "c3", title: "Lumen async update send", datetime: "Today 5:00 PM ET", lp: "Lumen LP", window: "today" },
];

export const momentumShifts: MomentumShift[] = [
  { band: "Stalled", delta: 1 },
  { band: "Heating", delta: 3 },
  { band: "Cooling", delta: 2 },
  { band: "Stable", delta: 0 },
];

export const briefs: Brief[] = [
  {
    id: "b1",
    meetingTitle: "Northwind Q4 review",
    lp: "Northwind Capital",
    datetime: "Tomorrow 10:30 AM ET",
    status: "Ready",
    openLoops: 1,
    summary: "Northwind is leaning in after strong Q4; wants clarity on pipeline and risk.",
    agenda: ["Performance highlights", "Risk / hedging stance", "Next allocation step"],
    commitments: ["Send follow-up deck", "Confirm allocation window"],
  },
  {
    id: "b2",
    meetingTitle: "Peakline allocation check-in",
    lp: "Peakline Partners",
    datetime: "Fri 2:00 PM ET",
    status: "Updated",
    openLoops: 2,
    summary: "Peakline opened deck multiple times; need to secure a concrete slot.",
    agenda: ["Scheduling decision", "Performance Q&A", "Next steps to commit"],
    commitments: ["Lock meeting time", "Share concise 3-bullet update"],
  },
];

export const materials: Material[] = [
  { id: "m1", name: "Q4 Performance Deck", type: "Deck", version: "v4", date: "Jan 12", engagement: "High", momentumImpact: "up", followUpSignal: "12 opens, 3 replies pending" },
  { id: "m2", name: "January Investor Update", type: "Update", version: "v2", date: "Jan 8", engagement: "Mixed", momentumImpact: "flat", followUpSignal: "8 opened, no replies" },
  { id: "m3", name: "Data Room Access", type: "Data Room", version: "v1", date: "Jan 3", engagement: "Ignored", momentumImpact: "down", followUpSignal: "No activity in 10d" },
];

export const momentumFlowSummary: FlowSummary[] = [
  { band: "Heating", delta: 2, names: ["Alex Morgan", "Jamie Chen", "Priya Desai"] },
  { band: "Active", delta: 1, names: ["Jamie Chen", "Alex Morgan", "Samir Patel"] },
  { band: "Cooling", delta: -1, names: ["Priya Desai", "Samir Patel"] },
  { band: "Stalled", delta: 1, names: ["Samir Patel"] },
];

export const healthMetrics: HealthMetric[] = [
  {
    id: "hm1",
    tier: "A",
    label: "High value meetings held",
    value: "4",
    trend: "+1",
    description: "Tier 1–2 LP meetings scheduled and completed.",
  },
  {
    id: "hm2",
    tier: "A",
    label: "Tier 1 coverage",
    value: "68%",
    trend: "+6%",
    description: "Percentage of Tier 1 LPs with a meaningful touch in the last 7 days.",
  },
  {
    id: "hm3",
    tier: "A",
    label: "Momentum distribution",
    value: "12 • 18 • 9",
    description: "Current spread across Heating / Active / Cooling.",
  },
  {
    id: "hm4",
    tier: "A",
    label: "Momentum movement",
    value: "+4 net",
    description: "Net LPs heating up vs cooling since yesterday.",
  },
  {
    id: "hm5",
    tier: "A",
    label: "Decay risk",
    value: "6",
    trend: "+1",
    description: "LPs at risk due to silence, missed follow-ups, or stalled flow.",
  },
  {
    id: "hm6",
    tier: "A",
    label: "Unanswered inbound",
    value: "3",
    description: "LP inbound messages beyond response SLA.",
  },
  {
    id: "hm7",
    tier: "A",
    label: "Stage velocity & stall rate",
    value: "3.4d / 9%",
    trend: "-0.2d",
    description: "Time spent per stage and percent stalled.",
    showIfStageData: true,
  },
  {
    id: "hm8",
    tier: "B",
    label: "Active LPs",
    value: "26",
    description: "LPs with an active conversation thread (LMRR-style).",
  },
  {
    id: "hm9",
    tier: "B",
    label: "High-value LPs cooling",
    value: "3",
    trend: "+1",
    description: "Tier 1 LPs with declining momentum.",
  },
];

export const activityLog: ActivityLogEntry[] = [
  { id: "log1", ts: "Today 09:10", actor: "TOMO", summary: "Drafted outreach to Northwind" },
  { id: "log2", ts: "Today 08:20", actor: "TOMO", summary: "Checked engagement for Peakline" },
  { id: "log3", ts: "Yesterday 18:05", actor: "User", summary: "Approved follow-up to Peakline" },
  { id: "log4", ts: "Yesterday 14:33", actor: "TOMO", summary: "Updated brief for Northwind" },
  { id: "log5", ts: "Yesterday 10:12", actor: "User", summary: "Snoozed Lumen outreach" },
];




