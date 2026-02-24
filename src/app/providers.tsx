"use client";

import { useEffect } from "react";
import { FundProvider } from "@/components/fund-provider";
import { Sonner } from "@/components/ui/sonner";
import { VersionCheck } from "@/components/version-check";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reloadKey = "tomo-hard-reload";

    const shouldReload = (message?: string) => {
      if (!message) return false;
      const lowered = message.toLowerCase();
      return (
        lowered.includes("loading chunk") ||
        lowered.includes("failed to load chunk") ||
        lowered.includes("chunkloaderror") ||
        lowered.includes("err_insufficient_resources")
      );
    };

    const reloadOnce = () => {
      if (sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, "true");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (shouldReload(event.message)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message = typeof event.reason === "string" ? event.reason : event.reason?.message;
      if (shouldReload(message)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <FundProvider>
      {children}
      <VersionCheck />
      <Sonner />
    </FundProvider>
  );
}



