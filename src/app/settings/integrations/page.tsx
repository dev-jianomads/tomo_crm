"use client";

import { useState } from "react";
import { connectAffinity, createGoogleSheet, startGoogleAuth } from "@/lib/integrations";
import {
  DisconnectIntegrationDialog,
  generatePresetSheetName,
  IntegrationRow,
} from "@/components/settings/settings-widgets";
import { LinkSlashIcon } from "@heroicons/react/24/outline";
import { usePersistentState } from "@/lib/usePersistentState";
import { ONBOARDING_STATE_STORAGE_KEY, defaultOnboardingState, OnboardingState } from "@/lib/types";

export default function SettingsIntegrationsPage() {
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>(ONBOARDING_STATE_STORAGE_KEY, defaultOnboardingState);

  const [affinityListId, setAffinityListId] = useState(integrations.affinityListId ?? "");
  const [affinityToken, setAffinityToken] = useState("");
  const [sheetName, setSheetName] = useState(integrations.googleSheetsFilename ?? generatePresetSheetName());
  const [savingAffinity, setSavingAffinity] = useState(false);
  const [authingSheet, setAuthingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [affinityDisconnectOpen, setAffinityDisconnectOpen] = useState(false);
  const [sheetsDisconnectOpen, setSheetsDisconnectOpen] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Integrations</h2>

      <IntegrationRow
        title="Calendar"
        status={integrations.calendarConnected ? "Connected" : "Not connected"}
        connected={integrations.calendarConnected}
        onDisconnect={() => setIntegrations((prev) => ({ ...prev, calendarConnected: false }))}
      />
      <IntegrationRow
        title="Contacts"
        status={integrations.contactsConnected ? "Connected" : "Not connected"}
        connected={integrations.contactsConnected}
        onDisconnect={() => setIntegrations((prev) => ({ ...prev, contactsConnected: false }))}
      />
      <IntegrationRow
        title="Email"
        status={integrations.emailConnected ? "Connected" : "Optional"}
        connected={integrations.emailConnected}
        onDisconnect={() => setIntegrations((prev) => ({ ...prev, emailConnected: false }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icons/affinity.svg" alt="Affinity" className="h-5 w-5" />
              <p className="text-base font-semibold text-[color:var(--foreground)]">Affinity CRM</p>
            </div>
            {integrations.affinityConnected ? (
              <span className="rounded-full bg-[color:var(--tomo-status-green-bg)] px-3 py-1 text-xs font-medium text-[color:var(--tomo-status-green)]">
                Connected ✓
              </span>
            ) : (
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_85%,var(--tomo-card))] px-3 py-1 text-xs font-medium text-[color:var(--tomo-mute)]">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-[color:var(--tomo-body)]">Sync people and companies from Affinity into Tomo.</p>
          <div className="mt-3 space-y-2">
            <label className="tomo-field-label block">List ID</label>
            <input
              className="tomo-input w-full text-sm shadow-none"
              value={affinityListId}
              onChange={(e) => setAffinityListId(e.target.value)}
              placeholder="e.g. 12345"
            />
          </div>
          <div className="mt-3 space-y-2">
            <label className="tomo-field-label block">API token</label>
            <input
              type="password"
              className="tomo-input w-full text-sm shadow-none"
              value={affinityToken}
              onChange={(e) => setAffinityToken(e.target.value)}
              placeholder="Paste your token"
            />
            <p className="text-xs text-[color:var(--tomo-mute)]">Stored securely server-side in production (mocked locally here).</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
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
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-red)_35%,var(--tomo-rule))] bg-[color:var(--tomo-card)] px-3 py-2 text-sm font-medium text-[color:var(--tomo-red)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-red-bg)]"
                onClick={() => setAffinityDisconnectOpen(true)}
              >
                <LinkSlashIcon className="h-4 w-4" aria-hidden />
                Disconnect
              </button>
            ) : null}
          </div>
          <DisconnectIntegrationDialog
            open={affinityDisconnectOpen}
            onClose={() => setAffinityDisconnectOpen(false)}
            onConfirm={() => {
              setIntegrations((prev) => ({
                ...prev,
                affinityConnected: false,
                affinityListId: undefined,
                affinityTokenLast4: undefined,
              }));
            }}
            title="Disconnect Affinity CRM?"
            description="Sync with Affinity will stop. You can connect again with a new list and token at any time."
            confirmLabel="Disconnect Affinity"
          />
          {integrations.affinityConnected ? (
            <p className="mt-2 text-xs text-[color:var(--tomo-status-green)]">
              Connected to list {integrations.affinityListId ?? affinityListId}. Token ending {integrations.affinityTokenLast4 ?? "••••"}.
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-card)] p-4 shadow-[var(--tomo-shadow-1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icons/google-sheets.svg" alt="Google Sheets" className="h-5 w-5" />
              <p className="text-base font-semibold text-[color:var(--foreground)]">Google Sheets</p>
            </div>
            {integrations.googleSheetsConnected ? (
              <span className="rounded-full bg-[color:var(--tomo-status-green-bg)] px-3 py-1 text-xs font-medium text-[color:var(--tomo-status-green)]">
                Ready ✓
              </span>
            ) : (
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_85%,var(--tomo-card))] px-3 py-1 text-xs font-medium text-[color:var(--tomo-mute)]">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-[color:var(--tomo-body)]">Authenticate and create the preset sheet name before confirming.</p>
          <div className="mt-3 space-y-2">
            <label className="tomo-field-label block">Sheet filename</label>
            <input className="tomo-input w-full text-sm shadow-none" value={sheetName} onChange={(e) => setSheetName(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                setAuthingSheet(true);
                try {
                  const res = await startGoogleAuth();
                  if (res.ok && res.authUrl) {
                    window.open(res.authUrl, "_blank");
                    setIntegrations((prev) => ({ ...prev, googleSheetsAuthed: true }));
                  }
                } finally {
                  setAuthingSheet(false);
                }
              }}
            >
              {authingSheet ? "Opening Google..." : integrations.googleSheetsAuthed ? "Re-auth Google" : "Sign in with Google"}
            </button>
            <button
              type="button"
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
            {integrations.googleSheetsConnected ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--tomo-radius-md)] border border-[color:color-mix(in_srgb,var(--tomo-red)_35%,var(--tomo-rule))] bg-[color:var(--tomo-card)] px-3 py-2 text-sm font-medium text-[color:var(--tomo-red)] shadow-[var(--tomo-shadow-1)] transition hover:bg-[color:var(--tomo-red-bg)]"
                onClick={() => setSheetsDisconnectOpen(true)}
              >
                <LinkSlashIcon className="h-4 w-4" aria-hidden />
                Disconnect
              </button>
            ) : null}
          </div>
          <DisconnectIntegrationDialog
            open={sheetsDisconnectOpen}
            onClose={() => setSheetsDisconnectOpen(false)}
            onConfirm={() => {
              setIntegrations((prev) => ({
                ...prev,
                googleSheetsConnected: false,
                googleSheetsFilename: undefined,
                googleSheetsAuthed: false,
              }));
            }}
            title="Disconnect Google Sheets?"
            description="The link to your sheet will be removed. You can authenticate and create a sheet again any time."
            confirmLabel="Disconnect Google Sheets"
          />
          {integrations.googleSheetsConnected ? (
            <p className="mt-2 text-xs text-[color:var(--tomo-status-green)]">
              Google Sheets ready. Filename {integrations.googleSheetsFilename ?? sheetName}.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
