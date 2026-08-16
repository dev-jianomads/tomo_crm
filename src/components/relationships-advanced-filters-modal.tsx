"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Fund } from "@/components/fund-provider";
import {
  BAND_OPTIONS,
  STAGE_OPTIONS,
  MOMENTUM_DIRECTION_OPTIONS,
  TIER_OPTIONS,
  RELATIONSHIP_OWNER_OPTIONS,
  INVESTOR_TYPE_OPTIONS,
  STRATEGY_FIT_OPTIONS,
  STRATEGY_TYPE_OPTIONS,
  LP_LOCATION_OPTIONS,
  INVESTMENT_REMIT_OPTIONS,
  TYPICAL_CHECK_SIZE_OPTIONS,
  FUND_SIZE_PREFERENCE_OPTIONS,
  SOURCE_OPTIONS,
  LAST_FUND_HISTORY_OPTIONS,
  DECISION_TIMELINE_OPTIONS,
  FISCAL_YEAR_END_OPTIONS,
  CONSULTANT_DEPENDENT_OPTIONS,
  ESG_REQUIRED_OPTIONS,
} from "@/lib/mockData";
import { relationshipFilterSchema, type StructuredFilterCriteria } from "@/lib/relationshipFilters";
import { toast } from "sonner";

type AdvancedFilterDraft = {
  band: string;
  stage: string;
  momentumDirection: string;
  tier: string;
  relationshipOwner: string;
  investorType: string;
  strategyFit: string;
  strategyType: string;
  lpLocation: string;
  investmentRemit: string;
  typicalCheckSize: string;
  fundSizePreference: string;
  source: string;
  lastFundHistory: string;
  decisionTimeline: string;
  fiscalYearEnd: string;
  consultantDependent: string;
  esgRequired: string;
  query: string;
  sourceDetail: string;
  consultantName: string;
  daysMin: string;
  daysMax: string;
  openLoopsMin: string;
  openLoopsMax: string;
  fundId: string;
};

const EMPTY_DRAFT: AdvancedFilterDraft = {
  band: "",
  stage: "",
  momentumDirection: "",
  tier: "",
  relationshipOwner: "",
  investorType: "",
  strategyFit: "",
  strategyType: "",
  lpLocation: "",
  investmentRemit: "",
  typicalCheckSize: "",
  fundSizePreference: "",
  source: "",
  lastFundHistory: "",
  decisionTimeline: "",
  fiscalYearEnd: "",
  consultantDependent: "",
  esgRequired: "",
  query: "",
  sourceDetail: "",
  consultantName: "",
  daysMin: "",
  daysMax: "",
  openLoopsMin: "",
  openLoopsMax: "",
  fundId: "",
};

function enumFromCriteria<T extends string>(v: T | T[] | "All" | undefined): string {
  if (v == null || v === "All") return "";
  if (Array.isArray(v)) return v[0] ?? "";
  return v;
}

function draftFromCriteria(c: StructuredFilterCriteria): AdvancedFilterDraft {
  const days = c.daysSinceLastMeaningfulContact;
  const loops = c.openLoops;
  return {
    band: enumFromCriteria(c.band),
    stage: enumFromCriteria(c.stage),
    momentumDirection: enumFromCriteria(c.momentumDirection),
    tier: enumFromCriteria(c.tier),
    relationshipOwner: enumFromCriteria(c.relationshipOwner),
    investorType: enumFromCriteria(c.investorType),
    strategyFit: enumFromCriteria(c.strategyFit),
    strategyType: enumFromCriteria(c.strategyType),
    lpLocation: enumFromCriteria(c.lpLocation),
    investmentRemit: enumFromCriteria(c.investmentRemit),
    typicalCheckSize: enumFromCriteria(c.typicalCheckSize),
    fundSizePreference: enumFromCriteria(c.fundSizePreference),
    source: enumFromCriteria(c.source),
    lastFundHistory: enumFromCriteria(c.lastFundHistory),
    decisionTimeline: enumFromCriteria(c.decisionTimeline),
    fiscalYearEnd: enumFromCriteria(c.fiscalYearEnd),
    consultantDependent: enumFromCriteria(c.consultantDependent),
    esgRequired: enumFromCriteria(c.esgRequired),
    query: c.query ?? "",
    sourceDetail: c.sourceDetail ?? "",
    consultantName: c.consultantName ?? "",
    daysMin: days?.min != null ? String(days.min) : "",
    daysMax: days?.max != null ? String(days.max) : "",
    openLoopsMin:
      loops && loops !== "all" && loops.min != null ? String(loops.min) : "",
    openLoopsMax:
      loops && loops !== "all" && loops.max != null ? String(loops.max) : "",
    fundId: c.fundId?.trim() ?? "",
  };
}

function parseOptionalInt(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (Number.isNaN(n)) return undefined;
  return Math.trunc(n);
}

function rawCriteriaFromDraft(d: AdvancedFilterDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const setEnum = (key: keyof AdvancedFilterDraft, value: string) => {
    const v = value.trim();
    if (v) out[key] = v;
  };

  setEnum("band", d.band);
  setEnum("stage", d.stage);
  setEnum("momentumDirection", d.momentumDirection);
  setEnum("tier", d.tier);
  setEnum("relationshipOwner", d.relationshipOwner);
  setEnum("investorType", d.investorType);
  setEnum("strategyFit", d.strategyFit);
  setEnum("strategyType", d.strategyType);
  setEnum("lpLocation", d.lpLocation);
  setEnum("investmentRemit", d.investmentRemit);
  setEnum("typicalCheckSize", d.typicalCheckSize);
  setEnum("fundSizePreference", d.fundSizePreference);
  setEnum("source", d.source);
  setEnum("lastFundHistory", d.lastFundHistory);
  setEnum("decisionTimeline", d.decisionTimeline);
  setEnum("fiscalYearEnd", d.fiscalYearEnd);
  setEnum("consultantDependent", d.consultantDependent);
  setEnum("esgRequired", d.esgRequired);

  if (d.query.trim()) out.query = d.query.trim();
  if (d.sourceDetail.trim()) out.sourceDetail = d.sourceDetail.trim();
  if (d.consultantName.trim()) out.consultantName = d.consultantName.trim();

  const dMin = parseOptionalInt(d.daysMin);
  const dMax = parseOptionalInt(d.daysMax);
  if (dMin !== undefined || dMax !== undefined) {
    const range: { min?: number; max?: number } = {};
    if (dMin !== undefined) range.min = dMin;
    if (dMax !== undefined) range.max = dMax;
    out.daysSinceLastMeaningfulContact = range;
  }

  const olMin = parseOptionalInt(d.openLoopsMin);
  const olMax = parseOptionalInt(d.openLoopsMax);
  if (olMin !== undefined || olMax !== undefined) {
    const range: { min?: number; max?: number } = {};
    if (olMin !== undefined) range.min = olMin;
    if (olMax !== undefined) range.max = olMax;
    out.openLoops = range;
  }

  if (d.fundId.trim()) out.fundId = d.fundId.trim();

  return out;
}

function numericFieldsValid(d: AdvancedFilterDraft): boolean {
  if (d.daysMin.trim() !== "" && parseOptionalInt(d.daysMin) === undefined) return false;
  if (d.daysMax.trim() !== "" && parseOptionalInt(d.daysMax) === undefined) return false;
  if (d.openLoopsMin.trim() !== "" && parseOptionalInt(d.openLoopsMin) === undefined) return false;
  if (d.openLoopsMax.trim() !== "" && parseOptionalInt(d.openLoopsMax) === undefined) return false;
  return true;
}

type EnumFieldConfig = {
  key: keyof AdvancedFilterDraft;
  label: string;
  options: readonly string[];
};

const ENUM_FIELDS: EnumFieldConfig[] = [
  { key: "band", label: "Band", options: BAND_OPTIONS },
  { key: "stage", label: "Stage", options: STAGE_OPTIONS },
  { key: "momentumDirection", label: "Momentum", options: MOMENTUM_DIRECTION_OPTIONS },
  { key: "tier", label: "Tier", options: TIER_OPTIONS },
  { key: "relationshipOwner", label: "Relationship owner", options: RELATIONSHIP_OWNER_OPTIONS },
  { key: "investorType", label: "Investor type", options: INVESTOR_TYPE_OPTIONS },
  { key: "strategyFit", label: "Strategy fit", options: STRATEGY_FIT_OPTIONS },
  { key: "strategyType", label: "Strategy type", options: STRATEGY_TYPE_OPTIONS },
  { key: "lpLocation", label: "LP location", options: LP_LOCATION_OPTIONS },
  { key: "investmentRemit", label: "Investment remit", options: INVESTMENT_REMIT_OPTIONS },
  { key: "typicalCheckSize", label: "Typical check size", options: TYPICAL_CHECK_SIZE_OPTIONS },
  { key: "fundSizePreference", label: "Fund size preference", options: FUND_SIZE_PREFERENCE_OPTIONS },
  { key: "source", label: "Source", options: SOURCE_OPTIONS },
  { key: "lastFundHistory", label: "Last fund history", options: LAST_FUND_HISTORY_OPTIONS },
  { key: "decisionTimeline", label: "Decision timeline", options: DECISION_TIMELINE_OPTIONS },
  { key: "fiscalYearEnd", label: "Fiscal year end", options: FISCAL_YEAR_END_OPTIONS },
  { key: "consultantDependent", label: "Consultant dependent", options: CONSULTANT_DEPENDENT_OPTIONS },
  { key: "esgRequired", label: "ESG required", options: ESG_REQUIRED_OPTIONS },
];

function FieldEnum({
  cfg,
  value,
  onChange,
}: {
  cfg: EnumFieldConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block tomo-field-label">{cfg.label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tomo-input py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
      >
        <option value="">Any</option>
        {cfg.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block tomo-field-label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="tomo-input py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
      />
    </label>
  );
}

export type RelationshipsAdvancedFiltersModalProps = {
  initialCriteria: StructuredFilterCriteria;
  onClose: () => void;
  /** Replaces existing filter state (Tomo + manual). */
  onConfirm: (criteria: StructuredFilterCriteria) => void;
  /** Workspace funds — cohort filter (`lp_contacts.fund_id`). */
  workspaceFunds?: Fund[];
};

export function RelationshipsAdvancedFiltersModal({
  initialCriteria,
  onClose,
  onConfirm,
  workspaceFunds,
}: RelationshipsAdvancedFiltersModalProps) {
  const [draft, setDraft] = useState(() => draftFromCriteria(initialCriteria));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const setField = (key: keyof AdvancedFilterDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    if (!numericFieldsValid(draft)) {
      toast.error("Invalid filters", { description: "Enter whole numbers for min/max fields, or leave them blank." });
      return;
    }
    const raw = rawCriteriaFromDraft(draft);
    const parsed = relationshipFilterSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error("Invalid filters", { description: "Check field values and try again." });
      return;
    }
    onConfirm(parsed.data);
    onClose();
    toast.success("Filters applied");
  };

  const handleResetForm = () => setDraft(EMPTY_DRAFT);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center tomo-modal-scrim p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-filters-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="advanced-filters-title" className="text-sm font-semibold text-[color:var(--foreground)]">
            Advanced filters
          </h2>
          <button type="button" onClick={onClose} className="tomo-drawer-icon-btn" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-[color:var(--tomo-mute)]">
            Choose criteria below. Confirm replaces all active filters (including Tomo). Leave fields as Any / empty to
            ignore them.
          </p>

          <section className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
              Search &amp; text
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldText
                label="Name / firm / geography contains"
                placeholder="Substring match on name, firm, or geography (city / country / region)"
                value={draft.query}
                onChange={(v) => setField("query", v)}
              />
              <FieldText
                label="Source detail contains"
                value={draft.sourceDetail}
                onChange={(v) => setField("sourceDetail", v)}
              />
              <FieldText
                label="Consultant name contains"
                value={draft.consultantName}
                onChange={(v) => setField("consultantName", v)}
              />
            </div>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
              Numeric ranges
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block tomo-field-label">Days since meaningful contact</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min"
                    value={draft.daysMin}
                    onChange={(e) => setField("daysMin", e.target.value)}
                    className="tomo-input min-w-0 py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max"
                    value={draft.daysMax}
                    onChange={(e) => setField("daysMax", e.target.value)}
                    className="tomo-input min-w-0 py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block tomo-field-label">Open loops count</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min"
                    value={draft.openLoopsMin}
                    onChange={(e) => setField("openLoopsMin", e.target.value)}
                    className="tomo-input min-w-0 py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max"
                    value={draft.openLoopsMax}
                    onChange={(e) => setField("openLoopsMax", e.target.value)}
                    className="tomo-input min-w-0 py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
                  />
                </div>
              </label>
            </div>
          </section>

          {workspaceFunds?.length ? (
            <section className="mb-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                Workspace cohort
              </h3>
              <label className="block max-w-md">
                <span className="mb-1 block tomo-field-label">Fund raised against (LP cohort)</span>
                <select
                  value={draft.fundId}
                  onChange={(e) => setField("fundId", e.target.value)}
                  className="tomo-input py-1.5 text-sm shadow-[var(--tomo-shadow-1)]"
                >
                  <option value="">Any fund</option>
                  {workspaceFunds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Fields</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ENUM_FIELDS.map((cfg) => (
                <FieldEnum
                  key={cfg.key}
                  cfg={cfg}
                  value={draft[cfg.key]}
                  onChange={(v) => setField(cfg.key, v)}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <button
            type="button"
            onClick={handleResetForm}
            className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--tomo-body)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Clear all fields
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
            >
              Cancel
            </button>
            <button type="button" onClick={handleConfirm} className="button-primary rounded-lg px-3 py-1.5 text-xs font-semibold">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
