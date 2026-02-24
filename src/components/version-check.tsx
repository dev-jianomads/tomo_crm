"use client";

/**
 * Version check - polls /api/version and shows a toast with "Refresh"
 * when a new deployment is detected.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const VERSION_POLL_MS = 5 * 60 * 1000; // 5 minutes

export function VersionCheck() {
  const baselineVersionRef = useRef<string | null>(null);
  const updateToastIdRef = useRef<string | number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = await res.json();
        const key = `${data.version}-${data.buildId ?? ""}`;

        if (baselineVersionRef.current === null) {
          baselineVersionRef.current = key;
          return;
        }

        if (!isMountedRef.current) return;
        if (baselineVersionRef.current !== key && updateToastIdRef.current === null) {
          const id = toast("New version available", {
            action: {
              label: "Refresh",
              onClick: () => window.location.reload(),
            },
          });
          updateToastIdRef.current = id;
        }
      } catch {
        // ignore fetch errors
      }
    };

    check();
    const interval = setInterval(check, VERSION_POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
