"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { RelationshipDrawerV2 } from "@/components/relationship-drawer-v2";
import { RelationshipDrawerTomoRow } from "@/components/relationship-drawer-tomo-row";
import { getTomoAssistance } from "@/lib/mockTomoAssistance";
import {
  buildMockRelationshipSnapshotParagraph,
  getMockRelationshipActivityEntries,
} from "@/lib/relationshipDrawerMockActivity";
import {
  Relationship,
  formatDaysSinceContact,
  STAGE_OPTIONS,
  formatRelationshipGeography,
  formatActiveInvestmentsLabel,
  mandateFitTableLabel,
} from "@/lib/mockData";
import { useRelationships } from "@/components/relationships-provider";
import type { MomentumDirection, Stage } from "@/lib/mockData";
import {
  applyFilters,
  formatFilterSummary,
  EMPTY_CRITERIA,
  parseRaiseStandQueryParam,
  RAISE_STAND_URL_TO_BUCKET,
  validateAndMergeFilters,
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
import { formatTouchesInStageListSecondary } from "@/lib/touchesInStage";
import { NewContactModal } from "@/components/new-contact-modal";
import { ContactImportModal } from "@/components/contact-import-modal";
import { RelationshipsAdvancedFiltersModal } from "@/components/relationships-advanced-filters-modal";
import { summarizeMapping } from "@/lib/contactImportMock";
import { buildMockRelationshipFromCsvImport } from "@/lib/buildManualRelationship";
import { useRequireSession } from "@/lib/auth";
import { usePersistentState } from "@/lib/usePersistentState";
import { useFunds } from "@/components/fund-provider";
import { filterRelationshipsByFund, resolveEffectiveFundId } from "@/lib/relationshipFundScope";
import { derivePipelineFlagMock } from "@/lib/todayRaiseStands";
import { usePipelines } from "@/lib/use-pipelines";
import { toast } from "sonner";
import type { LpContactRecord } from "@/lib/lpContactApi";

type SortColumn =
  | "lp"
  | "tier"
  | "investorType"
  | "geo"
  | "activeInvestments"
  | "mandateFit"
  | "signal"
  | "ticket"
  | "days"
  | "openLoops"
  | "nextMove"
  | "owner"
  | "pipelineFlag";
type SortDirection = "asc" | "desc";

type RelationshipsViewMode = "list" | "card" | "kanban";

/** v3 control bar — grouping applies to list/cards only (Kanban is always by stage). */
type RelationshipsGroupBy = "stage" | "tier" | "owner" | "signal" | "none";

/** Hover copy for grouped list/card headers — row count vs “N of 150” summary. */
function relationshipGroupedRowHint(
  groupBy: Exclude<RelationshipsGroupBy, "none">,
  groupLabel: string,
  groupSize: number,
  filteredTotal: number,
): string {
  const dimension =
    groupBy === "stage"
      ? "pipeline stage"
      : groupBy === "tier"
        ? "tier"
        : groupBy === "owner"
          ? "owner"
          : "signal";
  return `${groupSize} of ${filteredTotal} matching LP${filteredTotal === 1 ? "" : "s"} are in ${dimension} “${groupLabel}”. All group rows sum to ${filteredTotal}.`;
}

/** List view v3 — `design/tomo_relationships_list_v3.html` */
const TABLE_COLUMNS: { key: SortColumn; label: string; highlight?: boolean }[] = [
  { key: "lp", label: "LP", highlight: true },
  { key: "tier", label: "Tier" },
  { key: "investorType", label: "Type" },
  { key: "geo", label: "Geography" },
  { key: "activeInvestments", label: "Active investments" },
  { key: "mandateFit", label: "Mandate fit" },
  { key: "signal", label: "Signal", highlight: true },
  { key: "ticket", label: "Ticket" },
  { key: "days", label: "Last touch", highlight: true },
  { key: "openLoops", label: "Loops" },
  { key: "nextMove", label: "Next move" },
  { key: "owner", label: "Owner" },
  { key: "pipelineFlag", label: "Flag" },
];

const DEFAULT_COLUMN_WIDTHS: Record<SortColumn, number> = {
  lp: 200,
  tier: 72,
  investorType: 120,
  geo: 160,
  activeInvestments: 120,
  mandateFit: 100,
  signal: 100,
  ticket: 88,
  days: 88,
  openLoops: 72,
  nextMove: 200,
  owner: 100,
  pipelineFlag: 72,
};

/** Secondary columns off by default (~1280px-friendly); Flag hidden — default sort still uses pipeline flag */
const DEFAULT_COLUMN_VISIBILITY: Record<SortColumn, boolean> = {
  lp: true,
  tier: true,
  investorType: true,
  geo: true,
  activeInvestments: true,
  mandateFit: true,
  signal: true,
  ticket: true,
  days: true,
  openLoops: true,
  nextMove: true,
  owner: false,
  pipelineFlag: false,
};

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

function RelationshipsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready } = useRequireSession();
  const { relationships, addRelationship, resetRelationshipsDemo } = useRelationships();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = useMemo(() => resolveEffectiveFundId(activeFundId, funds), [activeFundId, funds]);
  /** List/Kanban cohort label — when workspace is "All", show all LPs (not only `funds[0]`). */
  const cohortFundLabel = useMemo(
    () => (activeFundId === "all" ? "All funds" : funds.find((f) => f.id === activeFundId)?.name ?? "Fund"),
    [activeFundId, funds]
  );
  /** Resolved fund for new contacts, imports, lists — still pins to primary fund when workspace is "All". */
  const activeFundLabel = useMemo(
    () => funds.find((f) => f.id === effectiveFundId)?.name ?? "Fund",
    [funds, effectiveFundId]
  );
  const { addPipeline } = usePipelines(activeFundId);
  const [filterCriteria, setFilterCriteria] = usePersistentState<StructuredFilterCriteria>(
    "tomo-relationships-filters-v3",
    EMPTY_CRITERIA
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const focusFromUrl = searchParams.get("focus")?.trim() || null;
  const drawerRelationshipId = activeId ?? focusFromUrl;

  const closeRelationshipDrawer = useCallback(() => {
    setActiveId(null);
    const f = searchParams.get("focus")?.trim();
    if (f) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("focus");
      const qs = p.toString();
      router.replace(qs ? `/relationships?${qs}` : "/relationships");
    }
  }, [router, searchParams]);

  const raiseStandUrl = searchParams.get("raiseStand");

  const replaceRelationshipsSearchParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      const qs = p.toString();
      router.replace(qs ? `/relationships?${qs}` : "/relationships");
    },
    [router, searchParams]
  );

  useEffect(() => {
    const bucket = parseRaiseStandQueryParam(raiseStandUrl);
    if (!bucket) return;
    setFilterCriteria((prev) => validateAndMergeFilters(prev, { raiseStandBucket: bucket }) ?? prev);
  }, [raiseStandUrl, setFilterCriteria]);

  const handleFiltersChange = useCallback(
    (next: StructuredFilterCriteria) => {
      const prevBucket = filterCriteria.raiseStandBucket ?? null;
      const nextBucket = next.raiseStandBucket ?? null;
      setFilterCriteria(next);
      if (prevBucket === nextBucket) return;
      replaceRelationshipsSearchParams((p) => {
        if (!nextBucket) {
          p.delete("raiseStand");
          return;
        }
        const entry = Object.entries(RAISE_STAND_URL_TO_BUCKET).find(([, v]) => v === nextBucket);
        if (entry) p.set("raiseStand", entry[0]);
        else p.delete("raiseStand");
      });
    },
    [filterCriteria.raiseStandBucket, replaceRelationshipsSearchParams, setFilterCriteria]
  );

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
  const [sortColumn, setSortColumn] = usePersistentState<SortColumn>("tomo-relationships-sort-column-v3", "pipelineFlag");
  const [sortDirection, setSortDirection] = usePersistentState<SortDirection>("tomo-relationships-sort-direction-v3", "desc");
  const [columnWidths, setColumnWidths] = usePersistentState<Record<string, number>>(
    "tomo-relationships-column-widths-v3",
    DEFAULT_COLUMN_WIDTHS
  );
  const [columnVisibility, setColumnVisibility] = usePersistentState<Record<string, boolean>>(
    "tomo-relationships-column-visibility-v3",
    DEFAULT_COLUMN_VISIBILITY
  );
  const [relationshipOverrides, setRelationshipOverrides] = usePersistentState<
    Record<string, Partial<Relationship>>
  >("tomo-relationship-overrides-v1", {});
  const [groupBy, setGroupBy] = usePersistentState<RelationshipsGroupBy>(
    "tomo-relationships-group-by-v1",
    "stage"
  );

  const [lpDrawerProvenance, setLpDrawerProvenance] = useState<LpContactRecord["provenance"] | undefined>(undefined);
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
    return visibleKeys.has(sortColumn) ? sortColumn : visibleColumns[0]?.key ?? "lp";
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

  const clearFilters = useCallback(() => {
    setFilterCriteria(EMPTY_CRITERIA);
    replaceRelationshipsSearchParams((p) => {
      p.delete("raiseStand");
    });
  }, [replaceRelationshipsSearchParams, setFilterCriteria]);

  const activeFilterFieldCount = Object.keys(filterCriteria).length;

  const relationshipsWithOverrides = useMemo(
    () => mergeWithOverrides(relationships, relationshipOverrides),
    [relationships, relationshipOverrides]
  );

  /** LP rows for the table/kanban — full workspace when fund selector is All; otherwise single-fund cohort. */
  const relationshipsScopedFund = useMemo(() => {
    if (activeFundId === "all") return relationshipsWithOverrides;
    return filterRelationshipsByFund(relationshipsWithOverrides, effectiveFundId);
  }, [relationshipsWithOverrides, activeFundId, effectiveFundId]);

  const filtered = useMemo(
    () => applyFilters(relationshipsScopedFund, filterCriteria),
    [relationshipsScopedFund, filterCriteria]
  );

  const DESC_DEFAULT_COLS: SortColumn[] = ["days", "signal", "openLoops", "pipelineFlag"];
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
      const rankFlag = (r: Relationship) => {
        const f = derivePipelineFlagMock(r);
        return f === "red" ? 0 : f === "amber" ? 1 : 2;
      };
      switch (col) {
        case "lp":
          cmp = a.firm.localeCompare(b.firm) || a.name.localeCompare(b.name);
          break;
        case "tier":
          cmp = a.tier.localeCompare(b.tier);
          break;
        case "investorType":
          cmp = a.investorType.localeCompare(b.investorType);
          break;
        case "geo":
          cmp = formatRelationshipGeography(a).localeCompare(formatRelationshipGeography(b));
          break;
        case "activeInvestments":
          cmp = a.lastFundHistory.localeCompare(b.lastFundHistory);
          break;
        case "mandateFit":
          cmp = a.strategyFit.localeCompare(b.strategyFit);
          break;
        case "signal": {
          const rank: Record<string, number> = { "Heating up": 3, Stable: 2, Cooling: 1 };
          cmp = (rank[a.momentumDirection] ?? 0) - (rank[b.momentumDirection] ?? 0);
          break;
        }
        case "ticket":
          cmp = a.typicalCheckSize.localeCompare(b.typicalCheckSize);
          break;
        case "days":
          cmp = a.daysSinceLastMeaningfulContact - b.daysSinceLastMeaningfulContact;
          break;
        case "openLoops":
          cmp = a.openLoops - b.openLoops;
          break;
        case "nextMove":
          cmp = a.nextMove.localeCompare(b.nextMove);
          break;
        case "owner":
          cmp = a.relationshipOwner.localeCompare(b.relationshipOwner);
          break;
        case "pipelineFlag":
          cmp = rankFlag(a) - rankFlag(b);
          if (cmp === 0) cmp = b.daysSinceLastMeaningfulContact - a.daysSinceLastMeaningfulContact;
          break;
      }
      return mult * cmp;
    });
    return arr;
  }, [filtered, effectiveSortColumn, sortDirection]);

  const groupedForView = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "flat", label: "", items: sortedFiltered }];
    }
    const buckets = new Map<string, Relationship[]>();
    const order: string[] = [];
    for (const r of sortedFiltered) {
      let k: string;
      switch (groupBy) {
        case "stage":
          k = r.stage;
          break;
        case "tier":
          k = r.tier;
          break;
        case "owner":
          k = r.relationshipOwner;
          break;
        case "signal":
          k = r.momentumDirection;
          break;
        default:
          k = "Other";
      }
      if (!buckets.has(k)) {
        order.push(k);
        buckets.set(k, []);
      }
      buckets.get(k)!.push(r);
    }
    if (groupBy === "stage") {
      order.sort((x, y) => STAGE_OPTIONS.indexOf(x as Stage) - STAGE_OPTIONS.indexOf(y as Stage));
    } else {
      order.sort((x, y) => x.localeCompare(y));
    }
    return order.map((label) => ({
      key: `${groupBy}:${label}`,
      label,
      items: buckets.get(label)!,
    }));
  }, [sortedFiltered, groupBy]);

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
    () => relationshipsWithOverrides.find((r) => r.id === drawerRelationshipId) ?? null,
    [relationshipsWithOverrides, drawerRelationshipId],
  );

  const drawerActivityEntries = useMemo(() => {
    if (!active || !drawerRelationshipId) return [];
    return getMockRelationshipActivityEntries(drawerRelationshipId, active.name, active.firm);
  }, [active, drawerRelationshipId]);

  const snapshotParagraph = useMemo(() => {
    if (!active || drawerActivityEntries.length === 0) return "";
    return buildMockRelationshipSnapshotParagraph(active.name, active.firm, drawerActivityEntries);
  }, [active, drawerActivityEntries]);

  const drawerSelection = useMemo(
    () => (drawerRelationshipId ? { type: "relationship" as const, id: drawerRelationshipId } : undefined),
    [drawerRelationshipId],
  );

  useEffect(() => {
    if (!drawerRelationshipId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset provenance when drawer has no LP
      setLpDrawerProvenance(undefined);
      return;
    }
    let cancelled = false;
    fetch(`/api/lp-contacts?id=${encodeURIComponent(drawerRelationshipId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((data: { contact?: LpContactRecord } | null) => {
        if (!cancelled && data?.contact?.provenance) setLpDrawerProvenance(data.contact.provenance);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [drawerRelationshipId]);

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
      if (!drawerRelationshipId) return;
      if (
        (MANUAL_OPTIONAL_CLEAR_KEYS as readonly string[]).includes(key as string) &&
        raw.trim() === ""
      ) {
        setRelationshipOverrides((prev) => ({
          ...prev,
          [drawerRelationshipId]: { ...(prev[drawerRelationshipId] ?? {}), [key]: undefined },
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
        [drawerRelationshipId]: { ...(prev[drawerRelationshipId] ?? {}), [key]: result.value },
      }));
    },
    [drawerRelationshipId, setRelationshipOverrides]
  );

  const commitStageOverride = useCallback(
    (relationshipId: string, stage: Stage) => {
      const key = FIELD_TO_REL_KEY.stage;
      const value = normalizeFieldValue(key, stage) as Relationship["stage"];
      const rel = relationshipsWithOverrides.find((r) => r.id === relationshipId);
      const touchReset = rel
        ? {
            meaningfulTouchesSinceStageEntry: 0,
            meetingsSinceStageEntry: 0,
          }
        : {};
      setRelationshipOverrides((prev) => ({
        ...prev,
        [relationshipId]: {
          ...(prev[relationshipId] ?? {}),
          [key]: value,
          ...touchReset,
        },
      }));
    },
    [setRelationshipOverrides, relationshipsWithOverrides]
  );

  const handleKanbanMoveToStage = useCallback(
    (relationshipId: string, targetStage: Stage) => {
      const rel = relationshipsWithOverrides.find((r) => r.id === relationshipId);
      if (!rel || rel.stage === targetStage) return;
      if (targetStage === "Closed lost" || targetStage === "On hold") {
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
      listMode: "live",
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[color:var(--tomo-canvas)]">
      <PageListHeader
        className="sticky top-0 z-10 shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-canvas)] px-4 pb-4 pt-5 md:px-8"
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
      <div className="shrink-0 border-b border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-canvas)] px-4 pb-3 pt-3 md:px-8">
        <RelationshipsFilterChat
          currentFilters={filterCriteria}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex min-h-[120px] min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 md:px-8">
        <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <p className="shrink-0 text-[13px] text-[color:var(--tomo-body)]">
              {viewMode === "kanban" ? (
                <>
                  <span className="font-semibold tabular-nums text-[color:var(--tomo-navy)]">{filtered.length}</span>
                  {" "}
                  LPs
                  <span className="text-[color:var(--tomo-mute)]">
                    {" "}
                    · current raise · {cohortFundLabel}
                  </span>
                  {activeFundId === "all" ? (
                    <span className="sr-only">
                      Workspace fund selector is All; showing LPs across all funds. New contacts still default to {activeFundLabel}.
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-[color:var(--tomo-navy)]">{filtered.length}</span>
                  {" "}of{" "}
                  <span className="font-semibold tabular-nums text-[color:var(--tomo-navy)]">
                    {relationshipsScopedFund.length}
                  </span>{" "}
                  LPs
                  <span className="text-[color:var(--tomo-mute)]"> · {cohortFundLabel}</span>
                  {activeFundId === "all" ? (
                    <span className="sr-only">
                      Workspace fund selector is All; showing LPs across all funds. New contacts still default to {activeFundLabel}.
                    </span>
                  ) : null}
                </>
              )}
            </p>
            {(() => {
              const summary = formatFilterSummary(filterCriteria);
              return summary ? (
                <p
                  className="min-w-0 max-w-[min(100%,36rem)] font-[family-name:ui-serif,Georgia,'Newsreader',serif] text-[13px] italic leading-snug text-[color:var(--tomo-teal)]"
                  title={summary}
                >
                  Tomo: {summary}
                </p>
              ) : null;
            })()}
            <button
              type="button"
              onClick={() => setCreatePipelineModalOpen(true)}
              disabled={activeFilterFieldCount === 0}
              title={
                activeFilterFieldCount === 0
                  ? "Apply at least one filter to create a list from this cohort"
                  : "Save current filters as a list"
              }
              className="inline-flex shrink-0 items-center gap-1 rounded-[2px] border border-[color:var(--tomo-teal)] bg-transparent px-2.5 py-1 text-[11px] font-medium text-[color:var(--tomo-teal)] transition hover:bg-[color:var(--tomo-teal)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[color:var(--tomo-teal)]"
            >
              Create list
            </button>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {viewMode !== "kanban" ? (
              <label className="flex items-center gap-2 text-[12px] text-[color:var(--tomo-mute)]">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em]">Group</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as RelationshipsGroupBy)}
                  className="rounded-[2px] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--tomo-navy)] shadow-sm focus:border-[color:var(--tomo-teal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--tomo-teal)]"
                  aria-label="Group relationships by"
                >
                  <option value="stage">By stage</option>
                  <option value="tier">By tier</option>
                  <option value="owner">By owner</option>
                  <option value="signal">By signal</option>
                  <option value="none">None</option>
                </select>
              </label>
            ) : null}
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
        </div>
        <div
          data-relationships-group={groupBy}
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
                  {groupedForView.map((group) => (
                    <Fragment key={group.key}>
                      {group.label ? (
                        <tr className="bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_72%,var(--tomo-card))]">
                          <td
                            colSpan={visibleColumns.length}
                            className="cursor-help border-b border-[color:var(--tomo-rule-soft)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]"
                            title={
                              groupBy !== "none"
                                ? relationshipGroupedRowHint(
                                    groupBy,
                                    group.label,
                                    group.items.length,
                                    sortedFiltered.length,
                                  )
                                : undefined
                            }
                          >
                            {group.label}
                            <span className="ml-2 font-mono text-[12px] tabular-nums font-semibold normal-case tracking-normal text-[color:var(--tomo-navy)]">
                              {group.items.length}
                            </span>
                          </td>
                        </tr>
                      ) : null}
                      {group.items.map((rel) => (
                        <RelationshipTableRow
                          key={rel.id}
                          rel={rel}
                          columns={visibleColumns}
                          isActive={drawerRelationshipId === rel.id}
                          onSelect={() => setActiveId(rel.id)}
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!sortedFiltered.length ? (
                <div className="px-4 py-8 text-center text-sm text-[color:var(--tomo-mute)]">No relationships match.</div>
              ) : null}
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 gap-3 pb-2 md:grid-cols-3">
              {groupedForView.map((group) => (
                <Fragment key={group.key}>
                  {group.label ? (
                    <div
                      className="col-span-full flex cursor-help items-baseline gap-2 border-b border-[color:var(--tomo-rule-soft)] pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tomo-mute)] md:col-span-3"
                      title={
                        groupBy !== "none"
                          ? relationshipGroupedRowHint(
                              groupBy,
                              group.label,
                              group.items.length,
                              sortedFiltered.length,
                            )
                          : undefined
                      }
                    >
                      <span>{group.label}</span>
                      <span className="font-mono text-[12px] tabular-nums font-semibold normal-case tracking-normal text-[color:var(--tomo-navy)]">
                        {group.items.length}
                      </span>
                    </div>
                  ) : null}
                  {group.items.map((rel) => (
                    <RelationshipCard
                      key={rel.id}
                      rel={rel}
                      isActive={drawerRelationshipId === rel.id}
                      onSelect={() => setActiveId(rel.id)}
                    />
                  ))}
                </Fragment>
              ))}
              {!sortedFiltered.length ? <Placeholder title="No relationships match." /> : null}
            </div>
          ) : !sortedFiltered.length ? (
            <Placeholder title="No relationships match." />
          ) : (
            <RelationshipsKanbanBoard
              columns={kanbanColumns}
              activeId={drawerRelationshipId}
              onSelect={(id) => setActiveId(id)}
              onMoveToStage={handleKanbanMoveToStage}
              fundRaiseLabel={cohortFundLabel}
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
        open={Boolean(drawerRelationshipId)}
        onClose={closeRelationshipDrawer}
        hideChromeHeader
        drawerAriaLabel={active ? `LP detail · ${active.name}` : "LP detail"}
        title={active?.name ?? "Relationship"}
        panelMaxWidthClassName="max-w-[760px]"
        listContextDrawerLayout
        section1PaddingClassName="px-5 py-5 md:px-8"
        section1Content={
          active ? (
            <RelationshipDrawerV2
              relationship={active}
              snapshotParagraph={
                snapshotParagraph || "No recent interaction history for this LP (demo)."
              }
              activeFundLabel={activeFundLabel}
              onClose={closeRelationshipDrawer}
              onFieldChange={handleRelationshipManualField}
              provenance={lpDrawerProvenance}
            />
          ) : null
        }
        hideSection2
        section2MinHeightClassName="min-h-0"
        sectionBetween2AndActivity={
          drawerRelationshipId && drawerSelection ? (
            <RelationshipDrawerTomoRow
              entityKey={drawerRelationshipId}
              selection={drawerSelection}
              contextLabel={active?.name}
              assistanceContext={getTomoAssistance(drawerRelationshipId)}
              onCrmUpdate={handleCrmUpdate}
            />
          ) : undefined
        }
        section3Entries={drawerActivityEntries}
        activityLogVariant="relationships"
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
        fundId={effectiveFundId}
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
          workspaceFunds={funds}
          onClose={() => setAdvancedFiltersOpen(false)}
          onConfirm={(criteria) => handleFiltersChange(criteria)}
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
          const r = buildMockRelationshipFromCsvImport(file.name, summary, effectiveFundId);
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
  const isSticky = columnKey === "lp";
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
  const stickyNameClass = `sticky left-0 z-[1] ${isActive ? "bg-[color:var(--accent-soft)]" : "bg-[color:var(--tomo-card)] group-hover:bg-[color:var(--tomo-navy-soft)]"} px-3 py-2.5 align-top ${accentClass}`;
  switch (columnKey) {
    case "lp":
      return (
        <td
          className={stickyNameClass}
          title={`${rel.name} · ${rel.firm}`}
          style={{ boxShadow: "2px 0 4px -2px color-mix(in srgb, var(--tomo-rule) 55%, transparent)" }}
        >
          <span className="block truncate font-semibold accent-title">{rel.name}</span>
          <span className="block truncate text-[12px] font-normal leading-snug text-[color:var(--tomo-body)]">{rel.firm}</span>
        </td>
      );
    case "tier":
      return (
        <td className={baseClass} title={rel.tier}>
          {rel.tier}
        </td>
      );
    case "investorType":
      return (
        <td className={baseClass} title={rel.investorType}>
          {rel.investorType}
        </td>
      );
    case "geo":
      return (
        <td className={baseClass} title={formatRelationshipGeography(rel)}>
          {formatRelationshipGeography(rel)}
        </td>
      );
    case "activeInvestments":
      return (
        <td className={baseClass} title={rel.lastFundHistory}>
          {formatActiveInvestmentsLabel(rel.lastFundHistory)}
        </td>
      );
    case "mandateFit":
      return (
        <td className={baseClass} title={rel.strategyFit}>
          {mandateFitTableLabel(rel.strategyFit)}
        </td>
      );
    case "signal":
      return (
        <td className="px-3 py-2.5">
          <MomentumChip direction={rel.momentumDirection} days={rel.daysSinceLastMeaningfulContact} prominent />
        </td>
      );
    case "ticket":
      return (
        <td className={baseClass} title={rel.typicalCheckSize}>
          {rel.typicalCheckSize}
        </td>
      );
    case "days":
      return (
        <td className="px-3 py-2.5" title={formatTouchesInStageListSecondary(rel)}>
          <span className="block text-sm text-[color:var(--tomo-body)]">
            {formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}
          </span>
          <span className="mt-0.5 block text-[11px] text-[color:var(--tomo-mute)]">
            {formatTouchesInStageListSecondary(rel)}
          </span>
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
    case "nextMove":
      return (
        <td className={baseClass} title={rel.nextMove}>
          {rel.nextMove}
        </td>
      );
    case "owner":
      return (
        <td className={baseClass} title={rel.relationshipOwner}>
          {rel.relationshipOwner}
        </td>
      );
    case "pipelineFlag": {
      const f = derivePipelineFlagMock(rel);
      const label = f === "red" ? "Red" : f === "amber" ? "Amber" : "Green";
      const dot =
        f === "red"
          ? "bg-[color:var(--tomo-red)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-red)_18%,transparent)]"
          : f === "amber"
            ? "bg-[color:var(--tomo-status-amber)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-status-amber)_22%,transparent)]"
            : "bg-[color:var(--tomo-status-green)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-status-green)_18%,transparent)]";
      return (
        <td className={`${baseClass}`} title={`Pipeline ${label}`}>
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span>{label}</span>
          </span>
        </td>
      );
    }
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
  const flag = derivePipelineFlagMock(rel);
  const signalDotClass =
    flag === "green"
      ? "bg-[color:var(--tomo-status-green)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-status-green)_14%,transparent)]"
      : flag === "amber"
        ? "bg-[color:var(--tomo-status-amber)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-status-amber)_14%,transparent)]"
        : "bg-[color:var(--tomo-red)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--tomo-red)_14%,transparent)]";

  const tierMono =
    rel.tier === "Tier 1"
      ? "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]"
      : rel.tier === "Tier 2"
        ? "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)]"
        : "border border-[color:var(--tomo-rule)] text-[color:var(--tomo-mute)]";

  const signalPillClass =
    rel.momentumDirection === "Heating up"
      ? "bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)]"
      : rel.momentumDirection === "Cooling"
        ? "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]"
        : "bg-[color:var(--tomo-card-warm)] text-[color:var(--tomo-mute)]";

  const signalPillLabel =
    rel.momentumDirection === "Heating up"
      ? "Heating"
      : rel.momentumDirection === "Cooling"
        ? "Cooling"
        : "Quiet";

  const fitClass =
    rel.strategyFit === "Active mandate"
      ? "bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)]"
      : rel.strategyFit === "Fully allocated"
        ? "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]"
        : rel.strategyFit === "No mandate"
          ? "bg-[color:var(--tomo-red-bg)] text-[color:var(--tomo-red)]"
          : "border border-[color:var(--tomo-rule)] text-[color:var(--tomo-mute)]";

  const priorLp =
    rel.lastFundHistory === "Invested Fund I" ||
    rel.lastFundHistory === "Invested Fund II" ||
    rel.lastFundHistory === "Re-upped"
      ? "Prior LP"
      : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-2.5 rounded-[var(--tomo-radius-md)] border px-4 py-3.5 text-left shadow-[var(--tomo-shadow-1)] transition ${
        isActive
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-1 ring-[color:color-mix(in_srgb,var(--accent)_28%,transparent)]"
          : "border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_22%,var(--tomo-rule))]"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${signalDotClass}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:ui-serif,Georgia,'Newsreader',serif] text-base font-medium leading-tight text-[color:var(--tomo-navy)]">
                {rel.firm}
              </p>
              <p className="truncate text-xs text-[color:var(--tomo-body)]">
                {rel.name}
                {rel.contactSeniority ? (
                  <span className="text-[color:var(--tomo-mute)]"> · {rel.contactSeniority}</span>
                ) : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-[2px] px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-[0.1em] ${tierMono}`}>
                  {rel.tier.replace("Tier ", "T")}
                </span>
                {priorLp ? (
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-[color:var(--tomo-amber)]">
                    {priorLp}
                  </span>
                ) : null}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] ${signalPillClass}`}
            >
              {signalPillLabel} · {rel.daysSinceLastMeaningfulContact}d
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-[color:var(--tomo-rule-soft)] pt-2">
        <div className="flex gap-1.5 text-xs">
          <span className="w-9 shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
            Last
          </span>
          <span className="min-w-0 flex-1 truncate text-[color:var(--tomo-body)]">
            {formatDaysSinceContact(rel.daysSinceLastMeaningfulContact)}
          </span>
        </div>
        <div className="flex gap-1.5 text-xs">
          <span className="w-9 shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
            Stage
          </span>
          <span className="min-w-0 flex-1 truncate text-[color:var(--tomo-mute)]">
            {formatTouchesInStageListSecondary(rel)}
          </span>
        </div>
        <div className="flex gap-1.5 text-xs">
          <span className="w-9 shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)]">
            Next
          </span>
          <span className="min-w-0 flex-1 truncate text-[color:var(--tomo-body)]">{rel.nextMove}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--tomo-rule-soft)] pt-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`font-mono text-xs font-medium tabular-nums text-[color:var(--tomo-navy)] ${rel.typicalCheckSize === "Unknown" ? "font-normal text-[color:var(--tomo-mute)]" : ""}`}
          >
            {rel.typicalCheckSize === "Unknown" ? "Ticket —" : rel.typicalCheckSize}
          </span>
          <span className={`rounded-[2px] px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-[0.1em] ${fitClass}`}>
            {mandateFitTableLabel(rel.strategyFit)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-[color:var(--tomo-mute)]">
          <span>Loops</span>
          <span className="rounded-full bg-[color:var(--tomo-card-warm)] px-1.5 py-px text-[11px] font-semibold tabular-nums text-[color:var(--tomo-navy)]">
            {rel.openLoops}
          </span>
        </div>
      </div>
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

function RelationshipsPageFallback() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center bg-[color:var(--tomo-canvas)] px-6 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Loading…</p>
    </div>
  );
}

export default function RelationshipsPage() {
  return (
    <Suspense fallback={<RelationshipsPageFallback />}>
      <RelationshipsPageContent />
    </Suspense>
  );
}
