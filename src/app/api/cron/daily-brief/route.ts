/**
 * GET /api/cron/daily-brief
 *
 * Vercel Cron: sends the full four-section Daily Brief via Loops to LOOPS_SEND_TO.
 * Configure in vercel.json + project env CRON_SECRET (Vercel sends Authorization: Bearer).
 *
 * Manual test (local):
 *   curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/daily-brief"
 */

import { NextResponse } from "next/server";
import { sendDailyBriefToEmail } from "@/lib/dailyBriefSendShared";
import { isLoopsConfigured } from "@/lib/loops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoopsConfigured()) {
    return NextResponse.json({ error: "LOOPS_API_KEY is not configured" }, { status: 503 });
  }

  const to =
    process.env.LOOPS_SEND_TO?.trim() ||
    process.env.DAILY_BRIEF_TEST_TO?.trim();

  if (!to) {
    return NextResponse.json(
      { error: "Set LOOPS_SEND_TO (or DAILY_BRIEF_TEST_TO) for the recipient address." },
      { status: 400 }
    );
  }

  const result = await sendDailyBriefToEmail(to);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Loops API error", detail: result.body, status: result.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to, loopsStatus: result.status, source: "cron" });
}
