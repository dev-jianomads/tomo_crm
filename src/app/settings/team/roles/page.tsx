"use client";

import Link from "next/link";

const CAPABILITIES = [
  { key: "billing", label: "Manage billing & plans" },
  { key: "members", label: "Invite / remove users" },
  { key: "roles", label: "Assign Admin vs Member" },
  { key: "integrations", label: "Connect CRMs & data sources" },
  { key: "workspace", label: "Edit workspace defaults" },
  { key: "export", label: "Export workspace data" },
] as const;

const MATRIX: Record<(typeof CAPABILITIES)[number]["key"], Record<"Owner" | "Admin" | "Member", boolean>> = {
  billing: { Owner: true, Admin: true, Member: false },
  members: { Owner: true, Admin: true, Member: false },
  roles: { Owner: true, Admin: true, Member: false },
  integrations: { Owner: true, Admin: true, Member: false },
  workspace: { Owner: true, Admin: true, Member: false },
  export: { Owner: true, Admin: false, Member: false },
};

export default function SettingsTeamRolesPage() {
  const roles = ["Owner", "Admin", "Member"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold accent-title">Roles & permissions</h2>
          <p className="mt-1 text-sm text-gray-600">Static matrix for UX review — enforce server-side in production.</p>
        </div>
        <Link href="/settings/team" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Team & seats
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Capability</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap) => (
              <tr key={cap.key} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{cap.label}</td>
                {roles.map((r) => (
                  <td key={r} className="px-4 py-3 text-center text-gray-700">
                    {MATRIX[cap.key][r] ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-green-700" aria-label="Allowed">
                        ✓
                      </span>
                    ) : (
                      <span className="text-gray-300" aria-label="Not allowed">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Owner is implicit for the creating account; you may add a separate <strong className="font-medium">Billing admin</strong> role later
        if finance and IT should differ.
      </p>
    </div>
  );
}
