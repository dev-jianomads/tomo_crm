"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { readFromStorage, writeToStorage } from "./storage";

/**
 * React hook for persisted state (survives page refresh)
 * @returns [value, setValue, ready] — `ready` is true after localStorage has been applied (always false on server).
 */
export function usePersistentState<T>(
  key: string,
  initial: T
): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(() => initial);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef(initial);
  fallbackRef.current = initial;

  useLayoutEffect(() => {
    setState(readFromStorage(key, fallbackRef.current));
    setReady(true);
  }, [key]);

  const update = useCallback((val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      writeToStorage(key, next);
      return next;
    });
  }, [key]);

  return [state, update, ready];
}
