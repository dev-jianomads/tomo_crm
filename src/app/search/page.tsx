"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { contacts, meetingBriefs, tasks } from "@/lib/mock-data";
import { useRequireSession } from "@/lib/auth";

type Result =
  | { type: "contact"; id: string; title: string; meta: string }
  | { type: "meeting"; id: string; title: string; meta: string }
  | { type: "task"; id: string; title: string; meta: string };

export default function SearchPage() {
  const { ready } = useRequireSession();
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const results = useMemo<Result[]>(() => {
    const q = query.toLowerCase();
    const contactResults = contacts
      .filter((c) => c.name.toLowerCase().includes(q) || c.organization.toLowerCase().includes(q))
      .map((c) => ({ type: "contact", id: c.id, title: c.name, meta: c.organization } as Result));
    const meetingResults = meetingBriefs
      .filter((m) => m.title.toLowerCase().includes(q))
      .map((m) => ({ type: "meeting", id: m.id, title: m.title, meta: m.datetime } as Result));
    const taskResults = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .map((t) => ({ type: "task", id: t.id, title: t.title, meta: t.bucket } as Result));
    return [...contactResults, ...meetingResults, ...taskResults];
  }, [query]);

  const activeResult = useMemo(() => {
    if (activeKey) {
      return results.find((r) => `${r.type}-${r.id}` === activeKey) ?? results[0] ?? null;
    }
    return results[0] ?? null;
  }, [activeKey, results]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Search</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, briefs, tasks"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {results.map((result, idx) => {
          const key = `${result.type}-${result.id}`;
          const isActive = activeKey ? activeKey === key : idx === 0;
          return (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{result.title}</p>
              <span className="text-xs uppercase text-gray-500">{result.type}</span>
            </div>
            <p className="text-xs text-gray-600">{result.meta}</p>
          </button>
          );
        })}
        {!results.length ? <p className="text-sm text-gray-600">No results yet. Try searching for a contact or meeting.</p> : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!activeResult ? (
        <Placeholder title="Search for anything in contacts, briefs, tasks" />
      ) : activeResult.type === "contact" ? (
        <ContactCard id={activeResult.id} />
      ) : activeResult.type === "meeting" ? (
        <MeetingCard id={activeResult.id} />
      ) : (
        <TaskCard id={activeResult.id} />
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="search"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={activeResult?.title}
      assistantChips={["Refine search", "Filter by recency", "Show only contacts", "Summarize this result"]}
    />
  );
}

function ContactCard({ id }: { id: string }) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return <Placeholder title="Contact not found" />;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
      <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
      <p className="text-sm text-gray-600">{contact.role}</p>
      <p className="text-xs text-gray-500">Last interaction {contact.lastInteraction}</p>
    </div>
  );
}

function MeetingCard({ id }: { id: string }) {
  const meeting = meetingBriefs.find((m) => m.id === id);
  if (!meeting) return <Placeholder title="Meeting not found" />;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">Meeting</p>
      <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
      <p className="text-sm text-gray-600">{meeting.datetime}</p>
      <p className="text-sm text-gray-700">{meeting.summary}</p>
    </div>
  );
}

function TaskCard({ id }: { id: string }) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return <Placeholder title="Task not found" />;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">Task</p>
      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
      <p className="text-sm text-gray-600">
        {task.bucket} • {task.due}
      </p>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

