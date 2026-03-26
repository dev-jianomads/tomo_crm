import type { ActionItem, Brief, Commitment } from "@/lib/mockData";
import { commitmentDayTime } from "@/lib/today-commitment-time";

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
  icon: "followups" | "meetings" | "momentum" | "loops";
  title: string;
  subtitle: string;
  items: DailyBriefLine[];
  secondarySubtitle?: string;
  secondaryItems?: DailyBriefLine[];
  insight: string;
};

const ATTENTION_CAP = 6;
const MEETING_CAP = 8;
const LOOP_CAP = 6;

function formatActionLine(a: ActionItem): string {
  if (a.attentionCard) {
    const { company, contactName, workKind, workSubject } = a.attentionCard;
    return `${company} : ${contactName} — ${workKind}: ${workSubject}`;
  }
  return a.title;
}

function commitmentBriefLine(c: Commitment): string {
  return `${commitmentDayTime(c.datetime)} — ${c.lp} · ${c.contactName} · ${c.title}`;
}

/**
 * Daily Brief blocks derived from the same pools as Today (/home): attention actions,
 * coming-up commitments, and brief / status signals already visible on the page.
 */
export function buildDailyBriefBlocks(
  sortedActions: ActionItem[],
  sortedCommitments: Commitment[],
  allBriefs: Brief[],
): DailyBriefBlock[] {
  const attention = sortedActions.slice(0, ATTENTION_CAP);
  const followItems: DailyBriefLine[] =
    attention.length > 0
      ? attention.map((a) => ({
          label: formatActionLine(a),
          link: { kind: "action", id: a.id },
        }))
      : [{ label: "Nothing flagged in What needs your attention right now." }];

  const followInsight =
    sortedActions.length > attention.length
      ? `Matches the top ${attention.length} cards on Today (${sortedActions.length} total in queue).`
      : "Matches What needs your attention on Today.";

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
    todayMeetings.length > 0
      ? `${todayMeetings.length} today · same list as Coming up`
      : "Same order as Coming up on Today";
  const meetingInsight =
    meetingExtra > 0
      ? `${meetingExtra} more meeting(s) on Today — scroll Coming up for the full list.`
      : "Pulled from Coming up — same commitments and sort as the Today page.";

  const momentumAction = sortedActions.find((a) => a.type === "outreach");
  const coolingActions = sortedActions.filter(
    (a) =>
      /cooling/i.test(a.title) ||
      a.evidence.some((line) => /cooling|re-engag|dropped|lower open/i.test(line)),
  );

  let momentumItems: DailyBriefLine[];
  let momentumSecondary: DailyBriefLine[] | undefined;
  let momentumSecondarySubtitle: string | undefined;
  if (momentumAction) {
    const actionLink: DailyBriefLink = { kind: "action", id: momentumAction.id };
    momentumItems = [momentumAction.trigger, ...momentumAction.evidence.slice(0, 2)]
      .filter(Boolean)
      .slice(0, 3)
      .map((label) => ({ label, link: actionLink }));
    if (momentumItems.length === 0) {
      momentumItems = [{ label: formatActionLine(momentumAction), link: actionLink }];
    }
    momentumSecondarySubtitle =
      coolingActions.length > 0 ? "Cooling / re-engagement signals from the same queue" : undefined;
    momentumSecondary =
      coolingActions.length > 0
        ? coolingActions.slice(0, 3).map((a) => ({
            label: formatActionLine(a),
            link: { kind: "action", id: a.id },
          }))
        : undefined;
  } else {
    momentumItems = [{ label: "No momentum or newsletter review card in What needs your attention right now." }];
  }
  const momentumInsight = momentumAction
    ? "Sourced from the outreach / momentum-style action on Today (same card as in the attention list)."
    : "When a momentum or newsletter task appears in What needs your attention, it will summarize here.";

  const loopLines: DailyBriefLine[] = [];
  const seenLoopLabels = new Set<string>();
  const pushLoop = (line: DailyBriefLine) => {
    if (loopLines.length >= LOOP_CAP) return;
    if (seenLoopLabels.has(line.label)) return;
    seenLoopLabels.add(line.label);
    loopLines.push(line);
  };

  for (const a of sortedActions) {
    if (a.status === "blocked") {
      pushLoop({ label: formatActionLine(a), link: { kind: "action", id: a.id } });
    }
  }
  for (const b of allBriefs) {
    if (b.openLoops > 0) {
      pushLoop({
        label: `${b.meetingTitle} — ${b.openLoops} open loop${b.openLoops === 1 ? "" : "s"}`,
        link: { kind: "brief", id: b.id },
      });
    }
  }
  for (const a of sortedActions) {
    if (a.status === "approval" && (a.type === "follow_up" || a.type === "scheduling")) {
      pushLoop({ label: formatActionLine(a), link: { kind: "action", id: a.id } });
    }
  }

  const loopsDisplay: DailyBriefLine[] =
    loopLines.length > 0
      ? loopLines
      : [{ label: "No blocked items or open brief loops in the current snapshot." }];

  const loopsInsight =
    "Combines blocked attention items, meeting briefs with open loops, and approval queues for follow-ups / scheduling — all from Today’s data.";

  return [
    {
      icon: "followups",
      title: "Priority Follow-ups",
      subtitle: "Top of What needs your attention",
      items: followItems,
      insight: followInsight,
    },
    {
      icon: "meetings",
      title: "Meetings Requiring Prep",
      subtitle: meetingSubtitle,
      items: meetingItems,
      insight: meetingInsight,
    },
    {
      icon: "momentum",
      title: "Momentum Signals",
      subtitle: momentumAction ? "From your momentum / newsletter attention card" : "Momentum queue",
      items: momentumItems,
      secondarySubtitle: momentumSecondarySubtitle,
      secondaryItems: momentumSecondary,
      insight: momentumInsight,
    },
    {
      icon: "loops",
      title: "Open Execution Loops",
      subtitle: "Blocked, approvals, and brief open loops",
      items: loopsDisplay,
      insight: loopsInsight,
    },
  ];
}
