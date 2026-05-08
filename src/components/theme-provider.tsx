"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import {
  APPEARANCE_STORAGE_KEY,
  type AppearancePreference,
  applyAppearanceToDocument,
  isAppearancePreference,
} from "@/lib/theme-appearance";
import { usePersistentState } from "@/lib/usePersistentState";

type ThemeContextValue = {
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference | ((prev: AppearancePreference) => AppearancePreference)) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference, ready] = usePersistentState<AppearancePreference>(
    APPEARANCE_STORAGE_KEY,
    "system"
  );

  useLayoutEffect(() => {
    applyAppearanceToDocument(preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearanceToDocument("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== APPEARANCE_STORAGE_KEY || e.newValue == null) return;
      try {
        const next = JSON.parse(e.newValue) as unknown;
        if (isAppearancePreference(next)) setPreference(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setPreference]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      ready,
    }),
    [preference, setPreference, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppearanceSettings(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppearanceSettings must be used within ThemeProvider");
  }
  return ctx;
}
