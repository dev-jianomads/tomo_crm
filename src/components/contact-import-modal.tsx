"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ContactImportFileZone } from "@/components/contact-import-file-zone";
import { ContactImportFieldMapping } from "@/components/contact-import-field-mapping";
import {
  CONTACT_IMPORT_ACCEPT,
  type ContactImportFieldId,
  type ContactImportPreview,
  buildInitialColumnMapping,
  readContactImportPreview,
} from "@/lib/contactImportMock";

type ContactImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** After user confirms mapping (mock: no server upload). */
  onConfirm: (payload: {
    file: File;
    preview: ContactImportPreview;
    mapping: ContactImportFieldId[];
  }) => void;
  title?: string;
  /** Shown on the file step. */
  fileStepDescription?: string;
  autoOpenFilePicker?: boolean;
};

export function ContactImportModal({
  open,
  onClose,
  onConfirm,
  title = "Import contacts",
  fileStepDescription = "Upload a CSV or Excel file of LPs or contacts. Column headers are auto-detected; you can fix the mapping on the next step.",
  autoOpenFilePicker = true,
}: ContactImportModalProps) {
  const [phase, setPhase] = useState<"file" | "map">("file");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ContactImportPreview | null>(null);
  const [mapping, setMapping] = useState<ContactImportFieldId[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [autoOpenToken, setAutoOpenToken] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase("file");
      setFile(null);
      setPreview(null);
      setMapping([]);
      setLoadingPreview(false);
    }
  }, [open]);

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

  const handleFile = async (f: File) => {
    setFile(f);
    setLoadingPreview(true);
    try {
      const p = await readContactImportPreview(f);
      setPreview(p);
      setMapping(buildInitialColumnMapping(p.headers));
      setPhase("map");
    } finally {
      setLoadingPreview(false);
    }
  };

  const setMappingAt = (i: number, v: ContactImportFieldId) => {
    setMapping((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const handleConfirm = () => {
    if (!file || !preview || mapping.length !== preview.headers.length) return;
    onConfirm({ file, preview, mapping });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center tomo-modal-scrim p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-import-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="contact-import-title" className="text-sm font-semibold text-[color:var(--foreground)]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {phase === "file" ? (
            <div className="space-y-3">
              <p className="text-sm text-[color:var(--tomo-body)]">{fileStepDescription}</p>
              <div className="relative">
                <ContactImportFileZone
                  accept={CONTACT_IMPORT_ACCEPT}
                  disabled={loadingPreview}
                  autoOpenToken={autoOpenFilePicker ? autoOpenToken : undefined}
                  onFileSelected={(f) => void handleFile(f)}
                />
                {loadingPreview ? (
                  <p className="mt-2 text-center text-xs text-[color:var(--tomo-mute)]">Reading file…</p>
                ) : null}
              </div>
            </div>
          ) : preview && file ? (
            <div className="space-y-4">
              <p className="text-xs text-[color:var(--tomo-mute)]">
                <span className="font-medium text-[color:var(--foreground)]">{file.name}</span>
                {" · "}
                ~{preview.rowCountEstimate.toLocaleString()} row{preview.rowCountEstimate === 1 ? "" : "s"} (estimate)
              </p>
              <ContactImportFieldMapping
                headers={preview.headers}
                mapping={mapping}
                onChange={setMappingAt}
                sampleRow={preview.sampleRow}
                idPrefix="crm-import"
              />
            </div>
          ) : null}
        </div>

        {phase === "map" && preview && file ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3">
            <button
              type="button"
              className="rounded-[var(--tomo-radius-md)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:var(--tomo-navy-soft)]"
              onClick={() => {
                setPhase("file");
                setFile(null);
                setPreview(null);
                setMapping([]);
              }}
            >
              Back
            </button>
            <button type="button" className="button-primary px-4 py-2 text-sm" onClick={handleConfirm}>
              Confirm import
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
