/**
 * Loops.so transactional email API (server-only).
 * https://loops.so/docs/api-reference/send-transactional-email
 */

const LOOPS_API_BASE = "https://app.loops.so/api/v1";

export type LoopsTransactionalPayload = {
  transactionalId: string;
  email: string;
  dataVariables: Record<string, string>;
};

export type LoopsSendResult =
  | { ok: true; status: number }
  | { ok: false; status: number; body: string };

function getLoopsApiKey(): string | undefined {
  return process.env.LOOPS_API_KEY?.trim() || undefined;
}

/**
 * Transactional email ID for the Daily Brief / Daily Recap Loops template (`dataVariables.content`).
 * Must be set in production — each Loops workspace has its own IDs; there is no shared default.
 * In development only, falls back to a legacy ID for local convenience.
 */
const DEV_FALLBACK_DAILY_BRIEF_TRANSACTIONAL_ID = "cm00kzyp106ku0it8no5kc665";

export function getLoopsDailyBriefTransactionalId(): string {
  const fromEnv = process.env.LOOPS_TRANSACTIONAL_DAILY_BRIEF_ID?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return DEV_FALLBACK_DAILY_BRIEF_TRANSACTIONAL_ID;
  }
  return "";
}

/** True when we have a non-empty transactional ID (env in prod, or dev fallback in development). */
export function isDailyBriefTransactionalIdConfigured(): boolean {
  return getLoopsDailyBriefTransactionalId().length > 0;
}

export async function sendLoopsTransactional(payload: LoopsTransactionalPayload): Promise<LoopsSendResult> {
  const key = getLoopsApiKey();
  if (!key) {
    return { ok: false, status: 500, body: "LOOPS_API_KEY is not configured" };
  }

  try {
    const res = await fetch(`${LOOPS_API_BASE}/transactional`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, body: text.slice(0, 2000) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, body: `Network error calling Loops: ${msg}` };
  }
}

/**
 * Sends the daily brief HTML as the template variable `content`.
 */
export async function sendDailyBriefEmail(toEmail: string, contentHtml: string): Promise<LoopsSendResult> {
  const transactionalId = getLoopsDailyBriefTransactionalId();
  if (!transactionalId) {
    return {
      ok: false,
      status: 400,
      body:
        "LOOPS_TRANSACTIONAL_DAILY_BRIEF_ID is not set. Add your published transactional email ID from Loops (Dashboard → Transactional).",
    };
  }
  return sendLoopsTransactional({
    transactionalId,
    email: toEmail,
    dataVariables: {
      content: contentHtml,
    },
  });
}

export function isLoopsConfigured(): boolean {
  return Boolean(getLoopsApiKey());
}

/**
 * Turn Loops error response text into a short message for logs and API JSON.
 * https://loops.so/docs/api-reference/send-transactional-email
 */
export function formatLoopsApiError(status: number, bodyText: string): string {
  const raw = bodyText.trim();
  try {
    const j = JSON.parse(raw) as {
      message?: string;
      error?: string | { message?: string; reason?: string };
    };
    if (typeof j.message === "string" && j.message.length > 0) return j.message;
    if (j.error && typeof j.error === "object") {
      const nested = j.error.message ?? j.error.reason;
      if (typeof nested === "string" && nested.length > 0) return nested;
    }
    if (typeof j.error === "string" && j.error.length > 0) return j.error;
  } catch {
    /* not JSON */
  }
  if (status === 401) return "Invalid API key. Check LOOPS_API_KEY matches your Loops workspace.";
  if (status === 404) {
    return "Transactional email not found. Set LOOPS_TRANSACTIONAL_DAILY_BRIEF_ID to a published transactional ID from your Loops account (Dashboard → Transactional).";
  }
  if (status === 0) {
    return raw.length > 0 ? raw : "Could not reach Loops (network). Check server outbound access or try again.";
  }
  return raw.length > 0 ? raw.slice(0, 800) : `Request failed (HTTP ${status})`;
}
