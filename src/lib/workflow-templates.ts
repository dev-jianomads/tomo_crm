import type { PlaybookType } from "./mockPlaybooks";

export type WorkflowStep = {
  name: string;
  type: "action" | "wait";
  description: string;
  duration?: string;
  condition?: string;
};

/** Required on process diagrams (Phase 1): how the workflow is invoked. */
export type WorkflowTriggerKind = "EVENT" | "THRESHOLD" | "SCHEDULED";

export type WorkflowDefinition = {
  title: string;
  trigger: string;
  /** Defaults to EVENT when omitted (older markdown / AI updates). */
  triggerKind?: WorkflowTriggerKind;
  steps: WorkflowStep[];
};

// ── Default templates per playbook type ─────────────────────────────────────

const INTRO_TRACKER: WorkflowDefinition = {
  title: "Warm Intro Tracker",
  triggerKind: "EVENT",
  trigger: "CC'd introduction email detected",
  steps: [
    { name: "Detect & Log", type: "action", description: "Parse intro from Sarah Kim, log David Park (Redstone) with source credit" },
    { name: "Draft Reply", type: "action", description: "Draft personalized reply to David Park within 24h" },
    { name: "Wait", type: "wait", duration: "48h", description: "Monitor inbox for response from David Park" },
    { name: "Escalate", type: "action", description: "Flag for manual follow-up, notify via Slack", condition: "No reply after 48h" },
  ],
};

const POST_MEETING: WorkflowDefinition = {
  title: "Post-Meeting Execution Loop",
  triggerKind: "EVENT",
  trigger: "Zoom meeting with Lisa Tanaka (Crestview) ends",
  steps: [
    { name: "Extract & Summarize", type: "action", description: "Pull transcript, extract objections, commitments, next steps" },
    { name: "Draft Follow-Up", type: "action", description: "Draft tailored email with attached materials, log CRM summary" },
    { name: "Wait for Approval", type: "wait", duration: "Human review", description: "Human must approve outbound email before sending" },
    { name: "Send & Monitor", type: "action", description: "Send approved email, set next touch date, watch for reply" },
  ],
};

const UPDATE_FOLLOWUP: WorkflowDefinition = {
  title: "Update → Follow-Up Conversion",
  triggerKind: "THRESHOLD",
  trigger: "Monthly investor update sent",
  steps: [
    { name: "Segment & Track", type: "action", description: "Segment LPs by tier, monitor opens/clicks from Marcus Chen and others" },
    { name: "Wait", type: "wait", duration: "5 business days", description: "Allow time for organic engagement" },
    { name: "Auto-Draft Follow-Up", type: "action", description: "Draft personalized follow-up based on pipeline stage and engagement", condition: "Low engagement detected" },
  ],
};

const NO_RESPONSE_STALL: WorkflowDefinition = {
  title: "No Response → Re-engage",
  triggerKind: "THRESHOLD",
  trigger: "No response in 5d",
  steps: [
    { name: "Flag as Blocked", type: "action", description: "Mark LP as blocked, add to attention list" },
    { name: "Suggest CRM Updates", type: "action", description: "Propose stall risk, status updates — user applies via Tomo chat" },
    { name: "Set Reminder", type: "action", description: "Set a 3-day reminder to re-engage" },
    { name: "Wait", type: "wait", duration: "Until user re-engages", description: "User applies updates, sets reminder, then re-contacts LP" },
  ],
};

const DDQ_RESPONSE: WorkflowDefinition = {
  title: "DDQ Response Engine",
  triggerKind: "EVENT",
  trigger: "DDQ received from Rachel Novak (Oakmont)",
  steps: [
    { name: "Parse & Match", type: "action", description: "Parse questionnaire sections, match to historical answers with citations" },
    { name: "Draft Responses", type: "action", description: "Pull latest policy docs, draft answers, flag sensitive/legal sections" },
    { name: "Wait for Review", type: "wait", duration: "Human review", description: "Human reviews flagged sections — no fabrication policy enforced" },
    { name: "Finalize & Track", type: "action", description: "Version-lock approved responses, track completion state" },
  ],
};

const NY_ROADSHOW: WorkflowDefinition = {
  title: "New York Roadshow",
  triggerKind: "SCHEDULED",
  trigger: "7 days before trip on 6 June 2026",
  steps: [
    {
      name: "Request availability",
      type: "action",
      description: "Send draft email to pipeline requesting availability",
    },
  ],
};

export const DEFAULT_TEMPLATES: Record<PlaybookType, WorkflowDefinition> = {
  intro_tracker: INTRO_TRACKER,
  post_meeting: POST_MEETING,
  update_followup: UPDATE_FOLLOWUP,
  no_response_stall: NO_RESPONSE_STALL,
  ddq_response: DDQ_RESPONSE,
  ny_roadshow: NY_ROADSHOW,
};

// ── Tomo Default workflow templates (keyed by workflow id) ───────────────────

const WEBSITE_CRM_SYNC: WorkflowDefinition = {
  title: "Website → CRM Sync",
  triggerKind: "EVENT",
  trigger: "Corporate website change detected",
  steps: [
    { name: "Scan Website", type: "action", description: "Crawl corporate website for personnel, role, and contact changes" },
    { name: "Compare with CRM", type: "action", description: "Diff website data against existing CRM records" },
    { name: "Suggest Updates", type: "action", description: "Surface proposed CRM changes (title, role, contact info) for review" },
    { name: "Apply Approved", type: "action", description: "Apply user-approved updates to CRM records" },
  ],
};

const EMAIL_SCHEDULING: WorkflowDefinition = {
  title: "Email Scheduling Assistant",
  triggerKind: "EVENT",
  trigger: "Scheduling request detected in email",
  steps: [
    { name: "Detect Request", type: "action", description: "Identify scheduling intent from incoming emails" },
    { name: "Check Calendar", type: "action", description: "Cross-reference calendar for available time slots" },
    { name: "Draft Response", type: "action", description: "Draft reply with proposed meeting times" },
    { name: "Wait for Approval", type: "wait", duration: "Human review", description: "User reviews and approves outbound scheduling reply" },
    { name: "Send & Confirm", type: "action", description: "Send approved response, add tentative calendar hold" },
  ],
};

const MEETING_NOTES_ACTIONS: WorkflowDefinition = {
  title: "Meeting Notes → Actions",
  triggerKind: "EVENT",
  trigger: "Meeting notes or transcript uploaded",
  steps: [
    { name: "Parse Notes", type: "action", description: "Extract key discussion points, decisions, and quotes" },
    { name: "Identify Actions", type: "action", description: "Pull out action items, commitments, and deadlines" },
    { name: "Suggest CRM Updates", type: "action", description: "Propose relationship status changes based on meeting content" },
    { name: "Create Follow-Ups", type: "action", description: "Generate follow-up tasks and reminders from action items" },
  ],
};

export const TOMO_DEFAULT_TEMPLATES: Record<string, WorkflowDefinition> = {
  "td-website-scan": WEBSITE_CRM_SYNC,
  "td-email-scheduling": EMAIL_SCHEDULING,
  "td-meeting-notes": MEETING_NOTES_ACTIONS,
};

// ── Tomo Default suggestion chips (keyed by workflow id) ────────────────────

export const TOMO_DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  "td-website-scan": [
    "Only scan LinkedIn profiles",
    "Add a weekly scan schedule",
    "Skip contacts with recent activity",
    "Add Slack notification for major changes",
  ],
  "td-email-scheduling": [
    "Block mornings for deep work",
    "Add buffer time between meetings",
    "Prefer Zoom links over in-person",
    "Auto-decline if calendar is >80% full",
  ],
  "td-meeting-notes": [
    "Extract sentiment from tone",
    "Tag action items by urgency",
    "Auto-assign follow-ups to team members",
    "Add a 48h follow-up reminder",
  ],
};

// ── Context-aware suggestion chips per playbook type ────────────────────────

export const PLAYBOOK_SUGGESTIONS: Record<PlaybookType, string[]> = {
  intro_tracker: [
    "Add a thank-you to Sarah Kim",
    "Change wait to 24 hours",
    "Add a step to schedule a meeting with David",
    "Escalate to Slack if no reply after 72h",
  ],
  post_meeting: [
    "Skip transcript step for informal chats",
    "Add a deck attachment for Crestview",
    "Change approval to auto-send for Tier 2",
    "Add a reminder if Lisa hasn't replied in 5 days",
  ],
  update_followup: [
    "Shorten wait to 3 business days",
    "Only trigger for Tier 1 LPs like Marcus",
    "Add a call scheduling step for high-engagement LPs",
    "Skip LPs who already replied to the update",
  ],
  no_response_stall: [
    "Change trigger to 3 days",
    "Add step to draft re-engagement email",
    "Skip CRM update for Tier 2 LPs",
    "Add Slack notification when LP goes silent",
  ],
  ddq_response: [
    "Flag all legal sections for manual review",
    "Add a step to cross-check Fund III data",
    "Change review wait to 24h deadline",
    "Auto-attach audited financials from Oakmont request",
  ],
  ny_roadshow: [
    "Mention specific NYC dates in the draft",
    "Add CC to ops for calendar holds",
    "Shorten lead time to 5 days instead of 7",
    "Attach one-pager PDF to the draft",
  ],
};

// ── Mock context blurbs per playbook type ───────────────────────────────────

const PLAYBOOK_CONTEXT: Record<PlaybookType, string> = {
  intro_tracker:
    `Tracking 3 active intros.\n` +
    `Latest: Sarah Kim (Meridian Capital) CC'd intro to David Park (Redstone Partners) 6h ago. ` +
    `Reply window closes in 18h. No response from David yet.`,
  post_meeting:
    `8 meetings this month across Tier 1-2 LPs.\n` +
    `Last meeting: Lisa Tanaka (Crestview Capital) — 45 min Zoom, ended 2h ago. ` +
    `Transcript ready. Follow-up draft pending approval.`,
  update_followup:
    `Monthly update sent to 24 LPs 3 days ago.\n` +
    `Marcus Chen (Blueridge Ventures) opened 4x but no reply. ` +
    `12 LPs opened, 6 haven't opened yet. 2 follow-up drafts queued.`,
  no_response_stall:
    `Lumen LP: No response after 2 touches (5d ago, 2d ago).\n` +
    `Workflow flagged as blocked. CRM updates suggested (stall risk, status). ` +
    `Set a 3-day reminder to re-engage. Card visible in Today.`,
  ddq_response:
    `1 active DDQ in progress.\n` +
    `Rachel Novak (Oakmont Fund of Funds) sent a 47-question DDQ 2 days ago. ` +
    `31 answers matched from historical responses. 8 flagged for legal review.`,
  ny_roadshow:
    `NYC roadshow: trip date 6 June 2026.\n` +
    `Schedule trigger: 7 days prior (30 May 2026). ` +
    `Next run will draft a single outbound email asking your pipeline for availability — no CRM segment; you choose recipients when sending.`,
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
  const kind = def.triggerKind ?? "EVENT";
  return (
    `${def.title}\nTrigger (${kind}): ${def.trigger}\n\n` +
    `${stepList}\n\n` +
    `${context}\n\n` +
    `Ask me to add, remove, or change any step.`
  );
}

// ── Markdown generation from structured data ────────────────────────────────

export function workflowToMarkdown(def: WorkflowDefinition): string {
  const kind = def.triggerKind ?? "EVENT";
  const lines: string[] = [`# ${def.title}`, "", `## Trigger`, kind, def.trigger, "", `## Steps`, ""];
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
    const triggerBlock = md.match(/## Trigger\n([\s\S]*?)(?=\n## Steps\b)/);
    if (!titleMatch || !triggerBlock) return null;

    const title = titleMatch[1].trim();
    const triggerLines = triggerBlock[1].trim().split("\n");
    const firstLine = triggerLines[0]?.trim() ?? "";
    let triggerKind: WorkflowTriggerKind | undefined;
    let trigger: string;
    if (firstLine === "EVENT" || firstLine === "THRESHOLD" || firstLine === "SCHEDULED") {
      triggerKind = firstLine;
      trigger = triggerLines.slice(1).join("\n").trim();
    } else {
      trigger = triggerBlock[1].trim();
    }
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

    return {
      title,
      trigger,
      steps,
      ...(triggerKind ? { triggerKind } : {}),
    };
  } catch {
    return null;
  }
}
