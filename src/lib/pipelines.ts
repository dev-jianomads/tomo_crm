/**
 * Pipeline — saved list over CRM relationships, scoped per fund.
 * Replaces TargetList. Used by /pipeline page; workflows will migrate.
 *
 * **Live** — structured `filterCriteria` (+ optional amend exclusions / manual adds on top).
 * **Manual** — no structured filter (`filterCriteria` is `{}`); membership is exactly `addedRelationshipIds` minus exclusions.
 */

import type { Relationship } from "./mockData";
import { applyFilters, type StructuredFilterCriteria } from "./relationshipFilters";

export type ListMode = "live" | "manual";

export type Pipeline = {
  id: string;
  name: string;
  /** Fund scope — pipelines are per fund */
  fundId: string;
  /** Same filter schema as relationships page. Must be `{}` when `listMode === "manual"`. */
  filterCriteria: StructuredFilterCriteria;
  createdAt: string; // ISO
  /** Omitted or `"live"` = filter-driven list (default for persisted rows before this field existed). */
  listMode?: ListMode;
  /** Manual list only — muted / italic description line (Lists v1). */
  manualDescription?: string;
  /** Filter matches excluded from this saved list (Amend list) */
  excludedRelationshipIds?: string[];
  /**
   * Live lists: LPs manually included even when filters would not match.
   * Manual lists: the full explicit membership set (SRS §3.11).
   */
  addedRelationshipIds?: string[];
};

export function isManualList(pipeline: Pipeline): boolean {
  return pipeline.listMode === "manual";
}

export type ListsIndexAggregates = {
  total: number;
  live: number;
  manual: number;
};

/** Counts for Lists v1 page meta (`11 total · 8 live · 3 manual`). */
export function getListsIndexAggregates(pipelines: readonly Pipeline[]): ListsIndexAggregates {
  const total = pipelines.length;
  let manual = 0;
  for (const p of pipelines) {
    if (isManualList(p)) manual += 1;
  }
  return { total, live: total - manual, manual };
}

/** Matches `ListDrawerWorkflows`: linked playbooks with `enabled !== false`. */
export function countActiveWorkflowsForPipeline(
  pipelineId: string,
  playbooks: readonly { pipelineId?: string; enabled?: boolean }[]
): number {
  return playbooks.filter((pb) => pb.pipelineId === pipelineId && pb.enabled !== false).length;
}

/** Normalize persisted pipelines (e.g. missing `listMode` after schema bump). */
export function migratePipelineShape(p: Pipeline): Pipeline {
  const listMode: ListMode = p.listMode ?? "live";
  if (listMode === "manual") {
    return {
      ...p,
      listMode,
      filterCriteria: {},
    };
  }
  return { ...p, listMode };
}

/**
 * Effective CRM rows for a list.
 * Manual: explicit ids only. Live: filter matches minus exclusions plus adds.
 */
export function getPipelineMembers(relationships: Relationship[], pipeline: Pipeline): Relationship[] {
  const excluded = new Set(pipeline.excludedRelationshipIds ?? []);

  if (isManualList(pipeline)) {
    const wanted = new Set(pipeline.addedRelationshipIds ?? []);
    return relationships.filter((r) => wanted.has(r.id) && !excluded.has(r.id));
  }

  const filtered = applyFilters(relationships, pipeline.filterCriteria);
  const filteredIds = new Set(filtered.map((r) => r.id));
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

  /** Stable demo ids — `generateRelationships()` uses `r1`…`r150`. */
  const manualQ1Ids = Array.from({ length: 15 }, (_, i) => `r${i + 1}`);

  return [
    {
      id: MOCK_PIPELINE_IDS_FUND_1.q1TargetList,
      name: "Q1 Target List",
      fundId,
      listMode: "manual",
      filterCriteria: {},
      manualDescription: "Hand-picked LPs for Q1 outreach push",
      addedRelationshipIds: manualQ1Ids,
      createdAt: now,
    },
    {
      id: MOCK_PIPELINE_IDS_FUND_1.activeDiligence,
      name: "Active Diligence Focus",
      fundId,
      listMode: "live",
      filterCriteria: {
        stage: ["Active diligence", "Soft commit"],
        tier: ["Tier 1", "Tier 2"],
      },
      createdAt: now,
    },
    {
      id: MOCK_PIPELINE_IDS_FUND_1.familyOfficeOutreach,
      name: "Family Office Outreach",
      fundId,
      listMode: "live",
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
