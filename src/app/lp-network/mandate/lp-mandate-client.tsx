"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";
import { DEMO_LP_MANDATE_ID, getMandateById } from "@/lib/mockLpNetwork";

/**
 * Prototype LP-facing mandate view (magic-link experience is not wired).
 * Uses a fixed demo row from the LP network seed (`DEMO_LP_MANDATE_ID`).
 */
export function LpMandateClient() {
  const { ready } = useRequireSession();
  const searchParams = useSearchParams();
  const demo = searchParams.get("demo") === "1";

  const mandate = getMandateById(DEMO_LP_MANDATE_ID);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PageListHeader
        label="Your mandate"
        description="How allocators see their registered preferences in the LP Network prototype. Editing is local-only until the dashboard is wired to a backend."
      >
        {demo ? (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 ring-1 ring-amber-200">
            Demo mode — you are viewing a sample mandate, not live production data.
          </p>
        ) : null}
        <Link
          href="/lp-network"
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          ← Back to GP introductions
        </Link>
      </PageListHeader>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 text-sm text-gray-700">
        {!mandate ? (
          <p className="text-gray-600">Demo mandate not found.</p>
        ) : (
          <ul className="space-y-3">
            <MandateField label="Display label (GP anonymised)" value={mandate.displayLabel} />
            <MandateField label="Strategy preferences" value={mandate.strategyTags.join(", ")} />
            <MandateField label="Typical check size" value={mandate.checkSizeBand} />
            <MandateField label="Geography" value={mandate.geographyLabel} />
            <MandateField label="Deployment pace" value={mandate.deploymentStatus} />
            <MandateField label="Manager stage preference" value={mandate.managerStagePreference} />
            <MandateField label="Hard constraints" value={mandate.hardConstraints} />
            <MandateField label="What makes an introduction worth your time?" value={mandate.introWorthTime} />
            <MandateField label="Fit score (curator)" value={mandate.fitScore} />
          </ul>
        )}
        <p className="mt-6 text-xs text-gray-500">
          Phase 3+: editable form and magic-link auth. This page is list-only layout to match AppShell IA.
        </p>
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4 text-sm text-gray-600">
      <p className="text-xs uppercase tracking-wide text-gray-500">Introductions to you</p>
      <p className="mt-2 text-gray-700">
        When GPs request intros, pending and completed introductions would appear here with statuses (Pending /
        Meeting booked / In diligence / Closed).
      </p>
      <p className="mt-4 text-xs text-gray-500">Not mocked yet — empty state for Phase 2 routing only.</p>
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="lp_network"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle="LP mandate (demo)"
      assistantChips={["Summarize my mandate", "What can GPs see?", "Update preferences"]}
    />
  );
}

function MandateField({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-gray-900">{value}</p>
    </li>
  );
}
