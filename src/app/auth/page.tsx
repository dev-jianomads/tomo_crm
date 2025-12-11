"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setSession, getSession } from "@/lib/auth";
import { PlanType, SessionState } from "@/lib/types";
import { readFromStorage } from "@/lib/storage";

const plans: { id: PlanType; title: string; bullets: string[]; price: string; badge?: string }[] = [
  {
    id: "individual",
    title: "Individual",
    bullets: ["1 user", "Contacts auto-sync", "Meeting briefs", "Follow-up suggestions", "TOMO AI assistant"],
    price: "$X/month",
  },
  {
    id: "team",
    title: "Team",
    bullets: [
      "Multiple users",
      "Shared contacts workspace",
      "Shared activity timeline",
      "Collaborative meeting briefs",
      "TOMO AI for the whole team",
      "14-day free trial",
    ],
    price: "$X/user/month",
    badge: "14-day trial",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("individual");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.onboardingComplete) router.replace("/home");
    if (session && !session.onboardingComplete) router.replace("/onboarding");
  }, [router]);

  const handleContinue = () => {
    if (!email) return;
    const existing = readFromStorage<SessionState | null>("tomo-session", null);
    const onboardingComplete = existing?.email === email ? existing.onboardingComplete : false;
    const session: SessionState = { email, plan: selectedPlan, onboardingComplete };
    setSession(session);
    if (onboardingComplete) {
      router.replace("/home");
    } else {
      router.replace("/onboarding");
    }
  };

  const handleReset = () => {
    setResetSent(true);
    setTimeout(() => setShowReset(false), 1200);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-16">
        <div className="flex items-center gap-2">
          <img src="/tomo-logo.png" alt="Tomo logo" className="h-8 w-8 rounded" />
          <span className="text-sm font-semibold text-gray-900">Tomo</span>
        </div>

        <div className="grid gap-2 md:grid-cols-2 md:items-start md:gap-8">
          <div className="w-full">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-900">Pick a plan</p>
              <p className="text-xs text-gray-600">Choose what fits now; you can switch later in Settings → Billing.</p>
            </div>
            <div className="grid gap-4">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full rounded-lg border p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30 ${
                    selectedPlan === plan.id ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border ${selectedPlan === plan.id ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                      />
                      <p className="text-base font-medium text-gray-900">{plan.title}</p>
                    </div>
                    {plan.badge ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{plan.price}</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {plan.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
          </div>
        </div>

          <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
          <p className="text-sm font-medium text-gray-900">Welcome to TOMO</p>
          <p className="text-sm text-gray-600">Sign in or create your workspace</p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wide text-gray-500">Password</label>
                <button onClick={() => setShowReset(true)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleContinue}
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Continue
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex-1 border-t border-gray-200" />
              <span>Or continue with</span>
              <span className="flex-1 border-t border-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <img src="/icons/google.svg" alt="Google" className="h-4 w-4" />
                Google
              </button>
              <button className="flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <img src="/icons/microsoft.svg" alt="Microsoft" className="h-4 w-4" />
                Microsoft 365
              </button>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Using <span className="font-medium text-gray-700">{selectedPlan === "team" ? "Team" : "Individual"}</span> plan. Seat
            management is handled later in Settings → Billing.
          </p>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">Reset password</p>
                <p className="text-sm text-gray-600">We’ll send a reset link to the email below.</p>
              </div>
              <button className="text-gray-500" onClick={() => setShowReset(false)}>
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {resetSent ? (
              <div className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                We’ve sent a reset link to {email || "your email"}. Check your inbox.
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="text-sm text-gray-600" onClick={() => setShowReset(false)}>
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Send reset link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

