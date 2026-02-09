"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { ActivityEvent, useActivityLog } from "@/lib/mvp3-store";

type Category = "system" | "threads" | "loops" | "scheduling" | "trip" | "entity" | "all";

const categories: { value: Category; label: string; types: ActivityEvent["type"][] }[] = [
  { value: "system", label: "System", types: ["connector_sync_started", "connector_sync_succeeded", "connector_sync_failed"] },
  { value: "threads", label: "Threads", types: ["thread_created", "thread_updated"] },
  { value: "loops", label: "Loops", types: ["loop_created", "loop_assigned", "loop_snoozed", "loop_done", "draft_generated", "marked_sent"] },
  { value: "scheduling", label: "Scheduling", types: ["scheduling_request_created", "scheduling_request_sent", "scheduling_request_proposed", "scheduling_request_confirmed"] },
  { value: "trip", label: "Trip", types: ["trip_created", "trip_generated_requests"] },
  { value: "entity", label: "Entity", types: ["entity_merged", "field_locked", "field_overridden"] },
];

function ActivityPageContent() {
  const { ready } = useRequireSession();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const [activityLog] = useActivityLog(activeFundId);
  const params = useSearchParams();
  const initialCategory = (params?.get("category") as Category) ?? "all";
  const [categoryFilter, setCategoryFilter] = useState<Category>(initialCategory);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(activityLog[0]?.id ?? null);

  const filteredEvents = useMemo(() => {
    return activityLog.filter((event) => {
      const matchesFund = event.fundId === activeFundId;
      const categoryTypes = categoryFilter === "all" ? null : categories.find((c) => c.value === categoryFilter)?.types ?? [];
      const matchesCategory = !categoryTypes || categoryTypes.includes(event.type);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" ? event.when.startsWith("Today") : !event.when.startsWith("Mon"));
      return matchesFund && matchesCategory && matchesDate;
    });
  }, [activityLog, activeFundId, categoryFilter, dateFilter]);

  const active = filteredEvents.find((e) => e.id === activeId) ?? filteredEvents[0] ?? null;

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold accent-title">Activity</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <select
            className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none"
            value={activeFundId}
            onChange={(e) => {
              setActiveFundId(e.target.value);
              setActiveId(null);
            }}
          >
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                Fund: {f.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category)}
          >
            <option value="all">All</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          >
            <option value="all">Any date</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filteredEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => setActiveId(event.id)}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              activeId === event.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{event.when}</span>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  event.actor === "TOMO" ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]" : "bg-blue-50 text-blue-700"
                }`}
              >
                {event.actor}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-900">{event.summary}</p>
            {event.entityType ? <p className="text-xs text-gray-600">{event.entityType}</p> : null}
          </button>
        ))}
        {!filteredEvents.length ? <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">No activity for this view.</div> : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!active ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">Select an event to see details.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Entry</p>
              <h2 className="text-lg font-semibold accent-title">{active.summary}</h2>
              <p className="text-sm text-gray-600">{active.when}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{active.actor}</span>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="font-medium text-gray-900">Type</p>
            <p className="text-sm text-gray-700">{active.type.replace(/_/g, " ")}</p>
          </div>
          {active.entityType ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Linked entity</p>
              <p className="text-sm text-gray-700">{active.entityType}</p>
              {active.entityId ? <p className="text-xs text-gray-500">{active.entityId}</p> : null}
            </div>
          ) : null}
          {active.metadata ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Metadata</p>
              <ul className="mt-1 space-y-1 text-xs text-gray-600">
                {Object.entries(active.metadata).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {active.evidence?.length ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Evidence</p>
              <ul className="mt-1 space-y-1 text-xs text-gray-600">
                {active.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return <AppShell section="activity" listContent={listContent} detailContent={detailContent} contextTitle={active?.summary} />;
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-600">Loading activity…</div>}>
      <ActivityPageContent />
    </Suspense>
  );
}
