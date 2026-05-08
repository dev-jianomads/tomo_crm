"use client";

import { useEffect, useRef } from "react";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

type ContactImportFileZoneProps = {
  accept?: string;
  disabled?: boolean;
  /** Called immediately after the user selects a file. */
  onFileSelected: (file: File) => void;
  /**
   * When this number changes (e.g. modal just opened), open the OS file picker once.
   * Omit to never auto-open.
   */
  autoOpenToken?: number;
};

/**
 * Shared dashed drop-zone control (same visuals as AttachDocumentModal choose area).
 */
export function ContactImportFileZone({ accept, disabled, onFileSelected, autoOpenToken }: ContactImportFileZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoOpenToken === undefined || autoOpenToken <= 0) return;
    const id = window.setTimeout(() => inputRef.current?.click(), 0);
    return () => clearTimeout(id);
  }, [autoOpenToken]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--tomo-radius-md)] border-2 border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] px-4 py-8 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--tomo-teal)] hover:bg-[color:var(--tomo-teal-tint)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_92%,var(--tomo-navy-soft))]"
      >
        <DocumentArrowUpIcon className="h-6 w-6 text-[color:var(--tomo-mute)]" aria-hidden />
        Choose file…
      </button>
    </>
  );
}
