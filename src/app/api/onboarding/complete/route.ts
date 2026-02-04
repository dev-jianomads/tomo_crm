import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("tomo-onboarding-complete", "true", {
    path: "/",
    sameSite: "lax",
  });
  return response;
}
