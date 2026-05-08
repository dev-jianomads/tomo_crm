"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpTrayIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { ContextDrawer } from "@/components/context-drawer";
import { RelationshipCrmForm } from "@/components/relationship-crm-form";
import { RelationshipDrawerSnapshotSection } from "@/components/relationship-drawer-snapshot";
import { RelationshipDrawerTomoRow } from "@/components/relationship-drawer-tomo-row";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
import {
  buildMockRelationshipSnapshotParagraph,
  getMockRelationshipActivityEntries,
} from "@/lib/relationshipDrawerMockActivity";
import { Relationship, formatDaysSinceContact, STAGE_OPTIONS } from "@/lib/mockData";
import { useRelationships } from "@/components/relationships-provider";
import type { MomentumDirection, Stage } from "@/lib/mockData";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  type StructuredFilterCriteria,
} from "@/lib/relationshipFilters";
import {
  FIELD_TO_REL_KEY,
  MANUAL_OPTIONAL_CLEAR_KEYS,
  normalizeFieldValue,
  validateManualRelationshipField,
} from "@/lib/crmFieldSchema";
import { RelationshipsFilterChat } from "@/components/relationships-filter-chat";
import { RelationshipsKanbanBoard } from "@/components/relationships-kanban-board";
import { NewContactModal } from "@/components/new-contact-modal";
import { ContactImportModal } from "@/components/contact-import-modal";
import { RelationshipsAdvancedFiltersModal } from "@/components/relationships-advanced-filters-modal";
import { summarizeMapping } from "@/lib/contactImportMock";
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
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [advancedFiltersSession, setAdvancedFiltersSession] = useState(0);
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

  const activeFilterFieldCount = Object.keys(filterCriteria).length;

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

  const drawerActivityEntries = useMemo(() => {
    if (!active || !activeId) return [];
    return getMockRelationshipActivityEntries(activeId, active.name, active.firm);
  }, [active, activeId]);

  const snapshotParagraph = useMemo(() => {
    if (!active || drawerActivityEntries.length === 0) return "";
    return buildMockRelationshipSnapshotParagraph(active.name, active.firm, drawerActivityEntries);
  }, [active, drawerActivityEntries]);

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

  const handleRelationshipManualField = useCallback(
    (key: keyof Relationship | string, raw: string) => {
      if (!activeId) return;
      if (
        (MANUAL_OPTIONAL_CLEAR_KEYS as readonly string[]).includes(key as string) &&
        raw.trim() === ""
      ) {
        setRelationshipOverrides((prev) => ({
          ...prev,
          [activeId]: { ...(prev[activeId] ?? {}), [key]: undefined },
        }));
        return;
      }
      const result = validateManualRelationshipField(key as string, raw);
      if (!result.ok) {
        toast.error(result.message, { id: `manual-crm-${String(key)}` });
        return;
      }
      setRelationshipOverrides((prev) => ({
        ...prev,
        [activeId]: { ...(prev[activeId] ?? {}), [key]: result.value },
      }));
    },
    [activeId, setRelationshipOverrides]
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
              className="text-[11px] font-normal text-[color:var(--tomo-mute)] underline-offset-2 transition hover:text-[color:var(--foreground)] hover:underline"
              title="Clears manual contacts and field overrides; reloads CRM mock from default (demo)"
            >
              Reset demo
            </button>
            <button type="button" onClick={() => setNewContactOpen(true)} className="button-primary rounded-lg px-3 py-1.5 text-xs font-semibold">
              New Contact
            </button>
            <button
              type="button"
              onClick={() => setCsvImportOpen(true)}
              className="button-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              aria-label="Upload CSV"
              title="Upload CSV"
            >
              <ArrowUpTrayIcon className="h-4 w-4 shrink-0" aria-hidden />
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setAdvancedFiltersSession((s) => s + 1);
                setAdvancedFiltersOpen(true);
              }}
              className="button-primary relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              aria-label={
                activeFilterFieldCount > 0
                  ? `Advanced filters, ${activeFilterFieldCount} active`
                  : "Advanced filters"
              }
              title="Advanced filters"
            >
              <FunnelIcon className="h-4 w-4 shrink-0" aria-hidden />
              Advanced filters
              {activeFilterFieldCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--tomo-status-amber-bg)] px-1 text-[10px] font-bold tabular-nums text-[color:var(--tomo-status-amber-text)] shadow-sm ring-2 ring-[color:var(--tomo-card)]"
                  aria-hidden
                >
                  {activeFilterFieldCount > 99 ? "99+" : activeFilterFieldCount}
                </span>
              ) : null}
            </button>
          </>
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)]">
        <RelationshipsFilterChat
          currentFilters={filterCriteria}
          onFiltersChange={setFilterCriteria}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="shrink-0 text-xs text-[color:var(--tomo-mute)]">
              {Object.keys(filterCriteria).length > 0
                ? `Showing ${filtered.length} of ${relationshipsWithOverrides.length} relationship${relationshipsWithOverrides.length !== 1 ? "s" : ""}`
                : `${filtered.length} relationship${filtered.length !== 1 ? "s" : ""}`}
            </span>
            {(() => {
              const summary = formatFilterSummary(filterCriteria);
              return summary ? (
                <span className="min-w-0 max-w-[min(100%,28rem)] truncate text-xs font-medium peach-text" title={summary}>
                  {summary}
                </span>
              ) : null;
            })()}
            {Object.keys(filterCriteria).length > 0 ? (
              <button
                type="button"
                onClick={() => setCreatePipelineModalOpen(true)}
                className="button-primary inline-flex shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                Create list
              </button>
            ) : null}
          </div>
          <div className="relative flex shrink-0 items-center gap-1" ref={columnsPopoverRef}>
            {viewMode === "list" ? (
              <>
                <button
                  type="button"
                  onClick={() => setColumnsPopoverOpen((o) => !o)}
                  className={`rounded p-1.5 transition ${
                    columnsPopoverOpen
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
                      : "text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
                  }`}
                  aria-label="Choose columns"
                  aria-expanded={columnsPopoverOpen}
                  aria-haspopup="true"
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </button>
                {columnsPopoverOpen && (
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-56 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] py-2 shadow-[var(--tomo-modal-shadow)]"
                    role="menu"
                  >
                    <div className="border-b border-[color:var(--tomo-rule-soft)] px-3 py-2">
                      <p className="text-xs font-medium text-[color:var(--foreground)]">Show columns</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto px-2 py-1">
                      {TABLE_COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[color:var(--foreground)] hover:bg-[color:var(--tomo-navy-soft)]"
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
                            className="h-4 w-4 rounded border-[color:var(--tomo-rule)] text-[color:var(--accent)] focus:ring-[color:var(--tomo-teal)]"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="border-t border-[color:var(--tomo-rule-soft)] px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY })}
                        className="w-full rounded px-2 py-1.5 text-left text-xs text-[color:var(--tomo-body)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
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
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
                  : "text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
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
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
                  : "text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
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
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
                  : "text-[color:var(--tomo-mute)] hover:bg-[color:var(--tomo-navy-soft)] hover:text-[color:var(--foreground)]"
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
            <div className="overflow-x-auto overflow-y-auto rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]">
              <table
                className="border-collapse text-left text-sm"
                style={{ minWidth: tableMinWidth, tableLayout: "fixed" }}
              >
                <colgroup>
                  {visibleColumns.map((col) => (
                    <col key={col.key} style={{ width: effectiveColumnWidths[col.key], minWidth: effectiveColumnWidths[col.key] }} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_58%,var(--tomo-card))] shadow-[0_1px_0_0_color-mix(in_srgb,var(--tomo-rule)_85%,transparent)]">
                  <tr className="border-b border-[color:var(--tomo-rule-soft)]">
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
                <div className="px-4 py-8 text-center text-sm text-[color:var(--tomo-mute)]">No relationships match.</div>
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
        panelMaxWidthClassName="max-w-5xl"
        section1Content={
          active && snapshotParagraph ? (
            <RelationshipDrawerSnapshotSection summaryText={snapshotParagraph} />
          ) : (
            <div className="text-sm text-[color:var(--tomo-mute)]">Select a relationship</div>
          )
        }
        section2MinHeightClassName="min-h-0"
        section2Content={
          active ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <RelationshipCrmForm relationship={active} onFieldChange={handleRelationshipManualField} />
              </div>
            </div>
          ) : undefined
        }
        sectionBetween2AndActivity={
          activeId && drawerSelection ? (
            <RelationshipDrawerTomoRow
              entityKey={activeId}
              selection={drawerSelection}
              contextLabel={active?.name}
              assistanceContext={getTomoAssistance(activeId)}
              onCrmUpdate={handleCrmUpdate}
            />
          ) : undefined
        }
        section3Entries={drawerActivityEntries}
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
      {advancedFiltersOpen ? (
        <RelationshipsAdvancedFiltersModal
          key={advancedFiltersSession}
          initialCriteria={filterCriteria}
          onClose={() => setAdvancedFiltersOpen(false)}
          onConfirm={(criteria) => setFilterCriteria(criteria)}
        />
      ) : null}
      <ContactImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        title="Upload contacts"
        fileStepDescription="Select a CSV or Excel file of LPs. We auto-match columns from the header row; adjust on the next step. Demo only — parsing is mocked; one relationship is added per import from the filename."
        autoOpenFilePicker
        onConfirm={({ file, preview, mapping }) => {
          const summary = summarizeMapping(preview.headers, mapping);
          const r = buildMockRelationshipFromCsvImport(file.name, summary);
          addRelationship(r);
          setActiveId(r.id);
          toast.success(`Import queued — ${file.name} (${summary.slice(0, 120)}${summary.length > 120 ? "…" : ""})`);
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
      className="fixed inset-0 z-50 flex items-center justify-center tomo-drawer-veil p-4"
      onClick={onClose}
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-modal-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Create list</h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">{filteredCount} relationships in current filters</p>
        <input
          className="tomo-input mt-3 text-sm"
          placeholder="List name"
          value={pipelineName}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-sm text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
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
      className={`relative min-w-0 px-3 py-2.5 ${isSticky ? "sticky left-0 z-10 bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_58%,var(--tomo-card))]" : ""}`}
      style={isSticky ? { boxShadow: "2px 0 4px -2px color-mix(in srgb, var(--tomo-rule) 55%, transparent)" } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        data-testid={`relationships-sort-${columnKey}`}
        className={`flex w-full items-center gap-1 font-medium transition hover:text-[color:var(--foreground)] ${
          active ? "text-[color:var(--foreground)]" : "text-[color:var(--tomo-body)]"
        } ${highlight ? "text-[color:var(--accent)]" : ""}`}
      >
        <span className="truncate">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-40"}`} aria-hidden />
      </button>
      <div
        role="separator"
        aria-label={`Resize ${label} column`}
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-[color:color-mix(in_srgb,var(--tomo-teal)_22%,transparent)] active:bg-[color:color-mix(in_srgb,var(--tomo-teal)_35%,transparent)]"
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
      className={`group cursor-pointer border-b border-[color:var(--tomo-rule-soft)] transition last:border-b-0 ${
        isActive
          ? "border-l-4 border-l-[color:var(--accent)] bg-[color:var(--accent-soft)]"
          : "hover:bg-[color:var(--tomo-navy-soft)]"
      }`}
    >
      {columns.map((col) => (
        <TableCell key={col.key} rel={rel} columnKey={col.key} isActive={isActive} />
      ))}
    </tr>
  );
}

function TableCell({ rel, columnKey, isActive }: { rel: Relationship; columnKey: SortColumn; isActive: boolean }) {
  const baseClass = "max-w-0 truncate px-3 py-2.5 text-[color:var(--tomo-body)]";
  const accentClass = "font-semibold accent-title";
  const stickyNameClass = `sticky left-0 z-[1] ${isActive ? "bg-[color:var(--accent-soft)]" : "bg-[color:var(--tomo-card)] group-hover:bg-[color:var(--tomo-navy-soft)]"} ${baseClass} ${accentClass}`;
  switch (columnKey) {
    case "name":
      return (
        <td className={stickyNameClass} title={rel.name} style={{ boxShadow: "2px 0 4px -2px color-mix(in srgb, var(--tomo-rule) 55%, transparent)" }}>
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
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_75%,var(--tomo-card))] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)]">
              {rel.openLoops}
            </span>
          ) : (
            <span className="text-xs text-[color:var(--tomo-mute)]">—</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center tomo-drawer-veil p-4"
      onClick={onClose}
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="kanban-stage-confirm-title"
      aria-describedby="kanban-stage-confirm-desc"
    >
      <div
        className="w-full max-w-sm rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-modal-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="kanban-stage-confirm-title" className="text-sm font-semibold text-[color:var(--foreground)]">
          Move to {targetStage}?
        </h3>
        <p id="kanban-stage-confirm-desc" className="mt-2 text-sm text-[color:var(--tomo-body)]">
          <span className="font-medium text-[color:var(--foreground)]">{firm}</span>
          <span className="text-[color:var(--tomo-mute)]"> · </span>
          {name}
        </p>
        <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">This updates their CRM stage. Band is not changed.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-sm text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
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
      className={`flex flex-col rounded-[var(--tomo-radius-md)] border px-3 py-3 text-left shadow-[var(--tomo-shadow-1)] transition ${
        isActive
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold accent-title">{rel.name}</p>
          <p className="truncate text-xs text-[color:var(--tomo-body)]">{rel.firm}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <MomentumChip direction={rel.momentumDirection} days={rel.daysSinceLastMeaningfulContact} />
          {rel.openLoops ? (
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_75%,var(--tomo-card))] px-2 py-0.5 text-[11px] text-[color:var(--foreground)]">
              {rel.openLoops}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-[color:var(--tomo-body)]">Last: {formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}</p>
      <p className="line-clamp-1 text-xs text-[color:var(--tomo-body)]">Next: {rel.nextMove}</p>
    </button>
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
      ? "bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-status-green)_25%,var(--tomo-rule))]"
      : direction === "Cooling"
        ? "bg-[color:var(--tomo-red-bg)] text-[color:var(--tomo-red)] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-red)_22%,var(--tomo-rule))]"
        : "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)] ring-1 ring-[color:color-mix(in_srgb,var(--tomo-status-amber)_25%,var(--tomo-rule))]";
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

function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_45%,var(--tomo-card))] px-4 py-8 text-sm text-[color:var(--tomo-body)]">
      {title}
    </div>
  );
}

