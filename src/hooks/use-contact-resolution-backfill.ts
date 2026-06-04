"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useRelationships } from "@/components/relationships-provider";
import type { ContactSuggestion } from "@/lib/contact-suggestions";
import {
  appendMockLinkedInteractions,
  applyBackfillToRelationship,
  formatContactResolutionBackfillToast,
  runContactResolutionBackfill,
  type ContactResolutionBackfillResult,
} from "@/lib/contact-resolution-backfill";
import type { Relationship } from "@/lib/mockData";
import { normalizeEmail } from "@/lib/relationship-email";

export type ConfirmRelationshipWithBackfillOptions = {
  senderEmail: string;
  suggestion?: ContactSuggestion;
  /** `add` persists a new manual row; `link` patches an existing LP. */
  mode: "add" | "link";
  successVerb?: string;
};

export function useContactResolutionBackfill() {
  const { relationships, addRelationship, patchRelationship } = useRelationships();

  const confirmRelationshipWithBackfill = useCallback(
    (
      relationship: Relationship,
      options: ConfirmRelationshipWithBackfillOptions
    ): { relationship: Relationship; backfill: ContactResolutionBackfillResult } => {
      const email = normalizeEmail(options.senderEmail);
      const existing =
        options.mode === "link"
          ? relationships.find((r) => r.id === relationship.id) ?? relationship
          : relationship;

      const backfill = runContactResolutionBackfill({
        relationship: existing,
        senderEmail: email,
        suggestion: options.suggestion,
      });

      const patched = applyBackfillToRelationship(
        { ...existing, ...relationship, primaryEmail: relationship.primaryEmail || email },
        backfill
      );

      if (options.mode === "add") {
        addRelationship(patched);
      } else {
        patchRelationship(patched);
      }

      appendMockLinkedInteractions(backfill.linkedInteractions);

      const toastCopy = formatContactResolutionBackfillToast(backfill);
      const verb = options.successVerb ?? (options.mode === "link" ? "Linked" : "Added");
      toast.success(`${verb} ${patched.name}`, { description: toastCopy.description });

      return { relationship: patched, backfill };
    },
    [addRelationship, patchRelationship, relationships]
  );

  return { confirmRelationshipWithBackfill };
}
