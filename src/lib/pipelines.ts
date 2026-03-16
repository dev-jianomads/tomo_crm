/**
 * Pipeline — saved filter over CRM relationships, scoped per fund.
 * Replaces TargetList. Used by /pipeline page; workflows will migrate.
 */

import type { StructuredFilterCriteria } from "./relationshipFilters";
import { usePersistentState } from "./storage";

export type Pipeline = {
  id: string;
  name: string;
  /** Fund scope — pipelines are per fund */
  fundId: string;
  /** Same filter schema as relationships page */
  filterCriteria: StructuredFilterCriteria;
  createdAt: string; // ISO
};

export const PIPELINES_STORAGE_KEY = "tomo-pipelines-v1";

/** Default fund IDs for mock pipelines (match fund-provider) */
const DEFAULT_FUND_IDS = ["fund-1", "fund-2", "fund-3"];

/**
 * Generate 2–3 mock pipelines per fund for initial load.
 * Uses realistic StructuredFilterCriteria.
 */
function generateMockPipelines(): Pipeline[] {
  const now = new Date().toISOString();
  const pipelines: Pipeline[] = [];

  for (const fundId of DEFAULT_FUND_IDS) {
    pipelines.push(
      {
        id: `mock-pipeline-${fundId}-1`,
        name: `Q1 Target List`,
        fundId,
        filterCriteria: {
          tier: "Tier 1",
          momentumDirection: "Heating up",
          band: "Heating Up",
          lpLocation: "North America",
        },
        createdAt: now,
      },
      {
        id: `mock-pipeline-${fundId}-2`,
        name: `Active Diligence Focus`,
        fundId,
        filterCriteria: {
          stage: "Active diligence",
          tier: ["Tier 1", "Tier 2"],
          momentumDirection: "Heating up",
        },
        createdAt: now,
      },
      {
        id: `mock-pipeline-${fundId}-3`,
        name: `Family Office Outreach`,
        fundId,
        filterCriteria: {
          investorType: "Family office",
          strategyFit: "Active mandate",
          lpLocation: ["North America", "EMEA"],
        },
        createdAt: now,
      }
    );
  }

  return pipelines;
}

function getInitialPipelines(): Pipeline[] {
  return generateMockPipelines();
}

export type UsePipelinesResult = {
  /** Pipelines for the given fund (or all if fundId === "all") */
  pipelines: Pipeline[];
  addPipeline: (p: Omit<Pipeline, "id" | "createdAt">) => void;
  updatePipeline: (id: string, updates: Partial<Pick<Pipeline, "name" | "filterCriteria">>) => void;
  removePipeline: (id: string) => void;
  ready: boolean;
};

/**
 * Hook for pipelines, scoped by fund.
 * Merges with mock pipelines on first load (empty storage).
 */
export function usePipelines(fundId: string): UsePipelinesResult {
  const [allPipelines, setAllPipelines, ready] = usePersistentState<Pipeline[]>(
    PIPELINES_STORAGE_KEY,
    getInitialPipelines()
  );

  const pipelines =
    fundId === "all"
      ? allPipelines
      : allPipelines.filter((p) => p.fundId === fundId);

  const addPipeline = (p: Omit<Pipeline, "id" | "createdAt">) => {
    const newPipeline: Pipeline = {
      ...p,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setAllPipelines((prev) => [...prev, newPipeline]);
  };

  const updatePipeline = (
    id: string,
    updates: Partial<Pick<Pipeline, "name" | "filterCriteria">>
  ) => {
    setAllPipelines((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const removePipeline = (id: string) => {
    setAllPipelines((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    pipelines,
    addPipeline,
    updatePipeline,
    removePipeline,
    ready,
  };
}
