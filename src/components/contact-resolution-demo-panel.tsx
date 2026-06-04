"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRelationships } from "@/components/relationships-provider";
import { useContactResolutionBackfill } from "@/hooks/use-contact-resolution-backfill";
import { useContactSuggestions } from "@/components/contact-suggestions-provider";
import { RelationshipDraftModal } from "@/components/relationship-draft-modal";
import { classifyInboundContactEmail } from "@/lib/contact-suggestion-classify-client";
import type { ClassifyInboundResult } from "@/lib/contact-suggestion-classifier";
import { matchSenderAgainstRelationships, shouldSkipNewRelationshipSuggestion } from "@/lib/contact-resolution-match";
import {
  buildPrefillFromSender,
  DEMO_CONTACT_SUGGESTION_FIXTURES,
  fixtureToContactSuggestion,
  isSenderSuppressed,
} from "@/lib/contact-suggestions";
import { normalizeEmail, parseSenderFromHeader } from "@/lib/relationship-email";

const GOLDEN_PRESETS = [
  {
    label: "Sarah Lee (likely LP)",
    from: "Sarah Lee <sarah.lee@northbridgefo.com>",
    subject: "Intro and fund materials",
    body: "Could you please send through your fund deck, latest monthly performance, and DDQ?",
  },
  {
    label: "Daniel Kim (maybe)",
    from: "Daniel Kim <daniel.kim@oakridgepartners.com>",
    subject: "Follow up from conference",
    body: "Great meeting you at iConnections — would love to learn more about your strategy when you have time.",
  },
  {
    label: "Priya Shah (consultant)",
    from: "Priya Shah <priya.shah@meridianadvisors.com>",
    subject: "Strategy overview for institutional clients",
    body: "Could you share your strategy overview, AUM, and net returns for our institutional clients?",
  },
  {
    label: "Mark Evans (vendor)",
    from: "Mark Evans <mark.evans@ledgerfundadmin.com>",
    subject: "Fund admin platform demo",
    body: "We'd love to show you our fund administration software — are you free for a 30-minute demo?",
  },
  {
    label: "Webinar (newsletter)",
    from: "Events <events@marketing.webinar.io>",
    subject: "Allocator trends webinar",
    body: "Register for our free webinar this Thursday — unsubscribe at any time.",
  },
] as const;

/**
 * Phase 2 dev panel — simulates inbound email → classify API → suggestion queue.
 */
export function ContactResolutionDemoPanel() {
  const { relationships } = useRelationships();
  const { confirmRelationshipWithBackfill } = useContactResolutionBackfill();
  const { addSuggestion, loadDemoFixtures, suggestions, suppressions } = useContactSuggestions();

  const [from, setFrom] = useState<string>(GOLDEN_PRESETS[0].from);
  const [subject, setSubject] = useState<string>(GOLDEN_PRESETS[0].subject);
  const [body, setBody] = useState<string>(GOLDEN_PRESETS[0].body);
  const [classifying, setClassifying] = useState(false);
  const [lastResult, setLastResult] = useState<ClassifyInboundResult | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftPrefill, setDraftPrefill] = useState<ReturnType<typeof buildPrefillFromSender> | null>(null);

  const parsed = useMemo(() => parseSenderFromHeader(from), [from]);

  const match = useMemo(
    () =>
      matchSenderAgainstRelationships(parsed.email || from, relationships, {
        senderName: parsed.name,
      }),
    [parsed, from, relationships]
  );

  const openDraftFromInbound = () => {
    if (shouldSkipNewRelationshipSuggestion(match)) {
      toast.message("Existing contact", {
        description: `${match.existingContact?.name} at ${match.existingContact?.firm} already matches this email.`,
      });
      return;
    }
    const firm =
      match.organizationFirmMatch?.firm ||
      (lastResult?.outcome === "suggestion"
        ? lastResult.suggestion.prefill.firm_name
        : parsed.name || "Unknown firm");
    const prefill = buildPrefillFromSender({
      person_name: parsed.name || "Unknown",
      email: parsed.email,
      firm_name: firm,
      relationship_type: "Family Office",
    });
    setDraftPrefill(prefill);
    setDraftOpen(true);
  };

  const classifyAndQueue = async () => {
    const email = normalizeEmail(parsed.email);
    if (!email.includes("@")) {
      toast.error("Enter a valid From address with an email.");
      return;
    }
    if (isSenderSuppressed(email, suppressions)) {
      toast.message("Sender suppressed", {
        description: "This address is on the not-an-investor list for 30 days.",
      });
      return;
    }
    const open = suggestions.find(
      (s) =>
        normalizeEmail(s.senderEmail) === email &&
        (s.status === "pending" || s.status === "surfaced")
    );
    if (open) {
      toast.message("Open suggestion exists", {
        description: "Refresh reason on the pending row instead of duplicating (§3.3a BR-3.3a.4).",
      });
      return;
    }

    setClassifying(true);
    try {
      const result = await classifyInboundContactEmail({
        from,
        subject,
        body,
        crmMatchConfidence: match.confidence,
        existingContactName: match.existingContact?.name,
      });
      setLastResult(result);

      if (result.outcome === "skipped") {
        toast.message("Skipped", { description: result.reason });
        return;
      }
      if (result.outcome === "no_suggestion") {
        toast.message("No suggestion", {
          description: `${result.classification} (${result.confidence}%) — ${result.reason}`,
        });
        return;
      }

      const queue = addSuggestion({
        ...result.suggestion,
        status: "pending",
      });
      if (!queue.ok) {
        toast.message(queue.reason === "sender_suppressed" ? "Sender suppressed" : "Could not queue", {
          description: queue.reason,
        });
        return;
      }

      const mode = result.usedFixture ? "golden fixture" : result.usedLlm ? "LLM" : "rules";
      toast.success(`Queued ${result.classification.replace(/_/g, " ")}`, {
        description: `${result.confidence}% confidence · classified via ${mode}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Classification failed");
    } finally {
      setClassifying(false);
    }
  };

  const queueSarahFixture = () => {
    const f = DEMO_CONTACT_SUGGESTION_FIXTURES[0]!;
    const result = addSuggestion(fixtureToContactSuggestion(f, "pending"));
    if (!result.ok) {
      toast.message(
        result.reason === "sender_suppressed" ? "Sender suppressed" : "Could not queue suggestion",
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

  const applyPreset = (preset: (typeof GOLDEN_PRESETS)[number]) => {
    setFrom(preset.from);
    setSubject(preset.subject);
    setBody(preset.body);
    setLastResult(null);
  };

  return (
    <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-teal)]/40 bg-[color:color-mix(in_srgb,var(--tomo-teal)_6%,var(--tomo-card))] p-4">
      <p className="text-sm font-semibold text-[color:var(--foreground)]">Contact resolution (demo)</p>
      <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
        Phase 2 — simulates inbound email → POST /api/contact-suggestions/classify → local suggestion queue.
        Golden fixtures work offline; other mail uses rules or OpenAI when configured.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {GOLDEN_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="rounded-full border border-[color:var(--tomo-rule)] px-2.5 py-0.5 text-[11px] font-medium hover:bg-[color:var(--tomo-surface)]"
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

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
        <label className="tomo-field-label block">Body</label>
        <textarea
          className="tomo-input min-h-[88px] w-full resize-y text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-3 rounded-md border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-3 text-xs text-[color:var(--tomo-body)]">
        <p>
          <span className="font-medium text-[color:var(--foreground)]">CRM match (client):</span>{" "}
          {match.confidence}
        </p>
        {match.existingContact ? (
          <p className="mt-1">
            Existing: {match.existingContact.name} · {match.existingContact.firm} (
            {match.existingContact.primaryEmail})
          </p>
        ) : null}
        {match.organizationFirmMatch && match.confidence === "domain_only" ? (
          <p className="mt-1">
            Firm on file: {match.organizationFirmMatch.firm} — new person at domain may apply.
          </p>
        ) : null}
      </div>

      {lastResult ? (
        <div className="mt-3 rounded-md border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-surface)] p-3 text-xs text-[color:var(--tomo-body)]">
          <p className="font-medium text-[color:var(--foreground)]">
            Last classify: {lastResult.outcome}
            {lastResult.outcome !== "skipped"
              ? ` · ${lastResult.usedFixture ? "fixture" : lastResult.usedLlm ? "LLM" : "rules"}`
              : ""}
          </p>
          <p className="mt-1">{lastResult.reason}</p>
          {lastResult.outcome === "suggestion" ? (
            <p className="mt-1 text-[color:var(--tomo-mute)]">
              {lastResult.classification} · {lastResult.confidence}%
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="button-primary rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          onClick={() => void classifyAndQueue()}
          disabled={classifying}
        >
          {classifying ? "Classifying…" : "Classify & queue"}
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={openDraftFromInbound}
        >
          Open RelationshipDraft
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={queueSarahFixture}
        >
          Queue Sarah (fixture only)
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
        {suggestions.filter((s) => s.status === "pending" || s.status === "surfaced").length} open
        suggestion(s) in localStorage.
      </p>

      <RelationshipDraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        prefill={draftPrefill}
        title="Add relationship"
        subtitle={`Demo inbound · ${subject}`}
        onConfirm={(r) => {
          const email = draftPrefill?.email || parsed.email;
          if (email.includes("@")) {
            confirmRelationshipWithBackfill(r, {
              senderEmail: email,
              mode: "add",
            });
          } else {
            toast.error("Add a valid primary email to run backfill.");
            return;
          }
          setDraftOpen(false);
        }}
      />
    </div>
  );
}
