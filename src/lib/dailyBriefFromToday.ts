import type { ActionItem, Brief, Commitment } from "@/lib/mockData";
import { isTodayAttentionSlot } from "@/lib/todayAttentionDates";

export type DailyBriefLink =
  | { kind: "action"; id: string }
  | { kind: "commitment"; id: string }
  | { kind: "brief"; id: string };

export type DailyBriefLine = {
  label: string;
  /** When set, Today page can open the same drawer as the list. */
  link?: DailyBriefLink;
};

export type DailyBriefBlock = {
  icon: "followups" | "meetings" | "momentum" | "loops" | "todo";
  title: string;
  subtitle: string;
  items: DailyBriefLine[];
  secondarySubtitle?: string;
  secondaryItems?: DailyBriefLine[];
  insight: string;
};

const ATTENTION_CAP = 6;
const MEETING_CAP = 6;
const LOOP_CAP = 5;

function formatActionLineBrief(a: ActionItem): string {
  if (a.attentionCard) {
    const { company, workSubject } = a.attentionCard;
    return `${company} · ${workSubject}`;
  }
  return a.title.length > 80 ? `${a.title.slice(0, 77)}…` : a.title;
}

function commitmentBriefLine(c: Commitment): string {
  return `${c.datetime} · ${c.lp} · ${c.title}`;
}

function buildFollowUpsBlock(sortedActions: ActionItem[]): DailyBriefBlock {
  const todayPool = sortedActions.filter(isTodayAttentionSlot);
  const attention = todayPool.slice(0, ATTENTION_CAP);
  const followItems: DailyBriefLine[] =
    attention.length > 0
      ? attention.map((a) => ({
          label: formatActionLineBrief(a),
          link: { kind: "action", id: a.id },
        }))
      : [{ label: "Nothing flagged in What needs your attention right now." }];

  const followInsight =
    todayPool.length > attention.length
      ? `Showing ${attention.length} of ${todayPool.length} on Today.`
      : "Same items as What needs your attention.";

  return {
    icon: "followups",
    title: "Priority Follow-ups",
    subtitle: "Attention queue",
    items: followItems,
    insight: followInsight,
  };
}

function buildMeetingsBlock(sortedCommitments: Commitment[]): DailyBriefBlock {
  const todayMeetings = sortedCommitments.filter((c) => c.window === "today");
  const meetingPool = sortedCommitments.length ? sortedCommitments : [];
  const meetingItems: DailyBriefLine[] =
    meetingPool.length > 0
      ? meetingPool.slice(0, MEETING_CAP).map((c) => ({
          label: commitmentBriefLine(c),
          link: { kind: "commitment", id: c.id },
        }))
      : [{ label: "No upcoming commitments on Coming up." }];
  const meetingExtra = meetingPool.length > MEETING_CAP ? meetingPool.length - MEETING_CAP : 0;
  const meetingSubtitle =
    todayMeetings.length > 0 ? `${todayMeetings.length} today · Coming up` : "Coming up";
  const meetingInsight =
    meetingExtra > 0 ? `+${meetingExtra} more on Coming up.` : "Same order as Coming up.";

  return {
    icon: "meetings",
    title: "Meetings Requiring Prep",
    subtitle: meetingSubtitle,
    items: meetingItems,
    insight: meetingInsight,
  };
}

function buildMomentumBlock(sortedActions: ActionItem[]): DailyBriefBlock {
  const todayPool = sortedActions.filter(isTodayAttentionSlot);
  const momentumAction = todayPool.find((a) => a.type === "outreach");
  const coolingActions = todayPool.filter(
    (a) =>
      /cooling/i.test(a.title) ||
      a.evidence.some((line) => /cooling|re-engag|dropped|lower open/i.test(line)),
  );

  let momentumItems: DailyBriefLine[];
  let momentumSecondary: DailyBriefLine[] | undefined;
  let momentumSecondarySubtitle: string | undefined;
  if (momentumAction) {
    const actionLink: DailyBriefLink = { kind: "action", id: momentumAction.id };
    momentumItems = [{ label: momentumAction.title, link: actionLink }];
    momentumSecondarySubtitle = coolingActions.length > 0 ? "Cooling" : undefined;
    momentumSecondary =
      coolingActions.length > 0
        ? coolingActions.slice(0, 2).map((a) => ({
            label: formatActionLineBrief(a),
            link: { kind: "action", id: a.id },
          }))
        : undefined;
  } else {
    momentumItems = [{ label: "No momentum task on Today." }];
  }
  const momentumInsight = momentumAction
    ? "From the momentum / newsletter card on Today."
    : "Appears when that card is in your attention queue.";

  return {
    icon: "momentum",
    title: "Momentum Signals",
    subtitle: momentumAction ? "Newsletter / momentum" : "Momentum",
    items: momentumItems,
    secondarySubtitle: momentumSecondarySubtitle,
    secondaryItems: momentumSecondary,
    insight: momentumInsight,
  };
}

function buildLoopsBlock(sortedActions: ActionItem[], allBriefs: Brief[]): DailyBriefBlock {
  const todayPool = sortedActions.filter(isTodayAttentionSlot);
  const loopLines: DailyBriefLine[] = [];
  const seenLoopLabels = new Set<string>();
  const pushLoop = (line: DailyBriefLine) => {
    if (loopLines.length >= LOOP_CAP) return;
    if (seenLoopLabels.has(line.label)) return;
    seenLoopLabels.add(line.label);
    loopLines.push(line);
  };

  for (const a of todayPool) {
    if (a.status === "blocked") {
      pushLoop({ label: formatActionLineBrief(a), link: { kind: "action", id: a.id } });
    }
  }
  for (const b of allBriefs) {
    if (b.openLoops > 0) {
      pushLoop({
        label: `${b.meetingTitle} · ${b.openLoops} loop${b.openLoops === 1 ? "" : "s"}`,
        link: { kind: "brief", id: b.id },
      });
    }
  }
  for (const a of todayPool) {
    if (a.status === "approval" && (a.type === "follow_up" || a.type === "scheduling")) {
      pushLoop({ label: formatActionLineBrief(a), link: { kind: "action", id: a.id } });
    }
  }

  const loopsDisplay: DailyBriefLine[] =
    loopLines.length > 0 ? loopLines : [{ label: "No open loops in this snapshot." }];

  const loopsInsight = "Blocked items, briefs with open loops, and approvals waiting on you.";

  return {
    icon: "loops",
    title: "Open Execution Loops",
    subtitle: "Blocked, approvals, and brief open loops",
    items: loopsDisplay,
    insight: loopsInsight,
  };
}

/** “Still in To-Do” — surfaced in attention but user hasn’t opened the row yet. */
export function buildStillInTodoBlock(stillInTodoActions: ActionItem[]): DailyBriefBlock {
  if (stillInTodoActions.length === 0) {
    return {
      icon: "todo",
      title: "Still in To-Do",
      subtitle: "Previously flagged, not yet opened",
      items: [
        {
          label: "Nothing here — items appear when they show in What needs your attention before you open them.",
        },
      ],
      insight: "Open a card from the attention list to clear it from this stack.",
    };
  }

  return {
    icon: "todo",
    title: "Still in To-Do",
    subtitle: "Surfaced in attention — not opened yet",
    items: stillInTodoActions.map((a) => ({
      label: formatActionLineBrief(a),
      link: { kind: "action", id: a.id },
    })),
    insight: "Open these from What needs your attention (or here) to mark them as engaged.",
  };
}

/**
 * Full four-section Daily Brief: email, orchestrator context, and any “full brief” surface.
 */
export function buildDailyBriefBlocks(
  sortedActions: ActionItem[],
  sortedCommitments: Commitment[],
  allBriefs: Brief[],
): DailyBriefBlock[] {
  return [
    buildFollowUpsBlock(sortedActions),
    buildMeetingsBlock(sortedCommitments),
    buildMomentumBlock(sortedActions),
    buildLoopsBlock(sortedActions, allBriefs),
  ];
}

/** Alias for outbound / scheduled sends — same four sections as {@link buildDailyBriefBlocks}. */
export const buildDailyBriefForOutbound = buildDailyBriefBlocks;

/**
 * On My Radar (Today page): Momentum, Open loops, Still in To-Do (no duplicate of follow-ups / meetings).
 * @param stillInTodoActions — from {@link getStillInTodoActions} / engagement layer
 */
export function buildOnMyRadarBlocks(
  sortedActions: ActionItem[],
  _sortedCommitments: Commitment[],
  allBriefs: Brief[],
  stillInTodoActions: ActionItem[],
): DailyBriefBlock[] {
  void _sortedCommitments;
  return [
    buildMomentumBlock(sortedActions),
    buildLoopsBlock(sortedActions, allBriefs),
    buildStillInTodoBlock(stillInTodoActions),
  ];
}
