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
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm font-medium text-gray-800 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DocumentArrowUpIcon className="h-6 w-6 text-gray-500" aria-hidden />
        Choose file…
      </button>
    </>
  );
}
