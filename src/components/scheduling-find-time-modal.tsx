"use client";

import { useEffect, useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  SCHEDULING_SCENARIO_ANCHOR,
  buildSchedulingWeekGrid,
  type SchedulingSlotModel,
} from "@/lib/schedulingFindTime";

type SchedulingFindTimeModalProps = {
  open: boolean;
  onClose: () => void;
  /** Selection immediately replaces the prior proposal and closes the modal. */
  onSelectSlot: (slot: SchedulingSlotModel) => void;
};

export function SchedulingFindTimeModal({ open, onClose, onSelectSlot }: SchedulingFindTimeModalProps) {
  const grid = useMemo(() => buildSchedulingWeekGrid(SCHEDULING_SCENARIO_ANCHOR), []);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduling-find-time-title"
        data-testid="scheduling-find-time-modal"
        className="relative z-[61] flex max-h-[min(90dvh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 id="scheduling-find-time-title" className="text-sm font-semibold text-gray-900">
              Find another time
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Mock availability · ET · tap a free slot to replace the draft</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] border-b border-r border-gray-200 bg-white py-2 pr-2 text-left font-medium text-gray-500">
                    Time
                  </th>
                  {days.map((dk) => {
                    const firstSlot = byDay.get(dk)?.[0];
                    return (
                      <th
                        key={dk}
                        scope="col"
                        className="min-w-[4.5rem] border-b border-gray-200 px-1 py-2 text-center font-medium text-gray-700"
                      >
                        <span className="block">{firstSlot?.dayShort ?? dk}</span>
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
                      className="sticky left-0 z-[1] border-r border-gray-200 bg-gray-50/90 py-1.5 pr-2 text-right font-normal text-gray-600"
                    >
                      {formatHourRow(hour)}
                    </th>
                    {days.map((dk) => {
                      const slot = byDay.get(dk)?.find((s) => s.hour24 === hour);
                      if (!slot) {
                        return (
                          <td key={`${dk}-${hour}`} className="border-b border-gray-100 p-0.5">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={slot.dateKey + slot.hour24} className="border-b border-gray-100 p-0.5 align-middle">
                          {slot.available ? (
                            <button
                              type="button"
                              className="h-full w-full min-h-[2rem] rounded-md border border-green-200 bg-green-50 px-1 py-1 text-[10px] font-medium text-green-900 transition hover:border-green-400 hover:bg-green-100"
                              onClick={() => {
                                onSelectSlot(slot);
                                onClose();
                              }}
                            >
                              Free
                            </button>
                          ) : (
                            <span
                              className="flex min-h-[2rem] items-center justify-center rounded-md border border-gray-100 bg-gray-100 px-1 py-1 text-[10px] text-gray-400"
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
