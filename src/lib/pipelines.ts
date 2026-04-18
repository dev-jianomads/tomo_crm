/**
 * Pipeline — saved filter over CRM relationships, scoped per fund.
 * Replaces TargetList. Used by /pipeline page; workflows will migrate.
 */

import type { Relationship } from "./mockData";
import { applyFilters, type StructuredFilterCriteria } from "./relationshipFilters";

export type Pipeline = {
  id: string;
  name: string;
  /** Fund scope — pipelines are per fund */
  fundId: string;
  /** Same filter schema as relationships page */
  filterCriteria: StructuredFilterCriteria;
  createdAt: string; // ISO
  /** Filter matches excluded from this saved list (Amend list) */
  excludedRelationshipIds?: string[];
  /** Manually included rows even if filters would not match */
  addedRelationshipIds?: string[];
};

/**
 * Effective CRM rows for a list: filter matches, minus exclusions, plus manual adds.
 */
export function getPipelineMembers(relationships: Relationship[], pipeline: Pipeline): Relationship[] {
  const filtered = applyFilters(relationships, pipeline.filterCriteria);
  const filteredIds = new Set(filtered.map((r) => r.id));
  const excluded = new Set(pipeline.excludedRelationshipIds ?? []);
  const added = new Set(pipeline.addedRelationshipIds ?? []);

  const include = new Set<string>();
  for (const r of relationships) {
    if (excluded.has(r.id)) continue;
    if (filteredIds.has(r.id) || added.has(r.id)) include.add(r.id);
  }
  return relationships.filter((r) => include.has(r.id));
}

export const PIPELINES_STORAGE_KEY = "tomo-pipelines-v1";

/** Stable ids for seeded mock pipelines (`generateMockPipelines`). Use as playbook defaults. */
export const MOCK_PIPELINE_IDS_FUND_1 = {
  q1TargetList: `mock-pipeline-fund-1-1`,
  activeDiligence: `mock-pipeline-fund-1-2`,
  familyOfficeOutreach: `mock-pipeline-fund-1-3`,
} as const;

/**
 * Generate 3 mock pipelines for fund-1 only (avoids duplication when viewing "all" funds).
 * Uses realistic StructuredFilterCriteria based on mock CRM (150 relationships).
 * Filters chosen to yield a useful slice from the seeded distribution.
 */
export function generateMockPipelines(): Pipeline[] {
  const now = new Date().toISOString();
  const fundId = "fund-1";

  return [
    {
      id: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
      name: "Q1 Target List",
      fundId,
      filterCriteria: {
        tier: ["Tier 1", "Tier 2"],
        lpLocation: "North America",
        strategyFit: "Active mandate",
      },
      createdAt: now,
    },
    {
      id: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
      name: "Active Diligence Focus",
      fundId,
      filterCriteria: {
        stage: ["Active diligence", "DD", "Soft circle"],
        tier: ["Tier 1", "Tier 2"],
      },
      createdAt: now,
    },
    {
      id: MOCK_PIPELINE_IDS_FUND_1.familyOfficeOutreach,
      name: "Family Office Outreach",
      fundId,
      filterCriteria: {
        investorType: ["Family office", "UHNW", "Endowment"],
        strategyFit: "Active mandate",
        lpLocation: ["North America", "EMEA"],
      },
      createdAt: now,
    },
  ];
}

export function getInitialPipelines(): Pipeline[] {
  return generateMockPipelines();
}
