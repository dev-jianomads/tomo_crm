/**
 * POST /api/email/daily-brief/resend
 *
 * Demo-only: resend Daily Brief from the Today page (no Bearer secret).
 * Enable with DAILY_BRIEF_RESEND_ENABLED=true on the server.
 * Sends to LOOPS_SEND_TO (or DAILY_BRIEF_TEST_TO fallback).
 */

import { NextResponse } from "next/server";
import { sendDailyBriefToEmail } from "@/lib/dailyBriefSendShared";
import { isLoopsConfigured } from "@/lib/loops";

export const dynamic = "force-dynamic";

export async function POST() {
  const allowResend =
    process.env.DAILY_BRIEF_RESEND_ENABLED === "true" ||
    process.env.NODE_ENV === "development";

  if (!allowResend) {
    return NextResponse.json(
      { error: "Daily brief resend is not enabled. Set DAILY_BRIEF_RESEND_ENABLED=true on the server." },
      { status: 403 }
    );
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

  return NextResponse.json({ ok: true, to, loopsStatus: result.status });
}
