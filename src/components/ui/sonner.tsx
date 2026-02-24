"use client";

/**
 * Sonner Toaster rendered via createPortal into document.body.
 * This keeps toasts above modals (e.g. Radix Dialog) and ensures
 * the "Refresh" button remains clickable.
 */

import { Toaster } from "sonner";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function Sonner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(<Toaster richColors position="bottom-right" />, document.body);
}
