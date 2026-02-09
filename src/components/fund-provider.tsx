"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { usePersistentState } from "@/lib/storage";

export type Fund = { id: string; name: string };

type FundContextValue = {
  funds: Fund[];
  activeFundId: string;
  setActiveFundId: (id: string) => void;
  addFund: (name: string) => void;
  updateFund: (id: string, name: string) => void;
  removeFund: (id: string) => void;
};

const FundContext = createContext<FundContextValue | null>(null);

const defaultFunds: Fund[] = [
  { id: "fund-1", name: "Fund I" },
  { id: "fund-2", name: "Fund II" },
  { id: "fund-3", name: "Fund III" },
];

export function FundProvider({ children }: { children: React.ReactNode }) {
  const [funds, setFunds] = usePersistentState<Fund[]>("tomo-funds", defaultFunds);
  const [activeFundId, setActiveFundId] = usePersistentState<string>("tomo-active-fund", defaultFunds[0].id);

  useEffect(() => {
    const exists = funds.some((fund) => fund.id === activeFundId);
    if (!exists) setActiveFundId(funds[0]?.id ?? defaultFunds[0].id);
  }, [activeFundId, funds, setActiveFundId]);

  const value = useMemo<FundContextValue>(
    () => ({
      funds,
      activeFundId,
      setActiveFundId,
      addFund: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const newFund: Fund = { id: crypto.randomUUID(), name: trimmed };
        setFunds((prev) => [...prev, newFund]);
        setActiveFundId(newFund.id);
      },
      updateFund: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setFunds((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
        setActiveFundId((prev) => (prev === id ? id : prev));
      },
      removeFund: (id: string) => {
        setFunds((prev) => prev.filter((f) => f.id !== id));
        setActiveFundId((prev) => {
          if (prev !== id) return prev;
          const remaining = funds.filter((f) => f.id !== id);
          return remaining[0]?.id ?? defaultFunds[0].id;
        });
      },
    }),
    [activeFundId, funds, setActiveFundId, setFunds]
  );

  return <FundContext.Provider value={value}>{children}</FundContext.Provider>;
}

export function useFunds() {
  const ctx = useContext(FundContext);
  if (!ctx) throw new Error("useFunds must be used within FundProvider");
  return ctx;
}



