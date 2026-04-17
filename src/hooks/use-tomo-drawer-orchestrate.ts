"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { getToolParts } from "@/lib/tomoToolParts";
import type { TomoAssistance } from "@/lib/mockTomoAssistance";

export type CrmUpdatePayload = {
  entityId?: string;
  relationshipIds?: string[];
  rows?: { field: string; update: string }[];
  status?: string;
  reminderDuration?: string;
};

export type TomoDrawerOrchestrateSelection =
  | { type: "relationship"; id: string }
  | { type: "pipeline_stage"; pipelineId: string; stage: string; relationshipIds: string[] }
  | { type: string; id: string };

export function useTomoDrawerOrchestrate({
  entityKey,
  selection,
  contextLabel,
  assistanceContext,
  onCrmUpdate,
}: {
  entityKey: string;
  selection?: TomoDrawerOrchestrateSelection;
  contextLabel?: string;
  assistanceContext?: TomoAssistance | null;
  onCrmUpdate?: (payload: CrmUpdatePayload) => void;
}) {
  const [input, setInput] = useState("");
  const processedToolCalls = useRef<Set<string>>(new Set());
  const onCrmUpdateRef = useRef(onCrmUpdate);
  onCrmUpdateRef.current = onCrmUpdate;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const applyCrmUpdate = useCallback((toolCallId: string, crmInput: unknown, crmOutput: unknown) => {
    if (processedToolCalls.current.has(toolCallId)) return;
    processedToolCalls.current.add(toolCallId);

    const result = (crmOutput ?? crmInput) as CrmUpdatePayload & { applied?: boolean };
    if (!result) return;

    const sel = selectionRef.current;
    const hasIds = !!(result.entityId || result.relationshipIds?.length);
    const payload: CrmUpdatePayload = hasIds
      ? result
      : sel?.type === "relationship"
        ? { ...result, entityId: sel.id, relationshipIds: undefined }
        : result;

    onCrmUpdateRef.current?.(payload);

    const fields = result.rows?.map((r) => r.field) ?? [];
    const count = result.relationshipIds?.length ?? (result.entityId ? 1 : 0);
    if (fields.length || result.status || result.reminderDuration) {
      const target = count > 1 ? `${count} relationships` : "CRM";
      toast.success(
        result.status
          ? `Status set to ${result.status}${count > 1 ? ` (${count} items)` : ""}`
          : result.reminderDuration
            ? `Reminder set for ${result.reminderDuration}${count > 1 ? ` (${count} items)` : ""}`
            : `${target} updated: ${fields.join(", ") || "done"}`
      );
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tomo/orchestrate",
        body: {
          context: {
            surface: "drawer" as const,
            page:
              selection?.type === "relationship"
                ? "relationships"
                : selection?.type === "pipeline_stage"
                  ? "pipeline"
                  : "home",
            selection,
            contextTitle: contextLabel,
            assistanceContext: assistanceContext ?? null,
          },
        },
      }),
    [selection, contextLabel, assistanceContext]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const toolParts = getToolParts(msg);
      for (const tp of toolParts) {
        if (tp.toolName === "update_crm" && tp.state === "output-available") {
          const toolCallId = (tp as { toolCallId?: string }).toolCallId ?? `${msg.id}-update_crm`;
          applyCrmUpdate(toolCallId, tp.input, tp.output);
        }
      }
    }
  }, [messages, applyCrmUpdate]);

  useEffect(() => {
    processedToolCalls.current.clear();
    setMessages([]);
    setInput("");
  }, [entityKey, setMessages]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setInput("");
      sendMessage({ text: trimmed });
    },
    [isStreaming, sendMessage]
  );

  return { input, setInput, handleSend, isStreaming, messages, setMessages };
}
