/**
 * Version API - returns { version, buildId } that changes on each deploy.
 * Used by the client to detect when a new deployment is available.
 *
 * buildId: VERCEL_GIT_COMMIT_SHA or VERCEL_GITHUB_COMMIT_SHA (Vercel sets these)
 * version: NEXT_PUBLIC_APP_VERSION → package.json version → 'unknown'
 */

import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GITHUB_COMMIT_SHA ??
    null;

  const version =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    (packageJson as { version?: string }).version ??
    "unknown";

  return NextResponse.json({ version, buildId });
}
