"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  criteriaEqual,
  criteriaToFilterTags,
  removeCriteriaTag,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { RELATIONSHIP_QUICK_FILTERS } from "@/lib/relationshipQuickFilters";

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

  const selectedQuickFilterId = useMemo(() => {
    const match = RELATIONSHIP_QUICK_FILTERS.find((s) => criteriaEqual(currentFilters, s.criteria));
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

  const handleClearAll = () => {
    onClearFilters();
    setInput("");
    toast.success("Filters cleared");
  };

  const handleNlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) return;

    if (/\b(clear|reset|show\s+all)\b/i.test(trimmed)) {
      handleClearAll();
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
    <div className="flex flex-col gap-2.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-[18px] py-3.5 shadow-[var(--tomo-shadow-1)]">
      {filterTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="relationships-active-filter-tags">
          {filterTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => removeTag(t.id)}
              className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-[color:color-mix(in_srgb,var(--tomo-teal)_65%,var(--tomo-rule))] bg-[color:color-mix(in_srgb,var(--tomo-teal)_8%,transparent)] px-3 py-1 text-[12px] font-medium text-[color:var(--tomo-teal)] transition hover:opacity-90"
              title={`Remove: ${t.label}`}
            >
              <span className="truncate">{t.label}</span>
              <span className="text-[color:var(--tomo-teal)] opacity-80" aria-hidden>
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-[color:var(--tomo-mute)] underline underline-offset-2 transition hover:text-[color:var(--foreground)]"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" data-testid="relationships-filter-suggestion-chips">
        {RELATIONSHIP_QUICK_FILTERS.map((s) => {
          const selected = selectedQuickFilterId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => applyChip(s.criteria, s.label)}
              disabled={submitting}
              title={s.srsNote}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-normal transition disabled:opacity-50 ${
                selected
                  ? "border-[color:var(--tomo-navy)] bg-[color:var(--tomo-navy)] font-medium text-white"
                  : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] text-[color:var(--tomo-body)] hover:border-[color:var(--tomo-navy)] hover:text-[color:var(--tomo-navy)]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleNlSubmit}
        className="flex flex-wrap items-center gap-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-canvas)] px-3 py-2 shadow-[var(--tomo-shadow-1)] transition focus-within:border-[color:var(--tomo-teal)] dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_55%,transparent)]"
      >
        <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0 text-[color:var(--tomo-teal)]" aria-hidden />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Tomo about your relationships… e.g. Tier 1 LPs with confirmed mandate fit and no meaningful touch in 14+ days"
          disabled={submitting}
          className="min-w-0 flex-1 basis-[min(100%,12rem)] border-0 bg-transparent text-[13px] text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--tomo-mute)] disabled:opacity-50"
        />
        <span className="hidden shrink-0 rounded-[2px] bg-[color:var(--tomo-card-warm)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)] sm:inline">
          V1 · Filter
        </span>
        <button
          type="submit"
          disabled={!input.trim() || submitting}
          className="shrink-0 rounded-[2px] p-1.5 text-[color:var(--tomo-mute)] transition hover:text-[color:var(--tomo-teal)] disabled:opacity-40"
          aria-label="Apply filter"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
