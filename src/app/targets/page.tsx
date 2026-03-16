"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /targets route — redirects to /pipeline.
 * Pipeline replaces the old target list concept.
 */
export default function TargetsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pipeline");
  }, [router]);
  return null;
}
