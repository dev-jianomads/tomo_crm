"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TomoAiBadge } from "./tomo-ai-badge";
import type { TomoInitialMessage, TomoMessageBlock } from "@/lib/mockTomoAssistance";

type DraftMessageBlock = Extract<TomoMessageBlock, { kind: "draft" }>;

/**
 * Renders Tomo's initial message: lead-in text + optional rich blocks.
 * Displayed as static UI above the chat conversation.
 */
export function TomoMessageContent({ message }: { message: TomoInitialMessage }) {
  const router = useRouter();

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <TomoAiBadge label="Tomo" />
        </div>
        <p className="text-sm leading-relaxed text-gray-900">{message.text}</p>
        {message.blocks?.map((block, i) => (
          <BlockRenderer key={`${block.kind}-${i}`} block={block} onNavigateWorkflow={(id) => router.push(id.startsWith("td-") ? `/workflows?tomoDefault=${id}` : `/workflows?playbook=${id}`)} />
        ))}
      </div>
    </div>
  );
}

function DraftBlock({ block }: { block: DraftMessageBlock }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(() => block.content);

  useEffect(() => {
    if (!editOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setEditOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editOpen]);

  const notifySent = () => {
    toast.success(block.type === "invite" ? "Invite sent!" : "Email sent!");
  };

  return (
    <>
      <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--accent)]">Drafted by Tomo</span>
          <span className="text-[11px] text-gray-500">{block.type === "invite" ? "Invite" : "Email"}</span>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{block.content}</p>
        <p className="mt-3 text-sm text-gray-600">Want me to send? Edit?</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            onClick={notifySent}
          >
            Send
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </button>
        </div>
      </div>

      {editOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          role="presentation"
          onClick={() => setEditOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-edit-title"
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 id="draft-edit-title" className="text-sm font-semibold text-gray-900">
                Edit draft
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">Mock editor — changes are not saved.</p>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={10}
                className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <button
                type="button"
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                onClick={() => {
                  notifySent();
                  setEditOpen(false);
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BlockRenderer({
  block,
  onNavigateWorkflow,
}: {
  block: TomoMessageBlock;
  onNavigateWorkflow: (playbookId: string) => void;
}) {
  switch (block.kind) {
    case "crm_table":
      return (
        <div className="overflow-x-auto rounded-md border border-gray-100 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-2.5 py-2">Field</th>
                <th className="px-2.5 py-2">Current</th>
                <th className="px-2.5 py-2">Update</th>
                <th className="px-2.5 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {block.rows.map((row, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2.5 py-2 font-medium text-gray-900">{row.field}</td>
                  <td className="px-2.5 py-2 text-gray-500">{row.current}</td>
                  <td className="px-2.5 py-2 text-gray-800">{row.update}</td>
                  <td className="px-2.5 py-2 text-gray-500">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "draft":
      return <DraftBlock key={block.content} block={block} />;

    case "brief":
      return (
        <div className="space-y-2 rounded-md border border-gray-100 bg-white px-3 py-2">
          {block.summary ? <p className="text-sm text-gray-700">{block.summary}</p> : null}
          {block.agenda?.length ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Agenda</p>
              <ul className="mt-1 space-y-0.5">
                {block.agenda.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {block.commitments?.length ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Commitments</p>
              <ul className="mt-1 space-y-0.5">
                {block.commitments.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );

    case "workflow_link":
      return (
        <button
          onClick={() => onNavigateWorkflow(block.playbookId)}
          className="block w-full rounded-lg border border-[color:var(--peach)] bg-[color:var(--peach-soft)] p-2.5 text-left transition hover:border-[color:var(--peach)]"
        >
          <p className="text-xs font-semibold text-[color:var(--peach-ink)]">{block.name}</p>
          <p className="mt-0.5 text-[11px] text-gray-600 line-clamp-2">{block.description}</p>
        </button>
      );

    case "snapshot":
      return (
        <div className="rounded-md border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700">
          {block.text}
        </div>
      );

    default:
      return null;
  }
}
