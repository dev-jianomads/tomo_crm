"use client";

import Link from "next/link";
import { useState } from "react";
import { useRequireSession } from "@/lib/auth";

const MOCK_INVOICES = [
  { id: "inv_001", date: "2026-03-01", amount: "$X.00", status: "Paid" },
  { id: "inv_002", date: "2026-02-01", amount: "$X.00", status: "Paid" },
  { id: "inv_003", date: "2026-01-01", amount: "$X.00", status: "Paid" },
] as const;

export default function SettingsBillingManagePage() {
  const { session } = useRequireSession();
  const [cancelOpen, setCancelOpen] = useState(false);

  const planLabel = session?.plan === "team" ? "Team" : "Individual";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold accent-title">Manage subscription</h2>
          <p className="mt-1 text-sm text-[color:var(--tomo-body)]">Payment method, invoices, and plan changes (mock UI).</p>
        </div>
        <Link
          href="/settings/billing"
          className="text-sm font-medium text-[color:var(--tomo-teal-muted)] transition hover:text-[color:var(--tomo-teal)]"
        >
          ← Compare plans
        </Link>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Current subscription</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="tomo-field-label block">Plan</dt>
            <dd className="font-medium text-[color:var(--foreground)]">{planLabel}</dd>
          </div>
          <div>
            <dt className="tomo-field-label block">Renews</dt>
            <dd className="font-medium text-[color:var(--foreground)]">May 1, 2026 (mock)</dd>
          </div>
          <div>
            <dt className="tomo-field-label block">Trial</dt>
            <dd className="text-[color:var(--tomo-body)]">Not on trial (mock)</dd>
          </div>
          <div>
            <dt className="tomo-field-label block">Seats</dt>
            <dd className="text-[color:var(--tomo-body)]">3 assigned · 5 purchased (mock)</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/settings/billing" className="button-primary inline-flex justify-center px-4 py-2 text-sm">
            Change plan
          </Link>
          <Link
            href="/settings/team"
            className="inline-flex items-center justify-center rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          >
            Manage team seats
          </Link>
        </div>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Payment method</h3>
        <p className="mt-2 text-sm text-[color:var(--tomo-body)]">
          Visa ending <span className="font-mono">4242</span> · Exp 12/2028
        </p>
        <button type="button" disabled className="button-secondary mt-3 text-sm opacity-60" title="Wire to Stripe Customer Portal">
          Update payment method
        </button>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Invoices</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--tomo-rule-soft)] text-xs uppercase tracking-wide text-[color:var(--tomo-mute)]">
                <th className="pb-2 pr-3 font-medium">Invoice</th>
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((row) => (
                <tr key={row.id} className="border-b border-[color:var(--tomo-rule-soft)] last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs text-[color:var(--foreground)]">{row.id}</td>
                  <td className="py-2 pr-3 text-[color:var(--tomo-body)]">{row.date}</td>
                  <td className="py-2 pr-3 text-[color:var(--tomo-body)]">{row.amount}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-[color:var(--tomo-status-green-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--tomo-status-green)]">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[color:var(--tomo-mute)]">Download links would come from Stripe in production.</p>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-red)_22%,var(--tomo-rule))] bg-[color:var(--tomo-red-bg)] p-4">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Cancel subscription</h3>
        <p className="mt-1 text-sm text-[color:var(--tomo-body)]">
          Mock only — production should confirm end date, data retention, and seat impact before canceling.
        </p>
        {!cancelOpen ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-[color:var(--tomo-red)] underline hover:opacity-90"
            onClick={() => setCancelOpen(true)}
          >
            Start cancel flow…
          </button>
        ) : (
          <div className="mt-3 space-y-2 rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-red)_35%,var(--tomo-rule))] bg-[color:var(--tomo-card)] p-3 text-sm text-[color:var(--tomo-body)] shadow-[var(--tomo-shadow-1)]">
            <p>You would confirm cancellation and see your access end date here.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-[var(--tomo-radius-md)] bg-[color:var(--tomo-red)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              >
                Confirm cancel (mock)
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--tomo-mute)] underline hover:text-[color:var(--foreground)]"
                onClick={() => setCancelOpen(false)}
              >
                Keep subscription
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
