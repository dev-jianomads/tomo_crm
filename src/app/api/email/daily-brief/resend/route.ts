/**
 * POST /api/email/daily-brief/resend
 *
 * Demo-only: resend Daily Brief from the Today page (no Bearer secret).
 * Enable with DAILY_BRIEF_RESEND_ENABLED=true on the server.
 * Sends to LOOPS_SEND_TO (or DAILY_BRIEF_TEST_TO fallback).
 */

import { NextResponse } from "next/server";
import { sendDailyBriefToEmail } from "@/lib/dailyBriefSendShared";
import {
  formatLoopsApiError,
  getLoopsDailyBriefTransactionalId,
  isDailyBriefTransactionalIdConfigured,
  isLoopsConfigured,
} from "@/lib/loops";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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

    if (!isDailyBriefTransactionalIdConfigured()) {
      return NextResponse.json(
        {
          error: "LOOPS_TRANSACTIONAL_DAILY_BRIEF_ID is not set",
          detail:
            "Add your published Daily Recap transactional email ID from Loops (Dashboard → Transactional). Production cannot use another workspace’s template ID.",
        },
        { status: 400 }
      );
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

    let result;
    try {
      result = await sendDailyBriefToEmail(to);
    } catch (buildOrSendErr) {
      const message = buildOrSendErr instanceof Error ? buildOrSendErr.message : String(buildOrSendErr);
      console.error("[daily-brief/resend] sendDailyBriefToEmail threw:", buildOrSendErr);
      return NextResponse.json(
        {
          error: "Daily brief send failed before Loops",
          detail: message,
        },
        { status: 500 }
      );
    }

    if (!result.ok) {
      const detail = formatLoopsApiError(result.status, result.body);
      return NextResponse.json(
        {
          error: "Loops rejected the send",
          detail,
          loopsHttpStatus: result.status,
          /** Hint: default template ID in code is not valid in every workspace */
          transactionalIdUsed: getLoopsDailyBriefTransactionalId(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, to, loopsStatus: result.status });
  } catch (e) {
    console.error("[daily-brief/resend] unexpected:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Unexpected server error", detail: message }, { status: 500 });
  }
}
