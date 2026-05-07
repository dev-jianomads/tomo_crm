"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/auth";
import { ContactImportFieldMapping } from "@/components/contact-import-field-mapping";
import { ContactImportFileZone } from "@/components/contact-import-file-zone";
import { connectAffinity, uploadContactsSeed } from "@/lib/integrations";
import {
  CONTACT_IMPORT_ACCEPT,
  type ContactImportFieldId,
  type ContactImportPreview,
  buildInitialColumnMapping,
  readContactImportPreview,
  summarizeMapping,
} from "@/lib/contactImportMock";
import {
  OnboardingState,
  WorkspaceProvider,
  defaultOnboardingState,
} from "@/lib/types";
import { usePersistentState } from "@/lib/usePersistentState";

const slackInstallUrl = "https://example.com/slack/onboarding";

function welcomeNameFromSession(email: string | undefined): string {
  if (!email?.trim()) return "";
  const local = email.split("@")[0]?.trim() ?? "";
  const token = local.split(/[._-]/)[0] ?? local;
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState, ready] = usePersistentState<OnboardingState>("tomo-onboarding", defaultOnboardingState);
  const [currentStep, setCurrentStep] = useState(1);
  const [slackOpened, setSlackOpened] = useState(false);
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsPreview, setContactsPreview] = useState<ContactImportPreview | null>(null);
  const [contactsMapping, setContactsMapping] = useState<ContactImportFieldId[]>([]);
  const [contactsParsing, setContactsParsing] = useState(false);
  const [contactsUploading, setContactsUploading] = useState(false);
  const [affinityListId, setAffinityListId] = useState("");
  const [affinityToken, setAffinityToken] = useState("");
  const [affinitySaving, setAffinitySaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setState((prev) => {
      const merged: OnboardingState = { ...defaultOnboardingState, ...prev };
      // Legacy mock: if calendar+email+contacts were set, treat as workspace bundle
      if (!merged.workspaceBundleConnected && merged.emailConnected && merged.calendarConnected && merged.contactsConnected) {
        merged.workspaceBundleConnected = true;
        merged.workspaceProvider = merged.workspaceProvider ?? "google";
      }
      const legacy = prev as OnboardingState & { emailHistoryScope?: string };
      if (legacy.emailHistoryScope === "six_months") {
        merged.optInHistoricalEmailIngestion = true;
      }
      return merged;
    });
  }, [ready, setState]);

  useEffect(() => {
    if (!getSession()) router.replace("/auth");
  }, [router]);

  const totalSteps = 6;
  const isLastStep = currentStep === totalSteps;

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  /** Step 4: CSV / Excel may be skipped without Confirm import; Affinity requires a successful connect. */
  const crmStepAllowsNext = state.crmImportMethod !== "affinity" || state.affinityConnected;

  const headerNextDisabled =
    (currentStep === 2 && !state.workspaceBundleConnected) || (currentStep === 4 && !crmStepAllowsNext);

  const handleHeaderNext = () => {
    if (headerNextDisabled) return;
    if (isLastStep) return;
    goNext();
  };

  useEffect(() => {
    if (currentStep !== 4) {
      setContactsFile(null);
      setContactsPreview(null);
      setContactsMapping([]);
      setContactsParsing(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 4) return;
    setState((prev) => (prev.crmImportMethod == null ? { ...prev, crmImportMethod: "csv" } : prev));
  }, [currentStep, setState]);

  const clearContactsImport = () => {
    setContactsFile(null);
    setContactsPreview(null);
    setContactsMapping([]);
    setState((prev) => ({
      ...prev,
      contactImportUploaded: false,
      contactImportFilename: undefined,
      contactImportRowCount: undefined,
      contactImportMappingSummary: undefined,
    }));
  };

  const handleContactsFileSelected = async (file: File) => {
    setContactsFile(file);
    setContactsParsing(true);
    try {
      const p = await readContactImportPreview(file);
      setContactsPreview(p);
      setContactsMapping(buildInitialColumnMapping(p.headers));
    } finally {
      setContactsParsing(false);
    }
  };

  const setContactsMappingAt = (i: number, v: ContactImportFieldId) => {
    setContactsMapping((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const handleContactsUpload = async () => {
    if (!contactsFile || !contactsPreview || contactsMapping.length !== contactsPreview.headers.length) return;
    setContactsUploading(true);
    try {
      const res = await uploadContactsSeed(contactsFile);
      if (res.ok) {
        const mappingSummary = summarizeMapping(contactsPreview.headers, contactsMapping);
        setState((prev) => ({
          ...prev,
          crmImportMethod: "csv",
          contactImportUploaded: true,
          contactImportFilename: res.filename,
          contactImportRowCount: res.rowCount,
          contactImportMappingSummary: mappingSummary,
        }));
      }
    } finally {
      setContactsUploading(false);
    }
  };

  const connectWorkspaceBundle = (provider: WorkspaceProvider) => {
    setState((prev) => ({
      ...prev,
      workspaceProvider: provider,
      workspaceBundleConnected: true,
      calendarConnected: true,
      contactsConnected: true,
      emailConnected: true,
    }));
  };

  const handleAffinityConnect = async () => {
    if (!affinityListId.trim() || !affinityToken.trim()) return;
    setAffinitySaving(true);
    try {
      const res = await connectAffinity({ listId: affinityListId.trim(), apiToken: affinityToken.trim() });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          crmImportMethod: "affinity",
          affinityConnected: true,
          affinityListId: res.listId,
          affinityTokenLast4: res.tokenLast4,
        }));
        setAffinityToken("");
      }
    } finally {
      setAffinitySaving(false);
    }
  };

  const completeOnboarding = async () => {
    const session = getSession();
    if (session) {
      setSession({ ...session, onboardingComplete: true });
    }
    setState((prev) => ({ ...prev, completed: true }));

    if (typeof window !== "undefined") {
      window.location.href = "/home";
    } else {
      router.replace("/home");
    }
  };

  const sessionEmail = getSession()?.email;
  const welcomeName = welcomeNameFromSession(sessionEmail);
  const welcomeGreeting = welcomeName ? `Welcome, ${welcomeName}.` : "Welcome to TOMO.";

  const stepTitle =
    currentStep === 1
      ? "Welcome"
      : currentStep === 2
        ? "Connect your workspace"
        : currentStep === 3
          ? "Data access (optional)"
          : currentStep === 4
            ? "CRM data"
            : currentStep === 5
              ? "Slack (optional)"
              : "You’re ready";

  return (
    <div className="min-h-screen bg-white px-4 py-4 md:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 md:gap-6">
        <div className="sticky top-0 z-20 bg-white pb-3 pt-1 md:pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Onboarding</p>
              <h1 className="text-2xl font-semibold text-gray-900">{stepTitle}</h1>
            </div>
            <div className="hidden text-sm text-gray-500 md:block">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" className="button-secondary h-9 px-3 text-sm" onClick={goBack} disabled={currentStep === 1}>
              Back
            </button>
            <div className="flex flex-1 items-center justify-center gap-2" aria-hidden="true">
              {Array.from({ length: totalSteps }, (_, idx) => {
                const step = idx + 1;
                const isActive = step === currentStep;
                const isDone = step < currentStep;
                return (
                  <div
                    key={step}
                    className={`h-3 w-3 rounded-full transition ${isActive ? "scale-105 bg-blue-600" : isDone ? "bg-blue-200" : "bg-gray-200"}`}
                  />
                );
              })}
            </div>
            {!isLastStep ? (
              <button
                type="button"
                className="button-primary h-9 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleHeaderNext}
                disabled={headerNextDisabled}
                title={headerNextDisabled ? "Complete this step to continue" : undefined}
              >
                Next
              </button>
            ) : (
              <div className="h-9 px-3" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl font-medium text-gray-900 md:text-3xl">{welcomeGreeting}</h2>
              <p className="max-w-2xl text-base leading-relaxed text-gray-700">
                You&apos;re a Founding Member of TOMO. Over the next few minutes, we&apos;ll connect TOMO to your existing
                systems and pull in your CRM relationships. You&apos;ll see real intelligence on your real LPs as the product
                comes online. Nothing is sent or surfaced anywhere outside this flow until you tell it to.
              </p>
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button type="button" className="button-primary" onClick={goNext}>
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Connect <span className="font-medium text-gray-800">email, calendar, and contacts</span> in one step. Choose
                your workspace provider — production opens a single OAuth consent with the combined scopes (V1 SRS §3.2).
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className={`rounded-lg border p-4 ${state.workspaceProvider === "google" ? "border-blue-400 bg-blue-50/30" : "border-gray-200"}`}
                >
                  <div className="flex items-center gap-2">
                    <img src="/icons/gmail.svg" alt="" className="h-5 w-5" />
                    <p className="font-semibold text-gray-900">Google Workspace</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Gmail, Google Calendar, and Google Contacts together.</p>
                  <button
                    type="button"
                    className="button-primary mt-4 w-full"
                    onClick={() => connectWorkspaceBundle("google")}
                  >
                    Connect Google
                  </button>
                </div>
                <div
                  className={`rounded-lg border p-4 ${state.workspaceProvider === "microsoft" ? "border-blue-400 bg-blue-50/30" : "border-gray-200"}`}
                >
                  <div className="flex items-center gap-2">
                    <img src="/icons/outlook.svg" alt="" className="h-5 w-5" />
                    <p className="font-semibold text-gray-900">Microsoft 365</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Outlook mail, calendar, and Microsoft 365 contacts together.</p>
                  <button
                    type="button"
                    className="button-primary mt-4 w-full"
                    onClick={() => connectWorkspaceBundle("microsoft")}
                  >
                    Connect Microsoft 365
                  </button>
                </div>
              </div>

              {state.workspaceBundleConnected ? (
                <p className="text-sm text-green-800">
                  <span className="font-medium">Connected</span> — {state.workspaceProvider === "google" ? "Google" : "Microsoft"}{" "}
                  workspace (mock). Use <span className="font-medium">Next</span> to continue.
                </p>
              ) : (
                <p className="text-xs text-gray-500">You must connect one provider before continuing.</p>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button type="button" className="button-primary disabled:opacity-50" onClick={goNext} disabled={!state.workspaceBundleConnected}>
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Optional grants on top of your mailbox connection. Aligned with V1 SRS §3.3 (three-tier email ingestion) and §3.13
                (meeting transcripts).
              </p>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  checked={state.optInHistoricalEmailIngestion}
                  onChange={(e) => setState((prev) => ({ ...prev, optInHistoricalEmailIngestion: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-gray-900">Read historical email (recommended for signals)</span>
                  <span className="mt-1 block text-sm text-gray-600">
                    Allow TOMO to ingest roughly the <span className="font-medium">first 12 months</span> of mail and calendar
                    with full content, and <span className="font-medium">months 13–36</span> as metadata-only (no bodies). Nothing
                    older than 36 months. Uncheck to limit to forward-looking sync until you change this in Settings.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                  checked={state.optInMeetingTranscripts}
                  onChange={(e) => setState((prev) => ({ ...prev, optInMeetingTranscripts: e.target.checked }))}
                  disabled={!state.workspaceBundleConnected}
                />
                <span>
                  <span className="font-medium text-gray-900">
                    {state.workspaceProvider === "microsoft"
                      ? "Microsoft Teams meetings"
                      : state.workspaceProvider === "google"
                        ? "Google Meet"
                        : "Meeting"}{" "}
                    — transcripts, notes, and actions
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">
                    {state.workspaceProvider === "microsoft"
                      ? "Allow TOMO to read Teams meeting transcripts and related notes so briefs and follow-ups reflect what was actually said."
                      : state.workspaceProvider === "google"
                        ? "Allow TOMO to read Meet transcripts and linked notes from Drive when available."
                        : "Connect your workspace in the previous step to enable this option."}
                  </span>
                </span>
              </label>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button type="button" className="button-primary" onClick={goNext}>
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Bring in your LP and relationship data from a CRM export or directly from Affinity. Column mapping applies to
                file import; Affinity uses your workspace schema automatically (mock).{" "}
                <span className="font-medium text-gray-700">
                  File import is optional — use Next to skip and add contacts later from Settings.
                </span>
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="crm-mode"
                    checked={state.crmImportMethod === "csv"}
                    onChange={() => {
                      setState((prev) => ({
                        ...prev,
                        crmImportMethod: "csv",
                        affinityConnected: false,
                        affinityListId: undefined,
                        affinityTokenLast4: undefined,
                      }));
                      setAffinityListId("");
                      setAffinityToken("");
                    }}
                  />
                  Upload CRM export (CSV / Excel)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="crm-mode"
                    checked={state.crmImportMethod === "affinity"}
                    onChange={() => {
                      setState((prev) => ({
                        ...prev,
                        crmImportMethod: "affinity",
                        contactImportUploaded: false,
                        contactImportFilename: undefined,
                        contactImportRowCount: undefined,
                        contactImportMappingSummary: undefined,
                      }));
                      clearContactsImport();
                    }}
                  />
                  Connect Affinity (API)
                </label>
              </div>

              {state.crmImportMethod === "csv" && (
                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                  {state.contactImportUploaded && !contactsPreview ? (
                    <div className="space-y-3">
                      <p className="text-sm text-green-800">
                        Imported {state.contactImportFilename ?? "file"} (~{state.contactImportRowCount ?? "many"} rows).
                        {state.contactImportMappingSummary ? (
                          <>
                            {" "}
                            Mapping: <span className="font-medium">{state.contactImportMappingSummary}</span>
                          </>
                        ) : null}
                      </p>
                      <button
                        type="button"
                        className="text-sm text-blue-700 underline"
                        onClick={() => {
                          clearContactsImport();
                          setState((prev) => ({ ...prev, crmImportMethod: "csv" }));
                        }}
                      >
                        Replace file
                      </button>
                    </div>
                  ) : !contactsPreview ? (
                    <>
                      <ContactImportFileZone
                        accept={CONTACT_IMPORT_ACCEPT}
                        disabled={contactsParsing}
                        onFileSelected={(f) => void handleContactsFileSelected(f)}
                      />
                      <p className="text-xs text-gray-500">CSV, XLS, or XLSX with a header row.</p>
                      {contactsParsing ? <p className="text-xs text-gray-500">Reading file…</p> : null}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-800">{contactsFile?.name}</span> · ~
                        {contactsPreview.rowCountEstimate.toLocaleString()} rows (estimate)
                      </p>
                      <ContactImportFieldMapping
                        headers={contactsPreview.headers}
                        mapping={contactsMapping}
                        onChange={setContactsMappingAt}
                        sampleRow={contactsPreview.sampleRow}
                        idPrefix="onboarding-crm"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="button-primary"
                          disabled={contactsUploading || contactsParsing}
                          onClick={() => void handleContactsUpload()}
                        >
                          {contactsUploading ? "Saving…" : "Confirm import"}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => {
                            setContactsFile(null);
                            setContactsPreview(null);
                            setContactsMapping([]);
                          }}
                        >
                          Change file
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {state.crmImportMethod === "affinity" && (
                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-600">
                    Paste your Affinity API key and list ID. Production validates against Affinity and stores credentials
                    server-side.
                  </p>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-gray-500">List ID</label>
                    <input
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                      value={affinityListId}
                      onChange={(e) => setAffinityListId(e.target.value)}
                      placeholder="e.g. 12345"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-gray-500">API key</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                      value={affinityToken}
                      onChange={(e) => setAffinityToken(e.target.value)}
                      placeholder="From Affinity → Settings → API"
                    />
                  </div>
                  {state.affinityConnected ? (
                    <p className="text-sm text-green-800">Affinity connected (mock). Token …{state.affinityTokenLast4}</p>
                  ) : null}
                  <button
                    type="button"
                    className="button-primary"
                    disabled={affinitySaving || !affinityListId.trim() || !affinityToken.trim()}
                    onClick={() => void handleAffinityConnect()}
                  >
                    {affinitySaving ? "Connecting…" : "Connect Affinity"}
                  </button>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  className="button-primary disabled:opacity-50"
                  onClick={goNext}
                  disabled={!crmStepAllowsNext}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Slack is optional. If you connect, you can also receive{" "}
                <span className="font-medium text-gray-800">What&apos;s on my Radar</span> pushes in Slack.
              </p>

              <div className="max-w-xl rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <img src="/icons/slack.svg" alt="" className="h-5 w-5" />
                  <p className="font-semibold text-gray-900">Slack</p>
                </div>
                <label className="mt-4 flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={state.slackWhatsOnRadarPush}
                    onChange={(e) => setState((prev) => ({ ...prev, slackWhatsOnRadarPush: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Push &quot;What&apos;s on my Radar&quot; updates to Slack when I&apos;m connected</span>
                </label>
                <ul className="mt-3 list-inside list-disc text-sm text-gray-600">
                  <li>Install the Ask TOMO app in your workspace (mock link).</li>
                  <li>Radar summaries mirror the in-app prioritised LP view.</li>
                </ul>
                <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{slackInstallUrl}</span>
                    <button
                      type="button"
                      className="text-blue-600"
                      onClick={() => navigator.clipboard.writeText(slackInstallUrl)}
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    type="button"
                    className="button-primary mt-3 w-full"
                    onClick={() => {
                      setSlackOpened(true);
                      window.open(slackInstallUrl, "_blank");
                      setState((prev) => ({ ...prev, slackConnected: true }));
                    }}
                  >
                    Open Slack install
                  </button>
                  {slackOpened ? <p className="mt-2 text-xs text-green-700">Tab opened — finish install in Slack.</p> : null}
                </div>
              </div>

              <p className="text-xs text-gray-500">You can skip Slack and enable it later under Settings → Messaging.</p>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button type="button" className="button-primary" onClick={goNext}>
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Onboarding complete</h2>
              <p className="text-sm text-gray-600">
                TOMO will finish syncing in the background. You can start from Home; deeper pipeline import, duplicate review,
                and Day 1 signal surfaces ship in production beyond this mock wizard.
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <StatusLine
                  label={`Workspace: ${state.workspaceBundleConnected ? (state.workspaceProvider === "google" ? "Google" : "Microsoft 365") : "—"}`}
                  ok={state.workspaceBundleConnected}
                />
                <StatusLine label="Historical email tiers (12 mo + metadata to 36 mo)" ok={state.optInHistoricalEmailIngestion} />
                <StatusLine label="Meeting transcripts & actions" ok={state.optInMeetingTranscripts} />
                <StatusLine
                  label={
                    state.crmImportMethod === "affinity"
                      ? "CRM: Affinity API"
                      : state.crmImportMethod === "csv"
                        ? state.contactImportUploaded
                          ? "CRM: file import"
                          : "CRM: file import (skipped)"
                        : "CRM"
                  }
                  ok={
                    state.crmImportMethod === "affinity"
                      ? state.affinityConnected
                      : state.crmImportMethod === "csv"
                        ? state.contactImportUploaded
                        : false
                  }
                />
                <StatusLine label="Slack connected" ok={state.slackConnected} />
                {state.slackConnected ? (
                  <StatusLine label="What&apos;s on my Radar → Slack" ok={state.slackWhatsOnRadarPush} />
                ) : null}
              </div>
              <button type="button" className="button-primary" onClick={completeOnboarding}>
                Go to Home
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500 align-middle" />
          Progress is saved in this browser until you finish onboarding.
        </p>
      </div>
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${ok ? "bg-green-500" : "bg-gray-300"}`} />
      <span className="text-gray-700">{label}</span>
    </div>
  );
}
