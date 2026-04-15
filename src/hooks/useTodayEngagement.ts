"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadTodayEngagementState,
  mergeEngaged,
  mergeSurfaced,
  saveTodayEngagementState,
  type TodayEngagementState,
} from "@/lib/todayEngagement";

/**
 * Keeps engagement state in sync with localStorage and records surfaced attention ids.
 */
export function useTodayEngagement(attentionIds: string[]) {
  const [state, setState] = useState<TodayEngagementState>(loadTodayEngagementState);

  useEffect(() => {
    setState(loadTodayEngagementState());
  }, []);

  const attentionKey = useMemo(() => attentionIds.join(","), [attentionIds]);

  useEffect(() => {
    setState((prev) => {
      const next = mergeSurfaced(prev, attentionIds);
      if (next === prev) return prev;
      saveTodayEngagementState(next);
      return next;
    });
  }, [attentionKey, attentionIds]);

  const recordEngaged = useCallback((actionId: string) => {
    setState((prev) => {
      const next = mergeEngaged(prev, actionId);
      saveTodayEngagementState(next);
      return next;
    });
  }, []);

  return { state, recordEngaged };
}
