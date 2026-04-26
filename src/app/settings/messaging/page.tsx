"use client";

import { IntegrationRow } from "@/components/settings/settings-widgets";
import { usePersistentState } from "@/lib/usePersistentState";
import { OnboardingState } from "@/lib/types";

export default function SettingsMessagingPage() {
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>("tomo-onboarding", {
    calendarConnected: false,
    contactsConnected: false,
    emailConnected: false,
    emailHistoryScope: null,
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

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Messaging</h2>
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
  );
}
