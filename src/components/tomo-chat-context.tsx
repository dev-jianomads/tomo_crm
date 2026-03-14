"use client";

import { createContext, useContext, ReactNode } from "react";
import type { UIMessage } from "ai";

type TomoChatContextValue = {
  openAndSend: (text: string) => void;
  messages: UIMessage[];
  onSend: (text: string) => void;
  suggestions: string[];
  contextLabel?: string;
  isStreaming?: boolean;
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
  isStreaming = false,
}: {
  children: ReactNode;
  openAndSend: (text: string) => void;
  messages: UIMessage[];
  onSend: (text: string) => void;
  suggestions: string[];
  contextLabel?: string;
  isStreaming?: boolean;
}) {
  const value: TomoChatContextValue = {
    openAndSend,
    messages,
    onSend,
    suggestions,
    contextLabel,
    isStreaming,
  };
  return (
    <TomoChatContext.Provider value={value}>{children}</TomoChatContext.Provider>
  );
}
