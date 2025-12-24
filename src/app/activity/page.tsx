"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";

type EventType = "outreach" | "update" | "meeting" | "system";

type ActivityEvent = {
  id: string;
  when: string;
  actor: "TOMO" | "User";
  summary: string;
  type: EventType;
  entity?: string;
  fundId?: string;
};

const mockEvents: ActivityEvent[] = [
  { id: "e1", when: "Today 09:10", actor: "TOMO", summary: "Drafted outreach to Northwind", type: "outreach", entity: "Northwind Capital", fundId: "fund-1" },
  { id: "e2", when: "Today 08:20", actor: "TOMO", summary: "Checked engagement for Peakline", type: "update", entity: "Peakline Partners", fundId: "fund-2" },
  { id: "e3", when: "Yesterday 18:05", actor: "User", summary: "Approved follow-up to Peakline", type: "outreach", entity: "Peakline Partners", fundId: "fund-2" },
  { id: "e4", when: "Yesterday 14:33", actor: "TOMO", summary: "Updated brief for Northwind", type: "meeting", entity: "Northwind Capital", fundId: "fund-1" },
  { id: "e5", when: "Yesterday 10:12", actor: "User", summary: "Snoozed Lumen outreach", type: "system", entity: "Lumen LP", fundId: "fund-3" },
  { id: "e6", when: "Mon 16:04", actor: "TOMO", summary: "Logged momentum change: Stalled → Heating", type: "update", entity: "Momentum", fundId: "fund-1" },
];

const eventTypes: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "outreach", label: "Outreach" },
  { value: "meeting", label: "Meetings" },
  { value: "update", label: "Updates" },
  { value: "system", label: "System" },
];

export default function ActivityPage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(mockEvents[0]?.id ?? null);

  const filteredEvents = useMemo(() => {
    return mockEvents.filter((event) => {
      const matchesFund = activeFundId === "all" || event.fundId === activeFundId;
      const matchesType = typeFilter === "all" || event.type === typeFilter;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" ? event.when.startsWith("Today") : !event.when.startsWith("Mon")); // lightweight mock window
      return matchesFund && matchesType && matchesDate;
    });
  }, [activeFundId, dateFilter, typeFilter]);

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
            <option value="all">Fund: All</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                Fund: {f.name}
              </option>
            ))}
          </select>
          <select className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EventType | "all")}>
            {eventTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}>
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
            {event.entity ? <p className="text-xs text-gray-600">{event.entity}</p> : null}
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
            <p className="text-sm text-gray-700 capitalize">{active.type}</p>
          </div>
          {active.entity ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Linked entity</p>
              <p className="text-sm text-gray-700">{active.entity}</p>
            </div>
          ) : null}
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="font-medium text-gray-900">Notes</p>
            <p className="text-sm text-gray-700">Traceability only. No action required here.</p>
          </div>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="activity"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={active?.summary}
      assistantChips={["Summarize today", "Filter to my entries", "Export this log"]}
    />
  );
}

