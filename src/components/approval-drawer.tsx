"use client";

import { useEffect, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ApprovalDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Right-side drawer for approval flows.
 * Used when ActionItem requires approval or a draft email is generated.
 * Slides in from the right, overlays content.
 */
export function ApprovalDrawer({ open, onClose, title = "Review & approve", children }: ApprovalDrawerProps) {
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
        className={`tomo-drawer-veil fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-drawer-shadow)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="tomo-drawer-icon-btn"
            aria-label="Close drawer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
