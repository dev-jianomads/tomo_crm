"use client";

import { useEffect, useState } from "react";
import {
  CONSULTANT_DEPENDENT_OPTIONS,
  DECISION_TIMELINE_OPTIONS,
  ESG_REQUIRED_OPTIONS,
  FISCAL_YEAR_END_OPTIONS,
  FUND_SIZE_PREFERENCE_OPTIONS,
  INVESTMENT_REMIT_OPTIONS,
  INVESTOR_TYPE_OPTIONS,
  LAST_FUND_HISTORY_OPTIONS,
  LP_LOCATION_OPTIONS,
  MOMENTUM_DIRECTION_OPTIONS,
  RELATIONSHIP_OWNER_OPTIONS,
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  STRATEGY_FIT_OPTIONS,
  STRATEGY_TYPE_OPTIONS,
  TIER_OPTIONS,
  TYPICAL_CHECK_SIZE_OPTIONS,
} from "@/lib/mockData";
import { CONTACT_SENIORITY_OPTIONS } from "@/lib/mockData";
import {
  buildRelationshipFromManualContact,
  defaultStep2,
  type ManualContactStep1,
  type ManualContactStep2,
} from "@/lib/buildManualRelationship";
import type { Relationship } from "@/lib/mockData";
import {
  defaultStep1,
  isStep1Valid,
  step1FromPrefill,
  step2FromPrefill,
  type RelationshipDraftPrefill,
} from "@/lib/relationship-draft";

export type RelationshipDraftModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (relationship: Relationship) => void;
  /** Workspace fund (`useFunds`); new rows default to this fund. */
  fundId?: string;
  /** Modal title — default "New contact". */
  title?: string;
  /** Prefill from contact suggestion or inbound parse (§3.3a). */
  prefill?: RelationshipDraftPrefill | null;
  /** Shown under title when creating from a suggestion. */
  subtitle?: string;
};

const inputClass =
  "tomo-input mt-1 text-sm text-[color:var(--foreground)] focus-visible:border-[color:var(--tomo-teal)]";
const labelClass = "tomo-field-label block";

export function RelationshipDraftModal({
  open,
  onClose,
  onConfirm,
  fundId,
  title = "New contact",
  prefill = null,
  subtitle,
}: RelationshipDraftModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<ManualContactStep1>(() => defaultStep1());
  const [step2, setStep2] = useState<ManualContactStep2>(() => defaultStep2());

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStep1(step1FromPrefill(prefill));
    setStep2(step2FromPrefill(prefill));
  }, [open, prefill]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const step1Valid = isStep1Valid(step1);

  const handleConfirm = () => {
    if (!step1Valid) return;
    onConfirm(buildRelationshipFromManualContact(step1, step2, { fundId }));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center tomo-drawer-veil p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="relationship-draft-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-modal-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="relationship-draft-modal-title" className="text-sm font-semibold text-[color:var(--foreground)]">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
          {subtitle ??
            (step === 1
              ? "Required — name, firm, primary email, tier, stage, owner."
              : "Optional details — defaults work; adjust before saving.")}
        </p>

        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass} htmlFor="rd-name">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                id="rd-name"
                className={inputClass}
                value={step1.name}
                onChange={(e) => setStep1((s) => ({ ...s, name: e.target.value }))}
                autoFocus
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-firm">
                Firm <span className="text-red-600">*</span>
              </label>
              <input
                id="rd-firm"
                className={inputClass}
                value={step1.firm}
                onChange={(e) => setStep1((s) => ({ ...s, firm: e.target.value }))}
                placeholder="Organization"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-email">
                Primary email <span className="text-red-600">*</span>
              </label>
              <input
                id="rd-email"
                type="email"
                className={inputClass}
                value={step1.primaryEmail}
                onChange={(e) => setStep1((s) => ({ ...s, primaryEmail: e.target.value }))}
                placeholder="name@firm.com"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="rd-tier">
                  Tier <span className="text-red-600">*</span>
                </label>
                <select
                  id="rd-tier"
                  className={inputClass}
                  value={step1.tier}
                  onChange={(e) =>
                    setStep1((s) => ({ ...s, tier: e.target.value as ManualContactStep1["tier"] }))
                  }
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rd-stage">
                  Stage <span className="text-red-600">*</span>
                </label>
                <select
                  id="rd-stage"
                  className={inputClass}
                  value={step1.stage}
                  onChange={(e) =>
                    setStep1((s) => ({ ...s, stage: e.target.value as ManualContactStep1["stage"] }))
                  }
                >
                  {STAGE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-owner">
                Relationship owner <span className="text-red-600">*</span>
              </label>
              <select
                id="rd-owner"
                className={inputClass}
                value={step1.relationshipOwner}
                onChange={(e) =>
                  setStep1((s) => ({
                    ...s,
                    relationshipOwner: e.target.value as ManualContactStep1["relationshipOwner"],
                  }))
                }
              >
                {RELATIONSHIP_OWNER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="rd-next">
                Next move
              </label>
              <input
                id="rd-next"
                className={inputClass}
                value={step2.nextMove}
                onChange={(e) => setStep2((s) => ({ ...s, nextMove: e.target.value }))}
                placeholder="e.g. Book intro call"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-days">
                Days since last contact
              </label>
              <input
                id="rd-days"
                type="number"
                min={0}
                className={inputClass}
                value={step2.daysSinceLastMeaningfulContact}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, daysSinceLastMeaningfulContact: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-open">
                Open loops
              </label>
              <input
                id="rd-open"
                type="number"
                min={0}
                max={99}
                className={inputClass}
                value={step2.openLoops}
                onChange={(e) => setStep2((s) => ({ ...s, openLoops: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-mom">
                Momentum
              </label>
              <select
                id="rd-mom"
                className={inputClass}
                value={step2.momentumDirection}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    momentumDirection: e.target.value as ManualContactStep2["momentumDirection"],
                  }))
                }
              >
                {MOMENTUM_DIRECTION_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-seniority">
                Contact seniority
              </label>
              <select
                id="rd-seniority"
                className={inputClass}
                value={step2.contactSeniority}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    contactSeniority: e.target.value as ManualContactStep2["contactSeniority"],
                  }))
                }
              >
                <option value="">—</option>
                {CONTACT_SENIORITY_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-inv">
                Investor type
              </label>
              <select
                id="rd-inv"
                className={inputClass}
                value={step2.investorType}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, investorType: e.target.value as ManualContactStep2["investorType"] }))
                }
              >
                {INVESTOR_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-sf">
                Strategy fit
              </label>
              <select
                id="rd-sf"
                className={inputClass}
                value={step2.strategyFit}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, strategyFit: e.target.value as ManualContactStep2["strategyFit"] }))
                }
              >
                {STRATEGY_FIT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-st">
                Strategy type
              </label>
              <select
                id="rd-st"
                className={inputClass}
                value={step2.strategyType}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, strategyType: e.target.value as ManualContactStep2["strategyType"] }))
                }
              >
                {STRATEGY_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-loc">
                Location
              </label>
              <select
                id="rd-loc"
                className={inputClass}
                value={step2.lpLocation}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, lpLocation: e.target.value as ManualContactStep2["lpLocation"] }))
                }
              >
                {LP_LOCATION_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-remit">
                Investment remit
              </label>
              <select
                id="rd-remit"
                className={inputClass}
                value={step2.investmentRemit}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    investmentRemit: e.target.value as ManualContactStep2["investmentRemit"],
                  }))
                }
              >
                {INVESTMENT_REMIT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-check">
                Typical check size
              </label>
              <select
                id="rd-check"
                className={inputClass}
                value={step2.typicalCheckSize}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    typicalCheckSize: e.target.value as ManualContactStep2["typicalCheckSize"],
                  }))
                }
              >
                {TYPICAL_CHECK_SIZE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-fundpref">
                Fund size preference
              </label>
              <select
                id="rd-fundpref"
                className={inputClass}
                value={step2.fundSizePreference}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    fundSizePreference: e.target.value as ManualContactStep2["fundSizePreference"],
                  }))
                }
              >
                {FUND_SIZE_PREFERENCE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-source">
                Source
              </label>
              <select
                id="rd-source"
                className={inputClass}
                value={step2.source}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, source: e.target.value as ManualContactStep2["source"] }))
                }
              >
                {SOURCE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-lfh">
                Last fund history
              </label>
              <select
                id="rd-lfh"
                className={inputClass}
                value={step2.lastFundHistory}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    lastFundHistory: e.target.value as ManualContactStep2["lastFundHistory"],
                  }))
                }
              >
                {LAST_FUND_HISTORY_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-dt">
                Decision timeline
              </label>
              <select
                id="rd-dt"
                className={inputClass}
                value={step2.decisionTimeline}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    decisionTimeline: e.target.value as ManualContactStep2["decisionTimeline"],
                  }))
                }
              >
                {DECISION_TIMELINE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-fye">
                Fiscal year end
              </label>
              <select
                id="rd-fye"
                className={inputClass}
                value={step2.fiscalYearEnd}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    fiscalYearEnd: e.target.value as ManualContactStep2["fiscalYearEnd"],
                  }))
                }
              >
                {FISCAL_YEAR_END_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-cons">
                Consultant-dependent
              </label>
              <select
                id="rd-cons"
                className={inputClass}
                value={step2.consultantDependent}
                onChange={(e) =>
                  setStep2((s) => ({
                    ...s,
                    consultantDependent: e.target.value as ManualContactStep2["consultantDependent"],
                  }))
                }
              >
                {CONSULTANT_DEPENDENT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rd-esg">
                ESG required
              </label>
              <select
                id="rd-esg"
                className={inputClass}
                value={step2.esgRequired}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, esgRequired: e.target.value as ManualContactStep2["esgRequired"] }))
                }
              >
                {ESG_REQUIRED_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="button-primary rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button type="button" onClick={handleConfirm} className="button-primary rounded-md px-3 py-1.5 text-sm">
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
