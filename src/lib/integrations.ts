/**
 * =============================================================================
 * TOMO CRM - External Integrations Module
 * =============================================================================
 * 
 * CURRENT STATE: Mock implementations with simulated delays
 * 
 * PRODUCTION WIRING OVERVIEW:
 * All integrations should call server-side API routes that:
 * 1. Authenticate the request (Firebase ID token)
 * 2. Store credentials encrypted in Supabase or a secrets manager
 * 3. Make the actual API calls to external services
 * 4. Return sanitized responses to the client
 * 
 * NEVER store API tokens or secrets in localStorage or client-side code!
 * =============================================================================
 */

/**
 * =============================================================================
 * AFFINITY CRM INTEGRATION
 * =============================================================================
 * 
 * Affinity API Documentation: https://api-docs.affinity.co/
 * 
 * SETUP STEPS:
 * 1. User provides their Affinity API token (found in Affinity Settings)
 * 2. User provides their List ID (the list to sync from)
 * 
 * API ROUTES TO CREATE:
 * 
 * POST /api/integrations/affinity/connect
 * - Receives: { listId, apiToken } from client
 * - Validates token by calling Affinity API (GET /lists/{listId})
 * - If valid, encrypt and store token in Supabase `user_integrations` table
 * - Returns: { ok: true, listId, tokenLast4 }
 * 
 * POST /api/integrations/affinity/sync
 * - Fetches contacts from Affinity list
 * - Maps Affinity Person/Company to Tomo Contact type
 * - Upserts to Supabase `contacts` table
 * - Handles pagination (Affinity uses cursor-based pagination)
 * 
 * DELETE /api/integrations/affinity/disconnect
 * - Removes stored credentials
 * - Optionally removes synced contacts (or mark as stale)
 * 
 * AFFINITY API CALLS:
 * ```
 * // Test connection
 * GET https://api.affinity.co/lists/{listId}
 * Authorization: Basic {base64(apiToken)}
 * 
 * // Get list entries (people/companies)
 * GET https://api.affinity.co/lists/{listId}/list-entries
 * 
 * // Get person details
 * GET https://api.affinity.co/persons/{personId}
 * ```
 */
type AffinityConnectPayload = {
  listId: string;
  apiToken: string;
};

export async function connectAffinity(payload: AffinityConnectPayload) {
  // MOCK: Simulates API call delay
  await wait(450);
  
  // PRODUCTION: Replace with actual API call
  // ```
  // const response = await fetch('/api/integrations/affinity/connect', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${await getFirebaseIdToken()}`,
  //   },
  //   body: JSON.stringify(payload),
  // });
  // return response.json();
  // ```
  
  return {
    ok: true,
    listId: payload.listId,
    tokenLast4: payload.apiToken.slice(-4),
    message: "Saved Affinity credentials (mock). In production, store server-side.",
  };
}

export async function disconnectAffinity() {
  // MOCK: Simulates API call delay
  await wait(250);
  
  // PRODUCTION: Call DELETE /api/integrations/affinity/disconnect
  return { ok: true };
}

/**
 * =============================================================================
 * GOOGLE SHEETS INTEGRATION
 * =============================================================================
 * 
 * Uses Google Sheets API v4: https://developers.google.com/sheets/api
 * 
 * SETUP STEPS:
 * 1. Create Google Cloud project with Sheets API enabled
 * 2. Configure OAuth 2.0 credentials (same as Google Calendar/Contacts)
 * 3. Request scopes: https://www.googleapis.com/auth/spreadsheets
 * 
 * OAUTH FLOW:
 * 1. User clicks "Sign in with Google"
 * 2. Redirect to Google OAuth consent screen
 * 3. User grants permission
 * 4. Google redirects back with auth code
 * 5. Exchange code for tokens (access_token, refresh_token)
 * 6. Store refresh_token encrypted in Supabase
 * 
 * API ROUTES TO CREATE:
 * 
 * GET /api/integrations/google/auth-url
 * - Returns Google OAuth URL with correct scopes and redirect URI
 * 
 * GET /api/integrations/google/callback
 * - Handles OAuth callback
 * - Exchanges code for tokens
 * - Stores refresh_token in Supabase
 * - Redirects back to app
 * 
 * POST /api/integrations/google-sheets/create
 * - Creates a new spreadsheet in user's Google Drive
 * - Sets up headers/structure for CRM data export
 * - Stores sheet ID in Supabase
 * - Returns: { ok: true, filename, url, sheetId }
 * 
 * POST /api/integrations/google-sheets/sync
 * - Fetches contacts/data from Supabase
 * - Writes to the connected Google Sheet
 * - Can be triggered manually or on schedule
 * 
 * GOOGLE SHEETS API CALLS:
 * ```
 * // Create spreadsheet
 * POST https://sheets.googleapis.com/v4/spreadsheets
 * Authorization: Bearer {access_token}
 * Body: { properties: { title: filename } }
 * 
 * // Write data
 * PUT https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/{range}
 * ?valueInputOption=USER_ENTERED
 * Body: { values: [[...]] }
 * ```
 */
export async function startGoogleAuth() {
  // MOCK: Simulates OAuth initiation
  await wait(400);
  
  // PRODUCTION: Fetch actual OAuth URL from your API
  // ```
  // const response = await fetch('/api/integrations/google/auth-url', {
  //   headers: { 'Authorization': `Bearer ${await getFirebaseIdToken()}` },
  // });
  // const { authUrl } = await response.json();
  // return { ok: true, authUrl };
  // ```
  
  return { ok: true, authUrl: "https://accounts.google.com/o/oauth2/auth?mock" };
}

export async function createGoogleSheet(filename: string) {
  // MOCK: Simulates sheet creation
  await wait(350);
  
  // PRODUCTION: Call your API to create the sheet
  // ```
  // const response = await fetch('/api/integrations/google-sheets/create', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${await getFirebaseIdToken()}`,
  //   },
  //   body: JSON.stringify({ filename }),
  // });
  // return response.json();
  // ```
  
  return {
    ok: true,
    filename,
    url: `https://docs.google.com/spreadsheets/d/mock-${encodeURIComponent(filename)}`,
  };
}

export async function disconnectGoogleSheet() {
  // MOCK: Simulates disconnection
  await wait(250);
  
  // PRODUCTION: Revoke token and clear stored sheet ID
  // ```
  // await fetch('/api/integrations/google-sheets/disconnect', {
  //   method: 'DELETE',
  //   headers: { 'Authorization': `Bearer ${await getFirebaseIdToken()}` },
  // });
  // ```
  
  return { ok: true };
}

/**
 * =============================================================================
 * SLACK INTEGRATION
 * =============================================================================
 * 
 * You have: App ID, Bot Token, Bot User ID
 * 
 * SETUP (already done):
 * 1. Slack App created at https://api.slack.com/apps
 * 2. Bot token scope: chat:write, users:read
 * 3. Install app to workspace
 * 
 * API ROUTES TO CREATE:
 * 
 * GET /api/integrations/slack/install-url
 * - Returns OAuth install URL for user's workspace
 * 
 * GET /api/integrations/slack/callback
 * - Handles OAuth callback
 * - Stores workspace access token in Supabase
 * 
 * POST /api/integrations/slack/send-message
 * - Sends recap or notification to user's Slack DM
 * - Uses Bot Token to call chat.postMessage
 * 
 * POST /api/integrations/slack/events (webhook)
 * - Receives Slack Events API callbacks
 * - Handles app_mention, message events
 * - Routes to Tomo AI for processing
 * 
 * SLACK API CALLS:
 * ```
 * // Send message
 * POST https://slack.com/api/chat.postMessage
 * Authorization: Bearer {bot_token}
 * Body: { channel: user_dm_channel, text: "Your morning recap...", blocks: [...] }
 * 
 * // Get user info
 * GET https://slack.com/api/users.info?user={user_id}
 * ```
 * 
 * ENVIRONMENT VARIABLES:
 * - SLACK_APP_ID
 * - SLACK_BOT_TOKEN
 * - SLACK_BOT_USER_ID
 * - SLACK_SIGNING_SECRET (for verifying webhooks)
 */

/**
 * =============================================================================
 * TELEGRAM INTEGRATION (STUBBED - similar to Slack)
 * =============================================================================
 * 
 * SETUP STEPS:
 * 1. Create bot via @BotFather on Telegram
 * 2. Get bot token
 * 3. Set up webhook URL for incoming messages
 * 
 * API ROUTES TO CREATE:
 * 
 * POST /api/integrations/telegram/send-onboarding
 * - Sends onboarding link to user's phone number
 * - Uses Telegram Bot API sendMessage
 * 
 * POST /api/integrations/telegram/webhook
 * - Receives updates from Telegram
 * - Handles /start command to link user account
 * - Routes messages to Tomo AI
 * 
 * TELEGRAM API CALLS:
 * ```
 * // Send message
 * POST https://api.telegram.org/bot{token}/sendMessage
 * Body: { chat_id: user_chat_id, text: "Your recap..." }
 * 
 * // Set webhook
 * POST https://api.telegram.org/bot{token}/setWebhook
 * Body: { url: "https://your-domain.com/api/integrations/telegram/webhook" }
 * ```
 * 
 * ENVIRONMENT VARIABLES:
 * - TELEGRAM_BOT_TOKEN
 */

/**
 * =============================================================================
 * EMAIL INTEGRATION (via Loops.so)
 * =============================================================================
 * 
 * Loops.so is used for transactional and marketing emails.
 * Documentation: https://loops.so/docs
 * 
 * USE CASES:
 * 1. Morning/Evening recap emails
 * 2. Meeting brief emails
 * 3. Follow-up reminders
 * 4. Onboarding emails
 * 5. Password reset (if using email/password auth)
 * 
 * API ROUTES TO CREATE:
 * 
 * POST /api/email/send-recap
 * - Generates recap content (via Tomo AI or template)
 * - Sends via Loops.so transactional API
 * 
 * LOOPS.SO API:
 * ```
 * POST https://app.loops.so/api/v1/transactional
 * Authorization: Bearer {LOOPS_API_KEY}
 * Body: {
 *   transactionalId: "recap_email_template_id",
 *   email: "user@example.com",
 *   dataVariables: { name: "John", recap_content: "..." }
 * }
 * ```
 * 
 * ENVIRONMENT VARIABLES:
 * - LOOPS_API_KEY
 */

/**
 * =============================================================================
 * GOOGLE CALENDAR/CONTACTS INTEGRATION
 * =============================================================================
 * 
 * Uses same OAuth as Google Sheets (combined scopes).
 * 
 * SCOPES NEEDED:
 * - https://www.googleapis.com/auth/calendar.readonly
 * - https://www.googleapis.com/auth/contacts.readonly
 * - https://www.googleapis.com/auth/spreadsheets
 * 
 * API ROUTES FOR CALENDAR:
 * 
 * GET /api/integrations/calendar/events
 * - Fetches upcoming events from user's calendar
 * - Returns events for brief generation
 * 
 * POST /api/integrations/calendar/webhook
 * - Receives calendar change notifications
 * - Triggers brief regeneration when events change
 * 
 * API ROUTES FOR CONTACTS:
 * 
 * POST /api/integrations/contacts/sync
 * - Fetches contacts from Google People API
 * - Maps to Tomo Contact type
 * - Upserts to Supabase
 * 
 * GOOGLE APIS:
 * ```
 * // List calendar events
 * GET https://www.googleapis.com/calendar/v3/calendars/primary/events
 * ?timeMin={now}&timeMax={endOfWeek}
 * 
 * // List contacts
 * GET https://people.googleapis.com/v1/people/me/connections
 * ?personFields=names,emailAddresses,organizations,phoneNumbers
 * ```
 */

/**
 * =============================================================================
 * MICROSOFT 365 INTEGRATION
 * =============================================================================
 * 
 * Uses Microsoft Graph API for Calendar and Contacts.
 * 
 * SETUP:
 * 1. Register app in Azure AD
 * 2. Configure OAuth redirect URIs
 * 3. Request permissions: Calendars.Read, Contacts.Read
 * 
 * OAUTH FLOW:
 * Similar to Google - redirect to Microsoft login, exchange code for tokens.
 * 
 * API ROUTES:
 * Same pattern as Google but using Microsoft Graph endpoints:
 * - https://graph.microsoft.com/v1.0/me/calendar/events
 * - https://graph.microsoft.com/v1.0/me/contacts
 */

/** Utility function to simulate API delays in mock mode */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * =============================================================================
 * HELPER: Get Firebase ID Token for API calls
 * =============================================================================
 * 
 * PRODUCTION: Use this to authenticate API requests
 * ```
 * import { auth } from './firebase';
 * 
 * export async function getFirebaseIdToken(): Promise<string> {
 *   const user = auth.currentUser;
 *   if (!user) throw new Error('Not authenticated');
 *   return user.getIdToken();
 * }
 * ```
 */
