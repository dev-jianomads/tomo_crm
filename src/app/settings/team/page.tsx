"use client";

import Link from "next/link";
import { useState } from "react";

type MockMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member";
  status: "Active" | "Pending";
};

const INITIAL_MEMBERS: MockMember[] = [
  { id: "1", name: "Jordan Doe", email: "jordan@example.com", role: "Owner", status: "Active" },
  { id: "2", name: "Alex Chen", email: "alex@example.com", role: "Admin", status: "Active" },
  { id: "3", name: "Sam Rivera", email: "sam@example.com", role: "Member", status: "Active" },
];

export default function SettingsTeamPage() {
  const [members, setMembers] = useState<MockMember[]>(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState("");

  const purchased = 5;
  const assigned = members.filter((m) => m.status === "Active").length;

  const invite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setMembers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "—",
        email,
        role: "Member",
        status: "Pending",
      },
    ]);
    setInviteEmail("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold accent-title">Team & seats</h2>
          <p className="mt-1 text-sm text-[color:var(--tomo-body)]">Invite colleagues and see seat usage (mock — no backend).</p>
        </div>
        <Link
          href="/settings/team/roles"
          className="text-sm font-medium text-[color:var(--tomo-teal-muted)] transition hover:text-[color:var(--tomo-teal)]"
        >
          Roles & permissions →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
        <div>
          <p className="tomo-field-label block">Seats</p>
          <p className="text-lg font-semibold text-[color:var(--foreground)]">
            {assigned} assigned · {purchased} purchased
          </p>
        </div>
        <div className="h-10 w-px bg-[color:var(--tomo-rule-soft)]" aria-hidden />
        <Link
          href="/settings/billing/manage"
          className="text-sm text-[color:var(--tomo-teal-muted)] transition hover:text-[color:var(--tomo-teal)]"
        >
          Add or remove seats in subscription →
        </Link>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Invite people</h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-body)]">Invites consume a seat when accepted (product rule — mock).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            className="tomo-input min-w-[200px] flex-1 text-sm shadow-none"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="button" className="button-primary px-4" onClick={invite}>
            Send invite (mock)
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] shadow-[var(--tomo-shadow-1)]">
        <div className="border-b border-[color:var(--tomo-rule-soft)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Members</h3>
        </div>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] text-xs uppercase tracking-wide text-[color:var(--tomo-mute)]">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-[color:var(--tomo-rule-soft)] last:border-0">
                <td className="px-4 py-2.5 text-[color:var(--foreground)]">{m.name}</td>
                <td className="px-4 py-2.5 text-[color:var(--tomo-body)]">{m.email}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-md bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_75%,var(--tomo-card))] px-2 py-0.5 text-xs font-medium text-[color:var(--foreground)]">
                    {m.role}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.status === "Active"
                        ? "bg-[color:var(--tomo-status-green-bg)] text-[color:var(--tomo-status-green)]"
                        : "bg-[color:var(--tomo-status-amber-bg)] text-[color:var(--tomo-status-amber-text)]"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
