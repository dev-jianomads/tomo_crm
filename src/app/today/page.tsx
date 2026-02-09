"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { usePersistentState } from "@/lib/storage";
import {
  ActivityEvent,
  Loop,
  MeetingEvent,
  Relationship,
  SchedulingRequest,
  Stall,
  Thread,
  TripPlan,
  createFollowUpFromStall,
  detectMaterialStalls,
  deriveStalls,
  useNotificationPrefs,
  useActivityLog,
  useIngestionStatus,
  useLoops,
  useMeetings,
  useRelationships,
  useSchedulingRequests,
  useStalls,
  useThreads,
  useTripPlans,
} from "@/lib/mvp3-store";
import { LoopDetailPanel, PrepDetailPanel, SchedulingDetailPanel, ThreadDetailPanel, TripDetailPanel } from "@/components/detail-panels";
import { ToastViewport, useToasts } from "@/components/toast";

type TodaySelection =
  | { type: "loop"; id: string }
  | { type: "thread"; id: string }
  | { type: "prep"; id: string; source: "meeting" | "scheduling" }
  | { type: "scheduling"; id: string }
  | { type: "trip"; id: string }
  | null;

type ChecklistItem = { id: string; label: string; done: boolean };

const defaultChecklist: ChecklistItem[] = [
  { id: "c1", label: "Review latest thread summary", done: false },
  { id: "c2", label: "Confirm open loops and owner", done: false },
  { id: "c3", label: "Prepare next ask", done: false },
];

export default function TodayPage() {
  const { ready } = useRequireSession();
  const router = useRouter();
  const { activeFundId } = useFunds();
  const { toasts, addToast } = useToasts();

  const [relationships, setRelationships] = useRelationships(activeFundId);
  const [threads, setThreads] = useThreads(activeFundId);
  const [loops, setLoops] = useLoops(activeFundId);
  const [stalls, setStalls] = useStalls(activeFundId);
  const [schedulingRequests, setSchedulingRequests] = useSchedulingRequests(activeFundId);
  const [tripPlans, setTripPlans] = useTripPlans(activeFundId);
  const [meetings, setMeetings] = useMeetings(activeFundId);
  const [ingestionStatus] = useIngestionStatus(activeFundId);
  const [activityLog, setActivityLog] = useActivityLog(activeFundId);
  const [notificationPrefs] = useNotificationPrefs();

  const [selection, setSelection] = useState<TodaySelection>(null);
  const [checklists, setChecklists] = usePersistentState<Record<string, ChecklistItem[]>>("tomo-prep-checklists", {});

  useEffect(() => {
    const autoStalls = [...deriveStalls(threads, loops), ...detectMaterialStalls(loops)];
    setStalls((prev) => {
      const existing = new Map(prev.map((stall) => [stall.id, stall]));
      return autoStalls.map((stall) => ({
        ...stall,
        suggestedFollowUpDraft: existing.get(stall.id)?.suggestedFollowUpDraft,
      }));
    });
  }, [loops, setStalls, threads]);

  const addActivity = (event: ActivityEvent) => {
    setActivityLog((prev) => [event, ...prev]);
  };

  const updateRelationship = (next: Relationship) => {
    const previous = relationships.find((rel) => rel.id === next.id);
    setRelationships((prev) => prev.map((rel) => (rel.id === next.id ? next : rel)));
    if (!previous) return;
    const lockedFields = next.lockedFields ?? {};
    Object.entries(lockedFields).forEach(([field, locked]) => {
      const wasLocked = previous.lockedFields?.[field];
      if (locked && !wasLocked) {
        addActivity({
          id: crypto.randomUUID(),
          fundId: activeFundId,
          when: "Today",
          actor: "User",
          type: "field_locked",
          summary: `Locked ${field} field for ${next.name}`,
          entityType: "relationship",
          entityId: next.id,
        });
      }
    });
  };

  const updateLoop = (next: Loop) => {
    const previous = loops.find((loop) => loop.id === next.id);
    setLoops((prev) => prev.map((loop) => (loop.id === next.id ? next : loop)));
    if (!previous) return;
    if (!previous.suggestedDraft && next.suggestedDraft) {
      addActivity({
        id: crypto.randomUUID(),
        fundId: activeFundId,
        when: "Today",
        actor: "TOMO",
        type: "draft_generated",
        summary: `Generated draft for ${next.title}`,
        entityType: "loop",
        entityId: next.id,
        evidence: next.evidence.map((e) => e.snippet),
      });
    }
    if (previous.assignee !== next.assignee) {
      addActivity({
        id: crypto.randomUUID(),
        fundId: activeFundId,
        when: "Today",
        actor: "User",
        type: "loop_assigned",
        summary: `Assigned ${next.title} to ${next.assignee}`,
        entityType: "loop",
        entityId: next.id,
      });
    }
    if (previous.status !== next.status) {
      const typeMap: Record<string, ActivityEvent["type"]> = {
        DONE: "loop_done",
        SNOOZED: "loop_snoozed",
        OPEN: "loop_created",
        WAITING: "marked_sent",
      };
      addActivity({
        id: crypto.randomUUID(),
        fundId: activeFundId,
        when: "Today",
        actor: "User",
        type: typeMap[next.status] ?? "loop_created",
        summary: `Loop ${next.status.toLowerCase()}: ${next.title}`,
        entityType: "loop",
        entityId: next.id,
      });
    }
  };

  const updateScheduling = (next: SchedulingRequest) => {
    const previous = schedulingRequests.find((req) => req.id === next.id);
    setSchedulingRequests((prev) => prev.map((req) => (req.id === next.id ? next : req)));
    if (!previous) return;
    if (previous.status !== next.status) {
      const typeMap: Record<string, ActivityEvent["type"]> = {
        SENT: "scheduling_request_sent",
        PROPOSED: "scheduling_request_proposed",
        CONFIRMED: "scheduling_request_confirmed",
        DRAFT: "scheduling_request_created",
        COLLECTING_AVAIL: "scheduling_request_created",
        CANCELLED: "scheduling_request_sent",
      };
      addActivity({
        id: crypto.randomUUID(),
        fundId: activeFundId,
        when: "Today",
        actor: "User",
        type: typeMap[next.status] ?? "scheduling_request_created",
        summary: `Scheduling ${next.status.toLowerCase()}: ${next.title}`,
        entityType: "scheduling",
        entityId: next.id,
      });
    }
  };

  const updateTrip = (next: TripPlan) => {
    setTripPlans((prev) => prev.map((plan) => (plan.id === next.id ? next : plan)));
  };

  const handleCreateLoop = (title = "New loop") => {
    const loop: Loop = {
      id: crypto.randomUUID(),
      fundId: activeFundId,
      contactId: relationships[0]?.id ?? "",
      title,
      status: "OPEN",
      dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      priority: "MED",
      assignee: "ME",
      evidence: [{ type: "THREAD", snippet: "Created from Today quick action." }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLoops((prev) => [loop, ...prev]);
    setSelection({ type: "loop", id: loop.id });
    addToast("Loop created.");
  };

  const handleCreateScheduling = () => {
    const contact = relationships[0];
    const request: SchedulingRequest = {
      id: crypto.randomUUID(),
      fundId: activeFundId,
      contactId: contact?.id ?? "",
      title: "New scheduling request",
      participants: [
        { name: contact?.name ?? "Relationship", email: contact?.email, role: "LP", timezone: contact?.timezone },
        { name: "You", role: "INTERNAL", timezone: notificationPrefs.timezoneDefault ?? "America/New_York" },
      ],
      coordinator: "ME",
      durationMinutes: 30,
      locationType: "VIDEO",
      timeWindow: { startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString() },
      constraints: {
        avoidWeekends: true,
        bufferMinutes: 15,
        preferredHours: notificationPrefs.workHoursDefault ?? { start: "09:00", end: "17:00" },
      },
      status: "DRAFT",
      proposals: [],
    };
    setSchedulingRequests((prev) => [request, ...prev]);
    setSelection({ type: "scheduling", id: request.id });
    addToast("Scheduling request created.");
    addActivity({
      id: crypto.randomUUID(),
      fundId: activeFundId,
      when: "Today",
      actor: "User",
      type: "scheduling_request_created",
      summary: `Created scheduling request: ${request.title}`,
      entityType: "scheduling",
      entityId: request.id,
    });
  };

  const handleCreateTrip = () => {
    const plan: TripPlan = {
      id: crypto.randomUUID(),
      fundId: activeFundId,
      name: "New trip plan",
      city: "New York",
      startDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 16 * 86400000).toISOString(),
      targetContactIds: relationships.slice(0, 2).map((rel) => rel.id),
      suggestedMeetings: [],
      status: "Not started",
    };
    setTripPlans((prev) => [plan, ...prev]);
    setSelection({ type: "trip", id: plan.id });
    addToast("Trip plan created.");
    addActivity({
      id: crypto.randomUUID(),
      fundId: activeFundId,
      when: "Today",
      actor: "User",
      type: "trip_created",
      summary: `Created trip plan: ${plan.name}`,
      entityType: "trip",
      entityId: plan.id,
    });
  };

  const todayPriorities = useMemo(() => {
    const overdueLoops = loops.filter((loop) => loop.dueAt && new Date(loop.dueAt) <= new Date());
    const highStalls = stalls.filter((stall) => stall.severity === "HIGH");
    const todaysMeetings = meetings.filter((meeting) => isToday(meeting.startsAt));
    const items = [
      ...overdueLoops.map((loop) => ({ id: loop.id, label: loop.title, type: "loop" as const })),
      ...highStalls.map((stall) => ({ id: stall.threadId, label: stall.stallReason.replace(/_/g, " "), type: "thread" as const })),
      ...todaysMeetings.map((meeting) => ({ id: meeting.id, label: meeting.title, type: "prep" as const, source: "meeting" as const })),
    ];
    return items.slice(0, 5);
  }, [loops, meetings, stalls]);

  const openLoopsDueSoon = loops.filter((loop) => loop.status !== "DONE" && loop.dueAt && isWithinDays(loop.dueAt, 7));
  const schedulingInProgress = schedulingRequests.filter((req) => req.status === "COLLECTING_AVAIL" || req.status === "PROPOSED");

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {selection?.type === "loop" ? (
        <LoopDetailPanel
          loop={loops.find((loop) => loop.id === selection.id)}
          relationship={relationships.find((rel) => rel.id === loops.find((loop) => loop.id === selection.id)?.contactId)}
          thread={threads.find((thread) => thread.id === loops.find((loop) => loop.id === selection.id)?.threadId)}
          onUpdateLoop={updateLoop}
          onOpenThread={(id) => setSelection({ type: "thread", id })}
          onOpenRelationship={(id) => router.push(`/relationships?rel=${id}`)}
          onUpdateRelationship={updateRelationship}
          onToast={addToast}
        />
      ) : selection?.type === "thread" ? (
        <ThreadDetailPanel
          thread={threads.find((thread) => thread.id === selection.id)}
          relationship={relationships.find((rel) => rel.id === threads.find((thread) => thread.id === selection.id)?.contactId)}
          loops={loops}
          stall={stalls.find((stall) => stall.threadId === selection.id)}
          onCreateLoop={(title, threadId, contactId) => {
            const loop: Loop = {
              id: crypto.randomUUID(),
              fundId: activeFundId,
              contactId,
              threadId,
              title,
              status: "OPEN",
              dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
              priority: "MED",
              assignee: "ME",
              evidence: [{ type: "THREAD", id: threadId, snippet: "Created from thread detail." }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setLoops((prev) => [loop, ...prev]);
            setSelection({ type: "loop", id: loop.id });
          }}
          onOpenLoop={(id) => setSelection({ type: "loop", id })}
          onGenerateFollowUp={(stallId) => {
            setStalls((prev) =>
              prev.map((stall) => {
                if (stall.id !== stallId) return stall;
                return { ...stall, suggestedFollowUpDraft: createFollowUpFromStall(stall, relationships.find((rel) => rel.id === stall.contactId)) };
              })
            );
            addToast("Follow-up draft generated.");
          }}
          onMarkSent={(stallId) => {
            addActivity({
              id: crypto.randomUUID(),
              fundId: activeFundId,
              when: "Today",
              actor: "User",
              type: "marked_sent",
              summary: "Marked follow-up as sent",
              entityType: "thread",
              entityId: stallId,
            });
            addToast("Marked as sent.");
          }}
        />
      ) : selection?.type === "prep" ? (
        <PrepDetailPanel
          title={selection.source === "meeting" ? meetings.find((meeting) => meeting.id === selection.id)?.title ?? "Meeting brief" : "Scheduling brief"}
          relationship={relationships.find((rel) => rel.id === (selection.source === "meeting" ? meetings.find((m) => m.id === selection.id)?.contactId : schedulingRequests.find((req) => req.id === selection.id)?.contactId))}
          threads={threads.filter((thread) => thread.contactId === (selection.source === "meeting" ? meetings.find((m) => m.id === selection.id)?.contactId : schedulingRequests.find((req) => req.id === selection.id)?.contactId))}
          loops={loops.filter((loop) => loop.contactId === (selection.source === "meeting" ? meetings.find((m) => m.id === selection.id)?.contactId : schedulingRequests.find((req) => req.id === selection.id)?.contactId))}
          stalls={stalls.filter((stall) => stall.contactId === (selection.source === "meeting" ? meetings.find((m) => m.id === selection.id)?.contactId : schedulingRequests.find((req) => req.id === selection.id)?.contactId))}
          checklist={checklists[selection.id] ?? defaultChecklist}
          onToggleChecklist={(id) =>
            setChecklists((prev) => {
              const list = prev[selection.id] ?? defaultChecklist;
              return {
                ...prev,
                [selection.id]: list.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
              };
            })
          }
        />
      ) : selection?.type === "scheduling" ? (
        <SchedulingDetailPanel
          request={schedulingRequests.find((req) => req.id === selection.id)}
          relationship={relationships.find((rel) => rel.id === schedulingRequests.find((req) => req.id === selection.id)?.contactId)}
          assistant={relationships.find((rel) => rel.id === relationships.find((owner) => owner.id === schedulingRequests.find((req) => req.id === selection.id)?.contactId)?.assistantContactId)}
          defaultTimezone={notificationPrefs.timezoneDefault}
          defaultWorkHours={notificationPrefs.workHoursDefault}
          onUpdateRequest={updateScheduling}
          onToast={addToast}
        />
      ) : selection?.type === "trip" ? (
        <TripDetailPanel
          trip={tripPlans.find((plan) => plan.id === selection.id)}
          relationships={relationships}
          onUpdateTrip={updateTrip}
          onCreateRequests={(contactIds) => {
            const newRequests = contactIds.map((contactId) => ({
              id: crypto.randomUUID(),
              fundId: activeFundId,
              contactId,
              title: "Trip meeting request",
              participants: [
                {
                  name: relationships.find((rel) => rel.id === contactId)?.name ?? "Relationship",
                  role: "LP" as const,
                  timezone: relationships.find((rel) => rel.id === contactId)?.timezone,
                },
              ],
              coordinator: "ME" as const,
              durationMinutes: 30,
              locationType: "IN_PERSON" as const,
              timeWindow: { startDate: new Date().toISOString(), endDate: new Date(Date.now() + 10 * 86400000).toISOString() },
              constraints: {
                avoidWeekends: true,
                bufferMinutes: 15,
                preferredHours: notificationPrefs.workHoursDefault ?? { start: "09:00", end: "17:00" },
              },
              status: "DRAFT" as const,
              proposals: [],
            }));
            setSchedulingRequests((prev) => [...newRequests, ...prev]);
            addToast("Scheduling requests created.");
            addActivity({
              id: crypto.randomUUID(),
              fundId: activeFundId,
              when: "Today",
              actor: "User",
              type: "trip_generated_requests",
              summary: `Generated ${newRequests.length} trip scheduling requests`,
              entityType: "trip",
              entityId: selection.id,
            });
          }}
        />
      ) : (
        <Placeholder title="Select a module to open details." />
      )}
    </div>
  );

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold accent-title">Today</p>
          <img src="/tomo-logo.png" alt="Tomo logo" className="h-8 w-8 rounded" />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        <section className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Daily Execution Brief</p>
            <h2 className="text-lg font-semibold accent-title">Control tower</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="button-primary" onClick={() => handleCreateLoop()}>
              Create loop
            </button>
            <button className="button-secondary" onClick={handleCreateScheduling}>
              Start scheduling request
            </button>
            <button className="button-secondary" onClick={handleCreateTrip}>
              Create trip plan
            </button>
          </div>
          <div>
            <p className="text-sm font-semibold accent-title">Today's priorities</p>
            {todayPriorities.length ? (
              <div className="mt-2 space-y-2">
                {todayPriorities.map((item) => (
                  <button
                    key={item.id}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:border-gray-300"
                    onClick={() => {
                      if (item.type === "loop") setSelection({ type: "loop", id: item.id });
                      if (item.type === "thread") setSelection({ type: "thread", id: item.id });
                      if (item.type === "prep") setSelection({ type: "prep", id: item.id, source: "meeting" });
                    }}
                  >
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-600">Why: top priority for today</p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState label="No urgent items right now." />
            )}
          </div>
        </section>

        <ModuleCard title="Stalls detected" subtitle={`${stalls.length} stalls`} emptyLabel="No stalls detected.">
          {stalls.map((stall) => (
            <div key={stall.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 space-y-1">
              <p className="font-medium">{stall.stallReason.replace(/_/g, " ")}</p>
              <p className="text-xs">Why: {stall.evidence[0] ?? "No evidence captured."}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  onClick={() => {
                    setStalls((prev) =>
                      prev.map((s) => (s.id === stall.id ? { ...s, suggestedFollowUpDraft: createFollowUpFromStall(s, relationships.find((rel) => rel.id === s.contactId)) } : s))
                    );
                    addToast("Follow-up draft generated.");
                  }}
                >
                  Generate follow-up
                </button>
                <button className="button-secondary" onClick={() => setSelection({ type: "thread", id: stall.threadId })}>
                  Open thread
                </button>
              </div>
            </div>
          ))}
        </ModuleCard>

        <ModuleCard title="Open loops due soon" subtitle={`${openLoopsDueSoon.length} loops`}>
          {openLoopsDueSoon.map((loop) => (
            <button key={loop.id} className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:border-gray-300" onClick={() => setSelection({ type: "loop", id: loop.id })}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{loop.title}</p>
                <span className="text-xs text-gray-500">{loop.dueAt ? new Date(loop.dueAt).toLocaleDateString() : "No due date"}</span>
              </div>
              <p className="text-xs text-gray-600">Why: due within 7 days</p>
            </button>
          ))}
        </ModuleCard>

        <ModuleCard title="Meetings today / this week" subtitle={`${meetings.length} meetings`} emptyLabel="No meetings scheduled.">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{meeting.title}</p>
                <span className="text-xs text-gray-500">{new Date(meeting.startsAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="button-secondary" onClick={() => setSelection({ type: "prep", id: meeting.id, source: "meeting" })}>
                  One tap brief
                </button>
              </div>
            </div>
          ))}
        </ModuleCard>

        <ModuleCard title="Scheduling in progress" subtitle={`${schedulingInProgress.length} requests`} emptyLabel="No scheduling in progress.">
          {schedulingInProgress.map((req) => (
            <div key={req.id} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
              <p className="font-medium text-gray-900">{req.title}</p>
              <p className="text-xs text-gray-600">Why: awaiting availability</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="button-secondary" onClick={() => setSelection({ type: "prep", id: req.id, source: "scheduling" })}>
                  One tap brief
                </button>
                <button className="button-secondary" onClick={() => setSelection({ type: "scheduling", id: req.id })}>
                  Open request
                </button>
              </div>
            </div>
          ))}
        </ModuleCard>

        <ModuleCard title="Ingestion health" subtitle="Outlook + Calendar">
          <div className="grid gap-2 sm:grid-cols-2">
            {ingestionStatus.map((connector) => (
              <button
                key={connector.connector}
                className="rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:border-gray-300"
                onClick={() => router.push("/activity?category=system")}
              >
                <p className="font-medium text-gray-900">{connector.connector}</p>
                <p className="text-xs text-gray-600">
                  {connector.status} • lag {connector.syncLagMinutes}m
                </p>
                {connector.errors.length ? <p className="text-xs text-rose-600">Why: {connector.errors[0].message}</p> : <p className="text-xs text-gray-500">Why: latest sync ok</p>}
              </button>
            ))}
          </div>
        </ModuleCard>
      </div>
    </div>
  );

  if (!ready) return null;

  return (
    <>
      <AppShell section="today" listContent={listContent} detailContent={detailContent} detailVisible={Boolean(selection)} contextTitle="Today control tower" />
      <ToastViewport toasts={toasts} />
    </>
  );
}

function ModuleCard({
  title,
  subtitle,
  emptyLabel = "No items available.",
  children,
}: {
  title: string;
  subtitle?: string;
  emptyLabel?: string;
  children?: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold accent-title">{title}</p>
        {subtitle ? <span className="text-xs text-gray-500">{subtitle}</span> : null}
      </div>
      {hasItems ? <div className="space-y-2">{children}</div> : <EmptyState label={emptyLabel} />}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">{label}</p>;
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

function isToday(dateIso: string) {
  const date = new Date(dateIso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isWithinDays(dateIso: string, days: number) {
  const date = new Date(dateIso);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 86400000;
}
