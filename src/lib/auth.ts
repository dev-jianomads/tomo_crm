 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionState } from "./types";
import { readFromStorage, writeToStorage } from "./storage";

const KEY = "tomo-session";

export function getSession(): SessionState | null {
  return readFromStorage<SessionState | null>(KEY, null);
}

export function setSession(session: SessionState) {
  writeToStorage(KEY, session);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function useSession() {
  const initialSession = typeof window !== "undefined" ? readFromStorage<SessionState | null>(KEY, null) : null;
  const [session, setSession] = useState<SessionState | null>(initialSession);
  const ready = typeof window !== "undefined";

  const updateSession = (payload: SessionState | null) => {
    if (payload) {
      setSession(payload);
      writeToStorage(KEY, payload);
    } else {
      clearSession();
      setSession(null);
    }
  };

  return { session, ready, setSession: updateSession };
}

export function useRequireSession() {
  const router = useRouter();
  const { session, ready, setSession: updateSession } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/auth");
    } else if (!session.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [ready, session, router]);

  return { session, ready, setSession: updateSession };
}

