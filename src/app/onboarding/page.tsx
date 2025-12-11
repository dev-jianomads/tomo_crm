"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/auth";
import { OnboardingState } from "@/lib/types";
import { usePersistentState } from "@/lib/storage";

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
  slackConnected: false,
  telegramConnected: false,
  notifications: defaultNotifications,
  completed: false,
};

const slackInstallUrl = "https://example.com/slack/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState, ready] = usePersistentState<OnboardingState>("tomo-onboarding", initialState);
  const [currentStep, setCurrentStep] = useState(1);
  const [telegramNumber, setTelegramNumber] = useState(state.telegramPhone ?? "");
  const [slackOpened, setSlackOpened] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) router.replace("/auth");
    if (session?.onboardingComplete) router.replace("/home");
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (state.completed) {
      const session = getSession();
      if (session) {
        setSession({ ...session, onboardingComplete: true });
        router.replace("/home");
      }
    }
  }, [ready, state.completed, router]);

  const markConnected = (key: keyof Pick<OnboardingState, "calendarConnected" | "contactsConnected" | "emailConnected">) => {
    setState({ ...state, [key]: true });
    goNext();
  };

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, 6));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const toggleNotification = (row: string, channel: "email" | "slack" | "telegram" | "inApp") => {
    setState({
      ...state,
      notifications: {
        ...state.notifications,
        [row]: { ...state.notifications[row], [channel]: !state.notifications[row]?.[channel] },
      },
    });
  };

  const completeOnboarding = () => {
    const session = getSession();
    if (session) {
      setSession({ ...session, onboardingComplete: true });
    }
    setState({ ...state, completed: true });
    router.replace("/home");
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Onboarding</p>
            <h1 className="text-2xl font-semibold text-gray-900">Connect your workspace</h1>
          </div>
          <div className="hidden text-sm text-gray-500 md:block">Step {currentStep} of 6</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`rounded-md border px-3 py-2 text-sm ${
                currentStep === step ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              Step {step}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {currentStep === 1 && (
            <StepCard
              title="Sync your calendar"
              description="TOMO uses your calendar to prepare meeting briefs and reminders."
              actions={
                <div className="flex flex-wrap gap-2">
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("calendarConnected")}>
                    <img src="/icons/google-calendar.svg" alt="Google Calendar" className="h-4 w-4" />
                    Connect Google Calendar
                  </button>
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("calendarConnected")}>
                    <img src="/icons/microsoft-calendar.svg" alt="Microsoft Calendar" className="h-4 w-4" />
                    Connect Microsoft 365 Calendar
                  </button>
                </div>
              }
              status={state.calendarConnected}
            />
          )}

          {currentStep === 2 && (
            <StepCard
              title="Sync your contacts"
              description="TOMO builds your contact graph and relationship history from your contacts."
              actions={
                <div className="flex flex-wrap gap-2">
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("contactsConnected")}>
                    <img src="/icons/google-contacts.svg" alt="Google Contacts" className="h-4 w-4" />
                    Connect Google Contacts
                  </button>
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("contactsConnected")}>
                    <img src="/icons/microsoft-contacts.svg" alt="Microsoft Contacts" className="h-4 w-4" />
                    Connect Microsoft 365 Contacts
                  </button>
                </div>
              }
              status={state.contactsConnected}
            />
          )}

          {currentStep === 3 && (
            <StepCard
              title="Connect your email (recommended)"
              description="Enable follow-ups, recaps, and automated detection of commitments from your emails."
              actions={
                <div className="flex flex-wrap gap-2">
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("emailConnected")}>
                    <img src="/icons/gmail.svg" alt="Gmail" className="h-4 w-4" />
                    Connect Gmail
                  </button>
                  <button className="button-secondary flex items-center gap-2" onClick={() => markConnected("emailConnected")}>
                    <img src="/icons/outlook.svg" alt="Outlook" className="h-4 w-4" />
                    Connect Outlook
                  </button>
                  <button className="text-sm text-gray-600 underline" onClick={goNext}>
                    Skip for now
                  </button>
                </div>
              }
              status={state.emailConnected}
            />
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connect messaging channels</h2>
                  <p className="text-sm text-gray-600">
                    Receive TOMO recaps and act on suggestions directly from Slack or Telegram.
                  </p>
                </div>
                <div className="text-sm text-gray-500">Optional</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <img src="/icons/slack.svg" alt="Slack" className="h-5 w-5" />
                        <p className="text-base font-semibold text-gray-900">Slack</p>
                      </div>
                      <p className="text-sm text-gray-600">Install the Ask Tomo app to get recaps and take action.</p>
                    </div>
                    {state.slackConnected ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Connected ✓</span>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    <li>• Morning and evening recaps</li>
                    <li>• Meeting briefs and follow-up reminders</li>
                    <li>• Actionable command cards in Slack</li>
                  </ul>
                  <div className="mt-4 space-y-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    <p>We’ll open Slack so you can grant TOMO permission to install the Ask Tomo app.</p>
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium">
                      <span className="truncate">{slackInstallUrl}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(slackInstallUrl)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Copy link
                      </button>
                    </div>
                    <button
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

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <img src="/icons/telegram.svg" alt="Telegram" className="h-5 w-5" />
                        <p className="text-base font-semibold text-gray-900">Telegram</p>
                      </div>
                      <p className="text-sm text-gray-600">Send recaps, briefs, and commands via Telegram.</p>
                    </div>
                    {state.telegramConnected ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Onboarding link sent ✓</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Enter your Telegram phone number and TOMO will send you an onboarding link directly.
                  </p>
                  <div className="mt-3 space-y-2">
                    <label className="text-xs uppercase tracking-wide text-gray-500">Telegram phone number</label>
                    <input
                      value={telegramNumber}
                      onChange={(e) => setTelegramNumber(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    className="button-primary mt-3 w-full"
                    onClick={() => {
                      if (!telegramNumber.trim()) return;
                      setState({ ...state, telegramConnected: true, telegramPhone: telegramNumber });
                    }}
                  >
                    Send onboarding link
                  </button>
                  {state.telegramConnected ? (
                    <p className="mt-2 text-xs text-green-700">
                      We’ve sent you a message from TOMO’s Telegram bot with your onboarding link.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button className="text-sm text-gray-600 underline" onClick={goNext}>
                  Skip for now
                </button>
                <button className="button-primary" onClick={goNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Choose how TOMO notifies you</h2>
                  <p className="text-sm text-gray-600">You can change these settings anytime.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-5 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <div>Type</div>
                  <div>Email</div>
                  <div>Slack</div>
                  <div>Telegram</div>
                  <div>In-App</div>
                </div>
                <div className="divide-y divide-gray-200">
                  {Object.keys(state.notifications).map((row) => (
                    <div key={row} className="grid grid-cols-5 items-center px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium">{row.replace(/([A-Z])/g, " $1")}</div>
                      {(["email", "slack", "telegram", "inApp"] as const).map((channel) => {
                        const disabled =
                          (channel === "slack" && !state.slackConnected) || (channel === "telegram" && !state.telegramConnected);
                        return (
                          <button
                            key={channel}
                            disabled={disabled}
                            onClick={() => toggleNotification(row, channel)}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md border ${
                              state.notifications[row]?.[channel] ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500"
                            } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-blue-200 hover:text-blue-600"}`}
                            title={
                              disabled
                                ? "Connect in Settings → Messaging to enable this channel."
                                : `Toggle ${channel} notifications`
                            }
                          >
                            ✓
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button className="text-sm text-gray-600 underline" onClick={goBack}>
                  Back
                </button>
                <button className="button-primary" onClick={goNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Your workspace is ready</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <StatusLine label="Calendar connected" ok={state.calendarConnected} />
                <StatusLine label="Contacts synced" ok={state.contactsConnected} />
                <StatusLine label="Email connected" ok={state.emailConnected} />
                <StatusLine label="Slack" ok={state.slackConnected} />
                <StatusLine label="Telegram" ok={state.telegramConnected} />
              </div>
              <button className="button-primary" onClick={completeOnboarding}>
                Enter workspace
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            TOMO keeps context from each step (plan, integrations) and will use it in briefs and follow-ups.
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button className="text-sm text-gray-600 underline" onClick={goBack}>
                Back
              </button>
            )}
            {currentStep < 6 && (
              <button className="button-primary" onClick={goNext}>
                Next
              </button>
            )}
          </div>
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
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {status ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Connected ✓</span> : null}
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


