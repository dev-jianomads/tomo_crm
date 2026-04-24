"use client";

import { useState } from "react";
import { connectAffinity, createGoogleSheet, startGoogleAuth } from "@/lib/integrations";
import {
  generatePresetSheetName,
  IntegrationRow,
} from "@/components/settings/settings-widgets";
import { usePersistentState } from "@/lib/usePersistentState";
import { OnboardingState } from "@/lib/types";

export default function SettingsIntegrationsPage() {
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

  const [affinityListId, setAffinityListId] = useState(integrations.affinityListId ?? "");
  const [affinityToken, setAffinityToken] = useState("");
  const [sheetName, setSheetName] = useState(integrations.googleSheetsFilename ?? generatePresetSheetName());
  const [savingAffinity, setSavingAffinity] = useState(false);
  const [authingSheet, setAuthingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold accent-title">Integrations</h2>

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
          </div>
          {integrations.googleSheetsConnected ? (
            <p className="mt-2 text-xs text-green-700">Google Sheets ready. Filename {integrations.googleSheetsFilename ?? sheetName}.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
