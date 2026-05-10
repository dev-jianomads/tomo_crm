"use client";

import { IntegrationRow } from "@/components/settings/settings-widgets";
import {
  RADAR_AUTO_OPEN_STORAGE_KEY,
  RADAR_SECTION_SOURCE_STORAGE_KEY,
  type RadarAutoOpenPreference,
  type RadarSectionSourcePreference,
} from "@/lib/radarPreferences";
import { resetTodayEngagement } from "@/lib/todayEngagement";
import { usePersistentState } from "@/lib/usePersistentState";
import { defaultOnboardingState, OnboardingState } from "@/lib/types";

export default function SettingsNotificationsPage() {
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>("tomo-onboarding", defaultOnboardingState);

  const [dailyDigestPrefs, setDailyDigestPrefs] = usePersistentState<{
    emailDigest: boolean;
    slackDigest: boolean;
    preferredLocalHour: number;
  }>("tomo-daily-digest-prefs-v1", {
    emailDigest: true,
    slackDigest: false,
    preferredLocalHour: 7,
  });

  const [radarSectionSource, setRadarSectionSource] = usePersistentState<RadarSectionSourcePreference>(
    RADAR_SECTION_SOURCE_STORAGE_KEY,
    "env",
  );
  const [radarAutoOpenPrefs, setRadarAutoOpenPrefs] = usePersistentState<RadarAutoOpenPreference>(
    RADAR_AUTO_OPEN_STORAGE_KEY,
    { enabled: true },
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold accent-title">Notifications</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Channels</h3>
        <p className="text-xs text-[color:var(--tomo-body)]">
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

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Daily Brief (email)</h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-body)]">
          Full four-section digest (same content as the Loops template). Scheduled delivery uses{" "}
          <span className="font-mono text-[11px]">vercel.json</span> cron (UTC) and{" "}
          <span className="font-mono text-[11px]">LOOPS_SEND_TO</span> until per-user routing is stored in the database.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--foreground)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[color:var(--tomo-rule)] text-[color:var(--accent)] focus:ring-[color:var(--tomo-teal)]"
              checked={dailyDigestPrefs.emailDigest}
              onChange={(e) => setDailyDigestPrefs((p) => ({ ...p, emailDigest: e.target.checked }))}
            />
            Email daily brief
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--tomo-mute)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[color:var(--tomo-rule)] text-[color:var(--accent)] focus:ring-[color:var(--tomo-teal)]"
              checked={dailyDigestPrefs.slackDigest}
              disabled
              title="Slack digest wiring comes next"
            />
            Slack (soon)
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-[color:var(--tomo-body)]">
            Preferred local hour (display only)
            <input
              type="number"
              min={0}
              max={23}
              className="tomo-input ml-2 inline-block w-16 py-1 text-sm shadow-none"
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
        <p className="mt-2 text-[11px] text-[color:var(--tomo-mute)]">
          Cron schedule is set in repo <span className="font-mono">vercel.json</span> (default 12:00 UTC). Set{" "}
          <span className="font-mono">CRON_SECRET</span> in Vercel; the platform sends it as{" "}
          <span className="font-mono">Authorization: Bearer</span> to the cron route.
        </p>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] px-4 py-3 shadow-[var(--tomo-shadow-1)]">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Radar Modal (Today)</h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-body)]">
          In-app Daily Brief + On my radar (SRS Appendix I). Row source defaults to your build (
          <span className="font-mono">NEXT_PUBLIC_TOMO_RADAR_DERIVED</span>) unless overridden here.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-[color:var(--tomo-mute)]">Appendix I rows</label>
          <select
            className="tomo-input max-w-md py-1.5 text-sm shadow-none"
            value={radarSectionSource}
            onChange={(e) => setRadarSectionSource(e.target.value as RadarSectionSourcePreference)}
          >
            <option value="env">Auto — follow environment flag</option>
            <option value="demo">Demo seed (design reference)</option>
            <option value="derived">CRM + Today derivation</option>
          </select>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[color:var(--foreground)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[color:var(--tomo-rule)] text-[color:var(--accent)] focus:ring-[color:var(--tomo-teal)]"
            checked={radarAutoOpenPrefs.enabled}
            onChange={(e) => setRadarAutoOpenPrefs((p) => ({ ...p, enabled: e.target.checked }))}
          />
          Open Radar Modal automatically once each day on Today
        </label>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_45%,var(--tomo-card))] px-4 py-3">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Today · On My Radar memory</h3>
        <p className="mt-1 text-xs text-[color:var(--tomo-body)]">
          “Still in To-Do” uses this browser’s saved list of surfaced vs opened actions. Clear it if demos get confusing.
        </p>
        <button
          type="button"
          className="mt-2 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-navy-soft)]"
          onClick={() => {
            resetTodayEngagement();
            window.alert("Cleared. Reload Today to reset On My Radar.");
          }}
        >
          Clear engagement memory
        </button>
      </div>

      <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_55%,var(--tomo-card))] px-3 py-2 text-sm text-[color:var(--tomo-body)]">
        Configure routing per channel. Slack/Telegram must be connected to enable those switches.
      </div>
    </div>
  );
}
