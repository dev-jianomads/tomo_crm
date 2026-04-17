"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Relationship } from "@/lib/mockData";
import { relationshipsGenerated } from "@/lib/mockData";
import { usePersistentState } from "@/lib/usePersistentState";

type RelationshipsContextValue = {
  /** LP rows: CRM base (CSV or generated) plus manually added contacts (persisted). */
  relationships: Relationship[];
  addRelationship: (relationship: Relationship) => void;
  /** Clears manual contacts and reloads base CRM from `/api/crm/relationships` (fallback: generated mock). */
  resetRelationshipsDemo: () => void;
};

const RelationshipsContext = createContext<RelationshipsContextValue | null>(null);

async function loadBaseFromApi(): Promise<Relationship[]> {
  const res = await fetch("/api/crm/relationships", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as Relationship[];
  if (!Array.isArray(data) || data.length === 0) throw new Error("empty");
  return data;
}

export function RelationshipsProvider({ children }: { children: ReactNode }) {
  const [baseRelationships, setBaseRelationships] = useState<Relationship[]>(relationshipsGenerated);
  const [manualRelationships, setManualRelationships] = usePersistentState<Relationship[]>(
    "tomo-relationships-manual-v1",
    []
  );

  const reloadBase = useCallback(() => {
    loadBaseFromApi()
      .then(setBaseRelationships)
      .catch(() => setBaseRelationships(relationshipsGenerated));
  }, []);

  useEffect(() => {
    reloadBase();
  }, [reloadBase]);

  const relationships = useMemo(
    () => [...baseRelationships, ...manualRelationships],
    [baseRelationships, manualRelationships]
  );

  const addRelationship = useCallback(
    (relationship: Relationship) => {
      setManualRelationships((prev) => [...prev, relationship]);
    },
    [setManualRelationships]
  );

  const resetRelationshipsDemo = useCallback(() => {
    setManualRelationships([]);
    reloadBase();
  }, [reloadBase, setManualRelationships]);

  const value = useMemo(
    () => ({ relationships, addRelationship, resetRelationshipsDemo }),
    [relationships, addRelationship, resetRelationshipsDemo]
  );

  return <RelationshipsContext.Provider value={value}>{children}</RelationshipsContext.Provider>;
}

export function useRelationships(): RelationshipsContextValue {
  const ctx = useContext(RelationshipsContext);
  if (!ctx) {
    throw new Error("useRelationships must be used within RelationshipsProvider");
  }
  return ctx;
}
