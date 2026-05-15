import type { PlaybookType } from "./mockPlaybooks";

export type WorkflowStep = {
  name: string;
  type: "action" | "wait";
  description: string;
  duration?: string;
  condition?: string;
  /** Saved outbound draft shell for draft-style action steps (demo / GP default). */
  draftTemplate?: string;
};

/**
 * Heuristic draft detection (no extra schema): keeps the UI simple; rename the step to drop draft tooling.
 */
export function isDraftStyleStep(step: WorkflowStep): boolean {
  const n = step.name.toLowerCase();
  return /\bdraft\b/.test(n) || /\bauto-?draft\b/.test(n);
}

/**
 * When Tomo returns updated steps, keep GP-authored draft shells if the model omits them.
 */
export function mergeStepsPreservingDraftTemplates(
  prev: WorkflowStep[] | undefined,
  next: WorkflowStep[]
): WorkflowStep[] {
  if (!prev?.length) return next;
  return next.map((s, i) => {
    const p = prev[i];
    if (!p?.draftTemplate?.trim()) return s;
    if (s.draftTemplate?.trim()) return s;
    return { ...s, draftTemplate: p.draftTemplate };
  });
}

function escapeDraftTemplateLine(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function unescapeDraftTemplateLine(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

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
  title: "Post-Meeting Execution",
  triggerKind: "EVENT",
  trigger: "LP calendar event status changes to completed",
  steps: [
    { name: "Prep brief", type: "action", description: "Generate LP context, last conversation, open loops, and suggested focus before the meeting" },
    { name: "Capture form", type: "action", description: "Surface post-meeting capture within minutes: outcome, mandate fit, commitments, next steps" },
    { name: "Draft follow-up", type: "action", description: "Draft recap and commitments email within 30 minutes, informed by capture output" },
    { name: "Outcome update", type: "action", description: "Write confirmed stage / mandate-fit changes and feed downstream stagnation tracking" },
  ],
};

const UPDATE_FOLLOWUP: WorkflowDefinition = {
  title: "Update → Follow-Up Conversion",
  triggerKind: "THRESHOLD",
  trigger: "Monthly investor update sent",
  steps: [
    { name: "Segment & Track", type: "action", description: "Segment LPs by tier, monitor opens/clicks from Marcus Chen and others" },
    { name: "Wait", type: "wait", duration: "5 business days", description: "Allow time for organic engagement" },
    { name: "Auto-Draft Follow-Up", type: "action", description: "Draft personalized follow-up based on funnel stage and engagement", condition: "Low engagement detected" },
  ],
};

const NO_RESPONSE_STALL: WorkflowDefinition = {
  title: "Silence → Re-engage",
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

const ROADSHOW_PREP: WorkflowDefinition = {
  title: "Roadshow Prep",
  triggerKind: "SCHEDULED",
  trigger: "N days before trip date (GP sets trip date & target geography; default lead time 7 days)",
  steps: [
    {
      name: "Pull geography cohort",
      type: "action",
      description: "Select LPs in target geography from linked list; exclude recent suppressions",
    },
    {
      name: "Draft availability request",
      type: "action",
      description: "Draft availability / meeting request email for cohort — GP approves before send",
    },
    {
      name: "Log confirmed meetings",
      type: "action",
      description: "As replies arrive, log confirmed slots to CRM and calendar holds",
    },
  ],
};

const THEMED_OUTREACH: WorkflowDefinition = {
  title: "Themed Outreach",
  triggerKind: "SCHEDULED",
  trigger: "GP picks a List and provides a theme or content kernel",
  steps: [
    {
      name: "Select cohort",
      type: "action",
      description: "Use the linked List as the outreach cohort and apply outbound-safety exclusions",
    },
    {
      name: "Batch draft",
      type: "action",
      description: "Draft personalized versions per LP using tone profile and recent interaction context",
    },
    {
      name: "Review in Action Drawer",
      type: "action",
      description: "GP approves, edits, or dismisses each draft individually or in batch",
    },
    { name: "Wait", type: "wait", duration: "7 days", description: "Track replies and scheduling acceptances" },
    {
      name: "Optional follow-up draft",
      type: "action",
      description: "Draft a light follow-up only for non-responders when the GP enables it",
      condition: "No reply after wait",
    },
  ],
};

const TRIP_ORCHESTRATOR: WorkflowDefinition = {
  title: "Trip Orchestrator",
  triggerKind: "SCHEDULED",
  trigger: "GP enters destination and date range, or Tomo detects a multi-day trip",
  steps: [
    {
      name: "Filter by location",
      type: "action",
      description: "Apply city / region filter to the selected List based on destination",
    },
    {
      name: "Draft trip outreach",
      type: "action",
      description: "Draft personalized trip-themed meeting asks with date-bounded availability",
    },
    {
      name: "Review in Action Drawer",
      type: "action",
      description: "GP reviews batch drafts before any send",
    },
    {
      name: "Scheduling reply handling",
      type: "action",
      description: "Use scheduling assistant on replies, constrained to the trip date window",
    },
    { name: "Outcome capture", type: "action", description: "Track replies, meetings scheduled, declines, and no response" },
  ],
};

const THREE_TOUCH_QUALIFICATION: WorkflowDefinition = {
  title: "Three-Touch Qualification",
  triggerKind: "SCHEDULED",
  trigger: "Manual launch or scheduled run for fat-middle / cold LP segment (GP selects cohort)",
  steps: [
    {
      name: "Touch 1 — Insight email",
      type: "action",
      description: "Draft value-forward insight email for cohort — GP approves before send",
    },
    { name: "Wait", type: "wait", duration: "2–4 days", description: "Spacing before touch 2" },
    {
      name: "Touch 2 — Direction question",
      type: "action",
      description: "Draft direction question (intent / fit) — GP approves; target day 5–7 from touch 1",
    },
    { name: "Wait", type: "wait", duration: "5–8 days", description: "Allow replies before touch 3" },
    {
      name: "Touch 3 — Qualifying close",
      type: "action",
      description: "Draft qualifying close (next step / fit) — GP approves; target day 12–14 from start",
    },
  ],
};

const QUARTERLY_LP_UPDATE: WorkflowDefinition = {
  title: "Quarterly LP Update",
  triggerKind: "SCHEDULED",
  trigger: "Quarterly investor update published or distributed to LPs",
  steps: [
    {
      name: "Segment by tier",
      type: "action",
      description: "Classify each LP as Tier 1, 2, or 3 from CRM and engagement",
    },
    {
      name: "Tier 1 — Personalized follow-up",
      type: "action",
      description: "Draft personalized follow-up for Tier 1 — GP approves",
      condition: "Tier 1",
    },
    {
      name: "Tier 2 — Generic nudge",
      type: "action",
      description: "Draft short generic nudge for Tier 2 — GP approves",
      condition: "Tier 2",
    },
    {
      name: "Tier 3 — No touch",
      type: "wait",
      duration: "Monitor only",
      description: "No automated outbound; track opens/clicks only for Tier 3",
      condition: "Tier 3",
    },
  ],
};

const COMMITMENT_CLOSE: WorkflowDefinition = {
  title: "Commitment → Close",
  triggerKind: "THRESHOLD",
  trigger: "Soft commitment recorded with expected IC / wire close date",
  steps: [
    {
      name: "Track timeline",
      type: "action",
      description: "Monitor days-to-close vs expected IC and wire checklist",
    },
    {
      name: "Draft nudge — 14 days",
      type: "action",
      description: "Draft reminder 14 days before close — GP approves",
    },
    {
      name: "Draft nudge — 7 days",
      type: "action",
      description: "Draft urgency nudge 7 days before close — GP approves",
    },
    {
      name: "Escalate if unconfirmed",
      type: "action",
      description: "Flag relationship if no confirmation by T−2 business days",
      condition: "No confirmation",
    },
  ],
};

const REENGAGEMENT_URGENT: WorkflowDefinition = {
  title: "Re-Engagement Urgent",
  triggerKind: "EVENT",
  trigger: "Inbound email from LP detected after 45+ days without GP-originated touch",
  steps: [
    {
      name: "Verify silence window",
      type: "action",
      description: "Confirm no outbound from GP in 45d; classify thread priority",
    },
    {
      name: "Draft same-day reply",
      type: "action",
      description: "Draft warm, urgent reply acknowledging gap — GP approves same day",
    },
    {
      name: "Log & next step",
      type: "action",
      description: "Update CRM; create follow-up task within 48h",
    },
  ],
};

export const DEFAULT_TEMPLATES: Record<PlaybookType, WorkflowDefinition> = {
  intro_tracker: INTRO_TRACKER,
  post_meeting: POST_MEETING,
  update_followup: UPDATE_FOLLOWUP,
  no_response_stall: NO_RESPONSE_STALL,
  ddq_response: DDQ_RESPONSE,
  roadshow_prep: ROADSHOW_PREP,
  themed_outreach: THEMED_OUTREACH,
  trip_orchestrator: TRIP_ORCHESTRATOR,
  three_touch_qualification: THREE_TOUCH_QUALIFICATION,
  quarterly_lp_update: QUARTERLY_LP_UPDATE,
  commitment_close: COMMITMENT_CLOSE,
  reengagement_urgent: REENGAGEMENT_URGENT,
};

// ── Tomo Default workflow templates (keyed by workflow id) ───────────────────

export const TOMO_DEFAULT_TEMPLATES: Record<string, WorkflowDefinition> = {
  "td-post-meeting-execution": POST_MEETING,
  "td-three-touch-qualification": THREE_TOUCH_QUALIFICATION,
};

// ── Tomo Default suggestion chips (keyed by workflow id) ────────────────────

export const TOMO_DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  "td-post-meeting-execution": [
    "Adjust capture prompt wording",
    "Always include open loops in follow-up",
    "Attach latest deck when mentioned",
    "Route skipped capture to reminder",
  ],
  "td-three-touch-qualification": [
    "Tune touch 1 insight style",
    "Change wait copy for hot cohorts",
    "Exclude LPs who replied after touch 2",
    "Review outcome labels",
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
  roadshow_prep: [
    "Set lead time to 10 days before the trip",
    "Attach one-pager and data room link to the draft",
    "Add CC to ops for calendar holds",
    "Mention city and venue block in the subject line",
  ],
  themed_outreach: [
    "Save this as a fund update configuration",
    "Make follow-up optional by default",
    "Use a more direct tone for Tier 1 LPs",
    "Suppress LPs touched in the last 14 days",
  ],
  trip_orchestrator: [
    "Use London June 12-15 as the trip window",
    "Limit the cohort to Tier 1 and Tier 2",
    "Mention breakfast and afternoon windows",
    "Pass replies to the scheduling assistant",
  ],
  three_touch_qualification: [
    "Compress touches to 7 / 14 days for hot cohort only",
    "Add deck link to touch 1",
    "Auto-exclude LPs who replied after touch 2",
    "Route non-responders to Silence → Re-engage",
  ],
  quarterly_lp_update: [
    "Bump Tier 2 nudge to day 3 after send",
    "Add call task for Tier 1 non-openers",
    "Suppress Tier 3 entirely this quarter",
    "Attach performance PDF to Tier 1 drafts only",
  ],
  commitment_close: [
    "Change 14d nudge to 21d for large tickets",
    "Add Slack ping to IR on T−3",
    "CC fund counsel on final nudge",
    "Pause if IC date slips by >5 days",
  ],
  reengagement_urgent: [
    "Mention specific last meeting date in reply",
    "Offer two concrete times to reconnect",
    "Escalate to partner if Tier 1 and 60d+ silence",
    "Add unsubscribe check before send",
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
    `Lumen LP: Silence after 2 touches (5d ago, 2d ago).\n` +
    `Workflow flagged as blocked. CRM updates suggested (stall risk, status). ` +
    `Set a 3-day reminder to re-engage. Card visible in Today.`,
  ddq_response:
    `1 active DDQ in progress.\n` +
    `Rachel Novak (Oakmont Fund of Funds) sent a 47-question DDQ 2 days ago. ` +
    `31 answers matched from historical responses. 8 flagged for legal review.`,
  roadshow_prep:
    `Trip date + geography locked for next roadshow block.\n` +
    `Cohort pulled from Family Office Outreach (NA Tier 1–2). Next run drafts availability requests and logs confirmations to CRM.`,
  themed_outreach:
    `18 LPs in the selected List are eligible after outbound-safety checks.\n` +
    `Theme kernel is supplied per run. Tomo will personalize each draft from tone profile and recent interaction context.`,
  trip_orchestrator:
    `Trip window is parameterized per run.\n` +
    `Destination filters the linked List by city / region, then scheduling replies are constrained to the trip dates.`,
  three_touch_qualification:
    `18 LPs in fat-middle / cold cohort on Q1 Target List.\n` +
    `Touch 1 insight queued — awaiting GP approval. Spacing: 5–7d to touch 2, 12–14d to touch 3.`,
  quarterly_lp_update:
    `Q4 quarterly PDF sent 2 days ago to 40 LPs.\n` +
    `Tier 1: 6 personalized drafts ready; Tier 2: 14 nudges; Tier 3: monitor-only (no outbound).`,
  commitment_close:
    `6 soft commits in Active Diligence with IC spread over next 21 days.\n` +
    `Next automated nudge: 14d before Crestview close — drafts pending approval.`,
  reengagement_urgent:
    `Last GP-originated outbound to Meridian Capital: 52 days ago.\n` +
    `Inbound thread opened this morning — same-day draft reply queued for approval.`,
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
    if (step.draftTemplate) {
      lines.push(`- draftTemplate: ${escapeDraftTemplateLine(step.draftTemplate)}`);
    }
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
      const rawDraft = getField("draftTemplate");
      steps.push({
        name,
        type: type as "action" | "wait",
        description,
        duration: getField("duration"),
        condition: getField("condition"),
        draftTemplate: rawDraft ? unescapeDraftTemplateLine(rawDraft) : undefined,
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
