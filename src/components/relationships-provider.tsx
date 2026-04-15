"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Relationship } from "@/lib/mockData";
import { relationshipsGenerated } from "@/lib/mockData";

type RelationshipsContextValue = {
  /** LP rows: starts as generated data, then replaces with `exports/mock-relationships.csv` when the GET completes. */
  relationships: Relationship[];
};

const RelationshipsContext = createContext<RelationshipsContextValue | null>(null);

export function RelationshipsProvider({ children }: { children: ReactNode }) {
  const [relationships, setRelationships] = useState<Relationship[]>(relationshipsGenerated);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crm/relationships", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Relationship[]>;
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setRelationships(data);
      })
      .catch(() => {
        if (!cancelled) setRelationships(relationshipsGenerated);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ relationships }), [relationships]);

  return <RelationshipsContext.Provider value={value}>{children}</RelationshipsContext.Provider>;
}

export function useRelationships(): RelationshipsContextValue {
  const ctx = useContext(RelationshipsContext);
  if (!ctx) {
    throw new Error("useRelationships must be used within RelationshipsProvider");
  }
  return ctx;
}
