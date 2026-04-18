"use client";

import { usePersistentState } from "./usePersistentState";
import {
  PIPELINES_STORAGE_KEY,
  generateMockPipelines,
  getInitialPipelines,
  type Pipeline,
} from "./pipelines";

export type UsePipelinesResult = {
  /** Pipelines for the given fund (or all if fundId === "all") */
  pipelines: Pipeline[];
  addPipeline: (p: Omit<Pipeline, "id" | "createdAt">) => void;
  updatePipeline: (
    id: string,
    updates: Partial<
      Pick<
        Pipeline,
        | "name"
        | "filterCriteria"
        | "excludedRelationshipIds"
        | "addedRelationshipIds"
      >
    >
  ) => void;
  removePipeline: (id: string) => void;
  /** Reset to 3 mock pipelines (demo only) */
  resetToMock: () => void;
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
    fundId === "all" ? allPipelines : allPipelines.filter((p) => p.fundId === fundId);

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
    updates: Partial<
      Pick<
        Pipeline,
        | "name"
        | "filterCriteria"
        | "excludedRelationshipIds"
        | "addedRelationshipIds"
      >
    >
  ) => {
    setAllPipelines((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removePipeline = (id: string) => {
    setAllPipelines((prev) => prev.filter((p) => p.id !== id));
  };

  const resetToMock = () => {
    setAllPipelines(generateMockPipelines());
  };

  return {
    pipelines,
    addPipeline,
    updatePipeline,
    removePipeline,
    resetToMock,
    ready,
  };
}
