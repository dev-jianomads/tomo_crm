"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { tasks } from "@/lib/mock-data";
import { useRequireSession } from "@/lib/auth";

export default function TasksPage() {
  const { ready } = useRequireSession();
  const [activeId, setActiveId] = useState<string | null>(() => tasks[0]?.id ?? null);
  const [filter, setFilter] = useState<"All" | "Overdue" | "Today" | "This week">("All");

  const grouped = useMemo(() => {
    const buckets = ["Overdue", "Today", "This week"] as const;
    return buckets.map((bucket) => ({
      title: bucket,
      items: tasks.filter((task) => task.bucket === bucket && (filter === "All" || filter === bucket)),
    }));
  }, [filter]);

  const active = tasks.find((t) => t.id === activeId) ?? null;

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Tasks</p>
        <div className="mt-3 flex gap-2">
          {["All", "Overdue", "Today", "This week"].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilter(pill as typeof filter)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                filter === pill ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {grouped.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">{group.title}</p>
            {group.items.map((task) => (
              <button
                key={task.id}
                onClick={() => setActiveId(task.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  activeId === task.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-600">{task.due}</p>
                {task.linkedTo ? <p className="text-xs text-gray-500">Linked to: {task.linkedTo}</p> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!active ? (
        <Placeholder title="Select a task" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Task</p>
              <h2 className="text-lg font-semibold text-gray-900">{active.title}</h2>
              <p className="text-sm text-gray-600">
                {active.bucket} • {active.due}
              </p>
            </div>
            {active.linkedTo ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">Linked: {active.linkedTo}</span>
            ) : null}
          </div>
          <p className="text-sm text-gray-700">
            TOMO can draft the follow-up email for this task and stage it for review. Nothing is sent without your confirmation.
          </p>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Ask TOMO to prioritize tasks, block time, or draft summaries for stakeholders.
          </div>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="tasks"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active?.title}
      assistantChips={["Draft the follow-up", "Prioritize this week", "Log a note", "Remind me tomorrow"]}
    />
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

