/**
 * Demo seed data for the Radar Modal (Phase 2 — mock CRM).
 * Aligns with `design/tomo_radar_modal_v1.html` (v2 — five-section Appendix I) and SRS Appendix I.
 * Action/commitment ids reference {@link ./mockData} where possible for drawer navigation.
 */

import type { RadarItem, RadarModalPayload, RadarModalSection, RadarNavigateLink } from "@/lib/radarModalTypes";

const action = (id: string): RadarNavigateLink => ({ kind: "action", id });
const commitment = (id: string): RadarNavigateLink => ({ kind: "commitment", id });
const brief = (id: string): RadarNavigateLink => ({ kind: "brief", id });
const relationship = (id: string): RadarNavigateLink => ({ kind: "relationship", id });

/** Rows that count toward the entry badge per Appendix I.6 (navigable / CTA with link). */
function countBadgeEligibleInItems(items: readonly RadarItem[]): number {
  let n = 0;
  for (const item of items) {
    if (item.link) {
      n++;
      continue;
    }
    const ctaLinked = item.ctas?.some((c) => c.link != null);
    if (ctaLinked) n++;
  }
  return n;
}

export function countRadarBadgeEligibleRows(sections: readonly RadarModalSection[]): number {
  let n = 0;
  for (const sec of sections) {
    n += countBadgeEligibleInItems(sec.items);
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        n += countBadgeEligibleInItems(sub.items);
      }
    }
  }
  return n;
}

export function countRadarModalTotalItems(sections: readonly RadarModalSection[]): number {
  let n = 0;
  for (const sec of sections) {
    n += sec.items.length;
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        n += sub.items.length;
      }
    }
  }
  return n;
}

function demoSections(): RadarModalSection[] {
  const commitments: RadarModalSection = {
    id: "commitments",
    title: "Commitments",
    countSummary: "8 rows · returning, yours, and LP-side",
    defaultCollapsed: false,
    items: [],
    subsections: [
      {
        id: "commitments_returning",
        title: "Returning to you",
        countSummary: "3 items · snoozes expired today",
        emptyMessage: "Nothing returning from snooze today.",
        items: [
          {
            id: "radar-ret-1",
            tier: 1,
            lpLabel: "CPPIB",
            personLabel: "Frank Ieraci",
            tags: [
              { kind: "tier", tier: 1 },
              { kind: "custom", label: "Tier 1", tone: "teal" },
            ],
            evidencePlain:
              "You snoozed Frank's intro to the Toronto private credit team on Tuesday. The snooze just expired and his reply velocity has tightened since — last three exchanges 22h, 14h, 6h against typical 18h.",
            asideLines: ["Snoozed Tue", "2 days"],
            ctas: [
              {
                kind: "bring_to_today",
                label: "Bring to Today",
                variant: "primary",
                link: relationship("r6"),
              },
            ],
          },
          {
            id: "radar-ret-2",
            tier: 2,
            lpLabel: "Albourne",
            personLabel: "James Staltari",
            tags: [{ kind: "tier", tier: 2 }],
            evidencePlain:
              "Operational due-diligence questionnaire from Albourne ops team. You snoozed for 48 hours on Tuesday to gather inputs from Lisa.",
            asideLines: ["Snoozed Tue", "2 days"],
            ctas: [
              {
                kind: "bring_to_today",
                label: "Bring to Today",
                variant: "subtle",
                link: relationship("r7"),
              },
            ],
          },
          {
            id: "radar-ret-3",
            tier: 2,
            lpLabel: "Lingotto Investment Management",
            personLabel: "Edoardo Lanzavecchia",
            tags: [{ kind: "tier", tier: 2 }],
            evidencePlain:
              "Follow-up email after the Mosaic introduction. Snoozed 5 days to land after the Apr 30 Lingotto Q1 publication.",
            asideLines: ["Snoozed Sat", "5 days"],
            ctas: [
              {
                kind: "bring_to_today",
                label: "Bring to Today",
                variant: "subtle",
                link: action("a6"),
              },
            ],
          },
        ],
      },
      {
        id: "commitments_yours",
        title: "Your commitments approaching",
        countSummary: "2 due in next 3 days",
        emptyMessage: "No commitments due in the next three days.",
        items: [
          {
            id: "radar-comy-1",
            tier: 1,
            lpLabel: "Albourne",
            personLabel: "James Staltari",
            tags: [{ kind: "custom", label: "Due tomorrow", tone: "red" }],
            evidencePlain:
              'You promised the portfolio positioning deck and Q1 attribution detail "by end of week" on Wednesday\'s call. Tomorrow is Friday. No draft yet — not currently in Today\'s queue.',
            asideLines: ["Promised Wed", "1 day left"],
            ctas: [
              {
                kind: "draft_now",
                label: "Draft now",
                variant: "primary",
                link: action("a3"),
              },
            ],
          },
          {
            id: "radar-comy-2",
            tier: null,
            lpLabel: "UBS Hedge Fund Solutions",
            personLabel: "Charly Malek",
            tags: [{ kind: "custom", label: "Due Mon", tone: "amber" }],
            evidencePlain:
              'Side-letter terms summary (Fund II precedent) was the open ask from Charly\'s Mar 4 email. You promised it for "early next week" on Apr 28 — Monday is the natural landing point.',
            asideLines: ["Promised Apr 28", "4 days left"],
            ctas: [
              {
                kind: "draft_now",
                label: "Draft now",
                variant: "subtle",
                link: commitment("c1"),
              },
            ],
          },
        ],
      },
      {
        id: "commitments_theirs",
        title: "Outstanding from your LPs",
        countSummary: "3 past their typical turnaround",
        emptyMessage: "No LP-side items are past typical turnaround.",
        items: [
          {
            id: "radar-lp-1",
            tier: 1,
            lpLabel: "PAAMCO Prisma",
            personLabel: "Operations team",
            tags: [
              { kind: "tier", tier: 1 },
              { kind: "custom", label: "Past stated turnaround", tone: "amber" },
            ],
            evidencePlain:
              "DDQ submitted to PAAMCO ops 9 days ago. Their stated turnaround is 5–7 business days. Peter Zakowich has been responsive elsewhere — last reply 6h ago on the scheduling thread.",
            asideLines: ["Sent Apr 28", "9 days"],
            ctas: [
              {
                kind: "draft_nudge",
                label: "Draft a nudge",
                variant: "primary",
                link: action("a1"),
              },
            ],
          },
          {
            id: "radar-lp-2",
            tier: 2,
            lpLabel: "Cambridge Associates",
            personLabel: "Stuart Reid",
            tags: [{ kind: "tier", tier: 2 }],
            evidencePlain:
              "Stuart said he'd intro you to two more LPs after the GIC connection landed. 8 days since that email. GIC intro completed Apr 30 — the trigger has cleared.",
            asideLines: ["Promised Apr 29", "8 days"],
            ctas: [
              {
                kind: "draft_nudge",
                label: "Draft a nudge",
                variant: "subtle",
                link: action("a7"),
              },
            ],
          },
          {
            id: "radar-lp-3",
            tier: 2,
            lpLabel: "Goldman Sachs",
            personLabel: "Michel del Buono",
            tags: [{ kind: "tier", tier: 2 }],
            evidencePlain:
              'Promised intro to Edmond de Rothschild Family Office 11 days ago. Reply velocity in the thread has been 2-day average; latest acknowledgement was "working on it" on Apr 29.',
            asideLines: ["Promised Apr 26", "11 days"],
            ctas: [
              {
                kind: "draft_nudge",
                label: "Draft a nudge",
                variant: "subtle",
                link: action("a2"),
              },
            ],
          },
        ],
      },
    ],
  };

  const heating: RadarModalSection = {
    id: "heating_up",
    title: "Heating up",
    countSummary: "2 LPs accelerating",
    defaultCollapsed: false,
    direction: "positive",
    items: [
      {
        id: "radar-heat-1",
        tier: 1,
        lpLabel: "CPPIB",
        personLabel: "Frank Ieraci",
        tags: [
          { kind: "tier", tier: 1 },
          { kind: "custom", label: "Accelerating", tone: "warm" },
        ],
        evidencePlain:
          "Reply velocity halved this week. Last three exchanges: 22h, 14h, 6h against typical 18h. Frank initiated 2 of last 5 exchanges — first time since January.",
        asideLines: ["Last 14 days"],
        link: relationship("r6"),
      },
      {
        id: "radar-heat-2",
        tier: 2,
        lpLabel: "Brookfield Asset Management",
        personLabel: "Lawrence Chiu",
        tags: [
          { kind: "tier", tier: 2 },
          { kind: "custom", label: "Inbound activity", tone: "warm" },
        ],
        evidencePlain:
          "Two unsolicited inbound messages in the last 30 days — both with technical questions on the strategy. No prior LP-initiated contact in the preceding 90 days.",
        asideLines: ["Last 30 days"],
      },
    ],
  };

  const cooling: RadarModalSection = {
    id: "cooling_off",
    title: "Cooling off",
    countSummary: "3 LPs decelerating",
    defaultCollapsed: true,
    direction: "negative",
    items: [
      {
        id: "radar-cool-1",
        tier: 1,
        lpLabel: "Lingotto Investment Management",
        personLabel: "Edoardo Lanzavecchia",
        tags: [
          { kind: "tier", tier: 1 },
          { kind: "custom", label: "Decelerating", tone: "cool" },
        ],
        evidencePlain:
          "Reply length dropped from ~110 words across earlier exchanges to ~35 words in the last three. Reply time has been slowing — last three replies took 4d, 6d, 9d against typical 2d.",
        asideLines: ["Last 21 days"],
        link: action("a6"),
      },
      {
        id: "radar-cool-2",
        tier: 2,
        lpLabel: "UBS Wealth Management",
        personLabel: "Patrick Müller",
        tags: [
          { kind: "tier", tier: 2 },
          { kind: "custom", label: "One-way contact", tone: "cool" },
        ],
        evidencePlain:
          "Last contact was one-way: your email on Apr 25 has not received a reply (12 days). Within the typical silence threshold for Patrick (14 days) but worth noting.",
        asideLines: ["12 days quiet"],
      },
      {
        id: "radar-cool-3",
        tier: 2,
        lpLabel: "Caisse de dépôt et placement du Québec",
        personLabel: "Marie-Claude Dumas",
        tags: [{ kind: "custom", label: "Stage stagnation", tone: "cool" }],
        evidencePlain:
          'In "first meeting" stage for 62 days. Spent 14 days in prior stage. Average for active diligence threads is 28 days.',
        asideLines: ["62d in stage"],
      },
    ],
  };

  const goneQuiet: RadarModalSection = {
    id: "gone_quiet",
    title: "Gone quiet",
    countSummary: "2 active diligence threads silent past typical",
    defaultCollapsed: true,
    items: [
      {
        id: "radar-q-1",
        tier: 1,
        lpLabel: "Brookfield Asset Management",
        personLabel: "Lawrence Chiu",
        tags: [
          { kind: "tier", tier: 1 },
          { kind: "custom", label: "11 days silent", tone: "amber" },
        ],
        evidencePlain:
          "No meaningful contact in 11 days. Typical silence between exchanges is 4 days. Note: this LP also appears in Heating up — inbound activity is from a different team contact (Suresh Patel).",
        asideLines: ["11d quiet"],
      },
      {
        id: "radar-q-2",
        tier: 2,
        lpLabel: "PineBridge Investments",
        personLabel: "Ravi Bulchandani",
        tags: [
          { kind: "tier", tier: 2 },
          { kind: "custom", label: "9 days silent", tone: "amber" },
        ],
        evidencePlain:
          "No reply since Apr 28 acknowledgement of the Q1 deck. Typical reply window is 3–5 days. Ravi was OOO last week per his auto-responder.",
        asideLines: ["9d quiet"],
        link: action("a8"),
      },
    ],
  };

  const next7: RadarModalSection = {
    id: "next_7_days",
    title: "Next 7 days at a glance",
    countSummary: "2 things to flag ahead of time",
    defaultCollapsed: false,
    items: [
      {
        id: "radar-cal-1",
        tier: null,
        lpLabel: "First-meeting density",
        personLabel: "Tuesday May 13",
        tags: [{ kind: "custom", label: "Calendar tension", tone: "neutral" }],
        evidencePlain:
          "Three first meetings on Tuesday: BNF Capital (10am), Edmond de Rothschild (12pm), GIC second-call (3pm). Tier 1 or Tier 2. Two have no prior interaction history — prep needs ~45 min each.",
        asideLines: ["Tue May 13", "6 days out"],
        link: brief("b3"),
      },
      {
        id: "radar-cal-2",
        tier: null,
        lpLabel: "Quarterly LP review window",
        personLabel: "Closes Wed May 14",
        tags: [{ kind: "custom", label: "Process cadence", tone: "neutral" }],
        evidencePlain:
          "Eleven Tier 1 LPs are due for their Q2 review. 3 reviewed so far. Workspace target is to complete the cohort by mid-quarter.",
        asideLines: ["Wed May 14", "7 days out"],
      },
    ],
  };

  return [commitments, heating, cooling, goneQuiet, next7];
}

/**
 * Full demo payload for Today / Storybook / tests. Not wired to the live page until Phase 3+.
 */
export function getRadarModalDemoPayload(): RadarModalPayload {
  const sections = demoSections();
  const badgeCount = countRadarBadgeEligibleRows(sections);
  const totalItems = countRadarModalTotalItems(sections);

  return {
    eyebrowLabel: "Daily Brief · Thursday 7 May",
    title: "On my radar",
    narrativeSummaryPlain:
      "Three items returning from snooze, one commitment due tomorrow that you haven't drafted, and Frank Ieraci re-engaged after 18 days quiet. Two diligence threads have gone quieter than their typical cadence — Brookfield and Lingotto. PAAMCO's DDQ is now nine days out against their stated five-to-seven.",
    stampLines: [
      "Computed 06:30 · Spans 90-day window",
      `${totalItems} items surfaced · ${badgeCount} actionable`,
    ],
    sections,
    footerDeliveryPlain: "Daily Brief delivered also via email · Slack DM at 07:30 local (when configured)",
    badgeCount,
  };
}

export const RADAR_MODAL_DEMO_SECTIONS: readonly RadarModalSection[] = demoSections();

/**
 * Section shells for `buildRadarModalPayload` when demo rows are off — keeps Appendix I
 * structure visible until live derivation populates rows (Phase 5).
 */
export function getRadarModalAppendixISkeletonSections(): RadarModalSection[] {
  return [
    {
      id: "commitments",
      title: "Commitments",
      countSummary: "0 rows · returning, yours, and LP-side",
      defaultCollapsed: false,
      items: [],
      subsections: [
        {
          id: "commitments_returning",
          title: "Returning to you",
          countSummary: "0 items · snoozes expired today",
          items: [],
          emptyMessage: "Nothing returning from snooze today.",
        },
        {
          id: "commitments_yours",
          title: "Your commitments approaching",
          countSummary: "0 due in next 3 days",
          items: [],
          emptyMessage: "No commitments due in the next three days.",
        },
        {
          id: "commitments_theirs",
          title: "Outstanding from your LPs",
          countSummary: "0 past their typical turnaround",
          items: [],
          emptyMessage: "No LP-side items are past typical turnaround.",
        },
      ],
      emptyMessage: "No commitment rows for this window.",
    },
    {
      id: "heating_up",
      title: "Heating up",
      countSummary: "0 LPs accelerating",
      defaultCollapsed: false,
      direction: "positive",
      items: [],
      emptyMessage: "No positive momentum signals for today.",
    },
    {
      id: "cooling_off",
      title: "Cooling off",
      countSummary: "0 LPs decelerating",
      defaultCollapsed: true,
      direction: "negative",
      items: [],
      emptyMessage: "No deceleration signals for today.",
    },
    {
      id: "gone_quiet",
      title: "Gone quiet",
      countSummary: "0 threads silent past typical",
      defaultCollapsed: true,
      items: [],
      emptyMessage: "No diligence threads are quieter than usual.",
    },
    {
      id: "next_7_days",
      title: "Next 7 days at a glance",
      countSummary: "0 items to flag ahead of time",
      defaultCollapsed: false,
      items: [],
      emptyMessage: "Nothing flagged on the calendar horizon.",
    },
  ];
}
