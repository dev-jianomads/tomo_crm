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
          <p className="mt-1 text-sm text-gray-600">Payment method, invoices, and plan changes (mock UI).</p>
        </div>
        <Link href="/settings/billing" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Compare plans
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Current subscription</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Plan</dt>
            <dd className="font-medium text-gray-900">{planLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Renews</dt>
            <dd className="font-medium text-gray-900">May 1, 2026 (mock)</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Trial</dt>
            <dd className="text-gray-700">Not on trial (mock)</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Seats</dt>
            <dd className="text-gray-700">3 assigned · 5 purchased (mock)</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/settings/billing" className="button-primary inline-flex justify-center px-4 py-2 text-sm">
            Change plan
          </Link>
          <Link
            href="/settings/team"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:border-gray-300"
          >
            Manage team seats
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Payment method</h3>
        <p className="mt-2 text-sm text-gray-700">
          Visa ending <span className="font-mono">4242</span> · Exp 12/2028
        </p>
        <button type="button" disabled className="button-secondary mt-3 text-sm opacity-60" title="Wire to Stripe Customer Portal">
          Update payment method
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-3 font-medium">Invoice</th>
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs text-gray-800">{row.id}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.date}</td>
                  <td className="py-2 pr-3 text-gray-700">{row.amount}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">Download links would come from Stripe in production.</p>
      </div>

      <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Cancel subscription</h3>
        <p className="mt-1 text-sm text-gray-600">
          Mock only — production should confirm end date, data retention, and seat impact before canceling.
        </p>
        {!cancelOpen ? (
          <button type="button" className="mt-3 text-sm font-medium text-rose-700 underline hover:text-rose-800" onClick={() => setCancelOpen(true)}>
            Start cancel flow…
          </button>
        ) : (
          <div className="mt-3 space-y-2 rounded-md border border-rose-200 bg-white p-3 text-sm text-gray-700">
            <p>You would confirm cancellation and see your access end date here.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
                Confirm cancel (mock)
              </button>
              <button type="button" className="text-xs font-medium text-gray-600 underline" onClick={() => setCancelOpen(false)}>
                Keep subscription
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
