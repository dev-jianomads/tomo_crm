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
          <p className="mt-1 text-sm text-[color:var(--tomo-body)]">Static matrix for UX review — enforce server-side in production.</p>
        </div>
        <Link
          href="/settings/team"
          className="text-sm font-medium text-[color:var(--tomo-teal-muted)] transition hover:text-[color:var(--tomo-teal)]"
        >
          ← Team & seats
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))]">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">Capability</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--tomo-mute)]">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap) => (
              <tr key={cap.key} className="border-b border-[color:var(--tomo-rule-soft)] last:border-0">
                <td className="px-4 py-3 font-medium text-[color:var(--foreground)]">{cap.label}</td>
                {roles.map((r) => (
                  <td key={r} className="px-4 py-3 text-center text-[color:var(--tomo-body)]">
                    {MATRIX[cap.key][r] ? (
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)]"
                        aria-label="Allowed"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-[color:var(--tomo-rule)]" aria-label="Not allowed">
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

      <p className="text-xs text-[color:var(--tomo-mute)]">
        Owner is implicit for the creating account; you may add a separate <strong className="font-medium">Billing admin</strong> role later
        if finance and IT should differ.
      </p>
    </div>
  );
}
