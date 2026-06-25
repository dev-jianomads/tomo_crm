"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import {
  formatIntroUpdatedAt,
  introStatusToLpPortalPill,
  LP_INTRO_STORAGE_KEY,
  parseThreadKey,
  type LpIntroPersisted,
} from "@/lib/lpNetworkIntroState";
import {
  CHECK_SIZE_OPTIONS,
  DEMO_LP_MANDATE_ID,
  DEPLOYMENT_OPTIONS,
  getMandateById,
  LP_GEOGRAPHY_OPTIONS,
  MANAGER_STAGE_OPTIONS,
  STRATEGY_TAGS_POOL,
  type CheckSizeBand,
  type DeploymentStatus,
  type IntroductionStatus,
  type ManagerStagePreference,
  type NetworkLpMandate,
} from "@/lib/mockLpNetwork";
import { usePersistentState } from "@/lib/usePersistentState";

const DEMO_MANDATE_PATCH_KEY = "tomo-lp-demo-mandate";

/** Local overrides for the single demo LP row (Phase 3 edit flow). */
export type DemoMandatePatch = Partial<
  Pick<
    NetworkLpMandate,
    "hardConstraints" | "introWorthTime" | "checkSizeBand" | "deploymentStatus" | "geographyLabel" | "managerStagePreference"
  >
> & {
  strategyTags?: string[];
};

type LpIntroSampleRow = { id: string; fundLabel: string; status: string; detail: string };

const MOCK_INTROS_TO_LP: LpIntroSampleRow[] = [
  {
    id: "intro-demo-1",
    fundLabel: "Sample GP — Flagship Fund II",
    status: "Pending",
    detail: "Long/short equity · $5–25M · Awaiting your response",
  },
  {
    id: "intro-demo-2",
    fundLabel: "Sample GP — Credit sleeve",
    status: "Meeting booked",
    detail: "Private credit · Intro accepted last week",
  },
];

/**
 * Prototype LP-facing mandate view (magic-link experience is not wired).
 * Uses a fixed demo row from the LP network seed (`DEMO_LP_MANDATE_ID`).
 */
export function LpMandateClient() {
  const { ready } = useRequireSession();
  const { funds } = useFunds();

  const base = getMandateById(DEMO_LP_MANDATE_ID);
  const [patch, setPatch] = usePersistentState<DemoMandatePatch>(DEMO_MANDATE_PATCH_KEY, {});
  const [introMap, setIntroMap] = usePersistentState<LpIntroPersisted>(LP_INTRO_STORAGE_KEY, {});

  const merged = useMemo((): NetworkLpMandate | null => {
    if (!base) return null;
    return {
      ...base,
      ...patch,
      strategyTags: patch.strategyTags ?? base.strategyTags,
    };
  }, [base, patch]);

  const [editOpen, setEditOpen] = useState(false);

  const persistedIntros = useMemo(() => {
    const rows: {
      storageKey: string;
      fundLabel: string;
      statusLabel: string;
      detail: string;
      updatedAt: string;
      rawStatus: IntroductionStatus;
    }[] = [];
    const tagLine =
      merged?.strategyTags.slice(0, 4).join(" · ") ?? base?.strategyTags.slice(0, 4).join(" · ") ?? "—";
    for (const [key, meta] of Object.entries(introMap)) {
      const parsed = parseThreadKey(key);
      if (!parsed || parsed.mandateId !== DEMO_LP_MANDATE_ID) continue;
      if (meta.status === "eligible") continue;
      const fundLabel = funds.find((f) => f.id === parsed.fundId)?.name ?? parsed.fundId;
      rows.push({
        storageKey: key,
        fundLabel,
        statusLabel: introStatusToLpPortalPill(meta.status),
        detail: `${tagLine} · Updated ${formatIntroUpdatedAt(meta.updatedAt)}`,
        updatedAt: meta.updatedAt,
        rawStatus: meta.status,
      });
    }
    rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return rows;
  }, [introMap, funds, merged, base]);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PageListHeader
        label="Your mandate"
        description="Allocators registered in the LP Network can review and refresh how they show up to GPs before any double opt-in."
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            disabled={!merged}
            className="rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-300"
          >
            Edit mandate
          </button>
          <Link
            href="/lp-network"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            ← GP introductions
          </Link>
        </div>
      </PageListHeader>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 text-sm text-gray-700">
        {!merged ? (
          <p className="text-gray-600">Mandate not found.</p>
        ) : (
          <div className="space-y-3">
            <MandateAccordionSection title="Strategy & sleeve" defaultOpen>
              <p className="text-xs text-gray-500">What you allocate to (GPs see tags, not this narrative).</p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {merged.strategyTags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--accent-ink)]"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </MandateAccordionSection>

            <MandateAccordionSection title="Sizing & geography">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Typical check size</dt>
                  <dd className="font-medium text-gray-900">{merged.checkSizeBand}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Geography</dt>
                  <dd className="font-medium text-gray-900">{merged.geographyLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Deployment pace</dt>
                  <dd className="font-medium text-gray-900">{merged.deploymentStatus}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Manager stage preference</dt>
                  <dd className="font-medium text-gray-900">{merged.managerStagePreference}</dd>
                </div>
              </dl>
            </MandateAccordionSection>

            <MandateAccordionSection title="Constraints & what makes an intro worthwhile" defaultOpen>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Hard constraints</p>
                  <p className="mt-1 text-gray-800">{merged.hardConstraints}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">What makes an introduction worth your time?</p>
                  <p className="mt-1 text-gray-800">{merged.introWorthTime}</p>
                </div>
              </div>
            </MandateAccordionSection>

            <p className="text-xs text-gray-500">
              Curator fields (e.g. fit score) are not shown on the allocator-facing dashboard in production; they stay
              on the TOMO side.
            </p>
          </div>
        )}
      </div>

      {editOpen && merged ? (
        <EditMandateModal
          initial={merged}
          onClose={() => setEditOpen(false)}
          onSave={(next) => {
            setPatch(next);
            setEditOpen(false);
            toast.success("Mandate updated", { description: "Saved locally in this browser only." });
          }}
        />
      ) : null}
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Introductions to you</p>
      <p className="mt-1 text-sm text-gray-600">
        Request an introduction from the{" "}
        <Link href="/lp-network" className="font-medium text-[color:var(--accent)] hover:underline">
          LP Network
        </Link>{" "}
        page to see it here.
      </p>

      {persistedIntros.length ? (
        <ul className="mt-4 space-y-3">
          {persistedIntros.map((row) => (
            <li
              key={row.storageKey}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{row.fundLabel}</p>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  {row.statusLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{row.detail}</p>
              {row.rawStatus === "gp_requested" || row.rawStatus === "lp_pending" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
                    onClick={() => {
                      setIntroMap((prev) => ({
                        ...prev,
                        [row.storageKey]: { status: "lp_approved", updatedAt: new Date().toISOString() },
                      }));
                      toast.success("You approved the intro", { description: "GP view will show LP approved." });
                    }}
                  >
                    Approve intro
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => {
                      setIntroMap((prev) => {
                        const next = { ...prev };
                        delete next[row.storageKey];
                        return next;
                      });
                      toast.message("Passed", { description: "Thread cleared for this mandate." });
                    }}
                  >
                    Pass
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-600">
          No live intro rows yet. Use the GP introductions page with this allocator selected, then{" "}
          <strong>Request introduction</strong>.
        </p>
      )}

      <p className="mt-6 text-xs font-medium text-gray-500">Static examples</p>
      <ul className="mt-2 space-y-2">
        {MOCK_INTROS_TO_LP.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-xs text-gray-600"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-800">{row.fundLabel}</p>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
                {row.status}
              </span>
            </div>
            <p className="mt-1">{row.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="lp_network"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle="LP mandate"
      assistantChips={["Summarize my mandate", "What can GPs see?", "Update preferences"]}
    />
  );
}

function MandateAccordionSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-xs font-normal text-gray-400 group-open:hidden">Show</span>
          <span className="hidden text-xs font-normal text-gray-400 group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="border-t border-gray-100 px-3 py-3">{children}</div>
    </details>
  );
}

function EditMandateModal({
  initial,
  onClose,
  onSave,
}: {
  initial: NetworkLpMandate;
  onClose: () => void;
  onSave: (patch: DemoMandatePatch) => void;
}) {
  const [checkSizeBand, setCheckSizeBand] = useState<CheckSizeBand>(initial.checkSizeBand);
  const [geographyLabel, setGeographyLabel] = useState(initial.geographyLabel);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>(initial.deploymentStatus);
  const [managerStagePreference, setManagerStagePreference] = useState<ManagerStagePreference>(
    initial.managerStagePreference
  );
  const [hardConstraints, setHardConstraints] = useState(initial.hardConstraints);
  const [introWorthTime, setIntroWorthTime] = useState(initial.introWorthTime);
  const [tags, setTags] = useState<Set<string>>(() => new Set(initial.strategyTags));

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center tomo-modal-scrim p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-modal-shadow)]"
        role="dialog"
        aria-labelledby="edit-mandate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h2 id="edit-mandate-title" className="text-base font-semibold text-[color:var(--foreground)]">
            Update my preferences
          </h2>
          <p className="mt-1 text-xs text-[color:var(--tomo-mute)]">
            Same question buckets as the mandate form — stored locally for the prototype.
          </p>
        </div>

        <div className="space-y-4 px-4 py-4 text-sm">
          <div>
            <p className="tomo-field-label mb-2">Strategy preferences</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STRATEGY_TAGS_POOL.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-1.5 text-xs text-[color:var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={tags.has(tag)}
                    onChange={() => toggleTag(tag)}
                    className="rounded border-[color:var(--tomo-rule)] text-[color:var(--accent)] focus:ring-[color:var(--tomo-teal)]"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block tomo-field-label">Typical check size</span>
            <select
              className="tomo-input mt-1 py-2 text-sm"
              value={checkSizeBand}
              onChange={(e) => setCheckSizeBand(e.target.value as CheckSizeBand)}
            >
              {CHECK_SIZE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block tomo-field-label">Geographic preferences</span>
            <select
              className="tomo-input mt-1 py-2 text-sm"
              value={geographyLabel}
              onChange={(e) => setGeographyLabel(e.target.value)}
            >
              {LP_GEOGRAPHY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block tomo-field-label">Deployment pace</span>
            <select
              className="tomo-input mt-1 py-2 text-sm"
              value={deploymentStatus}
              onChange={(e) => setDeploymentStatus(e.target.value as DeploymentStatus)}
            >
              {DEPLOYMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block tomo-field-label">Manager stage preference</span>
            <select
              className="tomo-input mt-1 py-2 text-sm"
              value={managerStagePreference}
              onChange={(e) => setManagerStagePreference(e.target.value as ManagerStagePreference)}
            >
              {MANAGER_STAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block tomo-field-label">Hard constraints</span>
            <textarea
              className="tomo-input mt-1 resize-y py-2 text-sm"
              rows={3}
              value={hardConstraints}
              onChange={(e) => setHardConstraints(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block tomo-field-label">What makes an introduction worth your time?</span>
            <textarea
              className="tomo-input mt-1 resize-y py-2 text-sm"
              rows={3}
              value={introWorthTime}
              onChange={(e) => setIntroWorthTime(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (tags.size === 0) {
                toast.error("Pick at least one strategy tag");
                return;
              }
              onSave({
                checkSizeBand,
                geographyLabel,
                deploymentStatus,
                managerStagePreference,
                hardConstraints,
                introWorthTime,
                strategyTags: [...tags],
              });
            }}
            className="button-primary rounded-lg px-3 py-2 text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
