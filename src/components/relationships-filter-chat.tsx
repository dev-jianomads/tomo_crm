"use client";

import { useMemo, useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  criteriaEqual,
  criteriaToFilterTags,
  removeCriteriaTag,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { RELATIONSHIP_FILTER_SUGGESTIONS } from "@/lib/relationshipFilterSuggestions";

type FilterRelationshipsResponse = {
  outcome: "success" | "partial" | "failure";
  filters: StructuredFilterCriteria | null;
  message?: string;
  error?: string;
  fallback?: boolean;
};

type RelationshipsFilterChatProps = {
  currentFilters: StructuredFilterCriteria;
  onFiltersChange: (filters: StructuredFilterCriteria) => void;
  onClearFilters: () => void;
};

export function RelationshipsFilterChat({
  currentFilters,
  onFiltersChange,
  onClearFilters,
}: RelationshipsFilterChatProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedSuggestionId = useMemo(() => {
    const match = RELATIONSHIP_FILTER_SUGGESTIONS.find((s) =>
      criteriaEqual(currentFilters, s.criteria)
    );
    return match?.id ?? null;
  }, [currentFilters]);

  const filterTags = useMemo(() => criteriaToFilterTags(currentFilters), [currentFilters]);
  const hasFilters = Object.keys(currentFilters).length > 0;

  const removeTag = (tagId: string) => {
    onFiltersChange(removeCriteriaTag(currentFilters, tagId));
  };

  const applyChip = (criteria: StructuredFilterCriteria, label: string) => {
    onFiltersChange({ ...criteria });
    toast.success("Filter applied", { description: label });
  };

  const handleNlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) return;

    if (/\b(clear|reset|show\s+all)\b/i.test(trimmed)) {
      onClearFilters();
      setInput("");
      toast.success("Filters cleared");
      return;
    }

    setSubmitting(true);
    setInput("");
    try {
      const res = await fetch("/api/tomo/filter-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, currentFilters }),
      });
      const data = (await res.json()) as FilterRelationshipsResponse;

      if (!res.ok || data.outcome === "failure" || data.filters == null) {
        toast.error("Couldn’t apply filters", {
          description: data.error ?? "Try rephrasing or use a quick filter above.",
        });
        return;
      }

      onFiltersChange(data.filters);

      if (data.outcome === "success") {
        toast.success("Filters applied");
      } else {
        toast.warning("Closest matching filter", {
          description: data.message ?? "Review active filters — some of your request may not be mapped.",
        });
      }
    } catch {
      toast.error("Filter request failed", { description: "Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex min-h-0 flex-wrap items-center gap-2">
        <p className="shrink-0 tomo-field-label">Filter</p>
        {filterTags.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap gap-1" data-testid="relationships-active-filter-tags">
            {filterTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => removeTag(t.id)}
                className="inline-flex max-w-[200px] items-center gap-0.5 truncate rounded-full border border-[color:color-mix(in_srgb,var(--accent)_35%,var(--tomo-rule))] bg-[color:var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--foreground)] transition hover:opacity-90"
                title={`Remove: ${t.label}`}
              >
                <span className="truncate">{t.label}</span>
                <span className="text-[color:var(--tomo-mute)]" aria-hidden>
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[color:var(--tomo-mute)]">No active filters</span>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--tomo-mute)]">Quick filters</p>
        <div className="flex flex-wrap gap-1.5" data-testid="relationships-filter-suggestion-chips">
          {RELATIONSHIP_FILTER_SUGGESTIONS.map((s) => {
            const selected = selectedSuggestionId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => applyChip(s.criteria, s.label)}
                disabled={submitting}
                className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
                  selected
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                    : "border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_48%,var(--tomo-card))] text-[color:var(--tomo-body)] hover:border-[color:color-mix(in_srgb,var(--accent)_35%,var(--tomo-rule))] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--foreground)]"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleNlSubmit}
        className="flex flex-wrap items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2 py-1.5 shadow-[var(--tomo-shadow-1)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Build your custom filter here ..."
          disabled={submitting}
          className="min-w-0 flex-1 basis-[min(100%,12rem)] border-0 bg-transparent text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--tomo-mute)] disabled:opacity-50"
        />
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              onClearFilters();
              setInput("");
              toast.success("Filters cleared");
            }}
            disabled={submitting}
            className="shrink-0 text-xs font-medium text-[color:var(--tomo-teal-muted)] hover:text-[color:var(--tomo-teal)] hover:underline disabled:opacity-50"
          >
            Clear filters
          </button>
        ) : null}
        <button
          type="submit"
          disabled={!input.trim() || submitting}
          className="shrink-0 rounded-[var(--tomo-radius-md)] bg-[color:var(--accent)] p-1.5 text-white transition hover:opacity-90 disabled:opacity-50"
          aria-label="Apply filter"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
