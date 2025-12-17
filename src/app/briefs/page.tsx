"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect Briefs -> Materials (Briefs tab)
 * Keep minimal to avoid duplicate exports or JSX parsing issues.
 */
export default function BriefsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/materials?tab=briefs");
  }, [router]);
  return null;
}

