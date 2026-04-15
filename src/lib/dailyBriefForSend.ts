/**
 * Build the same Daily Brief blocks as Today (/home) using mock pools + home sort order.
 * Used for Loops transactional sends until real user data exists.
 */

import { buildDailyBriefForOutbound } from "@/lib/dailyBriefFromToday";
import { actions, briefs, commitments, type ActionItem, type Commitment } from "@/lib/mockData";

function sortActionsForToday(list: ActionItem[]): ActionItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const urgencyOrder = { blocked: 0, approval: 1, in_progress: 2 };
  return [...list].sort((a, b) => {
    const aOverdue = a.dueDate ? a.dueDate < today : false;
    const bOverdue = b.dueDate ? b.dueDate < today : false;
    const aScore = urgencyOrder[a.status as keyof typeof urgencyOrder] ?? 3;
    const bScore = urgencyOrder[b.status as keyof typeof urgencyOrder] ?? 3;
    if (aScore !== bScore) return aScore - bScore;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return 0;
  });
}

function sortCommitmentsForToday(list: Commitment[]): Commitment[] {
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const windowOrder: Record<string, number> = { today: 0, next72h: 1 };
  const parseTimeToMinutes = (time: string) => {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hour = Number(match[1]) % 12;
    const minutes = Number(match[2]);
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + minutes;
  };
  const commitmentKey = (c: Commitment) => {
    const dt = c.datetime;
    if (dt.startsWith("Today")) return [windowOrder[c.window] ?? 9, 0, parseTimeToMinutes(dt)];
    if (dt.startsWith("Tomorrow")) return [windowOrder[c.window] ?? 9, 1, parseTimeToMinutes(dt)];
    const dayIdx = dayOrder.findIndex((day) => dt.startsWith(day));
    return [windowOrder[c.window] ?? 9, dayIdx === -1 ? 9 : dayIdx + 2, parseTimeToMinutes(dt)];
  };
  return [...list].sort((a, b) => {
    const [wA, dA, tA] = commitmentKey(a);
    const [wB, dB, tB] = commitmentKey(b);
    if (wA !== wB) return wA - wB;
    if (dA !== dB) return dA - dB;
    return tA - tB;
  });
}

/** Same four-section brief as the Today page (mock data). */
export function getDailyBriefBlocksForSend() {
  const sortedActions = sortActionsForToday(actions);
  const sortedCommitments = sortCommitmentsForToday(commitments);
  return buildDailyBriefForOutbound(sortedActions, sortedCommitments, briefs);
}
