/**
 * Mock data contract for the V1 Workflows surface.
 *
 * This fixture is intentionally shaped like a future API response so the
 * accordion workflow UI can later swap from mock data to production data with
 * minimal component churn.
 *
 * Phase 7 (production prep): table and column mapping for this DTO lives in
 * `docs/WORKFLOW_SURFACE_API_MAPPING_2026-05-17.md` and `workflow-surface-api-mapping.ts`.
 */

export type WorkflowSurfaceKind = "locked_default" | "configurable_template" | "user_custom";
export type WorkflowSurfaceStatus = "active" | "inactive";

export type WorkflowStepActionType =
  | "draft_batch"
  | "single_draft"
  | "settings"
  | "outcome_capture"
  | "run_config"
  | "readonly";

export type WorkflowStepNodeType = "trigger" | "action" | "wait" | "gate" | "outcome";

export type WorkflowStat = {
  label: string;
  value: string;
  tone?: "default" | "muted" | "good" | "warning";
};

export type WorkflowMetaItem = {
  label: string;
  value: string;
  tone?: "default" | "good" | "warning";
};

export type WorkflowStepNode = {
  id: string;
  nodeType: WorkflowStepNodeType;
  actionType: WorkflowStepActionType;
  title: string;
  description: string;
  timingLabel?: string;
  statusLabel?: string;
  locked?: boolean;
  draftBatchId?: string;
};

export type WorkflowAttentionItem = {
  id: string;
  label: string;
  count: number;
  actionLabel: string;
  stepId?: string;
};

export type WorkflowStateSegment = {
  id: string;
  label: string;
  drafted: number;
  sent: number;
  waiting: number;
};

export type WorkflowStateSummary = {
  title: string;
  segments: WorkflowStateSegment[];
  replied: number;
  readyForOutcome: number;
  skipped: number;
};

export type WorkflowRunSummary = {
  id: string;
  listName: string;
  startedAtLabel: string;
  lpCount: number;
  statusLabel: string;
  /** Optional secondary run detail; omitted in V1 monitor UI (metrics-only run history). */
  outcomeSummary?: string;
};

export type WorkflowDraftAttachment = {
  name: string;
  meta: string;
};

export type WorkflowDraftStatus = "ready" | "edited" | "approved" | "skipped";

export type WorkflowDraft = {
  id: string;
  lpName: string;
  firmName: string;
  roleLabel: string;
  tierLabel: string;
  email: string;
  subject: string;
  body: string;
  status: WorkflowDraftStatus;
  attachment?: WorkflowDraftAttachment;
};

export type WorkflowDraftBatch = {
  id: string;
  workflowId: string;
  stepId: string;
  eyebrow: string;
  title: string;
  context: string;
  batchTomoPlaceholder: string;
  drafts: WorkflowDraft[];
};

export type WorkflowOutcomeOption = {
  id: "warmer_than_expected" | "maintaining_non_committal" | "genuinely_dormant";
  label: string;
  description: string;
};

export type WorkflowOutcomeCapture = {
  workflowId: string;
  pendingLpNames: string[];
  options: WorkflowOutcomeOption[];
};

export type WorkflowRunConfigFieldKind = "text" | "textarea" | "select" | "toggle";

export type WorkflowRunConfigField = {
  id: string;
  label: string;
  value: string;
  helperText?: string;
  kind?: WorkflowRunConfigFieldKind;
  options?: Array<{ value: string; label: string }>;
};

export type WorkflowRunConfig = {
  workflowId: string;
  /** Configurable templates can launch; locked defaults are read-only with history. */
  editable: boolean;
  headline?: string;
  supportingText?: string;
  fields: WorkflowRunConfigField[];
};

export function formatWorkflowRunFieldDisplay(field: WorkflowRunConfigField): string {
  if (field.kind === "select" && field.options?.length) {
    return field.options.find((o) => o.value === field.value)?.label ?? field.value;
  }
  if (field.kind === "toggle") {
    return field.value === "true" ? "On" : "Off";
  }
  return field.value;
}

/** Shared picklist for template run setup (mock until lists API exists). */
export const WORKFLOW_RUN_LIST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "quiet-fat-middle", label: "Quiet - Fat Middle" },
  { value: "reups-fund-ii", label: "Re-ups - Fund II investors" },
  { value: "tier-1-2", label: "All Tier 1 + Tier 2" },
  { value: "london-filtered", label: "London-filtered (trip)" },
  { value: "north-america-roadshow", label: "North America roadshow - May" },
];

export type WorkflowSurfaceEntry = {
  id: string;
  name: string;
  kind: WorkflowSurfaceKind;
  status: WorkflowSurfaceStatus;
  badgeLabel: string;
  summary: string;
  triggerLabel: string;
  stats: WorkflowStat[];
  meta: WorkflowMetaItem[];
  steps: WorkflowStepNode[];
  attentionItems: WorkflowAttentionItem[];
  stateSummary: WorkflowStateSummary;
  runHistory: WorkflowRunSummary[];
  baseTemplateId?: string;
  runConfig?: WorkflowRunConfig;
};

const f7InsightDrafts: WorkflowDraft[] = [
  {
    id: "draft-f7-insight-lingotto",
    lpName: "Edoardo Lanzavecchia",
    firmName: "Lingotto Investment Management",
    roleLabel: "Head of HF Allocations",
    tierLabel: "Tier 1",
    email: "edoardo@lingotto.com",
    subject: "The dispersion premium in Italian credit",
    body:
      "Edoardo, the Italian sub-investment-grade dispersion premium has compressed since our last conversation, which narrows the entry window meaningfully. Thought the attached framing may be useful as you think about Q3 positioning.",
    status: "ready",
    attachment: {
      name: "Italian Credit Dispersion - Q1 2026.pdf",
      meta: "2.4 MB - Insight piece - Last sent to Edoardo on 12 Mar",
    },
  },
  {
    id: "draft-f7-insight-ubs",
    lpName: "Charly Malek",
    firmName: "UBS Hedge Fund Solutions",
    roleLabel: "Head of Manager Research",
    tierLabel: "Tier 1 - prior F2",
    email: "charly.malek@ubs.com",
    subject: "Tail risk in long/short equity",
    body:
      "Charly, since you re-upped into Fund II we have been thinking about how to position the tail-risk overlay against a different liquidity regime in single-name shorts. Sharing the short note we discussed.",
    status: "edited",
    attachment: {
      name: "Tail Risk Overlay - May 2026.pdf",
      meta: "1.8 MB - Strategy note",
    },
  },
  {
    id: "draft-f7-insight-cppib",
    lpName: "Frank Ieraci",
    firmName: "CPPIB",
    roleLabel: "SMD, External Portfolio",
    tierLabel: "Tier 1",
    email: "frank.ieraci@cppib.com",
    subject: "Capacity discussion for H2",
    body:
      "Frank, when we last spoke you mentioned capacity was the question to revisit once the new sleeve sizing was final. Wanted to share where we have landed and what that means for H2 allocation capacity.",
    status: "ready",
  },
];

const themedOutreachDrafts: WorkflowDraft[] = [
  {
    id: "draft-themed-wellcome",
    lpName: "Marie-Claude Dumas",
    firmName: "Wellcome Trust",
    roleLabel: "Investment Director",
    tierLabel: "Tier 1",
    email: "marieclaude@wellcome.org",
    subject: "Follow-up on European credit dispersion",
    body:
      "Marie-Claude, sharing a short note on the dispersion theme we discussed. The setup has become more pronounced in Europe, and I thought the framing might be useful for your manager review work.",
    status: "ready",
  },
  {
    id: "draft-themed-futurefund",
    lpName: "James McIntyre",
    firmName: "Future Fund Australia",
    roleLabel: "Portfolio Manager",
    tierLabel: "Tier 2",
    email: "james.mcintyre@futurefund.gov.au",
    subject: "A short update on our credit book",
    body:
      "James, wanted to send the concise version of what we are seeing in credit dispersion and how it is affecting position sizing across the book.",
    status: "ready",
  },
];

const tripDrafts: WorkflowDraft[] = [
  {
    id: "draft-trip-london-btf",
    lpName: "Sarah Whitmore",
    firmName: "British Telecom Pension Scheme",
    roleLabel: "Alternatives Lead",
    tierLabel: "Tier 1",
    email: "sarah.whitmore@btps.co.uk",
    subject: "In London June 12-15",
    body:
      "Sarah, I will be in London June 12-15 and wondered if it would be useful to compare notes while I am in town. I can do breakfast or late afternoon on the 13th or 14th.",
    status: "ready",
  },
  {
    id: "draft-trip-london-lgps",
    lpName: "Tom Richards",
    firmName: "LGPS Central",
    roleLabel: "Investment Director",
    tierLabel: "Tier 2",
    email: "tom.richards@lgpscentral.co.uk",
    subject: "London visit - June 12-15",
    body:
      "Tom, I will be in London June 12-15 and would be glad to find 30 minutes if useful. Tomo is holding the trip window for scheduling replies.",
    status: "ready",
  },
];

const postMeetingFollowUpDraft: WorkflowDraft = {
  id: "draft-post-meeting-charly-followup",
  lpName: "Charly Malek",
  firmName: "UBS Hedge Fund Solutions",
  roleLabel: "Head of Manager Research",
  tierLabel: "Tier 1 - prior F2",
  email: "charly.malek@ubs.com",
  subject: "Thank you — notes and next steps from today",
  body:
    "Charly, thank you for the time today. Captured your questions on capacity and the overlay sleeve — attaching the one-pager we walked through. Let me know if you want Tomo to propose slots for a follow-up with the PM.",
  status: "ready",
  attachment: {
    name: "UBS HFS - Meeting recap - May 2026.pdf",
    meta: "420 KB - Recap + open commitments",
  },
};

/** Single-recipient drafts keyed by workflow + step (reuses batch-review UI with one row). */
const workflowSingleDraftRows: Array<{
  workflowId: string;
  stepId: string;
  eyebrow: string;
  title: string;
  context: string;
  batchTomoPlaceholder: string;
  draft: WorkflowDraft;
}> = [
  {
    workflowId: "wf-post-meeting-execution",
    stepId: "post-follow-up-draft",
    eyebrow: "Post-Meeting Execution - Follow-up",
    title: "1 follow-up draft",
    context: "UBS HFS - Charly Malek - meeting ended 2:00pm ET - send window inside outbound policy",
    batchTomoPlaceholder: "Shorter opening - emphasize capacity answer - softer ask",
    draft: postMeetingFollowUpDraft,
  },
];

export const workflowSurfaceDraftBatches: WorkflowDraftBatch[] = [
  {
    id: "batch-f7-touch-1",
    workflowId: "wf-f7-three-touch",
    stepId: "f7-touch-1",
    eyebrow: "F7 Three-Touch Qualification - Touch 1 - Insight",
    title: "3 drafts ready for approval",
    context: "Quiet - Fat Middle - drafted by Tomo - awaiting GP approval before send",
    batchTomoPlaceholder: "Make them all shorter - sharpen the insight - avoid Q3 numbers",
    drafts: f7InsightDrafts,
  },
  {
    id: "batch-themed-day-0",
    workflowId: "wf-themed-outreach",
    stepId: "themed-batch-draft",
    eyebrow: "Themed Outreach - Themed insight outreach - Day 0",
    title: "2 drafts ready for approval",
    context: "Selected list - theme: European credit dispersion",
    batchTomoPlaceholder: "Make all drafts warmer - add a clearer call to action",
    drafts: themedOutreachDrafts,
  },
  {
    id: "batch-trip-london",
    workflowId: "wf-trip-orchestrator",
    stepId: "trip-draft-outreach",
    eyebrow: "Trip Orchestrator - London June 12-15",
    title: "2 trip outreach drafts ready",
    context: "London-filtered LPs - scheduling constrained to trip window",
    batchTomoPlaceholder: "Mention breakfast options - make the ask lower friction",
    drafts: tripDrafts,
  },
];

export const workflowOutcomeCaptures: WorkflowOutcomeCapture[] = [
  {
    workflowId: "wf-f7-three-touch",
    pendingLpNames: ["Wellcome Trust"],
    options: [
      {
        id: "warmer_than_expected",
        label: "Warmer than expected",
        description: "LP replied with renewed interest or a concrete next step.",
      },
      {
        id: "maintaining_non_committal",
        label: "Maintaining but non-committal",
        description: "Relationship remains alive but no clear movement yet.",
      },
      {
        id: "genuinely_dormant",
        label: "Genuinely dormant",
        description: "Sequence confirmed this LP should be deprioritized for now.",
      },
    ],
  },
];

export const workflowSurfaceEntries: WorkflowSurfaceEntry[] = [
  {
    id: "wf-post-meeting-execution",
    name: "Post-Meeting Execution",
    kind: "locked_default",
    status: "active",
    badgeLabel: "Default",
    triggerLabel: "LP calendar event completed",
    summary: "Meeting ends - capture form - follow-up draft within 30 minutes",
    stats: [{ label: "Done last 30d", value: "42", tone: "default" }],
    meta: [
      { label: "Last meeting", value: "UBS HFS - Charly Malek - today 2:00pm ET" },
      { label: "Capture rate", value: "94% capture form completion", tone: "good" },
    ],
    steps: [
      {
        id: "post-meeting-completed",
        nodeType: "trigger",
        actionType: "readonly",
        title: "Meeting ends",
        description: "Calendar event completed and LP attended",
        statusLabel: "Trigger",
        locked: true,
      },
      {
        id: "post-capture-form",
        nodeType: "action",
        actionType: "settings",
        title: "Capture form",
        description: "",
        timingLabel: "+60s",
        statusLabel: "You",
        locked: true,
      },
      {
        id: "post-follow-up-draft",
        nodeType: "action",
        actionType: "single_draft",
        title: "Follow-up draft",
        description: "Recap, commitments, attached docs",
        timingLabel: "+30 min",
        statusLabel: "Draft",
        locked: true,
      },
    ],
    attentionItems: [
      { id: "post-capture-pending", label: "capture pending", count: 1, actionLabel: "View", stepId: "post-capture-form" },
    ],
    stateSummary: {
      title: "Recent meetings last 7 days",
      segments: [
        { id: "post-capture", label: "Capture", drafted: 1, sent: 3, waiting: 1 },
        { id: "post-followup", label: "Follow-up", drafted: 1, sent: 3, waiting: 0 },
      ],
      replied: 2,
      readyForOutcome: 0,
      skipped: 1,
    },
    runHistory: [
      {
        id: "run-post-ubs",
        listName: "UBS HFS - Charly Malek",
        startedAtLabel: "today 2:00pm",
        lpCount: 1,
        statusLabel: "In progress",
      },
      {
        id: "run-post-cppib",
        listName: "CPPIB - Frank Ieraci",
        startedAtLabel: "today 11:00am",
        lpCount: 1,
        statusLabel: "Complete",
      },
    ],
  },
  {
    id: "wf-f7-three-touch",
    name: "F7 Three-Touch Qualification",
    kind: "locked_default",
    status: "active",
    badgeLabel: "Default",
    triggerLabel: "Manual on Fat Middle LPs or suggested when Fat Middle > 0",
    summary: "Insight - wait - question - wait - respectful close - outcome capture",
    stats: [
      { label: "Running now", value: "14" },
      { label: "Done last 30d", value: "28" },
    ],
    meta: [
      { label: "Last activity", value: "Touch 2 drafted for Lingotto - 14m ago" },
      { label: "Outbound safety", value: "14-day same-message dedup active", tone: "good" },
    ],
    steps: [
      {
        id: "f7-trigger",
        nodeType: "trigger",
        actionType: "readonly",
        title: "GP runs on a Fat Middle list",
        description: "Cohort enrolled together with same cadence",
        statusLabel: "When",
        locked: true,
      },
      {
        id: "f7-touch-1",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Insight email",
        description: "Mandate-relevant market insight",
        timingLabel: "Touch 1 - Day 0",
        statusLabel: "Drafts",
        draftBatchId: "batch-f7-touch-1",
        locked: true,
      },
      {
        id: "f7-wait-1",
        nodeType: "wait",
        actionType: "settings",
        title: "Wait",
        description: "Spacing before touch 2",
        timingLabel: "5-7d",
        locked: true,
      },
      {
        id: "f7-touch-2",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Question email",
        description: "Single low-friction question referencing prior touch",
        timingLabel: "Touch 2 - Day 5-7",
        statusLabel: "Drafts",
        locked: true,
      },
      {
        id: "f7-wait-2",
        nodeType: "wait",
        actionType: "settings",
        title: "Wait",
        description: "Allow replies before final touch",
        timingLabel: "5-7d",
        locked: true,
      },
      {
        id: "f7-touch-3",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Respectful close",
        description: "Re-engage cleanly or invite an exit",
        timingLabel: "Touch 3 - Day 12-14",
        statusLabel: "Drafts",
        locked: true,
      },
      {
        id: "f7-outcome",
        nodeType: "outcome",
        actionType: "outcome_capture",
        title: "Outcome",
        description: "",
        statusLabel: "You",
        locked: true,
      },
    ],
    attentionItems: [
      { id: "f7-replies", label: "LPs replied", count: 2, actionLabel: "View" },
      { id: "f7-outcome", label: "ready for outcome capture", count: 1, actionLabel: "View", stepId: "f7-outcome" },
    ],
    stateSummary: {
      title: "Where the 14 in-flight LPs are right now",
      segments: [
        { id: "f7-state-touch-1", label: "Touch 1 - Insight", drafted: 3, sent: 2, waiting: 2 },
        { id: "f7-state-touch-2", label: "Touch 2 - Question", drafted: 0, sent: 4, waiting: 0 },
        { id: "f7-state-touch-3", label: "Touch 3 - Close", drafted: 0, sent: 3, waiting: 0 },
      ],
      replied: 2,
      readyForOutcome: 1,
      skipped: 3,
    },
    runHistory: [
      {
        id: "run-f7-fat-middle",
        listName: "Quiet - Fat Middle",
        startedAtLabel: "started 12 May",
        lpCount: 18,
        statusLabel: "14 running",
      },
      {
        id: "run-f7-reups",
        listName: "Re-ups - Fund II investors",
        startedAtLabel: "started 28 Apr",
        lpCount: 14,
        statusLabel: "All complete",
      },
    ],
    runConfig: {
      workflowId: "wf-f7-three-touch",
      editable: false,
      headline: "Tomo default cadence",
      supportingText:
        "Step timing and sequence are fixed on locked defaults. Tune email copy per touch in each draft batch step; outbound safety rules always apply.",
      fields: [
        {
          id: "cohort_list",
          label: "Cohort source list",
          value: "Quiet - Fat Middle",
          helperText: "All LPs in the run share the same enrollment and spacing.",
        },
        {
          id: "enrollment",
          label: "How runs start",
          value: "Manual from Workflows or Insights when Fat Middle > 0",
          helperText: "One cohort per run; outcomes captured at the end of the sequence.",
        },
        {
          id: "outbound_safety",
          label: "Outbound checks",
          value: "14-day same-message dedup active",
          helperText: "Cannot be disabled on Tomo defaults.",
        },
      ],
    },
  },
  {
    id: "wf-themed-outreach",
    name: "Themed Outreach",
    kind: "configurable_template",
    status: "active",
    badgeLabel: "Tailored",
    triggerLabel: "GP picks a List and provides a theme or content kernel",
    summary: "Themed insight outreach - optional 7-day follow-up to non-responders",
    stats: [
      { label: "Running now", value: "6" },
      { label: "Replied", value: "4", tone: "good" },
    ],
    meta: [
      { label: "Last run", value: "European credit dispersion - started 3 May" },
      { label: "Outbound safety", value: "14-day same-message dedup active", tone: "good" },
    ],
    steps: [
      {
        id: "themed-trigger",
        nodeType: "trigger",
        actionType: "readonly",
        title: "GP launches with topic",
        description: "Theme and content kernel set at run time",
        statusLabel: "Trigger",
      },
      {
        id: "themed-batch-draft",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Themed insight outreach",
        description: "Per-LP context and tone-profile drafts from the theme kernel",
        timingLabel: "Day 0",
        draftBatchId: "batch-themed-day-0",
      },
      {
        id: "themed-wait",
        nodeType: "wait",
        actionType: "settings",
        title: "Wait",
        description: "Track replies and scheduling acceptances",
        timingLabel: "7d",
        locked: true,
      },
      {
        id: "themed-follow-up",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Follow-up to non-responders",
        description: "Optional light nudge for non-replies",
        timingLabel: "Day 7",
      },
      {
        id: "themed-outcome",
        nodeType: "outcome",
        actionType: "outcome_capture",
        title: "Outcome",
        description: "",
        statusLabel: "You",
        locked: true,
      },
    ],
    attentionItems: [
      { id: "themed-replies", label: "LPs replied", count: 4, actionLabel: "View" },
      { id: "themed-outcome", label: "ready for outcome capture", count: 2, actionLabel: "View", stepId: "themed-outcome" },
    ],
    stateSummary: {
      title: "Where the 6 in-flight LPs are right now",
      segments: [
        { id: "themed-state-draft", label: "Themed insight", drafted: 2, sent: 3, waiting: 1 },
        { id: "themed-state-followup", label: "Follow-up", drafted: 0, sent: 1, waiting: 0 },
      ],
      replied: 4,
      readyForOutcome: 0,
      skipped: 0,
    },
    runHistory: [
      {
        id: "run-themed-hardcap",
        listName: "All Tier 1 + Tier 2",
        startedAtLabel: "23 Apr",
        lpCount: 87,
        statusLabel: "Complete",
      },
    ],
    runConfig: {
      workflowId: "wf-themed-outreach",
      editable: true,
      headline: "Launch themed outreach",
      supportingText: "Pick the list, define the theme or content kernel, and choose whether Tomo sends a light follow-up to non-responders after 7 days.",
      fields: [
        {
          id: "list",
          label: "List",
          value: "quiet-fat-middle",
          helperText: "LPs on this list become the cohort for this run.",
          kind: "select",
          options: WORKFLOW_RUN_LIST_OPTIONS,
        },
        {
          id: "theme",
          label: "Theme / content kernel",
          value: "European credit dispersion",
          helperText: "Free-text kernel Tomo uses to personalize each draft.",
          kind: "textarea",
        },
        {
          id: "follow_up",
          label: "Optional 7-day follow-up",
          value: "true",
          helperText: "When on, Tomo drafts a single nudge to non-responders after 7 days.",
          kind: "toggle",
        },
      ],
    },
  },
  {
    id: "wf-trip-orchestrator",
    name: "Trip Orchestrator",
    kind: "configurable_template",
    status: "active",
    badgeLabel: "Tailored",
    baseTemplateId: "wf-themed-outreach",
    triggerLabel: "Send trip emails to list",
    summary: "Trip outreach with dates and availability - reply handling - follow-up if no response",
    stats: [
      { label: "Running now", value: "8" },
      { label: "Meetings scheduled", value: "3", tone: "good" },
    ],
    meta: [
      { label: "Trip window", value: "London - June 12-15", tone: "good" },
      { label: "Cohort", value: "London-filtered - 12 LPs on this list" },
    ],
    steps: [
      {
        id: "trip-trigger",
        nodeType: "trigger",
        actionType: "readonly",
        title: "Send trip emails to list",
        description: "GP launches outreach with destination, dates, and availability in each email",
        statusLabel: "Trigger",
      },
      {
        id: "trip-draft-outreach",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Trip outreach emails",
        description: "Personalized meeting asks with trip dates and scheduling constraints",
        timingLabel: "Day 0",
        draftBatchId: "batch-trip-london",
      },
      {
        id: "trip-scheduling",
        nodeType: "action",
        actionType: "readonly",
        title: "Monitor replies and schedule",
        description: "Tomo actions scheduling accepts and proposes times inside the trip window",
        statusLabel: "Auto",
      },
      {
        id: "trip-follow-up",
        nodeType: "action",
        actionType: "draft_batch",
        title: "Follow-up if no response",
        description: "Light nudge to LPs who have not replied before the trip window closes",
        timingLabel: "Before trip",
      },
      {
        id: "trip-outcome",
        nodeType: "outcome",
        actionType: "outcome_capture",
        title: "Outcome",
        description: "",
        statusLabel: "You",
        locked: true,
      },
    ],
    attentionItems: [
      { id: "trip-replies", label: "replies to action", count: 5, actionLabel: "View", stepId: "trip-scheduling" },
      { id: "trip-outcome", label: "ready for outcome capture", count: 1, actionLabel: "View", stepId: "trip-outcome" },
    ],
    stateSummary: {
      title: "London trip - where the 8 LPs are right now",
      segments: [
        { id: "trip-state-drafts", label: "Outreach sent", drafted: 2, sent: 6, waiting: 0 },
        { id: "trip-state-scheduling", label: "Scheduling", drafted: 0, sent: 0, waiting: 3 },
        { id: "trip-state-followup", label: "Follow-up", drafted: 1, sent: 0, waiting: 0 },
      ],
      replied: 5,
      readyForOutcome: 0,
      skipped: 0,
    },
    runHistory: [
      {
        id: "run-trip-london",
        listName: "London-filtered",
        startedAtLabel: "started 8 May",
        lpCount: 12,
        statusLabel: "8 running",
      },
      {
        id: "run-trip-ny",
        listName: "North America roadshow - May",
        startedAtLabel: "5 May",
        lpCount: 22,
        statusLabel: "Complete",
      },
    ],
    runConfig: {
      workflowId: "wf-trip-orchestrator",
      editable: true,
      headline: "Configure trip run",
      supportingText:
        "Destination and dates bound outreach and scheduling. Source list is filtered to LPs in or near the destination where possible.",
      fields: [
        {
          id: "destination",
          label: "Destination",
          value: "London",
          helperText: "City or region used for filtering and email context.",
          kind: "text",
        },
        {
          id: "date_window",
          label: "Date window",
          value: "June 12-15",
          helperText: "Trip dates; scheduling only proposes slots inside this window.",
          kind: "text",
        },
        {
          id: "source_list",
          label: "Source list",
          value: "london-filtered",
          helperText: "Base list before location filter.",
          kind: "select",
          options: WORKFLOW_RUN_LIST_OPTIONS,
        },
        {
          id: "availability",
          label: "Scheduling constraint",
          value: "Only propose times inside trip window",
          helperText: "Narrative constraint passed to the scheduling assistant.",
          kind: "textarea",
        },
      ],
    },
  },
];

export function getWorkflowSurfaceEntry(id: string): WorkflowSurfaceEntry | undefined {
  return workflowSurfaceEntries.find((entry) => entry.id === id);
}

export function getWorkflowDraftBatch(id: string): WorkflowDraftBatch | undefined {
  return workflowSurfaceDraftBatches.find((batch) => batch.id === id);
}

export function getWorkflowSingleDraftBatch(workflowId: string, stepId: string): WorkflowDraftBatch | undefined {
  const row = workflowSingleDraftRows.find((r) => r.workflowId === workflowId && r.stepId === stepId);
  if (!row) return undefined;
  return {
    id: `single-${workflowId}-${stepId}`,
    workflowId,
    stepId,
    eyebrow: row.eyebrow,
    title: row.title,
    context: row.context,
    batchTomoPlaceholder: row.batchTomoPlaceholder,
    drafts: [row.draft],
  };
}
