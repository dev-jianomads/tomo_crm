"use client";

import { useRef } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { WorkflowActionBuildAttachment } from "@/lib/workflow-action-build";
import { extractTextFromDocx, formatFileSize, isDocxFile } from "@/lib/parse-docx";

const DOCX_ACCEPT =
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function WorkflowWizardFileUpload({
  attachments,
  onChange,
  label = "Attachments",
  emptyHint = "Optional .docx briefs, one-pagers, or notes.",
}: {
  attachments: WorkflowActionBuildAttachment[];
  onChange: (next: WorkflowActionBuildAttachment[]) => void;
  label?: string;
  emptyHint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (!isDocxFile(file)) {
        toast.error(`${file.name} is not a .docx file`);
        continue;
      }
      try {
        const extractedText = await extractTextFromDocx(file);
        if (!extractedText) {
          toast.error(`${file.name} had no readable text`);
          continue;
        }
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `att-${crypto.randomUUID()}`
            : `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        next.push({
          id,
          name: file.name,
          meta: `${formatFileSize(file.size)} · parsed`,
          extractedText,
        });
        toast.success(`Added ${file.name}`);
      } catch {
        toast.error(`Could not read ${file.name}`);
      }
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[color:var(--foreground)]">{label}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium text-[color:var(--tomo-teal)]"
        >
          + Add file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={DOCX_ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {attachments.length === 0 ? (
        <p className="text-xs text-[color:var(--tomo-mute)]">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-2 rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule-soft)] px-2 py-1.5 text-xs"
            >
              <PaperClipIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--tomo-mute)]" />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[color:var(--foreground)]">{a.name}</span>
                <span className="ml-1.5 text-[color:var(--tomo-mute)]">{a.meta}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="shrink-0 rounded p-0.5 text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
                aria-label={`Remove ${a.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
