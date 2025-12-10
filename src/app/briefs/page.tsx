"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { meetingBriefs } from "@/lib/mock-data";
import { useRequireSession } from "@/lib/auth";

export default function BriefsPage() {
  const { ready } = useRequireSession();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(() => meetingBriefs[0]?.id ?? null);

  const filtered = meetingBriefs.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  const active = useMemo(() => meetingBriefs.find((m) => m.id === activeId) ?? null, [activeId]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Briefs</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filtered.map((brief) => (
          <button
            key={brief.id}
            onClick={() => setActiveId(brief.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === brief.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">{brief.title}</p>
            <p className="text-xs text-gray-600">{brief.datetime}</p>
            <p className="text-xs text-gray-600">{brief.participants.length} participants</p>
          </button>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full space-y-4 overflow-auto p-4">
      {!active ? (
        <Placeholder title="Select a meeting to view the brief" />
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Meeting</p>
              <h2 className="text-lg font-semibold text-gray-900">{active.title}</h2>
              <p className="text-sm text-gray-600">{active.datetime}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {active.participants.length} participants
            </span>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Summary</p>
            <p>{active.summary}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Participants</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {active.participants.map((person) => (
                <span key={person} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {person}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Open commitments</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {active.commitments.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="briefs"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active?.title}
      assistantChips={["Summarize this meeting", "Generate talking points", "Draft follow-up email", "Shorten this brief"]}
    />
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

