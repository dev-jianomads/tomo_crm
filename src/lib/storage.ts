import { useState } from "react";

export function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to read storage", error);
    return fallback;
  }
}

export function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to write storage", error);
  }
}

export function usePersistentState<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const initialValue = typeof window !== "undefined" ? readFromStorage<T>(key, initial) : initial;
  const [state, setState] = useState<T>(initialValue);
  const ready = typeof window !== "undefined";

  const update = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      writeToStorage(key, next);
      return next;
    });
  };

  return [state, update, ready];
}

