"use client";

import { useEffect, useMemo } from "react";
import { useContactSuggestions } from "@/components/contact-suggestions-provider";
import {
  countSettingsQueueSuggestions,
  partitionContactSuggestionsForSurfacing,
} from "@/lib/contact-suggestion-surfacing";

export function useContactSuggestionSurfacing() {
  const { ready, suggestions, surfaceSuggestionIfPending } = useContactSuggestions();

  const { todayInterrupts, settingsQueue } = useMemo(
    () => partitionContactSuggestionsForSurfacing(suggestions),
    [suggestions]
  );

  const settingsQueueCount = useMemo(
    () => countSettingsQueueSuggestions(suggestions),
    [suggestions]
  );

  const pendingInterruptIds = useMemo(
    () =>
      todayInterrupts
        .filter((row) => suggestions.find((s) => s.id === row.id)?.status === "pending")
        .map((row) => row.id),
    [todayInterrupts, suggestions]
  );

  useEffect(() => {
    if (!ready || pendingInterruptIds.length === 0) return;
    for (const id of pendingInterruptIds) {
      surfaceSuggestionIfPending(id);
    }
  }, [ready, pendingInterruptIds, surfaceSuggestionIfPending]);

  return {
    ready,
    todayInterrupts,
    settingsQueue,
    settingsQueueCount,
  };
}
