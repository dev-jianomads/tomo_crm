"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";

type TomoChatContextValue = {
  openAndSend: (text: string) => void;
};

const TomoChatContext = createContext<TomoChatContextValue | null>(null);

export function useTomoChat() {
  const ctx = useContext(TomoChatContext);
  return ctx;
}

export function TomoChatProvider({
  children,
  openAndSend,
}: {
  children: ReactNode;
  openAndSend: (text: string) => void;
}) {
  const value: TomoChatContextValue = { openAndSend };
  return (
    <TomoChatContext.Provider value={value}>{children}</TomoChatContext.Provider>
  );
}
