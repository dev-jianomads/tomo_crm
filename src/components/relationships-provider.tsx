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

export type OffChannelPatchAction = "set" | "extend" | "clear";

type RelationshipsContextValue = {
  /** LP rows: CRM base (CSV or generated) plus manually added contacts (persisted). */
  relationships: Relationship[];
  addRelationship: (relationship: Relationship) => void;
  /** Merge CRM or manual row after contact-resolution backfill (§3.3a). */
  patchRelationship: (relationship: Relationship) => void;
  /** Clears manual contacts and reloads base CRM from `/api/crm/relationships` (fallback: generated mock). */
  resetRelationshipsDemo: () => void;
  /** PATCH demo `off_channel_active_until` and merge into in-memory relationships. */
  patchOffChannel: (lpId: string, action: OffChannelPatchAction) => Promise<void>;
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
    [],
  );
  const [offChannelById, setOffChannelById] = usePersistentState<Record<string, string | null>>(
    "tomo-off-channel-active-until-v1",
    {},
  );
  const [backfillOverrides, setBackfillOverrides] = usePersistentState<Record<string, Relationship>>(
    "tomo-relationship-backfill-overrides-v1",
    {},
  );

  const reloadBase = useCallback(() => {
    loadBaseFromApi()
      .then(setBaseRelationships)
      .catch(() => setBaseRelationships(relationshipsGenerated));
  }, []);

  useEffect(() => {
    reloadBase();
  }, [reloadBase]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lp-contacts")
      .then((r) => r.json())
      .then((data: { contacts?: { id: string; lp_state: { off_channel_active_until: string | null } }[] }) => {
        const contacts = data?.contacts;
        if (cancelled || !contacts) return;
        setOffChannelById((prev) => {
          const next = { ...prev };
          for (const c of contacts) {
            next[c.id] = c.lp_state.off_channel_active_until ?? null;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setOffChannelById]);

  const mergeOffChannel = useCallback(
    (r: Relationship): Relationship => {
      if (!(r.id in offChannelById)) return r;
      return { ...r, offChannelActiveUntil: offChannelById[r.id] };
    },
    [offChannelById],
  );

  const relationships = useMemo(
    () =>
      [...baseRelationships, ...manualRelationships]
        .map((r) => backfillOverrides[r.id] ?? r)
        .map(mergeOffChannel),
    [baseRelationships, manualRelationships, backfillOverrides, mergeOffChannel],
  );

  const addRelationship = useCallback(
    (relationship: Relationship) => {
      setManualRelationships((prev) => [...prev, relationship]);
    },
    [setManualRelationships],
  );

  const patchRelationship = useCallback(
    (relationship: Relationship) => {
      setManualRelationships((prev) => {
        if (prev.some((r) => r.id === relationship.id)) {
          return prev.map((r) => (r.id === relationship.id ? relationship : r));
        }
        return prev;
      });
      setBackfillOverrides((prev) => ({ ...prev, [relationship.id]: relationship }));
    },
    [setManualRelationships, setBackfillOverrides],
  );

  const resetRelationshipsDemo = useCallback(() => {
    setManualRelationships([]);
    setBackfillOverrides({});
    reloadBase();
  }, [reloadBase, setManualRelationships, setBackfillOverrides]);

  const patchOffChannel = useCallback(
    async (lpId: string, action: OffChannelPatchAction) => {
      const res = await fetch(`/api/lp-contacts/${encodeURIComponent(lpId)}/off-channel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { contact: { lp_state: { off_channel_active_until: string | null } } };
      setOffChannelById((prev) => ({
        ...prev,
        [lpId]: data.contact.lp_state.off_channel_active_until,
      }));
    },
    [setOffChannelById],
  );

  const value = useMemo(
    () => ({
      relationships,
      addRelationship,
      patchRelationship,
      resetRelationshipsDemo,
      patchOffChannel,
    }),
    [relationships, addRelationship, patchRelationship, resetRelationshipsDemo, patchOffChannel],
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
