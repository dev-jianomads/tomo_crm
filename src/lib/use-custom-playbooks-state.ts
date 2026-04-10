"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  CUSTOM_PLAYBOOKS_STORAGE_KEY,
  migrateLegacyCustomPlaybooksList,
  type CustomPlaybookStored,
} from "@/lib/customPlaybooks";
import { readFromStorage, writeToStorage } from "@/lib/storage";

/** Same persistence as `usePersistentState`, but migrates legacy playbooks on first read. */
export function useCustomPlaybooksPersistentState(): [
  CustomPlaybookStored[],
  (
    val: CustomPlaybookStored[] | ((prev: CustomPlaybookStored[]) => CustomPlaybookStored[])
  ) => void,
  boolean,
] {
  const [state, setState] = useState<CustomPlaybookStored[]>(() => []);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef<CustomPlaybookStored[]>([]);

  useLayoutEffect(() => {
    const raw = readFromStorage<CustomPlaybookStored[]>(CUSTOM_PLAYBOOKS_STORAGE_KEY, fallbackRef.current);
    const { list, changed } = migrateLegacyCustomPlaybooksList(raw);
    if (changed) writeToStorage(CUSTOM_PLAYBOOKS_STORAGE_KEY, list);
    setState(list);
    setReady(true);
  }, []);

  const update = useCallback(
    (val: CustomPlaybookStored[] | ((prev: CustomPlaybookStored[]) => CustomPlaybookStored[])) => {
      setState((prev) => {
        const next = typeof val === "function" ? (val as (p: CustomPlaybookStored[]) => CustomPlaybookStored[])(prev) : val;
        writeToStorage(CUSTOM_PLAYBOOKS_STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  return [state, update, ready];
}
