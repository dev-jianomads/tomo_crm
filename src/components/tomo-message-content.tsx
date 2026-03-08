"use client";

import { useRouter } from "next/navigation";
import { TomoAiBadge } from "./tomo-ai-badge";
import type { TomoInitialMessage, TomoMessageBlock } from "@/lib/mockTomoAssistance";

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
          <BlockRenderer key={`${block.kind}-${i}`} block={block} onNavigateWorkflow={(id) => router.push(`/workflows?playbook=${id}`)} />
        ))}
      </div>
    </div>
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
      return (
        <div className="rounded-md border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 whitespace-pre-line">
          {block.content}
        </div>
      );

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

    default:
      return null;
  }
}
