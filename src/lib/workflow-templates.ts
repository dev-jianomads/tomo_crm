import type { PlaybookType } from "./mockPlaybooks";

export type WorkflowStep = {
  name: string;
  type: "action" | "wait";
  description: string;
  duration?: string;
  condition?: string;
};

export type WorkflowDefinition = {
  title: string;
  trigger: string;
  steps: WorkflowStep[];
};

// ── Default templates per playbook type ─────────────────────────────────────

const FOLLOW_UP: WorkflowDefinition = {
  title: "Follow-up After Update",
  trigger: "Investor update email sent",
  steps: [
    { name: "Wait", type: "wait", duration: "5 business days", description: "Allow time for organic reply" },
    { name: "Check Reply", type: "action", description: "Scan thread for any response" },
    { name: "Create Draft", type: "action", description: "Draft a gentle follow-up (max 1 attempt)", condition: "No reply detected" },
  ],
};

const WARM_CADENCE: WorkflowDefinition = {
  title: "Warm Touch Cadence",
  trigger: "Scheduled cadence timer fires",
  steps: [
    { name: "Wait", type: "wait", duration: "21 / 45 / 90 days by tier", description: "Tier-based interval" },
    { name: "Check Skip", type: "action", description: "Skip if inbound 14d or outbound 7d", condition: "Recent interaction found" },
    { name: "Create Draft", type: "action", description: "Draft a light-touch message" },
  ],
};

const RE_ENGAGE: WorkflowDefinition = {
  title: "Re-engage Stale LP",
  trigger: "No interaction detected for 120+ days",
  steps: [
    { name: "Nudge", type: "action", description: "Send initial re-engagement touch" },
    { name: "Wait", type: "wait", duration: "14 days", description: "Allow time for response" },
    { name: "Value Add", type: "action", description: "Share relevant insight or update", condition: "No reply to nudge" },
    { name: "Wait", type: "wait", duration: "14 days", description: "Final wait period" },
    { name: "Request Call", type: "action", description: "Propose a brief catch-up call", condition: "Still no reply" },
  ],
};

const INTRO_TRACKING: WorkflowDefinition = {
  title: "Warm LP Intro Tracker",
  trigger: "Someone CCs an introduction email",
  steps: [
    { name: "Detect Intro", type: "action", description: "Scan inbox for CC'd introductions" },
    { name: "Log Contact", type: "action", description: "Log contact details in CRM with intro source" },
    { name: "Draft Reply", type: "action", description: "Draft reply for review, remind to send within 24h" },
    { name: "Wait for Reply", type: "wait", duration: "48h", description: "Monitor inbox for LP reply" },
    { name: "Escalate", type: "action", description: "Flag for manual follow-up if LP is silent", condition: "No reply after wait" },
  ],
};

export const DEFAULT_TEMPLATES: Record<PlaybookType, WorkflowDefinition> = {
  follow_up: FOLLOW_UP,
  warm_cadence: WARM_CADENCE,
  re_engage: RE_ENGAGE,
  intro_tracking: INTRO_TRACKING,
};

// ── Context-aware suggestion chips per playbook type ────────────────────────

export const PLAYBOOK_SUGGESTIONS: Record<PlaybookType, string[]> = {
  follow_up: [
    "Change wait to 3 business days",
    "Add a second follow-up if Jamie still hasn't replied",
    "Escalate to a call request after 2 failed attempts",
    "Only trigger for Tier 1 LPs like Northwind",
  ],
  warm_cadence: [
    "Make Tier 1 cadence weekly for Alex & Jamie",
    "Add a step to check deck engagement first",
    "Skip LPs who opened the last investor update",
    "Add a personalized note referencing Q4 performance",
  ],
  re_engage: [
    "Shorten wait to 7 days — Samir's been quiet too long",
    "Add a touch sharing the Q4 Performance Deck",
    "Change trigger to 90 days instead of 120",
    "Remove the call request step",
  ],
  intro_tracking: [
    "Add a thank-you note to the introducer",
    "Change wait to 24 hours",
    "Add a step to schedule a meeting after reply",
    "Escalate to Slack if no reply after 72 hours",
  ],
};

// ── Mock context blurbs per playbook type ───────────────────────────────────

const PLAYBOOK_CONTEXT: Record<PlaybookType, string> = {
  follow_up:
    `Currently targeting 12 Tier 1-2 LPs in Heating stage.\n` +
    `Recent activity: Jamie Chen (Peakline) opened deck 3x but no reply. ` +
    `Alex Morgan (Northwind) last touched 3d ago via call.`,
  warm_cadence:
    `Running across 28 LPs. Tier-based intervals: A=21d, B=45d, C=90d.\n` +
    `Alex Morgan is due for a touch in 4 days. ` +
    `Priya Desai (Lumen) last contacted 14d ago — no reply.`,
  re_engage:
    `5 LPs flagged as stale (120+ days). Samir Patel (Harborlight) ` +
    `hasn't responded in 21d and has 0 open loops.\n` +
    `Priya Desai (Lumen) momentum is Cooling — 3 open loops.`,
  intro_tracking:
    `No active intros being tracked yet.\n` +
    `Last intro logged: Jamie Chen introduced via Alex Morgan's network. ` +
    `Reply pending from Peakline Partners.`,
};

// ── Welcome summary for initial chat context ────────────────────────────────

export function workflowSummary(
  def: WorkflowDefinition,
  playbookType: PlaybookType
): string {
  const stepList = def.steps
    .map((s, i) => {
      const badge =
        s.type === "wait" ? `⏳ ${s.duration ?? "wait"}` : `→ ${s.description}`;
      return `${i + 1}. ${s.name} — ${badge}`;
    })
    .join("\n");
  const context = PLAYBOOK_CONTEXT[playbookType];
  return (
    `${def.title}\nTrigger: ${def.trigger}\n\n` +
    `${stepList}\n\n` +
    `${context}\n\n` +
    `Ask me to add, remove, or change any step.`
  );
}

// ── Markdown generation from structured data ────────────────────────────────

export function workflowToMarkdown(def: WorkflowDefinition): string {
  const lines: string[] = [`# ${def.title}`, "", `## Trigger`, def.trigger, "", `## Steps`, ""];
  def.steps.forEach((step, i) => {
    lines.push(`### ${i + 1}. ${step.name}`);
    lines.push(`- type: ${step.type}`);
    lines.push(`- description: ${step.description}`);
    if (step.duration) lines.push(`- duration: ${step.duration}`);
    if (step.condition) lines.push(`- condition: ${step.condition}`);
    lines.push("");
  });
  return lines.join("\n");
}

// ── Markdown parser → WorkflowDefinition ────────────────────────────────────

export function parseWorkflowMarkdown(md: string): WorkflowDefinition | null {
  try {
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const triggerMatch = md.match(/## Trigger\n(.+)/);
    if (!titleMatch || !triggerMatch) return null;

    const title = titleMatch[1].trim();
    const trigger = triggerMatch[1].trim();
    const steps: WorkflowStep[] = [];

    const stepBlocks = md.split(/### \d+\.\s+/).slice(1);
    for (const block of stepBlocks) {
      const blockLines = block.trim().split("\n");
      const name = blockLines[0].trim();
      const getField = (field: string) => {
        const line = blockLines.find((l) => l.trim().startsWith(`- ${field}:`));
        return line ? line.replace(`- ${field}:`, "").trim() : undefined;
      };
      const type = getField("type");
      const description = getField("description");
      if (!type || !description) continue;
      steps.push({
        name,
        type: type as "action" | "wait",
        description,
        duration: getField("duration"),
        condition: getField("condition"),
      });
    }

    return { title, trigger, steps };
  } catch {
    return null;
  }
}
