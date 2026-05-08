"use client";

import { useEffect, useMemo, useState } from "react";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Relationship } from "@/lib/mockData";
import type { Pipeline } from "@/lib/pipelines";
import { getPipelineMembers } from "@/lib/pipelines";
import { applyFilters } from "@/lib/relationshipFilters";

type AmendListModalProps = {
  open: boolean;
  pipeline: Pipeline | null;
  relationships: Relationship[];
  onClose: () => void;
  onConfirm: (excludedIds: string[], addedIds: string[]) => void;
};

function draftMembers(
  relationships: Relationship[],
  pipeline: Pipeline,
  excluded: string[],
  added: string[]
): Relationship[] {
  return getPipelineMembers(relationships, {
    ...pipeline,
    excludedRelationshipIds: excluded,
    addedRelationshipIds: added,
  });
}

export function AmendListModal({
  open,
  pipeline,
  relationships,
  onClose,
  onConfirm,
}: AmendListModalProps) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);

  useEffect(() => {
    if (!open || !pipeline) return;
    queueMicrotask(() => {
      setExcluded([...(pipeline.excludedRelationshipIds ?? [])]);
      setAdded([...(pipeline.addedRelationshipIds ?? [])]);
      setShowAddPicker(false);
    });
  }, [open, pipeline?.id]);

  const members = useMemo(() => {
    if (!pipeline) return [];
    return draftMembers(relationships, pipeline, excluded, added).sort((a, b) =>
      a.firm.localeCompare(b.firm)
    );
  }, [relationships, pipeline, excluded, added]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const addable = useMemo(() => {
    return relationships
      .filter((r) => !memberIds.has(r.id))
      .sort((a, b) => a.firm.localeCompare(b.firm));
  }, [relationships, memberIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pipeline) return null;

  const removeMember = (id: string) => {
    if (added.includes(id)) {
      setAdded((prev) => prev.filter((x) => x !== id));
    } else {
      setExcluded((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const addMember = (id: string) => {
    setExcluded((prev) => prev.filter((x) => x !== id));
    const matchesFilter = applyFilters(relationships, pipeline.filterCriteria).some((r) => r.id === id);
    if (!matchesFilter) {
      setAdded((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    setShowAddPicker(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto overscroll-contain tomo-modal-scrim p-4 sm:items-center">
      <div
        className="fixed inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="amend-list-title"
        className="relative z-[61] my-8 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] max-h-[min(92dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
        data-testid="amend-list-modal"
      >
        <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tomo-field-label">Amend list</p>
              <h2 id="amend-list-title" className="text-lg font-semibold text-[color:var(--foreground)]">
                {pipeline.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPicker((s) => !s)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
              aria-expanded={showAddPicker}
              aria-label="Add to list"
              title="Add to list"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          {showAddPicker ? (
            <div className="mt-3 max-h-40 overflow-y-auto rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] p-2">
              {addable.length === 0 ? (
                <p className="px-2 py-2 text-xs text-[color:var(--tomo-mute)]">No more contacts to add.</p>
              ) : (
                <ul className="space-y-0.5">
                  {addable.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => addMember(r.id)}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition hover:bg-[color:var(--tomo-card)]"
                      >
                        <span className="font-medium text-[color:var(--foreground)]">{r.firm}</span>
                        <span className="truncate text-xs text-[color:var(--tomo-mute)]">{r.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <ul className="divide-y divide-[color:var(--tomo-rule-soft)]">
            {members.length === 0 ? (
              <li className="py-8 text-center text-sm text-[color:var(--tomo-mute)]">No contacts in this list yet.</li>
            ) : (
              members.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{r.firm}</p>
                    <p className="truncate text-xs text-[color:var(--tomo-mute)]">{r.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(r.id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tomo-radius-md)] text-[color:var(--tomo-mute)] hover:bg-[color:color-mix(in_srgb,var(--tomo-red)_12%,transparent)] hover:text-[color:var(--tomo-red)]"
                    aria-label={`Remove ${r.firm} from list`}
                    title="Remove from list"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(excluded, added)}
            className="button-primary rounded-md px-4 py-2 text-sm font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
