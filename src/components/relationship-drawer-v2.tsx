"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRelationships } from "@/components/relationships-provider";
import { isOffChannelActiveAt } from "@/lib/signals/offChannelRules";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Relationship } from "@/lib/mockData";
import {
  formatActiveInvestmentsLabel,
  formatRelationshipGeography,
  mandateFitTableLabel,
} from "@/lib/mockData";
import { derivePipelineFlagMock } from "@/lib/todayRaiseStands";
import { RelationshipCrmForm } from "@/components/relationship-crm-form";
import {
  buildBehaviouralSignals,
  buildMockOpenLoopRows,
  buildSignalEvidence,
  mockDaysInCurrentStage,
  mockDaysInPriorStage,
  pipelineFlagLabel,
} from "@/lib/relationshipDrawerMocks";
import type { FieldProvenance } from "@/lib/lpContactApi";

function tierBadgeClass(tier: Relationship["tier"]): string {
  if (tier === "Tier 1") return "bg-[color:var(--tomo-teal-evidence-bg)] text-[color:var(--tomo-teal)]";
  if (tier === "Tier 2") return "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)]";
  return "border border-[color:var(--tomo-rule)] text-[color:var(--tomo-mute)]";
}

function ProvHint({ label, p }: { label: string; p?: FieldProvenance }) {
  const title = p ? `${p.source} · ${p.updatedAt.slice(0, 10)}` : undefined;
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      {p ? (
        <span title={title} className="cursor-help font-mono text-[8px] uppercase tracking-[0.14em] text-[color:var(--tomo-teal)]">
          ●
        </span>
      ) : null}
    </span>
  );
}

export type RelationshipDrawerV2Props = {
  relationship: Relationship;
  snapshotParagraph: string;
  /** Active workspace fund label — “fund being raised against” */
  activeFundLabel: string;
  onClose: () => void;
  onFieldChange: (relationshipKey: keyof Relationship | string, rawValue: string) => void;
  /** Optional provenance from `/api/lp-contacts` detail merge */
  provenance?: {
    pipeline_stage?: FieldProvenance;
    pipeline_flag?: FieldProvenance;
    mandate_fit?: FieldProvenance;
    typical_check?: FieldProvenance;
  };
};

export function RelationshipDrawerV2({
  relationship: rel,
  snapshotParagraph,
  activeFundLabel,
  onClose,
  onFieldChange,
  provenance,
}: RelationshipDrawerV2Props) {
  const [crmOpen, setCrmOpen] = useState(false);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [offBusy, setOffBusy] = useState(false);
  const { patchOffChannel } = useRelationships();

  const evidence = buildSignalEvidence(rel);
  const flag = derivePipelineFlagMock(rel);
  const offActive = isOffChannelActiveAt(rel.offChannelActiveUntil ?? null, new Date());
  const offUntilLabel = rel.offChannelActiveUntil?.slice(0, 10) ?? "";

  const runOffChannel = async (action: "set" | "extend" | "clear") => {
    setOffBusy(true);
    try {
      await patchOffChannel(rel.id, action);
      toast.success(action === "clear" ? "Off-channel cleared" : "Off-channel window updated");
    } catch {
      toast.error("Could not update off-channel");
    } finally {
      setOffBusy(false);
    }
  };
  const daysIn = mockDaysInCurrentStage(rel);
  const prior = mockDaysInPriorStage(rel);
  const loops = buildMockOpenLoopRows(rel);
  const signals = buildBehaviouralSignals(rel);

  const priorFundLine =
    rel.lastFundHistory === "New prospect"
      ? "— Not a prior-fund LP (demo tag)"
      : `Prior participation · ${rel.lastFundHistory}`;

  const prov = provenance ?? {
    pipeline_stage: { source: "CRM", updatedAt: "2026-05-01T08:00:00.000Z" },
    pipeline_flag: { source: "Tomo", updatedAt: "2026-05-10T07:00:00.000Z" },
    mandate_fit: { source: "CRM", updatedAt: "2026-03-12T15:30:00.000Z" },
    typical_check: { source: "CRM", updatedAt: "2026-04-24T11:05:00.000Z" },
  };

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-start justify-between gap-3 border-b border-[color:var(--tomo-rule-soft)] pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:ui-serif,Georgia,'Newsreader',serif] text-2xl font-medium leading-tight tracking-tight text-[color:var(--tomo-navy)]">
            {rel.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[color:var(--tomo-body)]">
            {rel.contactSeniority ? <span>{rel.contactSeniority}</span> : null}
            {rel.contactSeniority ? <span className="text-[color:var(--tomo-rule)]">·</span> : null}
            <span className="text-[color:var(--tomo-mute)]">{rel.firm}</span>
            <span className="text-[color:var(--tomo-rule)]">·</span>
            <span className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] ${tierBadgeClass(rel.tier)}`}>
              {rel.tier}
            </span>
            {rel.lastFundHistory !== "New prospect" ? (
              <span className="rounded-[2px] bg-[color:var(--tomo-status-amber-bg)] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-status-amber-text)]">
                Prior LP
              </span>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={onClose} className="tomo-drawer-icon-btn shrink-0" aria-label="Close drawer">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>

      <aside
        className="rounded-[0_var(--tomo-radius-md)_var(--tomo-radius-md)_0] border-l-[3px] border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)] px-4 py-3"
        aria-labelledby="sig-evidence-label"
      >
        <p id="sig-evidence-label" className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">
          {evidence.label}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--tomo-navy)]">{evidence.body}</p>
      </aside>

      <section aria-labelledby="rel-snapshot-heading">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
          <span id="rel-snapshot-heading">Snapshot</span>
          <span className="rounded-[2px] bg-[color:var(--tomo-teal-evidence-bg)] px-1.5 py-px text-[8px] tracking-[0.14em] text-[color:var(--tomo-teal)]">
            Computed
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--tomo-navy)]">{snapshotParagraph}</p>
        <p className="mt-2 text-[11px] italic text-[color:var(--tomo-mute)]">Synthesised from the five most recent interactions (demo).</p>
      </section>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-5 py-4">
        <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
          <ProvHint label="Pipeline state" p={prov.pipeline_stage} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Stage</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-[2px] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card-warm)] px-2.5 py-1 text-xs font-medium text-[color:var(--tomo-navy)]">
              {rel.stage}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              Pipeline flag <span className="text-[color:var(--tomo-teal)]">Derived</span>
            </p>
            <p
              title={prov.pipeline_flag ? `${prov.pipeline_flag.source} · ${prov.pipeline_flag.updatedAt}` : undefined}
              className={`mt-1 inline-flex rounded-full px-2 py-1 font-mono text-[11px] font-medium ${
                flag === "green"
                  ? "bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)]"
                  : flag === "amber"
                    ? "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]"
                    : "bg-[color:var(--tomo-red-bg)] text-[color:var(--tomo-red)]"
              }`}
            >
              {pipelineFlagLabel(flag)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Tier</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--tomo-navy)]">{rel.tier}</p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              Days in stage <span className="text-[color:var(--tomo-teal)]">Derived</span>
            </p>
            <p className="mt-1 font-mono text-sm tabular-nums text-[color:var(--tomo-body)]">{daysIn}d</p>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              Days in prior stage <span className="text-[color:var(--tomo-teal)]">Derived</span>
            </p>
            <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
              <span className="font-mono tabular-nums">{prior.days}d</span>
              <span className="ml-2 text-xs italic text-[color:var(--tomo-mute)]">in {prior.stageHint}</span>
            </p>
          </div>
          <div className="min-w-0 sm:col-span-3">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Owner</p>
            <p className="mt-1 text-sm text-[color:var(--tomo-navy)]">{rel.relationshipOwner}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-5 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">Off-channel</span>
          {offActive ? (
            <span className="rounded-full bg-[color:var(--tomo-teal-tint)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--tomo-teal)]">
              Active until {offUntilLabel}
            </span>
          ) : (
            <span className="rounded-full bg-[color:var(--tomo-navy-soft)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]">
              Inactive
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-[color:var(--tomo-body)]">
          Mark when you are working this LP outside monitored channels so silence-class drift signals and Gone quiet rows pause
          for the window.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={offBusy}
            onClick={() => void runOffChannel("set")}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-teal)] px-2.5 py-1.5 font-mono text-[10px] font-medium text-[color:var(--tomo-teal)] transition enabled:hover:bg-[color:var(--tomo-teal-tint)] disabled:opacity-50"
          >
            Mark 30d
          </button>
          <button
            type="button"
            disabled={offBusy || !offActive}
            onClick={() => void runOffChannel("extend")}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-2.5 py-1.5 font-mono text-[10px] font-medium text-[color:var(--tomo-mute)] transition enabled:hover:border-[color:var(--tomo-teal)] enabled:hover:text-[color:var(--tomo-teal)] disabled:opacity-50"
          >
            +30d
          </button>
          <button
            type="button"
            disabled={offBusy || !offActive}
            onClick={() => void runOffChannel("clear")}
            className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] px-2.5 py-1.5 font-mono text-[10px] font-medium text-[color:var(--tomo-mute)] transition enabled:hover:border-[color:var(--tomo-red)] enabled:hover:text-[color:var(--tomo-red)] disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-5 py-4">
        <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">Pipeline data</div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              <ProvHint label="Mandate fit" p={prov.mandate_fit} />
            </p>
            <p className="mt-1 inline-flex rounded-[2px] bg-[color:var(--tomo-status-green-bg)] px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--tomo-status-green)]">
              {mandateFitTableLabel(rel.strategyFit)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[color:var(--tomo-mute)]">Captured on demo timeline · verify in CRM</p>
          </div>
          <div>
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">
              <ProvHint label="Expected commitment (tier)" p={prov.typical_check} />
            </p>
            <p className="mt-1 font-mono text-sm font-medium tabular-nums text-[color:var(--tomo-navy)]">{rel.typicalCheckSize}</p>
            <p className="mt-1 font-mono text-[11px] text-[color:var(--tomo-mute)]">Demo maps from typical check · production: currency field</p>
          </div>
          <div>
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Prior fund investor</p>
            <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{priorFundLine}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Active investments</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-[2px] bg-[color:var(--tomo-status-amber-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[color:var(--tomo-status-amber-text)]">
                {formatActiveInvestmentsLabel(rel.lastFundHistory)}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Fund raised against</p>
            <p className="mt-1 text-sm font-medium text-[color:var(--tomo-navy)]">{activeFundLabel}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[color:var(--tomo-mute)]">Workspace selector cohort · SRS `lp_contacts.fund_id`</p>
          </div>
          <div className="md:col-span-2">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Geography</p>
            <p className="mt-1 text-sm text-[color:var(--tomo-body)]">{formatRelationshipGeography(rel)}</p>
          </div>
        </div>
      </div>

      {loops.length > 0 ? (
        <div>
          <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--tomo-mute)]">
            Open loops &amp; commitments <span className="font-normal normal-case tracking-normal text-[color:var(--tomo-navy)]">({loops.length})</span>
          </div>
          <div className="divide-y divide-[color:var(--tomo-rule-soft)] rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4">
            {loops.map((row) => (
              <div key={row.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5">
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold ${
                    row.who === "GP" ? "bg-[color:var(--tomo-navy-soft)] text-[color:var(--tomo-navy)]" : "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]"
                  }`}
                >
                  {row.who}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-[color:var(--tomo-navy)]">
                    <span className="mr-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--tomo-mute)]">{row.who}</span>
                    {row.text}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={`font-mono text-[11px] tabular-nums ${row.overdue ? "text-[color:var(--tomo-red)]" : "text-[color:var(--tomo-mute)]"}`}
                  >
                    {row.dueLabel}
                  </span>
                  <span
                    className={`font-mono text-[9px] font-medium uppercase tracking-[0.1em] ${
                      row.status === "open" ? "text-[color:var(--tomo-status-amber-text)]" : "text-[color:var(--tomo-status-green)]"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]">
        <button
          type="button"
          onClick={() => setSignalsOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[color:var(--tomo-navy-soft)]"
          aria-expanded={signalsOpen}
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-navy)]">
            Behavioural signals <span className="font-normal text-[color:var(--tomo-mute)]">(derived)</span>
          </span>
          <ChevronDownIcon className={`h-4 w-4 text-[color:var(--tomo-mute)] transition ${signalsOpen ? "rotate-180" : ""}`} />
        </button>
        {signalsOpen ? (
          <div className="border-t border-[color:var(--tomo-rule-soft)] px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {signals.map((s) => (
                <div key={s.name} className="min-w-0">
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--tomo-mute)]">{s.name}</p>
                  <p className="mt-0.5 text-sm text-[color:var(--tomo-navy)]">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]">
        <button
          type="button"
          onClick={() => setCrmOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-[color:var(--tomo-card-warm)]"
          aria-expanded={crmOpen}
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Show full CRM record</span>
          <ChevronDownIcon className={`h-4 w-4 text-[color:var(--tomo-mute)] transition ${crmOpen ? "rotate-180" : ""}`} />
        </button>
        {crmOpen ? (
          <div className="border-t border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-canvas)] px-3 py-3 dark:bg-[color:var(--tomo-navy-soft)]">
            <RelationshipCrmForm relationship={rel} onFieldChange={onFieldChange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
