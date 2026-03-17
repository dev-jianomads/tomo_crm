/**
 * Mock playbook data for workflow automations.
 * Playbooks are OpenClaw-style: schedule + evidence + artifact + execute.
 */

import type { TargetFilter } from "./targets";
import type { StructuredFilterCriteria } from "./relationshipFilters";

export type PlaybookType = "intro_tracker" | "post_meeting" | "update_followup" | "ddq_response" | "no_response_stall";

export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string;
  enabled: boolean;
  targetCount?: number;
  /** @deprecated Use pipelineId. Kept for backward compatibility. */
  targetListId?: string;
  /** @deprecated Use filterCriteria. Kept for backward compatibility. */
  targetFilters?: Partial<TargetFilter>;
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
    enabled: true,
    targetCount: 1,
    filterCriteria: { tier: "Tier 1", band: "Heating Up" },
  },
  {
    id: "pb-post-meeting",
    name: "Post-Meeting Execution",
    type: "post_meeting",
    description: "Pull transcript, draft follow-up, require human approval before sending.",
    summary: "Post-meeting: Extract transcript → draft follow-up → human approval → send & monitor. Draft only.",
    enabled: true,
    targetCount: 1,
    filterCriteria: { tier: ["Tier 1", "Tier 2"], band: "Active-Stable" },
  },
  {
    id: "pb-update-followup",
    name: "Update → Follow-Up",
    type: "update_followup",
    description: "After monthly update, segment LPs by engagement and auto-draft follow-ups.",
    summary: "Update follow-up: Segment by tier → track opens → auto-draft after 5d. Draft only.",
    enabled: true,
    targetCount: 24,
    filterCriteria: { tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-no-response-stall",
    name: "No Response → Re-engage",
    type: "no_response_stall",
    description: "When LP goes silent after 2 touches, flag as blocked, suggest CRM updates, set reminder.",
    summary: "No response 5d: Flag blocked → suggest CRM updates → set reminder. Links to Today card.",
    enabled: true,
    targetCount: 1,
    filterCriteria: { tier: ["Tier 1", "Tier 2"] },
  },
  {
    id: "pb-ddq-response",
    name: "DDQ Response Engine",
    type: "ddq_response",
    description: "Parse incoming DDQ, match historical answers, draft responses with citations.",
    summary: "DDQ engine: Parse questionnaire → match answers → draft with citations → human review. Sandboxed.",
    enabled: false,
    targetCount: 1,
  },
];
