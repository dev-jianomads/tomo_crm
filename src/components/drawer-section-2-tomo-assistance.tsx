"use client";

import { useRouter } from "next/navigation";
import { TomoAiBadge } from "./tomo-ai-badge";
import type { TomoAssistanceBlock } from "@/lib/mockTomoAssistance";

type DrawerSection2TomoAssistanceProps = {
  blocks: TomoAssistanceBlock[];
};

/**
 * Section 2: Tomo assistance blocks (insight, draft, crm_update, workflow, status, reminder, brief).
 */
export function DrawerSection2TomoAssistance({ blocks }: DrawerSection2TomoAssistanceProps) {
  const router = useRouter();

  if (!blocks.length) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <BlockRenderer key={`${block.kind}-${i}`} block={block} onNavigateWorkflow={(id) => router.push(`/workflows?playbook=${id}`)} />
      ))}
    </div>
  );
}

function BlockRenderer({
  block,
  onNavigateWorkflow,
}: {
  block: TomoAssistanceBlock;
  onNavigateWorkflow: (playbookId: string) => void;
}) {
  const baseClass = "rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800";

  switch (block.kind) {
    case "insight":
      return (
        <div className={`${baseClass}`}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <TomoAiBadge label="Tomo insight" />
          </div>
          <p className="mt-1 text-sm tomo-ai-text">{block.content}</p>
        </div>
      );

    case "draft":
      return (
        <div className={baseClass}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <TomoAiBadge label={block.type === "invite" ? "Tomo draft" : "Tomo draft"} />
          </div>
          <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm tomo-ai-text whitespace-pre-line">
            {block.content}
          </div>
        </div>
      );

    case "crm_update":
      return (
        <div className={baseClass}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <TomoAiBadge label="Tomo suggestion" />
          </div>
          <p className="mt-1 text-xs text-gray-500">CRM is source of truth. Apply via Tomo chat.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-2">Field</th>
                  <th className="py-2 pr-2">Current</th>
                  <th className="py-2 pr-2">Update</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {block.rows.map((row, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-2 pr-2 font-medium text-gray-900">{row.field}</td>
                    <td className="py-2 pr-2 text-gray-600">{row.current}</td>
                    <td className="py-2 pr-2 text-gray-800">{row.update}</td>
                    <td className="py-2 text-gray-600">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "workflow":
      return (
        <div className={baseClass}>
          <p className="font-medium text-gray-900">{block.label}</p>
          <div className="mt-2 space-y-2">
            {block.playbooks.map((p) => (
              <button
                key={p.id}
                onClick={() => onNavigateWorkflow(p.id)}
                className="block w-full rounded-lg border border-[color:var(--peach)] bg-[color:var(--peach-soft)] p-3 text-left transition hover:border-[color:var(--peach)]"
              >
                <p className="text-sm font-semibold text-[color:var(--peach-ink)]">{p.name}</p>
                <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      );

    case "status":
      return (
        <div className={baseClass}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <span className="rounded-full bg-[color:var(--peach-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--peach-ink)]">
              {block.value}
            </span>
          </div>
        </div>
      );

    case "reminder":
      return (
        <div className={baseClass}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <TomoAiBadge label="Tomo" />
          </div>
          <p className="mt-1 text-sm tomo-ai-text">{block.content}</p>
        </div>
      );

    case "brief":
      return (
        <div className={baseClass}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">{block.label}</p>
            <TomoAiBadge label="Tomo draft" />
          </div>
          {block.summary ? <p className="mt-2 text-sm tomo-ai-text">{block.summary}</p> : null}
          {block.agenda?.length ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Agenda</p>
              <ul className="mt-1 space-y-1">
                {block.agenda.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {block.commitments?.length ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Commitments</p>
              <ul className="mt-1 space-y-1">
                {block.commitments.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );

    default:
      return null;
  }
}
