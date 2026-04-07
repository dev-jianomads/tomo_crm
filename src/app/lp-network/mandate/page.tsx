import { Suspense } from "react";
import { LpMandateClient } from "./lp-mandate-client";

export default function LpNetworkMandatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <LpMandateClient />
    </Suspense>
  );
}
