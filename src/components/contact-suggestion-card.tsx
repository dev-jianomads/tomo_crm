"use client";

import { TomoUrgencyPill } from "@/components/ui/urgency-pill";
import type { ContactSuggestion } from "@/lib/contact-suggestions";
import { classificationHeadline } from "@/lib/contact-suggestion-surfacing";

type ContactSuggestionCardProps = {
  suggestion: ContactSuggestion;
  variant?: "today" | "settings";
  onReview: () => void;
  onAdd: () => void;
  onLink: () => void;
  onIgnore: () => void;
  onNotInvestor: () => void;
};

export function ContactSuggestionCard({
  suggestion,
  variant = "today",
  onReview,
  onAdd,
  onLink,
  onIgnore,
  onNotInvestor,
}: ContactSuggestionCardProps) {
  const { prefill } = suggestion;
  const headline = classificationHeadline(suggestion.classification);

  return (
    <div
      className="tomo-card w-full px-4 py-4"
      data-testid={`contact-suggestion-card-${suggestion.id}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TomoUrgencyPill tone={variant === "today" ? "red" : "amber"}>
          {variant === "today" ? "Review" : "Queue"}
        </TomoUrgencyPill>
        <span className="font-mono text-[10px] tracking-[0.06em] text-[color:var(--tomo-mute)]">
          {suggestion.confidence}%
        </span>
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--tomo-teal-muted)]">
        {headline}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-[color:var(--foreground)]">
        {prefill.person_name}
        <span className="font-normal text-[color:var(--tomo-body)]"> · {prefill.firm_name}</span>
      </p>
      <p className="text-xs text-[color:var(--tomo-mute)]">{prefill.email}</p>
      <p className="mt-2 text-[13px] leading-snug text-[color:var(--tomo-body)]">{suggestion.reason}</p>
      {suggestion.evidence.length > 0 ? (
        <ul className="mt-2 list-inside list-disc text-xs text-[color:var(--tomo-mute)]">
          {suggestion.evidence.slice(0, 3).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {suggestion.sourceSubject ? (
        <p className="mt-2 text-[11px] text-[color:var(--tomo-mute)]">
          Re: {suggestion.sourceSubject}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="button-primary rounded-md px-3 py-1.5 text-xs font-semibold" onClick={onReview}>
          Review
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={onAdd}
        >
          Add relationship
        </button>
        <button
          type="button"
          className="rounded-md border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--tomo-surface)]"
          onClick={onLink}
        >
          Link to existing
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-surface)]"
          onClick={onIgnore}
        >
          Ignore
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-surface)]"
          onClick={onNotInvestor}
        >
          Not an investor
        </button>
      </div>
    </div>
  );
}
