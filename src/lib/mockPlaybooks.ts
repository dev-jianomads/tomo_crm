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
  | "themed_outreach"
  | "trip_orchestrator"
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
    id: "pb-themed-outreach",
    name: "Themed Outreach",
    type: "themed_outreach",
    description:
      "Pick a List and a theme or content kernel; Tomo drafts personalized outreach per LP with optional non-responder follow-up.",
    summary:
      "Manual cohort workflow: choose List + theme → batch personalized drafts → Action Drawer review → optional 7d follow-up.",
    createdAt: "2026-05-15T09:00:00.000Z",
    enabled: true,
    targetCount: 18,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
    filterCriteria: { tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-trip-orchestrator",
    name: "Trip Orchestrator",
    type: "trip_orchestrator",
    description:
      "Saved Themed Outreach configuration for a destination and date range; drafts trip asks and constrains scheduling replies to the trip window.",
    summary:
      "Manual or trip-detected: destination + dates → city/region cohort → batch trip outreach → scheduling assistant handles replies.",
    createdAt: "2026-05-15T10:00:00.000Z",
    enabled: true,
    targetCount: 22,
    pipelineId: MOCK_PIPELINE_IDS_FUND_1.familyOfficeOutreach,
    filterCriteria: { lpLocation: "North America", tier: ["Tier 1", "Tier 2"] },
  },
];

/** Locked V1 workflow defaults — global cards, not tied to a selected list. */
export type TomoDefaultWorkflow = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

export const tomoDefaultWorkflows: TomoDefaultWorkflow[] = [
  {
    id: "td-post-meeting-execution",
    name: "Post-Meeting Execution",
    trigger: "LP calendar event completed",
    action: "Follow-up draft within 30 minutes after meeting ends",
    enabled: true,
  },
  {
    id: "td-three-touch-qualification",
    name: "F7 Three-Touch Qualification",
    trigger: "Manual on Fat Middle LPs, or suggested when Fat Middle > 0",
    action: "Insight → wait → question → wait → respectful close → outcome capture",
    enabled: true,
  },
];
