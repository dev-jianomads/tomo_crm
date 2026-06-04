"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ContactSuggestionCard } from "@/components/contact-suggestion-card";
import { LinkExistingContactModal } from "@/components/link-existing-contact-modal";
import { RelationshipDraftModal } from "@/components/relationship-draft-modal";
import { useContactSuggestions } from "@/components/contact-suggestions-provider";
import { useRelationships } from "@/components/relationships-provider";
import { useContactResolutionBackfill } from "@/hooks/use-contact-resolution-backfill";
import type { ContactSuggestion } from "@/lib/contact-suggestions";
import type { Relationship } from "@/lib/mockData";
import type { RelationshipDraftPrefill } from "@/lib/relationship-draft";

type ContactSuggestionFlowProps = {
  suggestion: ContactSuggestion;
  variant?: "today" | "settings";
};

/**
 * Card + RelationshipDraft / link-existing modals for a single suggestion (§3.3a).
 */
export function ContactSuggestionFlow({ suggestion, variant = "today" }: ContactSuggestionFlowProps) {
  const { dismissSuggestion, confirmSuggestion } = useContactSuggestions();
  const { relationships } = useRelationships();
  const { confirmRelationshipWithBackfill } = useContactResolutionBackfill();
  const [draftOpen, setDraftOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const prefill: RelationshipDraftPrefill = {
    person_name: suggestion.prefill.person_name,
    email: suggestion.prefill.email,
    firm_name: suggestion.prefill.firm_name,
    domain: suggestion.prefill.domain,
    relationship_type: suggestion.prefill.relationship_type,
    source_hint: "inbound_email",
    suggested_next_move: suggestion.prefill.suggested_next_move,
  };

  const subtitle =
    suggestion.sourceSubject != null
      ? `Inbound · ${suggestion.sourceSubject}`
      : `Inbound · ${suggestion.senderEmail}`;

  const finishConfirm = useCallback(
    (relationship: Relationship, mode: "add" | "link") => {
      const { relationship: patched } = confirmRelationshipWithBackfill(relationship, {
        senderEmail: suggestion.senderEmail,
        suggestion,
        mode,
        successVerb: mode === "link" ? "Linked" : "Added",
      });
      confirmSuggestion(suggestion.id, patched);
      setDraftOpen(false);
      setLinkOpen(false);
    },
    [confirmRelationshipWithBackfill, confirmSuggestion, suggestion]
  );

  return (
    <>
      <ContactSuggestionCard
        suggestion={suggestion}
        variant={variant}
        onReview={() => setDraftOpen(true)}
        onAdd={() => setDraftOpen(true)}
        onLink={() => setLinkOpen(true)}
        onIgnore={() => {
          dismissSuggestion(suggestion.id, "ignored");
          toast.message("Suggestion dismissed", {
            description: "Same sender may resurface on new inbound mail.",
          });
        }}
        onNotInvestor={() => {
          dismissSuggestion(suggestion.id, "not_investor");
          toast.message("Sender suppressed for 30 days", {
            description: suggestion.senderEmail,
          });
        }}
      />
      <RelationshipDraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        prefill={prefill}
        title="Add relationship"
        subtitle={subtitle}
        onConfirm={(r) => finishConfirm(r, "add")}
      />
      <LinkExistingContactModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        senderEmail={suggestion.senderEmail}
        senderName={suggestion.prefill.person_name}
        firmHint={suggestion.prefill.firm_name}
        relationships={relationships}
        onLink={(r) => finishConfirm(r, "link")}
      />
    </>
  );
}
