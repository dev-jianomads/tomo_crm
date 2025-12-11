"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { clearSession, useRequireSession } from "@/lib/auth";
import { connectAffinity, createGoogleSheet, startGoogleAuth } from "@/lib/integrations";
import { usePersistentState } from "@/lib/storage";
import { OnboardingState } from "@/lib/types";

const sections = ["Profile", "Integrations", "Messaging", "Notifications", "Billing & Plan"] as const;

export default function SettingsPage() {
  const { ready, session } = useRequireSession();
  const router = useRouter();
  const [active, setActive] = useState<(typeof sections)[number]>("Profile");
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>("tomo-onboarding", {
    calendarConnected: false,
    contactsConnected: false,
    emailConnected: false,
    slackConnected: false,
    telegramConnected: false,
    affinityConnected: false,
    googleSheetsConnected: false,
    googleSheetsAuthed: false,
    notifications: {},
    completed: false,
  });
  const [affinityListId, setAffinityListId] = useState(integrations.affinityListId ?? "");
  const [affinityToken, setAffinityToken] = useState("");
  const [sheetName, setSheetName] = useState(integrations.googleSheetsFilename ?? generatePresetSheetName());
  const [savingAffinity, setSavingAffinity] = useState(false);
  const [authingSheet, setAuthingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);

  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Settings</p>
        <p className="text-sm text-gray-600">Workspace controls</p>
        <button
          onClick={() => {
            clearSession();
            router.replace("/auth");
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300"
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Sign out
        </button>
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
          <p className="text-sm text-gray-600">Manage calendar, contacts, email, Affinity, and Sheets connections.</p>
          <IntegrationRow title="Calendar" status={integrations.calendarConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Contacts" status={integrations.contactsConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Email" status={integrations.emailConnected ? "Connected" : "Optional"} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/icons/affinity.svg" alt="Affinity" className="h-5 w-5" />
                  <p className="text-base font-semibold text-gray-900">Affinity CRM</p>
                </div>
                {integrations.affinityConnected ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Connected ✓</span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Not connected</span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">Sync people and companies from Affinity into Tomo.</p>
              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase tracking-wide text-gray-500">List ID</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={affinityListId}
                  onChange={(e) => setAffinityListId(e.target.value)}
                  placeholder="e.g. 12345"
                />
              </div>
              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase tracking-wide text-gray-500">API token</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={affinityToken}
                  onChange={(e) => setAffinityToken(e.target.value)}
                  placeholder="Paste your token"
                />
                <p className="text-xs text-gray-500">Stored securely server-side in production (mocked locally here).</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="button-primary flex-1"
                  disabled={savingAffinity || !affinityListId.trim() || !affinityToken.trim()}
                  onClick={async () => {
                    if (!affinityListId.trim() || !affinityToken.trim()) return;
                    setSavingAffinity(true);
                    try {
                      const res = await connectAffinity({ listId: affinityListId.trim(), apiToken: affinityToken.trim() });
                      if (res.ok) {
                        setIntegrations((prev) => ({
                          ...prev,
                          affinityConnected: true,
                          affinityListId: res.listId,
                          affinityTokenLast4: res.tokenLast4,
                        }));
                        setAffinityToken("");
                      }
                    } finally {
                      setSavingAffinity(false);
                    }
                  }}
                >
                  {savingAffinity ? "Saving..." : integrations.affinityConnected ? "Update connection" : "Connect"}
                </button>
                {integrations.affinityConnected ? (
                  <button
                    className="button-secondary"
                    onClick={() => {
                      setIntegrations((prev) => ({
                        ...prev,
                        affinityConnected: false,
                        affinityListId: undefined,
                        affinityTokenLast4: undefined,
                      }));
                    }}
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
              {integrations.affinityConnected ? (
                <p className="mt-2 text-xs text-green-700">
                  Connected to list {integrations.affinityListId ?? affinityListId}. Token ending {integrations.affinityTokenLast4 ?? "••••"}.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/icons/google-sheets.svg" alt="Google Sheets" className="h-5 w-5" />
                  <p className="text-base font-semibold text-gray-900">Google Sheets</p>
                </div>
                {integrations.googleSheetsConnected ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Ready ✓</span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Not connected</span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">Authenticate and create the preset sheet name before confirming.</p>
              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase tracking-wide text-gray-500">Sheet filename</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  onClick={async () => {
                    setAuthingSheet(true);
                    try {
                      const res = await startGoogleAuth();
                      if (res.authUrl) window.open(res.authUrl, "_blank");
                      setIntegrations((prev) => ({ ...prev, googleSheetsAuthed: true }));
                    } finally {
                      setAuthingSheet(false);
                    }
                  }}
                >
                  {authingSheet ? "Opening Google..." : integrations.googleSheetsAuthed ? "Re-auth Google" : "Sign in with Google"}
                </button>
                <button
                  className="button-primary"
                  disabled={savingSheet || !sheetName.trim()}
                  onClick={async () => {
                    if (!sheetName.trim()) return;
                    setSavingSheet(true);
                    try {
                      const res = await createGoogleSheet(sheetName.trim());
                      if (res.ok) {
                        setIntegrations((prev) => ({
                          ...prev,
                          googleSheetsConnected: true,
                          googleSheetsFilename: res.filename,
                          googleSheetsAuthed: true,
                        }));
                      }
                    } finally {
                      setSavingSheet(false);
                    }
                  }}
                >
                  {savingSheet ? "Creating..." : integrations.googleSheetsConnected ? "Update filename" : "Create sheet"}
                </button>
              </div>
              {integrations.googleSheetsConnected ? (
                <p className="mt-2 text-xs text-green-700">Google Sheets ready. Filename {integrations.googleSheetsFilename ?? sheetName}.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {active === "Messaging" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Messaging</h2>
          <p className="text-sm text-gray-600">Slack and Telegram connections.</p>
          <IntegrationRow title="Slack" status={integrations.slackConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Telegram" status={integrations.telegramConnected ? "Onboarding link sent" : "Not connected"} />
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

function generatePresetSheetName() {
  const date = new Date();
  const iso = date.toISOString().split("T")[0];
  return `tomo_crm_sync_${iso}.xlsx`;
}

