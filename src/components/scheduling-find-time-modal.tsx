"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  SCHEDULING_SCENARIO_ANCHOR,
  addDays,
  buildSchedulingWeekGrid,
  formatWeekRangeLabel,
  startOfWeekSunday,
  type SchedulingSlotModel,
} from "@/lib/schedulingFindTime";

/** Weeks forward/back from the scenario week (PAAMCO / March 18 narrative). */
const MAX_WEEK_OFFSET = 26;
const MIN_WEEK_OFFSET = -8;

type SchedulingFindTimeModalProps = {
  open: boolean;
  onClose: () => void;
  /** Selection immediately replaces the prior proposal and closes the modal. */
  onSelectSlot: (slot: SchedulingSlotModel) => void;
};

export function SchedulingFindTimeModal({ open, onClose, onSelectSlot }: SchedulingFindTimeModalProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeekSunday(SCHEDULING_SCENARIO_ANCHOR);
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const grid = useMemo(() => buildSchedulingWeekGrid(weekStart), [weekStart]);

  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekStart), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, SchedulingSlotModel[]>();
    for (const s of grid) {
      const list = map.get(s.dateKey) ?? [];
      list.push(s);
      map.set(s.dateKey, list);
    }
    return map;
  }, [grid]);

  const days = useMemo(() => {
    const keys = [...byDay.keys()];
    return keys.sort();
  }, [byDay]);

  const hours = useMemo(() => {
    const first = grid[0];
    if (!first) return [];
    const set = new Set<number>();
    for (const s of grid) {
      set.add(s.hour24);
    }
    return [...set].sort((a, b) => a - b);
  }, [grid]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center tomo-modal-scrim p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduling-find-time-title"
        data-testid="scheduling-find-time-modal"
        className="relative z-[61] flex max-h-[min(90dvh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <div>
            <h2 id="scheduling-find-time-title" className="text-sm font-semibold text-[color:var(--foreground)]">
              Find another time
            </h2>
            <p className="mt-0.5 text-xs text-[color:var(--tomo-mute)]">
              Sample availability · ET · pick a week, then tap a free slot to replace the draft
            </p>
            <p className="mt-1 text-[11px] font-medium text-[color:var(--tomo-body)]">{weekRangeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close dialog">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--tomo-rule-soft)] px-4 py-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={weekOffset <= MIN_WEEK_OFFSET}
            onClick={() => setWeekOffset((w) => Math.max(MIN_WEEK_OFFSET, w - 1))}
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            Previous week
          </button>
          <span className="hidden text-center text-[11px] text-[color:var(--tomo-mute)] sm:inline">
            Calendar week · times in ET
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={weekOffset >= MAX_WEEK_OFFSET}
            onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
            aria-label="Next week"
          >
            Next week
            <ChevronRightIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] border-b border-r border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] py-2 pr-2 text-left font-medium text-[color:var(--tomo-mute)]">
                    Time
                  </th>
                  {days.map((dk) => {
                    const firstSlot = byDay.get(dk)?.[0];
                    return (
                      <th
                        key={dk}
                        scope="col"
                        className="min-w-[4.5rem] border-b border-[color:var(--tomo-rule-soft)] px-1 py-2 text-center font-medium text-[color:var(--tomo-body)]"
                      >
                        <span className="block leading-tight">{firstSlot?.dayMedium ?? dk}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] border-r border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] py-1.5 pr-2 text-right font-normal text-[color:var(--tomo-body)]"
                    >
                      {formatHourRow(hour)}
                    </th>
                    {days.map((dk) => {
                      const slot = byDay.get(dk)?.find((s) => s.hour24 === hour);
                      if (!slot) {
                        return (
                          <td key={`${dk}-${hour}`} className="border-b border-[color:var(--tomo-rule-soft)] p-0.5 text-[color:var(--tomo-mute)]">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={slot.dateKey + slot.hour24} className="border-b border-[color:var(--tomo-rule-soft)] p-0.5 align-middle">
                          {slot.available ? (
                            <button
                              type="button"
                              className="h-full w-full min-h-[2rem] rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-status-green)_40%,var(--tomo-rule))] bg-[color:var(--tomo-status-green-bg)] px-1 py-1 text-[10px] font-medium text-[color:var(--tomo-status-green)] transition hover:border-[color:var(--tomo-status-green)] hover:bg-[color:color-mix(in_srgb,var(--tomo-status-green-bg)_75%,var(--tomo-teal-tint))]"
                              onClick={() => {
                                onSelectSlot(slot);
                                onClose();
                              }}
                            >
                              Free
                            </button>
                          ) : (
                            <span
                              className="flex min-h-[2rem] items-center justify-center rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-mute)_08%,var(--tomo-card))] px-1 py-1 text-[10px] text-[color:var(--tomo-mute)]"
                              aria-disabled
                            >
                              Busy
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHourRow(hour24: number): string {
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? "am" : "pm";
  return `${h} ${suffix}`;
}
