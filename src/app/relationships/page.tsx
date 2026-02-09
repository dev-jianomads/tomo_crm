"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import { ToastViewport, useToasts } from "@/components/toast";
import {
  ActivityEvent,
  Loop,
  Relationship,
  SchedulingRequest,
  Stall,
  Thread,
  createFollowUpFromStall,
  detectMaterialStalls,
  deriveStalls,
  useActivityLog,
  useLoops,
  useMeetings,
  useNotificationPrefs,
  useRelationships,
  useSchedulingRequests,
  useStalls,
  useThreads,
} from "@/lib/mvp3-store";
import { LoopDetailPanel, SchedulingDetailPanel, ThreadDetailPanel } from "@/components/detail-panels";

type RelationshipSelection =
  | { type: "relationship"; id: string }
  | { type: "loop"; id: string }
  | { type: "thread"; id: string }
  | { type: "scheduling"; id: string }
  | null;

type DuplicatePair = { left: Relationship; right: Relationship };

export default function RelationshipsPage() {
  const { ready } = useRequireSession();
  const { activeFundId } = useFunds();
  const { toasts, addToast } = useToasts();
  const params = useSearchParams();

  const [relationships, setRelationships] = useRelationships(activeFundId);
  const [threads, setThreads] = useThreads(activeFundId);
  const [loops, setLoops] = useLoops(activeFundId);
  const [stalls, setStalls] = useStalls(activeFundId);
  const [schedulingRequests, setSchedulingRequests] = useSchedulingRequests(activeFundId);
  const [meetings, setMeetings] = useMeetings(activeFundId);
  const [activityLog, setActivityLog] = useActivityLog(activeFundId);
  const [notificationPrefs] = useNotificationPrefs();

  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<RelationshipSelection>(null);
  const [showDedupe, setShowDedupe] = useState(false);
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [dedupeKeep, setDedupeKeep] = useState<"left" | "right">("left");
  const [cadence, setCadence] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    const relParam = params?.get("rel");
    if (relParam) {
      setSelection({ type: "relationship", id: relParam });
    }
  }, [params]);

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

  const activeRelationship = selection?.type === "relationship" ? relationships.find((rel) => rel.id === selection.id) : null;

  const filtered = relationships.filter((rel) => {
    if (rel.archived) return false;
    const match = rel.name.toLowerCase().includes(query.toLowerCase()) || rel.firm.toLowerCase().includes(query.toLowerCase());
    return match;
  });

  useEffect(() => {
    if (!selection && filtered.length) {
      setSelection({ type: "relationship", id: filtered[0].id });
    }
  }, [filtered, selection]);

  const duplicates = useMemo(() => detectDuplicates(relationships), [relationships]);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500">Relationships</p>
          <button className="text-xs text-blue-700 hover:underline" onClick={() => setShowDedupe(true)}>
            Resolve duplicates
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search relationships"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-auto px-4 py-3">
        {filtered.map((rel) => (
          <button
            key={rel.id}
            onClick={() => setSelection({ type: "relationship", id: rel.id })}
            className={`w-full rounded-md border px-3 py-2 text-left transition ${
              selection?.type === "relationship" && selection.id === rel.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold accent-title">{rel.name}</p>
                <p className="text-xs text-gray-600">{rel.firm}</p>
              </div>
              <div className="flex items-center gap-2">
                <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} />
                {rel.doNotContact ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-700">DNC</span> : null}
              </div>
            </div>
            <p className="text-xs text-gray-600">Last: {rel.lastInteraction}</p>
            <p className="text-xs text-gray-600">Next move: {rel.nextMove}</p>
          </button>
        ))}
        {!filtered.length ? <Placeholder title="No relationships match." /> : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {selection?.type === "loop" ? (
        <LoopDetailPanel
          loop={loops.find((loop) => loop.id === selection.id)}
          relationship={relationships.find((rel) => rel.id === loops.find((loop) => loop.id === selection.id)?.contactId)}
          thread={threads.find((thread) => thread.id === loops.find((loop) => loop.id === selection.id)?.threadId)}
          onUpdateLoop={updateLoop}
          onOpenThread={(id) => setSelection({ type: "thread", id })}
          onOpenRelationship={(id) => setSelection({ type: "relationship", id })}
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
              dueAt: new Date(Date.now() + cadence * 86400000).toISOString(),
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
              prev.map((stall) => (stall.id === stallId ? { ...stall, suggestedFollowUpDraft: createFollowUpFromStall(stall) } : stall))
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
      ) : activeRelationship ? (
        <RelationshipDetail
          relationship={activeRelationship}
          threads={threads.filter((thread) => thread.contactId === activeRelationship.id)}
          loops={loops.filter((loop) => loop.contactId === activeRelationship.id)}
          stalls={stalls.filter((stall) => stall.contactId === activeRelationship.id)}
          schedulingRequests={schedulingRequests.filter((req) => req.contactId === activeRelationship.id)}
          assistantOptions={relationships.filter((rel) => rel.id !== activeRelationship.id && !rel.archived)}
          onUpdate={updateRelationship}
          onCreateLoop={(title, evidence) => {
            const loop: Loop = {
              id: crypto.randomUUID(),
              fundId: activeFundId,
              contactId: activeRelationship.id,
              title,
              status: "OPEN",
              dueAt: new Date(Date.now() + cadence * 86400000).toISOString(),
              priority: "MED",
              assignee: "ME",
              evidence: [{ type: "THREAD", snippet: evidence }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setLoops((prev) => [loop, ...prev]);
            addToast("Loop created.");
            addActivity({
              id: crypto.randomUUID(),
              fundId: activeFundId,
              when: "Today",
              actor: "User",
              type: "loop_created",
              summary: `Created loop for ${activeRelationship.name}`,
              entityType: "loop",
              entityId: loop.id,
            });
          }}
          onOpenLoop={(id) => setSelection({ type: "loop", id })}
          onOpenThread={(id) => setSelection({ type: "thread", id })}
          onOpenScheduling={(id) => setSelection({ type: "scheduling", id })}
          onGenerateFollowUp={(stallId) => {
            setStalls((prev) =>
              prev.map((stall) => (stall.id === stallId ? { ...stall, suggestedFollowUpDraft: createFollowUpFromStall(stall, activeRelationship) } : stall))
            );
            addToast("Follow-up draft generated.");
          }}
          onSetDnc={(next) => {
            setRelationships((prev) => prev.map((rel) => (rel.id === activeRelationship.id ? { ...rel, doNotContact: next } : rel)));
            addToast(next ? "Marked as Do Not Contact." : "Re-enabled contact.");
          }}
          cadence={cadence}
          setCadence={setCadence}
        />
      ) : (
        <Placeholder title="Select a relationship to view details." />
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <>
      <AppShell section="relationships" listContent={listContent} detailContent={detailContent} contextTitle={activeRelationship?.name} />
      <ToastViewport toasts={toasts} />
      {showDedupe ? (
        <Modal title="Resolve duplicates" onClose={() => setShowDedupe(false)}>
          {!duplicates.length ? (
            <p className="text-sm text-gray-600">No duplicates detected.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Suggested duplicates based on organization + name/email similarity.</p>
              <div className="space-y-2">
                {duplicates.map((pair) => (
                  <button
                    key={`${pair.left.id}-${pair.right.id}`}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:border-gray-300"
                    onClick={() => {
                      setSelectedPair(pair);
                      setDedupeKeep("left");
                    }}
                  >
                    <p className="font-medium text-gray-900">
                      {pair.left.name} ↔ {pair.right.name}
                    </p>
                    <p className="text-xs text-gray-600">{pair.left.firm}</p>
                  </button>
                ))}
              </div>
              {selectedPair ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <ComparisonCard
                      title="Keep"
                      selected={dedupeKeep === "left"}
                      onSelect={() => setDedupeKeep("left")}
                      relationship={selectedPair.left}
                    />
                    <ComparisonCard
                      title="Keep"
                      selected={dedupeKeep === "right"}
                      onSelect={() => setDedupeKeep("right")}
                      relationship={selectedPair.right}
                    />
                  </div>
                  <button
                    className="button-primary"
                    onClick={() => {
                      const keep = dedupeKeep === "left" ? selectedPair.left : selectedPair.right;
                      const drop = dedupeKeep === "left" ? selectedPair.right : selectedPair.left;
                      setRelationships((prev) =>
                        prev.map((rel) => {
                          if (rel.id === drop.id) return { ...rel, archived: true };
                          return rel;
                        })
                      );
                      setLoops((prev) => prev.map((loop) => (loop.contactId === drop.id ? { ...loop, contactId: keep.id } : loop)));
                      setThreads((prev) => prev.map((thread) => (thread.contactId === drop.id ? { ...thread, contactId: keep.id } : thread)));
                      setStalls((prev) => prev.map((stall) => (stall.contactId === drop.id ? { ...stall, contactId: keep.id } : stall)));
                      setSchedulingRequests((prev) => prev.map((req) => (req.contactId === drop.id ? { ...req, contactId: keep.id } : req)));
                      setMeetings((prev) => prev.map((meeting) => (meeting.contactId === drop.id ? { ...meeting, contactId: keep.id } : meeting)));
                      addActivity({
                        id: crypto.randomUUID(),
                        fundId: activeFundId,
                        when: "Today",
                        actor: "User",
                        type: "entity_merged",
                        summary: `Merged ${drop.name} into ${keep.name}`,
                        entityType: "relationship",
                        entityId: keep.id,
                      });
                      const fields = ["firm", "role", "email"] as const;
                      fields.forEach((field) => {
                        const keepValue = keep[field];
                        const dropValue = drop[field];
                        if (dropValue && keepValue && dropValue !== keepValue) {
                          addActivity({
                            id: crypto.randomUUID(),
                            fundId: activeFundId,
                            when: "Today",
                            actor: "User",
                            type: "field_overridden",
                            summary: `Field override kept ${field} from ${keep.name}`,
                            entityType: "relationship",
                            entityId: keep.id,
                          });
                        }
                      });
                      addToast("Duplicates merged.");
                      setSelectedPair(null);
                      setShowDedupe(false);
                    }}
                  >
                    Merge
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}

function RelationshipDetail({
  relationship,
  threads,
  loops,
  stalls,
  schedulingRequests,
  assistantOptions,
  onUpdate,
  onCreateLoop,
  onOpenLoop,
  onOpenThread,
  onOpenScheduling,
  onGenerateFollowUp,
  onSetDnc,
  cadence,
  setCadence,
}: {
  relationship: Relationship;
  threads: Thread[];
  loops: Loop[];
  stalls: Stall[];
  schedulingRequests: SchedulingRequest[];
  assistantOptions: Relationship[];
  onUpdate: (relationship: Relationship) => void;
  onCreateLoop: (title: string, evidence: string) => void;
  onOpenLoop: (id: string) => void;
  onOpenThread: (id: string) => void;
  onOpenScheduling: (id: string) => void;
  onGenerateFollowUp: (stallId: string) => void;
  onSetDnc: (next: boolean) => void;
  cadence: 30 | 60 | 90;
  setCadence: (val: 30 | 60 | 90) => void;
}) {
  const snapshot = useMemo(() => {
    const direction =
      relationship.momentumTrend === "up"
        ? "Momentum is heating up"
        : relationship.momentumTrend === "down"
          ? "Momentum is cooling"
          : "Momentum is steady";
    const pace = `Pace feels ${relationship.velocity.toLowerCase()}.`;
    const next = relationship.nextMove ? `Next to watch: ${relationship.nextMove}.` : "";
    return `${direction}. ${pace} ${next}`.trim();
  }, [relationship]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Relationship</p>
          <h2 className="text-lg font-semibold accent-title">{relationship.name}</h2>
          <p className="text-sm text-gray-600">{relationship.firm}</p>
          {relationship.doNotContact ? <p className="text-xs text-rose-600">Do not contact enabled</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <MomentumChip score={relationship.momentumScore} trend={relationship.momentumTrend} />
          <span className="text-xs text-gray-600">{relationship.band}</span>
        </div>
      </div>

      <section className="rounded-md border tomo-ai-border bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold accent-title">Current snapshot</p>
        </div>
        <p className="mt-1 text-sm tomo-ai-text">{snapshot}</p>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Assistant / EA mapping</p>
        <select
          className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
          value={relationship.assistantContactId ?? ""}
          onChange={(e) => onUpdate({ ...relationship, assistantContactId: e.target.value || undefined })}
        >
          <option value="">No assistant assigned</option>
          {assistantOptions.map((rel) => (
            <option key={rel.id} value={rel.id}>
              {rel.name} • {rel.firm}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600">Scheduling requests can be routed via assistant.</p>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Touch plan</p>
        <div className="flex gap-2">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              className={`rounded-full border px-3 py-1 text-xs ${cadence === days ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
              onClick={() => setCadence(days as 30 | 60 | 90)}
            >
              {days} days
            </button>
          ))}
        </div>
        <button className="button-secondary" onClick={() => onCreateLoop(`Touch base with ${relationship.name}`, "Touch plan cadence")}>
          Create next loop
        </button>
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Open loops</p>
        {loops.length ? (
          <div className="space-y-2">
            {loops.map((loop) => (
              <button key={loop.id} className="w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm" onClick={() => onOpenLoop(loop.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{loop.title}</span>
                  <span className="text-xs text-gray-500">{loop.status}</span>
                </div>
                <p className="text-xs text-gray-600">Why: {loop.evidence[0]?.snippet ?? "No evidence captured."}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState label="No open loops for this relationship." />
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Threads</p>
        {threads.length ? (
          <div className="space-y-2">
            {threads.map((thread) => (
              <button key={thread.id} className="w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm" onClick={() => onOpenThread(thread.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{thread.title}</span>
                  <span className="text-xs text-gray-500">{thread.status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-gray-600">Why: {thread.evidence[0]?.snippet ?? "No evidence captured."}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState label="No threads linked yet." />
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Stalls</p>
        {stalls.length ? (
          <div className="space-y-2">
            {stalls.map((stall) => (
              <div key={stall.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">{stall.stallReason.replace(/_/g, " ")}</p>
                <p className="text-xs">Why: {stall.evidence[0] ?? "No evidence captured."}</p>
                <button className="button-secondary mt-2" onClick={() => onGenerateFollowUp(stall.id)}>
                  Generate follow-up
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No stalls detected." />
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Scheduling requests</p>
        {schedulingRequests.length ? (
          <div className="space-y-2">
            {schedulingRequests.map((req) => (
              <button key={req.id} className="w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm" onClick={() => onOpenScheduling(req.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{req.title}</span>
                  <span className="text-xs text-gray-500">{req.status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-gray-600">Why: multi-party coordination in progress</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState label="No scheduling requests yet." />
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
        <p className="text-sm font-semibold accent-title">Do not contact</p>
        <p className="text-xs text-gray-600">Disables drafts and reminders for this relationship.</p>
        <button
          className="button-secondary"
          onClick={() => {
            if (!relationship.doNotContact) {
              const confirmed = window.confirm("Confirm: mark this relationship as do not contact?");
              if (!confirmed) return;
            }
            onSetDnc(!relationship.doNotContact);
          }}
        >
          {relationship.doNotContact ? "Re-enable contact" : "Mark as do not contact"}
        </button>
      </section>
    </div>
  );
}

function detectDuplicates(relationships: Relationship[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const active = relationships.filter((rel) => !rel.archived);
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i];
      const right = active[j];
      const sameFirm = left.firm.toLowerCase() === right.firm.toLowerCase();
      const nameSimilar = left.name.split(" ")[0].toLowerCase() === right.name.split(" ")[0].toLowerCase();
      const domainMatch = left.email && right.email ? getDomain(left.email) === getDomain(right.email) : false;
      if (sameFirm && (nameSimilar || domainMatch)) {
        pairs.push({ left, right });
      }
    }
  }
  return pairs;
}

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function ComparisonCard({
  title,
  selected,
  onSelect,
  relationship,
}: {
  title: string;
  selected: boolean;
  onSelect: () => void;
  relationship: Relationship;
}) {
  return (
    <button className={`w-full rounded-md border px-3 py-2 text-left ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`} onClick={onSelect}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="text-sm font-semibold text-gray-900">{relationship.name}</p>
      <p className="text-xs text-gray-600">{relationship.firm}</p>
      <p className="text-xs text-gray-600">{relationship.email ?? "No email"}</p>
    </button>
  );
}

function MomentumChip({ score, trend }: { score: number; trend: Relationship["momentumTrend"] }) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
      {score} {trendIcon}
    </span>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-gray-500">{label}</p>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button className="text-sm text-gray-500" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
