import type { Relationship, Stage } from "@/lib/mockData";

function hashInt(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 1000;
}

/** Demo `lp_state.days_in_current_stage` — aligned with relationshipDrawerMocks. */
export function mockDaysInCurrentStageForTouches(rel: Relationship): number {
  const base = 10 + (hashInt(rel.id, 11) % 45);
  return Math.min(base + Math.floor(rel.daysSinceLastMeaningfulContact / 14), 120);
}

/** Deterministic mock counts when CSV/generated rows omit explicit values (SRS BR-3.5.15). */
export function deriveMockTouchesInStage(
  rel: Pick<Relationship, "id" | "stage" | "daysSinceLastMeaningfulContact" | "openLoops" | "lastMeetingDate">,
): Pick<Relationship, "meaningfulTouchesSinceStageEntry" | "meetingsSinceStageEntry"> {
  const h = hashInt(rel.id, 41);
  const hasRecentMeeting = Boolean(rel.lastMeetingDate) && rel.daysSinceLastMeaningfulContact <= 21;

  if (rel.stage === "Nurturing") {
    const meaningfulTouchesSinceStageEntry = 1 + (h % 6) + Math.min(rel.openLoops, 2);
    const meetingsSinceStageEntry = hasRecentMeeting
      ? Math.min(meaningfulTouchesSinceStageEntry, 1 + (h % 3))
      : Math.min(1, meaningfulTouchesSinceStageEntry);
    return { meaningfulTouchesSinceStageEntry, meetingsSinceStageEntry };
  }

  if (rel.stage === "Active diligence" || rel.stage === "First meeting") {
    const meaningfulTouchesSinceStageEntry =
      rel.daysSinceLastMeaningfulContact <= 28 ? 1 + (h % 4) : h % 2;
    const meetingsSinceStageEntry = hasRecentMeeting
      ? Math.min(meaningfulTouchesSinceStageEntry, 1 + (h % 2))
      : 0;
    return { meaningfulTouchesSinceStageEntry, meetingsSinceStageEntry };
  }

  const meaningfulTouchesSinceStageEntry =
    rel.daysSinceLastMeaningfulContact <= 14 && hasRecentMeeting ? 1 + (h % 2) : h % 2 === 0 ? 1 : 0;
  return {
    meaningfulTouchesSinceStageEntry,
    meetingsSinceStageEntry: hasRecentMeeting && meaningfulTouchesSinceStageEntry > 0 ? 1 : 0,
  };
}

export function enrichTouchesInStage(rel: Relationship): Relationship {
  if (
    rel.meaningfulTouchesSinceStageEntry !== undefined &&
    rel.meetingsSinceStageEntry !== undefined
  ) {
    return rel;
  }
  const derived = deriveMockTouchesInStage(rel);
  return {
    ...rel,
    meaningfulTouchesSinceStageEntry:
      rel.meaningfulTouchesSinceStageEntry ?? derived.meaningfulTouchesSinceStageEntry,
    meetingsSinceStageEntry: rel.meetingsSinceStageEntry ?? derived.meetingsSinceStageEntry,
  };
}

export function resetTouchesInStageOnStageChange(rel: Relationship, newStage: Stage): Relationship {
  return enrichTouchesInStage({
    ...rel,
    stage: newStage,
    meaningfulTouchesSinceStageEntry: 0,
    meetingsSinceStageEntry: 0,
  });
}

function touchLabel(n: number): string {
  return n === 1 ? "1 touch" : `${n} touches`;
}

function meetingLabel(m: number): string {
  return m === 1 ? "1 meeting" : `${m} meetings`;
}

/** List / cards secondary line (BR-3.10.6). */
export function formatTouchesInStageListSecondary(rel: Relationship): string {
  const n = rel.meaningfulTouchesSinceStageEntry ?? 0;
  const m = rel.meetingsSinceStageEntry ?? 0;
  if (n === 0) return "No touches in stage yet";
  let line = `${touchLabel(n)} in stage`;
  if (m > 0) line += ` · ${meetingLabel(m)}`;
  return line;
}

/** Kanban card meta line (BR-3.10.6). */
export function formatKanbanTouchesMeta(rel: Relationship): string {
  const n = rel.meaningfulTouchesSinceStageEntry ?? 0;
  const days = rel.daysSinceLastMeaningfulContact;
  const lastPart =
    days <= 0 ? "Last touch today" : `last ${days}d`;

  if (rel.stage === "Nurturing" && n === 0) {
    const daysIn = mockDaysInCurrentStageForTouches(rel);
    return `No touches yet · ${daysIn}d in stage`;
  }

  if (n === 0) return "";

  return `${touchLabel(n)} · ${lastPart}`;
}

export function shouldShowKanbanTouchesMeta(rel: Relationship): boolean {
  if (rel.stage === "Nurturing") return true;
  return (rel.meaningfulTouchesSinceStageEntry ?? 0) > 0;
}

/** Drawer pipeline state + optional nurturing signal-evidence prefix. */
export function formatDrawerTouchesInStage(rel: Relationship): {
  primary: string;
  meetingCaption: string | null;
} {
  const n = rel.meaningfulTouchesSinceStageEntry ?? 0;
  const m = rel.meetingsSinceStageEntry ?? 0;
  const primary =
    n === 0
      ? "0 meaningful touches"
      : n === 1
        ? "1 meaningful touch"
        : `${n} meaningful touches`;
  const meetingCaption =
    m > 0
      ? `${meetingLabel(m)} since entered ${rel.stage.toLowerCase()} (demo)`
      : null;
  return { primary, meetingCaption };
}

export function formatNurturingEvidenceTouchesPrefix(rel: Relationship): string | null {
  if (rel.stage !== "Nurturing") return null;
  const n = rel.meaningfulTouchesSinceStageEntry ?? 0;
  const d = rel.daysSinceLastMeaningfulContact;
  const touchPart = n === 0 ? "No meaningful touches in nurturing" : `${n} meaningful touch${n === 1 ? "" : "es"} in nurturing`;
  const ago = d <= 0 ? "today" : `${d}d ago`;
  return `${touchPart} · last touch ${ago} — `;
}
