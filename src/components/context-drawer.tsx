"use client";

import { useEffect, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { DrawerSection3ActivityLog, type ActivityLogEntry } from "./drawer-section-3-activity-log";

export type DrawerSelection =
  | { type: "action"; id: string }
  | { type: "commitment"; id: string }
  | { type: "brief"; id: string }
  | null;

export type ContextDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Section 1: Content details (entity header, evidence, metadata) */
  section1Content: ReactNode;
  /** Section 2: Tomo Chat (initial message + AI conversation) */
  section2Content?: ReactNode;
  /** Section 3: Activity log entries */
  section3Entries: ActivityLogEntry[];
};

/**
 * 3-section contextual drawer: Content Details → Tomo Chat → Activity Log.
 * Slides in from the right. Mobile: side fly-in (same as desktop).
 * Designed for reuse across Today, Relationships, Activity, Materials pages.
 */
export function ContextDrawer({
  open,
  onClose,
  title = "Details",
  section1Content,
  section2Content,
  section3Entries,
}: ContextDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close drawer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Section 1: Content Details */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-gray-100 p-4">{section1Content}</div>
        </div>

        {/* Section 2: Tomo Chat */}
        <div className="flex h-[312px] shrink-0 flex-col overflow-hidden border-t border-gray-100 p-4">
          {section2Content ?? (
            <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50/50 text-xs text-gray-500">
              Tomo chat (coming soon)
            </div>
          )}
        </div>

        {/* Section 3: Activity Log */}
        <DrawerSection3ActivityLog entries={section3Entries} />
      </aside>
    </>
  );
}
