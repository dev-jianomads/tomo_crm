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
          <p className="mt-1 text-sm text-gray-600">Invite colleagues and see seat usage (mock — no backend).</p>
        </div>
        <Link href="/settings/team/roles" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          Roles & permissions →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Seats</p>
          <p className="text-lg font-semibold text-gray-900">
            {assigned} assigned · {purchased} purchased
          </p>
        </div>
        <div className="h-10 w-px bg-gray-200" aria-hidden />
        <Link href="/settings/billing/manage" className="text-sm text-blue-700 hover:text-blue-800">
          Add or remove seats in subscription →
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Invite people</h3>
        <p className="mt-1 text-xs text-gray-600">Invites consume a seat when accepted (product rule — mock).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            className="min-w-[200px] flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="button" className="button-primary px-4" onClick={invite}>
            Send invite (mock)
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Members</h3>
        </div>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 text-gray-900">{m.name}</td>
                <td className="px-4 py-2.5 text-gray-700">{m.email}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">{m.role}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.status === "Active" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
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
