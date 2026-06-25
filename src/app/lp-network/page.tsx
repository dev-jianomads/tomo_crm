"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { LpIntroductionDetail } from "@/components/lp-network/lp-introduction-detail";
import { QualifiedLpCard } from "@/components/lp-network/qualified-lp-card";
import { PageListHeader } from "@/components/page-list-header";
import { useRequireSession } from "@/lib/auth";
import { useFunds } from "@/components/fund-provider";
import {
  getIntroStatus,
  getThreadMeta,
  LP_DISMISSED_STORAGE_KEY,
  LP_INTRO_AUTO_ADVANCE_KEY,
  LP_INTRO_STORAGE_KEY,
  threadStorageKey,
  type LpDismissedPersisted,
  type LpIntroPersisted,
} from "@/lib/lpNetworkIntroState";
import {
  countQualifiedForFund,
  getMandatesForFund,
  getQualifiedMandatesForFund,
  type IntroductionStatus,
} from "@/lib/mockLpNetwork";
import { usePersistentState } from "@/lib/usePersistentState";

export default function LpNetworkPage() {
  const { ready } = useRequireSession();
  const { funds, activeFundId } = useFunds();
  const effectiveFundId = activeFundId === "all" ? funds[0]?.id ?? "fund-1" : activeFundId;

  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [introMap, setIntroMap] = usePersistentState<LpIntroPersisted>(LP_INTRO_STORAGE_KEY, {});
  const [dismissedByFund, setDismissedByFund] = usePersistentState<LpDismissedPersisted>(LP_DISMISSED_STORAGE_KEY, {});
  const [introAutoAdvance, setIntroAutoAdvance] = usePersistentState<boolean>(LP_INTRO_AUTO_ADVANCE_KEY, false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!introAutoAdvance && autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, [introAutoAdvance]);

  const qualified = useMemo(() => getQualifiedMandatesForFund(effectiveFundId), [effectiveFundId]);
  const allForFund = useMemo(() => getMandatesForFund(effectiveFundId), [effectiveFundId]);
  const rawList = qualifiedOnly ? qualified : allForFund;

  const hiddenIds = dismissedByFund[effectiveFundId] ?? [];
  const list = useMemo(() => rawList.filter((m) => !hiddenIds.includes(m.id)), [rawList, hiddenIds]);

  const qualifiedCount = useMemo(() => countQualifiedForFund(effectiveFundId), [effectiveFundId]);

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && list.some((m) => m.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [list]);

  const selected = list.find((m) => m.id === selectedId) ?? null;

  const introStatus: IntroductionStatus = selected
    ? getIntroStatus(introMap, effectiveFundId, selected.id)
    : "eligible";

  const threadMeta = selected ? getThreadMeta(introMap, effectiveFundId, selected.id) : undefined;

  const fundDisplayName =
    activeFundId === "all" ? funds[0]?.name ?? "Fund I" : funds.find((f) => f.id === activeFundId)?.name ?? "this fund";

  const handleRequestIntroduction = useCallback(() => {
    if (!selected) return;
    const fundId = effectiveFundId;
    const mandateId = selected.id;
    const key = threadStorageKey(fundId, mandateId);
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIntroMap((prev) => ({
      ...prev,
      [key]: { status: "gp_requested", updatedAt: new Date().toISOString() },
    }));
    toast.success("Introduction requested", {
      description: "TOMO will notify the allocator. You’ll see status updates here as they respond.",
    });
    if (introAutoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setIntroMap((prev) => {
          const cur = prev[key];
          if (cur?.status !== "gp_requested") return prev;
          return {
            ...prev,
            [key]: { status: "lp_pending", updatedAt: new Date().toISOString() },
          };
        });
        toast.message("Allocator reviewing", {
          description: "Auto-advance moved this thread to Awaiting LP.",
        });
      }, 2000);
    }
  }, [effectiveFundId, introAutoAdvance, selected, setIntroMap]);

  const handleNotNow = useCallback(() => {
    if (!selected) return;
    const id = selected.id;
    setDismissedByFund((prev) => {
      const cur = prev[effectiveFundId] ?? [];
      if (cur.includes(id)) return prev;
      return { ...prev, [effectiveFundId]: [...cur, id] };
    });
    toast.message("Hidden for now", {
      description: "This mandate is removed from your list. Clear storage to see it again.",
    });
    setSelectedId(null);
  }, [effectiveFundId, selected, setDismissedByFund]);

  const handleDemoSetStatus = useCallback(
    (status: IntroductionStatus) => {
      if (!selected) return;
      const key = threadStorageKey(effectiveFundId, selected.id);
      setIntroMap((prev) => {
        if (status === "eligible") {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: { status, updatedAt: new Date().toISOString() } };
      });
    },
    [effectiveFundId, selected, setIntroMap]
  );

  const handleSimulateLpApprove = useCallback(() => {
    if (!selected) return;
    const key = threadStorageKey(effectiveFundId, selected.id);
    setIntroMap((prev) => ({
      ...prev,
      [key]: { status: "lp_approved", updatedAt: new Date().toISOString() },
    }));
    toast.success("LP approved", {
      description: "TOMO can now connect you with this allocator.",
    });
  }, [effectiveFundId, selected, setIntroMap]);

  const handleResetIntroThread = useCallback(() => {
    if (!selected) return;
    const key = threadStorageKey(effectiveFundId, selected.id);
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIntroMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.message("Intro thread cleared", { description: "You can request again from Eligible." });
  }, [effectiveFundId, selected, setIntroMap]);

  const listContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PageListHeader
        label="Qualified LP introductions"
        description="Curated allocator mandates from the TOMO LP Network. Cards stay anonymised until double opt-in — only strategy fit, cheque size, and deployment signals are shown here."
      >
        <div className="flex flex-col gap-2">
          <Link
            href="/lp-network/mandate?demo=1"
            className="text-xs font-medium text-[color:var(--accent)] hover:underline"
          >
            Preview LP mandate view →
          </Link>
          <p className="text-[11px] text-gray-500">
            Workspace fund: use the <strong>Fund</strong> control in the app header — lists filter by the same{" "}
            <code className="rounded bg-gray-100 px-1 text-[10px]">fundId</code> as the rest of the app.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={qualifiedOnly}
              onChange={(e) => setQualifiedOnly(e.target.checked)}
            />
            Qualified only (high fit + actively deploying)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={introAutoAdvance}
              onChange={(e) => setIntroAutoAdvance(e.target.checked)}
            />
            Auto-advance to Awaiting LP (2s after request)
          </label>
          </div>
          <p className="text-xs text-gray-500">
            TOMO has identified <span className="font-semibold text-gray-800">{qualifiedCount}</span> qualified LP
            {qualifiedCount === 1 ? "" : "s"} for <span className="font-medium text-gray-700">{fundDisplayName}</span>.
            Showing {list.length} in this list
            {hiddenIds.length ? ` (${hiddenIds.length} hidden with “Not now”)` : ""}.
          </p>
        </div>
      </PageListHeader>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-3">
        {list.map((m) => (
          <QualifiedLpCard
            key={m.id}
            mandate={m}
            selected={selectedId === m.id}
            onSelect={() => setSelectedId(m.id)}
            introStatus={getIntroStatus(introMap, effectiveFundId, m.id)}
          />
        ))}
        {!list.length ? (
          <LpNetworkListEmpty
            allForFundCount={allForFund.length}
            fundDisplayName={fundDisplayName}
            qualifiedOnly={qualifiedOnly}
            rawListLength={rawList.length}
          />
        ) : null}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {!selected ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">
          {list.length === 0
            ? "No mandates in the current list — adjust filters, fund, or hidden items in the list pane."
            : "Select a mandate to see fit details, request an introduction, or hide it for now."}
        </div>
      ) : (
        <LpIntroductionDetail
          mandate={selected}
          funds={funds}
          introStatus={introStatus}
          introUpdatedAt={threadMeta?.updatedAt}
          onRequestIntroduction={handleRequestIntroduction}
          onNotNow={handleNotNow}
          onSimulateLpApprove={handleSimulateLpApprove}
          onResetIntroThread={handleResetIntroThread}
          onDemoSetStatus={handleDemoSetStatus}
        />
      )}
    </div>
  );

  if (!ready) return null;

  return (
    <AppShell
      section="lp_network"
      listContent={listContent}
      detailContent={detailContent}
      contextTitle={selected?.displayLabel}
      assistantChips={["Who fits our fundraise?", "Summarize intro status", "Explain double opt-in"]}
    />
  );
}

function LpNetworkListEmpty({
  fundDisplayName,
  qualifiedOnly,
  allForFundCount,
  rawListLength,
}: {
  fundDisplayName: string;
  qualifiedOnly: boolean;
  allForFundCount: number;
  rawListLength: number;
}) {
  const base = "rounded-md border px-4 py-6 text-sm";

  if (rawListLength > 0) {
    return (
      <div className={`${base} border-amber-200 bg-amber-50/60 text-gray-800`}>
        <p className="font-medium text-gray-900">Everything in this view is hidden</p>
        <p className="mt-2 text-gray-700">
          &quot;Not now&quot; removed all visible mandates for <strong>{fundDisplayName}</strong>. Clear the{" "}
          <code className="rounded bg-white px-1 text-xs">tomo-lp-dismissed</code> entry in local storage (or reset site
          data) to see them again.
        </p>
      </div>
    );
  }

  if (qualifiedOnly && allForFundCount > 0) {
    return (
      <div className={`${base} border-dashed border-gray-200 bg-gray-50 text-gray-700`}>
        <p className="font-medium text-gray-900">No high-fit, actively deploying mandates for this fund</p>
        <p className="mt-2">
          For <strong>{fundDisplayName}</strong>, no row matches <strong>high fit + actively deploying</strong> right
          now. Turn off <strong>Qualified only</strong> to see {allForFundCount} allocator mandate
          {allForFundCount === 1 ? "" : "s"} for this fund.
        </p>
      </div>
    );
  }

  if (allForFundCount === 0) {
    return (
      <div className={`${base} border-dashed border-gray-200 bg-gray-50 text-gray-700`}>
        <p className="font-medium text-gray-900">No mandates for this fund</p>
        <p className="mt-2">
          Per-mandate <code className="rounded bg-white px-1 text-xs">eligibleFundIds</code> exclude{" "}
          <strong>{fundDisplayName}</strong> for every row, or the effective fund id has no matches. Try another fund or{" "}
          <strong>All</strong> in the header.
        </p>
      </div>
    );
  }

  return (
    <div className={`${base} border-dashed border-gray-200 bg-gray-50 text-gray-600`}>
      No mandates in this view. Try turning off &quot;Qualified only&quot;, switching fund in the header, or clearing
      hidden mandates from storage.
    </div>
  );
}
