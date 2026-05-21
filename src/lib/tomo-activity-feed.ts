import { actions, formatDaysSinceContact, type ActionItem, type Relationship } from "./mockData";
import { resolveWorkflowPillLabelForAction } from "@/lib/workflow-pill-label";
import { suggestedPlaybooks } from "./mockPlaybooks";

export type TomoActivityEventType = "outreach" | "update" | "meeting" | "system";

export type TomoActivityPageEvent = {
  id: string;
  when: string;
  actor: "TOMO";
  summary: string;
  type: TomoActivityEventType;
  entity?: string;
  /** Matches `FundProvider` default ids for fund filter */
  fundId?: string;
  workflowLabel?: string;
  actionId?: string;
  /** Parent Today card title when derived from `actions[].activityLog` */
  actionTitle?: string;
};

const FIRM_TO_FUND: Record<string, string> = {
  "Northwind Capital": "fund-1",
  "Peakline Partners": "fund-2",
  "Lumen LP": "fund-3",
  "Harborlight Advisors": "fund-1",
};

function hashFundId(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ["fund-1", "fund-2", "fund-3"][h % 3]!;
}

function fundIdForActivityEntity(entity?: string): string | undefined {
  if (!entity) return undefined;
  const firm = entity.split(" · ")[0]!.trim();
  return FIRM_TO_FUND[firm] ?? hashFundId(firm);
}

function workflowLabelForAction(a: ActionItem): string | undefined {
  return resolveWorkflowPillLabelForAction(a) ?? undefined;
}

function entityLabelFromAction(a: ActionItem): string | undefined {
  if (a.attentionCard) {
    const { company, contactName } = a.attentionCard;
    return contactName ? `${company} · ${contactName}` : company;
  }
  return undefined;
}

function actionTypeToTomoActivityType(t: ActionItem["type"]): TomoActivityEventType {
  switch (t) {
    case "outreach":
      return "outreach";
    case "scheduling":
      return "meeting";
    case "crm_update":
      return "update";
    case "follow_up":
      return "outreach";
    default:
      return "update";
  }
}

function whenSortRank(w: string): number {
  if (w.startsWith("Today")) return 4;
  if (w.startsWith("Yesterday")) return 3;
  if (/^\d+d ago/.test(w)) return 2;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(w)) return 1;
  return 0;
}

function sortTomoActivityPageEvents(events: TomoActivityPageEvent[]): TomoActivityPageEvent[] {
  return [...events].sort((a, b) => whenSortRank(b.when) - whenSortRank(a.when));
}

/**
 * Derived Tomo-only log for `/activity`: TOMO lines from `actions[].activityLog`
 * plus a small synthetic set tied to CRM + playbook copy (mock only).
 */
export function getTomoActivityPageEvents(relationships: Relationship[]): TomoActivityPageEvent[] {
  const fromActions: TomoActivityPageEvent[] = [];
  for (const a of actions) {
    const wf = workflowLabelForAction(a);
    const entity = entityLabelFromAction(a);
    const fundId = fundIdForActivityEntity(entity);
    const type = actionTypeToTomoActivityType(a.type);
    for (const log of a.activityLog) {
      if (log.actor !== "TOMO") continue;
      fromActions.push({
        id: `${a.id}-${log.id}`,
        when: log.ts,
        actor: "TOMO",
        summary: log.summary,
        type,
        entity,
        fundId,
        workflowLabel: wf,
        actionId: a.id,
        actionTitle: a.title,
      });
    }
  }

  const rNorthwind = relationships.find((r) => r.firm === "Northwind Capital");
  const rPeakline = relationships.find((r) => r.firm === "Peakline Partners");
  const rLumen = relationships.find((r) => r.firm === "Lumen LP");
  const introPlaybook = suggestedPlaybooks.find((p) => p.id === "pb-intro-tracker");

  const synthetic: TomoActivityPageEvent[] = [
    {
      id: "syn-intro-tracker",
      when: "Today 06:00",
      actor: "TOMO",
      summary: `Ran Warm Intro Tracker on Tier 1 / Heating Up — ${introPlaybook?.targetCount ?? 1} LP in SLA window`,
      type: "system",
      entity: "Warm Intro Tracker",
      fundId: "fund-1",
      workflowLabel: "Warm Intro Tracker",
    },
    {
      id: "syn-post-meeting",
      when: "Today 06:15",
      actor: "TOMO",
      summary: "Post-Meeting playbook: aligned transcript signals with open follow-up drafts",
      type: "meeting",
      entity: "Post-Meeting Follow-Up",
      fundId: "fund-2",
      workflowLabel: "Post-Meeting Follow-Up",
    },
    {
      id: "syn-lumen-cooling",
      when: "Yesterday 17:00",
      actor: "TOMO",
      summary: rLumen
        ? `Relationship scan — ${rLumen.firm} (${rLumen.momentumDirection}, ${formatDaysSinceContact(rLumen.daysSinceLastMeaningfulContact)} since meaningful contact)`
        : "Relationship scan — flagged cooling LP for re-engage playbook",
      type: "update",
      entity: rLumen ? `${rLumen.firm} · ${rLumen.name}` : "Lumen LP",
      fundId: "fund-3",
      workflowLabel: "Silence → Re-engage",
    },
    {
      id: "syn-newsletter-segment",
      when: "Yesterday 11:20",
      actor: "TOMO",
      summary: "Newsletter engagement job: tiered opens vs trailing month for Tier 1–2 cohort",
      type: "outreach",
      entity: "Update → Follow-Up",
      fundId: "fund-1",
      workflowLabel: "Update → Follow-Up",
    },
    {
      id: "syn-northwind-nextmove",
      when: "Mon 09:00",
      actor: "TOMO",
      summary: rNorthwind
        ? `Suggested next-move refresh for ${rNorthwind.firm} — stage “${rNorthwind.stage}”, ${rNorthwind.openLoops} open loops`
        : "Suggested next-move refresh for Tier 1 LP",
      type: "update",
      entity: rNorthwind ? `${rNorthwind.firm} · ${rNorthwind.name}` : "Northwind Capital",
      fundId: "fund-1",
      workflowLabel: "Update → Follow-Up",
    },
    {
      id: "syn-peakline-ddq",
      when: "Mon 08:45",
      actor: "TOMO",
      summary: rPeakline
        ? `Queued DDQ answer matching for ${rPeakline.firm} (playbook sandbox)`
        : "Queued DDQ answer matching (sandbox)",
      type: "system",
      entity: "DDQ Response Engine",
      fundId: "fund-2",
      workflowLabel: "DDQ Response Engine",
    },
  ];

  return sortTomoActivityPageEvents([...synthetic, ...fromActions]);
}
