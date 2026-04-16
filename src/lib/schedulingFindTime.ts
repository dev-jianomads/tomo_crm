import type { TomoAssistance } from "@/lib/mockTomoAssistance";
import type { ActionItem } from "@/lib/mockData";

/** Week containing the PAAMCO scheduling scenario (March 18, 2026 — Wednesday). */
export const SCHEDULING_SCENARIO_ANCHOR = new Date(2026, 2, 18);

export type SchedulingSlotModel = {
  /** ISO date (yyyy-mm-dd) in local TZ for the scenario week */
  dateKey: string;
  date: Date;
  /** e.g. "Wed 18" */
  dayShort: string;
  /** e.g. "Wed, Mar 18" */
  dayMedium: string;
  /** Hour in 24h local (scenario uses ET labels only in UI) */
  hour24: number;
  /** e.g. "9:00am ET" */
  timeEtLabel: string;
  available: boolean;
};

export type SchedulingDraftOverride = {
  leadText: string;
  draftContent: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Sunday-start week containing `anchor`. */
export function startOfWeekSunday(anchor: Date): Date {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Hour labels as ET (demo — no real TZ conversion).
 * `hour24` is nominal "office" hours 9–16 local to the picker.
 */
export function formatEtSlot(hour24: number): string {
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const mm = "00";
  const suffix = hour24 < 12 ? "am" : "pm";
  return `${h}:${mm}${suffix} ET`;
}

/**
 * Deterministic mock: some cells busy. Mar 18 mirrors the story (9am & 11am taken).
 */
function slotAvailable(dateKeyStr: string, hour24: number): boolean {
  const hash = (dateKeyStr.charCodeAt(dateKeyStr.length - 1) + hour24) % 7;
  if (dateKeyStr.endsWith("-18") && (hour24 === 9 || hour24 === 11)) return false;
  if (dateKeyStr.endsWith("-16") && hour24 >= 14) return false;
  if (hash === 0 || hash === 1) return false;
  return true;
}

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16] as const;

export function buildSchedulingWeekGrid(anchor: Date = SCHEDULING_SCENARIO_ANCHOR): SchedulingSlotModel[] {
  const start = startOfWeekSunday(anchor);
  const slots: SchedulingSlotModel[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dk = dateKey(date);
    const wday = date.toLocaleDateString("en-US", { weekday: "short" });
    const mon = date.toLocaleDateString("en-US", { month: "short" });
    const dayNum = date.getDate();
    const dayShort = `${wday} ${dayNum}`;
    const dayMedium = `${wday}, ${mon} ${dayNum}`;
    for (const hour24 of HOURS) {
      const timeEtLabel = formatEtSlot(hour24);
      slots.push({
        dateKey: dk,
        date,
        dayShort,
        dayMedium,
        hour24,
        timeEtLabel,
        available: slotAvailable(dk, hour24),
      });
    }
  }
  return slots;
}

export function mergeTomoAssistanceWithSchedulingOverride(
  base: TomoAssistance,
  override: SchedulingDraftOverride | undefined
): TomoAssistance {
  if (!override) return base;
  const blocks = base.initialMessage.blocks?.map((b) => {
    if (b.kind === "draft") {
      return { ...b, content: override.draftContent };
    }
    return b;
  });
  return {
    ...base,
    initialMessage: {
      ...base.initialMessage,
      text: override.leadText,
      blocks,
    },
  };
}

/**
 * Single-slot proposal replacing any prior multi-slot draft.
 */
export function buildRedraftedSchedulingCopy(
  action: ActionItem,
  slot: Pick<SchedulingSlotModel, "dayMedium" | "timeEtLabel">
): SchedulingDraftOverride {
  const card = action.attentionCard;
  const contact = card?.contactName?.split(" ")[0] ?? "there";
  const fullName = card?.contactName ?? "the contact";
  const company = card?.company ?? "their firm";

  const leadText = `${fullName} (${company}) asked for a meeting. You're offering ${slot.timeEtLabel} on ${slot.dayMedium} — draft reply proposes that time.`;

  const draftContent = `Hi ${contact} — thanks for reaching out. I'm free ${slot.dayMedium} at ${slot.timeEtLabel} for 30 minutes. Please let me know if that works and I'll send a calendar invite.\n\nBest regards,`;

  return { leadText, draftContent };
}
