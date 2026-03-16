/**
 * Shared types for target lists (audience for playbooks).
 * Used by /pipeline page and /workflows page.
 *
 * @deprecated Pipeline (src/lib/pipelines.ts) replaces TargetList.
 * Workflows will migrate to Pipeline. Keep for backward compatibility until migration.
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
