"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/auth");
    } else if (!session.onboardingComplete) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-700">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 text-sm shadow-sm">
        Redirecting…
      </div>
    </div>
  );
}
