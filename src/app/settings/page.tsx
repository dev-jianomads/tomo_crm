/**
 * =============================================================================
 * TOMO CRM - Settings Page
 * =============================================================================
 * 
 * User settings including profile, integrations, messaging, notifications, and billing.
 * 
 * SECTIONS:
 * 1. Profile - User name, email, preferences
 * 2. Integrations - Calendar, Contacts, Email, Affinity, Google Sheets
 * 3. Messaging - Slack, Telegram
 * 4. Notifications - Delivery preferences per channel
 * 5. Billing & Plan - Stripe subscription management
 * 
 * PRODUCTION WIRING OVERVIEW:
 * 
 * PROFILE:
 * - Fetch user data from Supabase `users` table
 * - Update via Supabase on save
 * - Display name also used by Tomo AI for personalization
 * 
 * INTEGRATIONS:
 * - Status fetched from Supabase `user_integrations` table
 * - Connect/disconnect actions call server-side API routes
 * - See src/lib/integrations.ts for detailed API documentation
 * 
 * BILLING (STRIPE):
 * - Display current plan from Stripe subscription
 * - "Select plan" → Stripe Checkout Session
 * - "Manage seats" → Stripe Customer Portal
 * 
 * SIGN OUT:
 * - Firebase signOut() + clear any cached data
 * =============================================================================
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { clearSession, useRequireSession } from "@/lib/auth";
import { connectAffinity, createGoogleSheet, startGoogleAuth } from "@/lib/integrations";
import { usePersistentState } from "@/lib/storage";
import { OnboardingState } from "@/lib/types";

const sections = ["Profile", "Integrations", "Messaging", "Notifications", "Billing & Plan"] as const;

export default function SettingsPage() {
  const { ready, session } = useRequireSession();
  const router = useRouter();
  const [active, setActive] = useState<(typeof sections)[number]>("Profile");
  
  /**
   * Integration state
   * CURRENT: Stored in localStorage via usePersistentState
   * PRODUCTION: Fetch from Supabase `user_integrations` table
   * 
   * Schema suggestion:
   * ```sql
   * CREATE TABLE user_integrations (
   *   user_id TEXT PRIMARY KEY REFERENCES users(id),
   *   calendar_connected BOOLEAN DEFAULT FALSE,
   *   calendar_provider TEXT, -- 'google' | 'microsoft'
   *   calendar_token_encrypted TEXT,
   *   contacts_connected BOOLEAN DEFAULT FALSE,
   *   email_connected BOOLEAN DEFAULT FALSE,
   *   slack_connected BOOLEAN DEFAULT FALSE,
   *   slack_workspace_id TEXT,
   *   telegram_connected BOOLEAN DEFAULT FALSE,
   *   telegram_chat_id TEXT,
   *   affinity_connected BOOLEAN DEFAULT FALSE,
   *   affinity_list_id TEXT,
   *   affinity_token_encrypted TEXT,
   *   google_sheets_connected BOOLEAN DEFAULT FALSE,
   *   google_sheets_id TEXT,
   *   google_sheets_filename TEXT,
   *   updated_at TIMESTAMP DEFAULT NOW()
   * );
   * ```
   */
  const [integrations, setIntegrations] = usePersistentState<OnboardingState>("tomo-onboarding", {
    calendarConnected: false,
    contactsConnected: false,
    emailConnected: false,
    slackConnected: false,
    telegramConnected: false,
    affinityConnected: false,
    googleSheetsConnected: false,
    googleSheetsAuthed: false,
    notifications: {},
    completed: false,
  });
  
  // Affinity form state
  const [affinityListId, setAffinityListId] = useState(integrations.affinityListId ?? "");
  const [affinityToken, setAffinityToken] = useState("");
  
  // Google Sheets form state
  const [sheetName, setSheetName] = useState(integrations.googleSheetsFilename ?? generatePresetSheetName());
  
  // Loading states
  const [savingAffinity, setSavingAffinity] = useState(false);
  const [authingSheet, setAuthingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);

  /**
   * Settings navigation sidebar
   */
  const listContent = (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">Settings</p>
        <p className="text-sm text-gray-600">Workspace controls</p>
        
        {/* 
          Sign Out Button
          PRODUCTION: Replace clearSession() with Firebase signOut()
          ```
          import { signOut } from 'firebase/auth';
          import { auth } from '@/lib/firebase';
          
          onClick={async () => {
            await signOut(auth);
            clearUserStorage(session.uid); // Clear cached data
            router.replace("/auth");
          }}
          ```
        */}
        <button
          onClick={() => {
            clearSession();
            router.replace("/auth");
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300"
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Sign out
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setActive(section)}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
              active === section ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  );

  /**
   * Settings detail content (changes based on selected section)
   */
  const detailContent = (
    <div className="h-full overflow-auto p-4">
      {/* ====== PROFILE SECTION ====== */}
      {active === "Profile" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <p className="text-sm text-gray-600">Manage your name, email, and workspace identity.</p>
          
          {/*
            Profile Form
            PRODUCTION: 
            - Fetch initial values from Supabase user record
            - Add save button that updates Supabase
            - Consider adding profile photo upload
            
            ```
            const updateProfile = async () => {
              await supabase
                .from('users')
                .update({ display_name: name, ... })
                .eq('id', session.uid);
            };
            ```
          */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">Name</label>
              <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" defaultValue="Jordan Doe" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">Email</label>
              <input className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" defaultValue={session?.email ?? ""} />
            </div>
          </div>
          <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            TOMO uses your profile to personalize briefs and messages.
          </p>
        </div>
      )}

      {/* ====== INTEGRATIONS SECTION ====== */}
      {active === "Integrations" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-600">Manage calendar, contacts, email, Affinity, and Sheets connections.</p>
          
          {/* 
            Core integrations (Calendar, Contacts, Email)
            PRODUCTION: Add connect/reconnect buttons for each
            See onboarding page for OAuth flow patterns
          */}
          <IntegrationRow title="Calendar" status={integrations.calendarConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Contacts" status={integrations.contactsConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Email" status={integrations.emailConnected ? "Connected" : "Optional"} />

          {/* Affinity + Google Sheets cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 
              ====== AFFINITY CRM INTEGRATION ======
              See src/lib/integrations.ts for full API documentation
              
              PRODUCTION FLOW:
              1. User enters List ID and API Token
              2. Click Connect → POST /api/integrations/affinity/connect
              3. Server validates token, encrypts, stores in Supabase
              4. Server returns success + token last 4 chars
              5. Optionally trigger initial sync: POST /api/integrations/affinity/sync
            */}
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
                  className="button-primary flex-1"
                  disabled={savingAffinity || !affinityListId.trim() || !affinityToken.trim()}
                  onClick={async () => {
                    if (!affinityListId.trim() || !affinityToken.trim()) return;
                    setSavingAffinity(true);
                    try {
                      // MOCK: Replace with real API call in production
                      const res = await connectAffinity({ listId: affinityListId.trim(), apiToken: affinityToken.trim() });
                      if (res.ok) {
                        setIntegrations((prev) => ({
                          ...prev,
                          affinityConnected: true,
                          affinityListId: res.listId,
                          affinityTokenLast4: res.tokenLast4,
                        }));
                        setAffinityToken(""); // Clear token from form after saving
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
                    className="button-secondary"
                    onClick={() => {
                      // PRODUCTION: Call DELETE /api/integrations/affinity/disconnect
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

            {/* 
              ====== GOOGLE SHEETS INTEGRATION ======
              See src/lib/integrations.ts for full API documentation
              
              PRODUCTION FLOW:
              1. Click "Sign in with Google" → Redirect to Google OAuth
              2. After callback, tokens stored server-side
              3. User edits preset filename
              4. Click "Create sheet" → POST /api/integrations/google-sheets/create
              5. Server creates sheet in user's Drive, stores sheet ID
            */}
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
                  className="button-secondary"
                  onClick={async () => {
                    setAuthingSheet(true);
                    try {
                      // MOCK: Replace with redirect to Google OAuth
                      const res = await startGoogleAuth();
                      if (res.authUrl) window.open(res.authUrl, "_blank");
                      setIntegrations((prev) => ({ ...prev, googleSheetsAuthed: true }));
                    } finally {
                      setAuthingSheet(false);
                    }
                  }}
                >
                  {authingSheet ? "Opening Google..." : integrations.googleSheetsAuthed ? "Re-auth Google" : "Sign in with Google"}
                </button>
                <button
                  className="button-primary"
                  disabled={savingSheet || !sheetName.trim()}
                  onClick={async () => {
                    if (!sheetName.trim()) return;
                    setSavingSheet(true);
                    try {
                      // MOCK: Replace with real API call
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
      )}

      {/* ====== MESSAGING SECTION ====== */}
      {active === "Messaging" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Messaging</h2>
          <p className="text-sm text-gray-600">Slack and Telegram connections.</p>
          
          {/*
            SLACK INTEGRATION:
            - You have: App ID, Bot Token, Bot User ID
            - Add "Reconnect" button that triggers OAuth flow
            - Show connected workspace name
            
            TELEGRAM INTEGRATION:
            - Show bot connection status
            - Option to change phone number / re-link
            
            See src/lib/integrations.ts for API documentation
          */}
          <IntegrationRow title="Slack" status={integrations.slackConnected ? "Connected" : "Not connected"} />
          <IntegrationRow title="Telegram" status={integrations.telegramConnected ? "Onboarding link sent" : "Not connected"} />
        </div>
      )}

      {/* ====== NOTIFICATIONS SECTION ====== */}
      {active === "Notifications" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-600">Routing for recaps, briefs, follow-ups.</p>
          
          {/*
            PRODUCTION:
            - Show grid of notification types × delivery channels
            - Morning Recaps: Email, Slack, Telegram, In-App
            - Meeting Briefs: Email, Slack, Telegram, In-App
            - Follow-ups: ...
            - Escalations: ...
            
            Store preferences in Supabase `user_notification_preferences` table
            Used by scheduled jobs that send recaps via Loops.so, Slack, Telegram
          */}
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Configure routing per channel. Slack/Telegram must be connected to enable those switches.
          </div>
        </div>
      )}

      {/* ====== BILLING & PLAN SECTION ====== */}
      {active === "Billing & Plan" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Billing & Plan</h2>
          <p className="text-sm text-gray-600">Current plan and upgrade options.</p>
          
          {/*
            STRIPE INTEGRATION:
            
            1. DISPLAY CURRENT PLAN:
               - Fetch from Stripe via API: GET /api/stripe/subscription
               - Show plan name, price, billing period, next renewal date
            
            2. "SELECT PLAN" BUTTON:
               - If changing plan: Create Checkout Session with new price
               ```
               const handleSelectPlan = async (priceId: string) => {
                 const response = await fetch('/api/stripe/create-checkout-session', {
                   method: 'POST',
                   headers: { 'Authorization': `Bearer ${token}` },
                   body: JSON.stringify({
                     priceId,
                     successUrl: `${window.location.origin}/settings?billing=success`,
                     cancelUrl: `${window.location.origin}/settings`,
                   }),
                 });
                 const { url } = await response.json();
                 window.location.href = url;
               };
               ```
            
            3. "MANAGE SEATS" BUTTON (Team plan):
               - Open Stripe Customer Portal
               ```
               const handleManageSeats = async () => {
                 const response = await fetch('/api/stripe/create-portal-session', {
                   method: 'POST',
                   headers: { 'Authorization': `Bearer ${token}` },
                   body: JSON.stringify({
                     returnUrl: `${window.location.origin}/settings`,
                   }),
                 });
                 const { url } = await response.json();
                 window.location.href = url;
               };
               ```
            
            4. API ROUTES TO CREATE:
               - POST /api/stripe/create-checkout-session
               - POST /api/stripe/create-portal-session
               - GET /api/stripe/subscription
               - POST /api/stripe/webhook (for subscription events)
            
            5. STRIPE WEBHOOK EVENTS TO HANDLE:
               - checkout.session.completed → Create/update subscription in Supabase
               - customer.subscription.updated → Update plan in Supabase
               - customer.subscription.deleted → Downgrade to free plan
               - invoice.payment_failed → Notify user, grace period
          */}
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard 
              name="Individual" 
              price="$X/month" 
              features={["1 user", "Contacts auto-sync", "Meeting briefs", "Follow-ups", "TOMO AI assistant"]} 
              active={session?.plan === "individual"} 
            />
            <PlanCard
              name="Team"
              price="$X/user/month"
              badge="14-day trial"
              features={["Multiple users", "Shared contacts workspace", "Shared activity timeline", "Collaborative briefs", "TOMO AI for team"]}
              active={session?.plan === "team"}
            />
          </div>
          
          {/* 
            Manage Seats button - opens Stripe Customer Portal
            Only show for Team plan users
          */}
          <button className="button-secondary w-fit">Manage seats</button>
        </div>
      )}
    </div>
  );

  if (!ready) return null;

  return <AppShell section="settings" listContent={listContent} detailContent={detailContent} contextTitle={`${active} settings`} />;
}

/**
 * Simple integration status row
 * PRODUCTION: Add onClick to open connection/reconnection flow
 */
function IntegrationRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-600">Manage connection</p>
      </div>
      <span className="text-xs text-gray-500">{status}</span>
    </div>
  );
}

/**
 * Plan selection card
 * 
 * PRODUCTION ENHANCEMENTS:
 * - Show actual price from Stripe
 * - Add "Current" badge instead of blue border for active plan
 * - Disable button if already on this plan
 * - Wire onClick to Stripe Checkout
 */
function PlanCard({
  name,
  price,
  features,
  badge,
  active,
}: {
  name: string;
  price: string;
  features: string[];
  badge?: string;
  active?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-700">{price}</p>
        </div>
        {badge ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{badge}</span> : null}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {/*
        PRODUCTION: Wire to Stripe
        - If active: Show "Current plan" (disabled)
        - If not active: onClick → create Checkout Session
      */}
      <button className="button-primary mt-3 w-full">{active ? "Current plan" : "Select plan"}</button>
    </div>
  );
}

/**
 * Generate a default Google Sheet filename with today's date
 */
function generatePresetSheetName() {
  const date = new Date();
  const iso = date.toISOString().split("T")[0];
  return `tomo_crm_sync_${iso}.xlsx`;
}
