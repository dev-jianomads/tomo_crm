/**
 * Shared types for target lists (audience for playbooks).
 * Used by /targets page and /workflows page.
 */

export type TargetFilter = {
  region: string;
  interest: string;
  stage: string;
  tier: string;
};

export type TargetList = {
  id: string;
  name: string;
  filters: TargetFilter;
  members: string[];
};

export const TARGET_LISTS_STORAGE_KEY = "tomo-target-lists";
