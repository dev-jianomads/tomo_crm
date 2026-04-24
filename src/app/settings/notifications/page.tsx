"use client";

import { IntegrationRow } from "@/components/settings/settings-widgets";
import { resetTodayEngagement } from "@/lib/todayEngagement";
import { usePersistentState } from "@/lib/usePersistentState";
import { OnboardingState } from "@/lib/types";

export default function SettingsNotificationsPage() {
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>("tomo-onboarding", {
    calendarConnected: false,
    contactsConnected: false,
    emailConnected: false,
    slackConnected: false,
    telegramConnected: false,
    affinityConnected: false,
    googleSheetsConnected: false,
    googleSheetsAuthed: false,
    contactImportUploaded: false,
    fundStrategyUploaded: false,
    notifications: {},
    completed: false,
  });

  const [dailyDigestPrefs, setDailyDigestPrefs] = usePersistentState<{
    emailDigest: boolean;
    slackDigest: boolean;
    preferredLocalHour: number;
  }>("tomo-daily-digest-prefs-v1", {
    emailDigest: true,
    slackDigest: false,
    preferredLocalHour: 7,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold accent-title">Notifications</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Channels</h3>
        <p className="text-xs text-gray-600">
          Routing and digest delivery use these connections. Disconnect here or under Integrations / Messaging; state is
          shared.
        </p>
        <IntegrationRow
          title="Email"
          status={integrations.emailConnected ? "Connected" : "Not connected"}
          connected={integrations.emailConnected}
          disconnectDescription="Daily Brief and other email notifications may be paused until you connect email again."
          onDisconnect={() => setIntegrations((prev) => ({ ...prev, emailConnected: false }))}
        />
        <IntegrationRow
          title="Slack"
          status={integrations.slackConnected ? "Connected" : "Not connected"}
          connected={integrations.slackConnected}
          onDisconnect={() => setIntegrations((prev) => ({ ...prev, slackConnected: false }))}
        />
        <IntegrationRow
          title="Telegram"
          status={integrations.telegramConnected ? "Onboarding link sent" : "Not connected"}
          connected={integrations.telegramConnected}
          disconnectDescription="Telegram will stop receiving Tomo messages until you go through onboarding again."
          onDisconnect={() => setIntegrations((prev) => ({ ...prev, telegramConnected: false, telegramPhone: undefined }))}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Daily Brief (email)</h3>
        <p className="mt-1 text-xs text-gray-600">
          Full four-section digest (same content as the Loops template). Scheduled delivery uses{" "}
          <span className="font-mono text-[11px]">vercel.json</span> cron (UTC) and{" "}
          <span className="font-mono text-[11px]">LOOPS_SEND_TO</span> until per-user routing is stored in the database.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={dailyDigestPrefs.emailDigest}
              onChange={(e) => setDailyDigestPrefs((p) => ({ ...p, emailDigest: e.target.checked }))}
            />
            Email daily brief
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={dailyDigestPrefs.slackDigest}
              disabled
              title="Slack digest wiring comes next"
            />
            Slack (soon)
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-600">
            Preferred local hour (display only)
            <input
              type="number"
              min={0}
              max={23}
              className="ml-2 w-16 rounded border border-gray-200 px-2 py-1 text-sm"
              value={dailyDigestPrefs.preferredLocalHour}
              onChange={(e) =>
                setDailyDigestPrefs((p) => ({
                  ...p,
                  preferredLocalHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
                }))
              }
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Cron schedule is set in repo <span className="font-mono">vercel.json</span> (default 12:00 UTC). Set{" "}
          <span className="font-mono">CRON_SECRET</span> in Vercel; the platform sends it as{" "}
          <span className="font-mono">Authorization: Bearer</span> to the cron route.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Today · On My Radar memory</h3>
        <p className="mt-1 text-xs text-gray-600">
          “Still in To-Do” uses this browser’s saved list of surfaced vs opened actions. Clear it if demos get confusing.
        </p>
        <button
          type="button"
          className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
          onClick={() => {
            resetTodayEngagement();
            window.alert("Cleared. Reload Today to reset On My Radar.");
          }}
        >
          Clear engagement memory
        </button>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        Configure routing per channel. Slack/Telegram must be connected to enable those switches.
      </div>
    </div>
  );
}
