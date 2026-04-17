"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpTrayIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { DrawerSection2TomoChat } from "@/components/drawer-section-2-tomo-chat";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
import { Relationship, formatDaysSinceContact, STAGE_OPTIONS } from "@/lib/mockData";
import { useRelationships } from "@/components/relationships-provider";
import type { MomentumDirection, Stage } from "@/lib/mockData";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import { FIELD_TO_REL_KEY, normalizeFieldValue } from "@/lib/crmFieldSchema";
import { RelationshipsFilterChat } from "@/components/relationships-filter-chat";
import { RelationshipsKanbanBoard } from "@/components/relationships-kanban-board";
import { NewContactModal } from "@/components/new-contact-modal";
import { AttachDocumentModal } from "@/components/attach-document-modal";
import { buildMockRelationshipFromCsvImport } from "@/lib/buildManualRelationship";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/usePersistentState";
import { useFunds } from "@/components/fund-provider";
import { usePipelines } from "@/lib/use-pipelines";
import { toast } from "sonner";

type SortColumn =
  | "name"
  | "firm"
  | "days"
  | "momentum"
  | "band"
  | "stage"
  | "tier"
  | "nextMove"
  | "openLoops"
  | "owner"
  | "investorType"
  | "strategyFit"
  | "strategyType"
  | "lpLocation"
  | "investmentRemit"
  | "typicalCheckSize"
  | "fundSizePreference"
  | "source"
  | "lastFundHistory"
  | "decisionTimeline"
  | "fiscalYearEnd"
  | "consultantDependent"
  | "esgRequired";
type SortDirection = "asc" | "desc";

type RelationshipsViewMode = "list" | "card" | "kanban";

/** Primary columns (left) → secondary (scroll right) */
const TABLE_COLUMNS: { key: SortColumn; label: string; highlight?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "firm", label: "Firm" },
  { key: "days", label: "Days", highlight: true },
  { key: "momentum", label: "Signal", highlight: true },
  { key: "band", label: "Band" },
  { key: "stage", label: "Stage" },
  { key: "tier", label: "Tier" },
  { key: "nextMove", label: "Next move" },
  { key: "openLoops", label: "Open loops", highlight: true },
  { key: "owner", label: "Owner" },
  { key: "investorType", label: "Investor type" },
  { key: "strategyFit", label: "Strategy fit" },
  { key: "strategyType", label: "Strategy type" },
  { key: "lpLocation", label: "Location" },
  { key: "investmentRemit", label: "Investment remit" },
  { key: "typicalCheckSize", label: "Typical check" },
  { key: "fundSizePreference", label: "Fund size pref" },
  { key: "source", label: "Source" },
  { key: "lastFundHistory", label: "Last fund" },
  { key: "decisionTimeline", label: "Decision timeline" },
  { key: "fiscalYearEnd", label: "Fiscal year end" },
  { key: "consultantDependent", label: "Consultant" },
  { key: "esgRequired", label: "ESG required" },
];

const DEFAULT_COLUMN_WIDTHS: Record<SortColumn, number> = {
  name: 140,
  firm: 140,
  days: 70,
  momentum: 90,
  band: 110,
  stage: 120,
  tier: 80,
  nextMove: 180,
  openLoops: 80,
  owner: 100,
  investorType: 120,
  strategyFit: 110,
  strategyType: 110,
  lpLocation: 100,
  investmentRemit: 100,
  typicalCheckSize: 90,
  fundSizePreference: 100,
  source: 100,
  lastFundHistory: 110,
  decisionTimeline: 90,
  fiscalYearEnd: 90,
  consultantDependent: 110,
  esgRequired: 90,
};

/** Primary columns visible by default (~1380px) so table fits on typical screens without horizontal overflow */
const DEFAULT_COLUMN_VISIBILITY: Record<SortColumn, boolean> = Object.fromEntries(
  TABLE_COLUMNS.map((c) => {
    const secondary = [
      "strategyType",
      "lpLocation",
      "investmentRemit",
      "typicalCheckSize",
      "fundSizePreference",
      "source",
      "lastFundHistory",
      "decisionTimeline",
      "fiscalYearEnd",
      "consultantDependent",
      "esgRequired",
    ];
    return [c.key, !secondary.includes(c.key)];
  })
) as Record<SortColumn, boolean>;

const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 400;

function mergeWithOverrides(
  base: Relationship[],
  overrides: Record<string, Partial<Relationship>>
): Relationship[] {
  if (Object.keys(overrides).length === 0) return base;
  return base.map((r) => {
    const o = overrides[r.id];
    if (!o) return r;
    return { ...r, ...o };
  });
}

export default function RelationshipsPage() {
  const router = useRouter();
  const { ready } = useRequireSession();
  const { relationships, addRelationship, resetRelationshipsDemo } = useRelationships();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;
  const { addPipeline } = usePipelines(activeFundId);
  const [filterCriteria, setFilterCriteria] = usePersistentState<StructuredFilterCriteria>(
    "tomo-relationships-filters-v3",
    EMPTY_CRITERIA
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createPipelineModalOpen, setCreatePipelineModalOpen] = useState(false);
  const [createPipelineName, setCreatePipelineName] = useState("");
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [kanbanStageConfirm, setKanbanStageConfirm] = useState<{
    relationshipId: string;
    targetStage: Stage;
    firm: string;
    name: string;
  } | null>(null);

  const [viewMode, setViewMode] = usePersistentState<RelationshipsViewMode>("tomo-relationships-view-mode", "list");
  const [sortColumn, setSortColumn] = usePersistentState<SortColumn>("tomo-relationships-sort-column", "momentum");
  const [sortDirection, setSortDirection] = usePersistentState<SortDirection>("tomo-relationships-sort-direction", "desc");
  const [columnWidths, setColumnWidths] = usePersistentState<Record<string, number>>(
    "tomo-relationships-column-widths-v2",
    DEFAULT_COLUMN_WIDTHS
  );
  const [columnVisibility, setColumnVisibility] = usePersistentState<Record<string, boolean>>(
    "tomo-relationships-column-visibility-v2",
    DEFAULT_COLUMN_VISIBILITY
  );
  const [relationshipOverrides, setRelationshipOverrides] = usePersistentState<
    Record<string, Partial<Relationship>>
  >("tomo-relationship-overrides-v1", {});

  const visibleColumns = useMemo(
    () =>
      TABLE_COLUMNS.filter((col) => columnVisibility[col.key] !== false),
    [columnVisibility]
  );
  const effectiveColumnWidths = useMemo(
    () => ({ ...DEFAULT_COLUMN_WIDTHS, ...columnWidths }) as Record<SortColumn, number>,
    [columnWidths]
  );
  const [resizingColumn, setResizingColumn] = useState<SortColumn | null>(null);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false);
  const columnsPopoverRef = useRef<HTMLDivElement>(null);

  const effectiveSortColumn = useMemo(() => {
    const visibleKeys = new Set(visibleColumns.map((c) => c.key));
    return visibleKeys.has(sortColumn) ? sortColumn : visibleColumns[0]?.key ?? "name";
  }, [visibleColumns, sortColumn]);

  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, col) => sum + effectiveColumnWidths[col.key], 0),
    [visibleColumns, effectiveColumnWidths]
  );

  useEffect(() => {
    if (!columnsPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsPopoverRef.current && !columnsPopoverRef.current.contains(e.target as Node)) {
        setColumnsPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [columnsPopoverOpen]);

  useEffect(() => {
    if (!resizingColumn) return;
    const handleMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const delta = e.clientX - start.x;
      const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, start.width + delta));
      setColumnWidths((prev) => ({ ...DEFAULT_COLUMN_WIDTHS, ...prev, [resizingColumn]: newWidth }));
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
    resizeStartRef.current = { x: e.clientX, width: effectiveColumnWidths[col] };
  };

  const clearFilters = () => {
    setFilterCriteria(EMPTY_CRITERIA);
  };

  const relationshipsWithOverrides = useMemo(
    () => mergeWithOverrides(relationships, relationshipOverrides),
    [relationships, relationshipOverrides]
  );

  const filtered = useMemo(
    () => applyFilters(relationshipsWithOverrides, filterCriteria),
    [relationshipsWithOverrides, filterCriteria]
  );

  const DESC_DEFAULT_COLS: SortColumn[] = ["days", "momentum", "openLoops"];
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(DESC_DEFAULT_COLS.includes(col) ? "desc" : "asc");
    }
  };

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    const mult = sortDirection === "asc" ? 1 : -1;
    const col = effectiveSortColumn;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (col) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "firm":
          cmp = a.firm.localeCompare(b.firm);
          break;
        case "days":
          cmp = a.daysSinceLastMeaningfulContact - b.daysSinceLastMeaningfulContact;
          break;
        case "momentum": {
          const rank: Record<string, number> = { "Heating up": 3, "Stable": 2, "Cooling": 1 };
          cmp = (rank[a.momentumDirection] ?? 0) - (rank[b.momentumDirection] ?? 0);
          break;
        }
        case "band":
          cmp = a.band.localeCompare(b.band);
          break;
        case "stage":
          cmp = a.stage.localeCompare(b.stage);
          break;
        case "tier":
          cmp = a.tier.localeCompare(b.tier);
          break;
        case "nextMove":
          cmp = a.nextMove.localeCompare(b.nextMove);
          break;
        case "openLoops":
          cmp = a.openLoops - b.openLoops;
          break;
        case "owner":
          cmp = a.relationshipOwner.localeCompare(b.relationshipOwner);
          break;
        case "investorType":
          cmp = a.investorType.localeCompare(b.investorType);
          break;
        case "strategyFit":
          cmp = a.strategyFit.localeCompare(b.strategyFit);
          break;
        case "strategyType":
          cmp = a.strategyType.localeCompare(b.strategyType);
          break;
        case "lpLocation":
          cmp = a.lpLocation.localeCompare(b.lpLocation);
          break;
        case "investmentRemit":
          cmp = a.investmentRemit.localeCompare(b.investmentRemit);
          break;
        case "typicalCheckSize":
          cmp = a.typicalCheckSize.localeCompare(b.typicalCheckSize);
          break;
        case "fundSizePreference":
          cmp = a.fundSizePreference.localeCompare(b.fundSizePreference);
          break;
        case "source":
          cmp = a.source.localeCompare(b.source);
          break;
        case "lastFundHistory":
          cmp = a.lastFundHistory.localeCompare(b.lastFundHistory);
          break;
        case "decisionTimeline":
          cmp = a.decisionTimeline.localeCompare(b.decisionTimeline);
          break;
        case "fiscalYearEnd":
          cmp = a.fiscalYearEnd.localeCompare(b.fiscalYearEnd);
          break;
        case "consultantDependent":
          cmp = a.consultantDependent.localeCompare(b.consultantDependent);
          break;
        case "esgRequired":
          cmp = a.esgRequired.localeCompare(b.esgRequired);
          break;
      }
      return mult * cmp;
    });
    return arr;
  }, [filtered, effectiveSortColumn, sortDirection]);

  /** Kanban: same order as list (header sort), grouped into fixed stage columns */
  const kanbanColumns = useMemo(() => {
    const buckets = new Map<string, Relationship[]>();
    for (const stage of STAGE_OPTIONS) buckets.set(stage, []);
    for (const rel of sortedFiltered) {
      buckets.get(rel.stage)?.push(rel);
    }
    return STAGE_OPTIONS.map((stage) => ({ stage, items: buckets.get(stage)! }));
  }, [sortedFiltered]);

  const active = useMemo(
    () => relationshipsWithOverrides.find((r) => r.id === activeId) ?? null,
    [relationshipsWithOverrides, activeId]
  );

  const activityLogEntries = useMemo(() => {
    if (!activeId) return [];
    return [
      {
        id: "1",
        ts: "Yesterday 3:45 PM",
        actor: "TOMO" as const,
        summary: "Drafted intro note for allocator; awaiting your send.",
      },
      {
        id: "2",
        ts: "Yesterday 3:20 PM",
        actor: "User" as const,
        summary: "Call — Reviewed allocation timeline and updated next steps.",
      },
      {
        id: "3",
        ts: "Tue 11:00 AM",
        actor: "User" as const,
        summary: "Meeting — Walked through Q4 performance; asked for follow-up.",
      },
      {
        id: "4",
        ts: "Tue 8:15 AM",
        actor: "TOMO" as const,
        summary: "Flagged cooling signal after 21d with no meaningful touch.",
      },
      {
        id: "5",
        ts: "Mon 9:05 AM",
        actor: "User" as const,
        summary: "Email — Sent performance snapshot + availability options.",
      },
    ];
  }, [activeId]);

  const drawerSelection = useMemo(
    () => (activeId ? { type: "relationship" as const, id: activeId } : undefined),
    [activeId]
  );

  const handleCrmUpdate = useCallback(
    (payload: {
      entityId?: string;
      relationshipIds?: string[];
      rows?: { field: string; update: string }[];
    }) => {
      const ids = payload.relationshipIds?.length
        ? payload.relationshipIds
        : payload.entityId
          ? [payload.entityId]
          : [];
      const rows = payload.rows ?? [];
      if (ids.length === 0 || rows.length === 0) return;
      setRelationshipOverrides((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const current = next[id] ?? {};
          const merged: Partial<Relationship> = { ...current };
          for (const { field, update } of rows) {
            const key = FIELD_TO_REL_KEY[field] ?? field;
            const value = normalizeFieldValue(key, update);
            (merged as Record<string, unknown>)[key] = value;
          }
          next[id] = merged;
        }
        return next;
      });
    },
    [setRelationshipOverrides]
  );

  const commitStageOverride = useCallback(
    (relationshipId: string, stage: Stage) => {
      const key = FIELD_TO_REL_KEY.stage;
      const value = normalizeFieldValue(key, stage) as Relationship["stage"];
      setRelationshipOverrides((prev) => ({
        ...prev,
        [relationshipId]: { ...(prev[relationshipId] ?? {}), [key]: value },
      }));
    },
    [setRelationshipOverrides]
  );

  const handleKanbanMoveToStage = useCallback(
    (relationshipId: string, targetStage: Stage) => {
      const rel = relationshipsWithOverrides.find((r) => r.id === relationshipId);
      if (!rel || rel.stage === targetStage) return;
      if (targetStage === "Closed" || targetStage === "Pass") {
        setKanbanStageConfirm({
          relationshipId,
          targetStage,
          firm: rel.firm,
          name: rel.name,
        });
        return;
      }
      commitStageOverride(relationshipId, targetStage);
      toast.success(`Stage updated to ${targetStage}`);
    },
    [relationshipsWithOverrides, commitStageOverride]
  );

  const handleCreatePipeline = () => {
    const trimmed = createPipelineName.trim();
    if (!trimmed) {
      toast.error("Enter a list name");
      return;
    }
    addPipeline({
      name: trimmed,
      fundId: effectiveFundId,
      filterCriteria: { ...filterCriteria },
    });
    setCreatePipelineName("");
    setCreatePipelineModalOpen(false);
    toast.success(`List "${trimmed}" created`, {
      description: "Open Lists or stay on Relationships.",
      action: {
        label: "Go to list",
        onClick: () => router.push("/pipeline"),
      },
      cancel: {
        label: "Stay",
        onClick: () => {},
      },
    });
  };

  const handleResetRelationshipsDemo = useCallback(() => {
    resetRelationshipsDemo();
    setRelationshipOverrides({});
    toast.success("Demo reset — relationships restored to default.");
  }, [resetRelationshipsDemo, setRelationshipOverrides]);

  const listContent = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <PageListHeader
        label="Relationships"
        titleRight={
          <>
            <button
              type="button"
              onClick={handleResetRelationshipsDemo}
              className="text-[11px] font-normal text-gray-400 underline-offset-2 transition hover:text-gray-600 hover:underline"
              title="Clears manual contacts and field overrides; reloads CRM mock from default (demo)"
            >
              Reset demo
            </button>
            <button
              type="button"
              onClick={() => setNewContactOpen(true)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              New Contact
            </button>
            <button
              type="button"
              onClick={() => setCsvImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Upload CSV"
              title="Upload CSV"
            >
              <ArrowUpTrayIcon className="h-4 w-4 shrink-0" aria-hidden />
              Upload CSV
            </button>
          </>
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <RelationshipsFilterChat
          currentFilters={filterCriteria}
          onFiltersChange={setFilterCriteria}
          onClearFilters={clearFilters}
          onCreateList={() => setCreatePipelineModalOpen(true)}
        />
      </div>

      <div className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <span className="shrink-0 text-xs text-gray-500">
              {Object.keys(filterCriteria).length > 0
                ? `Showing ${filtered.length} of ${relationshipsWithOverrides.length} relationship${relationshipsWithOverrides.length !== 1 ? "s" : ""}`
                : `${filtered.length} relationship${filtered.length !== 1 ? "s" : ""}`}
            </span>
            {(() => {
              const summary = formatFilterSummary(filterCriteria);
              return summary ? (
                <span className="min-w-0 truncate text-xs font-medium peach-text" title={summary}>
                  {summary}
                </span>
              ) : null;
            })()}
          </div>
          <div className="relative flex shrink-0 items-center gap-1" ref={columnsPopoverRef}>
            {viewMode === "list" ? (
              <>
                <button
                  type="button"
                  onClick={() => setColumnsPopoverOpen((o) => !o)}
                  className={`rounded p-1.5 transition ${
                    columnsPopoverOpen ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                  aria-label="Choose columns"
                  aria-expanded={columnsPopoverOpen}
                  aria-haspopup="true"
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </button>
                {columnsPopoverOpen && (
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white py-2 shadow-lg"
                    role="menu"
                  >
                    <div className="border-b border-gray-100 px-3 py-2">
                      <p className="text-xs font-medium text-gray-700">Show columns</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto px-2 py-1">
                      {TABLE_COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                          role="menuitemcheckbox"
                          aria-checked={columnVisibility[col.key] !== false}
                        >
                          <input
                            type="checkbox"
                            checked={columnVisibility[col.key] !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                const visibleCount = TABLE_COLUMNS.filter((c) => columnVisibility[c.key] !== false).length;
                                if (visibleCount <= 1) return;
                              }
                              setColumnVisibility((prev) => ({
                                ...prev,
                                [col.key]: checked,
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY })}
                        className="w-full rounded px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Show all
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
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
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`rounded p-1.5 transition ${
                viewMode === "kanban"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              aria-label="Kanban view"
              aria-pressed={viewMode === "kanban"}
            >
              <TableCellsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className={`min-w-0 flex-1 ${viewMode === "kanban" ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto"}`}
        >
          {viewMode === "list" ? (
            <div className="overflow-x-auto overflow-y-auto rounded-md border border-gray-200 bg-white">
              <table
                className="border-collapse text-left text-sm"
                style={{ minWidth: tableMinWidth, tableLayout: "fixed" }}
              >
                <colgroup>
                  {visibleColumns.map((col) => (
                    <col key={col.key} style={{ width: effectiveColumnWidths[col.key], minWidth: effectiveColumnWidths[col.key] }} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-gray-200">
                    {visibleColumns.map((col) => (
                      <SortableTh
                        key={col.key}
                        columnKey={col.key}
                        label={col.label}
                        active={effectiveSortColumn === col.key}
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
                      columns={visibleColumns}
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
          ) : viewMode === "card" ? (
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
          ) : !sortedFiltered.length ? (
            <Placeholder title="No relationships match." />
          ) : (
            <RelationshipsKanbanBoard
              columns={kanbanColumns}
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
              onMoveToStage={handleKanbanMoveToStage}
            />
          )}
        </div>
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
            <RelationshipDetail relationship={active} onCloseDrawer={() => setActiveId(null)} />
          ) : (
            <div className="text-sm text-gray-500">Select a relationship</div>
          )
        }
        section2Content={
          activeId ? (
            <DrawerSection2TomoChat
              initialMessage={{ text: "Can I help you understand this relationship or update their record?" }}
              suggestions={getTomoAssistance(activeId)?.suggestedPrompts ?? ["Summarize last thread", "Draft outreach", "Propose next step", "Create action"]}
              entityKey={activeId}
              selection={drawerSelection}
              assistanceContext={getTomoAssistance(activeId)}
              onCrmUpdate={handleCrmUpdate}
            />
          ) : undefined
        }
        section3Entries={activityLogEntries}
      />
      {createPipelineModalOpen && (
        <CreatePipelineModal
          pipelineName={createPipelineName}
          onNameChange={setCreatePipelineName}
          onClose={() => {
            setCreatePipelineModalOpen(false);
            setCreatePipelineName("");
          }}
          onCreate={handleCreatePipeline}
          filteredCount={filtered.length}
        />
      )}
      {kanbanStageConfirm ? (
        <KanbanTerminalStageModal
          targetStage={kanbanStageConfirm.targetStage}
          firm={kanbanStageConfirm.firm}
          name={kanbanStageConfirm.name}
          onClose={() => setKanbanStageConfirm(null)}
          onConfirm={() => {
            commitStageOverride(kanbanStageConfirm.relationshipId, kanbanStageConfirm.targetStage);
            toast.success(`Stage updated to ${kanbanStageConfirm.targetStage}`);
            setKanbanStageConfirm(null);
          }}
        />
      ) : null}
      <NewContactModal
        open={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        onConfirm={(r) => {
          addRelationship(r);
          setActiveId(r.id);
          toast.success(`${r.name} added`);
        }}
      />
      <AttachDocumentModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        title="Upload CSV"
        description="Select a CSV file to import LP relationships. Demo only — the file is not sent to a server; one preview row is added from the filename."
        accept=".csv,text/csv"
        autoOpenFilePicker
        onUploaded={(fileName) => {
          const r = buildMockRelationshipFromCsvImport(fileName);
          addRelationship(r);
          setActiveId(r.id);
          toast.success(`CSV processed — ${fileName} imported and added to CRM`);
        }}
      />
    </>
  );
}

function CreatePipelineModal({
  pipelineName,
  onNameChange,
  onClose,
  onCreate,
  filteredCount,
}: {
  pipelineName: string;
  onNameChange: (v: string) => void;
  onClose: () => void;
  onCreate: () => void;
  filteredCount: number;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900">Create list</h3>
        <p className="mt-1 text-xs text-gray-500">{filteredCount} relationships in current filters</p>
        <input
          className="mt-3 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="List name"
          value={pipelineName}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!pipelineName.trim()}
            className="button-primary rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Create list
          </button>
        </div>
      </div>
    </div>
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
  const isSticky = columnKey === "name";
  return (
    <th
      className={`relative min-w-0 px-3 py-2.5 ${isSticky ? "sticky left-0 z-10 bg-gray-50" : ""}`}
      style={isSticky ? { boxShadow: "2px 0 4px -2px rgba(0,0,0,0.1)" } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        data-testid={`relationships-sort-${columnKey}`}
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
  columns,
  isActive,
  onSelect,
}: {
  rel: Relationship;
  columns: { key: SortColumn; label: string; highlight?: boolean }[];
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group cursor-pointer border-b border-gray-100 transition last:border-b-0 ${
        isActive ? "border-l-4 border-l-blue-500 bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      {columns.map((col) => (
        <TableCell key={col.key} rel={rel} columnKey={col.key} isActive={isActive} />
      ))}
    </tr>
  );
}

function TableCell({ rel, columnKey, isActive }: { rel: Relationship; columnKey: SortColumn; isActive: boolean }) {
  const baseClass = "max-w-0 truncate px-3 py-2.5 text-gray-600";
  const accentClass = "font-semibold accent-title";
  const stickyNameClass = `sticky left-0 z-[1] ${isActive ? "bg-blue-50" : "bg-white group-hover:bg-gray-50"} ${baseClass} ${accentClass}`;
  switch (columnKey) {
    case "name":
      return (
        <td className={stickyNameClass} title={rel.name} style={{ boxShadow: "2px 0 4px -2px rgba(0,0,0,0.1)" }}>
          {rel.name}
        </td>
      );
    case "firm":
      return (
        <td className={baseClass} title={rel.firm}>
          {rel.firm}
        </td>
      );
    case "days":
      return (
        <td className={baseClass} title={formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}>
          {formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}
        </td>
      );
    case "momentum":
      return (
        <td className="px-3 py-2.5">
          <MomentumChip direction={rel.momentumDirection} days={rel.daysSinceLastMeaningfulContact} prominent />
        </td>
      );
    case "band":
      return (
        <td className={baseClass} title={rel.band}>
          {rel.band}
        </td>
      );
    case "stage":
      return (
        <td className={baseClass} title={rel.stage}>
          {rel.stage}
        </td>
      );
    case "tier":
      return (
        <td className={baseClass} title={rel.tier}>
          {rel.tier}
        </td>
      );
    case "nextMove":
      return (
        <td className={baseClass} title={rel.nextMove}>
          {rel.nextMove}
        </td>
      );
    case "openLoops":
      return (
        <td className="px-3 py-2.5">
          {rel.openLoops > 0 ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
              {rel.openLoops}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
      );
    case "owner":
      return (
        <td className={baseClass} title={rel.relationshipOwner}>
          {rel.relationshipOwner}
        </td>
      );
    case "investorType":
      return (
        <td className={baseClass} title={rel.investorType}>
          {rel.investorType}
        </td>
      );
    case "strategyFit":
      return (
        <td className={baseClass} title={rel.strategyFit}>
          {rel.strategyFit}
        </td>
      );
    case "strategyType":
      return (
        <td className={baseClass} title={rel.strategyType}>
          {rel.strategyType}
        </td>
      );
    case "lpLocation":
      return (
        <td className={baseClass} title={rel.lpLocation}>
          {rel.lpLocation}
        </td>
      );
    case "investmentRemit":
      return (
        <td className={baseClass} title={rel.investmentRemit}>
          {rel.investmentRemit}
        </td>
      );
    case "typicalCheckSize":
      return (
        <td className={baseClass} title={rel.typicalCheckSize}>
          {rel.typicalCheckSize}
        </td>
      );
    case "fundSizePreference":
      return (
        <td className={baseClass} title={rel.fundSizePreference}>
          {rel.fundSizePreference}
        </td>
      );
    case "source":
      return (
        <td className={baseClass} title={rel.sourceDetail ? `${rel.source} (${rel.sourceDetail})` : rel.source}>
          {rel.sourceDetail ? `${rel.source} (${rel.sourceDetail})` : rel.source}
        </td>
      );
    case "lastFundHistory":
      return (
        <td className={baseClass} title={rel.lastFundHistory}>
          {rel.lastFundHistory}
        </td>
      );
    case "decisionTimeline":
      return (
        <td className={baseClass} title={rel.decisionTimeline}>
          {rel.decisionTimeline}
        </td>
      );
    case "fiscalYearEnd":
      return (
        <td className={baseClass} title={rel.fiscalYearEnd}>
          {rel.fiscalYearEnd}
        </td>
      );
    case "consultantDependent":
      return (
        <td className={baseClass} title={rel.consultantDependent}>
          {rel.consultantDependent}
        </td>
      );
    case "esgRequired":
      return (
        <td className={baseClass} title={rel.esgRequired}>
          {rel.esgRequired}
        </td>
      );
    default:
      return <td className={baseClass}>—</td>;
  }
}

function KanbanTerminalStageModal({
  targetStage,
  firm,
  name,
  onConfirm,
  onClose,
}: {
  targetStage: Stage;
  firm: string;
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="kanban-stage-confirm-title"
      aria-describedby="kanban-stage-confirm-desc"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="kanban-stage-confirm-title" className="text-sm font-semibold text-gray-900">
          Move to {targetStage}?
        </h3>
        <p id="kanban-stage-confirm-desc" className="mt-2 text-sm text-gray-700">
          <span className="font-medium text-gray-900">{firm}</span>
          <span className="text-gray-500"> · </span>
          {name}
        </p>
        <p className="mt-1 text-xs text-gray-500">This updates their CRM stage. Band is not changed.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="button-primary rounded-md px-3 py-1.5 text-sm">
            Move to {targetStage}
          </button>
        </div>
      </div>
    </div>
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
          <MomentumChip direction={rel.momentumDirection} days={rel.daysSinceLastMeaningfulContact} />
          {rel.openLoops ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
              {rel.openLoops}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-gray-600">Last: {formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}</p>
      <p className="line-clamp-1 text-xs text-gray-600">Next: {rel.nextMove}</p>
    </button>
  );
}

function RelationshipDetail({
  relationship,
  onCloseDrawer,
}: {
  relationship: Relationship;
  /** Used to navigate without leaving drawer context */
  onCloseDrawer: () => void;
}) {
  const stallRisk =
    relationship.band === "Stalled" || relationship.momentumDirection === "Cooling"
      ? relationship.daysSinceLastMeaningfulContact >= 30
        ? "High"
        : "Medium"
      : "Low";

  return (
    <div className="space-y-4">
      {/* Section 1 — Snapshot */}
      <section aria-labelledby="rel-snapshot-heading">
        <h3 id="rel-snapshot-heading" className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Snapshot
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">{relationship.firm}</p>
          <div className="flex items-center gap-2">
            <MomentumChip direction={relationship.momentumDirection} days={relationship.daysSinceLastMeaningfulContact} />
            <span className="text-xs text-gray-500">{relationship.band}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-900">
          <span className="text-gray-500">Next move · </span>
          {relationship.nextMove}
        </p>
      </section>

      {/* Section 2 — Context (prioritisation + targeting) */}
      <section aria-labelledby="rel-context-heading" className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
        <h3 id="rel-context-heading" className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Context
        </h3>
        <div className="mt-2 space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Prioritisation</p>
            <div className="mt-1.5 grid gap-1.5 text-xs text-gray-800 sm:grid-cols-2">
              <StatusField label="Days since contact" value={formatDaysSinceContact(relationship.daysSinceLastMeaningfulContact)} />
              <StatusField label="Stage" value={relationship.stage} />
              <StatusField label="Signal" value={relationship.momentumDirection} />
              <StatusField label="Tier" value={relationship.tier} />
              <StatusField label="Owner" value={relationship.relationshipOwner} />
              <StatusField label="Stall risk" value={stallRisk} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Targeting</p>
            <div className="mt-1.5 grid gap-1.5 text-xs text-gray-800 sm:grid-cols-2">
              <StatusField label="Investor type" value={relationship.investorType} />
              <StatusField label="Strategy fit" value={relationship.strategyFit} />
              <StatusField label="Strategy type" value={relationship.strategyType} />
              <StatusField label="Location" value={relationship.lpLocation} />
              <StatusField label="Investment remit" value={relationship.investmentRemit} />
              <StatusField label="Typical check" value={relationship.typicalCheckSize} />
              <StatusField label="Fund size pref" value={relationship.fundSizePreference} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Sequencing */}
      <section aria-labelledby="rel-seq-heading" className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
        <h3 id="rel-seq-heading" className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Sequencing
        </h3>
        <div className="mt-1.5 grid gap-1.5 text-xs text-gray-800 sm:grid-cols-2">
          <StatusField label="Source" value={relationship.sourceDetail ? `${relationship.source} (${relationship.sourceDetail})` : relationship.source} />
          <StatusField label="Last fund" value={relationship.lastFundHistory} />
          <StatusField label="Decision timeline" value={relationship.decisionTimeline} />
          <StatusField label="Fiscal year end" value={relationship.fiscalYearEnd} />
          <StatusField label="Consultant" value={relationship.consultantDependent} />
          {relationship.consultantName ? <StatusField label="Consultant name" value={relationship.consultantName} /> : null}
          <StatusField label="ESG required" value={relationship.esgRequired} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <p className="text-[11px] text-gray-500">Recent touches and Tomo steps also appear in Activity (full history).</p>
        <Link
          href="/activity"
          onClick={() => onCloseDrawer()}
          className="text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          Open Activity →
        </Link>
      </div>
    </div>
  );
}

function MomentumChip({
  direction,
  days,
  prominent,
}: {
  direction: MomentumDirection;
  days: number;
  prominent?: boolean;
}) {
  const icon = direction === "Heating up" ? "↑" : direction === "Cooling" ? "↓" : "→";
  const trendStyles =
    direction === "Heating up"
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60"
      : direction === "Cooling"
        ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/60"
        : "bg-amber-100 text-amber-800 ring-1 ring-amber-200/60";
  const sizeClass = prominent ? "px-3 py-1.5 text-xs font-semibold" : "px-2.5 py-1 text-[11px] font-medium";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full ${trendStyles} ${sizeClass}`}>
      <span>{days}d</span>
      <span className="font-bold" aria-label={`Trend: ${direction}`}>
        {icon}
      </span>
    </span>
  );
}

function StatusField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">{title}</div>;
}

