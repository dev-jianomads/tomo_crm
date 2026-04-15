/**
 * POST /api/email/daily-brief
 *
 * Sends the Daily Brief (four sections) via Loops transactional email.
 * Secured with Authorization: Bearer <DAILY_BRIEF_SEND_SECRET>.
 *
 * Body: { "to": "user@example.com" } (optional; defaults to LOOPS_SEND_TO, then DAILY_BRIEF_TEST_TO)
 */

import { NextResponse } from "next/server";
import { formatDailyBriefBlocksAsEmailHtml } from "@/lib/dailyBriefEmailHtml";
import { getDailyBriefBlocksForSend } from "@/lib/dailyBriefForSend";
import { isLoopsConfigured, sendDailyBriefEmail } from "@/lib/loops";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.DAILY_BRIEF_SEND_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoopsConfigured()) {
    return NextResponse.json(
      { error: "LOOPS_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const defaultTo =
    process.env.LOOPS_SEND_TO?.trim() || process.env.DAILY_BRIEF_TEST_TO?.trim();

  let to: string | undefined;
  try {
    const body = (await request.json()) as { to?: string };
    to = body.to?.trim() || defaultTo;
  } catch {
    to = defaultTo;
  }

  if (!to) {
    return NextResponse.json(
      { error: 'Missing "to" in body and neither LOOPS_SEND_TO nor DAILY_BRIEF_TEST_TO is set' },
      { status: 400 }
    );
  }

  const blocks = getDailyBriefBlocksForSend();
  const html = formatDailyBriefBlocksAsEmailHtml(blocks);
  const result = await sendDailyBriefEmail(to, html);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Loops API error", detail: result.body, status: result.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to, loopsStatus: result.status });
}
