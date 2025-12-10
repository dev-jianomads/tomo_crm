"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { contacts, meetingBriefs, tasks } from "@/lib/mock-data";
import { useRequireSession } from "@/lib/auth";

type Selection =
  | { type: "meeting"; id: string }
  | { type: "contact"; id: string }
  | { type: "task"; id: string }
  | null;

export default function HomePage() {
  const { ready } = useRequireSession();
  const [selection, setSelection] = useState<Selection>(() =>
    meetingBriefs[0] ? { type: "meeting", id: meetingBriefs[0].id } : null
  );
  const [query, setQuery] = useState("");

  const filteredMeetings = meetingBriefs.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  const filteredTasks = tasks.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  const filteredContacts = contacts.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  const selectedTitle = useMemo(() => {
    if (!selection) return undefined;
    if (selection.type === "meeting") return meetingBriefs.find((m) => m.id === selection.id)?.title;
    if (selection.type === "task") return tasks.find((t) => t.id === selection.id)?.title;
    if (selection.type === "contact") return contacts.find((c) => c.id === selection.id)?.name;
  }, [selection]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Home</p>
        <h2 className="text-lg font-semibold text-gray-900">Today & This Week</h2>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings, contacts, tasks"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        <SectionBlock
          title="Upcoming meetings"
          items={filteredMeetings.map((meeting) => ({
            id: meeting.id,
            title: meeting.title,
            meta: meeting.datetime,
            type: "meeting" as const,
          }))}
          onSelect={(id) => setSelection({ type: "meeting", id })}
          activeId={selection?.type === "meeting" ? selection.id : undefined}
        />
        <SectionBlock
          title="Priority contacts"
          items={filteredContacts.slice(0, 3).map((contact) => ({
            id: contact.id,
            title: contact.name,
            meta: `${contact.organization} • Last: ${contact.lastInteraction}`,
            type: "contact" as const,
          }))}
          onSelect={(id) => setSelection({ type: "contact", id })}
          activeId={selection?.type === "contact" ? selection.id : undefined}
        />
        <SectionBlock
          title="Tasks & follow-ups"
          items={filteredTasks.map((task) => ({
            id: task.id,
            title: task.title,
            meta: `${task.bucket} • ${task.due}`,
            type: "task" as const,
          }))}
          onSelect={(id) => setSelection({ type: "task", id })}
          activeId={selection?.type === "task" ? selection.id : undefined}
        />
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-y-auto p-4">
      {!selection ? (
        <Placeholder title="Select an item to see details" />
      ) : selection.type === "meeting" ? (
        <MeetingDetail id={selection.id} />
      ) : selection.type === "task" ? (
        <TaskDetail id={selection.id} />
      ) : (
        <ContactDetail id={selection.id} />
      )}
    </div>
  );

  if (!ready) return null;

  return <AppShell section="home" listContent={listContent} detailContent={detailContent} contextTitle={selectedTitle} />;
}

function SectionBlock({
  title,
  items,
  onSelect,
  activeId,
}: {
  title: string;
  items: { id: string; title: string; meta: string; type: string }[];
  onSelect: (id: string) => void;
  activeId?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <button className="text-xs text-gray-500">View all</button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === item.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
            <p className="text-xs text-gray-600">{item.meta}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MeetingDetail({ id }: { id: string }) {
  const meeting = meetingBriefs.find((m) => m.id === id);
  if (!meeting) return <Placeholder title="No meeting selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Meeting</p>
          <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
          <p className="text-sm text-gray-600">{meeting.datetime}</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{meeting.participants.length} participants</div>
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
        {meeting.summary}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Commitments</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {meeting.commitments.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TaskDetail({ id }: { id: string }) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return <Placeholder title="No task selected" />;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Task</p>
        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
        <p className="text-sm text-gray-600">
          {task.bucket} • {task.due}
        </p>
      </div>
      {task.linkedTo ? <p className="text-sm text-gray-700">Linked to: {task.linkedTo}</p> : null}
      <p className="text-sm text-gray-700">
        TOMO can draft the follow-up email and log it before sending. Confirm before dispatch.
      </p>
    </div>
  );
}

function ContactDetail({ id }: { id: string }) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return <Placeholder title="No contact selected" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
          <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
          <p className="text-sm text-gray-600">{contact.role}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
          Last interaction: {contact.lastInteraction}
        </span>
      </div>
      <p className="text-sm text-gray-700">{contact.notes}</p>
      <div>
        <p className="text-sm font-semibold text-gray-900">Follow-ups</p>
        <div className="mt-2 space-y-2">
          {contact.followUps.map((f) => (
            <div key={f.id} className="rounded-md border border-gray-200 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{f.title}</p>
              <p className="text-xs text-gray-600">{f.due}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

