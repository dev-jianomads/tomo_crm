"use client";

import Link from "next/link";
import { useRequireSession } from "@/lib/auth";
import { PlaceholderCard, PlanCard } from "@/components/settings/settings-widgets";

export default function SettingsBillingPage() {
  const { session } = useRequireSession();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold accent-title">Billing & Plan</h2>
        <Link href="/settings/billing/manage" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          Manage subscription →
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        UI mock only — wire to Stripe (checkout, portal, webhooks) for production. Return URLs should use these routes (e.g.{" "}
        <span className="font-mono text-xs">/settings/billing/manage</span>).
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name="Individual"
          price="$X/month"
          features={["1 user", "Contacts auto-sync", "Meeting briefs", "Follow-ups", "TOMO AI assistant"]}
          active={session?.plan === "individual"}
        />
        <PlanCard
          name="Team"
          price="$X/user/month"
          badge="14-day trial"
          features={[
            "Multiple users",
            "Shared contacts workspace",
            "Shared activity timeline",
            "Collaborative briefs",
            "TOMO AI for team",
          ]}
          active={session?.plan === "team"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-secondary">
          Manage seats
        </button>
        <Link
          href="/settings/team"
          className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-300"
        >
          Team & seats
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PlaceholderCard
          title="Approvals & automation"
          body="Decide what the agent can auto-approve vs. requires review."
        />
        <PlaceholderCard
          title="Sync rules (CRMs)"
          body="Backstop / Dynamo / DealCloud / Salesforce mapping. Coming soon."
        />
        <PlaceholderCard title="Email/Calendar permissions" body="Review consent and scopes. UI placeholder only." />
        <Link href="/settings/team/roles" className="block rounded-lg border border-gray-200 bg-white px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/30">
          <p className="text-sm font-semibold accent-title">Roles & permissions</p>
          <p className="text-xs text-gray-600">Open the team roles mock — Owner, Admin, Member capabilities.</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-blue-700">Open page →</p>
        </Link>
      </div>
    </div>
  );
}
