"use client";

import { FundProvider } from "@/components/fund-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <FundProvider>{children}</FundProvider>;
}

