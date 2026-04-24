"use client";

import { useRequireSession } from "@/lib/auth";

export default function SettingsProfilePage() {
  const { session } = useRequireSession();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Profile</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Name</label>
          <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" defaultValue="Jordan Doe" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Email</label>
          <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" defaultValue={session?.email ?? ""} />
        </div>
      </div>
      <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        TOMO uses your profile to personalize briefs and messages.
      </p>
    </div>
  );
}
