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
 * Default transactional ID for the “Daily Recap” template (override via env for other envs).
 */
export function getLoopsDailyBriefTransactionalId(): string {
  return process.env.LOOPS_TRANSACTIONAL_DAILY_BRIEF_ID?.trim() || "cm00kzyp106ku0it8no5kc665";
}

export async function sendLoopsTransactional(payload: LoopsTransactionalPayload): Promise<LoopsSendResult> {
  const key = getLoopsApiKey();
  if (!key) {
    return { ok: false, status: 500, body: "LOOPS_API_KEY is not configured" };
  }

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
}

/**
 * Sends the daily brief HTML as the template variable `content`.
 */
export async function sendDailyBriefEmail(toEmail: string, contentHtml: string): Promise<LoopsSendResult> {
  return sendLoopsTransactional({
    transactionalId: getLoopsDailyBriefTransactionalId(),
    email: toEmail,
    dataVariables: {
      content: contentHtml,
    },
  });
}

export function isLoopsConfigured(): boolean {
  return Boolean(getLoopsApiKey());
}
