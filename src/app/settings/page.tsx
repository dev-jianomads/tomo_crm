"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useRequireSession } from "@/lib/auth";

const sections = ["Profile", "Integrations", "Messaging", "Notifications", "Billing & Plan"] as const;

export default function SettingsPage() {
  const { ready, session } = useRequireSession();
  const [active, setActive] = useState<(typeof sections)[number]>("Profile");

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Settings</p>
        <p className="text-sm text-gray-600">Workspace controls</p>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setActive(section)}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
              active === section ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  );

  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {active === "Profile" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <p className="text-sm text-gray-600">Manage your name, email, and workspace identity.</p>
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
      )}

      {active === "Integrations" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-600">Manage calendar, contacts, and email connections.</p>
          <IntegrationRow title="Calendar" status="Connected" />
          <IntegrationRow title="Contacts" status="Connected" />
          <IntegrationRow title="Email" status="Optional" />
        </div>
      )}

      {active === "Messaging" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Messaging</h2>
          <p className="text-sm text-gray-600">Slack and Telegram connections.</p>
          <IntegrationRow title="Slack" status="Connected" />
          <IntegrationRow title="Telegram" status="Onboarding link sent" />
        </div>
      )}

      {active === "Notifications" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-600">Routing for recaps, briefs, follow-ups.</p>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Configure routing per channel. Slack/Telegram must be connected to enable those switches.
          </div>
        </div>
      )}

      {active === "Billing & Plan" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Billing & Plan</h2>
          <p className="text-sm text-gray-600">Current plan and upgrade options.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard name="Individual" price="$X/month" features={["1 user", "Contacts auto-sync", "Meeting briefs", "Follow-ups", "TOMO AI assistant"]} active={session?.plan === "individual"} />
            <PlanCard
              name="Team"
              price="$X/user/month"
              badge="14-day trial"
              features={["Multiple users", "Shared contacts workspace", "Shared activity timeline", "Collaborative briefs", "TOMO AI for team"]}
              active={session?.plan === "team"}
            />
          </div>
          <button className="button-secondary w-fit">Manage seats</button>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return <AppShell section="settings" listContent={listContent} detailContent={detailContent} contextTitle={`${active} settings`} />;
}

function IntegrationRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-600">Manage connection</p>
      </div>
      <span className="text-xs text-gray-500">{status}</span>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  badge,
  active,
}: {
  name: string;
  price: string;
  features: string[];
  badge?: string;
  active?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-700">{price}</p>
        </div>
        {badge ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{badge}</span> : null}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button className="button-primary mt-3 w-full">{active ? "Current plan" : "Select plan"}</button>
    </div>
  );
}

