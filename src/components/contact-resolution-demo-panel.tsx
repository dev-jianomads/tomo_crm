"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRelationships } from "@/components/relationships-provider";
import { useContactSuggestions } from "@/components/contact-suggestions-provider";
import { RelationshipDraftModal } from "@/components/relationship-draft-modal";
import { matchSenderAgainstRelationships, shouldSkipNewRelationshipSuggestion } from "@/lib/contact-resolution-match";
import {
  buildPrefillFromSender,
  DEMO_CONTACT_SUGGESTION_FIXTURES,
  fixtureToContactSuggestion,
} from "@/lib/contact-suggestions";
import { parseSenderFromHeader } from "@/lib/relationship-email";

/**
 * Phase 1 dev panel — test CRM match ladder + RelationshipDraft prefill (not live inbox).
 */
export function ContactResolutionDemoPanel() {
  const { relationships, addRelationship } = useRelationships();
  const { addSuggestion, loadDemoFixtures, suggestions } = useContactSuggestions();

  const [from, setFrom] = useState("Sarah Lee <sarah.lee@northbridgefo.com>");
  const [subject, setSubject] = useState("Intro and fund materials");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftPrefill, setDraftPrefill] = useState<ReturnType<typeof buildPrefillFromSender> | null>(null);

  const parsed = useMemo(() => parseSenderFromHeader(from), [from]);

  const match = useMemo(
    () =>
      matchSenderAgainstRelationships(parsed.email || from, relationships, {
        senderName: parsed.name,
        firmHint: draftPrefill?.firm_name,
      }),
    [parsed, from, relationships, draftPrefill?.firm_name]
  );

  const openDraftFromInbound = () => {
    if (shouldSkipNewRelationshipSuggestion(match)) {
      toast.message("Existing contact", {
        description: `${match.existingContact?.name} at ${match.existingContact?.firm} already matches this email.`,
      });
      return;
    }
    const firm =
      draftPrefill?.firm_name ||
      match.organizationFirmMatch?.firm ||
      parsed.name ||
      "Unknown firm";
    const prefill = buildPrefillFromSender({
      person_name: parsed.name || "Unknown",
      email: parsed.email,
      firm_name: firm,
      relationship_type: "Family Office",
    });
    setDraftPrefill(prefill);
    setDraftOpen(true);
  };

  const queueSarahFixture = () => {
    const f = DEMO_CONTACT_SUGGESTION_FIXTURES[0]!;
    const result = addSuggestion(fixtureToContactSuggestion(f, "pending"));
    if (!result.ok) {
      toast.message(
        result.reason === "sender_suppressed"
          ? "Sender suppressed"
          : "Could not queue suggestion",
        {
          description:
            result.reason === "sender_suppressed"
              ? "This address is on the not-an-investor list for 30 days."
              : "Invalid sender email on the fixture.",
        }
      );
      return;
    }
    toast.success("Queued demo suggestion for Sarah Lee");
  };

  return (
    <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-teal)]/40 bg-[color:color-mix(in_srgb,var(--tomo-teal)_6%,var(--tomo-card))] p-4">
      <p className="text-sm font-semibold text-[color:var(--foreground)]">Contact resolution (demo)</p>
      <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
        Phase 1 mock — not connected to live inbox. Tests §3.3a match ladder and RelationshipDraft prefill.
      </p>

      <div className="mt-3 space-y-2">
        <label className="tomo-field-label block">From</label>
        <input
          className="tomo-input w-full text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Name &lt;email@domain.com&gt;"
        />
        <label className="tomo-field-label block">Subject</label>
        <input
          className="tomo-input w-full text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="mt-3 rounded-md border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3 text-xs text-[color:var(--tomo-body)]">
        <p>
          <span className="font-medium text-[color:var(--foreground)]">Match:</span> {match.confidence}
        </p>
        {match.existingContact ? (
          <p className="mt-1">
            Existing: {match.existingContact.name} · {match.existingContact.firm} ({match.existingContact.primaryEmail})
          </p>
        ) : null}
        {match.organizationFirmMatch && match.confidence === "domain_only" ? (
          <p className="mt-1">Firm on file: {match.organizationFirmMatch.firm} — new person at domain may apply.</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="button-primary rounded-md px-3 py-1.5 text-xs font-semibold" onClick={openDraftFromInbound}>
          Open RelationshipDraft
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={queueSarahFixture}
        >
          Queue Sarah fixture
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={() => {
            loadDemoFixtures();
            toast.success("Loaded brief golden fixtures into suggestion store");
          }}
        >
          Load all fixtures
        </button>
      </div>

      <p className="mt-2 text-[11px] text-[color:var(--tomo-mute)]">
        {suggestions.filter((s) => s.status === "pending" || s.status === "surfaced").length} open suggestion(s) in
        localStorage.
      </p>

      <RelationshipDraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        prefill={draftPrefill}
        title="Add relationship"
        subtitle={`Demo inbound · ${subject}`}
        onConfirm={(r) => {
          addRelationship(r);
          toast.success(`${r.name} added — mock backfill not wired until Phase 4`);
          setDraftOpen(false);
        }}
      />
    </div>
  );
}
