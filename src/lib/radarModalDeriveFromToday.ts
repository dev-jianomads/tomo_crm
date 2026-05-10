/**
 * Phase 6 — Appendix I rows derived from Today mock + CRM relationships (no demo seed).
 * Heating / cooling / quiet use relationship momentum + recency; calendar uses Coming up.
 */

import type { ActionItem, Brief, Commitment, Relationship } from "@/lib/mockData";
import { formatDaysSinceContact } from "@/lib/mockData";
import type { RadarItem, RadarModalSection, RadarSectionId } from "@/lib/radarModalTypes";
import { getRadarModalAppendixISkeletonSections } from "@/lib/radarModalSeed";
import { isTodayAttentionSlot } from "@/lib/todayAttentionDates";

const CAP = { returning: 5, yours: 6, theirs: 4, heat: 5, cool: 5, quiet: 4, calendar: 8 } as const;

const STAGES_ACTIVE = new Set<string>(["Active diligence", "Nurturing", "First meeting", "Sourced"]);

function actionLink(id: string) {
  return { kind: "action" as const, id };
}

function commitmentLink(id: string) {
  return { kind: "commitment" as const, id };
}

function relationshipLink(id: string) {
  return { kind: "relationship" as const, id };
}

function meetingPrepLink(briefId: string) {
  return { kind: "meeting_prep" as const, id: briefId };
}

function tierFromRelationship(t: Relationship["tier"]): 1 | 2 {
  return t === "Tier 1" ? 1 : 2;
}

function patchSection(
  sections: RadarModalSection[],
  id: RadarSectionId,
  patch: Partial<RadarModalSection>,
): RadarModalSection[] {
  return sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export type DeriveRadarModalInput = {
  sortedActions: ActionItem[];
  sortedCommitments: Commitment[];
  allBriefs: Brief[];
  stillInTodoActions: ActionItem[];
  relationships: Relationship[];
};

/** Brief lookup for prep-line copy on calendar rows */
function briefById(allBriefs: Brief[], id: string | undefined): Brief | undefined {
  if (!id) return undefined;
  return allBriefs.find((b) => b.id === id);
}

export function deriveRadarModalSectionsFromToday(input: DeriveRadarModalInput): RadarModalSection[] {
  const { sortedActions, sortedCommitments, allBriefs, stillInTodoActions, relationships } = input;

  let sections: RadarModalSection[] = getRadarModalAppendixISkeletonSections().map((s) => ({ ...s }));

  /* ── 1 · Returning — surfaced but drawer never opened (engagement model) ── */
  const returningItems: RadarItem[] = stillInTodoActions.slice(0, CAP.returning).map((a) => ({
    id: `derive-ret-${a.id}`,
    tier: 2,
    lpLabel: a.attentionCard?.company ?? a.title.slice(0, 48),
    personLabel: a.attentionCard?.contactName,
    tags: [{ kind: "tier", tier: 2 }],
    evidencePlain: (a.evidence[0] ?? a.title).trim(),
    asideLines: ["Queue"],
    link: actionLink(a.id),
    ctas: [
      {
        kind: "bring_to_today",
        label: "Open in Today",
        variant: "primary",
        link: actionLink(a.id),
      },
    ],
  }));

  const retSummary =
    returningItems.length === 0
      ? "0 items · queue opened or cleared"
      : `${returningItems.length} item${returningItems.length === 1 ? "" : "s"} · surfaced, not opened yet`;

  sections = patchSection(sections, "returning_to_you", {
    items: returningItems,
    countSummary: retSummary,
    emptyMessage: returningItems.length === 0 ? sections.find((x) => x.id === "returning_to_you")?.emptyMessage : undefined,
  });

  /* ── 2 · Your commitments — approval / blocked in Today attention queue ── */
  const yoursPool = sortedActions
    .filter(isTodayAttentionSlot)
    .filter((a) => a.status === "approval" || a.status === "blocked");
  const yoursItems: RadarItem[] = yoursPool.slice(0, CAP.yours).map((a) => ({
    id: `derive-yours-${a.id}`,
    tier: 1,
    lpLabel: a.attentionCard?.company ?? "Today queue",
    personLabel: a.attentionCard?.contactName,
    tags: [{ kind: "custom", label: "Needs you", tone: "red" }],
    evidencePlain: (a.evidence[0] ?? a.title).trim(),
    asideLines: [a.status === "blocked" ? "Blocked" : "Approval"],
    link: actionLink(a.id),
    ctas: [
      {
        kind: "draft_now",
        label: "Open action",
        variant: "primary",
        link: actionLink(a.id),
      },
    ],
  }));

  sections = patchSection(sections, "commitments_yours", {
    items: yoursItems,
    countSummary:
      yoursItems.length === 0
        ? "0 due from Today queue"
        : `${yoursItems.length} in queue needing you`,
    emptyMessage: yoursItems.length === 0 ? sections.find((x) => x.id === "commitments_yours")?.emptyMessage : undefined,
  });

  /* ── 3 · Outstanding from LPs — active stages with open loops ── */
  const theirsPool = relationships
    .filter((r) => STAGES_ACTIVE.has(r.stage) && r.openLoops > 0)
    .sort((a, b) => b.openLoops - a.openLoops);
  const theirsItems: RadarItem[] = theirsPool.slice(0, CAP.theirs).map((r) => ({
    id: `derive-theirs-${r.id}`,
    tier: tierFromRelationship(r.tier),
    lpLabel: r.firm,
    personLabel: r.name,
    tags: [
      { kind: "tier", tier: tierFromRelationship(r.tier) },
      { kind: "custom", label: `${r.openLoops} open loop${r.openLoops === 1 ? "" : "s"}`, tone: "amber" },
    ],
    evidencePlain: r.nextMove,
    asideLines: [formatDaysSinceContact(r.daysSinceLastMeaningfulContact) + " since touch"],
    link: relationshipLink(r.id),
    ctas: [
      {
        kind: "draft_nudge",
        label: "Open LP record",
        variant: "subtle",
        link: relationshipLink(r.id),
      },
    ],
  }));

  sections = patchSection(sections, "commitments_theirs", {
    items: theirsItems,
    countSummary:
      theirsItems.length === 0
        ? "0 relationships with outstanding LP-side loops"
        : `${theirsItems.length} relationship${theirsItems.length === 1 ? "" : "s"} with open loops`,
    emptyMessage: theirsItems.length === 0 ? sections.find((x) => x.id === "commitments_theirs")?.emptyMessage : undefined,
  });

  /* ── 4 · Heating up ── */
  const heatPool = relationships.filter((r) => r.momentumDirection === "Heating up").sort((a, b) => {
    const ta = tierFromRelationship(a.tier);
    const tb = tierFromRelationship(b.tier);
    if (ta !== tb) return ta - tb;
    return a.daysSinceLastMeaningfulContact - b.daysSinceLastMeaningfulContact;
  });

  const heatItems: RadarItem[] = heatPool.slice(0, CAP.heat).map((r) => ({
    id: `derive-heat-${r.id}`,
    tier: tierFromRelationship(r.tier),
    lpLabel: r.firm,
    personLabel: r.name,
    tags: [
      { kind: "tier", tier: tierFromRelationship(r.tier) },
      { kind: "custom", label: "Heating up", tone: "warm" },
    ],
    evidencePlain: r.nextMove,
    asideLines: [`Last touch ${formatDaysSinceContact(r.daysSinceLastMeaningfulContact)}`],
    link: relationshipLink(r.id),
  }));

  sections = patchSection(sections, "heating_up", {
    items: heatItems,
    countSummary: heatItems.length === 0 ? "0 LPs accelerating" : `${heatItems.length} LP${heatItems.length === 1 ? "" : "s"} heating up`,
    emptyMessage: heatItems.length === 0 ? sections.find((x) => x.id === "heating_up")?.emptyMessage : undefined,
  });

  /* ── 5 · Cooling off ── */
  const coolPool = relationships.filter((r) => r.momentumDirection === "Cooling").sort((a, b) => {
    const ta = tierFromRelationship(a.tier);
    const tb = tierFromRelationship(b.tier);
    if (ta !== tb) return ta - tb;
    return b.daysSinceLastMeaningfulContact - a.daysSinceLastMeaningfulContact;
  });

  const coolItems: RadarItem[] = coolPool.slice(0, CAP.cool).map((r) => ({
    id: `derive-cool-${r.id}`,
    tier: tierFromRelationship(r.tier),
    lpLabel: r.firm,
    personLabel: r.name,
    tags: [
      { kind: "tier", tier: tierFromRelationship(r.tier) },
      { kind: "custom", label: "Cooling", tone: "cool" },
    ],
    evidencePlain: r.nextMove,
    asideLines: [`Last touch ${formatDaysSinceContact(r.daysSinceLastMeaningfulContact)}`],
    link: relationshipLink(r.id),
  }));

  sections = patchSection(sections, "cooling_off", {
    items: coolItems,
    countSummary: coolItems.length === 0 ? "0 LPs decelerating" : `${coolItems.length} LP${coolItems.length === 1 ? "" : "s"} cooling`,
    emptyMessage: coolItems.length === 0 ? sections.find((x) => x.id === "cooling_off")?.emptyMessage : undefined,
  });

  /* ── 6 · Quiet beyond cadence — active pipeline + long silence ── */
  const quietPool = relationships
    .filter((r) => STAGES_ACTIVE.has(r.stage) && r.daysSinceLastMeaningfulContact >= 10)
    .sort((a, b) => b.daysSinceLastMeaningfulContact - a.daysSinceLastMeaningfulContact);

  const quietItems: RadarItem[] = quietPool.slice(0, CAP.quiet).map((r) => ({
    id: `derive-quiet-${r.id}`,
    tier: tierFromRelationship(r.tier),
    lpLabel: r.firm,
    personLabel: r.name,
    tags: [
      { kind: "tier", tier: tierFromRelationship(r.tier) },
      { kind: "custom", label: `${r.daysSinceLastMeaningfulContact}d quiet`, tone: "amber" },
    ],
    evidencePlain: `${r.stage} · ${r.nextMove}`,
    asideLines: ["Beyond typical cadence"],
    link: relationshipLink(r.id),
  }));

  sections = patchSection(sections, "quiet_beyond_cadence", {
    items: quietItems,
    countSummary:
      quietItems.length === 0
        ? "0 diligence threads unusually quiet"
        : `${quietItems.length} thread${quietItems.length === 1 ? "" : "s"} quiet vs typical`,
    emptyMessage: quietItems.length === 0 ? sections.find((x) => x.id === "quiet_beyond_cadence")?.emptyMessage : undefined,
  });

  /* ── 7 · Next 7 days — Coming up (commitments + optional brief prep link) ── */
  const calPool = sortedCommitments.slice(0, CAP.calendar);
  const calItems: RadarItem[] = calPool.map((c) => {
    const rel = c.relationshipId ? relationships.find((x) => x.id === c.relationshipId) : undefined;
    const rowTier: 1 | 2 = rel ? tierFromRelationship(rel.tier) : 2;

    const br = briefById(allBriefs, c.briefId);
    const prepLine = br ? `Prep: ${br.meetingTitle} · ${br.summary.slice(0, 120)}${br.summary.length > 120 ? "…" : ""}` : c.title;
    const link = c.briefId ? meetingPrepLink(c.briefId) : commitmentLink(c.id);
    return {
      id: `derive-cal-${c.id}`,
      tier: rowTier,
      lpLabel: c.lp,
      personLabel: c.contactName,
      tags: [
        {
          kind: "custom" as const,
          label: c.window === "today" ? "Today" : "Coming up",
          tone: "neutral" as const,
        },
      ],
      evidencePlain: `${c.datetime} — ${prepLine}`,
      asideLines: [c.prepStatus === "ready" ? "Prep ready" : "Prep"],
      link,
      ctas: c.briefId
        ? [
            {
              kind: "draft_now" as const,
              label: "Open prep",
              variant: "primary" as const,
              link: meetingPrepLink(c.briefId),
            },
          ]
        : [
            {
              kind: "draft_now" as const,
              label: "Open meeting",
              variant: "primary" as const,
              link: commitmentLink(c.id),
            },
          ],
    };
  });

  sections = patchSection(sections, "next_7_days", {
    items: calItems,
    countSummary:
      calItems.length === 0
        ? "0 meetings on Coming up"
        : `${calItems.length} meeting${calItems.length === 1 ? "" : "s"} · Coming up`,
    emptyMessage: calItems.length === 0 ? sections.find((x) => x.id === "next_7_days")?.emptyMessage : undefined,
  });

  /* Clear emptyMessage when section has rows */
  sections = sections.map((s) =>
    s.items.length > 0 ? { ...s, emptyMessage: undefined } : s,
  );

  return sections;
}
