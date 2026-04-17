"use client";

import { useEffect, useRef } from "react";
import { DocumentArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !autoOpenFilePicker) return;
    const id = window.setTimeout(() => inputRef.current?.click(), 0);
    return () => clearTimeout(id);
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attach-document-title"
        className="relative z-10 flex w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="attach-document-title" className="text-sm font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-gray-600">{description}</p>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploaded(file.name);
              e.target.value = "";
              onClose();
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm font-medium text-gray-800 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
          >
            <DocumentArrowUpIcon className="h-6 w-6 text-gray-500" aria-hidden />
            Choose file…
          </button>
        </div>
      </div>
    </div>
  );
}
