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
  | "ny_roadshow";

export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string;
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
    id: "pb-post-meeting",
    name: "Post-Meeting Execution",
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
    id: "pb-no-response-stall",
    name: "No Response → Re-engage",
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
    createdAt: "2025-08-30T08:20:00.000Z",
    enabled: false,
    targetCount: 1,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
  },
  {
    id: "pb-ny-roadshow-2026",
    name: "New York Roadshow",
    type: "ny_roadshow",
    description:
      "One week before the NYC trip, draft an email to your list asking for meeting availability.",
    summary:
      "7 days before 6 June 2026 → draft email to your list requesting availability. Global workflow (no CRM audience).",
    createdAt: "2026-01-10T10:00:00.000Z",
    enabled: true,
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
    name: "Website → CRM Sync",
    trigger: "Scan corporate website",
    action: "Suggest CRM updates (title, role, contact info)",
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
    name: "Meeting Notes → Actions",
    trigger: "Scan meeting notes or transcript",
    action: "Extract action items & commitments → suggest CRM updates and create follow-ups",
    enabled: true,
  },
];
