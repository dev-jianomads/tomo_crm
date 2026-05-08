"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ContactImportFileZone } from "@/components/contact-import-file-zone";

type AttachDocumentModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the user picks a file (mock success). */
  onUploaded: (fileName: string) => void;
  title?: string;
  /** Body copy below the title (default: commitment attach). */
  description?: string;
  /** Passed to `<input type="file" accept={accept} />` (e.g. `.csv,text/csv`). */
  accept?: string;
  /** When the modal opens, immediately open the OS file picker (still shows sheet if user cancels). */
  autoOpenFilePicker?: boolean;
};

const DEFAULT_DESCRIPTION =
  "Choose a file from your computer to attach to this commitment.";

/**
 * Mock file picker — opens OS dialog; reports success for demo flows.
 */
export function AttachDocumentModal({
  open,
  onClose,
  onUploaded,
  title = "Attach document",
  description = DEFAULT_DESCRIPTION,
  accept,
  autoOpenFilePicker = false,
}: AttachDocumentModalProps) {
  const [autoOpenToken, setAutoOpenToken] = useState(0);

  useEffect(() => {
    if (open && autoOpenFilePicker) setAutoOpenToken((t) => t + 1);
  }, [open, autoOpenFilePicker]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center tomo-modal-scrim p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attach-document-title"
        className="relative z-10 flex w-full max-w-md flex-col rounded-t-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="attach-document-title" className="text-sm font-semibold text-[color:var(--foreground)]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-[color:var(--tomo-body)]">{description}</p>
          <div className="mt-4">
            <ContactImportFileZone
              accept={accept}
              autoOpenToken={autoOpenFilePicker ? autoOpenToken : undefined}
              onFileSelected={(file) => {
                onUploaded(file.name);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
