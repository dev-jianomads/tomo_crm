"use client";

import { useEffect, useMemo, useState } from "react";
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
  ONBOARDING_STATE_STORAGE_KEY,
  type OnboardingCrmCsvLabel,
  type OnboardingState,
  type OnboardingTeamMember,
  type OnboardingToneCapture,
  type SessionState,
  type WorkspaceProvider,
  defaultOnboardingState,
} from "@/lib/types";
import { usePersistentState } from "@/lib/usePersistentState";

const TOTAL = 8;

const STEP_LABELS: Record<number, string> = {
  1: "01 / 08 · Welcome",
  2: "02 / 08 · Connect data",
  3: "03 / 08 · Your fund",
  4: "04 / 08 · Your raise",
  5: "05 / 08 · Your team",
  6: "06 / 08 · Your voice",
  7: "07 / 08 · A first read",
  8: "08 / 08 · Briefing preview",
};

const TICKER_BY_STEP: Record<number, string> = {
  2: "Reading 142 emails so far · 4% indexed",
  3: "Reading 1,284 emails so far · 18% indexed",
  4: "Reading 2,847 emails so far · 41% indexed",
  5: "Reading 4,612 emails so far · 56% indexed",
  6: "Reading 6,238 emails so far · 73% indexed",
  7: "Reading 7,891 emails so far · 84% indexed",
  8: "Reading 8,427 emails so far · 91% indexed · meetings indexed",
};

const FUND_STRATEGIES = [
  "Hedge fund · long/short equity",
  "Hedge fund · credit",
  "Hedge fund · multi-strategy",
  "Hedge fund · macro",
  "Private equity · buyout",
  "Private equity · growth",
  "Venture capital · early stage",
  "Venture capital · growth stage",
  "Real estate",
  "Infrastructure",
  "Hybrid / multi-strategy",
] as const;

function formatNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return email || "there";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

function identityDisplayName(session: SessionState | null): string {
  if (session?.displayName?.trim()) return session.displayName.trim();
  return formatNameFromEmail(session?.email ?? "");
}

function authProviderLabel(p?: SessionState["authProvider"]): string {
  if (p === "google") return "Google";
  if (p === "microsoft") return "Microsoft 365";
  return "Email";
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState, ready] = usePersistentState<OnboardingState>(ONBOARDING_STATE_STORAGE_KEY, defaultOnboardingState);
  const [session, setSessionSnap] = useState<SessionState | null>(null);

  const [pendingCsvLabel, setPendingCsvLabel] = useState<OnboardingCrmCsvLabel | null>(null);
  const [showPipelinePanel, setShowPipelinePanel] = useState<"none" | "affinity" | "csv">("none");
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsPreview, setContactsPreview] = useState<ContactImportPreview | null>(null);
  const [contactsMapping, setContactsMapping] = useState<ContactImportFieldId[]>([]);
  const [contactsParsing, setContactsParsing] = useState(false);
  const [contactsUploading, setContactsUploading] = useState(false);
  const [affinityListId, setAffinityListId] = useState("");
  const [affinityToken, setAffinityToken] = useState("");
  const [affinitySaving, setAffinitySaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addMeta, setAddMeta] = useState("");
  const [waitNote, setWaitNote] = useState(false);

  const step = Math.min(TOTAL, Math.max(1, state.wizardStep));

  useEffect(() => {
    setSessionSnap(getSession());
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (step !== state.wizardStep) {
      setState((prev) => ({ ...prev, wizardStep: step }));
    }
  }, [ready, step, state.wizardStep, setState]);

  useEffect(() => {
    if (!getSession()) router.replace("/auth");
  }, [router]);

  useEffect(() => {
    if (step !== 2) {
      setContactsFile(null);
      setContactsPreview(null);
      setContactsMapping([]);
      setContactsParsing(false);
    }
  }, [step]);

  const setStep = (n: number) => setState((prev) => ({ ...prev, wizardStep: Math.min(TOTAL, Math.max(1, n)) }));

  const pipelineSatisfied = state.affinityConnected || state.contactImportUploaded;
  const connectValid = state.workspaceBundleConnected && pipelineSatisfied;
  const fundValid = state.fundName.trim().length > 0;
  const raiseValid = state.raiseVehicle.trim().length > 0 && state.raiseTarget.trim().length > 0;

  const continueDisabled =
    (step === 2 && !connectValid) || (step === 3 && !fundValid) || (step === 4 && !raiseValid);

  const primaryFooterLabel =
    step === 7 ? "See the preview" : step === 8 ? "Take me to the app" : "Continue";

  const goNext = () => {
    if (continueDisabled) return;
    setStep(step + 1);
  };

  const goBack = () => setStep(step - 1);

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
      crmImportMethod: prev.crmImportMethod === "csv" ? null : prev.crmImportMethod,
      crmCsvLabel: null,
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
        const label = pendingCsvLabel ?? "generic";
        setState((prev) => ({
          ...prev,
          crmImportMethod: "csv",
          crmCsvLabel: label,
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

  const completeOnboarding = () => {
    const s = getSession();
    if (s) setSession({ ...s, onboardingComplete: true });
    setState((prev) => ({ ...prev, completed: true }));
    if (typeof window !== "undefined") window.location.href = "/home";
    else router.replace("/home");
  };

  const openCsvPanel = (label: OnboardingCrmCsvLabel) => {
    setPendingCsvLabel(label);
    setShowPipelinePanel("csv");
    setContactsFile(null);
    setContactsPreview(null);
    setContactsMapping([]);
    setAffinityListId("");
    setAffinityToken("");
    setState((prev) => ({
      ...prev,
      affinityConnected: false,
      affinityListId: undefined,
      affinityTokenLast4: undefined,
      crmImportMethod: "csv",
      contactImportUploaded: false,
      contactImportFilename: undefined,
      contactImportRowCount: undefined,
      contactImportMappingSummary: undefined,
      crmCsvLabel: null,
    }));
  };

  const openAffinityPanel = () => {
    setShowPipelinePanel("affinity");
    setPendingCsvLabel(null);
    setContactsFile(null);
    setContactsPreview(null);
    setContactsMapping([]);
    setState((prev) => ({
      ...prev,
      crmImportMethod: "affinity",
      contactImportUploaded: false,
      contactImportFilename: undefined,
      contactImportRowCount: undefined,
      contactImportMappingSummary: undefined,
      crmCsvLabel: null,
    }));
  };

  const addTeamMember = () => {
    if (!addName.trim() || !addEmail.trim()) return;
    const row: OnboardingTeamMember = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tm-${Date.now()}`,
      name: addName.trim(),
      email: addEmail.trim(),
      role: addRole.trim() || "Member",
      meta: addMeta.trim() || undefined,
    };
    setState((prev) => ({ ...prev, teamMembersExtra: [...prev.teamMembersExtra, row] }));
    setAddName("");
    setAddEmail("");
    setAddRole("");
    setAddMeta("");
    setAddOpen(false);
  };

  const displayName = useMemo(() => identityDisplayName(session), [session]);
  const email = session?.email ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || "?";

  const toneOptions: { id: OnboardingToneCapture; title: string; tag: string; desc: string }[] = [
    {
      id: "sent_sample",
      title: "Sample from my sent email",
      tag: "Recommended",
      desc: "Tomo will read your last 90 days of LP-facing emails and build a tone model automatically. We'll show you the result on the next screen so you can confirm it sounds right.",
    },
    {
      id: "manual",
      title: "Paste 3–5 representative emails",
      tag: "Manual",
      desc: "If you'd rather curate the sample yourself — useful if your LP-facing voice is very different from your internal voice.",
    },
    {
      id: "skip",
      title: "Skip for now",
      tag: "Default",
      desc: "Tomo will use a generic institutional voice until you provide samples. Drafts will be functional but not specifically yours.",
    },
  ];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-sm text-[color:var(--tomo-mute)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      {/* Top chrome */}
      <header className="fixed left-0 right-0 top-0 z-[100] flex h-14 items-center justify-between border-b border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--background)_88%,transparent)] px-4 backdrop-blur-md md:px-8 dark:bg-[color:color-mix(in_srgb,var(--background)_82%,transparent)]">
        <div className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-tight">tomo</div>
        <div className="flex items-center gap-1 md:gap-0.5">
          {Array.from({ length: TOTAL }, (_, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <div
                key={n}
                className={`h-0.5 w-5 rounded-full transition-colors md:w-6 ${done ? "bg-[color:var(--tomo-teal)]" : current ? "bg-[color:var(--foreground)]" : "bg-[color:var(--tomo-rule)]"}`}
                aria-hidden
              />
            );
          })}
          <span className="ml-2 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)] sm:inline">
            {STEP_LABELS[step]}
          </span>
        </div>
        <div className="w-10 md:w-16" aria-hidden />
      </header>

      {/* Ticker — steps 2+ */}
      {step >= 2 && TICKER_BY_STEP[step] ? (
        <div
          className="fixed bottom-[5.25rem] right-4 z-50 flex max-w-[min(360px,calc(100vw-2rem))] items-center gap-2 rounded-full border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-2 text-[10px] font-mono tracking-wide text-[color:var(--tomo-mute)] shadow-[var(--tomo-shadow-2)] md:bottom-[5.5rem] md:right-8"
          role="status"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--tomo-teal)] opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--tomo-teal)]" />
          </span>
          <span className="leading-snug">{TICKER_BY_STEP[step]}</span>
        </div>
      ) : null}

      <main className={`mx-auto max-w-[760px] px-4 pb-28 pt-[4.5rem] md:px-8 md:pb-32 md:pt-20 ${step === 8 ? "max-w-[1040px]" : ""}`}>
        {/* 1 Welcome */}
        {step === 1 && (
          <div className="max-w-[620px]">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Welcome to Tomo</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-4xl font-normal leading-[1.05] tracking-[-0.022em] md:text-[64px] md:leading-none">
              The capital formation
              <em className="mt-1 block font-[family-name:var(--font-newsreader)] font-light not-italic text-[color:var(--tomo-teal)]">
                operating system.
              </em>
            </h1>
            <p className="mt-6 font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              Tomo isn&apos;t a CRM replacement. It&apos;s the operational layer that does the work alongside your existing pipeline
              tools — drafting outreach, surfacing drift, executing the disciplined patterns that move a raise forward.
            </p>
            <p className="mt-4 font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              The next few minutes will set you up. Tomo will start reading your inbox in the background while you work, so by the
              time you finish you&apos;ll already have a baseline read on where your raise stands.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2.5 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-navy)] px-7 py-3.5 text-sm font-medium text-[color:var(--tomo-canvas)] transition hover:opacity-95 dark:bg-[color:var(--foreground)] dark:text-[color:var(--tomo-canvas)]"
                onClick={() => setStep(2)}
              >
                Begin setup
                <ArrowIcon />
              </button>
              <span className="text-[13px] text-[color:var(--tomo-mute)]">About 12 minutes</span>
            </div>
            <div className="mt-12 flex items-center gap-3.5 border-t border-[color:var(--tomo-rule)] pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--tomo-navy)] font-[family-name:var(--font-newsreader)] text-base font-medium text-[color:var(--tomo-card)] dark:bg-[color:var(--tomo-teal)] dark:text-[color:var(--tomo-canvas)]">
                {avatarLetter}
              </div>
              <div className="min-w-0">
                <div className="font-[family-name:var(--font-newsreader)] text-[15px] font-medium text-[color:var(--foreground)]">
                  {displayName}
                </div>
                <div className="text-xs text-[color:var(--tomo-mute)]">
                  {email || "—"} · signed in via {authProviderLabel(session?.authProvider)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2 Connect */}
        {step === 2 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 1 · Connect</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight tracking-tight md:text-[38px] md:leading-[1.12]">
              Connect your <em className="font-[family-name:var(--font-newsreader)] not-italic text-[color:var(--tomo-teal)]">communication</em> and{" "}
              <em className="font-[family-name:var(--font-newsreader)] not-italic text-[color:var(--tomo-teal)]">pipeline</em> tools.
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              Tomo reads your sent email and calendar to understand who you talk to, how often, and how. It pairs this with your CRM
              to ground every signal in your actual pipeline. Nothing is ever sent or modified without your approval.
            </p>

            <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
              <ConnCard
                icon="G"
                name="Google Workspace"
                desc="Email (sent + received) and calendar. Read-only initially; sending is opt-in per workflow."
                required
                connected={state.workspaceProvider === "google" && state.workspaceBundleConnected}
                onConnect={() => connectWorkspaceBundle("google")}
                actionLabel="Connect Google"
              />
              <ConnCard
                icon="M"
                name="Microsoft 365"
                desc="Outlook mail, calendar, and Microsoft 365 contacts together (mock bundle)."
                required
                connected={state.workspaceProvider === "microsoft" && state.workspaceBundleConnected}
                onConnect={() => connectWorkspaceBundle("microsoft")}
                actionLabel="Connect Microsoft 365"
              />
              <ConnCard
                icon="B"
                name="Backstop"
                desc="Bi-directional sync in production. V1 mock: upload a CRM export (CSV / Excel)."
                required
                connected={state.contactImportUploaded && state.crmCsvLabel === "backstop"}
                onConnect={() => openCsvPanel("backstop")}
                actionLabel="Upload CSV →"
              />
              <ConnCard
                icon="A"
                name="Affinity"
                desc="Bi-directional sync available. Use if Affinity is your primary pipeline."
                connected={state.affinityConnected}
                onConnect={openAffinityPanel}
                actionLabel="Connect →"
              />
              <ConnCard
                icon="F"
                name="Foliometrics"
                desc="CSV import only in V1. Useful for one-time enrichment."
                connected={state.contactImportUploaded && state.crmCsvLabel === "folio"}
                onConnect={() => openCsvPanel("folio")}
                actionLabel="Upload CSV →"
              />
              <ConnCard
                icon="H"
                name="HubSpot"
                desc="CSV import only in V1. Bi-directional sync coming in V1.5."
                connected={state.contactImportUploaded && state.crmCsvLabel === "hubspot"}
                onConnect={() => openCsvPanel("hubspot")}
                actionLabel="Upload CSV →"
              />
              <ConnCard
                icon="·"
                name="CSV upload"
                desc="For LP records you keep in spreadsheets. Tomo will help you map columns."
                connected={state.contactImportUploaded && state.crmCsvLabel === "generic"}
                onConnect={() => openCsvPanel("generic")}
                actionLabel="Upload →"
              />
            </div>

            {showPipelinePanel === "affinity" && (
              <div className="mt-6 space-y-4 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_35%,var(--tomo-card))] p-4 dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_90%,var(--tomo-navy-soft))]">
                <p className="text-sm text-[color:var(--tomo-body)]">Paste your Affinity API key and list ID (mock).</p>
                <div>
                  <label className="tomo-field-label">List ID</label>
                  <input className="tomo-input mt-1 text-sm" value={affinityListId} onChange={(e) => setAffinityListId(e.target.value)} placeholder="e.g. 12345" />
                </div>
                <div>
                  <label className="tomo-field-label">API key</label>
                  <input type="password" className="tomo-input mt-1 text-sm" value={affinityToken} onChange={(e) => setAffinityToken(e.target.value)} placeholder="From Affinity → Settings → API" />
                </div>
                {state.affinityConnected ? (
                  <p className="text-sm text-[color:var(--tomo-status-green)]">Affinity connected (mock). Token …{state.affinityTokenLast4}</p>
                ) : null}
                <button type="button" className="button-primary" disabled={affinitySaving || !affinityListId.trim() || !affinityToken.trim()} onClick={() => void handleAffinityConnect()}>
                  {affinitySaving ? "Connecting…" : "Connect Affinity"}
                </button>
              </div>
            )}

            {showPipelinePanel === "csv" && (
              <div className="mt-6 space-y-4 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:color-mix(in_srgb,var(--tomo-navy-soft)_35%,var(--tomo-card))] p-4 dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_90%,var(--tomo-navy-soft))]">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {pendingCsvLabel === "backstop"
                    ? "Backstop — upload export"
                    : pendingCsvLabel === "hubspot"
                      ? "HubSpot — upload export"
                      : pendingCsvLabel === "folio"
                        ? "Foliometrics — upload export"
                        : "CSV upload"}
                </p>
                {state.contactImportUploaded && !contactsPreview ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[color:var(--tomo-status-green)]">
                      Imported {state.contactImportFilename ?? "file"} (~{state.contactImportRowCount ?? "—"} rows).
                      {state.contactImportMappingSummary ? <> Mapping: {state.contactImportMappingSummary}</> : null}
                    </p>
                    <button type="button" className="text-sm text-[color:var(--tomo-teal-muted)] underline-offset-2 hover:underline" onClick={clearContactsImport}>
                      Replace file
                    </button>
                  </div>
                ) : !contactsPreview ? (
                  <>
                    <ContactImportFileZone accept={CONTACT_IMPORT_ACCEPT} disabled={contactsParsing} onFileSelected={(f) => void handleContactsFileSelected(f)} />
                    <p className="text-xs text-[color:var(--tomo-mute)]">CSV, XLS, or XLSX with a header row.</p>
                    {contactsParsing ? <p className="text-xs text-[color:var(--tomo-mute)]">Reading file…</p> : null}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[color:var(--tomo-mute)]">
                      <span className="font-medium text-[color:var(--foreground)]">{contactsFile?.name}</span> · ~{contactsPreview.rowCountEstimate.toLocaleString()} rows (estimate)
                    </p>
                    <ContactImportFieldMapping headers={contactsPreview.headers} mapping={contactsMapping} onChange={setContactsMappingAt} sampleRow={contactsPreview.sampleRow} idPrefix="ob-crm" />
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="button-primary" disabled={contactsUploading || contactsParsing} onClick={() => void handleContactsUpload()}>
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

            <p className="mt-6 text-xs leading-relaxed text-[color:var(--tomo-mute)]">
              You need at least one CRM connection or CSV upload to continue. Google Workspace or Microsoft 365 is required for the
              email and calendar baseline.
            </p>
          </div>
        )}

        {/* 3 Fund */}
        {step === 3 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 2 · Your fund</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[38px]">
              Tell us about your <em className="not-italic text-[color:var(--tomo-teal)]">fund</em>.
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              This calibrates everything Tomo does — the signals it computes, the drafts it generates, the cohorts it surfaces. Be
              specific. We can change any of this later.
            </p>
            <div className="mt-8 space-y-6">
              <Field label="Fund or firm name">
                <input
                  className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none"
                  value={state.fundName}
                  onChange={(e) => setState((p) => ({ ...p, fundName: e.target.value }))}
                  placeholder="e.g. Robinson Capital Partners"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Strategy">
                  <select className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.fundStrategy} onChange={(e) => setState((p) => ({ ...p, fundStrategy: e.target.value }))}>
                    {FUND_STRATEGIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Current firm AUM">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.fundAum} onChange={(e) => setState((p) => ({ ...p, fundAum: e.target.value }))} placeholder="e.g. $850M" />
                </Field>
              </div>
              <Field label="What's distinctive about your strategy?" hint="Tomo uses this to ground its drafts. Imagine you're explaining it to a new IR analyst who needs to write your first pitch.">
                <textarea
                  className="tomo-input min-h-[110px] w-full resize-y px-4 py-3 text-[15px] shadow-none"
                  value={state.fundDistinction}
                  onChange={(e) => setState((p) => ({ ...p, fundDistinction: e.target.value }))}
                  placeholder="A few sentences. The angle, the mandate, what wins."
                />
              </Field>
            </div>
          </div>
        )}

        {/* 4 Raise */}
        {step === 4 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 3 · Your raise</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[38px]">
              What are you <em className="not-italic text-[color:var(--tomo-teal)]">raising</em> right now?
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              The current campaign — its target, its timing, what&apos;s already in motion. This shapes how Tomo prioritises which LPs
              to surface and which workflows to run.
            </p>
            <div className="mt-8 space-y-6">
              <Field label="Vehicle / vintage">
                <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseVehicle} onChange={(e) => setState((p) => ({ ...p, raiseVehicle: e.target.value }))} placeholder="e.g. Fund III · 2026 vintage" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target raise">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseTarget} onChange={(e) => setState((p) => ({ ...p, raiseTarget: e.target.value }))} placeholder="$500M" />
                </Field>
                <Field label="Soft-circled so far">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseSoftCircled} onChange={(e) => setState((p) => ({ ...p, raiseSoftCircled: e.target.value }))} placeholder="$120M" />
                </Field>
                <Field label="Target close date">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseCloseTarget} onChange={(e) => setState((p) => ({ ...p, raiseCloseTarget: e.target.value }))} placeholder="Q1 2027" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="LPs in active diligence">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseDiligenceCount} onChange={(e) => setState((p) => ({ ...p, raiseDiligenceCount: e.target.value }))} placeholder="e.g. 12" />
                </Field>
                <Field label="LPs you're targeting overall">
                  <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={state.raiseTargetingCount} onChange={(e) => setState((p) => ({ ...p, raiseTargetingCount: e.target.value }))} placeholder="e.g. 80" />
                </Field>
              </div>
              <Field
                label="Are you launching anything new — or aspirations beyond this raise?"
                hint="Even forward-looking ambitions help Tomo. LPs interested in the credit sleeve aren't relevant to Fund III, but Tomo will track them for you."
              >
                <textarea
                  className="tomo-input min-h-[110px] w-full resize-y px-4 py-3 text-[15px] shadow-none"
                  value={state.raiseAspirations}
                  onChange={(e) => setState((p) => ({ ...p, raiseAspirations: e.target.value }))}
                  placeholder="A new strategy in 18 months, a co-investment program…"
                />
              </Field>
            </div>
          </div>
        )}

        {/* 5 Team */}
        {step === 5 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 4 · Your team</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[38px]">
              Who else is on the <em className="not-italic text-[color:var(--tomo-teal)]">raise team</em>?
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              Tomo separates internal correspondents from LPs based on this list. Anyone here will be treated as &quot;team&quot; rather than
              as an LP, even if they appear frequently in your inbox. Add team members now or later.
            </p>
            <div className="mt-8 space-y-2.5">
              <div className="flex items-center gap-3.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)] px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--tomo-teal)] font-[family-name:var(--font-newsreader)] text-xs font-medium text-white">
                  {initials(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[color:var(--foreground)]">{displayName}</div>
                  <div className="text-[11px] text-[color:var(--tomo-mute)]">
                    {email} · admin · sees all LPs
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[color:var(--tomo-teal-evidence-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[color:var(--tomo-teal-muted)]">
                  You · Admin
                </span>
              </div>
              {state.teamMembersExtra.map((m) => (
                <div key={m.id} className="flex items-center gap-3.5 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--tomo-navy-soft)] font-[family-name:var(--font-newsreader)] text-xs font-medium">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[color:var(--foreground)]">{m.name}</div>
                    <div className="text-[11px] text-[color:var(--tomo-mute)]">
                      {m.email}
                      {m.meta ? ` · ${m.meta}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[color:var(--tomo-card-warm)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[color:var(--tomo-mute)]">{m.role}</span>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 flex w-full items-center gap-2 rounded-[var(--tomo-radius-md)] border border-dashed border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] px-4 py-3 text-left text-[13px] text-[color:var(--tomo-mute)] transition hover:border-[color:var(--foreground)] hover:text-[color:var(--foreground)]" onClick={() => setAddOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add a team member
            </button>
            <p className="mt-6 text-xs leading-relaxed text-[color:var(--tomo-mute)]">
              Tomo also identified <strong className="text-[color:var(--foreground)]">3 frequent internal correspondents</strong> in your inbox (counsel, fund admin, prime broker). You can mark these as &quot;service providers&quot; later — they won&apos;t be confused with LPs.
            </p>
          </div>
        )}

        {/* 6 Tone */}
        {step === 6 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 5 · Your voice</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[38px]">
              Tomo writes in <em className="not-italic text-[color:var(--tomo-teal)]">your voice</em>, not its own.
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              Every draft Tomo produces is calibrated against the way you actually write. We need a small sample to anchor the tone.
              You can refine this any time from settings.
            </p>
            <div className="mt-8 space-y-3">
              {toneOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, toneCapture: opt.id }))}
                  className={`w-full rounded-[var(--tomo-radius-md)] border p-5 text-left transition ${state.toneCapture === opt.id ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)]" : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] hover:border-[color:var(--foreground)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[family-name:var(--font-newsreader)] text-[17px] font-medium text-[color:var(--foreground)]">{opt.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${state.toneCapture === opt.id ? "bg-[color:var(--tomo-teal)] text-white" : "bg-[color:var(--tomo-card-warm)] text-[color:var(--tomo-mute)]"}`}
                    >
                      {opt.tag}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--tomo-body)]">{opt.desc}</p>
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs text-[color:var(--tomo-mute)]">
              Tomo never generates drafts in someone else&apos;s voice without permission. Tone capture is local to your workspace.
            </p>
          </div>
        )}

        {/* 7 First read */}
        {step === 7 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 6 · A first read</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[38px]">
              While you&apos;ve been here, <em className="not-italic text-[color:var(--tomo-teal)]">Tomo has been reading.</em>
            </h1>
            <p className="mt-5 max-w-[580px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              A partial sample so far — about 30 days of email. Not enough for the full report yet, but enough to confirm the system is
              working correctly. A few things Tomo has already noticed:
            </p>
            <div className="mt-8 space-y-3">
              <Notice eyebrow="Identified" body={<><strong>187 LP-like correspondents</strong> in your inbox so far, across <strong>71 institutions</strong>. Tomo will continue refining this list as the full 12-month read completes — expect the final number to be higher.</>} />
              <Notice
                eyebrow="Most active recent thread"
                body={
                  <>
                    <span className="bg-[color:var(--tomo-status-amber-bg)] px-1 italic text-[color:var(--foreground)]">Edoardo Lanzavecchia at Lingotto Investment Management</span> — 14 emails in the last 6 weeks, all on <strong>Italian credit</strong>. Last contact 3 days ago. Tomo flagged this as a high-engagement thread.
                  </>
                }
              />
              <Notice
                eyebrow="Tone calibration"
                body={
                  <>
                    Your voice came through as <strong>direct, market-aware, brief</strong>. You favour empirical framings over emotional ones. Drafts will mirror that.{" "}
                    <span className="text-[13px] text-[color:var(--tomo-mute)]">→ adjust on next screen if this sounds off</span>
                  </>
                }
              />
            </div>
            <p className="mt-6 text-xs leading-relaxed text-[color:var(--tomo-mute)]">
              Full report — including 12-month engagement patterns, mandate-fit gaps, and drifting LPs — will land in your{" "}
              <strong className="text-[color:var(--foreground)]">Briefings</strong> section in a few hours. We&apos;ll preview the highlights on the next screen.
            </p>
          </div>
        )}

        {/* 8 Briefing preview */}
        {step === 8 && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--tomo-teal)]">Step 7 · First-Read Briefing · Preview</p>
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl font-normal leading-tight md:text-[40px]">
              Your <em className="not-italic text-[color:var(--tomo-teal)]">First-Read Briefing</em>, in five numbers.
            </h1>
            <p className="mt-5 max-w-[640px] font-[family-name:var(--font-newsreader)] text-lg font-light leading-relaxed text-[color:var(--tomo-body)] md:text-[19px]">
              Based on what Tomo has read of your inbox so far. These are the headlines — the full briefing, including 12-month patterns and mandate-fit analysis, will land in{" "}
              <strong className="text-[color:var(--foreground)]">Briefings</strong> in a few hours.
            </p>

            <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule-soft)] bg-[color:var(--tomo-rule-soft)] sm:grid-cols-2">
              <GapCell label="LPs in your inbox" num="187" unit="people · 71 firms" desc={<>Tomo identified these as LP-like correspondents based on email patterns. <strong>Final number after 12-month read will likely be 240–280.</strong></>} />
              <GapCell label="No contact in 30+ days" num="62" unit="LPs" desc={<>No email, calendar event, or recorded meeting in the last 30 days. <strong>Some will be in-person or phone-only — Tomo will let you mark those.</strong></>} />
              <GapCell label="Active engagement (last 14d)" num="31" unit="LPs" desc="Two-way email or recent meeting. Your most engaged conversations right now — Tomo will surface these on Today." />
              <GapCell
                label="Estimated Fat Middle"
                num="≈ 18"
                unit="LPs"
                desc={<>Warm-stage LPs going quiet. <strong>The single most valuable cohort to re-engage.</strong> Three-Touch Qualification is preset for this list.</>}
              />
              <div className="bg-[color:var(--tomo-card)] p-7 sm:col-span-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">Last meeting captured</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-2 font-[family-name:var(--font-fraunces)] text-5xl font-normal tracking-tight text-[color:var(--foreground)]">
                  9 <span className="font-sans text-sm font-medium text-[color:var(--tomo-mute)]">days ago · CPPIB · Frank Ieraci</span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--tomo-body)]">
                  The last LP meeting on your calendar. <strong>You sent a follow-up 2 days later.</strong> Tomo will start drafting these within 30 minutes from your next meeting onward.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[var(--tomo-radius-sm)] border-l-2 border-[color:var(--tomo-status-amber)] bg-[color:var(--tomo-card-warm)] px-4 py-3.5 font-mono text-[11px] leading-relaxed tracking-wide text-[color:var(--tomo-mute)] dark:bg-[color:color-mix(in_srgb,var(--tomo-card)_70%,var(--tomo-status-amber-bg))]">
              <strong className="text-[color:var(--foreground)]">Why these numbers might shift.</strong> Tomo&apos;s full read is still in progress — about 18% of your 12-month inbox so far. Some &quot;no contact in 30 days&quot; LPs may turn out to be active off-channel (phone or in-person); Tomo will surface a verification flow on the Relationships page so you can correct any false positives. Final First-Read Briefing arrives in your Briefings section in roughly 3 hours.
            </div>

            <div className="mt-6 rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-6 md:p-7">
              <div className="font-[family-name:var(--font-newsreader)] text-lg font-medium text-[color:var(--foreground)]">What&apos;s coming in the full briefing</div>
              <ul className="mt-3 list-none space-y-2 text-sm leading-relaxed text-[color:var(--tomo-body)]">
                <li className="relative pl-6 before:absolute before:left-0 before:text-[color:var(--tomo-teal)] before:content-['→']">
                  <strong className="text-[color:var(--foreground)]">12-month engagement patterns</strong> — which LPs heat up before you raise vs. respond only after closes
                </li>
                <li className="relative pl-6 before:absolute before:left-0 before:text-[color:var(--tomo-teal)] before:content-['→']">
                  <strong className="text-[color:var(--foreground)]">Mandate-fit gaps</strong> — LPs in your inbox whose mandate doesn&apos;t match your strategy, plus mandates you should be in front of but aren&apos;t
                </li>
                <li className="relative pl-6 before:absolute before:left-0 before:text-[color:var(--tomo-teal)] before:content-['→']">
                  <strong className="text-[color:var(--foreground)]">Drifting Tier 1 LPs</strong> — the highest-conviction LPs whose engagement has cooled in the last 90 days
                </li>
                <li className="relative pl-6 before:absolute before:left-0 before:text-[color:var(--tomo-teal)] before:content-['→']">
                  <strong className="text-[color:var(--foreground)]">Response cadence baselines</strong> — typical reply times per LP, so Tomo can flag genuine drift vs normal slow responders
                </li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-teal)] px-7 py-3.5 text-sm font-medium text-white transition hover:opacity-95" onClick={completeOnboarding}>
                Take me to the app
                <ArrowIcon />
              </button>
              <button
                type="button"
                className="rounded-[var(--tomo-radius-sm)] border border-[color:var(--tomo-rule)] bg-transparent px-6 py-3.5 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--foreground)]"
                onClick={() => setWaitNote(true)}
              >
                I&apos;ll wait for the full briefing
              </button>
            </div>
            {waitNote ? (
              <p className="mt-4 text-sm text-[color:var(--tomo-body)]">
                You&apos;ll get an in-app notification when the full briefing is ready. Until then, Today and Relationships will populate as Tomo finishes indexing.
              </p>
            ) : null}

            <p className="mt-8 text-xs leading-relaxed text-[color:var(--tomo-mute)]">
              <strong className="text-[color:var(--foreground)]">A note on what Tomo sees and doesn&apos;t.</strong> Tomo only flags drift when email, calendar, and CRM all show no activity — so an LP you&apos;ve been calling won&apos;t get flagged as &quot;quiet&quot; just because you haven&apos;t emailed. If you do see a flag that&apos;s wrong, the Relationships page has an &quot;Actually I&apos;m in touch (off-channel)&quot; affordance — Tomo learns from your correction.
            </p>
          </div>
        )}
      </main>

      {/* Bottom step nav — steps 2–7: Back + Continue; step 8 uses in-content CTAs only */}
      {step >= 2 && step <= 7 ? (
        <nav className="fixed bottom-0 left-0 right-0 z-[90] border-t border-[color:var(--tomo-rule-soft)] bg-[color:color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-3 backdrop-blur-md md:px-8 dark:bg-[color:color-mix(in_srgb,var(--background)_90%,transparent)]">
          <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4">
            <button type="button" className="text-[13px] text-[color:var(--tomo-mute)] transition hover:text-[color:var(--foreground)]" onClick={goBack}>
              ← Back
            </button>
            <button
              type="button"
              disabled={continueDisabled}
              title={continueDisabled ? "Complete required fields to continue" : undefined}
              className="inline-flex items-center gap-2 rounded-[var(--tomo-radius-sm)] bg-[color:var(--tomo-navy)] px-6 py-3 text-sm font-medium text-[color:var(--tomo-canvas)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[color:var(--foreground)] dark:text-[color:var(--tomo-canvas)]"
              onClick={goNext}
            >
              {primaryFooterLabel}
              <ArrowIcon />
            </button>
          </div>
        </nav>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[color:var(--tomo-modal-scrim)] p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--tomo-radius-md)] border border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)] p-5 shadow-[var(--tomo-modal-shadow)]">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">Add team member</p>
            <div className="mt-4 space-y-3">
              <Field label="Name">
                <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={addName} onChange={(e) => setAddName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </Field>
              <Field label="Role">
                <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={addRole} onChange={(e) => setAddRole(e.target.value)} placeholder="e.g. Partner" />
              </Field>
              <Field label="Notes (optional)">
                <input className="tomo-input w-full px-4 py-3.5 text-[15px] shadow-none" value={addMeta} onChange={(e) => setAddMeta(e.target.value)} placeholder="e.g. joining May" />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="button-secondary" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button-primary" onClick={addTeamMember}>
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[color:var(--tomo-mute)]">{label}</label>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-[color:var(--tomo-mute)]">{hint}</span> : null}
    </div>
  );
}

function ConnCard({
  icon,
  name,
  desc,
  required,
  connected,
  onConnect,
  actionLabel,
}: {
  icon: string;
  name: string;
  desc: string;
  required?: boolean;
  connected: boolean;
  onConnect: () => void;
  actionLabel: string;
}) {
  return (
    <div
      className={`relative rounded-[var(--tomo-radius-md)] border p-5 transition hover:-translate-y-px hover:shadow-[var(--tomo-shadow-2)] ${connected ? "border-[color:var(--tomo-teal)] bg-[color:var(--tomo-teal-evidence-bg)]" : "border-[color:var(--tomo-rule)] bg-[color:var(--tomo-card)]"}`}
    >
      {required ? (
        <span className="absolute right-4 top-3.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[color:var(--tomo-status-amber-text)]">Required</span>
      ) : null}
      <div
        className={`mb-3.5 flex h-9 w-9 items-center justify-center rounded-[var(--tomo-radius-sm)] font-[family-name:var(--font-fraunces)] text-base font-medium ${connected ? "bg-[color:var(--tomo-teal)] text-white" : "bg-[color:var(--tomo-card-warm)] text-[color:var(--foreground)]"}`}
      >
        {icon}
      </div>
      <div className="font-[family-name:var(--font-newsreader)] text-base font-medium text-[color:var(--foreground)]">{name}</div>
      <p className="mt-1 text-xs leading-relaxed text-[color:var(--tomo-body)]">{desc}</p>
      <button type="button" className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--tomo-mute)] hover:text-[color:var(--tomo-teal)]" onClick={onConnect}>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 text-[color:var(--tomo-teal)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--tomo-teal)]" />
            Connected
          </span>
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}

function Notice({ eyebrow, body }: { eyebrow: string; body: React.ReactNode }) {
  return (
    <div className="rounded-r-[var(--tomo-radius-md)] border-l-[3px] border-[color:var(--tomo-teal)] bg-[color:var(--tomo-card)] py-5 pl-6 pr-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--tomo-teal)]">{eyebrow}</div>
      <div className="mt-2 font-[family-name:var(--font-newsreader)] text-[17px] leading-relaxed text-[color:var(--foreground)]">{body}</div>
    </div>
  );
}

function GapCell({ label, num, unit, desc }: { label: string; num: string; unit: string; desc: React.ReactNode }) {
  return (
    <div className="bg-[color:var(--tomo-card)] p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--tomo-mute)]">{label}</div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2 font-[family-name:var(--font-fraunces)] text-5xl font-normal tracking-tight text-[color:var(--foreground)] md:text-[56px]">
        {num}{" "}
        <span className="font-sans text-sm font-medium text-[color:var(--tomo-mute)]">{unit}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--tomo-body)]">{desc}</p>
    </div>
  );
}
