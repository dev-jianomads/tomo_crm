/**
 * Builds {@link RadarModalPayload} for Today / orchestrator context.
 * Demo sections come from {@link ./radarModalSeed} until production derivation ships (SRS Appendix I).
 */

import type { Brief, ActionItem, Commitment } from "@/lib/mockData";
import type { RadarModalPayload } from "@/lib/radarModalTypes";
import { isTodayAttentionSlot } from "@/lib/todayAttentionDates";
import {
  countRadarBadgeEligibleRows,
  countRadarModalTotalItems,
  getRadarModalAppendixISkeletonSections,
  getRadarModalDemoPayload,
} from "@/lib/radarModalSeed";

export type BuildRadarModalInput = {
  sortedActions: ActionItem[];
  sortedCommitments: Commitment[];
  allBriefs: Brief[];
  stillInTodoActions: ActionItem[];
};

export type BuildRadarModalOptions = {
  /**
   * When true (default), section rows use Appendix-I demo seed (aligned with `radarModalSeed`).
   * Set false to show Appendix I section shells with empty-state copy until backend derivation exists.
   */
  useDemoRadarSections?: boolean;
  /** Fixed clock for tests */
  now?: Date;
};

function formatRadarEyebrow(now: Date): string {
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  const day = now.getDate();
  return `Daily Brief · ${weekday} ${day} ${month}`;
}

function formatRadarComputedStamp(now: Date): string {
  const t = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Computed ${t.replace(/\s/g, "").toLowerCase()}`;
}

/**
 * Short narrative from live Today data — used when demo sections are on so copy stays grounded in the queue.
 */
export function buildRadarNarrativeSummary(
  sortedActions: ActionItem[],
  sortedCommitments: Commitment[],
): string {
  const todayPool = sortedActions.filter(isTodayAttentionSlot);
  const todayMeetings = sortedCommitments.filter((c) => c.window === "today");
  const lines: string[] = [];

  const blocked = todayPool.filter((a) => a.status === "blocked");
  const approval = todayPool.filter((a) => a.status === "approval");
  if (blocked.length || approval.length) {
    lines.push(
      `${blocked.length + approval.length} item${blocked.length + approval.length === 1 ? "" : "s"} in What needs your attention need approval or unblock.`,
    );
  }
  if (todayMeetings.length) {
    lines.push(
      `${todayMeetings.length} meeting${todayMeetings.length === 1 ? "" : "s"} on Coming up today — prep packs mirror the drawer.`,
    );
  }
  const outreach = todayPool.find((a) => a.type === "outreach");
  if (outreach?.evidence?.[0]?.trim()) {
    lines.push(outreach.evidence[0].trim());
  } else {
    const firstSig = todayPool.find((a) => a.evidence?.[0]?.trim());
    if (firstSig?.evidence?.[0]) lines.push(firstSig.evidence[0].trim());
  }

  if (lines.length === 0) {
    return getRadarModalDemoPayload().narrativeSummaryPlain;
  }
  return lines.join(" ");
}

export function buildRadarModalPayload(
  input: BuildRadarModalInput,
  options: BuildRadarModalOptions = {},
): RadarModalPayload {
  void input.allBriefs;
  void input.stillInTodoActions;

  const useDemo = options.useDemoRadarSections !== false;
  const now = options.now ?? new Date();

  if (useDemo) {
    const demo = getRadarModalDemoPayload();
    const narrative = buildRadarNarrativeSummary(input.sortedActions, input.sortedCommitments);
    const sections = demo.sections;
    const badgeCount = countRadarBadgeEligibleRows(sections);
    const totalItems = countRadarModalTotalItems(sections);

    return {
      ...demo,
      eyebrowLabel: formatRadarEyebrow(now),
      narrativeSummaryPlain: narrative,
      stampLines: [`${formatRadarComputedStamp(now)} · Spans 90-day window`, `${totalItems} items surfaced · ${badgeCount} actionable`],
      badgeCount,
    };
  }

  const sections = getRadarModalAppendixISkeletonSections();

  return {
    eyebrowLabel: formatRadarEyebrow(now),
    title: "On my radar",
    narrativeSummaryPlain: buildRadarNarrativeSummary(input.sortedActions, input.sortedCommitments),
    stampLines: [`${formatRadarComputedStamp(now)} · Spans 90-day window`, "0 items surfaced · 0 actionable"],
    sections,
    footerDeliveryPlain: "Daily Brief delivered also via email · Slack DM at 07:30 local (when configured)",
    badgeCount: 0,
  };
}
