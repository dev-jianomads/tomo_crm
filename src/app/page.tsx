"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readFromStorage } from "@/lib/storage";
import { SessionState } from "@/lib/types";

export default function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = readFromStorage<SessionState | null>("tomo-session", null);
    if (!session) {
      router.replace("/auth");
      return;
    }
    // Mock behavior: always send signed-in users through onboarding
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-gray-700">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 text-sm shadow-sm">
        Redirecting…
      </div>
    </div>
  );
}
