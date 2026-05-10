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
  /** When true, header shows only the close control (no title text). Use with `drawerAriaLabel`. */
  hideHeaderTitle?: boolean;
  /** Accessible name for the drawer panel (defaults to `title`). */
  drawerAriaLabel?: string;
  /** Tailwind max-width class for the panel (default `max-w-2xl`). */
  panelMaxWidthClassName?: string;
  /** Section 1: Content details (entity header, evidence, metadata) */
  section1Content: ReactNode;
  /** Section 2: Tomo Chat (initial message + AI conversation) */
  section2Content?: ReactNode;
  /** Min-height class for the main section (default `min-h-[280px]` for chat); use `min-h-0` with scrollable CRM. */
  section2MinHeightClassName?: string;
  /** When true, hide Section 2 entirely (e.g. list funnel before a stage is selected) */
  hideSection2?: boolean;
  /** Optional strip between Section 2 and the activity log (e.g. single-line Tomo input). */
  sectionBetween2AndActivity?: ReactNode;
  /** Section 3: Activity log entries */
  section3Entries: ActivityLogEntry[];
  /** When set, replaces the default activity log (e.g. Lists drawer CTAs). */
  section3Custom?: ReactNode;
  /**
   * Lists-style layout: Section 1 scrolls and grows; Section 2 is a compact middle band (no tall Tomo chat flex).
   */
  listContextDrawerLayout?: boolean;
  /** Hide the slim title row — use when section 1 includes a full v3 spec head (Esc + eyebrow). */
  hideChromeHeader?: boolean;
  /** Tailwind padding classes for section 1 inner wrapper (default `px-4 py-3`). */
  section1PaddingClassName?: string;
};

/**
 * Contextual drawer: Content Details → main section (often Tomo Chat) → optional strip → Activity Log.
 * Slides in from the right. Mobile: side fly-in (same as desktop).
 * Designed for reuse across Today, Relationships, Activity, Materials pages.
 */
export function ContextDrawer({
  open,
  onClose,
  title = "Details",
  hideHeaderTitle = false,
  drawerAriaLabel,
  panelMaxWidthClassName = "max-w-2xl",
  section1Content,
  section2Content,
  section2MinHeightClassName = "min-h-[280px]",
  hideSection2 = false,
  sectionBetween2AndActivity,
  section3Entries,
  section3Custom,
  listContextDrawerLayout = false,
  hideChromeHeader = false,
  section1PaddingClassName = "px-4 py-3",
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
        className={`tomo-drawer-veil fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full ${panelMaxWidthClassName} flex-col overflow-hidden border-l border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-drawer-shadow)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-modal="true"
        aria-label={drawerAriaLabel ?? title}
      >
        {!hideChromeHeader ? (
          <div
            className={`flex shrink-0 items-center border-b border-[color:var(--tomo-rule-soft)] px-4 py-3 ${hideHeaderTitle ? "justify-end" : "justify-between"}`}
          >
            {hideHeaderTitle ? (
              <span className="sr-only">{drawerAriaLabel ?? title}</span>
            ) : (
              <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="tomo-drawer-icon-btn"
              aria-label="Close drawer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        {/* Section 1: Content Details — compact to maximize Tomo chat space, or flex-1 when Section 2 hidden */}
        {section1Content != null ? (
          <div
            className={
              listContextDrawerLayout
                ? "min-h-0 min-w-0 flex-1 overflow-y-auto"
                : `min-h-0 min-w-0 overflow-y-auto ${hideSection2 ? "flex-1" : "shrink"}`
            }
          >
            <div className={`border-b border-[color:var(--tomo-rule-soft)] ${section1PaddingClassName}`}>
              {section1Content}
            </div>
          </div>
        ) : null}

        {/* Section 2: Tomo Chat (or Lists workflows, etc.) */}
        {!hideSection2 && (
          <div
            className={
              listContextDrawerLayout
                ? `flex max-h-[min(280px,42vh)] shrink-0 flex-col overflow-hidden border-t border-[color:var(--tomo-rule-soft)] p-4 min-h-0 ${section2MinHeightClassName}`
                : `flex flex-1 flex-col overflow-hidden border-t border-[color:var(--tomo-rule-soft)] p-4 ${section2MinHeightClassName}`
            }
          >
            {section2Content ?? (
              <div className="flex h-[280px] items-center justify-center rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-teal-tint)] text-xs text-[color:var(--tomo-mute)]">
                Tomo chat (coming soon)
              </div>
            )}
          </div>
        )}

        {sectionBetween2AndActivity != null ? sectionBetween2AndActivity : null}

        {/* Activity log or custom footer */}
        {section3Custom != null ? (
          <div className="shrink-0 border-t border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] dark:bg-[color:var(--tomo-canvas)]">
            {section3Custom}
          </div>
        ) : (
          <DrawerSection3ActivityLog entries={section3Entries} />
        )}
      </aside>
    </>
  );
}
