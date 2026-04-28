"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/auth";
import { ContactImportFieldMapping } from "@/components/contact-import-field-mapping";
import { ContactImportFileZone } from "@/components/contact-import-file-zone";
import { uploadContactsSeed, uploadFundStrategy } from "@/lib/integrations";
import {
  CONTACT_IMPORT_ACCEPT,
  type ContactImportFieldId,
  type ContactImportPreview,
  buildInitialColumnMapping,
  readContactImportPreview,
  summarizeMapping,
} from "@/lib/contactImportMock";
import { EmailHistoryScope, OnboardingState } from "@/lib/types";
import { usePersistentState } from "@/lib/usePersistentState";

const defaultNotifications: OnboardingState["notifications"] = {
  "Morning Recaps": { email: true, slack: false, telegram: false, inApp: true },
  "Meeting Briefs": { email: true, slack: false, telegram: false, inApp: true },
  FollowUps: { email: false, slack: false, telegram: false, inApp: true },
  Escalations: { email: true, slack: false, telegram: false, inApp: true },
};

const initialState: OnboardingState = {
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
  notifications: defaultNotifications,
  completed: false,
};

const slackInstallUrl = "https://example.com/slack/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState, ready] = usePersistentState<OnboardingState>("tomo-onboarding", initialState);
  const [currentStep, setCurrentStep] = useState(1);
  const [slackOpened, setSlackOpened] = useState(false);
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsPreview, setContactsPreview] = useState<ContactImportPreview | null>(null);
  const [contactsMapping, setContactsMapping] = useState<ContactImportFieldId[]>([]);
  const [contactsParsing, setContactsParsing] = useState(false);
  const [contactsUploading, setContactsUploading] = useState(false);
  const [strategyFile, setStrategyFile] = useState<File | null>(null);
  const [strategyText, setStrategyText] = useState(state.fundStrategyText ?? "");
  const [strategyUploading, setStrategyUploading] = useState(false);
  /** When true, email step shows the connect screen again (after user pressed Back on the data-scope screen). */
  const [revisitEmailConnect, setRevisitEmailConnect] = useState(false);

  // Ensure newly added onboarding fields get defaulted when loading older local state
  useEffect(() => {
    if (!ready) return;
    setState((prev) => ({ ...initialState, ...prev }));
  }, [ready, setState]);

  const navigateHome = () => {
    try {
      router.replace("/home");
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = "/home";
      }
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session) router.replace("/auth");
  }, [router]);

  const totalSteps = 6;
  const isLastStep = currentStep === totalSteps;

  const markCalendarConnected = () => {
    setState((prev) => ({ ...prev, calendarConnected: true }));
  };

  const markContactsConnected = () => {
    setState((prev) => ({ ...prev, contactsConnected: true }));
  };

  const handleEmailConnect = () => {
    setRevisitEmailConnect(false);
    setState({ ...state, emailConnected: true });
  };

  const handleEmailHistoryChoice = (scope: EmailHistoryScope) => {
    setState((prev) => ({ ...prev, emailHistoryScope: scope }));
    goNext();
  };

  const emailAwaitingScope = state.emailConnected && state.emailHistoryScope == null;
  const showEmailDataScope = emailAwaitingScope && !revisitEmailConnect;

  const onEmailStepBack = () => {
    if (currentStep === 2 && showEmailDataScope) {
      setRevisitEmailConnect(true);
      return;
    }
    goBack();
  };

  const stepEmailHeaderNextDisabled =
    currentStep === 2 && showEmailDataScope;

  const handleOnboardingNext = () => {
    if (currentStep === 2) {
      if (!state.emailConnected) {
        goNext();
        return;
      }
      if (state.emailHistoryScope != null) {
        goNext();
        return;
      }
      if (revisitEmailConnect) {
        setRevisitEmailConnect(false);
        return;
      }
      if (showEmailDataScope) {
        return;
      }
    }
    handleNext();
  };

  useEffect(() => {
    if (currentStep !== 2) setRevisitEmailConnect(false);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 4) {
      setContactsFile(null);
      setContactsPreview(null);
      setContactsMapping([]);
      setContactsParsing(false);
    }
  }, [currentStep]);

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const forceNavigateHome = () => {
    navigateHome();
    if (typeof window !== "undefined") {
      // Hard fallback for cases where Next's router fetch fails
      setTimeout(() => {
        window.location.href = "/home";
      }, 10);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      goNext();
    }
  };

  const toggleNotification = (row: string, channel: "email" | "slack" | "telegram" | "inApp") => {
    setState({
      ...state,
      notifications: {
        ...state.notifications,
        [row]: { ...state.notifications[row], [channel]: !state.notifications[row]?.[channel] },
      },
    });
  };

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
          contactImportUploaded: true,
          contactImportFilename: res.filename,
          contactImportRowCount: res.rowCount,
          contactImportMappingSummary: mappingSummary,
        }));
        goNext();
      }
    } finally {
      setContactsUploading(false);
    }
  };

  const handleFundStrategyUpload = async () => {
    const trimmedText = strategyText.trim();
    if (!strategyFile && !trimmedText) return;
    setStrategyUploading(true);
    try {
      const res = await uploadFundStrategy({ file: strategyFile ?? undefined, text: trimmedText || undefined });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          fundStrategyUploaded: true,
          fundStrategyFilename: res.filename,
          fundStrategyText: trimmedText || prev.fundStrategyText,
        }));
        if (strategyFile) setStrategyFile(null);
        goNext();
      }
    } finally {
      setStrategyUploading(false);
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

  return (
    <div className="min-h-screen bg-white px-4 py-4 md:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 md:gap-6">
        <div className="sticky top-0 z-20 bg-white pb-3 pt-1 md:pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Onboarding</p>
              <h1 className="text-2xl font-semibold text-gray-900">Connect your workspace</h1>
            </div>
            <div className="hidden text-sm text-gray-500 md:block">Step {currentStep} of {totalSteps}</div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              className="button-secondary h-9 px-3 text-sm"
              onClick={onEmailStepBack}
              disabled={currentStep === 1}
            >
              Back
            </button>
            <div className="flex flex-1 items-center justify-center gap-2">
              {Array.from({ length: totalSteps }, (_, idx) => {
                const step = idx + 1;
                const isActive = step === currentStep;
                const isDone = step < currentStep;
                return (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step)}
                    className={`h-3 w-3 rounded-full transition ${isActive ? "bg-blue-600 scale-105" : isDone ? "bg-blue-200" : "bg-gray-200 hover:bg-blue-100"}`}
                    aria-label={`Go to step ${step}`}
                  />
                );
              })}
            </div>
            {!isLastStep ? (
              <button
                type="button"
                className="button-primary h-9 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleOnboardingNext}
                disabled={stepEmailHeaderNextDisabled}
                title={stepEmailHeaderNextDisabled ? "Choose an option below" : undefined}
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
            <div className="space-y-8">
              <StepCard
                title="Calendar & contacts"
                description="Connect your calendar for meeting briefs and reminders, and your contacts so TOMO can build your relationship graph."
                actions={
                  <div className="space-y-6">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Calendar</p>
                        {state.calendarConnected ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Connected</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={markCalendarConnected}>
                          <img src="/icons/google-calendar.svg" alt="Google Calendar" className="h-4 w-4" />
                          Connect Google Calendar
                        </button>
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={markCalendarConnected}>
                          <img src="/icons/microsoft-calendar.svg" alt="Microsoft Calendar" className="h-4 w-4" />
                          Connect Microsoft 365 Calendar
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contacts</p>
                        {state.contactsConnected ? (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Connected</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={markContactsConnected}>
                          <img src="/icons/google-contacts.svg" alt="Google Contacts" className="h-4 w-4" />
                          Connect Google Contacts
                        </button>
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={markContactsConnected}>
                          <img src="/icons/microsoft-contacts.svg" alt="Microsoft Contacts" className="h-4 w-4" />
                          Connect Microsoft 365 Contacts
                        </button>
                      </div>
                    </div>
                  </div>
                }
              />
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button className="text-sm text-gray-600 underline" type="button" onClick={goNext}>
                  Skip for now
                </button>
                <button className="button-primary" type="button" onClick={goNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && !showEmailDataScope && (
            <div className="space-y-6">
              <StepCard
                title="Connect your email (recommended)"
                description="Enable follow-ups, recaps, and automated detection of commitments from your emails."
                actions={
                  <div className="flex flex-col gap-3">
                    {!state.emailConnected ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={handleEmailConnect}>
                          <img src="/icons/gmail.svg" alt="Gmail" className="h-4 w-4" />
                          Connect Gmail
                        </button>
                        <button className="button-secondary flex items-center gap-2" type="button" onClick={handleEmailConnect}>
                          <img src="/icons/outlook.svg" alt="Outlook" className="h-4 w-4" />
                          Connect Outlook
                        </button>
                        <button className="text-sm text-gray-600 underline" type="button" onClick={goNext}>
                          Skip for now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {state.emailHistoryScope ? (
                          <p className="text-sm text-gray-700">
                            <span className="font-medium text-gray-900">Email connected.</span>{" "}
                            {state.emailHistoryScope === "six_months"
                              ? "TOMO may read the last 6 months to build your relationship profile, statuses, and tone-aware drafts."
                              : "TOMO will analyze new email only. Some profile, status, and draft features stay limited until you allow history in Settings."}
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Account connected.</span> Continue to choose how TOMO uses your
                              existing mail.
                            </p>
                            <button
                              type="button"
                              className="button-primary"
                              onClick={() => setRevisitEmailConnect(false)}
                            >
                              Choose how TOMO uses your email
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                }
                status={state.emailConnected}
              />
            </div>
          )}

          {currentStep === 2 && showEmailDataScope && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Finish mail setup</h2>
                <p className="mt-1 text-sm text-gray-600">Same step — a quick choice about your existing inbox.</p>
              </div>
              <p className="text-sm text-gray-700">
                Allow TOMO to read the <span className="font-medium">last 6 months</span> of email to enrich relationship
                activity, calculate statuses, build a relationship profile and summary, and draft follow-ups in your tone of
                voice.
              </p>
              <p className="text-sm text-gray-600">
                If you choose <span className="font-medium">new email only</span>, TOMO will analyze future mail from here on;
                the features above are limited until you opt in to history in Settings.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  className="button-primary min-h-[2.75rem] flex-1 rounded-md px-4 py-2.5 text-left text-sm font-medium sm:text-center"
                  onClick={() => handleEmailHistoryChoice("six_months")}
                >
                  Allow last 6 months
                </button>
                <button
                  type="button"
                  className="button-secondary min-h-[2.75rem] flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-left text-sm sm:text-center"
                  onClick={() => handleEmailHistoryChoice("future_only")}
                >
                  New email only
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold accent-title">Connect Slack</h2>
                  <p className="text-sm text-gray-600">
                    TOMO delivers recaps to your email by default. Connect Slack to also receive recaps and let TOMO act on your suggestions there.
                  </p>
                </div>
                <div className="text-sm text-gray-500">Optional</div>
              </div>

              <div className="max-w-xl rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <img src="/icons/slack.svg" alt="Slack" className="h-5 w-5" />
                      <p className="text-base font-semibold text-gray-900">Slack</p>
                    </div>
                    <p className="text-sm text-gray-600">Install the Ask Tomo app to get recaps and take action.</p>
                  </div>
                  {state.slackConnected ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Connected ?</span>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>Morning and evening recaps</li>
                  <li>Meeting briefs and follow-up reminders</li>
                  <li>Actionable command cards in Slack</li>
                </ul>
                <div className="mt-4 space-y-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  <p>We'll open Slack so you can grant TOMO permission to install the Ask Tomo app.</p>
                  <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium">
                    <span className="truncate">{slackInstallUrl}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(slackInstallUrl)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Copy link
                    </button>
                  </div>
                  <button
                    type="button"
                    className="button-primary w-full"
                    onClick={() => {
                      setSlackOpened(true);
                      window.open(slackInstallUrl, "_blank");
                      setState({ ...state, slackConnected: true });
                    }}
                  >
                    Open Slack
                  </button>
                  {slackOpened ? <p className="text-xs text-green-600">Slack tab opened. Complete install to finish.</p> : null}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button type="button" className="text-sm text-gray-600 underline" onClick={goNext}>
                  Skip for now
                </button>
                <button type="button" className="button-primary" onClick={goNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold accent-title">Import contacts from CSV or Excel</h2>
                  <p className="text-sm text-gray-600">
                    Seed TOMO with the people you already track. We&apos;ll parse names, roles, companies, and contact info.
                  </p>
                </div>
                <div className="text-sm text-gray-500">Optional</div>
              </div>

              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                {state.contactImportUploaded && !contactsPreview ? (
                  <div className="space-y-3">
                    <p className="text-xs text-green-700">
                      Uploaded {state.contactImportFilename ?? "your file"}. We&apos;ll queue parsing (~
                      {state.contactImportRowCount ?? "tens of"} rows).{" "}
                      {state.contactImportMappingSummary ? (
                        <>
                          Mapping: <span className="font-medium text-gray-800">{state.contactImportMappingSummary}</span>
                        </>
                      ) : null}
                    </p>
                    <button type="button" className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900" onClick={clearContactsImport}>
                      Replace file
                    </button>
                  </div>
                ) : !contactsPreview ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wide text-gray-500">Contacts file</label>
                      <ContactImportFileZone
                        accept={CONTACT_IMPORT_ACCEPT}
                        disabled={contactsParsing}
                        onFileSelected={(f) => void handleContactsFileSelected(f)}
                      />
                      <p className="text-xs text-gray-500">
                        Supports CSV, XLS, or XLSX. Include headers like Name, Email, Company, Title, Phone.
                      </p>
                      {contactsParsing ? (
                        <p className="text-xs text-gray-500">Reading file…</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button className="button-secondary" type="button" onClick={goNext}>
                        Skip for now
                      </button>
                      <span className="text-xs text-gray-500">
                        Next step opens column matching after you choose a file.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-800">{contactsFile?.name}</span>
                      {" · "}
                      ~{contactsPreview.rowCountEstimate.toLocaleString()} row{contactsPreview.rowCountEstimate === 1 ? "" : "s"}{" "}
                      (estimate)
                    </p>
                    <ContactImportFieldMapping
                      headers={contactsPreview.headers}
                      mapping={contactsMapping}
                      onChange={setContactsMappingAt}
                      sampleRow={contactsPreview.sampleRow}
                      idPrefix="onboarding-import"
                    />
                    <div className="flex flex-wrap items-center gap-3">
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
                      <button type="button" className="text-sm text-gray-600 underline" onClick={goNext}>
                        Skip for now
                      </button>
                      <span className="text-xs text-gray-500">Mock: mapping is saved with your onboarding state.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold accent-title">Share your fund strategy (optional)</h2>
                  <p className="text-sm text-gray-600">
                    Give TOMO context on mandate, stage, geos, and targets so briefs and outreach match your strategy.
                  </p>
                </div>
                <div className="text-sm text-gray-500">Optional</div>
              </div>

              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-gray-500">Upload strategy document</label>
                  <input
                    type="file"
                    accept=".doc,.docx,.txt"
                    onChange={(e) => setStrategyFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500">Accepts DOC/DOCX or TXT. We&apos;ll extract thesis, ICP, check size, and guardrails.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-gray-500">Or paste a short summary</label>
                  <textarea
                    value={strategyText}
                    onChange={(e) => setStrategyText(e.target.value)}
                    rows={4}
                    placeholder="Stage, check size, ownership, sectors, geography, ICP..."
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {state.fundStrategyUploaded ? (
                  <p className="text-xs text-green-700">
                    Strategy captured from {state.fundStrategyFilename ?? "pasted text"}. TOMO will use it as context for briefs and recommendations.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="button-primary"
                    disabled={strategyUploading || (!strategyFile && !strategyText.trim())}
                    onClick={handleFundStrategyUpload}
                  >
                    {strategyUploading ? "Saving..." : state.fundStrategyUploaded ? "Update strategy" : "Save and continue"}
                  </button>
                  <button className="text-sm text-gray-600 underline" onClick={goNext}>
                    Skip for now
                  </button>
                  <span className="text-xs text-gray-500">Nothing is sent until you confirm. Parsing is queued server-side.</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold accent-title">Your workspace is ready</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <StatusLine label="Calendar connected" ok={state.calendarConnected} />
                <StatusLine label="Contacts synced" ok={state.contactsConnected} />
                <StatusLine label="Email connected" ok={state.emailConnected} />
                {state.emailConnected && state.emailHistoryScope ? (
                  <StatusLine
                    label={
                      state.emailHistoryScope === "six_months"
                        ? "Email: last 6 months for relationship & tone (recommended)"
                        : "Email: new mail only (history features limited until Settings)"
                    }
                    ok
                  />
                ) : null}
                <StatusLine label="Slack" ok={state.slackConnected} />
                <StatusLine label="Contacts file uploaded" ok={state.contactImportUploaded} />
                {state.contactImportUploaded && state.contactImportMappingSummary ? (
                  <p className="border-l-2 border-gray-200 pl-3 text-xs text-gray-600">
                    Column mapping saved: {state.contactImportMappingSummary}
                  </p>
                ) : null}
                <StatusLine label="Fund strategy shared" ok={state.fundStrategyUploaded} />
              </div>
              <button type="button" className="button-primary" onClick={completeOnboarding}>
                Enter workspace
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          TOMO keeps context from each step (plan, integrations) and will use it in briefs and follow-ups.
        </div>
      </div>
    </div>
  );
}

function StepCard({
  title,
  description,
  actions,
  status,
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
  status?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold accent-title">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {status ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Connected ?</span> : null}
      </div>
      {actions}
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-green-500" : "bg-gray-300"}`} />
      <span className="text-gray-700">{label}</span>
    </div>
  );
}










