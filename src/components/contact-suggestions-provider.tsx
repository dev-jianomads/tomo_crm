"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Relationship } from "@/lib/mockData";
import {
  CONTACT_SUGGESTION_SUPPRESSIONS_KEY,
  CONTACT_SUGGESTIONS_STORAGE_KEY,
  createContactSuggestionId,
  fixtureToContactSuggestion,
  DEMO_CONTACT_SUGGESTION_FIXTURES,
  isSenderSuppressed,
  suppressionDaysFromDismiss,
  type AddSuggestionResult,
  type ContactSuggestion,
  type ContactSuggestionDismissReason,
  type SenderSuppression,
} from "@/lib/contact-suggestions";
import { usePersistentState } from "@/lib/usePersistentState";
import { normalizeEmail } from "@/lib/relationship-email";

type ContactSuggestionsContextValue = {
  ready: boolean;
  suggestions: ContactSuggestion[];
  suppressions: SenderSuppression[];
  addSuggestion: (
    row: Omit<ContactSuggestion, "id" | "createdAt"> & { id?: string }
  ) => AddSuggestionResult;
  updateSuggestion: (id: string, patch: Partial<ContactSuggestion>) => void;
  dismissSuggestion: (id: string, reason: ContactSuggestionDismissReason) => void;
  confirmSuggestion: (id: string, relationship: Relationship) => void;
  loadDemoFixtures: () => void;
  clearDismissed: () => void;
};

const ContactSuggestionsContext = createContext<ContactSuggestionsContextValue | null>(null);

export function ContactSuggestionsProvider({ children }: { children: ReactNode }) {
  const [suggestions, setSuggestions, ready] = usePersistentState<ContactSuggestion[]>(
    CONTACT_SUGGESTIONS_STORAGE_KEY,
    []
  );
  const [suppressions, setSuppressions] = usePersistentState<SenderSuppression[]>(
    CONTACT_SUGGESTION_SUPPRESSIONS_KEY,
    []
  );

  const addSuggestion = useCallback(
    (row: Omit<ContactSuggestion, "id" | "createdAt"> & { id?: string }): AddSuggestionResult => {
      const email = normalizeEmail(row.senderEmail);
      if (!email.includes("@")) {
        return { ok: false, reason: "invalid_sender_email" };
      }
      if (isSenderSuppressed(email, suppressions)) {
        return { ok: false, reason: "sender_suppressed" };
      }

      let persisted: ContactSuggestion | undefined;

      setSuggestions((prev) => {
        const existing = prev.find(
          (s) =>
            normalizeEmail(s.senderEmail) === email &&
            (s.status === "pending" || s.status === "surfaced")
        );
        const next: ContactSuggestion = {
          ...row,
          id: row.id ?? createContactSuggestionId(),
          createdAt: new Date().toISOString(),
          senderEmail: email,
        };
        if (existing) {
          persisted = {
            ...next,
            id: existing.id,
            createdAt: existing.createdAt,
          };
          return prev.map((s) => (s.id === existing.id ? persisted! : s));
        }
        persisted = next;
        return [...prev, next];
      });

      if (!persisted) {
        throw new Error("addSuggestion: failed to persist suggestion");
      }
      return { ok: true, suggestion: persisted };
    },
    [setSuggestions, suppressions]
  );

  const updateSuggestion = useCallback(
    (id: string, patch: Partial<ContactSuggestion>) => {
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [setSuggestions]
  );

  const dismissSuggestion = useCallback(
    (id: string, reason: ContactSuggestionDismissReason) => {
      const row = suggestions.find((s) => s.id === id);
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "dismissed", dismissReason: reason } : s
        )
      );
      const days = suppressionDaysFromDismiss(reason);
      if (row && days) {
        const until = new Date();
        until.setDate(until.getDate() + days);
        setSuppressions((prev) => [
          ...prev.filter((x) => normalizeEmail(x.email) !== normalizeEmail(row.senderEmail)),
          { email: row.senderEmail, until: until.toISOString(), reason },
        ]);
      }
    },
    [setSuggestions, setSuppressions, suggestions]
  );

  const confirmSuggestion = useCallback(
    (id: string, relationship: Relationship) => {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "confirmed",
                resolvedLpContactId: relationship.id,
                resolvedAt: new Date().toISOString(),
              }
            : s
        )
      );
    },
    [setSuggestions]
  );

  const loadDemoFixtures = useCallback(() => {
    const rows = DEMO_CONTACT_SUGGESTION_FIXTURES.map((f) => fixtureToContactSuggestion(f, "pending"));
    setSuggestions((prev) => {
      const emails = new Set(rows.map((r) => normalizeEmail(r.senderEmail)));
      const kept = prev.filter((p) => !emails.has(normalizeEmail(p.senderEmail)));
      return [...kept, ...rows];
    });
  }, [setSuggestions]);

  const clearDismissed = useCallback(() => {
    setSuggestions((prev) => prev.filter((s) => s.status !== "dismissed"));
  }, [setSuggestions]);

  const value = useMemo(
    () => ({
      ready,
      suggestions,
      suppressions,
      addSuggestion,
      updateSuggestion,
      dismissSuggestion,
      confirmSuggestion,
      loadDemoFixtures,
      clearDismissed,
    }),
    [
      ready,
      suggestions,
      suppressions,
      addSuggestion,
      updateSuggestion,
      dismissSuggestion,
      confirmSuggestion,
      loadDemoFixtures,
      clearDismissed,
    ]
  );

  return (
    <ContactSuggestionsContext.Provider value={value}>{children}</ContactSuggestionsContext.Provider>
  );
}

export function useContactSuggestions() {
  const ctx = useContext(ContactSuggestionsContext);
  if (!ctx) {
    throw new Error("useContactSuggestions must be used within ContactSuggestionsProvider");
  }
  return ctx;
}
