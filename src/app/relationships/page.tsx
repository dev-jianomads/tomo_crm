"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bars3Icon, ChevronDownIcon, ChevronUpIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { ContextDrawer } from "@/components/context-drawer";
import { DrawerSection2TomoChat } from "@/components/drawer-section-2-tomo-chat";
import { TomoAiBadge } from "@/components/tomo-ai-badge";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
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

type SortColumn = "name" | "firm" | "momentum" | "last" | "next" | "emails";
type SortDirection = "asc" | "desc";

const TABLE_COLUMNS: { key: SortColumn; label: string; highlight?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "firm", label: "Firm" },
  { key: "momentum", label: "Momentum", highlight: true },
  { key: "last", label: "Last" },
  { key: "next", label: "Next move" },
  { key: "emails", label: "Emails", highlight: true },
];

const DEFAULT_COLUMN_WIDTHS: Record<SortColumn, number> = {
  name: 140,
  firm: 120,
  momentum: 100,
  last: 130,
  next: 200,
  emails: 90,
};

const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 400;

/** Parse "Xd ago" from lastInteraction for sort order (lower = more recent) */
function parseDaysAgo(s: string): number {
  const m = s.match(/(\d+)\s*d/);
  return m ? parseInt(m[1], 10) : 999;
}

export default function RelationshipsPage() {
  const { ready } = useRequireSession();
  const [filters, setFilters] = usePersistentState<FilterState>("tomo-relationships-filters", DEFAULT_FILTERS);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Top/bottom split ratio (20% filter header / 80% content default)
  const [splitRatio, setSplitRatio] = usePersistentState<number>("tomo-relationships-split-ratio", 20);
  const [viewMode, setViewMode] = usePersistentState<"card" | "list">("tomo-relationships-view-mode", "list");
  const [sortColumn, setSortColumn] = usePersistentState<SortColumn>("tomo-relationships-sort-column", "momentum");
  const [sortDirection, setSortDirection] = usePersistentState<SortDirection>("tomo-relationships-sort-direction", "desc");
  const [columnWidths, setColumnWidths] = usePersistentState<Record<SortColumn, number>>(
    "tomo-relationships-column-widths",
    DEFAULT_COLUMN_WIDTHS
  );
  const [resizingColumn, setResizingColumn] = useState<SortColumn | null>(null);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
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
  }, [draggingSplit]);

  useEffect(() => {
    if (!resizingColumn) return;
    const handleMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const delta = e.clientX - start.x;
      const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, start.width + delta));
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }));
    };
    const stop = () => {
      setResizingColumn(null);
      resizeStartRef.current = null;
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [resizingColumn]);

  const handleResizeStart = (col: SortColumn, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(col);
    resizeStartRef.current = { x: e.clientX, width: columnWidths[col] };
  };

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

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(col === "momentum" || col === "last" || col === "emails" ? "desc" : "asc");
    }
  };

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    const mult = sortDirection === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "firm":
          cmp = a.firm.localeCompare(b.firm);
          break;
        case "momentum":
          cmp = a.momentumScore - b.momentumScore;
          break;
        case "last":
          cmp = parseDaysAgo(a.lastInteraction) - parseDaysAgo(b.lastInteraction);
          break;
        case "next":
          cmp = a.nextMove.localeCompare(b.nextMove);
          break;
        case "emails":
          cmp = a.openLoops - b.openLoops;
          break;
      }
      return mult * cmp;
    });
    return arr;
  }, [filtered, sortColumn, sortDirection]);

  const active = useMemo(() => relationships.find((r) => r.id === activeId) ?? null, [activeId]);

  const activityLogEntries = useMemo(() => {
    if (!activeId) return [];
    return [
      { id: "1", ts: "Yesterday 3:20 PM", actor: "User" as const, summary: "Call — Reviewed allocation timeline and updated next steps." },
      { id: "2", ts: "Tue 11:00 AM", actor: "User" as const, summary: "Meeting — Walked through Q4 performance; asked for follow-up." },
      { id: "3", ts: "Mon 9:05 AM", actor: "User" as const, summary: "Email — Sent performance snapshot + availability options." },
    ];
  }, [activeId]);

  const drawerSelection = useMemo(
    () => (activeId ? { type: "relationship" as const, id: activeId } : undefined),
    [activeId]
  );

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
            <div className="overflow-x-auto overflow-y-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
                <colgroup>
                  {TABLE_COLUMNS.map((col) => (
                    <col key={col.key} style={{ width: columnWidths[col.key] }} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-gray-200">
                    {TABLE_COLUMNS.map((col) => (
                      <SortableTh
                        key={col.key}
                        columnKey={col.key}
                        label={col.label}
                        active={sortColumn === col.key}
                        direction={sortDirection}
                        onClick={() => handleSort(col.key)}
                        highlight={col.highlight}
                        onResizeStart={(e) => handleResizeStart(col.key, e)}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((rel) => (
                    <RelationshipTableRow
                      key={rel.id}
                      rel={rel}
                      isActive={activeId === rel.id}
                      onSelect={() => setActiveId(rel.id)}
                    />
                  ))}
                </tbody>
              </table>
              {!sortedFiltered.length ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">No relationships match.</div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-2 md:grid-cols-3">
              {sortedFiltered.map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  rel={rel}
                  isActive={activeId === rel.id}
                  onSelect={() => setActiveId(rel.id)}
                />
              ))}
              {!sortedFiltered.length ? <Placeholder title="No relationships match." /> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Detail column hidden; drawer used for selection
  const detailContent = <div className="h-full" aria-hidden="true" />;

  if (!ready) return null;

  return (
    <>
      <AppShell
        section="relationships"
        listContent={listContent}
        detailContent={detailContent}
        detailVisible={false}
        contextTitle={active?.name}
        assistantChips={["Summarize last thread", "Draft outreach", "Propose next step", "Create action"]}
      />
      <ContextDrawer
        open={Boolean(activeId)}
        onClose={() => setActiveId(null)}
        title={active?.name ?? "Relationship"}
        section1Content={
          active ? (
            <RelationshipDetail relationship={active} />
          ) : (
            <div className="text-sm text-gray-500">Select a relationship</div>
          )
        }
        section2Content={
          activeId ? (
            <DrawerSection2TomoChat
              initialMessage={getTomoAssistance(activeId)?.initialMessage}
              suggestions={getTomoAssistance(activeId)?.suggestedPrompts ?? ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"]}
              entityKey={activeId}
              selection={drawerSelection}
              assistanceContext={getTomoAssistance(activeId)}
            />
          ) : undefined
        }
        section3Entries={activityLogEntries}
      />
    </>
  );
}

function SortableTh({
  columnKey,
  label,
  active,
  direction,
  onClick,
  highlight,
  onResizeStart,
}: {
  columnKey: SortColumn;
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  highlight?: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const Icon = direction === "asc" ? ChevronUpIcon : ChevronDownIcon;
  return (
    <th className="relative min-w-0 px-3 py-2.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1 font-medium transition hover:text-gray-900 ${
          active ? "text-gray-900" : "text-gray-600"
        } ${highlight ? "text-[color:var(--accent)]" : ""}`}
      >
        <span className="truncate">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-40"}`} aria-hidden />
      </button>
      <div
        role="separator"
        aria-label={`Resize ${label} column`}
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-blue-200/50 active:bg-blue-300/50"
        style={{ marginRight: -3 }}
      />
    </th>
  );
}

function RelationshipTableRow({
  rel,
  isActive,
  onSelect,
}: {
  rel: Relationship;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`cursor-pointer border-b border-gray-100 transition last:border-b-0 ${
        isActive ? "border-l-4 border-l-blue-500 bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <td className="max-w-0 truncate px-3 py-2.5 font-semibold accent-title" title={rel.name}>{rel.name}</td>
      <td className="max-w-0 truncate px-3 py-2.5 text-gray-600" title={rel.firm}>{rel.firm}</td>
      <td className="px-3 py-2.5">
        <MomentumChip score={rel.momentumScore} trend={rel.momentumTrend} prominent />
      </td>
      <td className="max-w-0 truncate px-3 py-2.5 text-gray-600" title={rel.lastInteraction}>{rel.lastInteraction}</td>
      <td className="max-w-0 truncate px-3 py-2.5 text-gray-600" title={rel.nextMove}>{rel.nextMove}</td>
      <td className="px-3 py-2.5">
        {rel.openLoops > 0 ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
            {rel.openLoops} emails
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
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
  const stallRisk =
    relationship.band === "Stalled" || relationship.momentumTrend === "down"
      ? "High"
      : relationship.momentumTrend === "flat"
        ? "Medium"
        : "Low";

  return (
    <div className="space-y-2">
      {/* Firm + status only — name is in drawer header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{relationship.firm}</p>
        <div className="flex items-center gap-2">
          <MomentumChip score={relationship.momentumScore} trend={relationship.momentumTrend} />
          <span className="text-xs text-gray-500">{relationship.band}</span>
        </div>
      </div>

      {/* Relationship status — CRM facts only */}
      <section className="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Relationship status</p>
        <div className="mt-1.5 grid gap-1.5 text-xs text-gray-800 sm:grid-cols-2">
          <StatusField label="Momentum" value={`${relationship.momentumScore} ${relationship.momentumTrend === "up" ? "↑" : relationship.momentumTrend === "down" ? "↓" : "→"}`} />
          <StatusField label="Pace" value={relationship.velocity} />
          <StatusField label="Stall risk" value={stallRisk} />
          <StatusField label="Next move" value={relationship.nextMove} />
        </div>
      </section>

      {/* Recent Activity — accordion collapsed by default */}
      <Accordion title="RECENT ACTIVITY">
        <MockRecentActivityBoxContent />
      </Accordion>
    </div>
  );
}

function MomentumChip({
  score,
  trend,
  prominent,
}: {
  score: number;
  trend: Relationship["momentumTrend"];
  prominent?: boolean;
}) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendStyles =
    trend === "up"
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60"
      : trend === "down"
        ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/60"
        : "bg-amber-100 text-amber-800 ring-1 ring-amber-200/60";
  const sizeClass = prominent ? "px-3 py-1.5 text-xs font-semibold" : "px-2.5 py-1 text-[11px] font-medium";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full ${trendStyles} ${sizeClass}`}>
      <span>{score}</span>
      <span className="font-bold" aria-label={`Trend: ${trend}`}>
        {trendIcon}
      </span>
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

const RECENT_ACTIVITY_ITEMS = [
  { ts: "Yesterday 3:20 PM", type: "Call", note: "Reviewed allocation timeline and updated next steps." },
  { ts: "Tue 11:00 AM", type: "Meeting", note: "Walked through Q4 performance; asked for follow-up." },
  { ts: "Mon 9:05 AM", type: "Email", note: "Sent performance snapshot + availability options." },
];

function MockRecentActivityBoxContent() {
  return (
    <div className="space-y-2">
      {RECENT_ACTIVITY_ITEMS.map((item) => (
        <div key={`${item.ts}-${item.type}`} className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-900">{item.type}</p>
            <p className="text-xs text-gray-600">{item.note}</p>
          </div>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.ts}</span>
        </div>
      ))}
    </div>
  );
}
