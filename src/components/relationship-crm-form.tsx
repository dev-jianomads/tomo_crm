"use client";

import type { Relationship } from "@/lib/mockData";
import {
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
  BAND_OPTIONS,
  CONTACT_SENIORITY_OPTIONS,
  formatDaysSinceContact,
} from "@/lib/mockData";

const fieldInput =
  "mt-0.5 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none";
const labelCls = "text-[11px] font-medium uppercase tracking-wide text-gray-500";

function stallRiskFor(r: Relationship): string {
  const atRisk = r.band === "Stalled" || r.momentumDirection === "Cooling";
  if (!atRisk) return "Low";
  return r.daysSinceLastMeaningfulContact >= 30 ? "High" : "Medium";
}

function LabeledText({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldInput}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldInput}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledOptionalEnumSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={fieldInput}>
        <option value="">Not set</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white px-3 py-2.5" aria-labelledby={`crm-group-${title}`}>
      <h3 id={`crm-group-${title}`} className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export type RelationshipCrmFormProps = {
  relationship: Relationship;
  /** Raw string from controls; parent normalizes with `normalizeFieldValue`. */
  onFieldChange: (relationshipKey: keyof Relationship | string, rawValue: string) => void;
};

/**
 * Editable CRM fields for the relationship drawer — grouped and ordered: identity,
 * prioritisation, targeting, sequencing, optional extras.
 */
export function RelationshipCrmForm({ relationship: r, onFieldChange }: RelationshipCrmFormProps) {
  return (
    <div className="space-y-3" data-testid="relationship-crm-form">
      <Group title="Identity">
        <LabeledText label="Name" value={r.name} onChange={(v) => onFieldChange("name", v)} />
        <LabeledText label="Firm" value={r.firm} onChange={(v) => onFieldChange("firm", v)} />
      </Group>

      <Group title="Prioritisation">
        <LabeledText
          label="Days since meaningful contact"
          value={String(r.daysSinceLastMeaningfulContact)}
          onChange={(v) => onFieldChange("daysSinceLastMeaningfulContact", v)}
          type="number"
        />
        <LabeledSelect label="Stage" value={r.stage} onChange={(v) => onFieldChange("stage", v)} options={STAGE_OPTIONS} />
        <LabeledSelect
          label="Signal"
          value={r.momentumDirection}
          onChange={(v) => onFieldChange("momentumDirection", v)}
          options={MOMENTUM_DIRECTION_OPTIONS}
        />
        <LabeledSelect label="Band" value={r.band} onChange={(v) => onFieldChange("band", v)} options={BAND_OPTIONS} />
        <LabeledSelect label="Tier" value={r.tier} onChange={(v) => onFieldChange("tier", v)} options={TIER_OPTIONS} />
        <LabeledSelect
          label="Owner"
          value={r.relationshipOwner}
          onChange={(v) => onFieldChange("relationshipOwner", v)}
          options={RELATIONSHIP_OWNER_OPTIONS}
        />
        <LabeledText label="Open loops" value={String(r.openLoops)} onChange={(v) => onFieldChange("openLoops", v)} type="number" />
        <div className="sm:col-span-2 lg:col-span-3">
          <LabeledText label="Next move" value={r.nextMove} onChange={(v) => onFieldChange("nextMove", v)} />
        </div>
        <div className="rounded-md bg-gray-50 px-2 py-2 sm:col-span-2 lg:col-span-3">
          <p className={labelCls}>Stall risk (derived)</p>
          <p className="text-sm text-gray-900">{stallRiskFor(r)}</p>
        </div>
      </Group>

      <Group title="Targeting">
        <LabeledSelect
          label="Investor type"
          value={r.investorType}
          onChange={(v) => onFieldChange("investorType", v)}
          options={INVESTOR_TYPE_OPTIONS}
        />
        <LabeledSelect
          label="Strategy fit"
          value={r.strategyFit}
          onChange={(v) => onFieldChange("strategyFit", v)}
          options={STRATEGY_FIT_OPTIONS}
        />
        <LabeledSelect
          label="Strategy type"
          value={r.strategyType}
          onChange={(v) => onFieldChange("strategyType", v)}
          options={STRATEGY_TYPE_OPTIONS}
        />
        <LabeledSelect
          label="Location"
          value={r.lpLocation}
          onChange={(v) => onFieldChange("lpLocation", v)}
          options={LP_LOCATION_OPTIONS}
        />
        <LabeledSelect
          label="Investment remit"
          value={r.investmentRemit}
          onChange={(v) => onFieldChange("investmentRemit", v)}
          options={INVESTMENT_REMIT_OPTIONS}
        />
        <LabeledSelect
          label="Typical check"
          value={r.typicalCheckSize}
          onChange={(v) => onFieldChange("typicalCheckSize", v)}
          options={TYPICAL_CHECK_SIZE_OPTIONS}
        />
        <LabeledSelect
          label="Fund size pref"
          value={r.fundSizePreference}
          onChange={(v) => onFieldChange("fundSizePreference", v)}
          options={FUND_SIZE_PREFERENCE_OPTIONS}
        />
      </Group>

      <Group title="Sequencing">
        <LabeledSelect label="Source" value={r.source} onChange={(v) => onFieldChange("source", v)} options={SOURCE_OPTIONS} />
        <LabeledText
          label="Source detail"
          value={r.sourceDetail ?? ""}
          onChange={(v) => onFieldChange("sourceDetail", v)}
        />
        <LabeledSelect
          label="Last fund"
          value={r.lastFundHistory}
          onChange={(v) => onFieldChange("lastFundHistory", v)}
          options={LAST_FUND_HISTORY_OPTIONS}
        />
        <LabeledSelect
          label="Decision timeline"
          value={r.decisionTimeline}
          onChange={(v) => onFieldChange("decisionTimeline", v)}
          options={DECISION_TIMELINE_OPTIONS}
        />
        <LabeledSelect
          label="Fiscal year end"
          value={r.fiscalYearEnd}
          onChange={(v) => onFieldChange("fiscalYearEnd", v)}
          options={FISCAL_YEAR_END_OPTIONS}
        />
        <LabeledSelect
          label="Consultant"
          value={r.consultantDependent}
          onChange={(v) => onFieldChange("consultantDependent", v)}
          options={CONSULTANT_DEPENDENT_OPTIONS}
        />
        <LabeledText
          label="Consultant name"
          value={r.consultantName ?? ""}
          onChange={(v) => onFieldChange("consultantName", v)}
        />
        <LabeledSelect label="ESG required" value={r.esgRequired} onChange={(v) => onFieldChange("esgRequired", v)} options={ESG_REQUIRED_OPTIONS} />
      </Group>

      <Group title="Other">
        <LabeledText
          label="Last meeting date"
          value={r.lastMeetingDate ?? ""}
          onChange={(v) => onFieldChange("lastMeetingDate", v)}
        />
        <LabeledOptionalEnumSelect
          label="Contact seniority"
          value={r.contactSeniority}
          onChange={(v) => onFieldChange("contactSeniority", v)}
          options={CONTACT_SENIORITY_OPTIONS}
        />
        <LabeledOptionalEnumSelect
          label="Last fund check size"
          value={r.lastFundCheckSize}
          onChange={(v) => onFieldChange("lastFundCheckSize", v)}
          options={TYPICAL_CHECK_SIZE_OPTIONS}
        />
      </Group>

      <p className="text-[11px] text-gray-500">
        Days since contact (display): {formatDaysSinceContact(r.daysSinceLastMeaningfulContact)}
      </p>
    </div>
  );
}
