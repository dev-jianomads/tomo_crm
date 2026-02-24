"use client";

import { createContext, useContext, ReactNode } from "react";
import { TomoMessage } from "@/lib/types";

type TomoChatContextValue = {
  openAndSend: (text: string) => void;
  messages: TomoMessage[];
  onSend: (text: string) => void;
  suggestions: string[];
  contextLabel?: string;
};

const TomoChatContext = createContext<TomoChatContextValue | null>(null);

export function useTomoChat() {
  const ctx = useContext(TomoChatContext);
  return ctx;
}

export function TomoChatProvider({
  children,
  openAndSend,
  messages,
  onSend,
  suggestions,
  contextLabel,
}: {
  children: ReactNode;
  openAndSend: (text: string) => void;
  messages: TomoMessage[];
  onSend: (text: string) => void;
  suggestions: string[];
  contextLabel?: string;
}) {
  const value: TomoChatContextValue = { openAndSend, messages, onSend, suggestions, contextLabel };
  return (
    <TomoChatContext.Provider value={value}>{children}</TomoChatContext.Provider>
  );
}
