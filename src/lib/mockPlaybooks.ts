/**
 * Mock playbook data for workflow automations.
 * Playbooks are OpenClaw-style: schedule + evidence + artifact + execute.
 */

import type { TargetFilter } from "./targets";

export type PlaybookType = "follow_up" | "warm_cadence" | "re_engage" | "intro_tracking";

export type Playbook = {
  id: string;
  name: string;
  type: PlaybookType;
  description: string;
  summary: string; // short rule summary for chat context
  enabled: boolean;
  targetCount?: number;
  /** Link to saved target list (Option A) */
  targetListId?: string;
  /** Inline filters when no list is linked (Option A) */
  targetFilters?: Partial<TargetFilter>;
};

export const suggestedPlaybooks: Playbook[] = [
  {
    id: "pb-follow-up",
    name: "Follow-up after update",
    type: "follow_up",
    description: "Follow up 5 business days after sending an investor update if no reply.",
    summary: "Follow-up after update: Wait 5 business days. Reply = same thread only. Max 1 attempt. Draft only.",
    enabled: true,
    targetCount: 12,
    targetFilters: { tier: "Tier 1-2", stage: "Heating" },
  },
  {
    id: "pb-warm-cadence",
    name: "Warm touch cadence",
    type: "warm_cadence",
    description: "Light touch every 21/45/90 days by tier. Skip if recent interaction.",
    summary: "Warm cadence: A=21d, B=45d, C=90d. Skip inbound 14d / outbound 7d. Draft only.",
    enabled: true,
    targetCount: 28,
    targetFilters: { region: "Any", tier: "Tier 1-2" },
  },
  {
    id: "pb-re-engage",
    name: "Re-engage stale LP",
    type: "re_engage",
    description: "If no interaction in 120 days, sequence: nudge → value add → request call.",
    summary: "Re-engage stale: 120d no touch. Sequence: nudge → value add → request call. Draft only.",
    enabled: false,
    targetCount: 5,
  },
  {
    id: "pb-intro-tracking",
    name: "Intro tracking",
    type: "intro_tracking",
    description: "If someone introduces you, ensure reply within 24h. Remind if not replied.",
    summary: "Intro tracking: Reply within 24h. Remind if not replied. Log outcome.",
    enabled: false,
    targetCount: 0,
  },
];
