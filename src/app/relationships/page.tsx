"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bars3Icon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { TomoAiBadge } from "@/components/tomo-ai-badge";
import { relationships, Relationship } from "@/lib/mockData";
import type { MomentumTrend } from "@/lib/mockData";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/storage";

const BAND_OPTIONS = ["All", "Heating Up", "Active-Stable", "Cooling", "Stalled"] as const;
const MOMENTUM_OPTIONS = ["All", "Up", "Flat", "Down"] as const;
const VELOCITY_OPTIONS = ["All", "Fast", "Moderate", "Slow"] as const;

type FilterState = {
  query: string;
  band: (typeof BAND_OPTIONS)[number];
  momentumTrend: (typeof MOMENTUM_OPTIONS)[number];
  velocity: (typeof VELOCITY_OPTIONS)[number];
  hasOpenLoops: boolean | "all";
};

const DEFAULT_FILTERS: FilterState = {
  query: "",
  band: "All",
  momentumTrend: "All",
  velocity: "All",
  hasOpenLoops: "all",
};

export default function RelationshipsPage() {
  const { ready } = useRequireSession();
  const [filters, setFilters] = usePersistentState<FilterState>("tomo-relationships-filters", DEFAULT_FILTERS);
  const [activeId, setActiveId] = useState<string | null>(() => relationships[0]?.id ?? null);

  // Top/bottom split ratio (20% filter header / 80% content default)
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-relationships-split-ratio", 20);
  const [viewMode, setViewMode] = usePersistentState<"card" | "list">("tomo-relationships-view-mode", "list");
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggingSplit) return;
    const handleMove = (e: MouseEvent) => {
      const el = splitContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(80, Math.max(20, newRatio));
      setSplitRatio(clamped);
    };
    const stop = () => setDraggingSplit(false);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [draggingSplit, setSplitRatio]);

  const [tomoPrompt, setTomoPrompt] = useState("");

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  /** Parse natural language and apply to filters (Option A: client-side heuristic) */
  const applyTomoPrompt = () => {
    const text = tomoPrompt.trim().toLowerCase();
    if (!text) return;
    setTomoPrompt("");
    const updates: Partial<FilterState> = {};
    // Band
    if (/\b(cooling|cool)\b/.test(text)) updates.band = "Cooling";
    else if (/\b(heating|heat(?:ing)?\s*up)\b/.test(text)) updates.band = "Heating Up";
    else if (/\b(stalled|stall)\b/.test(text)) updates.band = "Stalled";
    else if (/\b(active[- ]?stable|stable|active)\b/.test(text)) updates.band = "Active-Stable";
    // Momentum trend
    if (/\b(high\s+momentum|momentum\s+up|heating\s+up)\b/.test(text)) updates.momentumTrend = "Up";
    else if (/\b(low\s+momentum|momentum\s+down|cooling)\b/.test(text)) updates.momentumTrend = "Down";
    else if (/\b(flat|steady|stable\s+momentum)\b/.test(text)) updates.momentumTrend = "Flat";
    else if (/\b(up|rising)\b/.test(text) && !updates.momentumTrend) updates.momentumTrend = "Up";
    else if (/\b(down|falling)\b/.test(text) && !updates.momentumTrend) updates.momentumTrend = "Down";
    // Velocity
    if (/\b(fast|quick)\b/.test(text)) updates.velocity = "Fast";
    else if (/\b(slow)\b/.test(text)) updates.velocity = "Slow";
    else if (/\b(moderate|medium)\b/.test(text)) updates.velocity = "Moderate";
    // Open loops
    if (/\b(open\s+loops?|with\s+loops?|has\s+loops?|loops?\s+open)\b/.test(text)) updates.hasOpenLoops = true;
    // Reset
    if (/\b(clear|reset|show\s+all)\b/.test(text)) {
      setFilters(DEFAULT_FILTERS);
      return;
    }
    if (Object.keys(updates).length > 0) {
      setFilters((prev) => ({ ...prev, ...updates }));
    }
  };

  const filtered = useMemo(() => {
    return relationships.filter((rel) => {
      const matchesQuery =
        !filters.query.trim() ||
        rel.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        rel.firm.toLowerCase().includes(filters.query.toLowerCase());
      const matchesBand = filters.band === "All" || rel.band === filters.band;
      const matchesMomentum =
        filters.momentumTrend === "All" ||
        rel.momentumTrend === (filters.momentumTrend.toLowerCase() as MomentumTrend);
      const matchesVelocity =
        filters.velocity === "All" || rel.velocity === filters.velocity;
      const matchesOpenLoops =
        filters.hasOpenLoops === "all" ||
        (filters.hasOpenLoops === true && rel.openLoops > 0) ||
        (filters.hasOpenLoops === false && rel.openLoops === 0);
      return matchesQuery && matchesBand && matchesMomentum && matchesVelocity && matchesOpenLoops;
    });
  }, [filters]);
  const active = useMemo(() => relationships.find((r) => r.id === activeId) ?? null, [activeId]);

  const listContent = (
    <div ref={splitContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top: Filter header */}
      <div
        className="flex min-h-[80px] shrink-0 flex-col overflow-auto border-b border-gray-200 bg-white px-4 py-3"
        style={{ flex: `${splitRatio} 1 0` }}
      >
        <p className="text-xs uppercase tracking-wide text-gray-500">Relationships</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex w-full min-w-[200px] flex-1 items-center gap-2 rounded-md border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 px-3 py-2 sm:max-w-[320px]">
            <span className="text-[color:var(--accent)]" aria-hidden>✦</span>
            <input
              value={tomoPrompt}
              onChange={(e) => setTomoPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyTomoPrompt()}
              placeholder="Ask Tomo to filter: e.g. 'show cooling relationships' or 'high momentum LPs'"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
              aria-label="Natural language filter prompt"
            />
            <button
              type="button"
              onClick={applyTomoPrompt}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent)]/10"
            >
              Apply
            </button>
          </div>
          <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 sm:max-w-[200px]">
            <input
              value={filters.query}
              onChange={(e) => updateFilter("query", e.target.value)}
              placeholder="Search name, firm"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
            />
          </div>
          <select
            value={filters.band}
            onChange={(e) => updateFilter("band", e.target.value as FilterState["band"])}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
          >
            {BAND_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {MOMENTUM_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  updateFilter("momentumTrend", filters.momentumTrend === opt ? "All" : opt)
                }
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  filters.momentumTrend === opt
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <select
            value={filters.velocity}
            onChange={(e) => updateFilter("velocity", e.target.value as FilterState["velocity"])}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
          >
            {VELOCITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={filters.hasOpenLoops === true}
              onChange={(e) => updateFilter("hasOpenLoops", e.target.checked ? true : "all")}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            Open loops
          </label>
        </div>
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-label="Resize filter and content sections"
        className={`flex shrink-0 cursor-row-resize items-center justify-center py-1 hover:bg-gray-50 ${draggingSplit ? "bg-gray-50" : ""}`}
        onMouseDown={() => setDraggingSplit(true)}
      >
        <div className="h-1 w-12 rounded-full bg-gray-200" />
      </div>

      {/* Bottom: Content area */}
      <div
        className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3"
        style={{ flex: `${100 - splitRatio} 1 0` }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtered.length} relationship{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition ${
                viewMode === "list"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <Bars3Icon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`rounded p-1.5 transition ${
                viewMode === "card"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label="Card view"
              aria-pressed={viewMode === "card"}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {viewMode === "list" ? (
            <div className="space-y-2">
              {filtered.map((rel) => (
                <RelationshipListItem
                  key={rel.id}
                  rel={rel}
                  isActive={activeId === rel.id}
                  onSelect={() => setActiveId(rel.id)}
                />
              ))}
              {!filtered.length ? <Placeholder title="No relationships match." /> : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-2 md:grid-cols-3">
              {filtered.map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  rel={rel}
                  isActive={activeId === rel.id}
                  onSelect={() => setActiveId(rel.id)}
                />
              ))}
              {!filtered.length ? <Placeholder title="No relationships match." /> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Detail column hidden; drawer will be used in Phase 5
  const detailContent = <div className="h-full" aria-hidden="true" />;

  if (!ready) return null;

  return (
    <AppShell
      section="relationships"
      listContent={listContent}
      detailContent={detailContent}
      detailVisible={false}
      contextTitle={active?.name}
      assistantChips={["Summarize last thread", "Draft outreach", "Propose next step", "Create action"]}
    />
  );
}

function RelationshipListItem({
  rel,
  isActive,
  onSelect,
}: {
  rel: Relationship;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-2 text-left transition ${
        isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold accent-title">{rel.name}</p>
          <p className="text-xs text-gray-600">{rel.firm}</p>
        </div>
        <div className="flex items-center gap-2">
          <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} />
          {rel.openLoops ? (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
              {rel.openLoops} emails
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-gray-600">Last: {rel.lastInteraction}</p>
      <p className="text-xs text-gray-600">Next move: {rel.nextMove}</p>
    </button>
  );
}

function RelationshipCard({
  rel,
  isActive,
  onSelect,
}: {
  rel: Relationship;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col rounded-md border px-3 py-3 text-left transition ${
        isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold accent-title">{rel.name}</p>
          <p className="truncate text-xs text-gray-600">{rel.firm}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} />
          {rel.openLoops ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
              {rel.openLoops}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-gray-600">Last: {rel.lastInteraction}</p>
      <p className="line-clamp-1 text-xs text-gray-600">Next: {rel.nextMove}</p>
    </button>
  );
}

function RelationshipDetail({ relationship }: { relationship: Relationship }) {
  const router = useRouter();

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

  const stallRisk =
    relationship.band === "Stalled" || relationship.momentumTrend === "down"
      ? "High"
      : relationship.momentumTrend === "flat"
        ? "Medium"
        : "Low";
  const openLoopItems = [
    "Confirm timing for the next allocation step",
    "Close the loop on the latest performance send",
    "Re-affirm interest level before quarter-end",
  ].slice(0, 3);

  const keyChanges = [
    "Momentum softened after no reply to last update.",
    "Recent deck opens suggest renewed interest.",
    "Meeting request sent; awaiting confirmation.",
  ];

  const materialsEngagement = "Mixed engagement; recent deck opens nudged momentum slightly up.";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Relationship</p>
          <h2 className="text-lg font-semibold accent-title">{relationship.name}</h2>
          <p className="text-sm text-gray-600">{relationship.firm}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MomentumChip score={relationship.momentumScore} trend={relationship.momentumTrend} />
          <span className="text-xs text-gray-600">{relationship.band}</span>
        </div>
      </div>

      {/* Section 1 — Current Snapshot */}
      <section className="rounded-md border tomo-ai-border bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold accent-title">Current snapshot</p>
          <TomoAiBadge label="Tomo insight" />
        </div>
        <p className="mt-1 text-sm tomo-ai-text">{snapshot}</p>
      </section>

      {/* Section 2 — Relationship Status */}
      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-sm font-semibold accent-title">Relationship status</p>
        <div className="mt-2 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
          <StatusField label="Momentum" value={`${relationship.momentumScore} ${relationship.momentumTrend === "up" ? "↑" : relationship.momentumTrend === "down" ? "↓" : "→"}`} />
          <StatusField label="Pace" value={relationship.velocity} />
          <StatusField label="Stall risk" value={stallRisk} />
          <StatusField label="Next move" value={relationship.nextMove} />
        </div>
      </section>

      {/* Section 3 — Open Emails */}
      <section className="rounded-md border tomo-ai-border bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold accent-title">Open Emails</p>
        </div>
        <div className="mt-1">
          <TomoAiBadge label="Tomo suggestions" />
        </div>
        <ul className="mt-2 space-y-1 text-sm tomo-ai-text">
          {openLoopItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full tomo-ai-bg" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 4 — Key Changes Over Time */}
      <Accordion title="KEY CHANGES OVER TIME">
        <div className="mb-2">
          <TomoAiBadge label="Tomo insight" />
        </div>
        <ul className="space-y-1 text-sm tomo-ai-text">
          {keyChanges.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-amber-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Accordion>

      {/* Section 6 — Engagement with Materials */}
      <Accordion title="Engagement with Materials">
        <div className="mb-2">
          <TomoAiBadge label="Tomo insight" />
        </div>
        <div className="text-sm tomo-ai-text">{materialsEngagement}</div>
        <button className="mt-2 text-sm text-blue-700 hover:underline" onClick={() => router.push(`/materials?lp=${encodeURIComponent(relationship.name)}`)}>
          View details
        </button>
      </Accordion>

      {/* Section 7 — Recent Activity */}
      <MockRecentActivityBox />
    </div>
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

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function Accordion({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-900" onClick={() => setOpen((v) => !v)}>
        <div>
          <p>{title}</p>
          {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        </div>
        <span className="text-xs text-gray-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="border-t border-gray-100 px-3 py-2">{children}</div> : null}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

function MockRecentActivityBox() {
  const items = [
    { ts: "Yesterday 3:20 PM", type: "Call", note: "Reviewed allocation timeline and updated next steps." },
    { ts: "Tue 11:00 AM", type: "Meeting", note: "Walked through Q4 performance; asked for follow-up." },
    { ts: "Mon 9:05 AM", type: "Email", note: "Sent performance snapshot + availability options." },
  ];
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Recent activity</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={`${item.ts}-${item.type}`} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-900">{item.type}</p>
              <p className="text-xs text-gray-600">{item.note}</p>
            </div>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.ts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
