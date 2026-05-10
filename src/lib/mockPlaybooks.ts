/**
 * Mock playbook data for workflow automations.
 * Playbooks are OpenClaw-style: schedule + evidence + artifact + execute.
 */

import type { StructuredFilterCriteria } from "./relationshipFilters";
import { MOCK_PIPELINE_IDS_FUND_1 } from "./pipelines";

export type PlaybookType =
  | "intro_tracker"
  | "post_meeting"
  | "update_followup"
  | "ddq_response"
  | "no_response_stall"
  | "roadshow_prep"
  | "three_touch_qualification"
  | "quarterly_lp_update"
  | "commitment_close"
  | "reengagement_urgent";

export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string;
  /** Roadmap label when workflow is preview-only (e.g. locked off). */
  comingSoonLabel?: string;
  /** Demo seed time for UI (user-defined workflow cards). */
  createdAt?: string;
  enabled: boolean;
  targetCount?: number;
  /** @deprecated Use pipelineId. Kept for backward compatibility. */
  targetListId?: string;
  /** Link to saved pipeline (CRM filter) */
  pipelineId?: string;
  /** Inline filter criteria when no pipeline is linked */
  filterCriteria?: Partial<StructuredFilterCriteria>;
};

export const suggestedPlaybooks: Playbook[] = [
  {
    id: "pb-intro-tracker",
    name: "Warm Intro Tracker",
    type: "intro_tracker",
    description: "Detect CC'd intros, draft reply within 24h, escalate if LP is silent.",
    summary: "Intro tracker: Detect intro → log source credit → draft reply 24h → escalate if silent. Draft only.",
    createdAt: "2025-11-08T14:30:00.000Z",
    enabled: true,
    targetCount: 1,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
    filterCriteria: { tier: "Tier 1", band: "Heating Up" },
  },
  {
    id: "pb-three-touch-qualification",
    name: "Three-Touch Qualification",
    type: "three_touch_qualification",
    description:
      "Three-touch qualify sequence for fat-middle / cold LPs: insight → direction question → qualifying close. GP approves every touch.",
    summary: "Scheduled/manual cohort: Touch 1 insight → Touch 2 (day 5–7) → Touch 3 (day 12–14). All drafts, GP approval each send.",
    createdAt: "2025-10-01T12:00:00.000Z",
    enabled: true,
    targetCount: 18,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
    filterCriteria: { tier: ["Tier 2", "Tier 3"], band: "Cooling" },
  },
  {
    id: "pb-quarterly-lp-update",
    name: "Quarterly LP Update",
    type: "quarterly_lp_update",
    description:
      "After each quarterly LP update goes out: branch by tier — Tier 1 personalized follow-up, Tier 2 generic nudge, Tier 3 no automated touch.",
    summary: "Post-send: segment Tier 1–3 → personalized / nudge / monitor-only. Draft only where applicable.",
    createdAt: "2025-11-15T09:00:00.000Z",
    enabled: true,
    targetCount: 40,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
    filterCriteria: { tier: ["Tier 1", "Tier 2", "Tier 3"] },
  },
  {
    id: "pb-commitment-close",
    name: "Commitment → Close",
    type: "commitment_close",
    description:
      "For soft-committed LPs: track expected IC date, draft nudges at 14d and 7d before close, flag if no confirmation.",
    summary: "Threshold on commitment + IC date → 14d nudge → 7d nudge → escalate if unconfirmed. Draft only.",
    createdAt: "2025-09-20T15:30:00.000Z",
    enabled: true,
    targetCount: 6,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
    filterCriteria: { stage: ["Soft commit", "Active diligence"], tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-post-meeting",
    name: "Post-Meeting Follow-Up",
    type: "post_meeting",
    description: "Pull transcript, draft follow-up, require human approval before sending.",
    summary: "Post-meeting: Extract transcript → draft follow-up → human approval → send & monitor. Draft only.",
    createdAt: "2025-10-22T09:15:00.000Z",
    enabled: true,
    targetCount: 1,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
    filterCriteria: { tier: ["Tier 1", "Tier 2"], band: "Active-Stable" },
  },
  {
    id: "pb-update-followup",
    name: "Update → Follow-Up",
    type: "update_followup",
    description: "After monthly update, segment LPs by engagement and auto-draft follow-ups.",
    summary: "Update follow-up: Segment by tier → track opens → auto-draft after 5d. Draft only.",
    createdAt: "2025-12-01T16:45:00.000Z",
    enabled: true,
    targetCount: 24,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
    filterCriteria: { tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-reengagement-urgent",
    name: "Re-Engagement Urgent",
    type: "reengagement_urgent",
    description:
      "Event-driven (not nightly): when an inbound email arrives from an LP after 45+ days without GP-originated outreach, draft an urgent same-day reply.",
    summary: "EVENT: inbound after 45d GP silence → verify window → draft reply → log CRM task. Distinct from Silence → Re-engage.",
    createdAt: "2025-10-05T11:20:00.000Z",
    enabled: true,
    targetCount: 8,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
    filterCriteria: { tier: ["Tier 1", "Tier 2"], band: ["Active-Stable", "Heating Up"] },
  },
  {
    id: "pb-no-response-stall",
    name: "Silence → Re-engage",
    type: "no_response_stall",
    description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder.",
    summary: "No response 5d: Flag blocked → suggest CRM updates → set reminder. Links to Today card.",
    createdAt: "2025-09-14T11:00:00.000Z",
    enabled: true,
    targetCount: 1,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.familyOfficeOutreach,
    filterCriteria: { tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-ddq-response",
    name: "DDQ Response Engine",
    type: "ddq_response",
    description: "Parse incoming DDQ, match historical answers, draft responses with citations.",
    summary: "DDQ engine: Parse questionnaire → match answers → draft with citations → human review. Sandboxed.",
    comingSoonLabel: "Coming Q3 2026",
    createdAt: "2025-08-30T08:20:00.000Z",
    enabled: false,
    targetCount: 1,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
  },
  {
    id: "pb-roadshow-prep",
    name: "Roadshow Prep",
    type: "roadshow_prep",
    description:
      "N days before trip: pull LPs in target geography from your list, draft availability request, log confirmed meetings. GP sets trip date & geography.",
    summary:
      "Scheduled trigger → geography cohort → availability draft → log confirmations. Recipients finalized at send.",
    createdAt: "2026-01-10T10:00:00.000Z",
    enabled: true,
    targetCount: 22,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.familyOfficeOutreach,
    filterCriteria: { lpLocation: "North America", tier: ["Tier 1", "Tier 2"] },
  },
];

/** Tomo Default workflows — simple trigger → action, no list targeting */
export type TomoDefaultWorkflow = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

export const tomoDefaultWorkflows: TomoDefaultWorkflow[] = [
  {
    id: "td-website-scan",
    name: "Website & News → Relationship Updates",
    trigger: "Scan website and trusted news for relationship signals",
    action: "Suggest CRM updates (roles, coverage, contacts) from web + news",
    enabled: true,
  },
  {
    id: "td-email-scheduling",
    name: "Email Scheduling Assistant",
    trigger: "Scan email for scheduling requests",
    action: "Find availability → draft response with available times",
    enabled: true,
  },
  {
    id: "td-meeting-notes",
    name: "Meeting → Follow-Up",
    trigger: "Scan meeting notes or transcript",
    action: "Extract action items & commitments → suggest CRM updates and create follow-ups",
    enabled: true,
  },
];
