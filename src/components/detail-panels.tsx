"use client";

import { useState } from "react";
import { Loop, Relationship, SchedulingRequest, Stall, Thread, TripPlan, createDraftFromLoop, createFollowUpFromStall, createSchedulingDraft, generateProposals } from "@/lib/mvp3-store";
import { TomoAiBadge } from "@/components/tomo-ai-badge";

type LoopDetailPanelProps = {
  loop: Loop | null | undefined;
  relationship?: Relationship | null;
  thread?: Thread | null;
  onUpdateLoop: (loop: Loop) => void;
  onOpenThread?: (threadId: string) => void;
  onOpenRelationship?: (relationshipId: string) => void;
  onUpdateRelationship?: (relationship: Relationship) => void;
  onToast?: (message: string) => void;
};

export function LoopDetailPanel({
  loop,
  relationship,
  thread,
  onUpdateLoop,
  onOpenThread,
  onOpenRelationship,
  onUpdateRelationship,
  onToast,
}: LoopDetailPanelProps) {
  const [lockDraft, setLockDraft] = useState(false);
  const [fixFieldsOpen, setFixFieldsOpen] = useState(false);
  const [draftEdits, setDraftEdits] = useState({ firm: relationship?.firm ?? "", role: relationship?.role ?? "", email: relationship?.email ?? "" });
  const [lockFields, setLockFields] = useState<Record<string, boolean>>({
    firm: relationship?.lockedFields?.firm ?? false,
    role: relationship?.lockedFields?.role ?? false,
    email: relationship?.lockedFields?.email ?? false,
  });
  const isDnc = relationship?.doNotContact;

  if (!loop) return <Placeholder title="Select a loop to view details." />;

  const handleGenerateDraft = () => {
    if (loop.suggestedDraft && lockDraft) return;
    const draft = createDraftFromLoop(loop, relationship ?? undefined);
    onUpdateLoop({ ...loop, suggestedDraft: draft, updatedAt: new Date().toISOString() });
    onToast?.("Draft generated.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Loop</p>
          <h2 className="text-lg font-semibold accent-title">{loop.title}</h2>
          {loop.dueAt ? <p className="text-sm text-gray-600">Due {new Date(loop.dueAt).toLocaleDateString()}</p> : null}
        </div>
        <StatusPill label={loop.status} tone={loop.status === "DONE" ? "success" : loop.status === "SNOOZED" ? "warn" : "info"} />
      </div>
      {isDnc ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Do not contact is enabled. Draft and send actions are disabled.
        </div>
      ) : null}

      <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
        <InfoField label="Assignee" value={loop.assignee} />
        <InfoField label="Priority" value={loop.priority} />
        {relationship ? (
          <button className="text-left rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300" onClick={() => onOpenRelationship?.(relationship.id)}>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Relationship</p>
            <p className="font-medium text-gray-900">{relationship.name}</p>
            <p className="text-xs text-gray-600">{relationship.firm}</p>
          </button>
        ) : null}
        {thread ? (
          <button className="text-left rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300" onClick={() => onOpenThread?.(thread.id)}>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Thread</p>
            <p className="font-medium text-gray-900">{thread.title}</p>
            <p className="text-xs text-gray-600">{thread.status.replace(/_/g, " ")}</p>
          </button>
        ) : null}
      </div>

      <EvidenceCard title="Why this loop exists" evidence={loop.evidence.map((e) => e.snippet)} />

      <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">Suggested follow-up</p>
            <TomoAiBadge label="Draft" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              checked={lockDraft}
              onChange={(e) => setLockDraft(e.target.checked)}
            />
            Lock this draft
          </label>
        </div>
        <textarea
          readOnly
          value={loop.suggestedDraft ?? "No draft generated yet."}
          className="min-h-[90px] w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="button-primary tomo-ai-bg" onClick={handleGenerateDraft} disabled={isDnc}>
          Generate Draft
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            if (!loop.suggestedDraft) return;
            navigator.clipboard.writeText(loop.suggestedDraft);
            onToast?.("Draft copied.");
          }}
          disabled={isDnc}
        >
          Copy
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            if (!loop.suggestedDraft) return;
            window.open(`mailto:${relationship?.email ?? ""}?subject=${encodeURIComponent(loop.title)}&body=${encodeURIComponent(loop.suggestedDraft)}`, "_blank");
            onToast?.("Email draft opened.");
          }}
          disabled={isDnc}
        >
          Open Email
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            onUpdateLoop({ ...loop, status: "WAITING", updatedAt: new Date().toISOString() });
            onToast?.("Marked as sent.");
          }}
          disabled={isDnc}
        >
          Mark Sent
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            onUpdateLoop({ ...loop, status: "SNOOZED", snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString(), updatedAt: new Date().toISOString() });
            onToast?.("Loop snoozed for 3 days.");
          }}
        >
          Snooze
        </button>
        <button
          className="button-primary"
          onClick={() => {
            onUpdateLoop({ ...loop, status: "DONE", updatedAt: new Date().toISOString() });
            onToast?.("Loop marked done.");
          }}
        >
          Mark Done
        </button>
      </div>

      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">Assign</p>
        <select
          value={loop.assignee}
          onChange={(e) => onUpdateLoop({ ...loop, assignee: e.target.value as Loop["assignee"], updatedAt: new Date().toISOString() })}
          className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
        >
          <option value="ME">ME</option>
          <option value="PARTNER">PARTNER</option>
          <option value="ANALYST">ANALYST</option>
        </select>
      </div>

      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">Feedback</p>
          <div className="flex items-center gap-2">
            <button className="rounded-full border border-gray-200 px-2 py-1 text-xs" onClick={() => onToast?.("Thanks for the feedback.")}>
              👍
            </button>
            <button className="rounded-full border border-gray-200 px-2 py-1 text-xs" onClick={() => setFixFieldsOpen((prev) => !prev)}>
              👎 Mark wrong
            </button>
          </div>
        </div>
        {fixFieldsOpen && relationship ? (
          <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-600">Fix fields and lock them for future drafts.</p>
            <FieldLockRow
              label="Organization"
              value={draftEdits.firm}
              locked={lockFields.firm}
              onToggle={(locked) => setLockFields((prev) => ({ ...prev, firm: locked }))}
              onChange={(value) => setDraftEdits((prev) => ({ ...prev, firm: value }))}
            />
            <FieldLockRow
              label="Role"
              value={draftEdits.role}
              locked={lockFields.role}
              onToggle={(locked) => setLockFields((prev) => ({ ...prev, role: locked }))}
              onChange={(value) => setDraftEdits((prev) => ({ ...prev, role: value }))}
            />
            <FieldLockRow
              label="Email"
              value={draftEdits.email}
              locked={lockFields.email}
              onToggle={(locked) => setLockFields((prev) => ({ ...prev, email: locked }))}
              onChange={(value) => setDraftEdits((prev) => ({ ...prev, email: value }))}
            />
            <button
              className="button-primary"
              onClick={() => {
                const updated: Relationship = {
                  ...relationship,
                  firm: draftEdits.firm || relationship.firm,
                  role: draftEdits.role || relationship.role,
                  email: draftEdits.email || relationship.email,
                  lockedFields: {
                    ...(relationship.lockedFields ?? {}),
                    firm: lockFields.firm,
                    role: lockFields.role,
                    email: lockFields.email,
                  },
                };
                onUpdateRelationship?.(updated);
                onToast?.("Fields updated and locked.");
                setFixFieldsOpen(false);
              }}
            >
              Fix & Lock fields
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ThreadDetailPanelProps = {
  thread: Thread | null | undefined;
  relationship?: Relationship | null;
  loops: Loop[];
  stall?: Stall | null;
  onCreateLoop: (title: string, threadId: string, contactId: string) => void;
  onOpenLoop?: (loopId: string) => void;
  onGenerateFollowUp?: (stallId: string) => void;
  onMarkSent?: (stallId: string) => void;
};

export function ThreadDetailPanel({
  thread,
  relationship,
  loops,
  stall,
  onCreateLoop,
  onOpenLoop,
  onGenerateFollowUp,
  onMarkSent,
}: ThreadDetailPanelProps) {
  if (!thread) return <Placeholder title="Select a thread to view details." />;
  const relatedLoops = loops.filter((loop) => loop.threadId === thread.id);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Thread</p>
          <h2 className="text-lg font-semibold accent-title">{thread.title}</h2>
          <p className="text-sm text-gray-600">{thread.channel === "OUTLOOK_EMAIL" ? "Outlook Email" : "Calendar"}</p>
        </div>
        <StatusPill label={thread.status.replace(/_/g, " ")} tone="info" />
      </div>

      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <InfoField label="Participants" value={thread.participants.join(", ")} />
        {relationship ? <InfoField label="Relationship" value={`${relationship.name} • ${relationship.firm}`} /> : null}
        {thread.lastMessageAt ? <InfoField label="Last activity" value={new Date(thread.lastMessageAt).toLocaleString()} /> : null}
        {thread.inferredNextStep ? <InfoField label="Next step" value={thread.inferredNextStep} /> : null}
      </div>

      <EvidenceCard title="Evidence" evidence={thread.evidence.map((e) => e.snippet)} />

      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">Related loops</p>
          <button className="button-secondary" onClick={() => onCreateLoop(thread.title, thread.id, thread.contactId)}>
            Create loop
          </button>
        </div>
        {relatedLoops.length ? (
          <div className="space-y-2">
            {relatedLoops.map((loop) => (
              <button
                key={loop.id}
                className="w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm hover:border-gray-200"
                onClick={() => onOpenLoop?.(loop.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{loop.title}</span>
                  <StatusPill label={loop.status} tone={loop.status === "DONE" ? "success" : "info"} />
                </div>
                <p className="text-xs text-gray-600">Assignee: {loop.assignee}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No loops linked to this thread yet.</p>
        )}
      </div>

      {stall ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Stall detected</p>
            <StatusPill label={stall.severity} tone="warn" />
          </div>
          <p className="text-sm">Reason: {stall.stallReason.replace(/_/g, " ")}</p>
          <ul className="text-sm list-disc pl-4">
            {stall.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {stall.suggestedFollowUpDraft ? (
            <div className="rounded-md border border-amber-100 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
              <p className="font-medium text-gray-900">Follow-up draft</p>
              <textarea readOnly value={stall.suggestedFollowUpDraft} className="min-h-[90px] w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800" />
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(stall.suggestedFollowUpDraft ?? "");
                  }}
                >
                  Copy
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    window.open(`mailto:${relationship?.email ?? ""}?subject=${encodeURIComponent(thread.title)}&body=${encodeURIComponent(stall.suggestedFollowUpDraft ?? "")}`, "_blank");
                  }}
                >
                  Open Email
                </button>
                <button className="button-secondary" onClick={() => onMarkSent?.(stall.id)}>
                  Mark Sent
                </button>
              </div>
              <p className="text-xs text-gray-500">Why: {stall.evidence[0] ?? "No evidence captured."}</p>
            </div>
          ) : (
            <button className="button-secondary" onClick={() => onGenerateFollowUp?.(stall.id)}>
              Generate follow-up
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

type PrepDetailPanelProps = {
  title: string;
  relationship?: Relationship | null;
  threads: Thread[];
  loops: Loop[];
  stalls: Stall[];
  checklist: { id: string; label: string; done: boolean }[];
  onToggleChecklist: (id: string) => void;
};

export function PrepDetailPanel({ title, relationship, threads, loops, stalls, checklist, onToggleChecklist }: PrepDetailPanelProps) {
  const recentThreads = threads.slice(0, 3);
  const openLoops = loops.filter((loop) => loop.status !== "DONE");
  const activeStalls = stalls.slice(0, 3);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Meeting brief</p>
        <h2 className="text-lg font-semibold accent-title">{title}</h2>
        {relationship ? <p className="text-sm text-gray-600">{relationship.name} • {relationship.firm}</p> : null}
      </div>

      <Section title="Recent threads">
        {recentThreads.length ? (
          <ul className="space-y-2 text-sm text-gray-800">
            {recentThreads.map((thread) => (
              <li key={thread.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="font-medium text-gray-900">{thread.title}</p>
                <p className="text-xs text-gray-600">{thread.evidence[0]?.snippet ?? "No summary yet."}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState label="No recent threads." />
        )}
      </Section>

      <Section title="Open loops">
        {openLoops.length ? (
          <ul className="space-y-2 text-sm text-gray-800">
            {openLoops.map((loop) => (
              <li key={loop.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="font-medium text-gray-900">{loop.title}</p>
                <p className="text-xs text-gray-600">{loop.evidence[0]?.snippet ?? "No evidence captured yet."}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState label="No open loops for this relationship." />
        )}
      </Section>

      <Section title="Stalls">
        {activeStalls.length ? (
          <ul className="space-y-2 text-sm text-gray-800">
            {activeStalls.map((stall) => (
              <li key={stall.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="font-medium text-amber-900">{stall.stallReason.replace(/_/g, " ")}</p>
                <p className="text-xs text-amber-800">{stall.evidence[0] ?? "No evidence snippet yet."}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState label="No stalls detected." />
        )}
      </Section>

      <Section title="Structured summary">
        <StructuredSummary
          title="Context"
          body="Conversation is active with a clear allocation narrative. Keep the next step concise."
          evidence={recentThreads[0]?.evidence.map((e) => e.snippet) ?? []}
        />
        <StructuredSummary
          title="Key facts"
          body="Performance update sent. Allocation review pending."
          evidence={openLoops[0]?.evidence.map((e) => e.snippet) ?? []}
        />
        <StructuredSummary
          title="Risks"
          body="Scheduling drift if a date is not confirmed this week."
          evidence={activeStalls[0]?.evidence ?? []}
        />
        <StructuredSummary
          title="Next ask"
          body="Confirm a 30m review window and align on deliverables."
          evidence={openLoops[0]?.evidence.map((e) => e.snippet) ?? []}
        />
        <StructuredSummary
          title="Talking points"
          body="Pipeline momentum, timing for capital call, any remaining diligence."
          evidence={recentThreads[1]?.evidence.map((e) => e.snippet) ?? []}
        />
      </Section>

      <Section title="Checklist">
        <div className="space-y-2 text-sm">
          {checklist.map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-md border border-gray-100 px-3 py-2">
              <input type="checkbox" checked={item.done} onChange={() => onToggleChecklist(item.id)} className="h-4 w-4 rounded border-gray-300" />
              <span className={item.done ? "line-through text-gray-500" : "text-gray-700"}>{item.label}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

type SchedulingDetailPanelProps = {
  request: SchedulingRequest | null | undefined;
  relationship?: Relationship | null;
  assistant?: Relationship | null;
  defaultTimezone?: string;
  defaultWorkHours?: { start: string; end: string };
  onUpdateRequest: (req: SchedulingRequest) => void;
  onToast?: (message: string) => void;
};

export function SchedulingDetailPanel({
  request,
  relationship,
  assistant,
  defaultTimezone,
  defaultWorkHours,
  onUpdateRequest,
  onToast,
}: SchedulingDetailPanelProps) {
  if (!request) return <Placeholder title="Select a scheduling request to view details." />;
  const timezones = Array.from(new Set(request.participants.map((p) => p.timezone).filter(Boolean)));
  const draft = createSchedulingDraft(request, relationship ?? undefined, request.coordinator === "ASSISTANT" ? assistant ?? undefined : undefined);
  const fallbackTimezone = relationship?.timezone ?? defaultTimezone ?? "America/New_York";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Scheduling</p>
          <h2 className="text-lg font-semibold accent-title">{request.title}</h2>
          <p className="text-sm text-gray-600">{request.status.replace(/_/g, " ")}</p>
        </div>
        <StatusPill label={request.status} tone="info" />
      </div>

      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">Participants</p>
        <div className="flex flex-wrap gap-2">
          {request.participants.map((p) => (
            <span key={p.name} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
              {p.name} {p.timezone ? `• ${p.timezone}` : ""}
            </span>
          ))}
        </div>
        <InfoField label="Duration" value={`${request.durationMinutes} minutes`} />
        <InfoField label="Time window" value={`${new Date(request.timeWindow.startDate).toLocaleDateString()} → ${new Date(request.timeWindow.endDate).toLocaleDateString()}`} />
        <InfoField label="Constraints" value={`Avoid weekends: ${request.constraints.avoidWeekends ? "Yes" : "No"} · Buffer ${request.constraints.bufferMinutes}m`} />
      </div>

      {timezones.length > 1 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Timezone sanity check: participants span {timezones.join(" / ")}. Confirm local time equivalents before sending.
        </div>
      ) : null}

      <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">Proposals</p>
          <button
            className="button-primary tomo-ai-bg"
            onClick={() => {
              const proposals = generateProposals(request, fallbackTimezone, defaultWorkHours);
              onUpdateRequest({ ...request, proposals, status: "PROPOSED" });
              onToast?.("Proposals generated.");
            }}
          >
            Generate proposed times
          </button>
        </div>
        {request.proposals.length ? (
          <div className="space-y-2">
            {request.proposals.map((proposal) => (
              <label key={proposal.id} className="flex items-start justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(proposal.startAt).toLocaleString()} - {new Date(proposal.endAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-600">{proposal.rationale}</p>
                </div>
                <input
                  type="radio"
                  name="proposal"
                  checked={request.chosenProposalId === proposal.id}
                  onChange={() => onUpdateRequest({ ...request, chosenProposalId: proposal.id, status: "PROPOSED" })}
                />
              </label>
            ))}
          </div>
        ) : (
          <EmptyState label="No proposals generated yet." />
        )}
      </div>

      {assistant ? (
        <button
          className="button-secondary"
          onClick={() => {
            onUpdateRequest({ ...request, coordinator: "ASSISTANT" });
            onToast?.("Routing via assistant.");
          }}
        >
          Route via assistant
        </button>
      ) : null}

      <div className="rounded-md border tomo-ai-border bg-white px-3 py-2 text-sm text-gray-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">Scheduling draft</p>
            <TomoAiBadge label="Draft" />
          </div>
        </div>
        <textarea readOnly value={draft} className="min-h-[90px] w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800" />
        <p className="text-xs text-gray-500">
          Why: time window {new Date(request.timeWindow.startDate).toLocaleDateString()} - {new Date(request.timeWindow.endDate).toLocaleDateString()} with buffer {request.constraints.bufferMinutes}m.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="button-secondary"
          onClick={() => {
            navigator.clipboard.writeText(draft);
            onToast?.("Draft copied.");
          }}
        >
          Copy scheduling email
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            window.open(`mailto:${relationship?.email ?? ""}?subject=${encodeURIComponent(request.title)}&body=${encodeURIComponent(draft)}`, "_blank");
            onToast?.("Email draft opened.");
          }}
        >
          Open Email
        </button>
        <button
          className="button-secondary"
          onClick={() => {
            onUpdateRequest({ ...request, status: "SENT" });
            onToast?.("Marked as sent.");
          }}
        >
          Mark Sent
        </button>
        <button
          className="button-primary"
          onClick={() => {
            onUpdateRequest({ ...request, status: "CONFIRMED" });
            onToast?.("Marked as confirmed.");
          }}
        >
          Mark Confirmed
        </button>
        <button className="button-secondary" onClick={() => onToast?.("Calendar invite placeholder created.")}>
          Create calendar invite
        </button>
      </div>
    </div>
  );
}

type TripDetailPanelProps = {
  trip: TripPlan | null | undefined;
  relationships: Relationship[];
  onUpdateTrip: (trip: TripPlan) => void;
  onCreateRequests: (contactIds: string[]) => void;
};

export function TripDetailPanel({ trip, relationships, onUpdateTrip, onCreateRequests }: TripDetailPanelProps) {
  if (!trip) return <Placeholder title="Select a trip plan to view details." />;
  const targets = relationships.filter((rel) => trip.targetContactIds.includes(rel.id));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Trip plan</p>
          <h2 className="text-lg font-semibold accent-title">{trip.name}</h2>
          <p className="text-sm text-gray-600">
            {trip.city} • {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>
        <StatusPill label={trip.status ?? "Not started"} tone="info" />
      </div>

      <Section title="Targets">
        {targets.length ? (
          <ul className="space-y-2 text-sm text-gray-800">
            {targets.map((rel) => (
              <li key={rel.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="font-medium text-gray-900">{rel.name}</p>
                <p className="text-xs text-gray-600">{rel.firm}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState label="No target contacts yet." />
        )}
      </Section>

      <Section title="Suggested meeting blocks">
        <div className="grid gap-2 sm:grid-cols-2">
          {["AM block", "PM block"].map((slot) => (
            <div key={slot} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{slot}</p>
              <p className="text-xs text-gray-600">Hold 2-3 meetings, stack travel buffers.</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2">
        <button className="button-primary" onClick={() => onCreateRequests(trip.targetContactIds)}>
          Create scheduling requests
        </button>
        <button className="button-secondary" onClick={() => onUpdateTrip({ ...trip, status: "In progress" })}>
          Mark in progress
        </button>
        <button className="button-secondary" onClick={() => onUpdateTrip({ ...trip, status: "Scheduled" })}>
          Mark scheduled
        </button>
      </div>
    </div>
  );
}

function EvidenceCard({ title, evidence }: { title: string; evidence: string[] }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
      <p className="font-medium text-gray-900">{title}</p>
      <ul className="mt-1 space-y-1">
        {evidence.length ? (
          evidence.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-xs text-gray-500">No evidence captured yet.</li>
        )}
      </ul>
    </div>
  );
}

function StructuredSummary({ title, body, evidence }: { title: string; body: string; evidence: string[] }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-700">{body}</p>
      {evidence.length ? <p className="text-xs text-gray-500 mt-1">Why: {evidence[0]}</p> : null}
    </div>
  );
}

function FieldLockRow({
  label,
  value,
  locked,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  locked: boolean;
  onToggle: (locked: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-center">
      <div>
        <label className="text-[11px] uppercase tracking-wide text-gray-500">{label}</label>
        <input className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={locked} onChange={(e) => onToggle(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />
        Lock
      </label>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold accent-title">{title}</p>
      {children}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-gray-500">{label}</p>;
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

function StatusPill({ label, tone }: { label: string; tone: "info" | "warn" | "success" }) {
  const toneClass =
    tone === "success"
      ? "bg-green-50 text-green-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>{label}</span>;
}
