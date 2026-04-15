"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { getTomoActivityPageEvents, type TomoActivityEventType, type TomoActivityPageEvent } from "@/lib/tomo-activity-feed";
import { useRelationships } from "@/components/relationships-provider";

const eventTypes: { value: TomoActivityEventType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "outreach", label: "Outreach" },
  { value: "meeting", label: "Meetings" },
  { value: "update", label: "Updates" },
  { value: "system", label: "System" },
];

export default function ActivityPage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId, setActiveFundId } = useFunds();
  const { relationships } = useRelationships();
  const allEvents = useMemo(() => getTomoActivityPageEvents(relationships), [relationships]);
  const [typeFilter, setTypeFilter] = useState<TomoActivityEventType | "all">("all");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(allEvents[0]?.id ?? null);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesFund = activeFundId === "all" || event.fundId === activeFundId;
      const matchesType = typeFilter === "all" || event.type === typeFilter;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" ? event.when.startsWith("Today") : !event.when.startsWith("Mon"));
      return matchesFund && matchesType && matchesDate;
    });
  }, [activeFundId, allEvents, dateFilter, typeFilter]);

  const active = filteredEvents.find((e) => e.id === activeId) ?? filteredEvents[0] ?? null;

  const listContent = (
    <div className="flex h-full flex-col">
      <PageListHeader
        label="Activity"
        description="Tomo automations and system steps across your CRM and playbooks—filter by fund, type, or time window, then open an entry for context."
      >
        <div className="grid grid-cols-3 gap-2 text-xs">
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
          <select
            className="rounded-md border border-gray-200 px-2 py-1 text-gray-800 focus:border-blue-500 focus:outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TomoActivityEventType | "all")}
          >
            {eventTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
      </PageListHeader>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {filteredEvents.map((event) => (
          <ActivityRow key={event.id} event={event} selected={activeId === event.id} onSelect={() => setActiveId(event.id)} />
        ))}
        {!filteredEvents.length ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">No activity for this view.</div>
        ) : null}
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
            <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-ink)]">{active.actor}</span>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="font-medium text-gray-900">Type</p>
            <p className="text-sm text-gray-700 capitalize">{active.type}</p>
          </div>
          {active.workflowLabel ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Workflow / playbook</p>
              <p className="text-sm text-gray-700">{active.workflowLabel}</p>
            </div>
          ) : null}
          {active.entity ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Linked entity</p>
              <p className="text-sm text-gray-700">{active.entity}</p>
            </div>
          ) : null}
          {active.actionTitle ? (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              <p className="font-medium text-gray-900">Today action</p>
              <p className="text-sm text-gray-700">{active.actionTitle}</p>
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
      assistantChips={["Summarize today", "Filter by workflow", "Export this log"]}
    />
  );
}

function ActivityRow({
  event,
  selected,
  onSelect,
}: {
  event: TomoActivityPageEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-2 text-left transition ${
        selected ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{event.when}</span>
        <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--accent-ink)]">{event.actor}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-gray-900">{event.summary}</p>
      {event.entity ? <p className="text-xs text-gray-600">{event.entity}</p> : null}
      {event.workflowLabel && event.workflowLabel !== event.entity ? (
        <p className="text-xs text-gray-500">{event.workflowLabel}</p>
      ) : null}
    </button>
  );
}
