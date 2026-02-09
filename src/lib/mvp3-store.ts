import { useMemo } from "react";
import { usePersistentState } from "@/lib/storage";

export type Assignee = "ME" | "PARTNER" | "ANALYST";

export type Relationship = {
  id: string;
  fundId: string;
  name: string;
  firm: string;
  role: string;
  email?: string;
  momentumScore: number;
  momentumTrend: "up" | "flat" | "down";
  velocity: "Fast" | "Moderate" | "Slow";
  lastInteraction: string;
  nextMove: string;
  openLoops: number;
  band: "Heating Up" | "Active-Stable" | "Cooling" | "Stalled";
  aliases?: string[];
  assistantContactId?: string;
  doNotContact?: boolean;
  lockedFields?: Record<string, boolean>;
  timezone?: string;
  workHours?: { start: string; end: string };
  lastTouchedAt?: string;
  archived?: boolean;
};

export type Thread = {
  id: string;
  fundId: string;
  contactId: string;
  channel: "OUTLOOK_EMAIL" | "CALENDAR";
  title: string;
  participants: string[];
  lastMessageAt?: string;
  lastEventAt?: string;
  status: "ACTIVE" | "WAITING_ON_THEM" | "WAITING_ON_US" | "CLOSED";
  inferredNextStep?: string;
  evidence: Array<{ type: "EMAIL" | "CALENDAR"; snippet: string }>;
};

export type Loop = {
  id: string;
  fundId: string;
  contactId: string;
  threadId?: string;
  title: string;
  status: "OPEN" | "WAITING" | "SNOOZED" | "DONE";
  dueAt?: string;
  snoozedUntil?: string;
  priority: "LOW" | "MED" | "HIGH";
  assignee: Assignee;
  suggestedDraft?: string;
  evidence: Array<{ type: "THREAD" | "EMAIL" | "CALENDAR" | "MATERIAL"; id?: string; snippet: string }>;
  createdAt: string;
  updatedAt: string;
};

export type Stall = {
  id: string;
  fundId: string;
  contactId: string;
  threadId: string;
  stalledSince: string;
  stallReason: "NO_REPLY" | "NO_NEXT_STEP" | "MISSING_MATERIALS";
  severity: "LOW" | "MED" | "HIGH";
  suggestedFollowUpDraft?: string;
  evidence: string[];
};

export type SchedulingRequest = {
  id: string;
  fundId: string;
  contactId: string;
  threadId?: string;
  title: string;
  participants: Array<{ name: string; email?: string; role?: "LP" | "EA" | "INTERNAL"; timezone?: string }>;
  coordinator: "ME" | "ASSISTANT";
  durationMinutes: number;
  locationType: "VIDEO" | "IN_PERSON" | "PHONE";
  timeWindow: { startDate: string; endDate: string };
  constraints: { avoidWeekends: boolean; bufferMinutes: number; preferredHours?: { start: string; end: string } };
  status: "DRAFT" | "SENT" | "COLLECTING_AVAIL" | "PROPOSED" | "CONFIRMED" | "CANCELLED";
  proposals: Array<{ id: string; startAt: string; endAt: string; confidence: number; rationale: string }>;
  chosenProposalId?: string;
};

export type TripPlan = {
  id: string;
  fundId: string;
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  goals?: string;
  targetContactIds: string[];
  suggestedMeetings: Array<{ contactId: string; priority: "A" | "B" | "C"; notes?: string }>;
  status?: "Not started" | "In progress" | "Scheduled";
};

export type IngestionStatus = {
  connector: "OUTLOOK" | "CALENDAR";
  status: "OK" | "DEGRADED" | "ERROR";
  lastSyncAt: string;
  syncLagMinutes: number;
  errors: Array<{ code: string; message: string; at: string }>;
};

export type MeetingEvent = {
  id: string;
  fundId: string;
  title: string;
  contactId: string;
  startsAt: string;
  endsAt: string;
  locationType: "VIDEO" | "IN_PERSON" | "PHONE";
  schedulingRequestId?: string;
};

export type NotificationPrefs = {
  inApp: boolean;
  email: boolean;
  slack: boolean;
  telegram: boolean;
  emailAddress?: string;
  timezoneDefault?: string;
  workHoursDefault?: { start: string; end: string };
};

export type ActivityEvent = {
  id: string;
  fundId: string;
  when: string;
  actor: "TOMO" | "User";
  type:
    | "connector_sync_started"
    | "connector_sync_succeeded"
    | "connector_sync_failed"
    | "thread_created"
    | "thread_updated"
    | "loop_created"
    | "loop_assigned"
    | "loop_snoozed"
    | "loop_done"
    | "draft_generated"
    | "marked_sent"
    | "scheduling_request_created"
    | "scheduling_request_sent"
    | "scheduling_request_proposed"
    | "scheduling_request_confirmed"
    | "trip_created"
    | "trip_generated_requests"
    | "entity_merged"
    | "field_locked"
    | "field_overridden";
  summary: string;
  entityType?: "relationship" | "thread" | "loop" | "scheduling" | "trip" | "system";
  entityId?: string;
  metadata?: Record<string, string>;
  evidence?: string[];
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

const seedRelationships: Relationship[] = [
  {
    id: "r1",
    fundId: "fund-1",
    name: "Alex Morgan",
    firm: "Northwind Capital",
    role: "Managing Partner",
    email: "alex@northwind.com",
    momentumScore: 82,
    momentumTrend: "up",
    velocity: "Fast",
    lastInteraction: "3d ago (call)",
    nextMove: "Share Q4 performance deck",
    openLoops: 2,
    band: "Heating Up",
    timezone: "America/New_York",
    workHours: { start: "09:00", end: "18:00" },
    lastTouchedAt: daysAgo(3),
    assistantContactId: "r5",
  },
  {
    id: "r2",
    fundId: "fund-1",
    name: "Jamie Chen",
    firm: "Peakline Partners",
    role: "COO",
    email: "jamie@peakline.com",
    momentumScore: 67,
    momentumTrend: "flat",
    velocity: "Moderate",
    lastInteraction: "9d ago (email)",
    nextMove: "Schedule allocation review",
    openLoops: 1,
    band: "Active-Stable",
    timezone: "America/Los_Angeles",
    lastTouchedAt: daysAgo(9),
  },
  {
    id: "r3",
    fundId: "fund-2",
    name: "Priya Desai",
    firm: "Lumen LP",
    role: "Head of Product",
    email: "priya@lumenlp.com",
    momentumScore: 48,
    momentumTrend: "down",
    velocity: "Slow",
    lastInteraction: "14d ago (no reply)",
    nextMove: "Send concise update + ask for feedback",
    openLoops: 3,
    band: "Cooling",
    timezone: "America/Chicago",
    lastTouchedAt: daysAgo(14),
  },
  {
    id: "r4",
    fundId: "fund-3",
    name: "Samir Patel",
    firm: "Harborlight Advisors",
    role: "CIO",
    email: "samir@harborlight.com",
    momentumScore: 29,
    momentumTrend: "down",
    velocity: "Slow",
    lastInteraction: "21d ago",
    nextMove: "Re-engage with performance snapshot",
    openLoops: 0,
    band: "Stalled",
    timezone: "Europe/London",
    lastTouchedAt: daysAgo(21),
  },
  {
    id: "r5",
    fundId: "fund-1",
    name: "Ava Li",
    firm: "Northwind Capital",
    role: "EA to Alex Morgan",
    email: "ava@northwind.com",
    momentumScore: 52,
    momentumTrend: "flat",
    velocity: "Moderate",
    lastInteraction: "5d ago",
    nextMove: "Route scheduling through EA",
    openLoops: 0,
    band: "Active-Stable",
    timezone: "America/New_York",
    lastTouchedAt: daysAgo(5),
  },
];

const seedThreads: Thread[] = [
  {
    id: "t1",
    fundId: "fund-1",
    contactId: "r1",
    channel: "OUTLOOK_EMAIL",
    title: "Northwind Q4 performance follow-up",
    participants: ["Alex Morgan", "You"],
    lastMessageAt: daysAgo(4),
    status: "WAITING_ON_THEM",
    inferredNextStep: "Confirm timing for allocation review",
    evidence: [{ type: "EMAIL", snippet: "Let me review the deck with my team and circle back." }],
  },
  {
    id: "t2",
    fundId: "fund-1",
    contactId: "r2",
    channel: "OUTLOOK_EMAIL",
    title: "Peakline allocation scheduling",
    participants: ["Jamie Chen", "You"],
    lastMessageAt: daysAgo(2),
    status: "ACTIVE",
    evidence: [{ type: "EMAIL", snippet: "Can you send over a few windows next week?" }],
  },
  {
    id: "t3",
    fundId: "fund-2",
    contactId: "r3",
    channel: "OUTLOOK_EMAIL",
    title: "Lumen expansion update",
    participants: ["Priya Desai", "You"],
    lastMessageAt: daysAgo(6),
    status: "WAITING_ON_THEM",
    evidence: [{ type: "EMAIL", snippet: "We need the adoption dashboard before moving forward." }],
  },
];

const seedLoops: Loop[] = [
  {
    id: "l1",
    fundId: "fund-1",
    contactId: "r1",
    threadId: "t1",
    title: "Confirm allocation review timing",
    status: "OPEN",
    dueAt: daysFromNow(1),
    priority: "HIGH",
    assignee: "ME",
    suggestedDraft: "Hi Alex — quick nudge on a 30m review slot next week. Happy to align to your schedule.",
    evidence: [{ type: "THREAD", id: "t1", snippet: "Let me review the deck with my team and circle back." }],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "l2",
    fundId: "fund-1",
    contactId: "r2",
    threadId: "t2",
    title: "Share proposed windows for allocation review",
    status: "WAITING",
    dueAt: daysFromNow(2),
    priority: "MED",
    assignee: "ANALYST",
    evidence: [{ type: "EMAIL", id: "t2", snippet: "Can you send over a few windows next week?" }],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "l3",
    fundId: "fund-2",
    contactId: "r3",
    threadId: "t3",
    title: "Send adoption dashboard",
    status: "OPEN",
    dueAt: daysFromNow(0),
    priority: "HIGH",
    assignee: "ME",
    evidence: [{ type: "MATERIAL", snippet: "Adoption dashboard requested; not yet sent." }],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },
];

const seedScheduling: SchedulingRequest[] = [
  {
    id: "s1",
    fundId: "fund-1",
    contactId: "r2",
    threadId: "t2",
    title: "Peakline allocation review",
    participants: [
      { name: "Jamie Chen", email: "jamie@peakline.com", role: "LP", timezone: "America/Los_Angeles" },
      { name: "You", role: "INTERNAL", timezone: "America/New_York" },
    ],
    coordinator: "ME",
    durationMinutes: 30,
    locationType: "VIDEO",
    timeWindow: { startDate: daysFromNow(1), endDate: daysFromNow(7) },
    constraints: { avoidWeekends: true, bufferMinutes: 15, preferredHours: { start: "09:00", end: "17:00" } },
    status: "COLLECTING_AVAIL",
    proposals: [],
  },
];

const seedTripPlans: TripPlan[] = [
  {
    id: "tp1",
    fundId: "fund-1",
    name: "NYC LP trip",
    city: "New York",
    startDate: daysFromNow(14),
    endDate: daysFromNow(17),
    goals: "Re-activate top LPs and secure Q2 allocations.",
    targetContactIds: ["r1", "r2"],
    suggestedMeetings: [
      { contactId: "r1", priority: "A", notes: "Confirm allocation timing." },
      { contactId: "r2", priority: "B", notes: "Schedule Q2 pipeline review." },
    ],
    status: "Not started",
  },
];

const seedMeetings: MeetingEvent[] = [
  {
    id: "m1",
    fundId: "fund-1",
    title: "Northwind Q4 review",
    contactId: "r1",
    startsAt: daysFromNow(0),
    endsAt: daysFromNow(0),
    locationType: "VIDEO",
    schedulingRequestId: "s1",
  },
];

const seedIngestion: Record<string, IngestionStatus[]> = {
  "fund-1": [
    { connector: "OUTLOOK", status: "OK", lastSyncAt: daysAgo(0), syncLagMinutes: 8, errors: [] },
    { connector: "CALENDAR", status: "DEGRADED", lastSyncAt: daysAgo(0), syncLagMinutes: 42, errors: [{ code: "SYNC_LAG", message: "Calendar lag exceeds 30 minutes.", at: daysAgo(0) }] },
  ],
  "fund-2": [
    { connector: "OUTLOOK", status: "OK", lastSyncAt: daysAgo(0), syncLagMinutes: 11, errors: [] },
    { connector: "CALENDAR", status: "OK", lastSyncAt: daysAgo(0), syncLagMinutes: 6, errors: [] },
  ],
  "fund-3": [
    { connector: "OUTLOOK", status: "ERROR", lastSyncAt: daysAgo(1), syncLagMinutes: 180, errors: [{ code: "AUTH", message: "Re-auth required.", at: daysAgo(1) }] },
    { connector: "CALENDAR", status: "OK", lastSyncAt: daysAgo(0), syncLagMinutes: 9, errors: [] },
  ],
};

const seedActivity: ActivityEvent[] = [
  {
    id: "a1",
    fundId: "fund-1",
    when: "Today 09:10",
    actor: "TOMO",
    type: "draft_generated",
    summary: "Generated follow-up draft for Northwind allocation review",
    entityType: "loop",
    entityId: "l1",
    evidence: ["Open loop due tomorrow", "Thread waiting on response"],
  },
  {
    id: "a2",
    fundId: "fund-1",
    when: "Today 08:20",
    actor: "TOMO",
    type: "scheduling_request_created",
    summary: "Created scheduling request for Peakline review",
    entityType: "scheduling",
    entityId: "s1",
  },
  {
    id: "a3",
    fundId: "fund-1",
    when: "Today 07:55",
    actor: "TOMO",
    type: "connector_sync_succeeded",
    summary: "Outlook sync completed",
    entityType: "system",
    entityId: "OUTLOOK",
  },
  {
    id: "a4",
    fundId: "fund-1",
    when: "Today 07:40",
    actor: "TOMO",
    type: "connector_sync_failed",
    summary: "Calendar sync lag detected",
    entityType: "system",
    entityId: "CALENDAR",
    evidence: ["Calendar lag exceeds 30 minutes."],
  },
];

export function useFundScopedState<T>(key: string, fundId: string, initial: T) {
  const scopedKey = `${key}-${fundId}`;
  return usePersistentState<T>(scopedKey, initial);
}

export function useRelationships(fundId: string) {
  const initial = useMemo(() => seedRelationships.filter((rel) => rel.fundId === fundId), [fundId]);
  return useFundScopedState<Relationship[]>("tomo-relationships", fundId, initial);
}

export function useThreads(fundId: string) {
  const initial = useMemo(() => seedThreads.filter((t) => t.fundId === fundId), [fundId]);
  return useFundScopedState<Thread[]>("tomo-threads", fundId, initial);
}

export function useLoops(fundId: string) {
  const initial = useMemo(() => seedLoops.filter((loop) => loop.fundId === fundId), [fundId]);
  return useFundScopedState<Loop[]>("tomo-loops", fundId, initial);
}

export function useStalls(fundId: string) {
  return useFundScopedState<Stall[]>("tomo-stalls", fundId, []);
}

export function useSchedulingRequests(fundId: string) {
  const initial = useMemo(() => seedScheduling.filter((req) => req.fundId === fundId), [fundId]);
  return useFundScopedState<SchedulingRequest[]>("tomo-scheduling", fundId, initial);
}

export function useTripPlans(fundId: string) {
  const initial = useMemo(() => seedTripPlans.filter((plan) => plan.fundId === fundId), [fundId]);
  return useFundScopedState<TripPlan[]>("tomo-trips", fundId, initial);
}

export function useMeetings(fundId: string) {
  const initial = useMemo(() => seedMeetings.filter((meeting) => meeting.fundId === fundId), [fundId]);
  return useFundScopedState<MeetingEvent[]>("tomo-meetings", fundId, initial);
}

export function useIngestionStatus(fundId: string) {
  const initial = useMemo(() => seedIngestion[fundId] ?? [], [fundId]);
  return useFundScopedState<IngestionStatus[]>("tomo-ingestion", fundId, initial);
}

export function useActivityLog(fundId: string) {
  const initial = useMemo(() => seedActivity.filter((event) => event.fundId === fundId), [fundId]);
  return useFundScopedState<ActivityEvent[]>("tomo-activity", fundId, initial);
}

export function useNotificationPrefs() {
  return usePersistentState<NotificationPrefs>("tomo-notification-prefs", {
    inApp: true,
    email: false,
    slack: false,
    telegram: false,
    emailAddress: "",
    timezoneDefault: "America/New_York",
    workHoursDefault: { start: "09:00", end: "18:00" },
  });
}

export function deriveStalls(threads: Thread[], loops: Loop[]): Stall[] {
  const now = Date.now();
  const loopByThread = new Map(loops.filter((loop) => loop.status !== "DONE").map((loop) => [loop.threadId, loop]));
  return threads.flatMap((thread) => {
    const stalls: Stall[] = [];
    if (thread.status === "WAITING_ON_THEM" && thread.lastMessageAt) {
      const ageDays = Math.floor((now - new Date(thread.lastMessageAt).getTime()) / 86400000);
      if (ageDays >= 3) {
        stalls.push({
          id: `stall-${thread.id}-no-reply`,
          fundId: thread.fundId,
          contactId: thread.contactId,
          threadId: thread.id,
          stalledSince: thread.lastMessageAt,
          stallReason: "NO_REPLY",
          severity: ageDays >= 7 ? "HIGH" : ageDays >= 5 ? "MED" : "LOW",
          evidence: thread.evidence.map((e) => e.snippet),
        });
      }
    }
    if (thread.status === "ACTIVE" && !thread.inferredNextStep && !loopByThread.get(thread.id)) {
      stalls.push({
        id: `stall-${thread.id}-no-next-step`,
        fundId: thread.fundId,
        contactId: thread.contactId,
        threadId: thread.id,
        stalledSince: thread.lastMessageAt ?? thread.lastEventAt ?? daysAgo(3),
        stallReason: "NO_NEXT_STEP",
        severity: "MED",
        evidence: thread.evidence.map((e) => e.snippet),
      });
    }
    return stalls;
  });
}

export function detectMaterialStalls(loops: Loop[]): Stall[] {
  return loops
    .filter((loop) => loop.status !== "DONE" && loop.evidence.some((e) => e.type === "MATERIAL"))
    .map((loop) => ({
      id: `stall-${loop.id}-material`,
      fundId: loop.fundId,
      contactId: loop.contactId,
      threadId: loop.threadId ?? loop.id,
      stalledSince: loop.updatedAt,
      stallReason: "MISSING_MATERIALS",
      severity: loop.priority === "HIGH" ? "HIGH" : "MED",
      evidence: loop.evidence.map((e) => e.snippet),
    }));
}

export function createDraftFromLoop(loop: Loop, relationship?: Relationship) {
  const recipient = relationship?.name ?? "there";
  return `Hi ${recipient} — following up on ${loop.title.toLowerCase()}. Happy to align on timing and next steps.`;
}

export function createFollowUpFromStall(stall: Stall, relationship?: Relationship) {
  const recipient = relationship?.name ?? "there";
  const reason =
    stall.stallReason === "NO_REPLY"
      ? "I wanted to make sure my last note didn't slip"
      : stall.stallReason === "NO_NEXT_STEP"
        ? "Wanted to clarify the next step on this thread"
        : "Following up on the material request";
  return `Hi ${recipient} — ${reason}. I can share a quick summary or propose times if helpful.`;
}

export function createSchedulingDraft(req: SchedulingRequest, relationship?: Relationship, assistant?: Relationship) {
  const recipient = assistant?.name ?? relationship?.name ?? "there";
  const routeNote = assistant ? `Happy to coordinate via ${assistant.name}.` : "";
  return `Hi ${recipient} — sharing a few windows for ${req.title}. ${routeNote} Let me know what works, and I’ll confirm.`;
}

export function generateProposals(req: SchedulingRequest, timezone: string, preferredHours?: { start: string; end: string }) {
  const start = new Date(req.timeWindow.startDate);
  const hours = preferredHours ?? req.constraints.preferredHours;
  const baseHour = hours ? parseInt(hours.start.split(":")[0] ?? "10", 10) : 10;
  const proposals = Array.from({ length: 3 }).map((_, idx) => {
    const slotStart = new Date(start.getTime() + (idx + 1) * 86400000);
    slotStart.setHours(baseHour + idx, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + req.durationMinutes * 60000);
    const windowLabel = hours ? `${hours.start}-${hours.end}` : "business hours";
    return {
      id: `proposal-${idx + 1}`,
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
      confidence: 0.7 + idx * 0.1,
      rationale: `Aligns with ${timezone} ${windowLabel} and avoids weekend constraints.`,
    };
  });
  return proposals;
}
