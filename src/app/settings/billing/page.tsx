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
        <Link
          href="/settings/billing/manage"
          className="text-sm font-medium text-[color:var(--tomo-teal-muted)] transition hover:text-[color:var(--tomo-teal)]"
        >
          Manage subscription →
        </Link>
      </div>

      <p className="text-sm text-[color:var(--tomo-body)]">
        Manage your plan, payment method, and billing details. After checkout, return to{" "}
        <span className="font-mono text-xs">/settings/billing/manage</span>.
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
          className="inline-flex items-center rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
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
        <PlaceholderCard title="Email/Calendar permissions" body="Review consent and scopes." />
        <Link
          href="/settings/team/roles"
          className="block rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-3 py-3 shadow-[var(--tomo-shadow-1)] transition hover:border-[color:color-mix(in_srgb,var(--tomo-teal)_28%,var(--tomo-rule))] hover:bg-[color:var(--tomo-teal-tint)]"
        >
          <p className="text-sm font-semibold accent-title">Roles & permissions</p>
          <p className="text-xs text-[color:var(--tomo-body)]">Owner, Admin, and Member capabilities.</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--tomo-teal-muted)]">Open page →</p>
        </Link>
      </div>
    </div>
  );
}
